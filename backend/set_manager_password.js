const bcrypt = require("bcryptjs");
const { pool } = require("./config/database");

async function setManagerPassword() {
  try {
    console.log("🔧 Setting password for existing manager account...");
    
    // Manager credentials to update
    const managerEmail = "vamshi@nxzen.com";
    const newPassword = "manager123";
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the manager's password
    const result = await pool.query(
      `UPDATE users 
       SET password = $1, temp_password = NULL
       WHERE email = $2 AND role = 'manager'
       RETURNING id, email, first_name, last_name`,
      [hashedPassword, managerEmail]
    );
    
    if (result.rows.length > 0) {
      const manager = result.rows[0];
      console.log("✅ Updated manager password successfully!");
      console.log("\n🎉 Manager Login Credentials:");
      console.log("=" * 40);
      console.log(`📧 Email: ${manager.email}`);
      console.log(`🔑 Password: ${newPassword}`);
      console.log(`👤 Name: ${manager.first_name} ${manager.last_name}`);
      console.log(`🎭 Role: manager`);
      console.log("=" * 40);
      console.log("\n💡 You can now login with these credentials!");
    } else {
      console.log("❌ Manager not found or not updated");
    }
    
  } catch (error) {
    console.error("❌ Error setting manager password:", error);
  } finally {
    await pool.end();
  }
}

setManagerPassword();
