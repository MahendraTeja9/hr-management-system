const axios = require("axios");

// Debug script to investigate intern document count issue
async function debugInternDocuments() {
  try {
    console.log("🔍 Debugging Intern Document Count Issue...\n");

    // Test 1: Get approved employee forms
    console.log("1️⃣ Testing GET /hr/approved-employee-forms...");
    const approvedFormsResponse = await axios.get(
      "http://localhost:5001/api/hr/approved-employee-forms"
    );
    console.log("✅ Approved employee forms loaded");
    console.log(
      `📊 Found ${approvedFormsResponse.data.forms.length} approved employee forms\n`
    );

    // Test 2: Get document collection
    console.log("2️⃣ Testing GET /hr/document-collection...");
    const collectionResponse = await axios.get(
      "http://localhost:5001/api/hr/document-collection"
    );
    console.log("✅ Document collection loaded");
    console.log(
      `📊 Found ${collectionResponse.data.documents.length} document collection records\n`
    );

    // Test 3: Get document templates
    console.log("3️⃣ Testing GET /hr/document-templates...");
    const templatesResponse = await axios.get(
      "http://localhost:5001/api/hr/document-templates"
    );
    console.log("✅ Document templates loaded");
    console.log(
      `📊 Found ${templatesResponse.data.templates.length} document templates\n`
    );

    // Analysis
    console.log("📊 INTERN DOCUMENT DEBUG ANALYSIS\n");

    // Find intern employees
    const internEmployees = approvedFormsResponse.data.forms.filter((form) => {
      const employmentType =
        form.employee_type || form.form_data?.employmentType || "Unknown";
      return employmentType === "Intern";
    });

    console.log(`👥 Found ${internEmployees.length} Intern employees`);

    if (internEmployees.length === 0) {
      console.log("❌ No Intern employees found in approved forms");
      return;
    }

    // Group documents by employee
    const collectionByEmployee = {};
    collectionResponse.data.documents.forEach((doc) => {
      if (!collectionByEmployee[doc.employee_id]) {
        collectionByEmployee[doc.employee_id] = [];
      }
      collectionByEmployee[doc.employee_id].push(doc);
    });

    // Analyze each intern employee
    internEmployees.forEach((intern, index) => {
      const employeeId = intern.employee_id;
      const collectionDocs = collectionByEmployee[employeeId] || [];

      console.log(`\n${index + 1}. 👤 Intern Employee ${employeeId}:`);
      console.log(`   📧 Email: ${intern.user_email}`);
      console.log(`   📝 Form Status: ${intern.status}`);
      console.log(`   📄 Documents in Collection: ${collectionDocs.length}`);
      console.log(`   🎯 Expected Documents: 9`);

      // Show all documents for this intern
      if (collectionDocs.length > 0) {
        console.log(`   📋 All Documents:`);
        collectionDocs.forEach((doc, docIndex) => {
          const status = doc.effective_status || doc.status;
          const icon = status === "Received" ? "✅" : "⏳";
          console.log(
            `      ${docIndex + 1}. ${icon} ${doc.document_name} - ${status}`
          );
        });
      } else {
        console.log(`   ❌ No documents found in collection`);
      }

      // Check what documents should be there for Intern
      const expectedInternDocs = [
        "Updated Resume",
        "SSC Certificate (10th)",
        "SSC Marksheet (10th)",
        "HSC Certificate (12th)",
        "HSC Marksheet (12th)",
        "Graduation Consolidated Marksheet",
        "Graduation Original/Provisional Certificate",
        "Aadhaar Card",
        "PAN Card",
      ];

      console.log(
        `\n   🎯 Expected Intern Documents (${expectedInternDocs.length}):`
      );
      expectedInternDocs.forEach((docName, docIndex) => {
        const found = collectionDocs.some(
          (doc) => doc.document_name === docName
        );
        const icon = found ? "✅" : "❌";
        console.log(`      ${docIndex + 1}. ${icon} ${docName}`);
      });

      // Check what documents are missing
      const missingDocs = expectedInternDocs.filter(
        (docName) =>
          !collectionDocs.some((doc) => doc.document_name === docName)
      );

      if (missingDocs.length > 0) {
        console.log(`\n   ❌ Missing Documents (${missingDocs.length}):`);
        missingDocs.forEach((doc) => {
          console.log(`      - ${doc}`);
        });
      }

      // Check for extra documents
      const actualDocNames = collectionDocs.map((doc) => doc.document_name);
      const extraDocs = actualDocNames.filter(
        (docName) => !expectedInternDocs.includes(docName)
      );

      if (extraDocs.length > 0) {
        console.log(`\n   ⚠️ Extra Documents (${extraDocs.length}):`);
        extraDocs.forEach((doc) => {
          console.log(`      - ${doc}`);
        });
      }
    });

    // Check document templates
    console.log(`\n📋 DOCUMENT TEMPLATES ANALYSIS:`);
    console.log(
      `   Total templates: ${templatesResponse.data.templates.length}`
    );

    const internRequiredTemplates = [
      "Updated Resume",
      "SSC Certificate (10th)",
      "SSC Marksheet (10th)",
      "HSC Certificate (12th)",
      "HSC Marksheet (12th)",
      "Graduation Consolidated Marksheet",
      "Graduation Original/Provisional Certificate",
      "Aadhaar Card",
      "PAN Card",
    ];

    console.log(`\n   🎯 Checking if all Intern required templates exist:`);
    internRequiredTemplates.forEach((templateName, index) => {
      const exists = templatesResponse.data.templates.some(
        (t) => t.document_name === templateName
      );
      const icon = exists ? "✅" : "❌";
      console.log(`      ${index + 1}. ${icon} ${templateName}`);
    });

    // Check if templates are active
    console.log(`\n   📊 Template Status:`);
    templatesResponse.data.templates.forEach((template) => {
      if (internRequiredTemplates.includes(template.document_name)) {
        console.log(
          `      ${template.document_name}: ${
            template.is_active ? "Active" : "Inactive"
          } (${template.document_type})`
        );
      }
    });

    console.log("\n🎉 Intern document debug completed!");
  } catch (error) {
    console.error("❌ Debug failed:", error.response?.data || error.message);
  }
}

// Run the debug
debugInternDocuments();
