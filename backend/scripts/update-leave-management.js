require("dotenv").config({ path: "./config.env" });
const { pool } = require("../config/database.js");

async function updateLeaveManagementStructure() {
  try {
    console.log("🔄 Updating Leave Management Database Structure...");

    // Drop existing leave_requests table if it exists (to recreate with new schema)
    await pool.query("DROP TABLE IF EXISTS leave_requests CASCADE");
    console.log("✅ Dropped existing leave_requests table");

    // Create leave_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id SERIAL PRIMARY KEY,
        type_name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(20) DEFAULT '#3B82F6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Created leave_types table");

    // Create leave_balances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
              total_allocated INTEGER DEFAULT 15,
      leaves_taken INTEGER DEFAULT 0,
      leaves_remaining INTEGER DEFAULT 15,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, year),
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Created leave_balances table");

    // Create enhanced leave_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        series VARCHAR(50) UNIQUE NOT NULL,
        employee_id INTEGER NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        leave_type VARCHAR(100) NOT NULL,
        leave_balance_before INTEGER NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        half_day BOOLEAN DEFAULT FALSE,
        total_leave_days DECIMAL(3,1) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        manager_id INTEGER,
        manager_name VARCHAR(255),
        manager_approved_at TIMESTAMP,
        manager_approval_notes TEXT,
        hr_id INTEGER,
        hr_name VARCHAR(255),
        hr_approved_at TIMESTAMP,
        hr_approval_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Created enhanced leave_requests table");

    // Insert default leave types
    await pool.query(`
      INSERT INTO leave_types (type_name, description, color) VALUES
      ('Privilege Leave', 'Annual leave for personal reasons', '#3B82F6'),
      ('Sick Leave', 'Medical leave for health reasons', '#EF4444'),
      ('Casual Leave', 'Short-term leave for urgent matters', '#10B981'),
      ('Maternity Leave', 'Leave for expecting mothers', '#8B5CF6'),
      ('Paternity Leave', 'Leave for new fathers', '#F59E0B')
      ON CONFLICT (type_name) DO NOTHING
    `);
    console.log("✅ Inserted default leave types");

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_manager_id ON leave_requests(manager_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_hr_id ON leave_requests(hr_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(from_date, to_date);
      CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON leave_balances(employee_id, year);
    `);
    console.log("✅ Created performance indexes");

    // Initialize leave balances for existing employees (current year)
    const currentYear = new Date().getFullYear();
    await pool.query(
      `
      INSERT INTO leave_balances (employee_id, year, total_allocated, leaves_taken, leaves_remaining)
      SELECT 
        u.id, 
        $1, 
                15,
        0,
        15
      FROM users u
      WHERE u.role = 'employee'
      ON CONFLICT (employee_id, year) DO NOTHING
    `,
      [currentYear]
    );
    console.log("✅ Initialized leave balances for existing employees");

    console.log("🎉 Leave Management Database Structure Updated Successfully!");
  } catch (error) {
    console.error("❌ Error updating leave management structure:", error);
  } finally {
    await pool.end();
  }
}

updateLeaveManagementStructure();
