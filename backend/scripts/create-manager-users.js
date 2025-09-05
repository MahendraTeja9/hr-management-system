const { Pool } = require("pg");
require("dotenv").config({ path: "./config.env" });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const createManagerUsers = async () => {
  try {
    console.log("👥 Creating User Accounts for Managers...");
    console.log("=====================================");

    // Get all managers
    const managersResult = await pool.query("SELECT * FROM managers WHERE status = 'active'");
    console.log(`📋 Found ${managersResult.rows.length} active managers`);

    for (const manager of managersResult.rows) {
      console.log(`\n🔍 Processing manager: ${manager.manager_name} (${manager.email})`);

      // Check if user already exists
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [manager.email]
      );

      if (existingUser.rows.length > 0) {
        console.log(`ℹ️  User account already exists for ${manager.email}`);
        continue;
      }

      // Create user account for manager
      const userResult = await pool.query(
        "INSERT INTO users (email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [
          manager.email,
          "", // Empty password - manager will need to reset
          "manager",
          manager.manager_name.split(" ")[0] || manager.manager_name, // First name
          manager.manager_name.split(" ").slice(1).join(" ") || "", // Last name
        ]
      );

      const userId = userResult.rows[0].id;
      console.log(`✅ Created user account for ${manager.email} with ID: ${userId}`);

      // Update managers table with user_id
      await pool.query(
        "UPDATE managers SET user_id = $1 WHERE email = $2",
        [userId, manager.email]
      );
      console.log(`✅ Updated managers table with user_id: ${userId}`);
    }

    // Verify the results
    console.log("\n🔍 Verifying manager user accounts...");
    const verificationResult = await pool.query(`
      SELECT m.manager_name, m.email, m.user_id, u.role, u.status
      FROM managers m
      LEFT JOIN users u ON m.email = u.email
      WHERE m.status = 'active'
      ORDER BY m.manager_name
    `);

    console.log("✅ Manager user accounts status:");
    verificationResult.rows.forEach(row => {
      const status = row.user_id ? "✅ Active" : "❌ Missing";
      console.log(`   - ${row.manager_name} (${row.email}): ${status}`);
    });

    console.log("\n🎉 Manager user accounts creation completed!");

  } catch (error) {
    console.error("❌ Error creating manager user accounts:", error);
    throw error;
  } finally {
    await pool.end();
  }
};

createManagerUsers().catch(console.error);
