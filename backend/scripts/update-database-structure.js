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

const updateDatabaseStructure = async () => {
  try {
    console.log("🚀 Updating Database Structure...");
    console.log("=================================");

    // Add new columns to users table
    console.log("📋 Adding new columns to users table...");
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50),
      ADD COLUMN IF NOT EXISTS emergency_contact_name2 VARCHAR(100),
      ADD COLUMN IF NOT EXISTS emergency_contact_phone2 VARCHAR(20),
      ADD COLUMN IF NOT EXISTS emergency_contact_relationship2 VARCHAR(50)
    `);
    console.log("✅ Users table updated");

    // Add new columns to employee_forms table
    console.log("📋 Adding new columns to employee_forms table...");
    await pool.query(`
      ALTER TABLE employee_forms 
      ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS review_notes TEXT
    `);
    console.log("✅ Employee forms table updated");

    // Create onboarded_employees table if not exists
    console.log("📋 Creating onboarded_employees table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS onboarded_employees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE,
        employee_id VARCHAR(100),
        company_email VARCHAR(255),
        manager_id VARCHAR(100),
        manager_name VARCHAR(100),
        assigned_by INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending_assignment',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Onboarded employees table created/verified");

    // Add new columns to employee_master table
    console.log("📋 Adding new columns to employee_master table...");
    await pool.query(`
      ALTER TABLE employee_master 
      ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS department VARCHAR(100),
      ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
      ADD COLUMN IF NOT EXISTS salary_band VARCHAR(50),
      ADD COLUMN IF NOT EXISTS location VARCHAR(100)
    `);
    console.log("✅ Employee master table updated");

    // Create managers table
    console.log("📋 Creating managers table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS managers (
        id SERIAL PRIMARY KEY,
        manager_id VARCHAR(100) UNIQUE NOT NULL,
        manager_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        department VARCHAR(100),
        designation VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Managers table created/verified");

    // Add new columns to leave_requests table
    console.log("📋 Adding new columns to leave_requests table...");
    await pool.query(`
      ALTER TABLE leave_requests 
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS approval_notes TEXT
    `);
    console.log("✅ Leave requests table updated");

    // Add role column to leave_requests table
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'role'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN role VARCHAR(20) DEFAULT 'employee';
        END IF;
      END $$;
    `);

    // Create indexes for better performance
    console.log("📋 Creating performance indexes...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_employee_forms_employee_id ON employee_forms(employee_id);
      CREATE INDEX IF NOT EXISTS idx_employee_forms_status ON employee_forms(status);
      CREATE INDEX IF NOT EXISTS idx_onboarded_employees_user_id ON onboarded_employees(user_id);
      CREATE INDEX IF NOT EXISTS idx_onboarded_employees_status ON onboarded_employees(status);
      CREATE INDEX IF NOT EXISTS idx_employee_master_employee_id ON employee_master(employee_id);
      CREATE INDEX IF NOT EXISTS idx_employee_master_manager_id ON employee_master(manager_id);
      CREATE INDEX IF NOT EXISTS idx_managers_manager_id ON managers(manager_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
    `);
    console.log("✅ Performance indexes created/verified");

    // Insert default managers
    console.log("📋 Inserting default managers...");
    const managers = [
      {
        id: "MGR001",
        name: "Pradeep",
        email: "strawhatluff124@gmail.com",
        department: "Engineering",
      },
      {
        id: "MGR002",
        name: "Vamshi",
        email: "vamshi@company.com",
        department: "Product",
      },
      {
        id: "MGR003",
        name: "Vinod",
        email: "vinod@company.com",
        department: "Design",
      },
      {
        id: "MGR004",
        name: "Rakesh",
        email: "rakesh@company.com",
        department: "Marketing",
      },
    ];

    for (const manager of managers) {
      const managerExists = await pool.query(
        "SELECT * FROM managers WHERE manager_id = $1",
        [manager.id]
      );
      if (managerExists.rows.length === 0) {
        await pool.query(
          "INSERT INTO managers (manager_id, manager_name, email, department, designation) VALUES ($1, $2, $3, $4, $5)",
          [
            manager.id,
            manager.name,
            manager.email,
            manager.department,
            "Manager",
          ]
        );
        console.log(`✅ Manager created: ${manager.name} (${manager.id})`);
      } else {
        console.log(
          `ℹ️  Manager already exists: ${manager.name} (${manager.id})`
        );
      }
    }

    // Update HR user with first_name and last_name
    console.log("📋 Updating HR user details...");
    await pool.query(`
      UPDATE users 
      SET first_name = 'HR', last_name = 'Manager' 
      WHERE email = 'hr@nxzen.com' AND (first_name IS NULL OR last_name IS NULL)
    `);
    console.log("✅ HR user updated");

    console.log("\n🎉 Database structure update complete!");
    console.log("=====================================");
    console.log("📋 Enhanced tables:");
    console.log("   • users - Added personal details, emergency contacts");
    console.log("   • employee_forms - Added review tracking");
    console.log("   • onboarded_employees - New intermediate approval table");
    console.log(
      "   • employee_master - Added manager, department, designation"
    );
    console.log("   • managers - New table for manager information");
    console.log("   • leave_requests - Added approval tracking");
    console.log("   • Performance indexes for all tables");
  } catch (error) {
    console.error("❌ Error updating database structure:", error);
    throw error;
  } finally {
    await pool.end();
  }
};

updateDatabaseStructure().catch(console.error);
