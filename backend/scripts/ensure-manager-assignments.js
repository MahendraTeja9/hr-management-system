const { Pool } = require('pg');
require('dotenv').config({ path: '../config.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function ensureManagerAssignments() {
  try {
    console.log("🔍 Checking all employees for manager assignments...");

    // Find all employees without manager assignments
    const employeesWithoutManagers = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, em.employee_id, em.manager_name
      FROM users u
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE u.role = 'employee' 
        AND (em.manager_name IS NULL OR em.manager_name = '' OR em.manager_id IS NULL)
    `);

    console.log("📊 Employees without managers:", employeesWithoutManagers.rows.length);

    if (employeesWithoutManagers.rows.length > 0) {
      console.log("🔍 Employees needing manager assignment:");
      employeesWithoutManagers.rows.forEach(emp => {
        console.log(`  - ${emp.first_name} ${emp.last_name} (${emp.email})`);
      });

      // Get available managers
      const managers = await pool.query(`
        SELECT manager_id, manager_name, email, department
        FROM managers 
        WHERE status = 'active'
        ORDER BY manager_name
      `);

      console.log("👥 Available managers:");
      managers.rows.forEach(mgr => {
        console.log(`  - ${mgr.manager_name} (${mgr.manager_id}) - ${mgr.department}`);
      });

      // For now, assign all unassigned employees to the first available manager
      if (managers.rows.length > 0) {
        const defaultManager = managers.rows[0];
        console.log(`🎯 Assigning all unassigned employees to: ${defaultManager.manager_name}`);

        for (const emp of employeesWithoutManagers.rows) {
          if (emp.employee_id) {
            // Update existing employee_master entry
            await pool.query(`
              UPDATE employee_master 
              SET manager_id = $1, manager_name = $2, updated_at = CURRENT_TIMESTAMP
              WHERE employee_id = $3
            `, [defaultManager.manager_id, defaultManager.manager_name, emp.employee_id]);
            
            console.log(`✅ Updated ${emp.first_name} ${emp.last_name} -> ${defaultManager.manager_name}`);
          } else {
            // Create employee_master entry
            const employeeId = `EMP${String(emp.id).padStart(3, '0')}`;
            await pool.query(`
              INSERT INTO employee_master (
                employee_id, employee_name, company_email, manager_id, manager_name, 
                type, doj, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              employeeId,
              `${emp.first_name} ${emp.last_name}`,
              emp.email,
              defaultManager.manager_id,
              defaultManager.manager_name,
              'Full-Time',
              new Date(),
              'active'
            ]);
            
            console.log(`✅ Created employee_master entry for ${emp.first_name} ${emp.last_name} -> ${defaultManager.manager_name}`);
          }
        }
      }
    }

    // Verify all employees now have managers
    const finalCheck = await pool.query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, 
        em.manager_id, em.manager_name
      FROM users u
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE u.role = 'employee'
      ORDER BY u.id
    `);

    console.log("📋 Final manager assignment status:");
    finalCheck.rows.forEach(emp => {
      const status = emp.manager_name ? `✅ ${emp.manager_name}` : `❌ Not Assigned`;
      console.log(`  - ${emp.first_name} ${emp.last_name}: ${status}`);
    });

    await pool.end();
    console.log("🎉 Manager assignment check completed!");

  } catch (error) {
    console.error("❌ Error ensuring manager assignments:", error);
    await pool.end();
  }
}

ensureManagerAssignments();
