const bcrypt = require("bcryptjs");
const { pool } = require("./config/database");

async function fixDoriManagerAccount() {
  try {
    console.log("🔧 Fixing dori d's manager account...");

    const doriEmail = "dori7728@gmail.com";
    const newPassword = "dori123"; // New password for login

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user account to have manager role and proper password
    const result = await pool.query(
      `UPDATE users 
       SET role = 'manager', 
           password = $1, 
           temp_password = NULL,
           first_name = 'dori',
           last_name = 'd'
       WHERE email = $2
       RETURNING id, email, first_name, last_name, role`,
      [hashedPassword, doriEmail]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log("✅ Updated dori d's user account successfully!");
      console.log("\n🎉 Dori d Manager Login Credentials:");
      console.log("=" * 45);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔑 Password: ${newPassword}`);
      console.log(`👤 Name: ${user.first_name} ${user.last_name}`);
      console.log(`🎭 Role: ${user.role}`);
      console.log("=" * 45);
      console.log(
        "\n💡 You can now login as dori d to access the manager dashboard!"
      );

      // Also verify the manager exists in managers table
      const managerCheck = await pool.query(
        "SELECT manager_name, email, status FROM managers WHERE email = $1",
        [doriEmail]
      );

      if (managerCheck.rows.length > 0) {
        console.log("✅ Manager record exists in managers table");
        console.log(`📋 Manager Name: ${managerCheck.rows[0].manager_name}`);
        console.log(`📧 Manager Email: ${managerCheck.rows[0].email}`);
        console.log(`📊 Status: ${managerCheck.rows[0].status}`);
      }
    } else {
      console.log("❌ User account not found or not updated");
    }
  } catch (error) {
    console.error("❌ Error fixing dori d's manager account:", error);
  } finally {
    await pool.end();
  }
}

fixDoriManagerAccount();
