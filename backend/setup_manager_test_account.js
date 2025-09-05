const bcrypt = require("bcryptjs");
const { pool } = require("./config/database");

async function setupManagerTestAccount() {
  try {
    console.log("🔧 Setting up test manager account...");

    // Test manager credentials
    const testManager = {
      email: "test.manager@company.com",
      password: "manager123", // This will be the login password
      first_name: "Test",
      last_name: "Manager",
      role: "manager",
    };

    // Hash the password
    const hashedPassword = await bcrypt.hash(testManager.password, 10);

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [testManager.email]
    );

    if (existingUser.rows.length > 0) {
      // Update existing user
      await pool.query(
        `UPDATE users 
         SET password = $1, first_name = $2, last_name = $3, role = $4, temp_password = NULL
         WHERE email = $5`,
        [
          hashedPassword,
          testManager.first_name,
          testManager.last_name,
          testManager.role,
          testManager.email,
        ]
      );
      console.log("✅ Updated existing test manager account");
    } else {
      // Create new user
      await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, role, temp_password)
         VALUES ($1, $2, $3, $4, $5, NULL)`,
        [
          testManager.email,
          hashedPassword,
          testManager.first_name,
          testManager.last_name,
          testManager.role,
        ]
      );
      console.log("✅ Created new test manager account");
    }

    // Also ensure the manager exists in the managers table
    const existingManager = await pool.query(
      "SELECT manager_id FROM managers WHERE email = $1",
      [testManager.email]
    );

    if (existingManager.rows.length === 0) {
      await pool.query(
        `INSERT INTO managers (manager_name, email, department, designation, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          `${testManager.first_name} ${testManager.last_name}`,
          testManager.email,
          "IT",
          "Manager",
          "active",
        ]
      );
      console.log("✅ Added manager to managers table");
    }

    console.log("\n🎉 Test Manager Account Setup Complete!");
    console.log("=" * 50);
    console.log("📧 Email: test.manager@company.com");
    console.log("🔑 Password: manager123");
    console.log("👤 Role: manager");
    console.log("=" * 50);
    console.log(
      "\n💡 You can now login with these credentials to test the manager dashboard!"
    );
  } catch (error) {
    console.error("❌ Error setting up test manager account:", error);
  } finally {
    await pool.end();
  }
}

setupManagerTestAccount();
