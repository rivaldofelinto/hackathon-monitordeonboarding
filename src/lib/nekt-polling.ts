/**
 * Nekt Polling Service
 * Executa sincronização em horários fixos: 05:00 UTC e 12:00 UTC
 * Retry logic com exponential backoff
 */

import { db } from "@/db/client";
import { sync_log, properties } from "@/db/schema";
import { sql } from "drizzle-orm";
import { parseAllPipelines } from "./pipefy-parser";
import type { PipefyCard } from "./pipefy-parser";

interface SyncConfig {
  max_retries: number;
  retry_delay_ms: number;
  backoff_multiplier: number;
  timeout_ms: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  max_retries: 3,
  retry_delay_ms: 5000,
  backoff_multiplier: 2,
  timeout_ms: 30000,
};

export interface SyncResult {
  success: boolean;
  items_processed: number;
  items_failed: number;
  error?: string;
  retry_count: number;
  execution_time_ms: number;
}

/**
 * Real Pipefy onboarding pipes in Nekt data warehouse
 * Tables confirmed via MCP: SELECT table_name FROM information_schema.tables WHERE table_schema = 'nekt_trusted'
 */
const ONBOARDING_PIPES: Record<string, string> = {
  "PIPE 0 - Onboarding proprietário": "pipefy_szs_all_cards_303807224",
  "PIPE 1 - Implantação": "pipefy_szs_all_cards_303781436",
  "PIPE 2 - Adequação": "pipefy_szs_all_cards_303828424",
  "PIPE 3 - Vistorias": "pipefy_szs_all_cards_302290867",
  "PIPE 4 - Fotos Profissionais": "pipefy_szs_all_cards_302290880",
  "PIPE 5 - Criação de Anúncios": "pipefy_szs_all_cards_303024105",
  "PIPE 5.1 - Atualização de Anúncios": "pipefy_szs_all_cards_303024130",
};

const PIPE_IDS: Record<string, string> = {
  "pipefy_szs_all_cards_303807224": "0",
  "pipefy_szs_all_cards_303781436": "1",
  "pipefy_szs_all_cards_303828424": "2",
  "pipefy_szs_all_cards_302290867": "3",
  "pipefy_szs_all_cards_302290880": "4",
  "pipefy_szs_all_cards_303024105": "5",
  "pipefy_szs_all_cards_303024130": "5.1",
};

/**
 * Convert a raw Nekt row to PipefyCard format expected by pipefy-parser.ts
 * Nekt stores current_phase as a string like "{id=123, name=Go Live}"
 */
function nektRowToPipefyCard(row: Record<string, any>): PipefyCard {
  // Parse current_phase string "{id=123, name=Go Live}" → { name: "Go Live" }
  let currentPhaseName = "Desconhecido";
  if (row.current_phase && typeof row.current_phase === "string") {
    const match = row.current_phase.match(/name=([^,}]+)/);
    if (match?.[1]) currentPhaseName = match[1].trim();
  } else if (row.current_phase?.name) {
    currentPhaseName = row.current_phase.name;
  }

  // Parse fields array string → array of {name, value}
  let customFields: Array<{ name: string; value: string | null }> = [];
  if (row.fields && typeof row.fields === "string") {
    try {
      // Fields format: "[{name=Imóvel, native_value=PSO0304, value=PSO0304, ...}]"
      // title IS the codigo_imovel, so we inject it as a custom field
      customFields = [{ name: "Código Imóvel", value: row.title || null }];
    } catch {
      customFields = [];
    }
  }
  // Always ensure codigo_imovel is available (title = codigo_imovel in Pipefy)
  if (!customFields.some((f) => f.name.toLowerCase().includes("imovel"))) {
    customFields.push({ name: "Código Imóvel", value: row.title || null });
  }

  return {
    id: String(row.id || ""),
    title: String(row.title || ""),
    current_phase: { name: currentPhaseName },
    custom_fields: customFields,
    due_date: row.due_date || undefined,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    comments_count: Number(row.comments_count) || 0,
    attachments_count: 0,
  };
}

/**
 * Nekt API client — queries real Pipefy onboarding tables
 */
async function fetchFromNekt(retryCount = 0): Promise<Record<string, PipefyCard[]>> {
  try {
    const nektUrl = process.env.NEKT_API_URL;
    const nektToken = process.env.NEKT_API_KEY;

    if (!nektUrl || !nektToken) {
      console.warn(
        "[Nekt] Missing NEKT_API_URL or NEKT_API_KEY, returning empty data"
      );
      return Object.fromEntries(Object.keys(ONBOARDING_PIPES).map((k) => [k, []]));
    }

    console.log(`[Nekt] Fetching data (attempt ${retryCount + 1})...`);

    const result: Record<string, PipefyCard[]> = {};

    for (const [pipeName, tableName] of Object.entries(ONBOARDING_PIPES)) {
      try {
        const response = await fetch(`${nektUrl}/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${nektToken}`,
          },
          body: JSON.stringify({
            query: `SELECT id, title, current_phase, fields, created_at, updated_at, comments_count, done, late, overdue FROM nekt_trusted.${tableName} LIMIT 1000`,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rows = data.rows || [];
          const cards = rows.map((row: Record<string, any>) =>
            nektRowToPipefyCard(row)
          );
          result[pipeName] = cards;
          console.log(
            `[Nekt] Fetched ${cards.length} cards from ${pipeName}`
          );
        } else {
          console.warn(
            `[Nekt] Failed to fetch ${pipeName}: ${response.status} ${response.statusText}`
          );
          result[pipeName] = [];
        }
      } catch (tableError) {
        console.warn(`[Nekt] Error fetching ${pipeName}:`, tableError);
        result[pipeName] = [];
      }
    }

    return result;
  } catch (error) {
    console.error(`[Nekt] Fetch error:`, error);
    throw error;
  }
}

/**
 * Retry logic com exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: SyncConfig
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.max_retries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout")),
            config.timeout_ms
          )
        ),
      ]);
    } catch (error) {
      lastError = error as Error;
      if (attempt < config.max_retries) {
        const delay =
          config.retry_delay_ms *
          Math.pow(config.backoff_multiplier, attempt);
        console.warn(
          `[Nekt] Retry ${attempt + 1}/${config.max_retries} in ${delay}ms:`,
          lastError.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

interface NektRawRow {
  title: string;
  current_phase: string;
  done: boolean;
  late: boolean;
  overdue: boolean;
}

type NektRawResult = Record<string, { rows: NektRawRow[]; tableName: string }>;

/**
 * Parse MCP HTTP Streamable SSE stream into tool result text
 */
function parseSseText(text: string): string | null {
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const msg = JSON.parse(line.slice(6));
      if (msg.result?.content?.[0]?.text) return msg.result.content[0].text;
    } catch { /* skip */ }
  }
  return null;
}

/**
 * Initialize MCP HTTP Streamable session, return session ID
 */
async function initMcpSession(nektUrl: string, nektToken: string): Promise<string | null> {
  const response = await fetch(nektUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${nektToken}`,
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "monitor-onboarding", version: "1.0" },
      },
      id: 0,
    }),
  });
  if (!response.ok) {
    console.error(`[NektRaw] MCP init failed: ${response.status}`);
    return null;
  }
  const sessionId = response.headers.get("mcp-session-id");
  if (!sessionId) {
    console.error("[NektRaw] MCP init: no session ID in response headers");
    return null;
  }
  // Drain the SSE body to avoid connection leaks
  await response.text().catch(() => {});
  return sessionId;
}

async function fetchNektRaw(): Promise<NektRawResult> {
  const nektUrl = process.env.NEKT_API_URL;
  const nektToken = process.env.NEKT_API_KEY;
  const result: NektRawResult = {};

  if (!nektUrl || !nektToken) return result;

  // MCP HTTP Streamable requires session initialization before tools/call
  const sessionId = await initMcpSession(nektUrl, nektToken);
  if (!sessionId) {
    console.error("[NektRaw] Could not initialize MCP session, aborting sync");
    return result;
  }
  console.log(`[NektRaw] MCP session: ${sessionId}`);

  for (const [pipeName, tableName] of Object.entries(ONBOARDING_PIPES)) {
    try {
      const response = await fetch(nektUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nektToken}`,
          "Accept": "application/json, text/event-stream",
          "Mcp-Session-Id": sessionId,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "execute_sql",
            arguments: {
              sql_query: `SELECT title, current_phase, done, late, overdue FROM nekt_trusted.${tableName} WHERE done = false LIMIT 5000`,
            },
          },
          id: 1,
        }),
      });

      if (response.ok) {
        const rawText = await response.text();
        const text = parseSseText(rawText);
        if (text) {
          const parsed = JSON.parse(text) as { columns?: string[]; data?: string[][] };
          const rows: NektRawRow[] = (parsed.data ?? []).map((row) => ({
            title: row[0] ?? "",
            current_phase: row[1] ?? "",
            done: row[2] === "true",
            late: row[3] === "true",
            overdue: row[4] === "true",
          }));
          result[pipeName] = { rows, tableName };
          console.log(`[NektRaw] ${pipeName} → ${rows.length} active rows`);
        } else {
          console.error(`[NektRaw] ${pipeName} → empty MCP response`);
          result[pipeName] = { rows: [], tableName };
        }
      } else {
        const body = await response.text().catch(() => "");
        console.error(`[NektRaw] ${pipeName} → ${response.status}: ${body.slice(0, 200)}`);
        result[pipeName] = { rows: [], tableName };
      }
    } catch (err) {
      console.error(`[NektRaw] ${pipeName} → exception:`, err);
      result[pipeName] = { rows: [], tableName };
    }
  }
  return result;
}

async function upsertProperties(rawData: NektRawResult): Promise<number> {
  // Use Map to deduplicate by codigo_imovel — same property can appear in multiple pipes
  // Last pipe processed wins (pipes are ordered: 0→5.1, so pipe-specific data overwrites pipe mãe)
  const seen = new Map<string, { codigo_imovel: string; endereco: string; cidade: string; uf: string; metadata: unknown }>();

  for (const [pipeName, { rows, tableName }] of Object.entries(rawData)) {
    for (const row of rows) {
      if (!row.title) continue;
      let phase = "";
      const match = String(row.current_phase ?? "").match(/name=([^,}]+)/);
      if (match?.[1]) phase = match[1].trim();

      const patch: Record<string, unknown> = {
        pipe: PIPE_IDS[tableName] ?? "",
        pipe_name: pipeName,
        title: String(row.title),
        done: Boolean(row.done),
        late: Boolean(row.late),
        overdue: Boolean(row.overdue),
      };
      if (phase) patch.phase = phase;

      seen.set(String(row.title), {
        codigo_imovel: String(row.title),
        endereco: "",
        cidade: "",
        uf: "",
        metadata: patch,
      });
    }
  }

  const mapped = Array.from(seen.values());

  for (let i = 0; i < mapped.length; i += 200) {
    await db
      .insert(properties)
      .values(mapped.slice(i, i + 200))
      .onConflictDoUpdate({
        target: properties.codigo_imovel,
        // Merge: preserva campos existentes (link_pipefy, link_fotos, turno) e atualiza o patch
        set: { metadata: sql`${properties.metadata} || excluded.metadata`, updated_at: sql`now()` },
      });
  }

  return mapped.length;
}

/**
 * Sincronização principal
 */
export async function syncNekt(config = DEFAULT_CONFIG): Promise<SyncResult> {
  const startTime = Date.now();
  let retryCount = 0;
  let processedCount = 0;
  let failedCount = 0;

  try {
    console.log("[Nekt] Starting sync...");

    // Log início da sincronização
    await db.insert(sync_log).values({
      sync_type: "nekt",
      started_at: new Date(),
      status: "running",
      metadata: { config },
    });

    // Fetch com retry
    const pipelines = await retryWithBackoff(
      () => fetchFromNekt(retryCount),
      config
    );

    // Parse e normalizar (mantido para compatibilidade)
    const stages = await parseAllPipelines(pipelines);

    // Upsert properties.metadata com dados frescos da Nekt
    const rawData = await fetchNektRaw();
    processedCount = await upsertProperties(rawData);
    console.log(`[Nekt] Upserted ${processedCount} properties, parsed ${stages.length} stages`);

    // Log sucesso
    await db.update(sync_log).set({
      status: "success",
      completed_at: new Date(),
      items_processed: processedCount,
      items_failed: failedCount,
    });

    const executionTime = Date.now() - startTime;
    console.log(
      `[Nekt] Sync completed: ${processedCount} items, ${executionTime}ms`
    );

    return {
      success: true,
      items_processed: processedCount,
      items_failed: failedCount,
      retry_count: retryCount,
      execution_time_ms: executionTime,
    };
  } catch (error) {
    const cause = (error as any)?.cause;
    const causeMsg = cause instanceof Error ? ` | cause: ${cause.message}` : cause ? ` | cause: ${String(cause)}` : "";
    const errorMsg = (error instanceof Error ? error.message : String(error)) + causeMsg;

    // Log falha
    await db.update(sync_log).set({
      status: "failed",
      completed_at: new Date(),
      items_processed: processedCount,
      items_failed: failedCount,
      error_message: errorMsg,
    });

    const executionTime = Date.now() - startTime;
    console.error(`[Nekt] Sync failed: ${errorMsg}`);

    return {
      success: false,
      items_processed: processedCount,
      items_failed: failedCount,
      error: errorMsg,
      retry_count: retryCount,
      execution_time_ms: executionTime,
    };
  }
}

/**
 * Verifica se está na hora de sincronizar (05:00 ou 12:00 UTC)
 */
export function shouldSync(): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  return hour === 5 || hour === 12;
}

/**
 * Calcula próximo tempo de sincronização
 */
export function getNextSyncTime(): Date {
  const now = new Date();
  const hour = now.getUTCHours();

  let nextHour: number;
  if (hour < 5) {
    nextHour = 5;
  } else if (hour < 12) {
    nextHour = 12;
  } else {
    nextHour = 5; // Próximo dia
  }

  const next = new Date(now);
  next.setUTCHours(nextHour, 0, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}
