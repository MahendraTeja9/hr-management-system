const { Pool } = require("pg");

// Database configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "onboardd",
  password: "Stali",
  port: 5432,
});

// Function to update employee dates with realistic dates
const updateEmployeeDates = async () => {
  const client = await pool.connect();
  try {
    console.log("🔧 Updating employee dates with realistic dates...");

    // Get all employees
    const result = await client.query(
      "SELECT id, employee_name, doj FROM employee_master ORDER BY employee_name"
    );

    console.log(`📋 Found ${result.rows.length} employees`);

    // Define realistic dates for different employees
    const realisticDates = [
      "2024-01-15",
      "2024-02-01",
      "2024-03-10",
      "2024-04-05",
      "2024-05-20",
      "2024-06-12",
      "2024-07-08",
      "2024-08-25",
      "2024-09-15",
      "2024-10-03",
      "2024-11-18",
      "2024-12-01",
      "2025-01-10",
      "2025-02-15",
      "2025-03-22",
    ];

    let dateIndex = 0;

    for (const employee of result.rows) {
      const newDate = realisticDates[dateIndex % realisticDates.length];

      await client.query("UPDATE employee_master SET doj = $1 WHERE id = $2", [
        newDate,
        employee.id,
      ]);

      console.log(
        `✅ Updated ${employee.employee_name}: ${employee.doj} -> ${newDate}`
      );
      dateIndex++;
    }

    console.log(
      `\n✅ Successfully updated ${result.rows.length} employees with realistic dates`
    );
  } catch (error) {
    console.error("❌ Error updating employee dates:", error);
  } finally {
    client.release();
  }
};

// Function to show current employee dates
const showCurrentEmployeeDates = async () => {
  const client = await pool.connect();
  try {
    console.log("\n📊 Current employee dates:");

    const result = await client.query(
      "SELECT employee_name, doj FROM employee_master ORDER BY employee_name LIMIT 15"
    );

    result.rows.forEach((employee) => {
      console.log(`👤 ${employee.employee_name}: ${employee.doj}`);
    });
  } catch (error) {
    console.error("❌ Error showing employee dates:", error);
  } finally {
    client.release();
  }
};

// Main execution
const main = async () => {
  console.log("🚀 Employee Date Update Script");
  console.log("==============================");

  // Show current dates
  await showCurrentEmployeeDates();

  // Update dates
  await updateEmployeeDates();

  // Show updated dates
  await showCurrentEmployeeDates();

  console.log("\n✅ Script completed");
  process.exit(0);
};

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
