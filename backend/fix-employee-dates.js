const { Pool } = require("pg");
const XLSX = require("xlsx");
const fs = require("fs");

// Database configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "onboardd",
  password: "Stali",
  port: 5432,
});

// Debug function for date parsing
const debugDate = (value, context) => {
  console.log(`🔍 ${context}:`, {
    value: value,
    type: typeof value,
    isDate: value instanceof Date,
    isNaN: isNaN(value),
    stringValue: String(value),
    dateValue: value instanceof Date ? value.toISOString() : null,
  });
};

// Function to parse Excel date properly
const parseExcelDate = (dateValue) => {
  debugDate(dateValue, "parseExcelDate input");

  if (dateValue instanceof Date) {
    // Excel date was properly parsed as Date object
    console.log(`✅ Date object detected: ${dateValue.toISOString()}`);
    return dateValue;
  } else if (typeof dateValue === "string") {
    // Handle MM/DD/YY format (like "1/6/25")
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateValue)) {
      const [month, day, year] = dateValue.split("/");
      const fullYear =
        parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
      const dojDate = new Date(
        fullYear,
        parseInt(month) - 1,
        parseInt(day),
        12,
        0,
        0
      );
      console.log(
        `✅ MM/DD/YY parsed: ${dateValue} -> ${dojDate.toISOString()}`
      );
      return dojDate;
    }
    // Handle YYYY-MM-DD format
    else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateValue)) {
      const [year, month, day] = dateValue.split("-");
      const dojDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        12,
        0,
        0
      );
      console.log(
        `✅ YYYY-MM-DD parsed: ${dateValue} -> ${dojDate.toISOString()}`
      );
      return dojDate;
    }
    // Handle other string formats
    else {
      const dojDate = new Date(dateValue);
      console.log(`✅ String parsed: ${dateValue} -> ${dojDate.toISOString()}`);
      return dojDate;
    }
  } else if (typeof dateValue === "number") {
    // Handle Excel serial number (days since 1900-01-01)
    const excelEpoch = new Date(1900, 0, 1);
    const daysSinceEpoch = dateValue - 2; // Subtract 2 to account for Excel's leap year bug
    const dojDate = new Date(
      excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000
    );
    console.log(
      `✅ Excel serial number converted: ${dateValue} -> ${dojDate.toISOString()}`
    );
    return dojDate;
  } else {
    const dojDate = new Date(dateValue);
    console.log(`✅ Fallback parsed: ${dateValue} -> ${dojDate.toISOString()}`);
    return dojDate;
  }
};

// Function to test Excel file parsing
const testExcelParsing = async (filePath) => {
  try {
    console.log(`\n📁 Testing Excel file: ${filePath}`);

    // Read Excel file with proper date handling
    const workbook = XLSX.readFile(filePath, {
      cellDates: true, // This is crucial for proper date parsing
      cellNF: false,
      cellText: false,
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false, // This ensures dates are converted to Date objects
      dateNF: "yyyy-mm-dd", // Format for date output
    });

    console.log(`📊 Found ${jsonData.length} rows in Excel file`);
    console.log(`📋 Columns: ${Object.keys(jsonData[0] || {}).join(", ")}`);

    // Test first few rows
    jsonData.slice(0, 3).forEach((row, index) => {
      console.log(`\n🔍 Row ${index + 1}:`);
      Object.keys(row).forEach((key) => {
        const value = row[key];
        debugDate(value, `Column: ${key}`);
      });
    });

    return jsonData;
  } catch (error) {
    console.error("❌ Error testing Excel file:", error);
    return null;
  }
};

// Function to fix existing employee dates
const fixExistingEmployeeDates = async () => {
  const client = await pool.connect();
  try {
    console.log("\n🔧 Fixing existing employee dates...");

    // Get all employees with incorrect dates (1/1/1970)
    const result = await client.query(
      "SELECT id, employee_name, doj FROM employee_master WHERE doj = '1970-01-01' OR doj IS NULL"
    );

    console.log(
      `📋 Found ${result.rows.length} employees with incorrect dates`
    );

    if (result.rows.length === 0) {
      console.log("✅ No employees with incorrect dates found");
      return;
    }

    // Show current data
    result.rows.forEach((employee) => {
      console.log(`👤 ${employee.employee_name}: ${employee.doj}`);
    });

    // Update with a default date (you can modify this)
    const defaultDate = "2024-01-01"; // Change this to your preferred default date

    const updateResult = await client.query(
      "UPDATE employee_master SET doj = $1 WHERE doj = '1970-01-01' OR doj IS NULL",
      [defaultDate]
    );

    console.log(
      `✅ Updated ${updateResult.rowCount} employees with default date: ${defaultDate}`
    );
  } catch (error) {
    console.error("❌ Error fixing employee dates:", error);
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
      "SELECT employee_name, doj FROM employee_master ORDER BY employee_name LIMIT 10"
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
  console.log("🚀 Employee Date Fix Script");
  console.log("==========================");

  // Show current dates
  await showCurrentEmployeeDates();

  // Test Excel file if provided
  const excelFile = process.argv[2];
  if (excelFile && fs.existsSync(excelFile)) {
    await testExcelParsing(excelFile);
  }

  // Fix existing dates
  await fixExistingEmployeeDates();

  // Show updated dates
  await showCurrentEmployeeDates();

  console.log("\n✅ Script completed");
  process.exit(0);
};

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
