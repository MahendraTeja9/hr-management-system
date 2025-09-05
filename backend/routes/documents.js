const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool } = require("../config/database");
const {
  authenticateToken,
  requireEmployee,
  requireHR,
} = require("../middleware/auth");

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads/documents");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept PDF, DOC, DOCX, JPG, JPEG, PNG files
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Document type configurations based on employment type
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
        multiple: true,
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
      { type: "ssc_marksheet", name: "SSC Marksheet (10th)", required: true },
      {
        type: "hsc_certificate",
        name: "HSC Certificate (12th)",
        required: true,
      },
      { type: "hsc_marksheet", name: "HSC Marksheet (12th)", required: true },
      {
        type: "graduation_marksheet",
        name: "Graduation Consolidated Marksheet",
        required: true,
      },
      {
        type: "graduation_certificate",
        name: "Latest Graduation",
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
  Contract: {
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
        multiple: true,
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
      { type: "ssc_marksheet", name: "SSC Marksheet (10th)", required: true },
      {
        type: "hsc_certificate",
        name: "HSC Certificate (12th)",
        required: true,
      },
      { type: "hsc_marksheet", name: "HSC Marksheet (12th)", required: true },
      {
        type: "graduation_marksheet",
        name: "Graduation Consolidated Marksheet",
        required: true,
      },
      {
        type: "graduation_certificate",
        name: "Latest Graduation",
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
    employment: [{ type: "resume", name: "Updated Resume", required: true }],
    education: [
      {
        type: "ssc_certificate",
        name: "SSC Certificate (10th)",
        required: true,
      },
      { type: "ssc_marksheet", name: "SSC Marksheet (10th)", required: true },
      {
        type: "hsc_certificate",
        name: "HSC Certificate (12th)",
        required: true,
      },
      { type: "hsc_marksheet", name: "HSC Marksheet (12th)", required: true },
      {
        type: "graduation_marksheet",
        name: "Graduation Consolidated Marksheet",
        required: true,
      },
      {
        type: "graduation_certificate",
        name: "Latest Graduation",
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

// Get all document requirements (without employment type)
router.get("/requirements", (req, res) => {
  // Return all document requirements combined
  const allRequirements = {
    employment: [
      { type: "resume", name: "Updated Resume", required: false },
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
        required: false,
        multiple: true,
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
        required: false,
      },
      { type: "ssc_marksheet", name: "SSC Marksheet (10th)", required: false },
      {
        type: "hsc_certificate",
        name: "HSC Certificate (12th)",
        required: false,
      },
      { type: "hsc_marksheet", name: "HSC Marksheet (12th)", required: false },
      {
        type: "graduation_marksheet",
        name: "Graduation Marksheet",
        required: false,
      },
      {
        type: "graduation_certificate",
        name: "Latest Graduation",
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
      { type: "passport", name: "Passport", required: false },
    ],
  };

  res.json(allRequirements);
});

// Get document requirements based on employment type
router.get("/requirements/:employmentType", (req, res) => {
  const { employmentType } = req.params;
  const requirements = DOCUMENT_REQUIREMENTS[employmentType];

  if (!requirements) {
    return res.status(400).json({ error: "Invalid employment type" });
  }

  res.json(requirements);
});

// Upload documents for an employee
router.post(
  "/upload/:employeeId",
  [authenticateToken, upload.array("documents", 20)],
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { documentTypes, documentCategories } = req.body;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Parse document types and categories (sent as JSON strings)
      const types = JSON.parse(documentTypes);
      const categories = JSON.parse(documentCategories);

      // Verify user can upload for this employee (own documents or HR)
      if (
        req.user.role !== "hr" &&
        req.user.role !== "admin" &&
        req.user.userId !== parseInt(employeeId)
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      const uploadedDocuments = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const documentType = types[i];
        const documentCategory = categories[i];

        // Check if document type already exists (for non-multiple types)
        const existingDoc = await pool.query(
          "SELECT id FROM employee_documents WHERE employee_id = $1 AND document_type = $2",
          [employeeId, documentType]
        );

        // If document exists and it's not a multiple type, delete the old one
        const multipleTypes = ["payslip"];
        if (
          existingDoc.rows.length > 0 &&
          !multipleTypes.includes(documentType)
        ) {
          // Delete old file
          const oldDoc = await pool.query(
            "SELECT file_url FROM employee_documents WHERE id = $1",
            [existingDoc.rows[0].id]
          );

          if (oldDoc.rows.length > 0) {
            const oldFilePath = path.join(
              __dirname,
              "..",
              oldDoc.rows[0].file_url
            );
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          }

          // Delete from database
          await pool.query("DELETE FROM employee_documents WHERE id = $1", [
            existingDoc.rows[0].id,
          ]);
        }

        // Insert new document record
        const result = await pool.query(
          `
        INSERT INTO employee_documents (
          employee_id, document_type, document_category, file_name, 
          file_url, file_size, mime_type, is_required
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
          [
            employeeId,
            documentType,
            documentCategory,
            file.originalname,
            `uploads/documents/${file.filename}`,
            file.size,
            file.mimetype,
            false, // Will be updated based on requirements
          ]
        );

        uploadedDocuments.push(result.rows[0]);
      }

      res.status(201).json({
        message: "Documents uploaded successfully",
        documents: uploadedDocuments,
      });
    } catch (error) {
      console.error("Error uploading documents:", error);
      res.status(500).json({ error: "Failed to upload documents" });
    }
  }
);

// Get documents for an employee
router.get("/employee/:employeeId", authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Verify user can view these documents (own documents or HR)
    if (
      req.user.role !== "hr" &&
      req.user.role !== "admin" &&
      req.user.userId !== parseInt(employeeId)
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `
      SELECT * FROM employee_documents 
      WHERE employee_id = $1 
      ORDER BY document_category, document_type, uploaded_at DESC
    `,
      [employeeId]
    );

    // Group documents by category
    const groupedDocuments = result.rows.reduce((acc, doc) => {
      if (!acc[doc.document_category]) {
        acc[doc.document_category] = [];
      }
      acc[doc.document_category].push(doc);
      return acc;
    }, {});

    res.json(groupedDocuments);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Preview a document (for viewing in browser)
router.get("/preview/:documentId", authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const result = await pool.query(
      `
      SELECT ed.*, u.email 
      FROM employee_documents ed
      JOIN users u ON ed.employee_id = u.id
      WHERE ed.id = $1
    `,
      [documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const document = result.rows[0];

    // Verify user can view this document (own documents or HR)
    if (
      req.user.role !== "hr" &&
      req.user.role !== "admin" &&
      req.user.userId !== document.employee_id
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const filePath = path.join(__dirname, "..", document.file_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    // Set appropriate headers for preview
    res.setHeader(
      "Content-Type",
      document.file_type || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      'inline; filename="' + document.file_name + '"'
    );

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error previewing document:", error);
    res.status(500).json({ error: "Failed to preview document" });
  }
});

// Download a document
router.get("/download/:documentId", authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const result = await pool.query(
      `
      SELECT ed.*, u.email 
      FROM employee_documents ed
      JOIN users u ON ed.employee_id = u.id
      WHERE ed.id = $1
    `,
      [documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const document = result.rows[0];

    // Verify user can download this document (own documents or HR)
    if (
      req.user.role !== "hr" &&
      req.user.role !== "admin" &&
      req.user.userId !== document.employee_id
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const filePath = path.join(__dirname, "..", document.file_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    res.download(filePath, document.file_name);
  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({ error: "Failed to download document" });
  }
});

// Delete a document
router.delete("/:documentId", authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const result = await pool.query(
      `
      SELECT * FROM employee_documents WHERE id = $1
    `,
      [documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const document = result.rows[0];

    // Verify user can delete this document (own documents or HR)
    if (
      req.user.role !== "hr" &&
      req.user.role !== "admin" &&
      req.user.userId !== document.employee_id
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, "..", document.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await pool.query("DELETE FROM employee_documents WHERE id = $1", [
      documentId,
    ]);

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// Get document validation status for an employee
// Get document validation without employment type
router.get("/validation/:employeeId", authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Verify user can view this validation (own documents or HR)
    if (
      req.user.role !== "hr" &&
      req.user.role !== "admin" &&
      req.user.userId !== parseInt(employeeId)
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get uploaded documents
    const uploadedDocs = await pool.query(
      `
      SELECT document_type, document_category, COUNT(*) as count
      FROM employee_documents 
      WHERE employee_id = $1 
      GROUP BY document_type, document_category
    `,
      [employeeId]
    );

    // Get manually entered documents from document_collection
    const manualDocs = await pool.query(
      `
      SELECT document_name, status, uploaded_file_url
      FROM document_collection 
      WHERE employee_id = $1
    `,
      [employeeId]
    );

    const uploadedMap = uploadedDocs.rows.reduce((acc, doc) => {
      acc[doc.document_type] = parseInt(doc.count) || 0;
      return acc;
    }, {});

    // Create a map of manually entered documents
    const manualMap = {};
    manualDocs.rows.forEach((doc) => {
      // Only count documents that are actually uploaded
      if (
        doc.status === "Not Uploaded" ||
        (doc.status === "Pending" && !doc.uploaded_file_url)
      ) {
        return; // Skip documents that are not uploaded
      }

      // Map document names to document types (approximate mapping)
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
      else if (
        docName.includes("graduation") &&
        docName.includes("certificate")
      )
        docType = "graduation_certificate";
      else if (docName.includes("graduation") && docName.includes("marksheet"))
        docType = "graduation_marksheet";
      else if (docName.includes("aadhaar")) docType = "aadhaar_card";
      else if (docName.includes("pan")) docType = "pan_card";
      else if (docName.includes("passport")) docType = "passport_size_photos";
      else if (docName.includes("address")) docType = "address_proof";
      else if (
        docName.includes("professional") ||
        docName.includes("certification")
      )
        docType = "professional_certifications";
      else if (
        docName.includes("educational") ||
        docName.includes("certificate")
      )
        docType = "educational_certificates";

      if (docType) {
        manualMap[docType] = (manualMap[docType] || 0) + 1;
      }
    });

    // Combine uploaded and manual documents
    const combinedMap = { ...uploadedMap };
    Object.keys(manualMap).forEach((docType) => {
      combinedMap[docType] = (combinedMap[docType] || 0) + manualMap[docType];
    });

    // Get document requirements to create proper validation structure
    const allRequirements = {
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
          multiple: true,
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
        { type: "ssc_marksheet", name: "SSC Marksheet (10th)", required: true },
        {
          type: "hsc_certificate",
          name: "HSC Certificate (12th)",
          required: true,
        },
        { type: "hsc_marksheet", name: "HSC Marksheet (12th)", required: true },
        {
          type: "graduation_marksheet",
          name: "Graduation Marksheet",
          required: true,
        },
        {
          type: "graduation_certificate",
          name: "Latest Graduation",
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
        { type: "passport", name: "Passport", required: false },
      ],
    };

    // Create validation response with uploaded counts
    const validation = {};
    Object.keys(allRequirements).forEach((category) => {
      validation[category] = allRequirements[category].map((req) => ({
        ...req,
        uploaded: combinedMap[req.type] || 0,
      }));
    });

    const totalRequired = Object.values(validation)
      .flat()
      .filter((req) => req.required).length;
    const uploadedRequired = Object.values(validation)
      .flat()
      .filter((req) => req.required && (combinedMap[req.type] || 0) > 0).length;

    res.json({
      validation,
      allRequiredUploaded: uploadedRequired === totalRequired,
      totalRequired,
      uploadedRequired,
    });
  } catch (error) {
    console.error("Document validation error:", error);
    res.status(500).json({ error: "Failed to get document validation" });
  }
});

router.get(
  "/validation/:employeeId/:employmentType",
  authenticateToken,
  async (req, res) => {
    try {
      const { employeeId, employmentType } = req.params;

      // Verify user can view this validation (own documents or HR)
      if (
        req.user.role !== "hr" &&
        req.user.role !== "admin" &&
        req.user.userId !== parseInt(employeeId)
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      const requirements = DOCUMENT_REQUIREMENTS[employmentType];
      if (!requirements) {
        return res.status(400).json({ error: "Invalid employment type" });
      }

      // Get uploaded documents
      const uploadedDocs = await pool.query(
        `
      SELECT document_type, document_category, COUNT(*) as count
      FROM employee_documents 
      WHERE employee_id = $1 
      GROUP BY document_type, document_category
    `,
        [employeeId]
      );

      // Get manually entered documents from document_collection
      const manualDocs = await pool.query(
        `
      SELECT document_name, status, uploaded_file_url
      FROM document_collection 
      WHERE employee_id = $1
    `,
        [employeeId]
      );

      const uploadedMap = uploadedDocs.rows.reduce((acc, doc) => {
        acc[doc.document_type] = parseInt(doc.count) || 0;
        return acc;
      }, {});

      // Create a map of manually entered documents
      const manualMap = {};
      manualDocs.rows.forEach((doc) => {
        // Map document names to document types (approximate mapping)
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
          docName.includes("certificate")
        )
          docType = "graduation_certificate";
        else if (
          docName.includes("graduation") &&
          docName.includes("marksheet")
        )
          docType = "graduation_marksheet";
        else if (docName.includes("aadhaar")) docType = "aadhaar_card";
        else if (docName.includes("pan")) docType = "pan_card";
        else if (docName.includes("passport")) docType = "passport_size_photos";
        else if (docName.includes("address")) docType = "address_proof";
        else if (
          docName.includes("professional") ||
          docName.includes("certification")
        )
          docType = "professional_certifications";
        else if (
          docName.includes("educational") ||
          docName.includes("certificate")
        )
          docType = "educational_certificates";

        if (docType) {
          // Consider documents as uploaded if status is not 'Pending' or 'N/A'
          const isSubmitted =
            doc.status &&
            !["pending", "n/a"].includes(doc.status.toLowerCase());
          if (isSubmitted) {
            manualMap[docType] = (manualMap[docType] || 0) + 1;
          }
        }
      });

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

      res.json({
        validation,
        allRequiredUploaded: allRequired,
      });
    } catch (error) {
      console.error("Error validating documents:", error);
      res.status(500).json({ error: "Failed to validate documents" });
    }
  }
);

// Update document status for manually entered documents
router.put(
  "/update-status/:employeeId",
  authenticateToken,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { documentName, status, notes } = req.body;

      // Verify user is HR or admin
      if (req.user.role !== "hr" && req.user.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Access denied. HR role required." });
      }

      // Update document status in document_collection table
      const result = await pool.query(
        `
        UPDATE document_collection 
        SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $3 AND document_name = $4
        RETURNING *
      `,
        [status, notes, employeeId, documentName]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json({
        message: "Document status updated successfully",
        document: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating document status:", error);
      res.status(500).json({ error: "Failed to update document status" });
    }
  }
);

// Bulk update document status for multiple documents
router.put(
  "/bulk-update-status/:employeeId",
  authenticateToken,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { documents } = req.body; // Array of { documentName, status, notes }

      // Verify user is HR or admin
      if (req.user.role !== "hr" && req.user.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Access denied. HR role required." });
      }

      const results = [];

      for (const doc of documents) {
        const result = await pool.query(
          `
          UPDATE document_collection 
          SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
          WHERE employee_id = $3 AND document_name = $4
          RETURNING *
        `,
          [doc.status, doc.notes || null, employeeId, doc.documentName]
        );

        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      }

      res.json({
        message: `${results.length} documents updated successfully`,
        documents: results,
      });
    } catch (error) {
      console.error("Error bulk updating document status:", error);
      res.status(500).json({ error: "Failed to update document status" });
    }
  }
);

// Get employee documents - Missing endpoint
router.get(
  "/employee",
  [authenticateToken, requireEmployee],
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM document_collection WHERE employee_id = $1 ORDER BY created_at DESC`,
        [req.user.userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get employee documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  }
);

// Get document templates - Missing endpoint
router.get("/templates", [authenticateToken], async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM document_templates ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get document templates error:", error);
    res.status(500).json({ error: "Failed to get templates" });
  }
});

module.exports = router;
