const axios = require("axios");

// Analyze document requirements from employee form management vs document collection
async function analyzeDocumentRequirements() {
  try {
    console.log("📋 Analyzing Document Requirements...\n");

    // Test 1: Get document requirements from documents.js
    console.log("1️⃣ Testing GET /documents/requirements...");

    const employmentTypes = ["Full-Time", "Contract", "Intern"];
    const documentRequirements = {};

    for (const type of employmentTypes) {
      try {
        const response = await axios.get(
          `http://localhost:5001/api/documents/requirements/${type}`
        );
        documentRequirements[type] = response.data;
        console.log(`✅ ${type} requirements loaded`);
      } catch (error) {
        console.log(`❌ Failed to load ${type} requirements`);
      }
    }

    // Test 2: Get document templates from database
    console.log("\n2️⃣ Testing GET /hr/document-templates...");
    const templatesResponse = await axios.get(
      "http://localhost:5001/api/hr/document-templates"
    );
    console.log("✅ Document templates loaded");
    console.log(
      `📊 Found ${templatesResponse.data.templates.length} document templates\n`
    );

    // Test 3: Get employee forms
    console.log("3️⃣ Testing GET /hr/employee-forms...");
    const formsResponse = await axios.get(
      "http://localhost:5001/api/hr/employee-forms"
    );
    console.log("✅ Employee forms loaded");
    console.log(`📊 Found ${formsResponse.data.forms.length} employee forms\n`);

    // Test 4: Get document collection
    console.log("4️⃣ Testing GET /hr/document-collection...");
    const collectionResponse = await axios.get(
      "http://localhost:5001/api/hr/document-collection"
    );
    console.log("✅ Document collection loaded");
    console.log(
      `📊 Found ${collectionResponse.data.documents.length} document collection records\n`
    );

    // Analysis
    console.log("📊 DOCUMENT REQUIREMENTS ANALYSIS\n");

    // Show document requirements by employment type
    console.log("🎯 DOCUMENT REQUIREMENTS BY EMPLOYMENT TYPE:");
    Object.keys(documentRequirements).forEach((type) => {
      const requirements = documentRequirements[type];
      console.log(`\n👔 ${type}:`);

      if (requirements.employment) {
        console.log("   💼 Employment Documents:");
        requirements.employment.forEach((doc) => {
          console.log(
            `      ${doc.required ? "✅" : "📄"} ${doc.name} (${doc.type})`
          );
        });
      }

      if (requirements.education) {
        console.log("   🎓 Education Documents:");
        requirements.education.forEach((doc) => {
          console.log(
            `      ${doc.required ? "✅" : "📄"} ${doc.name} (${doc.type})`
          );
        });
      }

      if (requirements.identity) {
        console.log("   🆔 Identity Documents:");
        requirements.identity.forEach((doc) => {
          console.log(
            `      ${doc.required ? "✅" : "📄"} ${doc.name} (${doc.type})`
          );
        });
      }
    });

    // Show available document templates
    console.log("\n📋 AVAILABLE DOCUMENT TEMPLATES:");
    templatesResponse.data.templates.forEach((template) => {
      console.log(
        `   📄 ${template.document_name} (${template.document_type})`
      );
    });

    // Analyze what should be in document collection vs what is there
    console.log("\n🔍 DOCUMENT COLLECTION ANALYSIS:");

    // Group documents by employee
    const collectionByEmployee = {};
    collectionResponse.data.documents.forEach((doc) => {
      if (!collectionByEmployee[doc.employee_id]) {
        collectionByEmployee[doc.employee_id] = [];
      }
      collectionByEmployee[doc.employee_id].push(doc);
    });

    // Analyze each employee
    formsResponse.data.forms.forEach((form) => {
      const employeeId = form.employee_id;
      const employmentType =
        form.employee_type || form.form_data?.employmentType || "Intern";
      const collectionDocs = collectionByEmployee[employeeId] || [];

      console.log(`\n👤 Employee ${employeeId} (${employmentType}):`);
      console.log(`   📝 Form Status: ${form.status || "Unknown"}`);
      console.log(`   📄 Documents in Collection: ${collectionDocs.length}`);

      // Get expected documents for this employment type
      const expectedDocs = documentRequirements[employmentType];
      if (expectedDocs) {
        const allExpectedDocs = [
          ...(expectedDocs.employment || []),
          ...(expectedDocs.education || []),
          ...(expectedDocs.identity || []),
        ];

        console.log(`   🎯 Expected Documents: ${allExpectedDocs.length}`);

        // Check which expected documents are missing
        const expectedDocNames = allExpectedDocs.map((doc) => doc.name);
        const actualDocNames = collectionDocs.map((doc) => doc.document_name);

        const missingDocs = expectedDocNames.filter(
          (name) => !actualDocNames.includes(name)
        );
        const extraDocs = actualDocNames.filter(
          (name) => !expectedDocNames.includes(name)
        );

        if (missingDocs.length > 0) {
          console.log(`   ❌ Missing Documents (${missingDocs.length}):`);
          missingDocs.forEach((doc) => {
            console.log(`      - ${doc}`);
          });
        }

        if (extraDocs.length > 0) {
          console.log(`   ⚠️ Extra Documents (${extraDocs.length}):`);
          extraDocs.forEach((doc) => {
            console.log(`      - ${doc}`);
          });
        }

        if (missingDocs.length === 0 && extraDocs.length === 0) {
          console.log(`   ✅ Perfect match! All expected documents present.`);
        }
      }

      // Show actual documents
      if (collectionDocs.length > 0) {
        console.log(`   📋 Actual Documents:`);
        collectionDocs.forEach((doc) => {
          const status = doc.effective_status || doc.status;
          console.log(
            `      ${status === "Received" ? "✅" : "⏳"} ${
              doc.document_name
            } - ${status}`
          );
        });
      }
    });

    console.log("\n🎉 Document requirements analysis completed!");
  } catch (error) {
    console.error("❌ Analysis failed:", error.response?.data || error.message);
  }
}

// Run the analysis
analyzeDocumentRequirements();
