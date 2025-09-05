const { Pool } = require("pg");
require("dotenv").config({ path: "./config.env" });

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

const createOnboardingTable = async () => {
  try {
    console.log("🚀 Creating Onboarded Employees Table...");
    console.log("=========================================");

    // Create onboarded_employees table
    console.log("📋 Creating onboarded_employees table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS onboarded_employees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE,
        employee_id VARCHAR(100),
        company_email VARCHAR(255),
        manager_id VARCHAR(100),
        assigned_by INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending_assignment',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Onboarded employees table created/verified");

    // Add indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_onboarded_employees_user_id ON onboarded_employees(user_id);
      CREATE INDEX IF NOT EXISTS idx_onboarded_employees_status ON onboarded_employees(status);
    `);
    console.log("✅ Indexes created/verified");

    console.log("\n🎉 Onboarded employees table setup complete!");
    console.log("=============================================");
    console.log("📋 New workflow:");
    console.log("   1. HR approves employee → moves to onboarded_employees");
    console.log(
      "   2. HR assigns details → employee_id, company_email, manager"
    );
    console.log("   3. Employee moves to employee_master table");
  } catch (error) {
    console.error("❌ Error creating onboarding table:", error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run the script
createOnboardingTable().catch(console.error);
