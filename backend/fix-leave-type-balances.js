require("dotenv").config({ path: "./config.env" });
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function fixLeaveTypeBalances() {
  try {
    console.log("🔧 Fixing Leave Type Balances...");

    // Get all employees with leave balances
    const employeesResult = await pool.query(
      `SELECT DISTINCT employee_id, year FROM leave_balances ORDER BY employee_id, year`
    );

    console.log(
      `\n📊 Found ${employeesResult.rows.length} employee-year combinations to fix`
    );

    for (const employee of employeesResult.rows) {
      const { employee_id, year } = employee;
      console.log(`\n🔍 Processing Employee ID: ${employee_id}, Year: ${year}`);

      // Get approved leave requests for this employee and year
      const leaveRequestsResult = await pool.query(
        `SELECT leave_type, SUM(total_leave_days) as total_days
         FROM leave_requests 
         WHERE employee_id = $1 AND EXTRACT(YEAR FROM created_at) = $2 AND status = 'approved'
         GROUP BY leave_type`,
        [employee_id, year]
      );

      if (leaveRequestsResult.rows.length === 0) {
        console.log(`   ℹ️  No approved leave requests found`);
        continue;
      }

      console.log(`   📋 Approved leave requests:`);
      leaveRequestsResult.rows.forEach((request) => {
        console.log(`      ${request.leave_type}: ${request.total_days} days`);
      });

      // Update leave type balances for each leave type
      for (const request of leaveRequestsResult.rows) {
        try {
          const updateResult = await pool.query(
            `UPDATE leave_type_balances 
             SET 
               leaves_taken = $1,
               leaves_remaining = total_allocated - $1,
               updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $2 AND year = $3 AND leave_type = $4`,
            [request.total_days, employee_id, year, request.leave_type]
          );

          if (updateResult.rowCount > 0) {
            console.log(
              `   ✅ Updated ${request.leave_type}: ${request.total_days} days taken`
            );
          } else {
            console.log(
              `   ⚠️  No ${request.leave_type} balance record found to update`
            );
          }
        } catch (updateError) {
          console.error(
            `   ❌ Error updating ${request.leave_type}:`,
            updateError.message
          );
        }
      }

      // Verify the fix
      const verificationResult = await pool.query(
        `SELECT leave_type, total_allocated, leaves_taken, leaves_remaining 
         FROM leave_type_balances 
         WHERE employee_id = $1 AND year = $2 
         ORDER BY leave_type`,
        [employee_id, year]
      );

      console.log(`   🔍 Verification after fix:`);
      verificationResult.rows.forEach((balance) => {
        console.log(
          `      ${balance.leave_type}: ${balance.total_allocated} allocated, ${balance.leaves_taken} taken, ${balance.leaves_remaining} remaining`
        );
      });
    }

    console.log("\n🎉 Leave type balance fix completed!");
  } catch (error) {
    console.error("❌ Error fixing leave type balances:", error);
  } finally {
    await pool.end();
  }
}

fixLeaveTypeBalances();
