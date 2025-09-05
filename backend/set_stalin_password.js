const bcrypt = require("bcryptjs");
const { pool } = require("./config/database");

async function setStalinPassword() {
  try {
    console.log("🔧 Setting password for stalin j...");

    const stalinEmail = "stalin31@gmail.com";
    const newPassword = "stalin123";

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update stalin's password
    const result = await pool.query(
      `UPDATE users 
       SET password = $1, temp_password = NULL
       WHERE email = $2 AND role = 'employee'
       RETURNING id, email, first_name, last_name`,
      [hashedPassword, stalinEmail]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log("✅ Updated stalin j's password successfully!");
      console.log("\n🎉 Stalin j Login Credentials:");
      console.log("=" * 40);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔑 Password: ${newPassword}`);
      console.log(`👤 Name: ${user.first_name} ${user.last_name}`);
      console.log(`🎭 Role: employee`);
      console.log("=" * 40);
      console.log("\n💡 You can now login as stalin j to view attendance!");
    } else {
      console.log("❌ User account not found or not updated");
    }
  } catch (error) {
    console.error("❌ Error setting stalin j's password:", error);
  } finally {
    await pool.end();
  }
}

setStalinPassword();
