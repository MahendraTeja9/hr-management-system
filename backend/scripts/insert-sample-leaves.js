const { pool } = require("../config/database");

const insertSampleLeaveRequests = async () => {
  try {
    console.log("🔄 Inserting sample leave requests...");

    // First, let's check if we have any employees in the system
    const employeesResult = await pool.query(`
      SELECT u.id, u.email, em.employee_name, em.employee_id as emp_id
      FROM users u
      JOIN employee_master em ON u.email = em.company_email
      WHERE u.role = 'employee'
      LIMIT 5
    `);

    if (employeesResult.rows.length === 0) {
      console.log("❌ No employees found. Please add some employees first.");
      return;
    }

    console.log(`✅ Found ${employeesResult.rows.length} employees`);

    // Sample leave request data
    const sampleLeaves = [
      {
        employee_id: employeesResult.rows[0].id,
        start_date: "2024-12-20",
        end_date: "2024-12-22",
        leave_type: "Annual Leave",
        reason: "Family vacation during holidays",
        status: "Pending",
      },
      {
        employee_id: employeesResult.rows[0].id,
        start_date: "2024-12-25",
        end_date: "2024-12-26",
        leave_type: "Sick Leave",
        reason: "Not feeling well, need rest",
        status: "Approved",
      },
      {
        employee_id: employeesResult.rows[0].id,
        start_date: "2024-12-30",
        end_date: "2024-12-31",
        leave_type: "Casual Leave",
        reason: "Personal work at home",
        status: "Rejected",
      },
    ];

    // Add more sample data if we have more employees
    if (employeesResult.rows.length > 1) {
      sampleLeaves.push({
        employee_id: employeesResult.rows[1].id,
        start_date: "2024-12-23",
        end_date: "2024-12-24",
        leave_type: "Casual Leave",
        reason: "Doctor appointment",
        status: "Pending",
      });
    }

    // Insert sample leave requests
    for (const leave of sampleLeaves) {
      await pool.query(
        `
        INSERT INTO leave_requests (employee_id, start_date, end_date, leave_type, reason, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `,
        [
          leave.employee_id,
          leave.start_date,
          leave.end_date,
          leave.leave_type,
          leave.reason,
          leave.status,
        ]
      );
    }

    console.log(`✅ Inserted ${sampleLeaves.length} sample leave requests`);
    console.log(
      "🎉 Sample data ready! You can now test the HR Leave Management Dashboard."
    );
  } catch (error) {
    console.error("❌ Error inserting sample data:", error);
  } finally {
    await pool.end();
  }
};

// Run the script
insertSampleLeaveRequests();
