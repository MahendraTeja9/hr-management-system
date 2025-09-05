require("dotenv").config({ path: "./config.env" });
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testStalinValidation() {
  try {
    console.log("🔍 Testing Document Validation for Stalin...");

    // Test both stalin employees
    const employees = [
      { id: 27, name: "stalin", type: "Full-Time" },
      { id: 31, name: "stalin j", type: "Intern" },
    ];

    for (const employee of employees) {
      console.log(
        `\n📊 Testing for Employee ID: ${employee.id}, Name: ${employee.name}, Type: ${employee.type}`
      );

      // 1. Check uploaded documents
      const uploadedDocs = await pool.query(
        `SELECT document_type, document_category, COUNT(*) as count
         FROM employee_documents 
         WHERE employee_id = $1 
         GROUP BY document_type, document_category`,
        [employee.id]
      );

      console.log("\n📋 Uploaded Documents:");
      uploadedDocs.rows.forEach((doc) => {
        console.log(`   ${doc.document_type}: ${doc.count} files`);
      });

      // 2. Check manually entered documents
      const manualDocs = await pool.query(
        `SELECT document_name, status, uploaded_file_url
         FROM document_collection 
         WHERE employee_id = $1`,
        [employee.id]
      );

      console.log("\n📋 Manually Entered Documents:");
      manualDocs.rows.forEach((doc) => {
        console.log(`   ${doc.document_name}: ${doc.status}`);
      });

      // 3. Test the validation logic with correct requirements
      let requirements;
      if (employee.type === "Intern") {
        requirements = {
          employment: [
            { type: "resume", name: "Updated Resume", required: true },
          ],
          education: [
            {
              type: "ssc_certificate",
              name: "SSC Certificate (10th)",
              required: true,
            },
            {
              type: "ssc_marksheet",
              name: "SSC Marksheet (10th)",
              required: true,
            },
            {
              type: "hsc_certificate",
              name: "HSC Certificate (12th)",
              required: true,
            },
            {
              type: "hsc_marksheet",
              name: "HSC Marksheet (12th)",
              required: true,
            },
            {
              type: "graduation_marksheet",
              name: "Graduation Consolidated Marksheet",
              required: true,
            },
            {
              type: "graduation_certificate",
              name: "Graduation Original/Provisional Certificate",
              required: true,
            },
            {
              type: "postgrad_marksheet",
              name: "Post-Graduation Marksheet",
              required: false,
            },
            {
              type: "postgrad_certificate",
              name: "Post-Graduation Certificate",
              required: false,
            },
          ],
          identity: [
            { type: "aadhaar", name: "Aadhaar Card", required: true },
            { type: "pan", name: "PAN Card", required: true },
          ],
        };
      } else {
        // Full-Time requirements
        requirements = {
          employment: [
            { type: "resume", name: "Updated Resume", required: true },
            {
              type: "offer_letter",
              name: "Offer & Appointment Letter",
              required: false,
            },
            {
              type: "compensation_letter",
              name: "Latest Compensation Letter",
              required: false,
            },
            {
              type: "experience_letter",
              name: "Experience & Relieving Letter",
              required: false,
            },
            {
              type: "payslip",
              name: "Latest 3 Months Pay Slips",
              required: true,
            },
            {
              type: "form16",
              name: "Form 16 / Form 12B / Taxable Income Statement",
              required: false,
            },
          ],
          education: [
            {
              type: "ssc_certificate",
              name: "SSC Certificate (10th)",
              required: true,
            },
            {
              type: "ssc_marksheet",
              name: "SSC Marksheet (10th)",
              required: true,
            },
            {
              type: "hsc_certificate",
              name: "HSC Certificate (12th)",
              required: true,
            },
            {
              type: "hsc_marksheet",
              name: "HSC Marksheet (12th)",
              required: true,
            },
            {
              type: "graduation_marksheet",
              name: "Graduation Consolidated Marksheet",
              required: true,
            },
            {
              type: "graduation_certificate",
              name: "Graduation Original/Provisional Certificate",
              required: true,
            },
            {
              type: "postgrad_marksheet",
              name: "Post-Graduation Marksheet",
              required: false,
            },
            {
              type: "postgrad_certificate",
              name: "Post-Graduation Certificate",
              required: false,
            },
          ],
          identity: [
            { type: "aadhaar", name: "Aadhaar Card", required: true },
            { type: "pan", name: "PAN Card", required: true },
            { type: "passport", name: "Passport", required: true },
          ],
        };
      }

      const uploadedMap = uploadedDocs.rows.reduce((acc, doc) => {
        acc[doc.document_type] = doc.count;
        return acc;
      }, {});

      const manualMap = {};
      manualDocs.rows.forEach((doc) => {
        const docName = doc.document_name.toLowerCase();
        let docType = null;

        if (docName.includes("resume")) docType = "resume";
        else if (docName.includes("offer") || docName.includes("appointment"))
          docType = "offer_letter";
        else if (docName.includes("compensation"))
          docType = "compensation_letter";
        else if (
          docName.includes("experience") ||
          docName.includes("relieving")
        )
          docType = "experience_letter";
        else if (docName.includes("payslip") || docName.includes("pay slip"))
          docType = "payslip";
        else if (docName.includes("form 16") || docName.includes("form 12b"))
          docType = "form16";
        else if (docName.includes("ssc") && docName.includes("certificate"))
          docType = "ssc_certificate";
        else if (docName.includes("ssc") && docName.includes("marksheet"))
          docType = "ssc_marksheet";
        else if (docName.includes("hsc") && docName.includes("certificate"))
          docType = "hsc_certificate";
        else if (docName.includes("hsc") && docName.includes("marksheet"))
          docType = "hsc_marksheet";
        else if (
          docName.includes("graduation") &&
          docName.includes("marksheet")
        )
          docType = "graduation_marksheet";
        else if (
          docName.includes("graduation") &&
          docName.includes("certificate")
        )
          docType = "graduation_certificate";
        else if (docName.includes("postgrad") && docName.includes("marksheet"))
          docType = "postgrad_marksheet";
        else if (
          docName.includes("postgrad") &&
          docName.includes("certificate")
        )
          docType = "postgrad_certificate";
        else if (docName.includes("aadhaar")) docType = "aadhaar";
        else if (docName.includes("pan")) docType = "pan";
        else if (docName.includes("passport")) docType = "passport";

        if (docType) {
          const isSubmitted =
            doc.status &&
            !["pending", "n/a"].includes(doc.status.toLowerCase());
          if (isSubmitted) {
            manualMap[docType] = (manualMap[docType] || 0) + 1;
          }
        }
      });

      console.log("\n📋 Manual Document Mapping:");
      Object.keys(manualMap).forEach((docType) => {
        console.log(`   ${docType}: ${manualMap[docType]} entries`);
      });

      // 4. Show validation results
      console.log("\n📋 Validation Results:");
      let allRequired = true;
      let totalRequired = 0;
      let uploadedRequired = 0;

      Object.keys(requirements).forEach((category) => {
        console.log(`\n   ${category.toUpperCase()}:`);
        requirements[category].forEach((req) => {
          const uploaded = uploadedMap[req.type] || 0;
          const manual = manualMap[req.type] || 0;
          const totalUploaded = uploaded + manual;
          const isValid = req.required ? totalUploaded > 0 : true;

          if (req.required) {
            totalRequired++;
            if (totalUploaded > 0) {
              uploadedRequired++;
            } else {
              allRequired = false;
            }
          }

          console.log(`     ${req.name}:`);
          console.log(`       Required: ${req.required}`);
          console.log(`       Uploaded Files: ${uploaded}`);
          console.log(`       Manual Entries: ${manual}`);
          console.log(`       Total: ${totalUploaded}`);
          console.log(`       Status: ${isValid ? "✅ Valid" : "❌ Missing"}`);
        });
      });

      console.log(
        `\n🎯 Overall Status: ${
          allRequired
            ? "✅ All Required Documents Complete"
            : "❌ Missing Required Documents"
        }`
      );
      console.log(
        `📊 Summary: ${uploadedRequired}/${totalRequired} required documents uploaded`
      );
      console.log("\n" + "=".repeat(80));
    }
  } catch (error) {
    console.error("❌ Error testing document validation:", error);
  } finally {
    await pool.end();
  }
}

testStalinValidation();
