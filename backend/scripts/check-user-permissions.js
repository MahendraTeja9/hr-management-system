const { Pool } = require("pg");
require("dotenv").config({ path: "../config.env" });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkUserPermissions(email) {
  const client = await pool.connect();
  try {
    console.log(`🔍 Checking permissions for: ${email}`);
    console.log("================================\n");

    // Check user exists and get basic info
    const userResult = await client.query(
      "SELECT id, email, role, first_name, last_name, is_temp_password FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log("❌ User not found in users table");
      return { found: false };
    }

    const user = userResult.rows[0];
    console.log("👤 User Information:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(
      `   Name: ${user.first_name || "N/A"} ${user.last_name || "N/A"}`
    );
    console.log(`   Temp Password: ${user.is_temp_password ? "Yes" : "No"}`);

    // Check if user is in employee_master
    const masterResult = await client.query(
      "SELECT id, employee_name, status, employee_id FROM employee_master WHERE company_email = $1",
      [email]
    );

    console.log("\n📋 Employee Master Status:");
    if (masterResult.rows.length > 0) {
      const master = masterResult.rows[0];
      console.log(`   ✅ Found in employee_master`);
      console.log(`   Master ID: ${master.id}`);
      console.log(`   Employee ID: ${master.employee_id}`);
      console.log(`   Name: ${master.employee_name}`);
      console.log(`   Status: ${master.status}`);
    } else {
      console.log(`   ❌ Not found in employee_master`);
    }

    // Check if user is a manager
    const managerResult = await client.query(
      "SELECT id, manager_name, department FROM managers WHERE email = $1",
      [email]
    );

    console.log("\n👔 Manager Status:");
    if (managerResult.rows.length > 0) {
      const manager = managerResult.rows[0];
      console.log(`   ✅ Is a manager`);
      console.log(`   Manager ID: ${manager.id}`);
      console.log(`   Name: ${manager.manager_name}`);
      console.log(`   Department: ${manager.department || "N/A"}`);

      // Check managed employees
      const managedResult = await client.query(
        `SELECT COUNT(*) as count, 
                STRING_AGG(u.email, ', ') as managed_employees
         FROM manager_employee_mapping mem
         JOIN users u ON mem.employee_id = u.id
         WHERE mem.manager_id = $1`,
        [user.id]
      );

      if (managedResult.rows[0].count > 0) {
        console.log(`   Manages: ${managedResult.rows[0].count} employees`);
        console.log(`   Employees: ${managedResult.rows[0].managed_employees}`);
      } else {
        console.log(`   Manages: 0 employees`);
      }
    } else {
      console.log(`   ❌ Not a manager`);
    }

    // Check permissions based on role
    console.log("\n🔐 Access Permissions:");
    switch (user.role) {
      case "hr":
        console.log("   ✅ HR Access - Full system access");
        console.log("   ✅ Can view all employees");
        console.log("   ✅ Can delete employees");
        console.log("   ✅ Can manage attendance");
        console.log("   ✅ Can approve leaves");
        break;
      case "manager":
        console.log("   ✅ Manager Access - Team management");
        console.log("   ✅ Can view team attendance");
        console.log("   ✅ Can approve team leaves");
        console.log("   ❌ Cannot delete employees");
        break;
      case "employee":
        console.log("   ✅ Employee Access - Self service");
        console.log("   ✅ Can mark own attendance");
        console.log("   ✅ Can request leaves");
        console.log("   ❌ Cannot delete employees");
        console.log("   ❌ Cannot view other employees");
        break;
      default:
        console.log("   ❓ Unknown role - Limited access");
    }

    // Check related data counts
    console.log("\n📊 Related Data Counts:");

    const queries = [
      {
        name: "Attendance Records",
        query: "SELECT COUNT(*) FROM attendance WHERE employee_id = $1",
      },
      {
        name: "Leave Requests",
        query: "SELECT COUNT(*) FROM leave_requests WHERE employee_id = $1",
      },
      {
        name: "Leave Balances",
        query: "SELECT COUNT(*) FROM leave_balances WHERE employee_id = $1",
      },
      {
        name: "Documents",
        query: "SELECT COUNT(*) FROM employee_documents WHERE employee_id = $1",
      },
      {
        name: "Document Collection",
        query:
          "SELECT COUNT(*) FROM document_collection WHERE employee_id = $1",
      },
      {
        name: "Expenses",
        query: "SELECT COUNT(*) FROM expenses WHERE employee_id = $1",
      },
      {
        name: "Employee Forms",
        query: "SELECT COUNT(*) FROM employee_forms WHERE employee_id = $1",
      },
    ];

    for (const q of queries) {
      try {
        const result = await client.query(q.query, [user.id]);
        const count = result.rows[0].count;
        console.log(`   ${q.name}: ${count}`);
      } catch (error) {
        console.log(`   ${q.name}: Error - ${error.message}`);
      }
    }

    return {
      found: true,
      user,
      inMaster: masterResult.rows.length > 0,
      isManager: managerResult.rows.length > 0,
      canDelete: user.role === "hr",
    };
  } catch (error) {
    console.error("Error checking permissions:", error);
    return { found: false, error: error.message };
  } finally {
    client.release();
  }
}

async function listAllUsers() {
  const client = await pool.connect();
  try {
    console.log("👥 All System Users:");
    console.log("===================\n");

    const result = await client.query(`
      SELECT 
        u.id,
        u.email,
        u.role,
        u.first_name,
        u.last_name,
        em.employee_name,
        em.status as master_status,
        m.manager_name,
        CASE 
          WHEN u.role = 'hr' THEN '✅ Can Delete'
          ELSE '❌ Cannot Delete'
        END as delete_permission
      FROM users u
      LEFT JOIN employee_master em ON u.email = em.company_email
      LEFT JOIN managers m ON u.email = m.email
      ORDER BY u.role, u.email
    `);

    console.log(
      `${"ID".padEnd(5)} | ${"Email".padEnd(30)} | ${"Role".padEnd(
        10
      )} | ${"Name".padEnd(25)} | ${"Delete?".padEnd(15)}`
    );
    console.log("-".repeat(95));

    result.rows.forEach((user) => {
      const id = user.id.toString().padEnd(5);
      const email = user.email.padEnd(30);
      const role = user.role.padEnd(10);
      const name = (
        user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.employee_name || user.manager_name || "N/A"
      ).padEnd(25);
      const deletePermission = user.delete_permission.padEnd(15);

      console.log(`${id} | ${email} | ${role} | ${name} | ${deletePermission}`);
    });

    console.log(`\nTotal Users: ${result.rows.length}`);
    console.log(
      `HR Users: ${result.rows.filter((u) => u.role === "hr").length}`
    );
    console.log(
      `Manager Users: ${result.rows.filter((u) => u.role === "manager").length}`
    );
    console.log(
      `Employee Users: ${
        result.rows.filter((u) => u.role === "employee").length
      }`
    );

    return result.rows;
  } catch (error) {
    console.error("Error listing users:", error);
    return [];
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log("🔐 User Permissions Checker");
    console.log("===========================\n");

    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log("Usage:");
      console.log(
        "  node check-user-permissions.js <email>     # Check specific user"
      );
      console.log(
        "  node check-user-permissions.js list        # List all users"
      );
      console.log("\nExamples:");
      console.log("  node check-user-permissions.js hr@nxzen.com");
      console.log("  node check-user-permissions.js list");

      await listAllUsers();
      return;
    }

    const command = args[0];

    if (command === "list") {
      await listAllUsers();
    } else {
      // Treat as email
      const email = command;
      await checkUserPermissions(email);
    }
  } catch (error) {
    console.error("Script error:", error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkUserPermissions, listAllUsers };
