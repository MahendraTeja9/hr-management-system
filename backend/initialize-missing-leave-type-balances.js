require("dotenv").config({ path: "./config.env" });
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function initializeMissingLeaveTypeBalances() {
  try {
    console.log("🔧 Initializing Missing Leave Type Balances...");

    // Get all employees with leave balances but without leave type balances
    const employeesResult = await pool.query(
      `SELECT DISTINCT lb.employee_id, lb.year, lb.total_allocated
       FROM leave_balances lb
       LEFT JOIN leave_type_balances ltb ON lb.employee_id = ltb.employee_id AND lb.year = ltb.year
       WHERE ltb.employee_id IS NULL
       ORDER BY lb.employee_id, lb.year`
    );

    console.log(
      `\n📊 Found ${employeesResult.rows.length} employees without leave type balances`
    );

    for (const employee of employeesResult.rows) {
      const { employee_id, year, total_allocated } = employee;
      console.log(`\n🔍 Processing Employee ID: ${employee_id}, Year: ${year}`);

      // Calculate months of service for this employee
      const currentMonth = new Date().getMonth() + 1;
      let monthsOfService = 0;

      if (currentMonth >= 4) {
        // April onwards
        monthsOfService = currentMonth - 3; // April = month 1
      } else {
        monthsOfService = currentMonth + 9; // Jan-Mar = months 10-12 of previous year
      }

      console.log(
        `   📅 Months of service in current leave year: ${monthsOfService}`
      );

      // Calculate leave allocations based on months of service
      const earnedLeaveAllocation = Math.min(monthsOfService * 1.25, 15);
      const sickLeaveAllocation = Math.min(monthsOfService * 0.5, 6);
      const casualLeaveAllocation = Math.min(monthsOfService * 0.5, 6);

      console.log(`   📋 Leave allocations:`);
      console.log(`      Earned/Annual Leave: ${earnedLeaveAllocation} days`);
      console.log(`      Sick Leave: ${sickLeaveAllocation} days`);
      console.log(`      Casual Leave: ${casualLeaveAllocation} days`);

      try {
        // Insert leave type balances
        const insertResult = await pool.query(
          `INSERT INTO leave_type_balances (employee_id, year, leave_type, total_allocated, leaves_taken, leaves_remaining, created_at, updated_at)
           VALUES 
             ($1, $2, 'Earned/Annual Leave', $3, 0, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
             ($1, $2, 'Sick Leave', $4, 0, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
             ($1, $2, 'Casual Leave', $5, 0, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            employee_id,
            year,
            earnedLeaveAllocation,
            sickLeaveAllocation,
            casualLeaveAllocation,
          ]
        );

        console.log(`   ✅ Leave type balances initialized successfully`);

        // Now check if there are any approved leave requests to update the taken amounts
        const leaveRequestsResult = await pool.query(
          `SELECT leave_type, SUM(total_leave_days) as total_days
           FROM leave_requests 
           WHERE employee_id = $1 AND EXTRACT(YEAR FROM created_at) = $2 AND status = 'approved'
           GROUP BY leave_type`,
          [employee_id, year]
        );

        if (leaveRequestsResult.rows.length > 0) {
          console.log(`   📋 Found approved leave requests to sync:`);

          for (const request of leaveRequestsResult.rows) {
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
                `      ✅ Updated ${request.leave_type}: ${request.total_days} days taken`
              );
            }
          }
        }
      } catch (insertError) {
        console.error(
          `   ❌ Error initializing leave type balances:`,
          insertError.message
        );
      }
    }

    console.log("\n🎉 Missing leave type balance initialization completed!");
  } catch (error) {
    console.error("❌ Error initializing missing leave type balances:", error);
  } finally {
    await pool.end();
  }
}

initializeMissingLeaveTypeBalances();
