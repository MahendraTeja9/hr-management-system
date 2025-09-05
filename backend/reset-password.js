const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
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

const resetPassword = async () => {
  try {
    console.log("🔐 Resetting Password for Test User...");
    
    const email = 'stalinj4747@gmail.com';
    const newPassword = 'test123';
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    const result = await pool.query(
      "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email",
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log(`✅ Password reset successfully for ${email}`);
      console.log(`🔑 New password: ${newPassword}`);
      console.log(`📧 Email: ${email}`);
    } else {
      console.log(`❌ User not found: ${email}`);
    }
    
  } catch (error) {
    console.error("❌ Error resetting password:", error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run the script
resetPassword().catch(console.error);
