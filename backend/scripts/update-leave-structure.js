const { Pool } = require("pg");
require("dotenv").config({ path: "../config.env" });

async function updateLeaveStructure() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log("🔄 Updating Leave Structure to New Policy...");

    // 1. Update system settings to new total annual leaves (15)
    await pool.query(`
      UPDATE system_settings 
      SET total_annual_leaves = 15, updated_at = CURRENT_TIMESTAMP
      WHERE total_annual_leaves = 27
    `);
    console.log("✅ Updated system settings to 15 annual leaves");

    // 2. Update leave types to new structure
    // Update existing Earned/Annual Leave
    await pool.query(`
      UPDATE leave_types 
      SET description = 'Annual leave earned monthly (1.25 days/month)',
          max_days = 15,
          updated_at = CURRENT_TIMESTAMP
      WHERE type_name = 'Earned/Annual Leave'
    `);

    // Update Sick Leave
    await pool.query(`
      UPDATE leave_types 
      SET max_days = 6,
          description = 'Medical leave earned monthly (0.5 days/month)',
          updated_at = CURRENT_TIMESTAMP
      WHERE type_name = 'Sick Leave'
    `);

    // Update Casual Leave
    await pool.query(`
      UPDATE leave_types 
      SET max_days = 6,
          description = 'Short-term leave earned monthly (0.5 days/month)',
          updated_at = CURRENT_TIMESTAMP
      WHERE type_name = 'Casual Leave'
    `);

    // Remove unused leave types
    await pool.query(`
      DELETE FROM leave_types 
      WHERE type_name IN ('Paid Leave', 'Unpaid Leave', 'Privilege Leave')
    `);
    console.log("✅ Updated leave types to new structure");

    // 3. Create new monthly leave accrual table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS monthly_leave_accruals (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        earned_leave_accrued DECIMAL(3,2) DEFAULT 0,
        sick_leave_accrued DECIMAL(3,2) DEFAULT 0,
        casual_leave_accrued DECIMAL(3,2) DEFAULT 0,
        total_earned_leave DECIMAL(5,2) DEFAULT 0,
        total_sick_leave DECIMAL(5,2) DEFAULT 0,
        total_casual_leave DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, year, month)
      )
    `);
    console.log("✅ Created monthly leave accruals table");

    // 4. Create new leave type balances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_type_balances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        leave_type VARCHAR(100) NOT NULL,
        total_allocated DECIMAL(5,2) DEFAULT 0,
        leaves_taken DECIMAL(5,2) DEFAULT 0,
        leaves_remaining DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, year, leave_type)
      )
    `);
    console.log("✅ Created leave type balances table");

    // 5. Initialize leave type balances for existing employees
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    // Get all employees
    const employees = await pool.query(`
      SELECT DISTINCT id FROM employee_master
    `);

    for (const emp of employees.rows) {
      const employeeId = emp.id;

      // Calculate months of service for current year
      let monthsOfService = 0;
      if (currentMonth >= 4) {
        // April onwards
        monthsOfService = currentMonth - 3; // April = month 1
      } else {
        monthsOfService = currentMonth + 9; // Jan-Mar = months 10-12 of previous year
      }

      // Initialize leave type balances
      await pool.query(
        `
        INSERT INTO leave_type_balances (employee_id, year, leave_type, total_allocated, leaves_taken, leaves_remaining)
        VALUES 
          ($1, $2, 'Earned/Annual Leave', $3, 0, $3),
          ($1, $2, 'Sick Leave', $4, 0, $4),
          ($1, $2, 'Casual Leave', $5, 0, $5)
        ON CONFLICT (employee_id, year, leave_type) DO UPDATE SET
          total_allocated = EXCLUDED.total_allocated,
          leaves_remaining = EXCLUDED.total_allocated - leave_type_balances.leaves_taken,
          updated_at = CURRENT_TIMESTAMP
      `,
        [
          employeeId,
          currentYear,
          Math.min(monthsOfService * 1.25, 15), // Earned Leave: 1.25/month, max 15
          Math.min(monthsOfService * 0.5, 6), // Sick Leave: 0.5/month, max 6
          Math.min(monthsOfService * 0.5, 6), // Casual Leave: 0.5/month, max 6
        ]
      );

      // Initialize monthly accruals
      for (let month = 4; month <= currentMonth; month++) {
        // April to current month
        if (month <= 12) {
          // Same year
          await pool.query(
            `
            INSERT INTO monthly_leave_accruals (employee_id, year, month, earned_leave_accrued, sick_leave_accrued, casual_leave_accrued, total_earned_leave, total_sick_leave, total_casual_leave)
            VALUES ($1, $2, $3, 1.25, 0.5, 0.5, $4, $5, $6)
            ON CONFLICT (employee_id, year, month) DO NOTHING
          `,
            [
              employeeId,
              currentYear,
              month,
              Math.min((month - 3) * 1.25, 15),
              Math.min((month - 3) * 0.5, 6),
              Math.min((month - 3) * 0.5, 6),
            ]
          );
        }
      }
    }
    console.log("✅ Initialized leave type balances for existing employees");

    // 6. Update existing leave balances to new structure
    await pool.query(`
      UPDATE leave_balances 
      SET total_allocated = 15, leaves_remaining = 15 - leaves_taken, updated_at = CURRENT_TIMESTAMP
      WHERE total_allocated = 27
    `);
    console.log("✅ Updated existing leave balances to new structure");

    // 7. Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monthly_leave_accruals_employee_year_month ON monthly_leave_accruals(employee_id, year, month);
      CREATE INDEX IF NOT EXISTS idx_leave_type_balances_employee_year ON leave_type_balances(employee_id, year);
      CREATE INDEX IF NOT EXISTS idx_leave_type_balances_type ON leave_type_balances(leave_type);
    `);
    console.log("✅ Created performance indexes");

    console.log("🎉 Leave Structure Updated Successfully!");
    console.log("\n📋 New Leave Policy Summary:");
    console.log("• Earned/Annual Leave: 15 days per year (1.25 days/month)");
    console.log("• Sick Leave: 6 days per year (0.5 days/month)");
    console.log("• Casual Leave: 6 days per year (0.5 days/month)");
    console.log("• Leave year: April 1st to March 31st");
    console.log("• New employees can take leave after 1 month of service");
  } catch (error) {
    console.error("❌ Error updating leave structure:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the update
updateLeaveStructure()
  .then(() => {
    console.log("✅ Leave structure update completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Leave structure update failed:", error);
    process.exit(1);
  });
