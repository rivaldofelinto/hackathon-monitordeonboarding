/**
 * Nekt Polling Service
 * Executa sincronização em horários fixos: 05:00 UTC e 12:00 UTC
 * Retry logic com exponential backoff
 */

import { db } from "@/db/client";
import { sync_log } from "@/db/schema";
import { parseAllPipelines, prepareBatchInsert } from "./pipefy-parser";

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

interface SyncResult {
  success: boolean;
  items_processed: number;
  items_failed: number;
  error?: string;
  retry_count: number;
  execution_time_ms: number;
}

/**
 * Dummy Nekt API client
 * Em produção, usaria SDK da Nekt oficial
 */
async function fetchFromNekt(retryCount = 0): Promise<Record<string, any[]>> {
  try {
    // TODO: Implementar chamada real à Nekt API
    // const response = await fetch('https://api.nekt.com/v1/...');
    // return await response.json();

    console.log(`[Nekt] Fetching data (attempt ${retryCount + 1})...`);

    // Mock data para MVP
    return {
      documentacao: [],
      aprovacao_legal: [],
      validacao_financeira: [],
      integracao_sistema: [],
      testes_unitarios: [],
      qa_validacao: [],
      golive: [],
    };
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
    const syncLogEntry = await db.insert(sync_log).values({
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

    // Parse e normalizar
    const stages = await parseAllPipelines(pipelines);
    processedCount = stages.length;

    // TODO: Aqui faria batch insert no banco de dados
    // await insertStages(stages);

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
    const errorMsg = error instanceof Error ? error.message : String(error);

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
