const { Pool } = require('pg');
require('dotenv').config({ path: '../config.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function deleteEmployeeCompletely(employeeId) {
  const client = await pool.connect();
  
  try {
    console.log(`🗑️ Starting complete deletion for employee ID: ${employeeId}`);
    
    // First, get employee details
    const employeeCheck = await client.query(
      "SELECT id, employee_name, company_email FROM employee_master WHERE id = $1",
      [employeeId]
    );
    
    if (employeeCheck.rows.length === 0) {
      console.log("❌ Employee not found in master table");
      return { success: false, error: "Employee not found in master table" };
    }
    
    const employee = employeeCheck.rows[0];
    console.log(`👤 Found employee: ${employee.employee_name} (${employee.company_email})`);
    
    // Get user ID from users table
    const userCheck = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [employee.company_email]
    );
    
    const userId = userCheck.rows[0]?.id;
    console.log(`🔍 User ID: ${userId || 'Not found'}`);
    
    await client.query("BEGIN");
    console.log("🔄 Started database transaction");
    
    let deletedCounts = {};
    
    // Delete all related data if user exists
    if (userId) {
      // Delete attendance records
      const attendanceResult = await client.query(
        "DELETE FROM attendance WHERE employee_id = $1",
        [userId]
      );
      deletedCounts.attendance = attendanceResult.rowCount;
      
      // Delete leave requests
      const leaveRequestsResult = await client.query(
        "DELETE FROM leave_requests WHERE employee_id = $1",
        [userId]
      );
      deletedCounts.leave_requests = leaveRequestsResult.rowCount;
      
      // Delete leave balances
      const leaveBalancesResult = await client.query(
        "DELETE FROM leave_balances WHERE employee_id = $1",
        [userId]
      );
      deletedCounts.leave_balances = leaveBalancesResult.rowCount;
      
      // Delete leave type balances
      const leaveTypeBalancesResult = await client.query(
        "DELETE FROM leave_type_balances WHERE employee_id = $1",
        [userId]
      );
      deletedCounts.leave_type_balances = leaveTypeBalancesResult.rowCount;
      
      // Delete comp off balances
      const compOffResult = await client.query(
        "DELETE FROM comp_off_balances WHERE employee_id = $1",
        [userId]
      );
      deletedCounts.comp_off_balances = compOffResult.rowCount;
      
      // Delete employee documents
      const employeeDocsResult = await client.query(
        "DELETE FROM employee_documents WHERE employee_id = $1",
        [userId]
      );
      deletedCounts.employee_documents = employeeDocsResult.rowCount;
      
      // Delete document collection
      const docCollectionResult = await client.query(
        "DELETE FROM document_collection WHERE employee_id = $1",
        [userId]
      );
      deletedCounts.document_collection = docCollectionResult.rowCount;
      
      // Delete expenses
      const expensesResult = await client.query(
        "DELETE FROM expenses WHERE employee_id = $1",
        [userId]
      );
      deletedCounts.expenses = expensesResult.rowCount;
      
      // Delete company emails
      const emailsResult = await client.query(
        "DELETE FROM company_emails WHERE user_id = $1",
        [userId]
      );
      deletedCounts.company_emails = emailsResult.rowCount;
      
      // Delete manager-employee mappings (as employee)
      const empMappingResult = await client.query(
        "DELETE FROM manager_employee_mapping WHERE employee_id = $1",
        [userId]
      );
      deletedCounts.manager_employee_mapping_as_employee = empMappingResult.rowCount;
      
      // Delete manager-employee mappings (as manager)
      const mgMappingResult = await client.query(
        "DELETE FROM manager_employee_mapping WHERE manager_id = $1",
        [userId]
      );
      deletedCounts.manager_employee_mapping_as_manager = mgMappingResult.rowCount;
      
      // Delete employee forms
      const formsResult = await client.query(
        "DELETE FROM employee_forms WHERE employee_id = $1",
        [userId]
      );
      deletedCounts.employee_forms = formsResult.rowCount;
      
      // Delete onboarded employees
      const onboardedResult = await client.query(
        "DELETE FROM onboarded_employees WHERE user_id = $1",
        [userId]
      );
      deletedCounts.onboarded_employees = onboardedResult.rowCount;
      
      // Delete from managers table if they are a manager
      const managerResult = await client.query(
        "DELETE FROM managers WHERE email = $1",
        [employee.company_email]
      );
      deletedCounts.managers = managerResult.rowCount;
    }
    
    // Delete from employee master
    const masterResult = await client.query(
      "DELETE FROM employee_master WHERE id = $1",
      [employeeId]
    );
    deletedCounts.employee_master = masterResult.rowCount;
    
    // Finally delete user
    if (userId) {
      const userResult = await client.query(
        "DELETE FROM users WHERE id = $1",
        [userId]
      );
      deletedCounts.users = userResult.rowCount;
    }
    
    await client.query("COMMIT");
    console.log("✅ Transaction committed successfully");
    
    // Show deletion summary
    console.log("\n📊 Deletion Summary:");
    console.log("===================");
    Object.entries(deletedCounts).forEach(([table, count]) => {
      if (count > 0) {
        console.log(`✅ ${table}: ${count} records deleted`);
      }
    });
    
    return { 
      success: true, 
      deletedCounts,
      employee: employee.employee_name,
      email: employee.company_email
    };
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Delete operation failed:", error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// Function to list all employees in master table
async function listEmployees() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, employee_name, company_email, status FROM employee_master ORDER BY id"
    );
    
    console.log("\n👥 Current Employees in Master Table:");
    console.log("=====================================");
    result.rows.forEach(emp => {
      console.log(`ID: ${emp.id} | Name: ${emp.employee_name} | Email: ${emp.company_email} | Status: ${emp.status}`);
    });
    
    return result.rows;
  } catch (error) {
    console.error("Error listing employees:", error);
    return [];
  } finally {
    client.release();
  }
}

// Interactive CLI
async function main() {
  try {
    console.log("🗂️ Employee Delete Cleanup Script");
    console.log("==================================\n");
    
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log("Usage:");
      console.log("  node delete-employee-cleanup.js list                    # List all employees");
      console.log("  node delete-employee-cleanup.js delete <employee_id>    # Delete specific employee");
      console.log("  node delete-employee-cleanup.js delete-by-email <email> # Delete by email");
      console.log("\nExamples:");
      console.log("  node delete-employee-cleanup.js list");
      console.log("  node delete-employee-cleanup.js delete 14");
      console.log("  node delete-employee-cleanup.js delete-by-email shibin@nxzen.com");
      
      await listEmployees();
      return;
    }
    
    const command = args[0];
    
    if (command === 'list') {
      await listEmployees();
    } else if (command === 'delete' && args[1]) {
      const employeeId = args[1];
      const result = await deleteEmployeeCompletely(employeeId);
      
      if (result.success) {
        console.log(`\n✅ Successfully deleted employee: ${result.employee} (${result.email})`);
      } else {
        console.log(`\n❌ Failed to delete employee: ${result.error}`);
      }
    } else if (command === 'delete-by-email' && args[1]) {
      const email = args[1];
      const client = await pool.connect();
      try {
        const result = await client.query(
          "SELECT id FROM employee_master WHERE company_email = $1",
          [email]
        );
        
        if (result.rows.length === 0) {
          console.log(`❌ No employee found with email: ${email}`);
          return;
        }
        
        const employeeId = result.rows[0].id;
        const deleteResult = await deleteEmployeeCompletely(employeeId);
        
        if (deleteResult.success) {
          console.log(`\n✅ Successfully deleted employee: ${deleteResult.employee} (${deleteResult.email})`);
        } else {
          console.log(`\n❌ Failed to delete employee: ${deleteResult.error}`);
        }
      } finally {
        client.release();
      }
    } else {
      console.log("❌ Invalid command. Use 'list', 'delete <id>', or 'delete-by-email <email>'");
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

module.exports = { deleteEmployeeCompletely, listEmployees };
