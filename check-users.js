const { pool } = require("./config/database");

async function checkUsers() {
  try {
    const result = await pool.query(
      "SELECT id, email, role, temp_password FROM users WHERE role = 'employee' LIMIT 3"
    );
    console.log(
      "Employee users:",
      result.rows.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        hasTempPassword: !!u.temp_password,
      }))
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

checkUsers();
