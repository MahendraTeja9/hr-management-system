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

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return null;
    }

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
    jsonData.slice(0, 5).forEach((row, index) => {
      console.log(`\n🔍 Row ${index + 1}:`);
      Object.keys(row).forEach((key) => {
        const value = row[key];
        debugDate(value, `Column: ${key}`);

        // If this looks like a date column, test parsing
        if (
          key.toLowerCase().includes("date") ||
          key.toLowerCase().includes("doj") ||
          key.toLowerCase().includes("join")
        ) {
          console.log(`📅 Testing date parsing for column: ${key}`);
          const parsedDate = parseExcelDate(value);
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            console.log(
              `✅ Successfully parsed date: ${parsedDate.toLocaleDateString()}`
            );
          } else {
            console.log(`❌ Failed to parse date: ${value}`);
          }
        }
      });
    });

    return jsonData;
  } catch (error) {
    console.error("❌ Error testing Excel file:", error);
    return null;
  }
};

// Function to create a sample Excel file for testing
const createSampleExcelFile = () => {
  const sampleData = [
    {
      employee_name: "Test Employee 1",
      company_email: "test1@nxzen.com",
      type: "Full-Time",
      doj: new Date("2024-01-15"), // This should be parsed as Date object
      manager_name: "Test Manager",
      status: "active",
    },
    {
      employee_name: "Test Employee 2",
      company_email: "test2@nxzen.com",
      type: "Intern",
      doj: "2024-03-20", // String format
      manager_name: "Test Manager",
      status: "active",
    },
    {
      employee_name: "Test Employee 3",
      company_email: "test3@nxzen.com",
      type: "Contract",
      doj: "1/15/24", // MM/DD/YY format
      manager_name: "Test Manager",
      status: "active",
    },
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

  const fileName = "sample-employees.xlsx";
  XLSX.writeFile(workbook, fileName);
  console.log(`✅ Created sample Excel file: ${fileName}`);
  return fileName;
};

// Main execution
const main = async () => {
  console.log("🚀 Excel Import Test Script");
  console.log("==========================");

  // Create a sample Excel file for testing
  const sampleFile = createSampleExcelFile();

  // Test the sample file
  await testExcelParsing(sampleFile);

  // Test user-provided file if available
  const userFile = process.argv[2];
  if (userFile) {
    console.log("\n" + "=".repeat(50));
    console.log("Testing user-provided file:");
    await testExcelParsing(userFile);
  }

  console.log("\n✅ Test completed");
  console.log("\n📝 Instructions:");
  console.log("1. Check the sample file created: sample-employees.xlsx");
  console.log("2. Upload this file through the web interface");
  console.log("3. Check if dates are parsed correctly");
  console.log("4. If dates are still wrong, check the console logs above");

  process.exit(0);
};

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
