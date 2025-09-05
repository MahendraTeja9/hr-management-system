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

const insertSampleData = async () => {
  try {
    console.log("🚀 Inserting Sample Data...");
    console.log("============================");

    // Check if sample data already exists
    const existingData = await pool.query(
      "SELECT COUNT(*) FROM employee_forms WHERE status = $1",
      ["submitted"]
    );
    if (existingData.rows[0].count > 0) {
      console.log("ℹ️  Sample data already exists, skipping...");
      return;
    }

    // Sample employees with forms
    const sampleEmployees = [
      {
        email: "john.doe@company.com",
        name: "John Doe",
        type: "Full-Time",
        doj: "2024-01-15",
        phone: "+1234567890",
        address: "123 Main St, City, State",
        emergency_contact: "Jane Doe",
        emergency_phone: "+1987654321",
      },
      {
        email: "jane.smith@company.com",
        name: "Jane Smith",
        type: "Contract",
        doj: "2024-02-01",
        phone: "+1234567891",
        address: "456 Oak Ave, City, State",
        emergency_contact: "John Smith",
        emergency_phone: "+1987654322",
      },
      {
        email: "mike.wilson@company.com",
        name: "Mike Wilson",
        type: "Intern",
        doj: "2024-03-01",
        phone: "+1234567892",
        address: "789 Pine Rd, City, State",
        emergency_contact: "Sarah Wilson",
        emergency_phone: "+1987654323",
      },
      {
        email: "sarah.johnson@company.com",
        name: "Sarah Johnson",
        type: "Full-Time",
        doj: "2024-01-20",
        phone: "+1234567893",
        address: "321 Elm St, City, State",
        emergency_contact: "Tom Johnson",
        emergency_phone: "+1987654324",
      },
      {
        email: "david.brown@company.com",
        name: "David Brown",
        type: "Contract",
        doj: "2024-02-15",
        phone: "+1234567894",
        address: "654 Maple Dr, City, State",
        emergency_contact: "Lisa Brown",
        emergency_phone: "+1987654325",
      },
    ];

    console.log("👥 Creating sample employees...");

    for (const emp of sampleEmployees) {
      // Check if user exists
      let userResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [emp.email]
      );

      if (userResult.rows.length === 0) {
        // Create user
        userResult = await pool.query(
          "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id",
          [emp.email, "", "employee"]
        );
        console.log(`✅ Created user: ${emp.email}`);
      } else {
        console.log(`ℹ️  User already exists: ${emp.email}`);
      }

      const userId = userResult.rows[0].id;

      // Check if form exists
      const formExists = await pool.query(
        "SELECT * FROM employee_forms WHERE employee_id = $1",
        [userId]
      );

      if (formExists.rows.length === 0) {
        // Create employee form
        await pool.query(
          `
          INSERT INTO employee_forms (employee_id, type, form_data, status, submitted_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
          [
            userId,
            emp.type,
            JSON.stringify({
              name: emp.name,
              email: emp.email,
              type: emp.type,
              doj: emp.doj,
              phone: emp.phone,
              address: emp.address,
              emergency_contact: emp.emergency_contact,
              emergency_phone: emp.emergency_phone,
            }),
            "submitted",
            new Date(),
          ]
        );

        console.log(`✅ Created form for: ${emp.email}`);
      } else {
        console.log(`ℹ️  Form already exists for: ${emp.email}`);
      }
    }

    // Create some sample attendance records
    console.log("📅 Creating sample attendance records...");

    const attendanceData = [
      // Historical data
      { email: "john.doe@company.com", date: "2024-08-24", status: "Present" },
      {
        email: "jane.smith@company.com",
        date: "2024-08-24",
        status: "Work From Home",
      },
      {
        email: "mike.wilson@company.com",
        date: "2024-08-24",
        status: "Present",
      },
      {
        email: "sarah.johnson@company.com",
        date: "2024-08-24",
        status: "Leave",
      },
      {
        email: "david.brown@company.com",
        date: "2024-08-24",
        status: "Present",
      },
      // Current month data (August 2025)
      {
        email: "strawhatluff124@gmail.com",
        date: "2025-08-15",
        status: "Present",
      },
      {
        email: "stalin@nxzen.com",
        date: "2025-08-15",
        status: "Work From Home",
      },
      {
        email: "strawhatluff124@gmail.com",
        date: "2025-08-16",
        status: "Present",
      },
      { email: "stalin@nxzen.com", date: "2025-08-16", status: "Present" },
      {
        email: "strawhatluff124@gmail.com",
        date: "2025-08-17",
        status: "Present",
      },
      { email: "stalin@nxzen.com", date: "2025-08-17", status: "Leave" },
    ];

    for (const att of attendanceData) {
      const user = await pool.query("SELECT id FROM users WHERE email = $1", [
        att.email,
      ]);
      if (user.rows.length > 0) {
        const userId = user.rows[0].id;

        // Check if attendance record exists
        const attExists = await pool.query(
          "SELECT * FROM attendance WHERE employee_id = $1 AND date = $2",
          [userId, att.date]
        );

        if (attExists.rows.length === 0) {
          await pool.query(
            `
            INSERT INTO attendance (employee_id, date, status, created_at)
            VALUES ($1, $2, $3, $4)
          `,
            [userId, att.date, att.status, new Date()]
          );

          console.log(`✅ Created attendance for ${att.email}: ${att.status}`);
        }
      }
    }

    // Create some sample leave requests
    console.log("🏖️  Creating sample leave requests...");

    const leaveData = [
      {
        email: "sarah.johnson@company.com",
        start_date: "2024-08-24",
        end_date: "2024-08-26",
        leave_type: "Sick Leave",
        reason: "Not feeling well",
      },
      {
        email: "david.brown@company.com",
        start_date: "2024-08-30",
        end_date: "2024-09-02",
        leave_type: "Vacation",
        reason: "Family vacation",
      },
    ];

    for (const leave of leaveData) {
      const user = await pool.query("SELECT id FROM users WHERE email = $1", [
        leave.email,
      ]);
      if (user.rows.length > 0) {
        const userId = user.rows[0].id;

        // Check if leave request exists
        const leaveExists = await pool.query(
          "SELECT * FROM leave_requests WHERE employee_id = $1 AND start_date = $2",
          [userId, leave.start_date]
        );

        if (leaveExists.rows.length === 0) {
          await pool.query(
            `
            INSERT INTO leave_requests (employee_id, start_date, end_date, leave_type, reason, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
            [
              userId,
              leave.start_date,
              leave.end_date,
              leave.leave_type,
              leave.reason,
              "Pending",
              new Date(),
            ]
          );

          console.log(
            `✅ Created leave request for ${leave.email}: ${leave.leave_type}`
          );
        }
      }
    }

    console.log("\n🎉 Sample data inserted successfully!");
    console.log("=====================================");
    console.log("📊 Data created:");
    console.log("   • 5 sample employees with forms");
    console.log("   • Sample attendance records");
    console.log("   • Sample leave requests");
    console.log("\n🔑 Test credentials:");
    console.log("   • HR: hr@nxzen.com / hr123");
    console.log("   • Employees: Use any of the sample emails");
  } catch (error) {
    console.error("❌ Error inserting sample data:", error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run the script
insertSampleData().catch(console.error);
