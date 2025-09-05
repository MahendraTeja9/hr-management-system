const { pool } = require("./config/database");

async function testGetEmployeeManagers() {
  try {
    console.log("🧪 Testing getEmployeeManagers function...");

    // Get stalin's employee record
    const employeeResult = await pool.query(
      `SELECT em.id, em.employee_name, em.manager_id, em.manager_name, 
              em.manager2_id, em.manager2_name, em.manager3_id, em.manager3_name
       FROM employee_master em
       WHERE em.employee_name = 'stalin'`
    );

    if (employeeResult.rows.length === 0) {
      console.log('❌ No employee found with name "stalin"');
      return;
    }

    const employee = employeeResult.rows[0];
    console.log("✅ Found employee:", employee);

    const managers = [];

    // Get manager 1 details
    if (employee.manager_id && employee.manager_name) {
      console.log("🔍 Getting manager 1 details for:", employee.manager_id);
      const manager1Result = await pool.query(
        `SELECT m.manager_name, m.email as manager_email, u.id as user_id, u.email as user_email
         FROM managers m
         LEFT JOIN users u ON u.email = m.email
         WHERE m.manager_id = $1 AND m.status = 'active'`,
        [employee.manager_id]
      );

      if (manager1Result.rows.length > 0) {
        const manager = manager1Result.rows[0];
        const email = manager.user_email || manager.manager_email;
        managers.push({
          id: manager.user_id,
          manager_id: employee.manager_id,
          manager_name: employee.manager_name,
          email: email,
        });
        console.log("✅ Manager 1 added:", {
          name: employee.manager_name,
          email,
        });
      }
    }

    // Get manager 2 details
    if (employee.manager2_id && employee.manager2_name) {
      console.log("🔍 Getting manager 2 details for:", employee.manager2_id);
      const manager2Result = await pool.query(
        `SELECT m.manager_name, m.email as manager_email, u.id as user_id, u.email as user_email
         FROM managers m
         LEFT JOIN users u ON u.email = m.email
         WHERE m.manager_id = $1 AND m.status = 'active'`,
        [employee.manager2_id]
      );

      if (manager2Result.rows.length > 0) {
        const manager = manager2Result.rows[0];
        const email = manager.user_email || manager.manager_email;
        managers.push({
          id: manager.user_id,
          manager_id: employee.manager2_id,
          manager_name: employee.manager2_name,
          email: email,
        });
        console.log("✅ Manager 2 added:", {
          name: employee.manager2_name,
          email,
        });
      }
    }

    console.log("🎯 Final managers array:", managers);
    console.log("📊 Manager count:", managers.length);

    // Test email sending simulation
    console.log("\n📧 Simulating email sending...");
    managers.forEach((manager, index) => {
      console.log(`📧 Would send email to Manager ${index + 1}:`, {
        name: manager.manager_name,
        email: manager.email,
        id: manager.manager_id,
      });
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
  }
}

testGetEmployeeManagers();
