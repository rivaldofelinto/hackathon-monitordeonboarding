import postgres from "postgres";

/**
 * Script para executar migrations no Neon database
 * Executar: DATABASE_URL=... npx tsx src/db/migrate.ts
 */

const sql = postgres(process.env.DATABASE_URL || "");

async function migrate() {
  try {
    console.log("🚀 Starting migrations...");

    // Create properties table
    await sql`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        codigo_imovel VARCHAR(50) NOT NULL UNIQUE,
        endereco TEXT NOT NULL,
        cidade VARCHAR(100) NOT NULL,
        uf VARCHAR(2) NOT NULL,
        responsavel VARCHAR(100),
        status VARCHAR(20) DEFAULT 'ativo',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log("✅ Table 'properties' created");

    // Create stages table
    await sql`
      CREATE TABLE IF NOT EXISTS stages (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        stage_number INTEGER NOT NULL,
        stage_name VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        sla_color VARCHAR(20) DEFAULT 'green',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        blocked_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log("✅ Table 'stages' created");

    // Create activities table
    await sql`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        actor VARCHAR(100),
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log("✅ Table 'activities' created");

    // Create sync_log table
    await sql`
      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        sync_type VARCHAR(50) NOT NULL,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        status VARCHAR(20) NOT NULL,
        items_processed INTEGER DEFAULT 0,
        items_failed INTEGER DEFAULT 0,
        error_message TEXT,
        metadata JSONB
      );
    `;
    console.log("✅ Table 'sync_log' created");

    // Create indices for better query performance
    await sql`CREATE INDEX IF NOT EXISTS idx_properties_codigo ON properties(codigo_imovel);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stages_property ON stages(property_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stages_status ON stages(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activities_stage ON activities(stage_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activities_property ON activities(property_id);`;
    console.log("✅ Indices created");

    console.log("\n✨ All migrations completed successfully!");
    await sql.end();
  } catch (error) {
    console.error("❌ Migration error:", error);
    await sql.end();
    process.exit(1);
  }
}

migrate();
