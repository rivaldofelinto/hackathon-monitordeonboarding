/**
 * seed-all.mjs — loads all 51,064 Nekt records (7 pipes) into Neon
 * Run: node scripts/seed-all.mjs
 * Source: scripts/data/pipe_{0,1,2,3,4,5,51}.json
 */

import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const { Client } = pg;

const DATABASE_URL =
  "postgresql://neondb_owner:npg_osIrJCPyg8q5@ep-proud-base-anmzzik8-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");

const PIPE_KEYS = ["0", "1", "2", "3", "4", "5", "51"];

const PIPE_NAMES = {
  "0": "Pipe 0 - Cadastro",
  "1": "Pipe 1 - Implantação",
  "2": "Pipe 2 - Pré-Onboarding",
  "3": "Pipe 3 - Onboarding",
  "4": "Pipe 4 - Ativação",
  "5": "Pipe 5 - Manutenção",
  "51": "Pipe 5.1 - Ajustes",
};

// Parse phase name from Pipefy format: "{id=..., name=PhaseName}" or plain text
function parsePhaseName(raw) {
  if (!raw) return "Desconhecido";
  const match = raw.match(/name=([^}]+)\}/);
  if (match) return match[1].trim();
  return raw.trim();
}

// Derive status from card data
function deriveStatus(done, late, phaseName) {
  if (done === "true" || done === true) return "done";
  const phase = (phaseName || "").toLowerCase();
  if (phase.includes("recusado") || phase.includes("excluí") || phase.includes("excluido")) return "blocked";
  if (phase.includes("backlog") || phase === "0. backlog") return "pending";
  return "active";
}

// Parse date strings — handles "2026-03-17 19:23:26.000 UTC" and ISO formats
function parseDate(raw) {
  if (!raw) return new Date();
  // Convert "2026-03-17 19:23:26.000 UTC" → "2026-03-17T19:23:26.000Z"
  const normalized = raw.trim().replace(" UTC", "Z").replace(" ", "T");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date() : d;
}

// Chunk array into batches
function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("Connected to Neon");

  // Clear existing data
  await client.query("TRUNCATE TABLE activities, stages, properties RESTART IDENTITY CASCADE");
  console.log("Cleared existing data");

  let totalProperties = 0;
  let totalStages = 0;

  for (const pipeKey of PIPE_KEYS) {
    const filePath = join(DATA_DIR, `pipe_${pipeKey}.json`);
    let records;
    try {
      records = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      console.log(`pipe_${pipeKey}: file not found, skipping`);
      continue;
    }

    console.log(`pipe_${pipeKey}: processing ${records.length} records...`);

    const propRows = [];
    const stageRows = [];

    for (const r of records) {
      const phaseName = parsePhaseName(r.current_phase);
      const isDone = r.done === "true" || r.done === true;
      const isLate = r.late === "true" || r.late === true;
      const status = deriveStatus(r.done, r.late, phaseName);
      const slaColor = isLate ? "red" : isDone ? "gray" : "green";

      // Use pipefy card id as unique codigo_imovel to guarantee uniqueness
      const codigoImovel = String(r.id);
      const createdAt = parseDate(r.created_at);
      const updatedAt = parseDate(r.updated_at);

      propRows.push({
        codigo_imovel: codigoImovel,
        endereco: r.title || codigoImovel,
        cidade: "",
        uf: "",
        responsavel: null,
        status,
        metadata: JSON.stringify({
          pipe: pipeKey,
          pipe_name: PIPE_NAMES[pipeKey],
          title: r.title,
          phase: phaseName,
          late: isLate,
          overdue: r.overdue === "true",
          done: isDone,
        }),
        created_at: createdAt,
        updated_at: updatedAt,
      });

      stageRows.push({
        codigo_imovel: codigoImovel,
        stage_name: phaseName,
        status: isDone ? "completed" : status === "blocked" ? "blocked" : "in_progress",
        sla_color: slaColor,
        started_at: createdAt,
        completed_at: isDone ? updatedAt : null,
      });
    }

    // Insert properties in batches of 500
    const propBatches = chunk(propRows, 500);
    for (const batch of propBatches) {
      const values = batch.map((r, i) => {
        const base = i * 9;
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`;
      }).join(",");
      const params = batch.flatMap((r) => [
        r.codigo_imovel, r.endereco, r.cidade, r.uf, r.responsavel,
        r.status, r.metadata, r.created_at, r.updated_at,
      ]);
      await client.query(
        `INSERT INTO properties (codigo_imovel, endereco, cidade, uf, responsavel, status, metadata, created_at, updated_at)
         VALUES ${values}
         ON CONFLICT (codigo_imovel) DO NOTHING`,
        params
      );
    }

    // Fetch property ids for stage insertion
    const codes = propRows.map((r) => r.codigo_imovel);
    const codeIdMap = {};
    // Fetch in batches to avoid huge IN clauses
    const codeBatches = chunk(codes, 500);
    for (const batch of codeBatches) {
      const placeholders = batch.map((_, i) => `$${i + 1}`).join(",");
      const res = await client.query(
        `SELECT id, codigo_imovel FROM properties WHERE codigo_imovel IN (${placeholders})`,
        batch
      );
      for (const row of res.rows) codeIdMap[row.codigo_imovel] = row.id;
    }

    // Build stage rows with resolved property_ids
    const resolvedStages = stageRows
      .filter((s) => codeIdMap[s.codigo_imovel])
      .map((s) => ({ ...s, property_id: codeIdMap[s.codigo_imovel] }));

    const stageBatches = chunk(resolvedStages, 500);
    for (const batch of stageBatches) {
      const values = batch.map((r, i) => {
        const base = i * 7;
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7})`;
      }).join(",");
      const params = batch.flatMap((r) => [
        r.property_id, 1, r.stage_name, r.status, r.sla_color, r.started_at, r.completed_at,
      ]);
      await client.query(
        `INSERT INTO stages (property_id, stage_number, stage_name, status, sla_color, started_at, completed_at)
         VALUES ${values}`,
        params
      );
    }

    totalProperties += propRows.length;
    totalStages += resolvedStages.length;
    console.log(`pipe_${pipeKey}: inserted ${propRows.length} properties, ${resolvedStages.length} stages`);
  }

  await client.end();
  console.log(`\nDone: ${totalProperties} properties, ${totalStages} stages inserted`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
