require("dotenv").config({ path: "./config.env" });
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testLeaveTypeBalances() {
  try {
    console.log("🔍 Testing Leave Type Balances...");

    // Test with a specific employee (you can change this ID)
    const employeeId = 28; // Change this to test with a different employee
    const currentYear = new Date().getFullYear();

    console.log(
      `\n📊 Testing for Employee ID: ${employeeId}, Year: ${currentYear}`
    );

    // 1. Check overall leave balance
    const overallBalanceResult = await pool.query(
      `SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2`,
      [employeeId, currentYear]
    );

    if (overallBalanceResult.rows.length > 0) {
      const overall = overallBalanceResult.rows[0];
      console.log("\n📋 Overall Leave Balance:");
      console.log(`   Total Allocated: ${overall.total_allocated}`);
      console.log(`   Leaves Taken: ${overall.leaves_taken}`);
      console.log(`   Leaves Remaining: ${overall.leaves_remaining}`);
    } else {
      console.log("\n❌ No overall leave balance found");
    }

    // 2. Check leave type balances
    const leaveTypeResult = await pool.query(
      `SELECT * FROM leave_type_balances WHERE employee_id = $1 AND year = $2 ORDER BY leave_type`,
      [employeeId, currentYear]
    );

    if (leaveTypeResult.rows.length > 0) {
      console.log("\n📋 Leave Type Balances:");
      leaveTypeResult.rows.forEach((balance, index) => {
        console.log(`   ${index + 1}. ${balance.leave_type}:`);
        console.log(`      Allocated: ${balance.total_allocated}`);
        console.log(`      Taken: ${balance.leaves_taken}`);
        console.log(`      Remaining: ${balance.leaves_remaining}`);
      });
    } else {
      console.log("\n❌ No leave type balances found");
    }

    // 3. Check leave requests to see what leaves were taken
    const leaveRequestsResult = await pool.query(
      `SELECT leave_type, total_leave_days, status, created_at 
       FROM leave_requests 
       WHERE employee_id = $1 AND EXTRACT(YEAR FROM created_at) = $2 AND status = 'approved'
       ORDER BY created_at DESC`,
      [employeeId, currentYear]
    );

    if (leaveRequestsResult.rows.length > 0) {
      console.log("\n📋 Approved Leave Requests:");
      leaveRequestsResult.rows.forEach((request, index) => {
        console.log(
          `   ${index + 1}. ${request.leave_type}: ${
            request.total_leave_days
          } days (${request.created_at})`
        );
      });
    } else {
      console.log("\n❌ No approved leave requests found for this year");
    }

    // 4. Check if there's a mismatch
    if (
      overallBalanceResult.rows.length > 0 &&
      leaveTypeResult.rows.length > 0
    ) {
      const overall = overallBalanceResult.rows[0];
      const totalTakenFromTypes = leaveTypeResult.rows.reduce(
        (sum, balance) => sum + parseFloat(balance.leaves_taken || 0),
        0
      );

      console.log("\n🔍 Balance Mismatch Check:");
      console.log(`   Overall leaves_taken: ${overall.leaves_taken}`);
      console.log(`   Sum of leave type leaves_taken: ${totalTakenFromTypes}`);

      if (Math.abs(overall.leaves_taken - totalTakenFromTypes) > 0.01) {
        console.log(
          "   ⚠️  MISMATCH DETECTED! Leave type balances don't match overall balance."
        );
        console.log(
          "   This is why the Leave Type Breakdown shows incorrect 'Taken' values."
        );
      } else {
        console.log("   ✅ Balances match correctly.");
      }
    }
  } catch (error) {
    console.error("❌ Error testing leave type balances:", error);
  } finally {
    await pool.end();
  }
}

testLeaveTypeBalances();
