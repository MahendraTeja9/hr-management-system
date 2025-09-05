#!/usr/bin/env node

const { ProductionMigration } = require('./migrations/production-migration');

async function main() {
  const migration = new ProductionMigration();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      console.log("🚀 Running production database migrations...");
      await migration.runMigrations();
      break;
      
    case 'status':
      console.log("📊 Checking production migration status...");
      await migration.getMigrationStatus();
      break;
      
    case 'help':
    default:
      console.log("📋 Production Database Migration Tool");
      console.log("====================================");
      console.log("Usage: node production-migration-runner.js <command>");
      console.log("");
      console.log("Commands:");
      console.log("  migrate  - Run pending production migrations");
      console.log("  status   - Show production migration status");
      console.log("  help     - Show this help message");
      console.log("");
      console.log("Examples:");
      console.log("  node production-migration-runner.js migrate");
      console.log("  node production-migration-runner.js status");
      break;
  }
  
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Production migration tool failed:", error.message);
  process.exit(1);
});
