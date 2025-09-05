const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "../config.env" });

// Configure axios for testing
const api = axios.create({
  baseURL: "http://localhost:5001/api",
  timeout: 10000,
});

async function generateTestToken(email, role = "hr") {
  const payload = {
    userId: 1, // Mock user ID
    email: email,
    role: role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  return token;
}

async function testLogin(email, password) {
  try {
    console.log(`🔐 Testing login for: ${email}`);

    const response = await api.post("/auth/login", {
      email,
      password,
    });

    console.log("✅ Login successful!");
    console.log(`Token: ${response.data.token.substring(0, 50)}...`);
    console.log(
      `User: ${response.data.user.email} (${response.data.user.role})`
    );

    return response.data.token;
  } catch (error) {
    console.error("❌ Login failed:", error.response?.data || error.message);
    return null;
  }
}

async function testDeleteEndpoint(employeeId, token) {
  try {
    console.log(`\n🗑️ Testing delete for employee ID: ${employeeId}`);
    console.log(
      `🔐 Using token: ${token ? token.substring(0, 50) + "..." : "None"}`
    );

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await api.delete(`/hr/master/${employeeId}`, {
      headers,
    });

    console.log("✅ Delete successful!");
    console.log("Response:", response.data);

    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Delete failed!");
    console.error("Status:", error.response?.status);
    console.error("Error:", error.response?.data || error.message);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data || error.message,
    };
  }
}

async function testAuthMiddleware(token) {
  try {
    console.log(`\n🔐 Testing auth middleware with token`);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await api.get("/auth/me", {
      headers,
    });

    console.log("✅ Auth middleware passed!");
    console.log("User:", response.data.user);

    return { success: true, user: response.data.user };
  } catch (error) {
    console.error("❌ Auth middleware failed!");
    console.error("Status:", error.response?.status);
    console.error("Error:", error.response?.data || error.message);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data || error.message,
    };
  }
}

async function getEmployeeList() {
  try {
    console.log(`\n📋 Getting employee list for testing...`);

    const response = await api.get("/hr/master");

    console.log("✅ Got employee list!");
    console.log(`Found ${response.data.length} employees`);

    if (response.data.length > 0) {
      console.log("\nFirst 3 employees:");
      response.data.slice(0, 3).forEach((emp) => {
        console.log(
          `  ID: ${emp.id} | Name: ${emp.employee_name} | Email: ${emp.company_email}`
        );
      });
    }

    return response.data;
  } catch (error) {
    console.error("❌ Failed to get employee list!");
    console.error("Status:", error.response?.status);
    console.error("Error:", error.response?.data || error.message);

    return [];
  }
}

async function comprehensiveDeleteTest(employeeId, credentials) {
  console.log("🧪 Comprehensive Delete API Test");
  console.log("=================================\n");

  let token = null;

  // Step 1: Test login
  if (credentials) {
    console.log("Step 1: Testing login...");
    token = await testLogin(credentials.email, credentials.password);

    if (!token) {
      console.log("❌ Cannot proceed without valid token");
      return;
    }
  } else {
    console.log("Step 1: Generating test token...");
    token = await generateTestToken("hr@nxzen.com", "hr");
  }

  // Step 2: Test auth middleware
  console.log("\nStep 2: Testing auth middleware...");
  const authTest = await testAuthMiddleware(token);

  if (!authTest.success) {
    console.log("❌ Auth middleware failed, cannot proceed");
    return;
  }

  // Step 3: Get employee list
  console.log("\nStep 3: Getting employee list...");
  const employees = await getEmployeeList();

  if (employees.length === 0) {
    console.log("❌ No employees found to test with");
    return;
  }

  // Step 4: Test delete endpoint
  const targetEmployeeId = employeeId || employees[0].id;
  console.log(
    `\nStep 4: Testing delete endpoint for employee ID ${targetEmployeeId}...`
  );

  // First, let's test without token
  console.log("\n4a: Testing delete without token...");
  const noTokenTest = await testDeleteEndpoint(targetEmployeeId, null);

  // Then test with token
  console.log("\n4b: Testing delete with valid token...");
  const withTokenTest = await testDeleteEndpoint(targetEmployeeId, token);

  // Summary
  console.log("\n📊 Test Summary:");
  console.log("================");
  console.log(`Login: ${token ? "✅ Success" : "❌ Failed"}`);
  console.log(
    `Auth Middleware: ${authTest.success ? "✅ Success" : "❌ Failed"}`
  );
  console.log(
    `Employee List: ${employees.length > 0 ? "✅ Success" : "❌ Failed"}`
  );
  console.log(
    `Delete (No Token): ${
      noTokenTest.success ? "✅ Success" : "❌ Failed (Expected)"
    }`
  );
  console.log(
    `Delete (With Token): ${withTokenTest.success ? "✅ Success" : "❌ Failed"}`
  );

  if (!withTokenTest.success) {
    console.log("\n🔍 Delete Error Analysis:");
    console.log(`Status Code: ${withTokenTest.status}`);
    console.log(`Error: ${JSON.stringify(withTokenTest.error, null, 2)}`);

    if (withTokenTest.status === 401) {
      console.log("\n💡 Suggestion: Token authentication issue");
    } else if (withTokenTest.status === 403) {
      console.log("\n💡 Suggestion: Permission denied - check user role");
    } else if (withTokenTest.status === 404) {
      console.log("\n💡 Suggestion: Employee not found");
    } else if (withTokenTest.status === 500) {
      console.log("\n💡 Suggestion: Server error - check backend logs");
    }
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log("Usage:");
      console.log(
        "  node test-delete-api.js test [employee_id]           # Test with generated token"
      );
      console.log(
        "  node test-delete-api.js login <email> <password>     # Test with real login"
      );
      console.log(
        "  node test-delete-api.js delete <id> <token>          # Test specific delete"
      );
      console.log(
        "  node test-delete-api.js auth <token>                 # Test auth middleware"
      );
      console.log("\nExamples:");
      console.log("  node test-delete-api.js test");
      console.log("  node test-delete-api.js test 14");
      console.log("  node test-delete-api.js login hr@nxzen.com hr123");

      // Run basic test
      await comprehensiveDeleteTest();
      return;
    }

    const command = args[0];

    if (command === "test") {
      const employeeId = args[1] ? parseInt(args[1]) : null;
      await comprehensiveDeleteTest(employeeId);
    } else if (command === "login" && args[1] && args[2]) {
      const email = args[1];
      const password = args[2];
      await comprehensiveDeleteTest(null, { email, password });
    } else if (command === "delete" && args[1] && args[2]) {
      const employeeId = args[1];
      const token = args[2];
      await testDeleteEndpoint(employeeId, token);
    } else if (command === "auth" && args[1]) {
      const token = args[1];
      await testAuthMiddleware(token);
    } else {
      console.log("❌ Invalid command or missing arguments");
    }
  } catch (error) {
    console.error("Script error:", error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  testLogin,
  testDeleteEndpoint,
  testAuthMiddleware,
  comprehensiveDeleteTest,
};
