require("dotenv").config({ path: "./config.env" });
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Mock the validation endpoint logic
async function testValidationEndpoint() {
  try {
    console.log("🔍 Testing Validation Endpoint Logic...");

    const employeeId = 28; // stalin j (user with documents)
    const employmentType = "Intern";

    console.log(
      `\n📊 Testing for Employee ID: ${employeeId}, Type: ${employmentType}`
    );

    // Get the requirements from DOCUMENT_REQUIREMENTS
    const DOCUMENT_REQUIREMENTS = {
      "Full-Time": {
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
      },
      Intern: {
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
      },
    };

    const requirements = DOCUMENT_REQUIREMENTS[employmentType];
    if (!requirements) {
      console.log("❌ Invalid employment type");
      return;
    }

    // Get uploaded documents
    const uploadedDocs = await pool.query(
      `SELECT document_type, document_category, COUNT(*) as count
       FROM employee_documents 
       WHERE employee_id = $1 
       GROUP BY document_type, document_category`,
      [employeeId]
    );

    // Get manually entered documents
    const manualDocs = await pool.query(
      `SELECT document_name, status, uploaded_file_url
       FROM document_collection 
       WHERE employee_id = $1`,
      [employeeId]
    );

    const uploadedMap = uploadedDocs.rows.reduce((acc, doc) => {
      acc[doc.document_type] = parseInt(doc.count) || 0;
      return acc;
    }, {});

    console.log("\n📋 DEBUG - UploadedMap:", uploadedMap);

    const manualMap = {};
    manualDocs.rows.forEach((doc) => {
      const docName = doc.document_name.toLowerCase();
      let docType = null;

      if (docName.includes("resume")) docType = "resume";
      else if (docName.includes("offer") || docName.includes("appointment"))
        docType = "offer_letter";
      else if (docName.includes("compensation"))
        docType = "compensation_letter";
      else if (docName.includes("experience") || docName.includes("relieving"))
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
      else if (docName.includes("graduation") && docName.includes("marksheet"))
        docType = "graduation_marksheet";
      else if (
        docName.includes("graduation") &&
        docName.includes("certificate")
      )
        docType = "graduation_certificate";
      else if (docName.includes("postgrad") && docName.includes("marksheet"))
        docType = "postgrad_marksheet";
      else if (docName.includes("postgrad") && docName.includes("certificate"))
        docType = "postgrad_certificate";
      else if (docName.includes("aadhaar")) docType = "aadhaar";
      else if (docName.includes("pan")) docType = "pan";
      else if (docName.includes("passport")) docType = "passport";

      if (docType) {
        const isSubmitted =
          doc.status && !["pending", "n/a"].includes(doc.status.toLowerCase());
        if (isSubmitted) {
          manualMap[docType] = (manualMap[docType] || 0) + 1;
        }
      }
    });

    console.log("📋 DEBUG - ManualMap:", manualMap);

    // Check validation status
    const validation = {};
    let allRequired = true;

    Object.keys(requirements).forEach((category) => {
      validation[category] = requirements[category].map((req) => {
        const uploaded = uploadedMap[req.type] || 0;
        const manual = manualMap[req.type] || 0;
        const totalUploaded = uploaded + manual;
        const isValid = req.required ? totalUploaded > 0 : true;

        if (req.required && totalUploaded === 0) {
          allRequired = false;
        }

        return {
          ...req,
          uploaded: totalUploaded,
          uploadedFiles: uploaded,
          manualEntries: manual,
          isValid: isValid,
        };
      });
    });

    console.log("\n📋 Validation Response:");
    console.log(
      JSON.stringify({ validation, allRequiredUploaded: allRequired }, null, 2)
    );

    // Calculate totals for frontend
    let totalRequired = 0;
    let uploadedRequired = 0;

    Object.keys(validation).forEach((category) => {
      validation[category].forEach((req) => {
        if (req.required) {
          totalRequired++;
          if (req.uploaded > 0) {
            uploadedRequired++;
          }
        }
      });
    });

    console.log(
      `\n📊 Frontend Summary: ${uploadedRequired}/${totalRequired} required documents uploaded`
    );
    console.log(
      `🎯 Overall Status: ${allRequired ? "Complete" : "Incomplete"}`
    );
  } catch (error) {
    console.error("❌ Error testing validation endpoint:", error);
  } finally {
    await pool.end();
  }
}

testValidationEndpoint();
