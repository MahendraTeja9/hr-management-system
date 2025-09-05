const axios = require("axios");

// Test the document collection API endpoints
const testDocumentCollection = async () => {
  try {
    console.log("🧪 Testing Document Collection API endpoints...\n");

    // Test 1: Get all document collection records
    console.log("1️⃣ Testing GET /hr/document-collection...");
    const documentsResponse = await axios.get(
      "http://localhost:5001/api/hr/document-collection"
    );
    console.log(
      `✅ Success! Found ${documentsResponse.data.documents.length} document records`
    );

    // Show first few records
    const firstFew = documentsResponse.data.documents.slice(0, 3);
    firstFew.forEach((doc, index) => {
      console.log(
        `   ${index + 1}. ${doc.employee_name} - ${doc.document_name} (${
          doc.status
        })`
      );
    });

    // Test 2: Get document templates
    console.log("\n2️⃣ Testing GET /hr/document-templates...");
    const templatesResponse = await axios.get(
      "http://localhost:5001/api/hr/document-templates"
    );
    console.log(
      `✅ Success! Found ${templatesResponse.data.templates.length} document templates`
    );

    // Show template categories
    const requiredCount = templatesResponse.data.templates.filter(
      (t) => t.document_type === "Required"
    ).length;
    const optionalCount = templatesResponse.data.templates.filter(
      (t) => t.document_type === "Optional"
    ).length;
    console.log(`   Required: ${requiredCount}, Optional: ${optionalCount}`);

    // Test 3: Get employee master data
    console.log("\n3️⃣ Testing GET /hr/master...");
    const employeesResponse = await axios.get(
      "http://localhost:5001/api/hr/master"
    );
    console.log(
      `✅ Success! Found ${employeesResponse.data.employees.length} employees`
    );

    console.log("\n🎉 All API tests passed successfully!");
    console.log("📋 Document Collection system is ready for use.");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
};

// Run the test
testDocumentCollection();
