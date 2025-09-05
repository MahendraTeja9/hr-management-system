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

const assignManagers = async () => {
  try {
    console.log("🚀 Assigning Managers to Employees...");
    console.log("=====================================");

    // First, let's check what managers we have
    const managersResult = await pool.query(
      "SELECT manager_id, manager_name, email FROM managers"
    );
    console.log("📋 Available managers:", managersResult.rows);

    if (managersResult.rows.length === 0) {
      console.log(
        "❌ No managers found in database. Please run the database initialization first."
      );
      return;
    }

    // Get all employees from employee_master who don't have managers
    const employeesResult = await pool.query(`
      SELECT id, employee_id, employee_name, company_email, manager_id, manager_name 
      FROM employee_master 
      WHERE manager_id IS NULL OR manager_name IS NULL
    `);

    console.log(
      `👥 Found ${employeesResult.rows.length} employees without managers`
    );

    if (employeesResult.rows.length === 0) {
      console.log("ℹ️  All employees already have managers assigned.");
      return;
    }

    // Assign managers to employees
    for (let i = 0; i < employeesResult.rows.length; i++) {
      const employee = employeesResult.rows[i];
      // Round-robin assignment of managers
      const managerIndex = i % managersResult.rows.length;
      const manager = managersResult.rows[managerIndex];

      console.log(
        `🔗 Assigning ${manager.manager_name} (${manager.manager_id}) to ${employee.employee_name}`
      );

      await pool.query(
        `UPDATE employee_master 
         SET manager_id = $1, manager_name = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [manager.manager_id, manager.manager_name, employee.id]
      );

      console.log(`✅ Manager assigned successfully`);
    }

    // Also check if we need to create employee_master entries for users who don't have them
    const usersWithoutMaster = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name
      FROM users u
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE u.role = 'employee' AND em.id IS NULL
    `);

    console.log(
      `👥 Found ${usersWithoutMaster.rows.length} users without employee_master entries`
    );

    if (usersWithoutMaster.rows.length > 0) {
      for (let i = 0; i < usersWithoutMaster.rows.length; i++) {
        const user = usersWithoutMaster.rows[i];
        const managerIndex = i % managersResult.rows.length;
        const manager = managersResult.rows[managerIndex];

        const employeeName =
          user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.email.split("@")[0];

        console.log(
          `➕ Creating employee_master entry for ${employeeName} with manager ${manager.manager_name}`
        );

        await pool.query(
          `INSERT INTO employee_master (
            employee_id, 
            employee_name, 
            company_email, 
            manager_id, 
            manager_name, 
            type, 
            doj, 
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            `EMP${String(user.id).padStart(3, "0")}`,
            employeeName,
            user.email,
            manager.manager_id,
            manager.manager_name,
            "Full-Time", // Default type
            new Date(), // Default DOJ
            "active",
          ]
        );

        console.log(`✅ Employee master entry created successfully`);
      }
    }

    console.log("\n🎉 Manager assignment completed successfully!");
    console.log("=====================================");

    // Show final state
    const finalResult = await pool.query(`
      SELECT em.employee_name, em.manager_name, m.email as manager_email
      FROM employee_master em
      LEFT JOIN managers m ON em.manager_id = m.manager_id
      ORDER BY em.employee_name
    `);

    console.log("📊 Final employee-manager assignments:");
    finalResult.rows.forEach((row) => {
      console.log(
        `   • ${row.employee_name} → ${row.manager_name} (${row.manager_email})`
      );
    });
  } catch (error) {
    console.error("❌ Error assigning managers:", error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run the script
assignManagers().catch(console.error);
