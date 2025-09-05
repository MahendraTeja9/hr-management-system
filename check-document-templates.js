const axios = require("axios");

// Check if all required document templates exist in the database
async function checkDocumentTemplates() {
  try {
    console.log("🔍 Checking Document Templates...\n");

    // Get document templates
    console.log("1️⃣ Testing GET /hr/document-templates...");
    const templatesResponse = await axios.get(
      "http://localhost:5001/api/hr/document-templates"
    );
    console.log("✅ Document templates loaded");
    console.log(
      `📊 Found ${templatesResponse.data.templates.length} document templates\n`
    );

    // Define required documents for each employment type
    const requiredDocuments = {
      Intern: [
        "Updated Resume",
        "SSC Certificate (10th)",
        "SSC Marksheet (10th)",
        "HSC Certificate (12th)",
        "HSC Marksheet (12th)",
        "Graduation Consolidated Marksheet",
        "Graduation Original/Provisional Certificate",
        "Aadhaar Card",
        "PAN Card",
      ],
      "Full-Time": [
        "Updated Resume",
        "Offer & Appointment Letter",
        "Latest Compensation Letter",
        "Experience & Relieving Letter",
        "Latest 3 Months Pay Slips",
        "Form 16 / Form 12B / Taxable Income Statement",
        "SSC Certificate (10th)",
        "SSC Marksheet (10th)",
        "HSC Certificate (12th)",
        "HSC Marksheet (12th)",
        "Graduation Consolidated Marksheet",
        "Graduation Original/Provisional Certificate",
        "Aadhaar Card",
        "PAN Card",
        "Passport",
      ],
      Contract: [
        "Updated Resume",
        "Offer & Appointment Letter",
        "Latest Compensation Letter",
        "Experience & Relieving Letter",
        "Latest 3 Months Pay Slips",
        "Form 16 / Form 12B / Taxable Income Statement",
        "SSC Certificate (10th)",
        "SSC Marksheet (10th)",
        "HSC Certificate (12th)",
        "HSC Marksheet (12th)",
        "Graduation Consolidated Marksheet",
        "Graduation Original/Provisional Certificate",
        "Aadhaar Card",
        "PAN Card",
      ],
    };

    // Get all template names from database
    const dbTemplateNames = templatesResponse.data.templates.map(
      (t) => t.document_name
    );

    console.log("📋 DATABASE TEMPLATES:");
    templatesResponse.data.templates.forEach((template, index) => {
      console.log(
        `   ${index + 1}. ${template.document_name} (${
          template.document_type
        }) - ${template.is_active ? "Active" : "Inactive"}`
      );
    });

    console.log("\n🔍 TEMPLATE ANALYSIS BY EMPLOYMENT TYPE:");

    Object.keys(requiredDocuments).forEach((employmentType) => {
      const required = requiredDocuments[employmentType];
      console.log(`\n👔 ${employmentType} (${required.length} documents):`);

      required.forEach((docName, index) => {
        const exists = dbTemplateNames.includes(docName);
        const template = templatesResponse.data.templates.find(
          (t) => t.document_name === docName
        );
        const icon = exists ? "✅" : "❌";
        const status = template
          ? template.is_active
            ? "Active"
            : "Inactive"
          : "Missing";

        console.log(`   ${index + 1}. ${icon} ${docName} - ${status}`);
      });

      // Check missing templates
      const missing = required.filter(
        (docName) => !dbTemplateNames.includes(docName)
      );
      if (missing.length > 0) {
        console.log(
          `\n   ❌ Missing templates for ${employmentType} (${missing.length}):`
        );
        missing.forEach((doc) => {
          console.log(`      - ${doc}`);
        });
      }
    });

    // Check for templates that might be named differently
    console.log("\n🔍 POTENTIAL NAMING ISSUES:");

    const internRequired = requiredDocuments["Intern"];
    internRequired.forEach((docName) => {
      if (!dbTemplateNames.includes(docName)) {
        // Look for similar names
        const similar = dbTemplateNames.filter(
          (dbName) =>
            dbName
              .toLowerCase()
              .includes(docName.toLowerCase().split(" ")[0]) ||
            docName.toLowerCase().includes(dbName.toLowerCase().split(" ")[0])
        );

        if (similar.length > 0) {
          console.log(
            `   ⚠️ "${docName}" not found, but similar templates exist:`
          );
          similar.forEach((sim) => {
            console.log(`      - ${sim}`);
          });
        }
      }
    });

    console.log("\n🎉 Document template check completed!");
  } catch (error) {
    console.error("❌ Check failed:", error.response?.data || error.message);
  }
}

// Run the check
checkDocumentTemplates();
