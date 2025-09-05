const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: "../config.env" });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function resetLuffyPassword() {
  const client = await pool.connect();
  try {
    console.log("🔐 Resetting Luffy manager password...");

    // Hash the temporary password 'luffy123'
    const tempPassword = "luffy123";
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

    // Update the Luffy manager password (remove temp_password flag)
    const result = await client.query(
      "UPDATE users SET password = $1, temp_password = NULL WHERE email = 'strawhatluff124@gmail.com'",
      [hashedPassword]
    );

    if (result.rowCount > 0) {
      console.log("✅ Luffy manager password reset successfully!");
      console.log("Email: strawhatluff124@gmail.com");
      console.log("Temporary Password: luffy123");
      console.log("Role: manager");
    } else {
      console.log("❌ Luffy manager user not found");
    }

    // Verify the update
    const verifyResult = await client.query(
      "SELECT id, email, role, temp_password FROM users WHERE email = 'strawhatluff124@gmail.com'"
    );

    if (verifyResult.rows.length > 0) {
      console.log("✅ Verification successful:");
      console.log(verifyResult.rows[0]);
    }

    // Also verify the manager record
    const managerResult = await client.query(
      "SELECT id, manager_name, email, user_id FROM managers WHERE email = 'strawhatluff124@gmail.com'"
    );

    if (managerResult.rows.length > 0) {
      console.log("✅ Manager record:");
      console.log(managerResult.rows[0]);
    }
  } catch (error) {
    console.error("❌ Error resetting password:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
resetLuffyPassword();
