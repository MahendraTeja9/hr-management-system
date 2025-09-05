const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("dotenv").config({ path: "../config.env" });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function resetHRPassword() {
  const client = await pool.connect();
  try {
    console.log("🔐 Resetting HR password...");

    // Hash the password 'hr123'
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash("hr123", saltRounds);

    // Update the HR user password
    const result = await client.query(
      "UPDATE users SET password = $1 WHERE email = 'hr@nxzen.com'",
      [hashedPassword]
    );

    if (result.rowCount > 0) {
      console.log("✅ HR password reset successfully!");
      console.log("Email: hr@nxzen.com");
      console.log("Password: hr123");
    } else {
      console.log("❌ HR user not found");
    }

    // Verify the update
    const verifyResult = await client.query(
      "SELECT email, role FROM users WHERE email = 'hr@nxzen.com'"
    );

    if (verifyResult.rows.length > 0) {
      console.log("✅ Verification successful:");
      console.log(verifyResult.rows[0]);
    }
  } catch (error) {
    console.error("❌ Error resetting password:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
resetHRPassword();
