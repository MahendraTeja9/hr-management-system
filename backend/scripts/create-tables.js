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

const createTables = async () => {
  try {
    console.log("🚀 Creating database tables...");
    console.log("===============================");

    // Users table
    console.log("📋 Creating users table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'employee',
        temp_password VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Users table created/verified");

    // Employee forms table
    console.log("📋 Creating employee_forms table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_forms (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        form_data JSONB NOT NULL,
        files TEXT[],
        status VARCHAR(50) DEFAULT 'pending',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Employee forms table created/verified");

    // Employee master table
    console.log("📋 Creating employee_master table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_master (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(100) UNIQUE NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        company_email VARCHAR(255) UNIQUE NOT NULL,
        manager_id VARCHAR(100),
        type VARCHAR(50) NOT NULL,
        doj DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Employee master table created/verified");

    // Attendance table
    console.log("📋 Creating attendance table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES users(id),
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        reason TEXT,
        clock_in_time TIMESTAMP,
        clock_out_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, date)
      )
    `);
    console.log("✅ Attendance table created/verified");

    // Leave requests table
    console.log("📋 Creating leave_requests table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES users(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Leave requests table created/verified");

    // Insert default HR user if not exists
    console.log("👤 Checking for default HR user...");
    const hrExists = await pool.query("SELECT * FROM users WHERE email = $1", [
      "hr@nxzen.com",
    ]);
    if (hrExists.rows.length === 0) {
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("hr123", 10);
      await pool.query(
        "INSERT INTO users (email, password, role) VALUES ($1, $2, $3)",
        ["hr@nxzen.com", hashedPassword, "hr"]
      );
      console.log("✅ Default HR user created: hr@nxzen.com / hr123");
    } else {
      console.log("ℹ️  Default HR user already exists");
    }

    // Insert sample data for testing
    console.log("📊 Inserting sample data...");

    // Sample employees
    const sampleEmployees = [
      {
        email: "john.doe@company.com",
        name: "John Doe",
        type: "Full-Time",
        doj: "2024-01-15",
      },
      {
        email: "jane.smith@company.com",
        name: "Jane Smith",
        type: "Contract",
        doj: "2024-02-01",
      },
      {
        email: "mike.wilson@company.com",
        name: "Mike Wilson",
        type: "Intern",
        doj: "2024-03-01",
      },
    ];

    for (const emp of sampleEmployees) {
      const userExists = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [emp.email]
      );
      if (userExists.rows.length === 0) {
        // Create user
        const userResult = await pool.query(
          "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id",
          [emp.email, "", "employee"]
        );

        // Create employee form
        await pool.query(
          `
          INSERT INTO employee_forms (employee_id, type, form_data, status, submitted_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
          [
            userResult.rows[0].id,
            emp.type,
            JSON.stringify({
              name: emp.name,
              email: emp.email,
              type: emp.type,
              doj: emp.doj,
              phone: "+1234567890",
              address: "123 Main St, City, State",
              emergency_contact: "Emergency Contact Name",
              emergency_phone: "+1987654321",
            }),
            "submitted",
            new Date(),
          ]
        );

        console.log(`✅ Sample employee created: ${emp.email}`);
      }
    }

    console.log("\n🎉 All tables created successfully!");
    console.log("=====================================");
    console.log("📋 Tables created:");
    console.log("   • users");
    console.log("   • employee_forms");
    console.log("   • employee_master");
    console.log("   • attendance");
    console.log("   • leave_requests");
    console.log("\n👤 Default users:");
    console.log("   • HR: hr@nxzen.com / hr123");
    console.log("   • Sample employees with submitted forms");
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run the script
createTables().catch(console.error);
