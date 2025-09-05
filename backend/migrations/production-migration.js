const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: "../.env" });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Production Migration System
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
    const sqlFile = path.join(__dirname, '..', '..', 'onboardd.sql');
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
      // Insert default HR user
      const hrExists = await pool.query("SELECT * FROM users WHERE email = $1", [
        "hr@nxzen.com",
      ]);
      if (hrExists.rows.length === 0) {
        const bcrypt = require("bcryptjs");
        const hashedPassword = await bcrypt.hash("hr123", 10);
        await pool.query(
          "INSERT INTO users (email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5)",
          ["hr@nxzen.com", hashedPassword, "hr", "HR", "Manager"]
        );
        console.log("✅ Default HR user created: hr@nxzen.com / hr123");
      }

      // Insert default admin user
      const adminExists = await pool.query("SELECT * FROM users WHERE email = $1", [
        "admin@nxzen.com",
      ]);
      if (adminExists.rows.length === 0) {
        const bcrypt = require("bcryptjs");
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await pool.query(
          "INSERT INTO users (email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5)",
          ["admin@nxzen.com", hashedPassword, "admin", "Admin", "User"]
        );
        console.log("✅ Default Admin user created: admin@nxzen.com / admin123");
      }

      // Insert default system settings
      await pool.query(`
        INSERT INTO system_settings (total_annual_leaves, allow_half_day, approval_workflow)
        SELECT 15, TRUE, 'manager_then_hr'
        WHERE NOT EXISTS (SELECT 1 FROM system_settings)
      `);

      // Insert default departments
      await pool.query(`
        INSERT INTO departments (name, code, description) VALUES
        ('Engineering', 'ENG', 'Software development and technical teams'),
        ('Product', 'PRD', 'Product management and strategy'),
        ('Design', 'DSN', 'UI/UX and graphic design'),
        ('Marketing', 'MKT', 'Marketing and communications'),
        ('Human Resources', 'HR', 'HR and administrative functions')
        ON CONFLICT (name) DO NOTHING
      `);

      // Insert default leave types
      await pool.query(`
        INSERT INTO leave_types (type_name, description, max_days, color) VALUES
        ('Earned/Annual Leave', 'Annual leave earned monthly (1.25 days/month)', 15, '#3B82F6'),
        ('Sick Leave', 'Medical leave earned monthly (0.5 days/month)', 6, '#EF4444'),
        ('Casual Leave', 'Short-term leave earned monthly (0.5 days/month)', 6, '#10B981'),
        ('Maternity Leave', 'Leave for expecting mothers', 180, '#8B5CF6'),
        ('Paternity Leave', 'Leave for new fathers', 15, '#F59E0B'),
        ('Comp Off', 'Compensatory off for overtime work', NULL, '#84CC16')
        ON CONFLICT (type_name) DO NOTHING
      `);

      console.log("✅ Production default data inserted");
    } catch (error) {
      console.error("❌ Failed to insert production data:", error.message);
      throw error;
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
      "CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id)",
      "CREATE INDEX IF NOT EXISTS idx_employee_documents_status ON employee_documents(status)",
      "CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id)",
      "CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status)",
      "CREATE INDEX IF NOT EXISTS idx_employee_master_email ON employee_master(company_email)",
      "CREATE INDEX IF NOT EXISTS idx_employee_master_employee_id ON employee_master(employee_id)",
      "CREATE INDEX IF NOT EXISTS idx_onboarded_employees_user_id ON onboarded_employees(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_onboarded_employees_status ON onboarded_employees(status)"
    ];

    for (const indexSql of indexes) {
      try {
        await pool.query(indexSql);
        console.log(`✅ Created index: ${indexSql.split(' ')[5]}`);
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
    console.log("=============================================");

    try {
      // Create migrations table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

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
    }
  }

  async getMigrationStatus() {
    try {
      const result = await pool.query(`
        SELECT id, name, description, executed_at 
        FROM migrations 
        ORDER BY executed_at
      `);
      
      console.log("📊 Production Migration Status:");
      console.log("==============================");
      
      if (result.rows.length === 0) {
        console.log("No migrations executed yet");
      } else {
        result.rows.forEach((migration, index) => {
          console.log(`${index + 1}. ${migration.id}: ${migration.name}`);
          console.log(`   Executed: ${migration.executed_at}`);
        });
      }
      
      return result.rows;
    } catch (error) {
      console.error("❌ Failed to get migration status:", error.message);
      return [];
    }
  }
}

// Export the migration system
module.exports = { ProductionMigration, pool };
