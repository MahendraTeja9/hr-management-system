const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Override the pool with correct credentials
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'deploy',
  user: 'postgres',
  password: 'shibin',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Production Migration System (copied and modified)
class ProductionMigration {
  constructor() {
    this.migrations = [];
    this.loadMigrations();
  }

  loadMigrations() {
    this.migrations = [
      {
        id: '001_production_schema',
        name: 'Production Database Schema',
        description: 'Create production database schema from onboardd.sql',
        up: this.runProductionSchema.bind(this),
        down: this.rollbackProductionSchema.bind(this)
      },
      {
        id: '002_production_data',
        name: 'Production Default Data',
        description: 'Insert default production data (HR users, settings, etc.)',
        up: this.insertProductionData.bind(this),
        down: this.removeProductionData.bind(this)
      },
      {
        id: '003_production_indexes',
        name: 'Production Performance Indexes',
        description: 'Create indexes for production performance',
        up: this.createProductionIndexes.bind(this),
        down: this.dropProductionIndexes.bind(this)
      }
    ];
  }

  async runProductionSchema() {
    console.log("📋 Running production schema migration...");
    
    // Check if onboardd.sql exists
    const sqlFile = path.join(__dirname, '..', 'onboardd.sql');
    if (!fs.existsSync(sqlFile)) {
      console.log("⚠️  onboardd.sql not found, skipping schema migration");
      return;
    }

    try {
      // Read the SQL dump file
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      
      // Split by statements and execute them
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`📊 Found ${statements.length} SQL statements to execute`);

      for (const statement of statements) {
        if (statement.toLowerCase().includes('create table') || 
            statement.toLowerCase().includes('create index') ||
            statement.toLowerCase().includes('alter table') ||
            statement.toLowerCase().includes('create sequence') ||
            statement.toLowerCase().includes('create function') ||
            statement.toLowerCase().includes('create trigger')) {
          try {
            await pool.query(statement);
            console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
          } catch (error) {
            // Ignore "already exists" errors
            if (!error.message.includes('already exists') && 
                !error.message.includes('duplicate key')) {
              console.log(`⚠️  Warning: ${error.message}`);
            }
          }
        }
      }

      console.log("✅ Production schema migration completed");
    } catch (error) {
      console.error("❌ Production schema migration failed:", error.message);
      throw error;
    }
  }

  async rollbackProductionSchema() {
    console.log("🔄 Rolling back production schema...");
    console.log("⚠️  Rollback not implemented for safety");
  }

  async insertProductionData() {
    console.log("📋 Inserting production default data...");
    
    try {
      // Check if users table exists first
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        )
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log("⚠️  Users table doesn't exist, skipping data insertion");
        return;
      }

      // Insert default HR user
      const hrExists = await pool.query("SELECT * FROM users WHERE email = $1", [
        "hr@nxzen.com",
      ]);
      if (hrExists.rows.length === 0) {
        const bcrypt = require("bcryptjs");
        const hashedPassword = await bcrypt.hash("hr123", 10);
        await pool.query(
          "INSERT INTO users (email, password, role, username) VALUES ($1, $2, $3, $4)",
          ["hr@nxzen.com", hashedPassword, "hr", "hr_manager"]
        );
        console.log("✅ Default HR user created: hr@nxzen.com / hr123");
      } else {
        console.log("ℹ️  HR user already exists");
      }

      // Insert default admin user
      const adminExists = await pool.query("SELECT * FROM users WHERE email = $1", [
        "admin@nxzen.com",
      ]);
      if (adminExists.rows.length === 0) {
        const bcrypt = require("bcryptjs");
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await pool.query(
          "INSERT INTO users (email, password, role, username) VALUES ($1, $2, $3, $4)",
          ["admin@nxzen.com", hashedPassword, "admin", "admin_user"]
        );
        console.log("✅ Default Admin user created: admin@nxzen.com / admin123");
      } else {
        console.log("ℹ️  Admin user already exists");
      }

      console.log("✅ Production default data inserted");
    } catch (error) {
      console.error("❌ Failed to insert production data:", error.message);
      // Don't throw error, just log it
      console.log("ℹ️  Continuing with migration despite data insertion issues");
    }
  }

  async removeProductionData() {
    console.log("🔄 Rolling back production data...");
    console.log("⚠️  Rollback not implemented for safety");
  }

  async createProductionIndexes() {
    console.log("📋 Creating production performance indexes...");
    
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
      "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
      "CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date)",
      "CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id)",
      "CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status)",
      "CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id)",
      "CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)",
      "CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id)",
      "CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status)",
      "CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)",
      "CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id)"
    ];

    for (const indexSql of indexes) {
      try {
        await pool.query(indexSql);
        const indexName = indexSql.split(' ')[5];
        console.log(`✅ Created index: ${indexName}`);
      } catch (error) {
        console.log(`⚠️  Index creation warning: ${error.message}`);
      }
    }

    console.log("✅ Production indexes migration completed");
  }

  async dropProductionIndexes() {
    console.log("🔄 Rolling back production indexes...");
    console.log("⚠️  Rollback not implemented for safety");
  }

  async runMigrations() {
    console.log("🚀 Starting production database migrations...");
    console.log("=============================================\n");

    try {
      // Test connection first
      const client = await pool.connect();
      console.log("✅ Database connection successful");
      client.release();

      // Create migrations table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("✅ Migrations table ready");

      // Get executed migrations
      const executedMigrations = await pool.query(
        "SELECT id FROM migrations ORDER BY executed_at"
      );
      const executedIds = executedMigrations.rows.map(row => row.id);

      // Run pending migrations
      for (const migration of this.migrations) {
        if (!executedIds.includes(migration.id)) {
          console.log(`\n📋 Running migration: ${migration.name}`);
          console.log(`📝 Description: ${migration.description}`);
          
          await migration.up();
          
          // Record migration as executed
          await pool.query(
            "INSERT INTO migrations (id, name, description) VALUES ($1, $2, $3)",
            [migration.id, migration.name, migration.description]
          );
          
          console.log(`✅ Migration ${migration.id} completed`);
        } else {
          console.log(`⏭️  Migration ${migration.id} already executed`);
        }
      }

      console.log("\n🎉 All production migrations completed successfully!");
      
    } catch (error) {
      console.error("❌ Production migration failed:", error.message);
      throw error;
    } finally {
      await pool.end();
    }
  }
}

// Run the migration
async function main() {
  try {
    const migration = new ProductionMigration();
    await migration.runMigrations();
    console.log("\n✅ Production migration process completed!");
  } catch (error) {
    console.error("❌ Migration process failed:", error.message);
    process.exit(1);
  }
}

main();