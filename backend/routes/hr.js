const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { pool } = require("../config/database");
const { authenticateToken, requireHR } = require("../middleware/auth");
const { sendOnboardingEmail } = require("../utils/mailer");
const {
  generateEmployeeId,
  validateEmployeeId,
} = require("../utils/employeeIdGenerator");
const multer = require("multer");
const XLSX = require("xlsx");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/csv" ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls") ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed"),
        false
      );
    }
  },
});

// Apply authentication to all HR routes
router.use((req, res, next) => {
  console.log("🔍 HR route middleware hit:", req.method, req.path);
  next();
});
router.use(authenticateToken, requireHR);

// Test route to verify routing is working
router.get("/test", (req, res) => {
  console.log("🔍 Test route hit");
  res.json({ message: "HR routes are working" });
});

// Test route for document collection
router.put("/document-collection/test", (req, res) => {
  console.log("🔍 Document collection test route hit");
  console.log("🔍 Request body:", req.body);
  res.json({ message: "Document collection test route working" });
});

// Get available managers for assignment (from managers table - legacy)
router.get("/managers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT manager_name as employee_name, email as company_email 
      FROM managers 
      WHERE status = 'active' 
      ORDER BY manager_name
    `);

    res.json({
      success: true,
      managers: result.rows,
    });
  } catch (error) {
    console.error("Error fetching managers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch managers",
    });
  }
});

// Get available managers from Employee Master Table
router.get("/master-managers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        employee_name, 
        company_email,
        employee_id,
        type,
        status
      FROM employee_master 
      WHERE status = 'active' AND type = 'Manager'
      ORDER BY employee_name
    `);

    res.json({
      success: true,
      managers: result.rows,
    });
  } catch (error) {
    console.error("Error fetching managers from master table:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch managers from master table",
    });
  }
});

// Generate temporary password
function generateTempPassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function to create document collection records for an employee
async function createDocumentCollectionForEmployee(
  employeeId,
  userEmail,
  employmentType
) {
  try {
    // Get employee details
    const employeeResult = await pool.query(
      "SELECT first_name, last_name FROM users WHERE id = $1",
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      console.error("Employee not found for document collection creation");
      return;
    }

    const employee = employeeResult.rows[0];
    const employeeName = `${employee.first_name} ${employee.last_name}`.trim();

    // Get required documents based on employment type
    const getRequiredDocumentsForType = (type) => {
      switch (type) {
        case "Intern":
          return [
            "Updated Resume",
            "SSC Certificate (10th)",
            "SSC Marksheet (10th)",
            "HSC Certificate (12th)",
            "HSC Marksheet (12th)",
            "Graduation Consolidated Marksheet",
            "Latest Graduation",
            "Aadhaar Card",
            "PAN Card",
          ];
        case "Full-Time":
        case "Manager":
          return [
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
            "Latest Graduation",
            "Aadhaar Card",
            "PAN Card",
            "Passport",
          ];
        case "Contract":
          return [
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
            "Latest Graduation",
            "Aadhaar Card",
            "PAN Card",
          ];
        default:
          return [
            "Updated Resume",
            "SSC Certificate (10th)",
            "SSC Marksheet (10th)",
            "HSC Certificate (12th)",
            "HSC Marksheet (12th)",
            "Graduation Consolidated Marksheet",
            "Latest Graduation",
            "Aadhaar Card",
            "PAN Card",
          ];
      }
    };

    const requiredDocuments = getRequiredDocumentsForType(employmentType);

    // Get document templates for required documents only
    const templatesResult = await pool.query(
      "SELECT document_name, document_type FROM document_templates WHERE is_active = true AND document_name = ANY($1)",
      [requiredDocuments]
    );

    // Calculate due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create document collection records for required documents only
    let createdCount = 0;
    for (const template of templatesResult.rows) {
      // Check if document already exists
      const existingDoc = await pool.query(
        "SELECT id FROM document_collection WHERE employee_id = $1 AND document_name = $2",
        [employeeId, template.document_name]
      );

      if (existingDoc.rows.length === 0) {
        await pool.query(
          `
          INSERT INTO document_collection (
            employee_id, employee_name, emp_id, department, join_date, due_date,
            document_name, document_type, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
          [
            employeeId,
            employeeName,
            employeeId, // Using user ID as emp_id for now
            "N/A", // Department will be updated later
            new Date().toISOString().split("T")[0], // Today's date as join date
            dueDate.toISOString().split("T")[0],
            template.document_name,
            template.document_type,
            "Not Uploaded",
            "Document required for onboarding",
          ]
        );
        createdCount++;
      }
    }

    console.log(
      `✅ Created ${createdCount} document collection records for employee ${employeeId} (${employmentType})`
    );
  } catch (error) {
    console.error("Error creating document collection for employee:", error);
  }
}

// Add new employee
router.post(
  "/employees",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("name").notEmpty().trim().withMessage("Employee name is required"),
    body("type")
      .isIn(["Intern", "Contract", "Full-Time", "Manager"])
      .withMessage("Valid employment type is required"),
    body("doj")
      .isISO8601()
      .toDate()
      .withMessage("Valid date of joining is required"),
  ],
  async (req, res) => {
    try {
      console.log("🔍 Employee creation request received:", req.body);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, name, type, doj } = req.body;
      console.log("✅ Validated data:", { email, name, type, doj });

      // Check if email already exists
      console.log("🔍 Checking if email exists:", email);
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        console.log("❌ Email already exists:", email);
        return res.status(400).json({ error: "Email already exists" });
      }
      console.log("✅ Email is unique");

      // Generate temporary password
      const tempPassword = generateTempPassword();
      console.log("🔍 Generated temp password:", tempPassword);

      // Split name into first and last name
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Create user with the provided email
      console.log("🔍 Creating user in database...");
      const userResult = await pool.query(
        "INSERT INTO users (email, password, role, temp_password, first_name, last_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [email, "", "employee", tempPassword, firstName, lastName]
      );

      const userId = userResult.rows[0].id;
      console.log("✅ User created with ID:", userId);

      // Create initial employee form record with the employment type
      console.log("🔍 Creating initial employee form with type:", type);
      await pool.query(
        "INSERT INTO employee_forms (employee_id, type, status) VALUES ($1, $2, 'pending')",
        [userId, type]
      );
      console.log("✅ Initial employee form created with type");

      // Send onboarding email
      console.log("🔍 Sending onboarding email to:", email);
      const emailSent = await sendOnboardingEmail(email, tempPassword, type);

      if (!emailSent) {
        console.log("❌ Email sending failed, deleting user");
        // If email fails, delete the user and return error
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);
        return res
          .status(500)
          .json({ error: "Failed to send onboarding email" });
      }
      console.log("✅ Email sent successfully");

      res.status(201).json({
        message: "Employee added successfully",
        employee: {
          id: userId,
          email: email,
          name,
          type,
          doj,
          tempPassword,
        },
      });
    } catch (error) {
      console.error("Add employee error:", error);
      res.status(500).json({ error: "Failed to add employee" });
    }
  }
);

// Get all employees with comprehensive details
router.get("/employees", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.first_name,
        u.last_name,
        u.phone,
        u.address,
        u.emergency_contact_name,
        u.emergency_contact_phone,
        u.emergency_contact_relationship,
        u.emergency_contact_name2,
        u.emergency_contact_phone2,
        u.emergency_contact_relationship2,
        u.created_at, 
        ef.type, 
        ef.status as form_status,
        ef.submitted_at,
        ef.form_data,
        COALESCE(ef.status, 'no_form') as status,
        em.employee_id as assigned_employee_id,
        em.manager_id,
        em.manager_name as assigned_manager,
        em.manager2_id,
        em.manager2_name,
        em.manager3_id,
        em.manager3_name,
        em.department,
        em.designation,
        em.salary_band,
        em.location,
        COALESCE(ef.type, em.role, 'Not Assigned') as assigned_job_role
      FROM users u
      LEFT JOIN employee_forms ef ON u.id = ef.employee_id
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE u.role = 'employee' 
        AND ef.id IS NOT NULL
      ORDER BY u.created_at DESC
    `);

    res.json({ employees: result.rows });
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({ error: "Failed to get employees" });
  }
});

// Get all employee forms for management with comprehensive details
router.get("/employee-forms", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ef.id,
        ef.employee_id,
        ef.type as employee_type,
        ef.form_data,
        ef.files,
        ef.status,
        ef.submitted_at,
        ef.updated_at,
        ef.reviewed_by,
        ef.reviewed_at,
        ef.review_notes,
        u.email as user_email,
        u.first_name,
        u.last_name,
        u.phone,
        u.address,
        u.emergency_contact_name,
        u.emergency_contact_phone,
        u.emergency_contact_relationship,
        u.emergency_contact_name2,
        u.emergency_contact_phone2,
        u.emergency_contact_relationship2,
        u.created_at as user_created_at,
        em.employee_id as assigned_employee_id,
        em.manager_name as assigned_manager,
        em.department,
        em.designation,
        em.salary_band,
        em.location
      FROM employee_forms ef
      JOIN users u ON ef.employee_id = u.id
      LEFT JOIN employee_master em ON u.email = em.company_email
      ORDER BY ef.submitted_at DESC
    `);

    res.json({ forms: result.rows });
  } catch (error) {
    console.error("Get employee forms error:", error);
    res.status(500).json({ error: "Failed to get employee forms" });
  }
});

// Get approved employee forms for document collection (only employees with approved forms)
router.get("/approved-employee-forms", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ef.id,
        ef.employee_id,
        ef.type as employee_type,
        ef.form_data,
        ef.files,
        ef.status,
        ef.submitted_at,
        ef.updated_at,
        ef.reviewed_by,
        ef.reviewed_at,
        ef.review_notes,
        u.email as user_email,
        u.first_name,
        u.last_name,
        u.phone,
        u.address,
        u.emergency_contact_name,
        u.emergency_contact_phone,
        u.emergency_contact_relationship,
        u.emergency_contact_name2,
        u.emergency_contact_phone2,
        u.emergency_contact_relationship2,
        u.created_at as user_created_at,
        em.employee_id as assigned_employee_id,
        em.manager_name as assigned_manager,
        em.department,
        em.designation,
        em.salary_band,
        em.location
      FROM employee_forms ef
      JOIN users u ON ef.employee_id = u.id
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE ef.status = 'approved'
      ORDER BY ef.submitted_at DESC
    `);

    res.json({ forms: result.rows });
  } catch (error) {
    console.error("Get approved employee forms error:", error);
    res.status(500).json({ error: "Failed to get approved employee forms" });
  }
});

// Sync missing document collection records for existing employees and update status based on uploaded documents
router.post("/sync-document-collection", async (req, res) => {
  try {
    // Get all employees who have submitted forms but no document collection records
    const missingDocsResult = await pool.query(`
      SELECT 
        ef.employee_id,
        ef.form_data,
        u.first_name,
        u.last_name,
        u.email
      FROM employee_forms ef
      JOIN users u ON ef.employee_id = u.id
      WHERE ef.employee_id NOT IN (
        SELECT DISTINCT employee_id FROM document_collection
      )
    `);

    let createdCount = 0;

    for (const employee of missingDocsResult.rows) {
      const employeeName =
        `${employee.first_name} ${employee.last_name}`.trim();

      // Get employment type from form data
      const employmentType = employee.form_data.employmentType || "Intern";

      // Get required documents based on employment type
      const getRequiredDocumentsForType = (type) => {
        switch (type) {
          case "Intern":
            return [
              "Updated Resume",
              "SSC Certificate (10th)",
              "SSC Marksheet (10th)",
              "HSC Certificate (12th)",
              "HSC Marksheet (12th)",
              "Graduation Consolidated Marksheet",
              "Latest Graduation",
              "Aadhaar Card",
              "PAN Card",
            ];
          case "Full-Time":
          case "Manager":
            return [
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
              "Latest Graduation",
              "Aadhaar Card",
              "PAN Card",
              "Passport",
            ];
          case "Contract":
            return [
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
              "Latest Graduation",
              "Aadhaar Card",
              "PAN Card",
            ];
          default:
            return [
              "Updated Resume",
              "SSC Certificate (10th)",
              "SSC Marksheet (10th)",
              "HSC Certificate (12th)",
              "HSC Marksheet (12th)",
              "Graduation Consolidated Marksheet",
              "Latest Graduation",
              "Aadhaar Card",
              "PAN Card",
            ];
        }
      };

      const requiredDocuments = getRequiredDocumentsForType(employmentType);

      // Get document templates for required documents only
      const templatesResult = await pool.query(
        "SELECT document_name, document_type FROM document_templates WHERE is_active = true AND document_name = ANY($1)",
        [requiredDocuments]
      );

      // Calculate due date (30 days from join date)
      const joinDate = new Date(employee.form_data.doj);
      const dueDate = new Date(joinDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // Create document collection records for required documents only
      for (const template of templatesResult.rows) {
        await pool.query(
          `
          INSERT INTO document_collection (
            employee_id, employee_name, emp_id, department, join_date, due_date,
            document_name, document_type, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
          [
            employee.employee_id,
            employeeName,
            employee.employee_id, // Using user ID as emp_id for now
            employee.form_data.department || "N/A",
            employee.form_data.doj,
            dueDate.toISOString().split("T")[0],
            template.document_name,
            template.document_type,
            "Pending",
            "Document required for onboarding",
          ]
        );
        createdCount++;
      }
    }

    // Now update existing document collection records based on uploaded documents
    const updateResult = await pool.query(`
      UPDATE document_collection dc
      SET 
        status = CASE 
          WHEN EXISTS (
            SELECT 1 FROM employee_documents ed 
            WHERE ed.employee_id = dc.employee_id 
            AND (
              (ed.document_type = 'resume' AND dc.document_name LIKE '%Resume%')
              OR (ed.document_type = 'offer_letter' AND dc.document_name LIKE '%Offer%')
              OR (ed.document_type = 'compensation_letter' AND dc.document_name LIKE '%Compensation%')
              OR (ed.document_type = 'experience_letter' AND dc.document_name LIKE '%Experience%')
              OR (ed.document_type = 'payslip' AND dc.document_name LIKE '%Pay%')
              OR (ed.document_type = 'form16' AND dc.document_name LIKE '%Form 16%')
              OR (ed.document_type = 'ssc_certificate' AND dc.document_name LIKE '%SSC%Certificate%')
              OR (ed.document_type = 'ssc_marksheet' AND dc.document_name LIKE '%SSC%Marksheet%')
              OR (ed.document_type = 'hsc_certificate' AND dc.document_name LIKE '%HSC%Certificate%')
              OR (ed.document_type = 'hsc_marksheet' AND dc.document_name LIKE '%HSC%Marksheet%')
              OR (ed.document_type = 'graduation_marksheet' AND dc.document_name LIKE '%Graduation%Marksheet%')
              OR (ed.document_type = 'graduation_certificate' AND dc.document_name LIKE '%Graduation%Certificate%')
              OR (ed.document_type = 'postgrad_marksheet' AND dc.document_name LIKE '%Post-Graduation%Marksheet%')
              OR (ed.document_type = 'postgrad_certificate' AND dc.document_name LIKE '%Post-Graduation%Certificate%')
              OR (ed.document_type = 'aadhaar' AND dc.document_name LIKE '%Aadhaar%')
              OR (ed.document_type = 'pan' AND dc.document_name LIKE '%PAN%')
              OR (ed.document_type = 'passport' AND dc.document_name LIKE '%Passport%')
            )
          ) THEN 'Received'
          ELSE dc.status
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE dc.status = 'Pending'
      RETURNING id
    `);

    res.json({
      message: `Created ${createdCount} document collection records for ${missingDocsResult.rows.length} employees and updated ${updateResult.rows.length} existing records`,
      createdCount,
      employeeCount: missingDocsResult.rows.length,
      updatedCount: updateResult.rows.length,
    });
  } catch (error) {
    console.error("Sync document collection error:", error);
    res.status(500).json({ error: "Failed to sync document collection" });
  }
});

// Delete employee form
router.delete("/employee-forms/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if form exists
    const formExists = await pool.query(
      "SELECT id FROM employee_forms WHERE id = $1",
      [id]
    );

    if (formExists.rows.length === 0) {
      return res.status(404).json({ error: "Employee form not found" });
    }

    // Delete the form
    await pool.query("DELETE FROM employee_forms WHERE id = $1", [id]);

    res.json({ message: "Employee form deleted successfully" });
  } catch (error) {
    console.error("Delete employee form error:", error);
    res.status(500).json({ error: "Failed to delete employee form" });
  }
});

// Approve or reject employee form
router.put("/employee-forms/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!action || !["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Action must be 'approve' or 'reject'" });
    }

    // Get the employee form details (employee_forms uses employee_id -> users.id)
    const formResult = await pool.query(
      `SELECT ef.id,
              ef.employee_id,           -- FK to users.id
              ef.type as employee_type,
              ef.status as form_status,
              u.email as user_email
       FROM employee_forms ef
       JOIN users u ON ef.employee_id = u.id
       WHERE ef.id = $1`,
      [id]
    );

    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: "Employee form not found" });
    }

    const form = formResult.rows[0];

    if (action === "approve") {
      // Update form status to approved
      await pool.query(
        "UPDATE employee_forms SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      // Insert minimal required data into onboarded_employees for assignment step
      await pool.query(
        `INSERT INTO onboarded_employees (
           user_id, company_email, status, created_at
         ) VALUES ($1, $2, 'pending_assignment', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           company_email = EXCLUDED.company_email,
           status = 'pending_assignment',
           updated_at = CURRENT_TIMESTAMP`,
        [form.employee_id, form.user_email]
      );

      // Create document collection records for the approved employee
      await createDocumentCollectionForEmployee(
        form.employee_id,
        form.user_email,
        form.employee_type
      );

      res.json({
        message:
          "Employee form approved successfully. Employee moved to onboarded list and document collection created.",
        status: "approved",
      });
    } else if (action === "reject") {
      // Update form status to rejected
      await pool.query(
        "UPDATE employee_forms SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      res.json({
        message: "Employee form rejected successfully.",
        status: "rejected",
      });
    }
  } catch (error) {
    console.error("Form approval error:", error);
    res.status(500).json({ error: "Failed to process form approval" });
  }
});

// Get employee form details
router.get("/employees/:id/form", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT ef.*, u.email
      FROM employee_forms ef
      JOIN users u ON ef.employee_id = u.id
      WHERE ef.employee_id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee form not found" });
    }

    res.json({ form: result.rows[0] });
  } catch (error) {
    console.error("Get employee form error:", error);
    res.status(500).json({ error: "Failed to get employee form" });
  }
});

// Approve/reject employee form
router.put(
  "/employees/:id/approve",
  [
    body("status").isIn(["approved", "rejected"]),
    body("managerId")
      .optional()
      .custom((value) => {
        if (value !== undefined && value !== null && value !== "") {
          return value;
        }
        return undefined; // Convert empty string to undefined
      }),
    body("employeeId").optional(),
    body("companyEmail").optional(),
  ],
  async (req, res) => {
    try {
      console.log("🔍 Received approval request:", {
        body: req.body,
        params: req.params,
        status: req.body.status,
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status, managerId, employeeId, companyEmail } = req.body;

      // Manual validation for approved status
      let finalEmployeeId, finalCompanyEmail;

      if (status === "approved") {
        console.log("🔍 Validating approval data:", {
          employeeId,
          companyEmail,
        });

        // Use fallback values if not provided
        finalEmployeeId = employeeId || `EMP${id}`;
        finalCompanyEmail = companyEmail || `employee${id}@company.com`;

        console.log("🔍 Using fallback values:", {
          finalEmployeeId,
          finalCompanyEmail,
        });
      }

      // Update form status
      await pool.query(
        "UPDATE employee_forms SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2",
        [status, id]
      );

      if (status === "approved") {
        // Get employee details
        console.log("🔍 Querying employee details for ID:", id);

        // First check if user exists
        const userResult = await pool.query(
          "SELECT id, email FROM users WHERE id = $1",
          [id]
        );

        if (userResult.rows.length === 0) {
          console.log("❌ No user found with ID:", id);
          return res.status(404).json({ error: "User not found" });
        }

        const user = userResult.rows[0];
        console.log("🔍 User found:", user);

        // Then check if employee form exists
        const formResult = await pool.query(
          "SELECT type, form_data FROM employee_forms WHERE employee_id = $1",
          [id]
        );

        if (formResult.rows.length === 0) {
          console.log("❌ No employee form found for user ID:", id);
          return res.status(404).json({ error: "Employee form not found" });
        }

        const form = formResult.rows[0];
        console.log("🔍 Form found:", form);

        const formData = form.form_data || {};

        console.log("🔍 Form data:", formData);

        // Validate form_data structure
        if (!formData || typeof formData !== "object") {
          console.error("Invalid form_data structure:", formData);
          return res.status(400).json({ error: "Invalid form data structure" });
        }

        // Get employment type from employee_master table (HR assigned type)
        let employmentType = form.type;
        if (
          !employmentType ||
          employmentType === null ||
          employmentType === ""
        ) {
          // Try to get type from employee_master table first
          const masterResult = await pool.query(
            "SELECT type FROM employee_master WHERE company_email = $1",
            [user.email]
          );

          if (masterResult.rows.length > 0 && masterResult.rows[0].type) {
            employmentType = masterResult.rows[0].type;
            console.log(
              `✅ Using HR assigned type from master table: ${employmentType}`
            );
          } else {
            // Fallback to automatic detection if not in master table
            const employeeName =
              formData.name || `${user.first_name} ${user.last_name}`;

            // Determine type based on form data or employee name
            if (
              employeeName.toLowerCase().includes("intern") ||
              employeeName.toLowerCase().includes("pradeep") ||
              formData.education?.toLowerCase().includes("student") ||
              formData.experience === "" ||
              formData.experience === null
            ) {
              employmentType = "Intern";
            } else if (
              employeeName.toLowerCase().includes("contract") ||
              formData.doj?.includes("contract")
            ) {
              employmentType = "Contract";
            } else if (
              employeeName.toLowerCase().includes("manager") ||
              employeeName.toLowerCase().includes("lead")
            ) {
              employmentType = "Manager";
            } else {
              employmentType = "Full-Time"; // Default type
            }

            console.log(`✅ Auto-detected employment type: ${employmentType}`);
          }

          // Update the form with the determined type
          await pool.query(
            "UPDATE employee_forms SET type = $1 WHERE employee_id = $2",
            [employmentType, id]
          );

          console.log(`✅ Updated employee form type to: ${employmentType}`);
        }

        // Check if employee is already onboarded
        const existingOnboarded = await pool.query(
          "SELECT id FROM onboarded_employees WHERE user_id = $1",
          [id]
        );

        if (existingOnboarded.rows.length > 0) {
          console.log("⚠️  Employee already onboarded");
          return res.status(400).json({ error: "Employee already onboarded" });
        }

        // Move employee to onboarded_employees table (pending assignment)
        await pool.query(
          `
        INSERT INTO onboarded_employees (user_id, status, notes, employee_type)
        VALUES ($1, $2, $3, $4)
      `,
          [
            id,
            "pending_assignment",
            `Approved on ${new Date().toISOString()}. Awaiting HR assignment of employee ID, company email, and manager.`,
            employmentType,
          ]
        );

        console.log("✅ Employee moved to onboarded_employees table");

        // Create document collection records for the approved employee
        try {
          await createDocumentCollectionForEmployee(
            id,
            user.email,
            employmentType
          );
          console.log(
            "✅ Document collection records created for approved employee"
          );
        } catch (docError) {
          console.error(
            "❌ Error creating document collection records:",
            docError
          );
          // Don't fail the approval if document creation fails
        }

        res.json({
          message:
            "Employee approved and moved to onboarding queue. HR needs to assign employee ID, company email, and manager.",
          nextStep: "assign_details",
        });
      } else {
        res.json({ message: "Employee form rejected" });
      }
    } catch (error) {
      console.error("Approve employee error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        params: { id, status, managerId, employeeId, companyEmail },
      });
      res.status(500).json({ error: "Failed to approve employee" });
    }
  }
);

// Get employee master table
router.get("/master", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        em.*,
        CASE 
          WHEN m.manager_name IS NOT NULL THEN m.manager_name
          WHEN em.manager_name IS NOT NULL AND em.manager_name != '' THEN em.manager_name
          ELSE 'Not Assigned'
        END as display_manager_name
      FROM employee_master em
      LEFT JOIN managers m ON em.manager_id = m.manager_id
      ORDER BY em.created_at DESC
    `);

    res.json({ employees: result.rows });
  } catch (error) {
    console.error("Get master table error:", error);
    res.status(500).json({ error: "Failed to get master table" });
  }
});

// Download employee master data as Excel
router.get("/master/export", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        em.employee_id,
        em.employee_name,
        em.company_email,
        em.type,
        em.doj,
        em.status,
        em.department,
        em.designation,
        em.salary_band,
        em.location,
        em.manager_name,
        em.manager2_name,
        em.manager3_name,
        em.created_at,
        em.updated_at
      FROM employee_master em
      ORDER BY em.created_at DESC
    `);

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(result.rows);

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // employee_id
      { wch: 20 }, // employee_name
      { wch: 25 }, // company_email
      { wch: 12 }, // type
      { wch: 12 }, // doj
      { wch: 10 }, // status
      { wch: 15 }, // department
      { wch: 15 }, // designation
      { wch: 12 }, // salary_band
      { wch: 15 }, // location
      { wch: 20 }, // manager_name
      { wch: 20 }, // manager2_name
      { wch: 20 }, // manager3_name
      { wch: 20 }, // created_at
      { wch: 20 }, // updated_at
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Master");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Set response headers
    const filename = `employee_master_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", excelBuffer.length);

    res.send(excelBuffer);
  } catch (error) {
    console.error("Export employee master error:", error);
    res.status(500).json({ error: "Failed to export employee master data" });
  }
});

// Upload Excel file and bulk import employees
router.post("/master/import", upload.single("excelFile"), async (req, res) => {
  const client = await pool.connect();
  try {
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
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse file based on type
    let jsonData;
    const fileName = req.file.originalname.toLowerCase();

    if (fileName.endsWith(".csv")) {
      // Parse CSV file
      const csvString = req.file.buffer.toString("utf8");
      const workbook = XLSX.read(csvString, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      jsonData = XLSX.utils.sheet_to_json(worksheet);
    } else {
      // Parse Excel file with proper date handling
      const workbook = XLSX.read(req.file.buffer, {
        type: "buffer",
        cellDates: true, // This is crucial for proper date parsing
        cellNF: false,
        cellText: false,
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false, // This ensures dates are converted to Date objects
        dateNF: "yyyy-mm-dd", // Format for date output
      });
    }

    if (jsonData.length === 0) {
      return res.status(400).json({ error: "File is empty or has no data" });
    }

    // Validate required columns with flexible mapping
    const requiredColumns = ["employee_name", "company_email", "type", "doj"];
    const firstRow = jsonData[0];
    const foundColumns = Object.keys(firstRow);

    console.log("🔍 Found columns in Excel:", foundColumns);
    console.log("🔍 First row data:", firstRow);

    // Create column mapping for common variations
    const columnMapping = {
      employee_name: [
        "employee_name",
        "employee_",
        "name",
        "employee_name",
        "employee",
      ],
      company_email: [
        "company_email",
        "company_type",
        "email",
        "company_email",
        "email_address",
      ],
      type: [
        "type",
        "employment_type",
        "employee_type",
        "emp_type",
        "category",
        "emp_type",
      ],
      doj: [
        "doj",
        "date_of_joining",
        "joining_date",
        "start_date",
        "hire_date",
      ],
    };

    // Check if we can map the found columns to required columns
    const mappedColumns = {};
    const missingColumns = [];

    for (const requiredCol of requiredColumns) {
      const possibleNames = columnMapping[requiredCol];
      const foundCol = foundColumns.find((col) =>
        possibleNames.some(
          (name) =>
            col.toLowerCase().replace(/[^a-z0-9]/g, "") ===
            name.toLowerCase().replace(/[^a-z0-9]/g, "")
        )
      );

      if (foundCol) {
        mappedColumns[requiredCol] = foundCol;
      } else {
        missingColumns.push(requiredCol);
      }
    }

    if (missingColumns.length > 0) {
      return res.status(400).json({
        error: `Missing required columns: ${missingColumns.join(", ")}`,
        requiredColumns: requiredColumns,
        foundColumns: foundColumns,
        suggestions: {
          employee_name: "Look for: employee_name, employee_, name, employee",
          company_email:
            "Look for: company_email, company_type, email, email_address",
          type: "Look for: type, employment_type, employee_type, emp_type, category",
          doj: "Look for: doj, date_of_joining, joining_date, start_date, hire_date",
        },
      });
    }

    console.log("✅ Column mapping successful:", mappedColumns);

    const results = {
      total: jsonData.length,
      success: 0,
      errors: [],
      created: [],
      skipped: [],
    };

    await client.query("BEGIN");

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // Excel row number (accounting for header)

      try {
        // Map the data using the column mapping
        const mappedData = {
          employee_name: row[mappedColumns.employee_name],
          company_email: row[mappedColumns.company_email],
          type: row[mappedColumns.type],
          doj: row[mappedColumns.doj],
          employee_id:
            row.employee_id ||
            row.employee_id ||
            row.employeeid ||
            row.employee_id,
          manager_name: row.manager_name || row.managers || row.manager,
          status: row.status || "active",
          department: row.department || null,
          designation: row.designation || null,
          salary_band: row.salary_band || row.salaryband || null,
          location: row.location || null,
        };

        // Validate required fields
        if (
          !mappedData.employee_name ||
          !mappedData.company_email ||
          !mappedData.type ||
          !mappedData.doj
        ) {
          results.errors.push({
            row: rowNumber,
            error: "Missing required fields",
            data: mappedData,
            originalData: row,
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mappedData.company_email)) {
          results.errors.push({
            row: rowNumber,
            error: "Invalid email format",
            data: mappedData,
            originalData: row,
          });
          continue;
        }

        // Validate employment type (case-insensitive) - matching SQL procedure logic
        const validTypes = ["Intern", "Contract", "Full-Time", "Manager"];
        const normalizedType = mappedData.type.trim();

        // Type normalization matching your SQL procedure
        const typeNormalization = {
          "full time": "Full-Time",
          intern: "Intern",
          contract: "Contract",
          manager: "Manager",
        };

        let matchedType = typeNormalization[normalizedType.toLowerCase()];

        if (!matchedType) {
          // Fallback to original logic for other variations
          matchedType = validTypes.find(
            (type) =>
              type.toLowerCase() === normalizedType.toLowerCase() ||
              type.toLowerCase().replace(/\s+/g, "") ===
                normalizedType.toLowerCase().replace(/\s+/g, "")
          );
        }

        if (!matchedType) {
          results.errors.push({
            row: rowNumber,
            error: `Invalid type "${
              mappedData.type
            }". Must be one of: ${validTypes.join(", ")}`,
            data: mappedData,
            originalData: row,
          });
          continue;
        }

        // Use the matched type (properly formatted)
        mappedData.type = matchedType;

        // Validate and parse date with enhanced format support
        let dojDate;
        const dateValue = mappedData.doj;

        debugDate(dateValue, `Row ${rowNumber} - Original date value`);

        // Enhanced date parsing for various formats
        if (dateValue instanceof Date) {
          // Excel date was properly parsed as Date object
          dojDate = dateValue;
          console.log(`✅ Date object detected: ${dojDate.toISOString()}`);
        } else if (typeof dateValue === "string") {
          // Handle MM/DD/YY format (like "1/6/25")
          if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateValue)) {
            const [month, day, year] = dateValue.split("/");
            // Convert 2-digit year to 4-digit (assuming 20xx for years < 50, 19xx for years >= 50)
            const fullYear =
              parseInt(year) < 50
                ? 2000 + parseInt(year)
                : 1900 + parseInt(year);
            // Create date in local timezone to avoid timezone issues
            dojDate = new Date(
              fullYear,
              parseInt(month) - 1,
              parseInt(day),
              12,
              0,
              0
            );
          }
          // Handle YYYY-MM-DD format
          else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateValue)) {
            const [year, month, day] = dateValue.split("-");
            // Create date in local timezone to avoid timezone issues
            dojDate = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
              12,
              0,
              0
            );
          }
          // Handle other string formats
          else {
            dojDate = new Date(dateValue);
          }
        } else if (typeof dateValue === "number") {
          // Handle Excel serial number (days since 1900-01-01)
          // Excel uses 1900-01-01 as day 1, but incorrectly treats 1900 as a leap year
          const excelEpoch = new Date(1900, 0, 1);
          const daysSinceEpoch = dateValue - 2; // Subtract 2 to account for Excel's leap year bug
          dojDate = new Date(
            excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000
          );
          console.log(
            `✅ Excel serial number converted: ${dateValue} -> ${dojDate.toISOString()}`
          );
        } else {
          dojDate = new Date(dateValue);
        }

        if (isNaN(dojDate.getTime())) {
          results.errors.push({
            row: rowNumber,
            error: `Invalid date format for DOJ: "${dateValue}". Expected formats: MM/DD/YY, YYYY-MM-DD, or standard date format`,
            data: mappedData,
            originalData: row,
          });
          continue;
        }

        // Format the date for display (avoiding timezone issues)
        const year = dojDate.getFullYear();
        const month = String(dojDate.getMonth() + 1).padStart(2, "0");
        const day = String(dojDate.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;

        console.log(
          `🔍 Date parsing: "${dateValue}" -> ${formattedDate} (${dojDate.toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            }
          )})`
        );

        // Check if employee already exists
        const existingEmployee = await client.query(
          "SELECT id FROM employee_master WHERE company_email = $1 OR employee_id = $2",
          [mappedData.company_email, mappedData.employee_id || ""]
        );

        if (existingEmployee.rows.length > 0) {
          results.skipped.push({
            row: rowNumber,
            reason: "Employee already exists",
            data: mappedData,
            originalData: row,
          });
          continue;
        }

        // Generate employee ID if not provided
        let employeeId = mappedData.employee_id;
        if (!employeeId) {
          employeeId = await generateEmployeeId();
        }

        // Get manager information if provided
        let managerId = null;
        let managerName = null;
        if (mappedData.manager_name) {
          const managerResult = await client.query(
            "SELECT manager_id, manager_name FROM managers WHERE manager_name ILIKE $1 AND status = 'active'",
            [mappedData.manager_name]
          );
          if (managerResult.rows.length > 0) {
            managerId = managerResult.rows[0].manager_id;
            managerName = managerResult.rows[0].manager_name;
          }
        }

        // Insert employee into master table
        await client.query(
          `INSERT INTO employee_master (
            employee_id, employee_name, company_email, type, doj, status,
            department, designation, salary_band, location,
            manager_id, manager_name, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            employeeId,
            mappedData.employee_name,
            mappedData.company_email,
            mappedData.type,
            dojDate,
            mappedData.status || "active",
            mappedData.department || null,
            mappedData.designation || null,
            mappedData.salary_band || null,
            mappedData.location || null,
            managerId,
            managerName,
          ]
        );

        // Create user account if it doesn't exist
        const userExists = await client.query(
          "SELECT id FROM users WHERE email = $1",
          [mappedData.company_email]
        );

        if (userExists.rows.length === 0) {
          const tempPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          await client.query(
            `INSERT INTO users (email, password, role, first_name, last_name, temp_password, created_at, updated_at) 
             VALUES ($1, $2, 'employee', $3, 'Employee', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              mappedData.company_email,
              hashedPassword,
              mappedData.employee_name,
              tempPassword,
            ]
          );

          // Initialize leave balance
          const currentYear = new Date().getFullYear();
          const userId = (
            await client.query("SELECT id FROM users WHERE email = $1", [
              mappedData.company_email,
            ])
          ).rows[0].id;

          await client.query(
            `INSERT INTO leave_balances (employee_id, year, total_allocated, leaves_taken, leaves_remaining) 
             VALUES ($1, $2, 27, 0, 27)`,
            [userId, currentYear]
          );
        }

        results.success++;
        results.created.push({
          row: rowNumber,
          employee_id: employeeId,
          employee_name: mappedData.employee_name,
          company_email: mappedData.company_email,
          type: mappedData.type,
          originalData: row,
        });
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          error: error.message,
          data: mappedData,
          originalData: row,
        });
      }
    }

    await client.query("COMMIT");

    res.json({
      message: "Excel import completed",
      results: results,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Excel import error:", error);
    res.status(500).json({
      error: "Failed to import file",
      details: error.message,
    });
  } finally {
    client.release();
  }
});

// Download employee master data as CSV
router.get("/master/export-csv", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        em.employee_id,
        em.employee_name,
        em.company_email,
        em.type,
        em.doj,
        em.status,
        em.department,
        em.designation,
        em.salary_band,
        em.location,
        em.manager_name,
        em.manager2_name,
        em.manager3_name,
        em.created_at,
        em.updated_at
      FROM employee_master em
      ORDER BY em.created_at DESC
    `);

    // Create CSV content
    const headers = [
      "employee_id",
      "employee_name",
      "company_email",
      "type",
      "doj",
      "status",
      "department",
      "designation",
      "salary_band",
      "location",
      "manager_name",
      "manager2_name",
      "manager3_name",
      "created_at",
      "updated_at",
    ];

    const csvRows = [
      headers.join(","),
      ...result.rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (value === null || value === undefined) return "";
            const stringValue = String(value);
            if (
              stringValue.includes(",") ||
              stringValue.includes('"') ||
              stringValue.includes("\n")
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");

    // Set response headers
    const filename = `employee_master_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", Buffer.byteLength(csvContent, "utf8"));

    res.send(csvContent);
  } catch (error) {
    console.error("Export employee master CSV error:", error);
    res
      .status(500)
      .json({ error: "Failed to export employee master data as CSV" });
  }
});

// Delete employee from master table
router.delete("/master/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Find master row and user by company email
    const masterRow = await client.query(
      "SELECT id, company_email FROM employee_master WHERE id = $1",
      [id]
    );
    if (masterRow.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found in master" });
    }

    const companyEmail = masterRow.rows[0].company_email;

    const userRow = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [companyEmail]
    );
    const userId = userRow.rows[0]?.id;

    await client.query("BEGIN");

    // Delete dependent data first
    if (userId) {
      await client.query("DELETE FROM attendance WHERE employee_id = $1", [
        userId,
      ]);
      await client.query("DELETE FROM leave_requests WHERE employee_id = $1", [
        userId,
      ]);
      await client.query("DELETE FROM leave_balances WHERE employee_id = $1", [
        userId,
      ]);
      await client.query(
        "DELETE FROM comp_off_balances WHERE employee_id = $1",
        [userId]
      );
      await client.query(
        "DELETE FROM employee_documents WHERE employee_id = $1",
        [userId]
      );
      await client.query(
        "DELETE FROM document_collection WHERE employee_id = $1",
        [userId]
      );
      await client.query("DELETE FROM expenses WHERE employee_id = $1", [
        userId,
      ]);
      await client.query("DELETE FROM company_emails WHERE user_id = $1", [
        userId,
      ]);

      // Delete manager mappings where this user is an employee
      await client.query(
        "DELETE FROM manager_employee_mapping WHERE employee_id = $1",
        [userId]
      );

      // Delete manager mappings where this user is a manager
      await client.query(
        "DELETE FROM manager_employee_mapping WHERE manager_id = $1",
        [userId]
      );

      await client.query("DELETE FROM employee_forms WHERE employee_id = $1", [
        userId,
      ]);
      await client.query("DELETE FROM onboarded_employees WHERE user_id = $1", [
        userId,
      ]);
    }

    // Delete from master
    await client.query("DELETE FROM employee_master WHERE id = $1", [id]);

    // Finally delete user to free up email for re-adding
    if (userId) {
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
    }

    await client.query("COMMIT");
    res.json({ message: "Employee and related data deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete master employee error:", error);
    res
      .status(500)
      .json({ error: "Failed to delete employee and related data" });
  } finally {
    client.release();
  }
});

// Get onboarded employees (pending assignment) with comprehensive details
router.get("/onboarded", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        oe.id,
        oe.user_id,
        oe.employee_id,
        oe.company_email,
        oe.manager_id,
        oe.manager_name,
        oe.status,
        oe.notes,
        oe.assigned_by,
        oe.assigned_at,
        oe.created_at,
        oe.updated_at,
        u.email as user_email,
        u.first_name,
        u.last_name,
        u.phone,
        u.address,
        u.emergency_contact_name,
        u.emergency_contact_phone,
        u.emergency_contact_relationship,
        u.emergency_contact_name2,
        u.emergency_contact_phone2,
        u.emergency_contact_relationship2,
        ef.type as employee_type,
        ef.form_data,
        ef.submitted_at,
        ef.reviewed_by,
        ef.reviewed_at,
        ef.review_notes
      FROM onboarded_employees oe
      JOIN users u ON oe.user_id = u.id
      JOIN employee_forms ef ON oe.user_id = ef.employee_id
      ORDER BY oe.created_at DESC
    `);

    res.json({ onboardedEmployees: result.rows });
  } catch (error) {
    console.error("Get onboarded employees error:", error);
    res.status(500).json({ error: "Failed to get onboarded employees" });
  }
});

// Delete onboarded employee (cleanup staged record)
router.delete("/onboarded/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure the record exists
    const exists = await pool.query(
      "SELECT id FROM onboarded_employees WHERE id = $1",
      [id]
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: "Onboarded employee not found" });
    }

    // Safe delete: only allow delete if not yet in master table
    // Find the user id to check master linkage (if any)
    const details = await pool.query(
      "SELECT user_id, company_email FROM onboarded_employees WHERE id = $1",
      [id]
    );
    const userId = details.rows[0].user_id;
    const companyEmail = details.rows[0].company_email;

    if (companyEmail) {
      const inMaster = await pool.query(
        "SELECT id FROM employee_master WHERE company_email = $1",
        [companyEmail]
      );
      if (inMaster.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Cannot delete: employee already moved to master" });
      }
    }

    await pool.query("DELETE FROM onboarded_employees WHERE id = $1", [id]);

    res.json({ message: "Onboarded employee deleted" });
  } catch (error) {
    console.error("Delete onboarded employee error:", error);
    res.status(500).json({ error: "Failed to delete onboarded employee" });
  }
});

// Assign details to onboarded employee and move to master table
router.put(
  "/onboarded/:id/assign",
  [
    body("name").notEmpty().withMessage("Employee name is required"),
    body("companyEmail")
      .isEmail()
      .withMessage("Valid company email is required"),
    body("manager").notEmpty().withMessage("Manager 1 is required"),
    body("manager2").optional(),
    body("manager3").optional(),
  ],
  async (req, res) => {
    try {
      console.log("🔍 Assignment request body:", req.body);
      console.log("🔍 Assignment request params:", req.params);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("🔍 Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, companyEmail, manager, manager2, manager3 } = req.body;

      console.log("🔍 Assigning details to onboarded employee:", {
        id,
        name,
        companyEmail,
        manager,
      });

      // Validate that managers are not the same as the employee being assigned
      const employeeEmailsToCheck = [companyEmail];
      const managersToCheck = [manager, manager2, manager3].filter(Boolean);

      for (const managerName of managersToCheck) {
        // Get manager email from managers table
        const managerResult = await pool.query(
          "SELECT email FROM managers WHERE manager_name = $1",
          [managerName]
        );

        if (managerResult.rows.length > 0) {
          const managerEmail = managerResult.rows[0].email;

          // Check if manager email matches employee email
          if (employeeEmailsToCheck.includes(managerEmail)) {
            return res.status(400).json({
              error: `Employee cannot be assigned as their own manager. Manager "${managerName}" has the same email as the employee.`,
            });
          }
        }
      }

      // Get onboarded employee details
      const onboardedResult = await pool.query(
        `
      SELECT 
        oe.user_id,
        oe.status,
        oe.employee_type,
        u.email as user_email,
        ef.type as form_employee_type,
        ef.form_data
      FROM onboarded_employees oe
      JOIN users u ON oe.user_id = u.id
      LEFT JOIN employee_forms ef ON oe.user_id = ef.employee_id
      WHERE oe.id = $1
    `,
        [id]
      );

      if (onboardedResult.rows.length === 0) {
        return res.status(404).json({ error: "Onboarded employee not found" });
      }

      const onboarded = onboardedResult.rows[0];
      const formData = onboarded.form_data || {};

      // Determine employment type - prioritize onboarded.employee_type, then form_employee_type, then default to Full-Time
      let employmentType =
        onboarded.employee_type || onboarded.form_employee_type || "Full-Time";
      console.log(
        `🔍 Employment type for assignment: ${employmentType} (onboarded: ${onboarded.employee_type}, form: ${onboarded.form_employee_type})`
      );

      // Check if company email already exists in master table
      const existingMaster = await pool.query(
        "SELECT id FROM employee_master WHERE company_email = $1",
        [companyEmail]
      );

      if (existingMaster.rows.length > 0) {
        return res.status(400).json({
          error: "Company email already exists in master table",
        });
      }

      // Get manager details from managers table and get the user ID
      const managerResult = await pool.query(
        `SELECT m.manager_id, m.manager_name, u.id as user_id 
         FROM managers m 
         LEFT JOIN users u ON m.email = u.email 
         WHERE m.manager_name ILIKE $1 AND m.status = 'active'`,
        [manager]
      );

      if (managerResult.rows.length === 0) {
        return res.status(400).json({
          error: "Manager not found or inactive",
        });
      }

      const managerInfo = managerResult.rows[0];

      if (!managerInfo.user_id) {
        return res.status(400).json({
          error: "Manager does not have a user account",
        });
      }

      // Generate unique 6-digit employee ID
      const employeeId = await generateEmployeeId();
      console.log("🔢 Generated Employee ID:", employeeId);

      // Update the user's email to the company email (keep same password)
      await pool.query(
        "UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [companyEmail, onboarded.user_id]
      );

      // Update onboarded employee with assigned details
      await pool.query(
        `
        UPDATE onboarded_employees 
        SET 
          company_email = $1,
          manager_id = $2,
          manager_name = $3,
          status = 'assigned',
          notes = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `,
        [
          companyEmail,
          managerInfo.manager_id,
          managerInfo.manager_name,
          `Assigned to manager: ${managerInfo.manager_name}`,
          id,
        ]
      );

      // Get manager information for manager2 and manager3 if provided
      let manager2Info = null;
      let manager3Info = null;

      if (manager2) {
        const manager2Result = await pool.query(
          `SELECT m.manager_id, m.manager_name, u.id as user_id 
           FROM managers m 
           LEFT JOIN users u ON m.email = u.email 
           WHERE m.manager_id = $1`,
          [manager2]
        );
        if (manager2Result.rows.length > 0) {
          manager2Info = manager2Result.rows[0];
        }
      }

      if (manager3) {
        const manager3Result = await pool.query(
          `SELECT m.manager_id, m.manager_name, u.id as user_id 
           FROM managers m 
           LEFT JOIN users u ON m.email = u.email 
           WHERE m.manager_id = $1`,
          [manager3]
        );
        if (manager3Result.rows.length > 0) {
          manager3Info = manager3Result.rows[0];
        }
      }

      // Add to employee master table with multiple managers
      await pool.query(
        `
        INSERT INTO employee_master (
          employee_id, employee_name, company_email, 
          manager_id, manager_name, 
          manager2_id, manager2_name, 
          manager3_id, manager3_name, 
          type, doj
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          employeeId,
          name,
          companyEmail,
          managerInfo.manager_id, // Manager 1 ID
          managerInfo.manager_name, // Manager 1 name
          manager2Info?.manager_id || null, // Manager 2 ID
          manager2Info?.manager_name || null, // Manager 2 name
          manager3Info?.manager_id || null, // Manager 3 ID
          manager3Info?.manager_name || null, // Manager 3 name
          employmentType,
          formData.doj || new Date(),
        ]
      );

      console.log("✅ Employee moved to master table successfully");

      // Create manager-employee mapping entries for all assigned managers
      const mappingPromises = [];

      // Primary manager mapping
      mappingPromises.push(
        pool.query(
          `INSERT INTO manager_employee_mapping (manager_id, employee_id, mapping_type, is_active)
           VALUES ($1, $2, 'primary', true)
           ON CONFLICT (manager_id, employee_id, mapping_type) 
           DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP`,
          [managerInfo.user_id, onboarded.user_id]
        )
      );

      // Secondary manager mapping (if assigned)
      if (manager2Info?.user_id) {
        mappingPromises.push(
          pool.query(
            `INSERT INTO manager_employee_mapping (manager_id, employee_id, mapping_type, is_active)
             VALUES ($1, $2, 'secondary', true)
             ON CONFLICT (manager_id, employee_id, mapping_type) 
             DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP`,
            [manager2Info.user_id, onboarded.user_id]
          )
        );
      }

      // Tertiary manager mapping (if assigned)
      if (manager3Info?.user_id) {
        mappingPromises.push(
          pool.query(
            `INSERT INTO manager_employee_mapping (manager_id, employee_id, mapping_type, is_active)
             VALUES ($1, $2, 'tertiary', true)
             ON CONFLICT (manager_id, employee_id, mapping_type) 
             DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP`,
            [manager3Info.user_id, onboarded.user_id]
          )
        );
      }

      // Execute all mapping insertions
      await Promise.all(mappingPromises);
      console.log("✅ Manager-employee mappings created successfully");

      res.json({
        message:
          "Employee details assigned and moved to master table successfully",
        employee: {
          employeeId: employeeId,
          companyEmail,
          name: name,
          manager: manager,
        },
      });
    } catch (error) {
      console.error("❌ Assign employee details error:", error);

      // Provide specific error messages for common issues
      let errorMessage = "Failed to assign employee details";
      if (error.code === "23505") {
        if (error.detail && error.detail.includes("company_email")) {
          errorMessage = "Company email already exists in master table";
        } else if (error.detail && error.detail.includes("employee_id")) {
          errorMessage = "Employee ID already exists in master table";
        } else if (error.detail && error.detail.includes("name")) {
          errorMessage = "Employee name and email combination already exists";
        } else {
          errorMessage = "Duplicate entry detected - please check all fields";
        }
      } else if (error.code === "23503") {
        errorMessage = "Invalid manager reference";
      }

      res.status(500).json({
        error: errorMessage,
        details: error.message,
        code: error.code || "UNKNOWN_ERROR",
      });
    }
  }
);

// Debug endpoint to check database state
router.get("/debug/employees", async (req, res) => {
  try {
    console.log("🔍 Debug: Checking database state...");

    // Check users table
    const usersResult = await pool.query(
      "SELECT id, email, role FROM users ORDER BY id"
    );
    console.log("🔍 Users:", usersResult.rows);

    // Check employee_forms table
    const formsResult = await pool.query(
      "SELECT employee_id, status, type, form_data FROM employee_forms ORDER BY employee_id"
    );
    console.log("🔍 Employee Forms:", formsResult.rows);

    // Check employee_master table
    const masterResult = await pool.query(`
      SELECT 
        em.*,
        COALESCE(m.manager_name, em.manager_name, em.manager_id) as display_manager_name
      FROM employee_master em
      LEFT JOIN managers m ON em.manager_id = m.manager_id
      ORDER BY em.id
    `);
    console.log("🔍 Employee Master:", masterResult.rows);

    res.json({
      users: usersResult.rows,
      forms: formsResult.rows,
      master: masterResult.rows,
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: "Debug failed" });
  }
});

// Manually add employee to master table
router.post(
  "/master",
  [
    body("employeeName").notEmpty(),
    body("companyEmail").isEmail(),
    body("type").isIn(["Intern", "Contract", "Full-Time", "Manager"]),
    body("doj").isISO8601().toDate(),
    body("managerId").optional(),
    body("manager2Id").optional(),
    body("manager3Id").optional(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        employeeName,
        companyEmail,
        type,
        doj,
        managerId,
        manager2Id,
        manager3Id,
      } = req.body;

      // Generate unique 6-digit employee ID
      const employeeId = await generateEmployeeId();
      console.log("🔢 Generated Employee ID for manual add:", employeeId);

      // Check if employee ID already exists (should not happen with generated ID)
      const existing = await pool.query(
        "SELECT id FROM employee_master WHERE employee_id = $1",
        [employeeId]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: "Employee ID already exists" });
      }

      // Get manager information for manager2 and manager3 if provided
      let manager2Name = null;
      let manager3Name = null;

      if (manager2Id) {
        const manager2Result = await pool.query(
          "SELECT manager_name FROM managers WHERE manager_id = $1",
          [manager2Id]
        );
        if (manager2Result.rows.length > 0) {
          manager2Name = manager2Result.rows[0].manager_name;
        }
      }

      if (manager3Id) {
        const manager3Result = await pool.query(
          "SELECT manager_name FROM managers WHERE manager_id = $1",
          [manager3Id]
        );
        if (manager3Result.rows.length > 0) {
          manager3Name = manager3Result.rows[0].manager_name;
        }
      }

      // Add to master table with multiple managers
      await pool.query(
        `
      INSERT INTO employee_master (
        employee_id, employee_name, company_email, 
        manager_id, manager2_id, manager2_name, 
        manager3_id, manager3_name, 
        type, doj
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
        [
          employeeId,
          employeeName,
          companyEmail,
          managerId,
          manager2Id,
          manager2Name,
          manager3Id,
          manager3Name,
          type,
          doj,
        ]
      );

      // Synchronize with other database tables
      console.log("🔄 Synchronizing new employee with database tables...");

      // 1. Create user account if it doesn't exist
      const userExistsResult = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [companyEmail]
      );

      if (userExistsResult.rows.length === 0) {
        // Create new user account
        const bcrypt = require("bcryptjs");
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        await pool.query(
          `INSERT INTO users (email, password, role, first_name, last_name, temp_password, created_at, updated_at) 
           VALUES ($1, $2, 'employee', $3, 'Employee', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [companyEmail, hashedPassword, employeeName, tempPassword]
        );
        console.log(
          `✅ Created new user account: ${companyEmail} with temp password: ${tempPassword}`
        );
      } else {
        console.log(`✅ User account already exists: ${companyEmail}`);
      }

      // 2. Add to company_emails table if not exists
      const companyEmailExists = await pool.query(
        "SELECT id FROM company_emails WHERE company_email = $1",
        [companyEmail]
      );

      if (companyEmailExists.rows.length === 0) {
        const userId =
          userExistsResult.rows[0]?.id ||
          (
            await pool.query("SELECT id FROM users WHERE email = $1", [
              companyEmail,
            ])
          ).rows[0].id;
        await pool.query(
          "INSERT INTO company_emails (user_id, company_email, is_primary, is_active) VALUES ($1, $2, $3, $4)",
          [userId, companyEmail, true, true]
        );
        console.log(`✅ Added to company_emails table: ${companyEmail}`);
      } else {
        console.log(`✅ Company email already exists: ${companyEmail}`);
      }

      console.log("✅ Employee Master synchronization completed successfully");

      // Create manager-employee mapping entries for all assigned managers
      const mappingPromises = [];
      const userId =
        userExistsResult.rows[0]?.id ||
        (
          await pool.query("SELECT id FROM users WHERE email = $1", [
            companyEmail,
          ])
        ).rows[0].id;

      // Get manager user IDs from managers table
      let primaryManagerUserId = null;
      let secondaryManagerUserId = null;
      let tertiaryManagerUserId = null;

      if (managerId) {
        const primaryManagerResult = await pool.query(
          "SELECT u.id FROM managers m JOIN users u ON m.email = u.email WHERE m.manager_id = $1",
          [managerId]
        );
        if (primaryManagerResult.rows.length > 0) {
          primaryManagerUserId = primaryManagerResult.rows[0].id;
        }
      }

      if (manager2Id) {
        const secondaryManagerResult = await pool.query(
          "SELECT u.id FROM managers m JOIN users u ON m.email = u.email WHERE m.manager_id = $1",
          [manager2Id]
        );
        if (secondaryManagerResult.rows.length > 0) {
          secondaryManagerUserId = secondaryManagerResult.rows[0].id;
        }
      }

      if (manager3Id) {
        const tertiaryManagerResult = await pool.query(
          "SELECT u.id FROM managers m JOIN users u ON m.email = u.email WHERE m.manager_id = $1",
          [manager3Id]
        );
        if (tertiaryManagerResult.rows.length > 0) {
          tertiaryManagerUserId = tertiaryManagerResult.rows[0].id;
        }
      }

      // Primary manager mapping
      if (primaryManagerUserId) {
        mappingPromises.push(
          pool.query(
            `INSERT INTO manager_employee_mapping (manager_id, employee_id, mapping_type, is_active)
             VALUES ($1, $2, 'primary', true)
             ON CONFLICT (manager_id, employee_id, mapping_type) 
             DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP`,
            [primaryManagerUserId, userId]
          )
        );
      }

      // Secondary manager mapping (if assigned)
      if (secondaryManagerUserId) {
        mappingPromises.push(
          pool.query(
            `INSERT INTO manager_employee_mapping (manager_id, employee_id, mapping_type, is_active)
             VALUES ($1, $2, 'secondary', true)
             ON CONFLICT (manager_id, employee_id, mapping_type) 
             DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP`,
            [secondaryManagerUserId, userId]
          )
        );
      }

      // Tertiary manager mapping (if assigned)
      if (tertiaryManagerUserId) {
        mappingPromises.push(
          pool.query(
            `INSERT INTO manager_employee_mapping (manager_id, employee_id, mapping_type, is_active)
             VALUES ($1, $2, 'tertiary', true)
             ON CONFLICT (manager_id, employee_id, mapping_type) 
             DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP`,
            [tertiaryManagerUserId, userId]
          )
        );
      }

      // Execute all mapping insertions
      if (mappingPromises.length > 0) {
        await Promise.all(mappingPromises);
        console.log("✅ Manager-employee mappings created successfully");
      }

      res
        .status(201)
        .json({ message: "Employee added to master table successfully" });
    } catch (error) {
      console.error("Add to master table error:", error);
      res.status(500).json({ error: "Failed to add employee to master table" });
    }
  }
);

// Get all leave requests (for HR)
router.get("/leave-requests", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lr.id,
        lr.start_date,
        lr.end_date,
        lr.leave_type,
        lr.reason,
        lr.status,
        lr.created_at,
        u.id as employee_id,
        u.email as employee_email,
        em.employee_name,
        em.employee_id as employee_id_code,
        em.manager_id,
        m.employee_name as manager_name
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      JOIN employee_master em ON u.email = em.company_email
      LEFT JOIN employee_master m ON em.manager_id = m.employee_id
      ORDER BY lr.created_at DESC
    `);

    res.json({ leaveRequests: result.rows });
  } catch (error) {
    console.error("Get leave requests error:", error);
    res.status(500).json({ error: "Failed to get leave requests" });
  }
});

// Update leave request status (approve/reject)
router.put(
  "/leave-requests/:id",
  [body("status").isIn(["Approved", "Rejected", "Pending"])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      // Update leave request status
      const result = await pool.query(
        "UPDATE leave_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      res.json({
        message: "Leave request status updated successfully",
        leaveRequest: result.rows[0],
      });
    } catch (error) {
      console.error("Update leave request error:", error);
      res.status(500).json({ error: "Failed to update leave request status" });
    }
  }
);

// Delete employee
router.delete("/employees/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    console.log("🔍 Deleting employee with ID:", id);

    // Start transaction
    await client.query("BEGIN");

    // Check if employee exists first
    const employeeCheck = await client.query(
      "SELECT id, email FROM users WHERE id = $1",
      [id]
    );
    if (employeeCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Employee not found" });
    }

    console.log("🔍 Employee found:", employeeCheck.rows[0]);

    // Delete from all related tables in the correct order (child tables first)
    try {
      // Delete from attendance table
      const attendanceResult = await client.query(
        "DELETE FROM attendance WHERE employee_id = $1",
        [id]
      );
      console.log("✅ Attendance records deleted:", attendanceResult.rowCount);

      // Delete from leave_requests table
      const leaveResult = await client.query(
        "DELETE FROM leave_requests WHERE employee_id = $1",
        [id]
      );
      console.log("✅ Leave requests deleted:", leaveResult.rowCount);

      // Delete from leave_balances table
      const balanceResult = await client.query(
        "DELETE FROM leave_balances WHERE employee_id = $1",
        [id]
      );
      console.log("✅ Leave balances deleted:", balanceResult.rowCount);

      // Delete from comp_off_balances table
      const compOffResult = await client.query(
        "DELETE FROM comp_off_balances WHERE employee_id = $1",
        [id]
      );
      console.log("✅ Comp off balances deleted:", compOffResult.rowCount);

      // Delete from employee_documents table
      const documentsResult = await client.query(
        "DELETE FROM employee_documents WHERE employee_id = $1",
        [id]
      );
      console.log("✅ Employee documents deleted:", documentsResult.rowCount);

      // Delete from document_collection table
      const docCollectionResult = await client.query(
        "DELETE FROM document_collection WHERE employee_id = $1",
        [id]
      );
      console.log(
        "✅ Document collection deleted:",
        docCollectionResult.rowCount
      );

      // Delete from expenses table
      const expensesResult = await client.query(
        "DELETE FROM expenses WHERE employee_id = $1",
        [id]
      );
      console.log("✅ Expenses deleted:", expensesResult.rowCount);

      // Delete from company_emails table
      const emailsResult = await client.query(
        "DELETE FROM company_emails WHERE user_id = $1",
        [id]
      );
      console.log("✅ Company emails deleted:", emailsResult.rowCount);

      // Delete from manager_employee_mapping table
      const mappingResult = await client.query(
        "DELETE FROM manager_employee_mapping WHERE employee_id = $1",
        [id]
      );
      console.log("✅ Manager mappings deleted:", mappingResult.rowCount);

      // Delete manager mappings where this user is a manager
      const managerMappingResult = await client.query(
        "DELETE FROM manager_employee_mapping WHERE manager_id = $1",
        [id]
      );
      console.log(
        "✅ Manager role mappings deleted:",
        managerMappingResult.rowCount
      );

      // Delete from employee_forms table
      const formsResult = await client.query(
        "DELETE FROM employee_forms WHERE employee_id = $1",
        [id]
      );
      console.log("✅ Employee forms deleted:", formsResult.rowCount);

      // Delete from onboarded_employees table
      const onboardedResult = await client.query(
        "DELETE FROM onboarded_employees WHERE user_id = $1",
        [id]
      );
      console.log("✅ Onboarded records deleted:", onboardedResult.rowCount);

      // Delete from employee_master table (if exists)
      const masterResult = await client.query(
        "DELETE FROM employee_master WHERE company_email = (SELECT email FROM users WHERE id = $1)",
        [id]
      );
      console.log("✅ Master records deleted:", masterResult.rowCount);

      // Finally delete from users table
      const userResult = await client.query("DELETE FROM users WHERE id = $1", [
        id,
      ]);
      console.log("✅ User deleted:", userResult.rowCount);

      // Commit transaction
      await client.query("COMMIT");
      console.log("✅ Transaction committed successfully");
    } catch (deleteError) {
      await client.query("ROLLBACK");
      console.error("❌ Error during deletion process:", deleteError);
      throw deleteError;
    }

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("❌ Delete employee error:", error);
    console.error("❌ Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Failed to delete employee",
      details: error.message,
    });
  } finally {
    client.release();
  }
});

// Manually add employee to master table
router.post(
  "/master-employees",
  [
    body("email").isEmail().normalizeEmail(),
    body("employeeName").notEmpty().trim(),
    body("employeeId").notEmpty().trim(),
    body("companyEmail").isEmail().normalizeEmail(),
    body("managerId").optional().trim(),
    body("managerName").optional().trim(),
    body("department").optional().trim(),
    body("location").optional().trim(),
    body("role").notEmpty().trim(),
    body("doj").isISO8601().toDate(),
  ],
  async (req, res) => {
    try {
      console.log("🔍 Received request body:", req.body);
      console.log(
        "🔍 Date of joining:",
        req.body.doj,
        "Type:",
        typeof req.body.doj
      );

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        email,
        employeeName,
        employeeId,
        companyEmail,
        managerId,
        managerName,
        department,
        location,
        role,
        doj,
      } = req.body;

      // Check if email already exists in users table
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Email already exists in users table" });
      }

      // Check if company email already exists in employee_master
      const existingCompanyEmail = await pool.query(
        "SELECT id FROM employee_master WHERE company_email = $1",
        [companyEmail]
      );

      if (existingCompanyEmail.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Company email already exists in employee master" });
      }

      // Check if employee ID already exists
      const existingEmployeeId = await pool.query(
        "SELECT id FROM employee_master WHERE employee_id = $1",
        [employeeId]
      );

      if (existingEmployeeId.rows.length > 0) {
        return res.status(400).json({ error: "Employee ID already exists" });
      }

      // Generate temporary password
      const tempPassword = generateTempPassword();

      // Create user account
      const userResult = await pool.query(
        `INSERT INTO users (
        email, 
        password, 
        role, 
        temp_password,
        first_name,
        last_name,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
      RETURNING id`,
        [
          email,
          "",
          "employee",
          tempPassword,
          employeeName.split(" ")[0],
          employeeName.split(" ").slice(1).join(" ") || "",
        ]
      );

      const userId = userResult.rows[0].id;

      // Add to employee_master table
      await pool.query(
        `INSERT INTO employee_master (
        employee_id,
        employee_name,
        company_email,
        manager_id,
        manager_name,
        type,
        role,
        doj,
        status,
        department,
        location,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          employeeId,
          employeeName,
          companyEmail,
          managerId,
          managerName,
          "Full-Time", // Default type
          role,
          doj,
          "active", // Default status
          department,
          location || null,
        ]
      );

      // Initialize leave balance for the new employee
      const currentYear = new Date().getFullYear();

      // Insert leave balance using the user ID (since leave_balances.employee_id references users.id)
      await pool.query(
        `INSERT INTO leave_balances (
        employee_id, 
        year, 
        total_allocated, 
        leaves_taken, 
        leaves_remaining
      ) VALUES ($1, $2, 27, 0, 27)`,
        [userId, currentYear]
      );

      // Send onboarding email with temporary password
      const emailSent = await sendOnboardingEmail(
        email,
        tempPassword,
        "Full-Time"
      );

      if (!emailSent) {
        console.warn(
          "Failed to send onboarding email, but employee was created"
        );
      }

      res.status(201).json({
        message: "Employee added to master table successfully",
        employee: {
          id: userId,
          email,
          employeeName,
          employeeId,
          companyEmail,
          managerName,
          department,
          tempPassword,
        },
      });
    } catch (error) {
      console.error("Add master employee error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      res.status(500).json({
        error: "Failed to add employee to master table",
        details: error.message,
      });
    }
  }
);

// Update employee information
router.put(
  "/employees/:id",
  [
    body("first_name").optional().trim(),
    body("last_name").optional().trim(),
    body("email").optional().isEmail().normalizeEmail(),
    body("job_role").optional().trim(), // Job role (Product Developer, SAP, etc.)
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { first_name, last_name, email, job_role } = req.body;

      // Start a transaction
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Update users table
        const userUpdates = [];
        const userValues = [];
        let userParamCounter = 1;

        if (first_name !== undefined) {
          userUpdates.push(`first_name = $${userParamCounter}`);
          userValues.push(first_name);
          userParamCounter++;
        }
        if (last_name !== undefined) {
          userUpdates.push(`last_name = $${userParamCounter}`);
          userValues.push(last_name);
          userParamCounter++;
        }
        if (email !== undefined) {
          userUpdates.push(`email = $${userParamCounter}`);
          userValues.push(email);
          userParamCounter++;
        }

        if (userUpdates.length > 0) {
          userUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
          const userQuery = `
            UPDATE users 
            SET ${userUpdates.join(", ")}
            WHERE id = $${userParamCounter}
            RETURNING id, first_name, last_name, email, role, created_at, updated_at
          `;
          userValues.push(id);

          const userResult = await client.query(userQuery, userValues);
          if (userResult.rows.length === 0) {
            throw new Error("Employee not found");
          }
        }

        // Update employee_master table if job_role is provided
        if (job_role !== undefined) {
          const masterQuery = `
            UPDATE employee_master 
            SET role = $1, updated_at = CURRENT_TIMESTAMP
            WHERE company_email = (SELECT email FROM users WHERE id = $2)
            RETURNING id
          `;

          const masterResult = await client.query(masterQuery, [job_role, id]);
          console.log(
            `Updated employee_master role for user ${id}: ${masterResult.rowCount} rows affected`
          );
        }

        await client.query("COMMIT");

        // Get updated employee data
        const finalResult = await client.query(
          `
          SELECT 
            u.id, 
            u.first_name, 
            u.last_name, 
            u.email, 
            u.role, 
            u.created_at, 
            u.updated_at,
            em.role as job_role
          FROM users u
          LEFT JOIN employee_master em ON u.email = em.company_email
          WHERE u.id = $1
        `,
          [id]
        );

        res.json({
          message: "Employee updated successfully",
          employee: finalResult.rows[0],
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Update employee error:", error);
      res.status(500).json({ error: "Failed to update employee" });
    }
  }
);

// Get single employee details
router.get("/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        u.id, 
        u.email, 
        u.first_name,
        u.last_name,
        u.role,
        u.created_at,
        u.updated_at,
        oe.employee_id as form_employee_id,
        oe.manager_name as form_manager_name,
        oe.status as form_status,
        oe.assigned_at as form_submitted_at,
        em.employee_id as master_employee_id,
        em.company_email,
        em.department,
        em.designation,
        em.manager_name,
        em.salary_band,
        em.type as employment_type,
        em.doj,
        em.status as master_status
      FROM users u
      LEFT JOIN onboarded_employees oe ON u.id = oe.user_id
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE u.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json({
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Get employee error:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

// Update employee form
router.put(
  "/employee-forms/:id",
  [
    body("form_data").isObject(),
    body("employee_type").isIn(["Intern", "Contract", "Full-Time", "Manager"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { form_data, employee_type, manager1, manager2, manager3 } =
        req.body;

      // Get the current employee's email to prevent self-assignment
      const currentEmployeeQuery = await pool.query(
        "SELECT ef.form_data, oe.company_email FROM employee_forms ef LEFT JOIN onboarded_employees oe ON ef.employee_id = oe.user_id WHERE ef.id = $1",
        [id]
      );

      if (currentEmployeeQuery.rows.length > 0) {
        const currentEmployee = currentEmployeeQuery.rows[0];
        const currentEmployeeEmails = [
          currentEmployee.form_data?.email,
          currentEmployee.company_email,
        ].filter(Boolean);

        // Validate that managers are not the same as the employee being assigned
        const managersToCheck = [manager1, manager2, manager3].filter(Boolean);

        for (const managerName of managersToCheck) {
          // Get manager email from managers table
          const managerResult = await pool.query(
            "SELECT email FROM managers WHERE manager_name = $1",
            [managerName]
          );

          if (managerResult.rows.length > 0) {
            const managerEmail = managerResult.rows[0].email;

            // Check if manager email matches employee email
            if (currentEmployeeEmails.includes(managerEmail)) {
              return res.status(400).json({
                error: `Employee cannot be assigned as their own manager. Manager "${managerName}" has the same email as the employee.`,
              });
            }
          }
        }
      }

      // Validate phone number uniqueness on server side
      const phoneNumbers = [
        form_data.phone,
        form_data.emergencyContact?.phone,
        form_data.emergencyContact2?.phone,
      ].filter((phone) => phone && phone.trim() !== "");

      const uniquePhoneNumbers = new Set(phoneNumbers);
      if (uniquePhoneNumbers.size !== phoneNumbers.length) {
        return res.status(400).json({
          error:
            "All phone numbers (employee, emergency contact 1, and emergency contact 2) must be different",
        });
      }

      // Check if form exists
      const existingForm = await pool.query(
        "SELECT * FROM employee_forms WHERE id = $1",
        [id]
      );

      if (existingForm.rows.length === 0) {
        return res.status(404).json({ error: "Employee form not found" });
      }

      // Update form with manager assignments
      await pool.query(
        `
        UPDATE employee_forms 
        SET form_data = $1, type = $2, assigned_manager = $3, manager2_name = $4, manager3_name = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
      `,
        [form_data, employee_type, manager1, manager2, manager3, id]
      );

      res.json({
        message: "Employee form updated successfully",
      });
    } catch (error) {
      console.error("Update employee form error:", error);
      res.status(500).json({ error: "Failed to update employee form" });
    }
  }
);

// Update employee in master table
router.put("/master/:id", async (req, res) => {
  try {
    console.log("🔍 Update employee master request:", req.params, req.body);
    const { id } = req.params;
    const {
      employee_name,
      company_email,
      type,
      doj,
      status,
      department,
      designation,
      salary_band,
      location,
      manager_id,
      manager2_id,
      manager3_id,
    } = req.body;

    // Validate required fields
    if (!employee_name || !company_email || !type || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if employee exists
    const existingEmployee = await pool.query(
      "SELECT id, company_email FROM employee_master WHERE id = $1",
      [id]
    );

    if (existingEmployee.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Validate that managers are not the same as the employee being updated
    const currentEmployeeEmail =
      company_email || existingEmployee.rows[0].company_email;
    const managerIdsToCheck = [manager_id, manager2_id, manager3_id].filter(
      Boolean
    );

    for (const managerId of managerIdsToCheck) {
      // Get manager email from managers table
      const managerResult = await pool.query(
        "SELECT email, manager_name FROM managers WHERE manager_id = $1",
        [managerId]
      );

      if (managerResult.rows.length > 0) {
        const managerEmail = managerResult.rows[0].email;
        const managerName = managerResult.rows[0].manager_name;

        // Check if manager email matches employee email
        if (managerEmail === currentEmployeeEmail) {
          return res.status(400).json({
            error: `Employee cannot be assigned as their own manager. Manager "${managerName}" has the same email as the employee.`,
          });
        }
      }
    }

    // Get manager names
    let manager_name = null;
    let manager2_name = null;
    let manager3_name = null;

    if (manager_id) {
      const managerResult = await pool.query(
        "SELECT manager_name FROM managers WHERE manager_id = $1",
        [manager_id]
      );
      manager_name = managerResult.rows[0]?.manager_name;
    }

    if (manager2_id) {
      const manager2Result = await pool.query(
        "SELECT manager_name FROM managers WHERE manager_id = $1",
        [manager2_id]
      );
      manager2_name = manager2Result.rows[0]?.manager_name;
    }

    if (manager3_id) {
      const manager3Result = await pool.query(
        "SELECT manager_name FROM managers WHERE manager_id = $1",
        [manager3_id]
      );
      manager3_name = manager3Result.rows[0]?.manager_name;
    }

    // Get the old employee data to check what changed
    const oldEmployeeResult = await pool.query(
      "SELECT * FROM employee_master WHERE id = $1",
      [id]
    );
    const oldEmployee = oldEmployeeResult.rows[0];
    const oldCompanyEmail = oldEmployee?.company_email;

    // Update employee in master table
    const result = await pool.query(
      `UPDATE employee_master 
       SET employee_name = $1, company_email = $2, type = $3, doj = $4, 
           status = $5, department = $6, designation = $7, salary_band = $8, 
           location = $9, manager_id = $10, manager_name = $11, 
           manager2_id = $12, manager2_name = $13, 
           manager3_id = $14, manager3_name = $15, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $16
       RETURNING *`,
      [
        employee_name,
        company_email,
        type,
        doj,
        status,
        department || null,
        designation || null,
        salary_band || null,
        location || null,
        manager_id || null,
        manager_name,
        manager2_id || null,
        manager2_name,
        manager3_id || null,
        manager3_name,
        id,
      ]
    );

    // Synchronize changes with users table and other related tables
    console.log("🔄 Synchronizing Employee Master changes with database...");

    // 1. Handle company email changes
    if (oldCompanyEmail && oldCompanyEmail !== company_email) {
      console.log(
        `🔄 Company email changed from ${oldCompanyEmail} to ${company_email}`
      );

      // Check if user exists with old email
      const userExistsResult = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [oldCompanyEmail]
      );

      if (userExistsResult.rows.length > 0) {
        // Update existing user's email
        await pool.query(
          "UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2",
          [company_email, oldCompanyEmail]
        );
        console.log(
          `✅ Updated existing user: ${oldCompanyEmail} → ${company_email}`
        );
      } else {
        // Check if user already exists with new email
        const newUserExistsResult = await pool.query(
          "SELECT id FROM users WHERE email = $1",
          [company_email]
        );

        if (newUserExistsResult.rows.length === 0) {
          // Create new user account with the new email
          const bcrypt = require("bcryptjs");
          const tempPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          await pool.query(
            `INSERT INTO users (email, password, role, first_name, last_name, temp_password, created_at, updated_at) 
             VALUES ($1, $2, 'employee', $3, 'Employee', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [company_email, hashedPassword, employee_name, tempPassword]
          );
          console.log(
            `✅ Created new user account: ${company_email} with temp password: ${tempPassword}`
          );
        }
      }
    }

    // 2. Update company_emails table if company email changed
    if (oldCompanyEmail && oldCompanyEmail !== company_email) {
      // Update company_emails table
      await pool.query(
        "UPDATE company_emails SET company_email = $1, updated_at = CURRENT_TIMESTAMP WHERE company_email = $2",
        [company_email, oldCompanyEmail]
      );
      console.log(
        `✅ Updated company_emails table: ${oldCompanyEmail} → ${company_email}`
      );
    }

    // 3. Update employee_forms table if employee name or email changed
    if (
      oldEmployee.employee_name !== employee_name ||
      oldCompanyEmail !== company_email
    ) {
      await pool.query(
        `UPDATE employee_forms 
         SET form_data = jsonb_set(
           jsonb_set(form_data, '{name}', $1::jsonb),
           '{email}', $2::jsonb
         ), updated_at = CURRENT_TIMESTAMP
         WHERE employee_id IN (
           SELECT id FROM users WHERE email = $3
         )`,
        [
          JSON.stringify(employee_name),
          JSON.stringify(company_email),
          company_email,
        ]
      );
      console.log(
        `✅ Updated employee_forms table for employee: ${employee_name}`
      );
    }

    // 4. Update onboarded_employees table if employee name changed
    if (oldEmployee.employee_name !== employee_name) {
      await pool.query(
        `UPDATE onboarded_employees 
         SET updated_at = CURRENT_TIMESTAMP
         WHERE user_id IN (
           SELECT id FROM users WHERE email = $1
         )`,
        [company_email]
      );
      console.log(
        `✅ Updated onboarded_employees table for employee: ${employee_name}`
      );
    }

    // 5. Update leave_requests table if employee name changed
    if (oldEmployee.employee_name !== employee_name) {
      await pool.query(
        `UPDATE leave_requests 
         SET employee_name = $1, updated_at = CURRENT_TIMESTAMP
         WHERE employee_id IN (
           SELECT id FROM users WHERE email = $2
         )`,
        [employee_name, company_email]
      );
      console.log(
        `✅ Updated leave_requests table for employee: ${employee_name}`
      );
    }

    console.log("✅ Employee Master synchronization completed successfully");

    res.json({
      message: "Employee updated successfully",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Update employee master error:", error);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

// ==================== DOCUMENT COLLECTION ROUTES ====================

// Get all document collection records with uploaded document status
router.get("/document-collection", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        dc.*,
        u.email as employee_email,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM employee_documents ed 
            WHERE ed.employee_id = dc.employee_id 
            AND (
              (ed.document_type = 'resume' AND dc.document_name LIKE '%Resume%')
              OR (ed.document_type = 'offer_letter' AND dc.document_name LIKE '%Offer%')
              OR (ed.document_type = 'compensation_letter' AND dc.document_name LIKE '%Compensation%')
              OR (ed.document_type = 'experience_letter' AND dc.document_name LIKE '%Experience%')
              OR (ed.document_type = 'payslip' AND dc.document_name LIKE '%Pay%')
              OR (ed.document_type = 'form16' AND dc.document_name LIKE '%Form 16%')
              OR (ed.document_type = 'ssc_certificate' AND dc.document_name LIKE '%SSC%Certificate%')
              OR (ed.document_type = 'ssc_marksheet' AND dc.document_name LIKE '%SSC%Marksheet%')
              OR (ed.document_type = 'hsc_certificate' AND dc.document_name LIKE '%HSC%Certificate%')
              OR (ed.document_type = 'hsc_marksheet' AND dc.document_name LIKE '%HSC%Marksheet%')
              OR (ed.document_type = 'graduation_marksheet' AND dc.document_name LIKE '%Graduation%Marksheet%')
              OR (ed.document_type = 'graduation_certificate' AND dc.document_name LIKE '%Graduation%Certificate%')
              OR (ed.document_type = 'postgrad_marksheet' AND dc.document_name LIKE '%Post-Graduation%Marksheet%')
              OR (ed.document_type = 'postgrad_certificate' AND dc.document_name LIKE '%Post-Graduation%Certificate%')
              OR (ed.document_type = 'aadhaar' AND dc.document_name LIKE '%Aadhaar%')
              OR (ed.document_type = 'pan' AND dc.document_name LIKE '%PAN%')
              OR (ed.document_type = 'passport' AND dc.document_name LIKE '%Passport%')
            )
          ) THEN 'Received'
          ELSE dc.status
        END as effective_status
      FROM document_collection dc
      LEFT JOIN users u ON dc.employee_id = u.id
      ORDER BY dc.created_at DESC
    `);

    res.json({ documents: result.rows });
  } catch (error) {
    console.error("Get document collection error:", error);
    res.status(500).json({ error: "Failed to get document collection data" });
  }
});

// Get document collection by employee with uploaded document status
router.get("/document-collection/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        dc.*,
        u.email as employee_email,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM employee_documents ed 
            WHERE ed.employee_id = dc.employee_id 
            AND (
              (ed.document_type = 'resume' AND dc.document_name LIKE '%Resume%')
              OR (ed.document_type = 'offer_letter' AND dc.document_name LIKE '%Offer%')
              OR (ed.document_type = 'compensation_letter' AND dc.document_name LIKE '%Compensation%')
              OR (ed.document_type = 'experience_letter' AND dc.document_name LIKE '%Experience%')
              OR (ed.document_type = 'payslip' AND dc.document_name LIKE '%Pay%')
              OR (ed.document_type = 'form16' AND dc.document_name LIKE '%Form 16%')
              OR (ed.document_type = 'ssc_certificate' AND dc.document_name LIKE '%SSC%Certificate%')
              OR (ed.document_type = 'ssc_marksheet' AND dc.document_name LIKE '%SSC%Marksheet%')
              OR (ed.document_type = 'hsc_certificate' AND dc.document_name LIKE '%HSC%Certificate%')
              OR (ed.document_type = 'hsc_marksheet' AND dc.document_name LIKE '%HSC%Marksheet%')
              OR (ed.document_type = 'graduation_marksheet' AND dc.document_name LIKE '%Graduation%Marksheet%')
              OR (ed.document_type = 'graduation_certificate' AND dc.document_name LIKE '%Graduation%Certificate%')
              OR (ed.document_type = 'postgrad_marksheet' AND dc.document_name LIKE '%Post-Graduation%Marksheet%')
              OR (ed.document_type = 'postgrad_certificate' AND dc.document_name LIKE '%Post-Graduation%Certificate%')
              OR (ed.document_type = 'aadhaar' AND dc.document_name LIKE '%Aadhaar%')
              OR (ed.document_type = 'pan' AND dc.document_name LIKE '%PAN%')
              OR (ed.document_type = 'passport' AND dc.document_name LIKE '%Passport%')
            )
          ) THEN 'Received'
          ELSE dc.status
        END as effective_status
      FROM document_collection dc
      LEFT JOIN users u ON dc.employee_id = u.id
      WHERE dc.employee_id = $1
      ORDER BY dc.due_date ASC, dc.document_type DESC
    `,
      [employeeId]
    );

    res.json({ documents: result.rows });
  } catch (error) {
    console.error("Get employee document collection error:", error);
    res
      .status(500)
      .json({ error: "Failed to get employee document collection" });
  }
});

// Create document collection record
router.post("/document-collection", async (req, res) => {
  try {
    const {
      employee_id,
      employee_name,
      emp_id,
      department,
      join_date,
      due_date,
      document_name,
      document_type,
      notes,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO document_collection (
        employee_id, employee_name, emp_id, department, join_date, due_date,
        document_name, document_type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        employee_id,
        employee_name,
        emp_id,
        department,
        join_date,
        due_date,
        document_name,
        document_type,
        notes,
      ]
    );

    res.status(201).json({
      message: "Document collection record created successfully",
      document: result.rows[0],
    });
  } catch (error) {
    console.error("Create document collection error:", error);
    res
      .status(500)
      .json({ error: "Failed to create document collection record" });
  }
});

// Update document collection status
router.put("/document-collection/:id", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 Document status update route hit");
    console.log("🔍 Request params:", req.params);
    console.log("🔍 Request body:", req.body);
    console.log("🔍 Request user:", req.user);

    const { id } = req.params;
    const { status, notes, uploaded_file_url, uploaded_file_name } = req.body;

    // Verify user is HR or admin
    if (req.user.role !== "hr" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Access denied. HR role required." });
    }

    // Convert id to integer
    const documentId = parseInt(id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    console.log("🔍 Document status update request:", {
      id: documentId,
      status,
      notes,
      uploaded_file_url,
      uploaded_file_name,
    });

    const result = await pool.query(
      `
      UPDATE document_collection 
      SET status = $1::varchar(50), 
          notes = COALESCE($2, notes), 
          uploaded_file_url = COALESCE($3, uploaded_file_url), 
          uploaded_file_name = COALESCE($4, uploaded_file_name), 
          uploaded_at = CASE WHEN $1 = 'Received' THEN CURRENT_TIMESTAMP ELSE uploaded_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `,
      [
        status,
        notes || null,
        uploaded_file_url || null,
        uploaded_file_name || null,
        documentId,
      ]
    );

    console.log("🔍 Database update result:", {
      rowsAffected: result.rows.length,
      updatedRecord: result.rows[0],
    });

    if (result.rows.length === 0) {
      console.log("❌ Document not found with ID:", id);
      return res
        .status(404)
        .json({ error: "Document collection record not found" });
    }

    res.json({
      message: "Document collection record updated successfully",
      document: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Update document collection error:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    res.status(500).json({
      error: "Failed to update document collection record",
      details: error.message,
    });
  }
});

// Delete document collection record
router.delete(
  "/document-collection/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify user is HR or admin
      if (req.user.role !== "hr" && req.user.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Access denied. HR role required." });
      }

      // Convert id to integer
      const documentId = parseInt(id);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const result = await pool.query(
        "DELETE FROM document_collection WHERE id = $1 RETURNING *",
        [documentId]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Document collection record not found" });
      }

      res.json({ message: "Document collection record deleted successfully" });
    } catch (error) {
      console.error("Delete document collection error:", error);
      res
        .status(500)
        .json({ error: "Failed to delete document collection record" });
    }
  }
);

// Bulk create document collection records for an employee
router.post("/document-collection/bulk", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      employee_id,
      employee_name,
      emp_id,
      department,
      join_date,
      due_date,
      documents,
    } = req.body;

    await client.query("BEGIN");

    const createdDocuments = [];

    for (const doc of documents) {
      const result = await client.query(
        `
        INSERT INTO document_collection (
          employee_id, employee_name, emp_id, department, join_date, due_date,
          document_name, document_type, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
        [
          employee_id,
          employee_name,
          emp_id,
          department,
          join_date,
          due_date,
          doc.document_name,
          doc.document_type,
          doc.notes || null,
        ]
      );

      createdDocuments.push(result.rows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Document collection records created successfully",
      documents: createdDocuments,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Bulk create document collection error:", error);
    res
      .status(500)
      .json({ error: "Failed to create document collection records" });
  } finally {
    client.release();
  }
});

// Get document templates
router.get("/document-templates", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM document_templates 
      WHERE is_active = TRUE 
      ORDER BY document_type DESC, document_name ASC
    `);

    res.json({ templates: result.rows });
  } catch (error) {
    console.error("Get document templates error:", error);
    res.status(500).json({ error: "Failed to get document templates" });
  }
});

// Create document template
router.post("/document-templates", async (req, res) => {
  try {
    const { document_name, document_type, description } = req.body;

    const result = await pool.query(
      `
      INSERT INTO document_templates (document_name, document_type, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
      [document_name, document_type, description]
    );

    res.status(201).json({
      message: "Document template created successfully",
      template: result.rows[0],
    });
  } catch (error) {
    console.error("Create document template error:", error);
    res.status(500).json({ error: "Failed to create document template" });
  }
});

// Update document template
router.put("/document-templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { document_name, document_type, description, is_active } = req.body;

    const result = await pool.query(
      `
      UPDATE document_templates 
      SET document_name = $1, document_type = $2, description = $3, 
          is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `,
      [document_name, document_type, description, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document template not found" });
    }

    res.json({
      message: "Document template updated successfully",
      template: result.rows[0],
    });
  } catch (error) {
    console.error("Update document template error:", error);
    res.status(500).json({ error: "Failed to update document template" });
  }
});

// Delete document template
router.delete("/document-templates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM document_templates WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document template not found" });
    }

    res.json({ message: "Document template deleted successfully" });
  } catch (error) {
    console.error("Delete document template error:", error);
    res.status(500).json({ error: "Failed to delete document template" });
  }
});

// Manual employee re-addition endpoint
router.post(
  "/manual-add-employee",
  [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("first_name").notEmpty().withMessage("First name is required"),
    body("last_name").notEmpty().withMessage("Last name is required"),
    body("employment_type")
      .isIn(["Full-Time", "Contract", "Intern", "Manager"])
      .withMessage("Please select a valid employment type"),
    body("temp_password")
      .optional()
      .custom((value) => {
        if (value === null || value === undefined || value === "") {
          return true;
        }
        return value.length >= 6;
      })
      .withMessage("Temporary password must be at least 6 characters long"),
  ],
  async (req, res) => {
    try {
      console.log("🔍 Manual add employee request body:", req.body);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        email,
        first_name,
        last_name,
        employment_type = "Full-Time",
        temp_password,
      } = req.body;

      // Check if email already exists
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Call the database function to create the user
      const result = await pool.query(
        "SELECT manually_add_employee($1, $2, $3, $4, $5) as user_id",
        [email, first_name, last_name, employment_type, temp_password]
      );

      const userId = result.rows[0].user_id;

      // Get the temporary password that was generated
      const userResult = await pool.query(
        "SELECT temp_password FROM users WHERE id = $1",
        [userId]
      );

      const generatedPassword = userResult.rows[0].temp_password;

      // Send welcome email with credentials
      try {
        const emailSent = await sendOnboardingEmail(
          email,
          generatedPassword,
          employment_type
        );

        if (!emailSent) {
          console.warn(
            "Failed to send onboarding email, but employee was created"
          );
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
      }

      console.log("✅ Employee manually added successfully:", {
        id: userId,
        email,
        first_name,
        last_name,
        employment_type,
        temp_password: generatedPassword,
      });

      res.status(201).json({
        message: "Employee manually added successfully",
        employee: {
          id: userId,
          email,
          first_name,
          last_name,
          employment_type,
          temp_password: generatedPassword,
        },
      });
    } catch (error) {
      console.error("Manual add employee error:", error);
      res.status(500).json({ error: "Failed to manually add employee" });
    }
  }
);

// Delete manager and all related data
router.delete("/managers/:managerId", async (req, res) => {
  const client = await pool.connect();
  try {
    const { managerId } = req.params;
    console.log("🔍 Deleting manager with ID:", managerId);

    // Check if manager exists
    const managerCheck = await client.query(
      "SELECT manager_id, email FROM managers WHERE manager_id = $1",
      [managerId]
    );

    if (managerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Manager not found" });
    }

    const managerEmail = managerCheck.rows[0].email;
    console.log("🔍 Manager found:", managerCheck.rows[0]);

    // Get user ID for this manager
    const userResult = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [managerEmail]
    );

    const userId = userResult.rows[0]?.id;

    // Start transaction
    await client.query("BEGIN");

    try {
      // Delete from all related tables
      if (userId) {
        // Delete attendance records
        const attendanceResult = await client.query(
          "DELETE FROM attendance WHERE employee_id = $1",
          [userId]
        );
        console.log(
          "✅ Attendance records deleted:",
          attendanceResult.rowCount
        );

        // Delete leave requests
        const leaveResult = await client.query(
          "DELETE FROM leave_requests WHERE employee_id = $1",
          [userId]
        );
        console.log("✅ Leave requests deleted:", leaveResult.rowCount);

        // Delete leave balances
        const balanceResult = await client.query(
          "DELETE FROM leave_balances WHERE employee_id = $1",
          [userId]
        );
        console.log("✅ Leave balances deleted:", balanceResult.rowCount);

        // Delete comp off balances
        const compOffResult = await client.query(
          "DELETE FROM comp_off_balances WHERE employee_id = $1",
          [userId]
        );
        console.log("✅ Comp off balances deleted:", compOffResult.rowCount);

        // Delete employee documents
        const documentsResult = await client.query(
          "DELETE FROM employee_documents WHERE employee_id = $1",
          [userId]
        );
        console.log("✅ Employee documents deleted:", documentsResult.rowCount);

        // Delete document collection
        const docCollectionResult = await client.query(
          "DELETE FROM document_collection WHERE employee_id = $1",
          [userId]
        );
        console.log(
          "✅ Document collection deleted:",
          docCollectionResult.rowCount
        );

        // Delete expenses
        const expensesResult = await client.query(
          "DELETE FROM expenses WHERE employee_id = $1",
          [userId]
        );
        console.log("✅ Expenses deleted:", expensesResult.rowCount);

        // Delete company emails
        const emailsResult = await client.query(
          "DELETE FROM company_emails WHERE user_id = $1",
          [userId]
        );
        console.log("✅ Company emails deleted:", emailsResult.rowCount);

        // Delete manager mappings where this user is an employee
        const employeeMappingResult = await client.query(
          "DELETE FROM manager_employee_mapping WHERE employee_id = $1",
          [userId]
        );
        console.log(
          "✅ Employee mappings deleted:",
          employeeMappingResult.rowCount
        );

        // Delete manager mappings where this user is a manager
        const managerMappingResult = await client.query(
          "DELETE FROM manager_employee_mapping WHERE manager_id = $1",
          [userId]
        );
        console.log(
          "✅ Manager role mappings deleted:",
          managerMappingResult.rowCount
        );

        // Delete employee forms
        const formsResult = await client.query(
          "DELETE FROM employee_forms WHERE employee_id = $1",
          [userId]
        );
        console.log("✅ Employee forms deleted:", formsResult.rowCount);

        // Delete onboarded employees
        const onboardedResult = await client.query(
          "DELETE FROM onboarded_employees WHERE user_id = $1",
          [userId]
        );
        console.log("✅ Onboarded records deleted:", onboardedResult.rowCount);

        // Delete from employee master
        const masterResult = await client.query(
          "DELETE FROM employee_master WHERE company_email = $1",
          [managerEmail]
        );
        console.log("✅ Master records deleted:", masterResult.rowCount);

        // Delete from users table
        const userDeleteResult = await client.query(
          "DELETE FROM users WHERE id = $1",
          [userId]
        );
        console.log("✅ User deleted:", userDeleteResult.rowCount);
      }

      // Delete from managers table
      const managerResult = await client.query(
        "DELETE FROM managers WHERE manager_id = $1",
        [managerId]
      );
      console.log("✅ Manager deleted:", managerResult.rowCount);

      // Commit transaction
      await client.query("COMMIT");
      console.log("✅ Transaction committed successfully");

      res.json({
        message: "Manager and all related data deleted successfully",
      });
    } catch (deleteError) {
      await client.query("ROLLBACK");
      console.error("❌ Error during deletion process:", deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error("❌ Delete manager error:", error);
    console.error("❌ Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Failed to delete manager",
      details: error.message,
    });
  } finally {
    client.release();
  }
});

// Get all managers
router.get("/managers-list", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        manager_id,
        manager_name,
        email,
        department,
        designation,
        status,
        created_at
      FROM managers 
      ORDER BY created_at DESC
    `);

    res.json({ managers: result.rows });
  } catch (error) {
    console.error("Get managers error:", error);
    res.status(500).json({ error: "Failed to get managers" });
  }
});

// Get all interns
router.get("/interns-list", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        intern_id,
        intern_name,
        email,
        department,
        designation,
        status,
        created_at
      FROM interns 
      ORDER BY created_at DESC
    `);

    res.json({ interns: result.rows });
  } catch (error) {
    console.error("Get interns error:", error);
    res.status(500).json({ error: "Failed to get interns" });
  }
});

// Get all full-time employees
router.get("/full-time-list", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        employee_id,
        employee_name,
        email,
        department,
        designation,
        status,
        created_at
      FROM full_time_employees 
      ORDER BY created_at DESC
    `);

    res.json({ fullTimeEmployees: result.rows });
  } catch (error) {
    console.error("Get full-time employees error:", error);
    res.status(500).json({ error: "Failed to get full-time employees" });
  }
});

// Get all contract employees
router.get("/contract-list", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        employee_id,
        employee_name,
        email,
        department,
        designation,
        contract_start_date,
        contract_end_date,
        status,
        created_at
      FROM contract_employees 
      ORDER BY created_at DESC
    `);

    res.json({ contractEmployees: result.rows });
  } catch (error) {
    console.error("Get contract employees error:", error);
    res.status(500).json({ error: "Failed to get contract employees" });
  }
});

// Get all employees by type (summary)
router.get("/employees-by-type", async (req, res) => {
  try {
    const [managersResult, internsResult, fullTimeResult, contractResult] =
      await Promise.all([
        pool.query(
          "SELECT COUNT(*) as count FROM managers WHERE status = 'active'"
        ),
        pool.query(
          "SELECT COUNT(*) as count FROM interns WHERE status = 'active'"
        ),
        pool.query(
          "SELECT COUNT(*) as count FROM full_time_employees WHERE status = 'active'"
        ),
        pool.query(
          "SELECT COUNT(*) as count FROM contract_employees WHERE status = 'active'"
        ),
      ]);

    res.json({
      summary: {
        managers: parseInt(managersResult.rows[0].count),
        interns: parseInt(internsResult.rows[0].count),
        fullTime: parseInt(fullTimeResult.rows[0].count),
        contract: parseInt(contractResult.rows[0].count),
        total:
          parseInt(managersResult.rows[0].count) +
          parseInt(internsResult.rows[0].count) +
          parseInt(fullTimeResult.rows[0].count) +
          parseInt(contractResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error("Get employees by type error:", error);
    res.status(500).json({ error: "Failed to get employees by type" });
  }
});

module.exports = router;
