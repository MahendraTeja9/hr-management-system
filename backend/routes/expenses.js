const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../config/database.js");
const {
  sendExpenseRequestToManager,
  sendManagerApprovalToHR,
  sendExpenseApprovalToEmployee,
} = require("../utils/mailer.js");
const {
  authenticateToken,
  requireEmployee,
  requireHR,
} = require("../middleware/auth.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/expenses");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5, // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are allowed"));
    }
  },
});

// Helper function to generate unique series ID
const generateSeriesId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `EXP-${timestamp}-${random}`.toUpperCase();
};

// Helper functions for multi-manager approval workflow
const checkAllManagersApproved = (expenseRequest) => {
  const managers = [];
  if (expenseRequest.manager1_id) managers.push(expenseRequest.manager1_status);
  if (expenseRequest.manager2_id) managers.push(expenseRequest.manager2_status);
  if (expenseRequest.manager3_id) managers.push(expenseRequest.manager3_status);

  return (
    managers.length > 0 && managers.every((status) => status === "Approved")
  );
};

const checkAnyManagerRejected = (expenseRequest) => {
  const managers = [];
  if (expenseRequest.manager1_id) managers.push(expenseRequest.manager1_status);
  if (expenseRequest.manager2_id) managers.push(expenseRequest.manager2_status);
  if (expenseRequest.manager3_id) managers.push(expenseRequest.manager3_status);

  return managers.some((status) => status === "Rejected");
};

const getApprovedManagerCount = (expenseRequest) => {
  const managers = [];
  if (expenseRequest.manager1_id) managers.push(expenseRequest.manager1_status);
  if (expenseRequest.manager2_id) managers.push(expenseRequest.manager2_status);
  if (expenseRequest.manager3_id) managers.push(expenseRequest.manager3_status);

  return managers.filter((status) => status === "Approved").length;
};

const getTotalManagerCount = (expenseRequest) => {
  let count = 0;
  if (expenseRequest.manager1_id) count++;
  if (expenseRequest.manager2_id) count++;
  if (expenseRequest.manager3_id) count++;
  return count;
};

// Helper function to get employee's managers (reuse from leave.js)
const getEmployeeManagers = async (employeeId) => {
  try {
    // Get all manager information from employee_master table
    const employeeResult = await pool.query(
      `SELECT em.manager_id, em.manager_name, 
              em.manager2_id, em.manager2_name, 
              em.manager3_id, em.manager3_name
       FROM employee_master em
       WHERE em.company_email = (
         SELECT email FROM users WHERE id = $1
       )`,
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      console.log("🔍 No employee found", employeeId);
      return null;
    }

    const employee = employeeResult.rows[0];
    const managers = [];

    // Get manager 1 details
    if (employee.manager_id && employee.manager_name) {
      const manager1Result = await pool.query(
        `SELECT em.employee_name as manager_name, em.company_email, u.id as user_id
         FROM employee_master em
         LEFT JOIN users u ON u.email = em.company_email
         WHERE em.employee_name = $1 AND em.status = 'active'`,
        [employee.manager_name]
      );

      if (manager1Result.rows.length > 0) {
        const manager = manager1Result.rows[0];
        const email = manager.company_email;
        if (email) {
          managers.push({
            id: manager.user_id,
            manager_id: employee.manager_id,
            manager_name: employee.manager_name,
            email: email,
          });
        }
      }
    }

    // Get manager 2 details
    if (employee.manager2_id && employee.manager2_name) {
      const manager2Result = await pool.query(
        `SELECT em.employee_name as manager_name, em.company_email, u.id as user_id
         FROM employee_master em
         LEFT JOIN users u ON u.email = em.company_email
         WHERE em.employee_name = $1 AND em.status = 'active'`,
        [employee.manager2_name]
      );

      if (manager2Result.rows.length > 0) {
        const manager = manager2Result.rows[0];
        const email = manager.company_email;
        if (email) {
          managers.push({
            id: manager.user_id,
            manager_id: employee.manager2_id,
            manager_name: employee.manager2_name,
            email: email,
          });
        }
      }
    }

    // Get manager 3 details
    if (employee.manager3_id && employee.manager3_name) {
      const manager3Result = await pool.query(
        `SELECT em.employee_name as manager_name, em.company_email, u.id as user_id
         FROM employee_master em
         LEFT JOIN users u ON u.email = em.company_email
         WHERE em.employee_name = $1 AND em.status = 'active'`,
        [employee.manager3_name]
      );

      if (manager3Result.rows.length > 0) {
        const manager = manager3Result.rows[0];
        const email = manager.company_email;
        if (email) {
          managers.push({
            id: manager.user_id,
            manager_id: employee.manager3_id,
            manager_name: employee.manager3_name,
            email: email,
          });
        }
      }
    }

    if (managers.length === 0) {
      console.log("🔍 No managers found for employee", employeeId);
      return null;
    }

    console.log("🔍 Found managers for employee", employeeId, ":", managers);
    return managers;
  } catch (error) {
    console.error("Error getting employee managers:", error);
    return null;
  }
};

// Helper function to get HR users
const getHRUsers = async () => {
  try {
    const result = await pool.query(`
      SELECT id, email, first_name, last_name
      FROM users
      WHERE role = 'hr'
    `);
    return result.rows;
  } catch (error) {
    console.error("Error getting HR users:", error);
    return [];
  }
};

// Get expense categories and types
router.get("/categories", async (req, res) => {
  try {
    const categories = {
      Travel: [
        "Taxi",
        "Flight",
        "Hotel",
        "Train",
        "Bus",
        "Car Rental",
        "Fuel",
        "Parking",
      ],
      Food: ["Meals", "Snacks", "Beverages", "Catering", "Restaurant"],
      Accommodation: ["Hotel", "Airbnb", "Guest House", "Conference Venue"],
      "Office Supplies": [
        "Stationery",
        "Equipment",
        "Software",
        "Hardware",
        "Printing",
      ],
      Training: [
        "Course Fee",
        "Certification",
        "Workshop",
        "Conference",
        "Books",
      ],
      Gifts: ["Gifts(clients)", "Gifts(onsite)"],
      Miscellaneous: ["Internet", "Phone", "Utilities", "Maintenance", "Other"],
      Other: [],
    };

    res.json(categories);
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    res.status(500).json({ error: "Failed to fetch expense categories" });
  }
});

// Submit expense request
router.post(
  "/submit",
  authenticateToken,
  upload.array("attachments", 5), // Allow up to 5 files
  [
    body("expenseCategory")
      .notEmpty()
      .withMessage("Expense category is required"),
    body("expenseType").notEmpty().withMessage("Expense type is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("amount")
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be greater than 0"),
    body("currency").optional().isLength({ min: 3, max: 3 }),
    body("description").notEmpty().withMessage("Description is required"),
    body("expenseDate")
      .isISO8601()
      .withMessage("Valid expense date is required"),
  ],
  async (req, res) => {
    try {
      console.log("🔍 Expense request received:", req.body);
      console.log("🔍 Files uploaded:", req.files);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if at least one attachment is provided
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one attachment is mandatory" });
      }

      const {
        expenseCategory,
        expenseType,
        otherCategory,
        amount,
        currency = "INR",
        description,
        expenseDate,
        projectReference,
        clientCode,
        paymentMode,
        taxIncluded = false,
      } = req.body;

      const employeeId = req.user.userId;

      // Validate expense date is not in the future
      const expenseDateObj = new Date(expenseDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      if (expenseDateObj > today) {
        return res.status(400).json({
          error: "Expense date cannot be in the future",
        });
      }

      // Get employee details
      const employeeResult = await pool.query(
        `
        SELECT u.first_name, u.last_name, u.email
        FROM users u
        WHERE u.id = $1
      `,
        [employeeId]
      );

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const employee = employeeResult.rows[0];
      const employeeName = `${employee.first_name} ${employee.last_name}`;

      // Generate unique series ID
      const series = generateSeriesId();

      // Generate approval token for email links
      const approvalToken = require("crypto").randomBytes(32).toString("hex");

      // Get employee's manager
      const managers = await getEmployeeManagers(employeeId);
      console.log("🔍 Retrieved managers:", managers);

      // Calculate total reimbursable amount
      let totalReimbursable = parseFloat(amount);
      if (taxIncluded === "true" || taxIncluded === true) {
        // If tax is included, the amount is already the total
        totalReimbursable = parseFloat(amount);
      }

      // Insert expense request with manager information
      const insertResult = await pool.query(
        `
        INSERT INTO expenses (
          series, employee_id, employee_name, expense_category, expense_type, other_category,
          amount, currency, description, attachment_url, attachment_name, expense_date,
          project_reference, client_code, payment_mode, tax_included, total_reimbursable,
          status, approval_token,
          manager1_id, manager1_name, manager1_status,
          manager2_id, manager2_name, manager2_status,
          manager3_id, manager3_name, manager3_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING *
      `,
        [
          series,
          employeeId,
          employeeName,
          expenseCategory,
          expenseType,
          otherCategory || null,
          amount,
          currency,
          description,
          `/uploads/expenses/${req.files[0].filename}`, // Primary attachment
          req.files[0].originalname,
          expenseDate,
          projectReference || null,
          clientCode || null,
          paymentMode || null,
          taxIncluded === "true" || taxIncluded === true,
          totalReimbursable,
          "pending_manager_approval",
          approvalToken,
          managers[0]?.manager_id || null,
          managers[0]?.manager_name || null,
          "Pending",
          managers[1]?.manager_id || null,
          managers[1]?.manager_name || null,
          managers[1] ? "Pending" : null,
          managers[2]?.manager_id || null,
          managers[2]?.manager_name || null,
          managers[2] ? "Pending" : null,
        ]
      );

      const expenseRequest = insertResult.rows[0];

      // Insert additional attachments if any
      if (req.files.length > 1) {
        for (let i = 1; i < req.files.length; i++) {
          const file = req.files[i];
          await pool.query(
            `
            INSERT INTO expense_attachments (expense_id, file_name, file_url, file_size, mime_type)
            VALUES ($1, $2, $3, $4, $5)
          `,
            [
              expenseRequest.id,
              file.originalname,
              `/uploads/expenses/${file.filename}`,
              file.size,
              file.mimetype,
            ]
          );
        }
      }

      // Send email notification to PRIMARY MANAGER ONLY (manager1)
      console.log("🔍 Managers found:", managers);
      if (managers && managers.length > 0) {
        // Only send email to the primary manager (first manager in the array)
        const primaryManager = managers[0];
        console.log(
          "📧 Sending email to PRIMARY manager only:",
          primaryManager.email
        );

        const emailData = {
          id: expenseRequest.id,
          employeeName,
          employeeEmail: employee.email,
          expenseCategory,
          expenseType,
          amount,
          currency,
          description,
          expenseDate,
          attachmentUrl: expenseRequest.attachment_url,
          attachmentName: expenseRequest.attachment_name,
          approvalToken,
          totalManagers: managers.length,
          primaryManagerOnly: true, // Flag to indicate this is primary manager only
        };

        // Send email ONLY to primary manager
        sendExpenseRequestToManager(primaryManager.email, emailData)
          .then((emailResult) => {
            console.log("📧 Email sent to primary manager:", emailResult);
          })
          .catch((emailError) => {
            console.error(
              "❌ Email sending to primary manager failed:",
              emailError
            );
          });

        console.log(
          "📧 Note: Email sent only to primary manager. Optional managers (manager2, manager3) will not receive emails."
        );
      } else {
        console.log("❌ No manager found for employee:", employeeId);
      }

      res.status(201).json({
        message: "Expense request submitted successfully",
        expenseRequest,
        series,
      });
    } catch (error) {
      console.error("❌ Error submitting expense request:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail,
      });
      res.status(500).json({
        error: "Failed to submit expense request",
        details: error.message,
      });
    }
  }
);

// Get employee's expense requests
router.get("/my-requests", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 Fetching expense requests for user ID:", req.user.userId);

    const result = await pool.query(
      `
      SELECT 
        *,
        manager1_name as manager_name,
        CASE 
          WHEN manager2_name IS NOT NULL AND manager3_name IS NOT NULL THEN 
            manager1_name || ', ' || manager2_name || ', ' || manager3_name
          WHEN manager2_name IS NOT NULL THEN 
            manager1_name || ', ' || manager2_name
          ELSE 
            manager1_name
        END as all_managers
      FROM expenses
      WHERE employee_id = $1 
      ORDER BY created_at DESC
    `,
      [req.user.userId]
    );

    console.log("🔍 Expense requests with manager data:", result.rows.length);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching expense requests:", error);
    res.status(500).json({ error: "Failed to fetch expense requests" });
  }
});

// Get pending expense requests for manager
router.get("/manager/pending", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res
        .status(403)
        .json({ error: "Access denied. Manager role required." });
    }

    // Get manager's department from departments table
    const departmentResult = await pool.query(
      "SELECT id, name FROM departments WHERE manager_id = $1 AND is_active = true",
      [req.user.userId]
    );

    if (departmentResult.rows.length === 0) {
      // Fallback to old manager system if no department assigned
      const managerResult = await pool.query(
        "SELECT manager_id FROM managers WHERE email = $1 AND status = 'active'",
        [req.user.email]
      );

      if (managerResult.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "Manager not found or no department assigned" });
      }

      const managerId = managerResult.rows[0].manager_id;

      const result = await pool.query(
        `
        SELECT 
          e.*, 
          u.email as employee_email
        FROM expenses e
        JOIN users u ON e.employee_id = u.id
        WHERE e.status = 'pending_manager_approval' 
          AND (e.manager1_id = $1 OR e.manager2_id = $1 OR e.manager3_id = $1)
        ORDER BY e.created_at ASC
      `,
        [managerId]
      );

      return res.json(result.rows);
    }

    const departmentId = departmentResult.rows[0].id;

    // Get expense requests from employees in manager's department
    const result = await pool.query(
      `
      SELECT 
        e.*, 
        u.email as employee_email,
        em.employee_name,
        d.name as department_name
      FROM expenses e
      JOIN users u ON e.employee_id = u.id
      JOIN employee_master em ON em.company_email = u.email
      JOIN departments d ON em.department_id = d.id
      WHERE e.status = 'pending_manager_approval' 
        AND d.id = $1
        AND d.manager_id = $2
      ORDER BY e.created_at ASC
    `,
      [departmentId, req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching pending expense requests:", error);
    res.status(500).json({ error: "Failed to fetch pending expense requests" });
  }
});

// Manager approval/rejection (UI-based)
router.put(
  "/manager/:id/approve",
  authenticateToken,
  [
    body("action")
      .isIn(["approve", "reject"])
      .withMessage("Action must be approve or reject"),
    body("notes").optional(),
  ],
  async (req, res) => {
    try {
      if (req.user.role !== "manager") {
        return res
          .status(403)
          .json({ error: "Access denied. Manager role required." });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { action, notes } = req.body;
      const managerId = req.user.userId;

      // Get manager details
      const managerResult = await pool.query(
        `
        SELECT first_name, last_name FROM users WHERE id = $1
      `,
        [managerId]
      );
      const managerName = `${managerResult.rows[0].first_name} ${managerResult.rows[0].last_name}`;

      // First, get the current expense request to check manager assignments
      const expenseRequestResult = await pool.query(
        `
        SELECT * FROM expenses WHERE id = $1
      `,
        [id]
      );

      if (expenseRequestResult.rows.length === 0) {
        return res.status(404).json({ error: "Expense request not found" });
      }

      const expenseRequest = expenseRequestResult.rows[0];

      // Check if this manager is assigned to this expense request
      let managerStatusField = null;

      if (
        expenseRequest.manager1_id &&
        expenseRequest.manager1_name === managerName
      ) {
        managerStatusField = "manager1_status";
      } else if (
        expenseRequest.manager2_id &&
        expenseRequest.manager2_name === managerName
      ) {
        managerStatusField = "manager2_status";
      } else if (
        expenseRequest.manager3_id &&
        expenseRequest.manager3_name === managerName
      ) {
        managerStatusField = "manager3_status";
      } else {
        return res.status(403).json({
          error: "You are not assigned as a manager for this expense request",
        });
      }

      // Check if this manager has already processed this request
      const currentStatus = expenseRequest[managerStatusField];
      if (currentStatus === "Approved" || currentStatus === "Rejected") {
        return res.status(400).json({
          error: "Request already processed",
          message: `This request has already been ${currentStatus.toLowerCase()} by you`,
        });
      }

      // Update the specific manager's status
      const newStatus = action === "approve" ? "Approved" : "Rejected";
      const updateResult = await pool.query(
        `
        UPDATE expenses 
        SET 
          ${managerStatusField} = $1,
          ${managerStatusField.replace(
            "_status",
            "_approved_at"
          )} = CURRENT_TIMESTAMP,
          ${managerStatusField.replace("_status", "_approval_notes")} = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `,
        [newStatus, notes, id]
      );

      const updatedExpenseRequest = updateResult.rows[0];

      // Check if all assigned managers have approved (for multi-manager workflow)
      const allManagersApproved = checkAllManagersApproved(
        updatedExpenseRequest
      );
      const anyManagerRejected = checkAnyManagerRejected(updatedExpenseRequest);

      let finalStatus = updatedExpenseRequest.status;
      let shouldNotifyHR = false;

      if (anyManagerRejected) {
        // If any manager rejects, the request is rejected
        finalStatus = "rejected";
        await pool.query(
          `UPDATE expenses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [finalStatus, id]
        );
      } else if (allManagersApproved) {
        // If all assigned managers approve, move to HR approval
        finalStatus = "manager_approved";
        await pool.query(
          `UPDATE expenses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [finalStatus, id]
        );
        shouldNotifyHR = true;
      } else {
        // Update status to show partial approval
        const approvedCount = getApprovedManagerCount(updatedExpenseRequest);
        const totalManagers = getTotalManagerCount(updatedExpenseRequest);
        finalStatus = `Partially Approved (${approvedCount}/${totalManagers})`;
        await pool.query(
          `UPDATE expenses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [finalStatus, id]
        );
      }

      // If all managers approved, notify HR
      if (shouldNotifyHR) {
        const hrUsers = await getHRUsers();

        for (const hr of hrUsers) {
          try {
            await sendManagerApprovalToHR(
              hr.email,
              {
                id: expenseRequest.id,
                employeeName: expenseRequest.employee_name,
                employeeEmail: expenseRequest.employee_email || "Not available",
                expenseCategory: expenseRequest.expense_category,
                expenseType: expenseRequest.expense_type,
                amount: expenseRequest.amount,
                currency: expenseRequest.currency,
                description: expenseRequest.description,
                expenseDate: expenseRequest.expense_date,
                attachmentUrl: expenseRequest.attachment_url,
                attachmentName: expenseRequest.attachment_name,
              },
              managerName
            );
          } catch (emailError) {
            console.error(
              "❌ Failed to send HR notification email:",
              emailError
            );
            // Continue with other HR users even if one email fails
          }
        }
      }

      res.json({
        message: `Expense request ${action}d successfully`,
        expenseRequest: updatedExpenseRequest,
        status: finalStatus,
        managerStatus: newStatus,
      });
    } catch (error) {
      console.error("❌ Error processing manager approval:", error);
      res.status(500).json({
        error: "Failed to process approval",
        details: error.message,
      });
    }
  }
);

// Get HR-approved expense requests
router.get("/hr/pending", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "hr") {
      return res
        .status(403)
        .json({ error: "Access denied. HR role required." });
    }

    const result = await pool.query(`
      SELECT 
        e.*, 
        u.email as employee_email,
        CASE 
          WHEN e.manager1_id IS NOT NULL THEN
            CONCAT(
              'Manager 1: ', e.manager1_name, ' (', e.manager1_status, ')',
              CASE WHEN e.manager2_id IS NOT NULL THEN 
                CONCAT(' | Manager 2: ', e.manager2_name, ' (', e.manager2_status, ')')
              ELSE '' END,
              CASE WHEN e.manager3_id IS NOT NULL THEN 
                CONCAT(' | Manager 3: ', e.manager3_name, ' (', e.manager3_status, ')')
              ELSE '' END
            )
          ELSE 'No managers assigned'
        END as manager_approval_status
      FROM expenses e
      JOIN users u ON e.employee_id = u.id
      WHERE e.status = 'manager_approved'
      ORDER BY e.created_at ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching HR pending expense requests:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch HR pending expense requests" });
  }
});

// HR approval/rejection
router.put(
  "/hr/:id/approve",
  authenticateToken,
  [
    body("action")
      .isIn(["approve", "reject"])
      .withMessage("Action must be approve or reject"),
    body("notes").optional(),
  ],
  async (req, res) => {
    try {
      if (req.user.role !== "hr") {
        return res
          .status(403)
          .json({ error: "Access denied. HR role required." });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { action, notes } = req.body;
      const hrId = req.user.userId;

      // Get HR details
      const hrResult = await pool.query(
        `
        SELECT first_name, last_name FROM users WHERE id = $1
      `,
        [hrId]
      );
      const hrName = `${hrResult.rows[0].first_name} ${hrResult.rows[0].last_name}`;

      // Update expense request with timeout
      const status = action === "approve" ? "approved" : "rejected";

      // Add timeout wrapper for database operations
      const dbTimeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Database operation timeout after 5 seconds")),
          5000
        );
      });

      const updateResult = await Promise.race([
        pool.query(
          `
          UPDATE expenses 
          SET 
            status = $1,
            hr_id = $2,
            hr_name = $3,
            hr_approved_at = CURRENT_TIMESTAMP,
            hr_approval_notes = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING *
        `,
          [status, hrId, hrName, notes, id]
        ),
        dbTimeoutPromise,
      ]);

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: "Expense request not found" });
      }

      const expenseRequest = updateResult.rows[0];

      // Notify employee (non-blocking)
      const employeeResult = await Promise.race([
        pool.query(
          `
          SELECT email FROM users WHERE id = $1
        `,
          [expenseRequest.employee_id]
        ),
        dbTimeoutPromise,
      ]);

      if (employeeResult.rows.length > 0) {
        // Send email notification asynchronously to avoid blocking the response
        sendExpenseApprovalToEmployee(
          employeeResult.rows[0].email,
          expenseRequest,
          status,
          hrName
        ).catch((err) => {
          console.error("❌ Email notification failed (non-critical):", err);
        });
      }

      res.json({
        message: `Expense request ${action}d successfully`,
        expenseRequest,
      });
    } catch (error) {
      console.error("❌ Error processing HR approval:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to process approval";
      let statusCode = 500;

      if (error.message.includes("timeout")) {
        errorMessage = "Operation timed out. Please try again.";
        statusCode = 408;
      } else if (error.message.includes("connection")) {
        errorMessage = "Database connection error. Please try again.";
        statusCode = 503;
      } else if (error.message.includes("email")) {
        errorMessage = "Approval processed but email notification failed.";
        statusCode = 200; // Still return success since the main operation worked
      }

      res.status(statusCode).json({
        error: errorMessage,
        details: error.message,
      });
    }
  }
);

// Get all expense requests (for admin/HR overview)
router.get("/all", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "hr") {
      return res
        .status(403)
        .json({ error: "Access denied. HR role required." });
    }

    const result = await pool.query(`
      SELECT 
        e.*, 
        u.email as employee_email,
        CASE 
          WHEN e.manager1_id IS NOT NULL THEN
            CONCAT(
              'Manager 1: ', e.manager1_name, ' (', e.manager1_status, ')',
              CASE WHEN e.manager2_id IS NOT NULL THEN 
                CONCAT(' | Manager 2: ', e.manager2_name, ' (', e.manager2_status, ')')
              ELSE '' END,
              CASE WHEN e.manager3_id IS NOT NULL THEN 
                CONCAT(' | Manager 3: ', e.manager3_name, ' (', e.manager3_status, ')')
              ELSE '' END
            )
          ELSE 'No managers assigned'
        END as manager_approval_status
      FROM expenses e
      JOIN users u ON e.employee_id = u.id
      ORDER BY e.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all expense requests:", error);
    res.status(500).json({ error: "Failed to fetch expense requests" });
  }
});

// Delete an expense request (HR only)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "hr") {
      return res
        .status(403)
        .json({ error: "Access denied. HR role required." });
    }

    const { id } = req.params;
    const exists = await pool.query("SELECT id FROM expenses WHERE id = $1", [
      id,
    ]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: "Expense request not found" });
    }

    await pool.query("DELETE FROM expenses WHERE id = $1", [id]);
    res.json({ message: "Expense request deleted" });
  } catch (error) {
    console.error("Delete expense request error:", error);
    res.status(500).json({ error: "Failed to delete expense request" });
  }
});

// Email-based approval endpoint (for managers clicking from email)
router.get("/approve/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, token } = req.query;

    if (!action || !token) {
      return res.status(400).json({
        error: "Missing action or token",
        message:
          "Please provide both action (approve/reject) and token parameters",
      });
    }

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        error: "Invalid action",
        message: "Action must be either 'approve' or 'reject'",
      });
    }

    // Verify the approval token
    const tokenResult = await pool.query(
      `SELECT * FROM expenses WHERE id = $1 AND approval_token = $2`,
      [id, token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid token",
        message: "The approval link is invalid or has expired",
      });
    }

    const expense = tokenResult.rows[0];

    // Determine which manager is approving based on the token and their current status
    let managerField = "";
    let managerId = "";
    let managerName = "";

    // Check which manager this token belongs to and if they still have pending approval
    if (expense.manager1_id && expense.manager1_status === "Pending") {
      managerField = "manager1";
      managerId = expense.manager1_id;
      managerName = expense.manager1_name;
    } else if (expense.manager2_id && expense.manager2_status === "Pending") {
      managerField = "manager2";
      managerId = expense.manager2_id;
      managerName = expense.manager2_name;
    } else if (expense.manager3_id && expense.manager3_status === "Pending") {
      managerField = "manager3";
      managerId = expense.manager3_id;
      managerName = expense.manager3_name;
    } else {
      // Check if the expense is already fully processed
      if (
        expense.status === "approved" ||
        expense.status === "rejected" ||
        expense.status === "manager_approved"
      ) {
        return res.status(400).json({
          error: "Request already processed",
          message: "This expense request has already been fully processed",
        });
      }

      return res.status(400).json({
        error: "No pending approval",
        message:
          "No pending approval found for this manager or you have already processed this request",
      });
    }

    // Check if the expense is still in a state where manager approvals are valid
    if (
      expense.status !== "pending_manager_approval" &&
      expense.status !== "pending"
    ) {
      return res.status(400).json({
        error: "Request already processed",
        message: "This expense request has already been processed",
      });
    }

    // Update the specific manager's approval status
    const updateQuery = `
      UPDATE expenses 
      SET ${managerField}_status = $1, 
          ${managerField}_approved_at = CURRENT_TIMESTAMP,
          ${managerField}_approval_notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;

    await pool.query(updateQuery, [
      action === "approve" ? "Approved" : "Rejected",
      `Approved via email by ${managerName}`,
      id,
    ]);

    // Check if all managers have approved (for multi-manager workflow)
    const updatedExpense = await pool.query(
      "SELECT * FROM expenses WHERE id = $1",
      [id]
    );

    const expenseData = updatedExpense.rows[0];
    let finalStatus = "pending_manager_approval"; // Default to pending manager approval

    if (action === "approve") {
      // Check if all assigned managers have approved
      const allManagersApproved =
        (!expenseData.manager1_id ||
          expenseData.manager1_status === "Approved") &&
        (!expenseData.manager2_id ||
          expenseData.manager2_status === "Approved") &&
        (!expenseData.manager3_id ||
          expenseData.manager3_status === "Approved");

      if (allManagersApproved) {
        // If all assigned managers approve, move to HR approval
        finalStatus = "manager_approved";
        await pool.query(
          "UPDATE expenses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [finalStatus, id]
        );

        // Notify HR
        const hrUsers = await pool.query(
          "SELECT * FROM users WHERE role = 'hr'"
        );

        if (hrUsers.rows.length > 0) {
          const hrUser = hrUsers.rows[0];
          await sendManagerApprovalToHR(
            hrUser.email,
            {
              id: expenseData.id,
              employeeName: expenseData.employee_name,
              employeeEmail: expenseData.employee_name, // You might want to get actual email
              expenseCategory: expenseData.expense_category,
              expenseType: expenseData.expense_type,
              amount: expenseData.amount,
              currency: expenseData.currency,
              expenseDate: expenseData.expense_date,
              description: expenseData.description,
              attachmentName: expenseData.attachment_name,
              managerName: managerName,
            },
            managerName
          );
        }
      }
    } else {
      // If any manager rejects, set status to rejected
      finalStatus = "rejected";
      await pool.query(
        "UPDATE expenses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [finalStatus, id]
      );

      // Notify employee of rejection
      const employee = await pool.query("SELECT * FROM users WHERE id = $1", [
        expenseData.employee_id,
      ]);

      if (employee.rows.length > 0) {
        await sendExpenseApprovalToEmployee(
          expenseData,
          "rejected",
          managerName,
          employee.rows[0].email
        );
      }
    }

    // Serve success page with data
    const successData = {
      success: true,
      action: action,
      status: finalStatus,
      manager: managerName,
      employee: expenseData.employee_name,
      category: expenseData.expense_category,
      amount: `${expenseData.currency} ${expenseData.amount}`,
      message: `Expense request ${action}d successfully`,
    };

    // Serve the success page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Expense Request ${
            action === "approve" ? "Approved" : "Rejected"
          }</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .success-icon { background: linear-gradient(135deg, #10b981, #059669); }
              .reject-icon { background: linear-gradient(135deg, #ef4444, #dc2626); }
              .fade-in { animation: fadeIn 0.5s ease-in; }
              @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
              }
          </style>
      </head>
      <body class="bg-gray-50 min-h-screen flex items-center justify-center">
          <div class="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8 fade-in">
              <!-- Success Icon and Title -->
              <div class="text-center mb-6">
                  <div class="w-16 h-16 ${
                    action === "approve" ? "success-icon" : "reject-icon"
                  } rounded-full flex items-center justify-center mx-auto mb-4">
                      <i class="fas ${
                        action === "approve"
                          ? "fa-check text-2xl text-white"
                          : "fa-times text-2xl text-white"
                      }"></i>
                  </div>
                  <h1 class="text-2xl font-bold ${
                    action === "approve" ? "text-green-600" : "text-red-600"
                  } mb-2">
                      Expense Request ${
                        action === "approve" ? "Approved" : "Rejected"
                      }!
                  </h1>
                  <p class="text-gray-600 text-sm leading-relaxed">
                      You have successfully ${
                        action === "approve" ? "approved" : "rejected"
                      } the expense request from <strong>${
      expenseData.employee_name
    }</strong>.
                  </p>
                  <p class="text-gray-600 text-sm mt-2">
                      ${
                        action === "approve"
                          ? finalStatus === "manager_approved"
                            ? "The request has been forwarded to HR for final approval."
                            : "Waiting for other managers to approve."
                          : "The employee has been notified of the rejection."
                      }
                  </p>
              </div>

              <!-- Call to Action Button -->
              <div class="text-center">
                  <button onclick="window.close()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200">
                      Close Window
                  </button>
              </div>
          </body>
          </html>
    `);
  } catch (error) {
    console.error("Email approval error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to process approval",
    });
  }
});

// Get expense analytics (HR only)
router.get("/analytics", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "hr") {
      return res
        .status(403)
        .json({ error: "Access denied. HR role required." });
    }

    const { period = "current_year" } = req.query;

    // Build date filter based on period
    let dateFilter = "";

    if (period === "current_year") {
      dateFilter =
        "WHERE EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)";
    } else if (period === "current_month") {
      dateFilter =
        "WHERE EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)";
    } else if (period === "last_30_days") {
      dateFilter = "WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'";
    } else if (period === "all_years") {
      dateFilter = ""; // No date filter - show all data
    }

    // Get analytics data
    const [
      categoryStats,
      projectStats,
      clientStats,
      monthlyTrends,
      totalStats,
    ] = await Promise.all([
      // Category breakdown
      pool.query(`
        SELECT 
          expense_category,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM expenses 
        ${dateFilter}
        AND status = 'approved'
        GROUP BY expense_category
        ORDER BY total_amount DESC
      `),

      // Project breakdown
      pool.query(`
        SELECT 
          COALESCE(project_reference, 'No Project') as project,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM expenses 
        ${dateFilter}
        AND status = 'approved'
        GROUP BY project_reference
        ORDER BY total_amount DESC
        LIMIT 10
      `),

      // Client breakdown
      pool.query(`
        SELECT 
          COALESCE(client_code, 'No Client') as client,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM expenses 
        ${dateFilter}
        AND status = 'approved'
        GROUP BY client_code
        ORDER BY total_amount DESC
        LIMIT 10
      `),

      // Monthly trends
      pool.query(`
        SELECT 
          EXTRACT(YEAR FROM expense_date) as year,
          EXTRACT(MONTH FROM expense_date) as month,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM expenses 
        ${dateFilter}
        AND status = 'approved'
        GROUP BY EXTRACT(YEAR FROM expense_date), EXTRACT(MONTH FROM expense_date)
        ORDER BY year, month
      `),

      // Total statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount
        FROM expenses 
        ${dateFilter}
        AND status = 'approved'
      `),
    ]);

    res.json({
      categoryStats: categoryStats.rows,
      projectStats: projectStats.rows,
      clientStats: clientStats.rows,
      monthlyTrends: monthlyTrends.rows,
      totalStats: totalStats.rows[0],
      period,
    });
  } catch (error) {
    console.error("Error fetching expense analytics:", error);
    res.status(500).json({ error: "Failed to fetch expense analytics" });
  }
});

// Export expenses to Excel (HR only)
router.get("/export", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "hr") {
      return res
        .status(403)
        .json({ error: "Access denied. HR role required." });
    }

    const { format = "excel", period = "current_year" } = req.query;

    // Build date filter
    let dateFilter = "";
    if (period === "current_year") {
      dateFilter =
        "WHERE EXTRACT(YEAR FROM e.expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)";
    } else if (period === "current_month") {
      dateFilter =
        "WHERE EXTRACT(YEAR FROM e.expense_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM e.expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)";
    }

    // Get expenses data
    const result = await pool.query(`
      SELECT 
        e.series,
        e.employee_name,
        e.expense_category,
        e.expense_type,
        e.amount,
        e.currency,
        e.description,
        e.expense_date,
        e.project_reference,
        e.client_code,
        e.payment_mode,
        e.status,
        e.created_at,
        e.manager1_name,
        e.manager1_status,
        e.manager2_name,
        e.manager2_status,
        e.manager3_name,
        e.manager3_status,
        e.hr_name,
        e.hr_approved_at
      FROM expenses e
      ${dateFilter}
      ORDER BY e.created_at DESC
    `);

    if (format === "excel") {
      // For Excel export, we'll return JSON data that can be converted to Excel on the frontend
      res.json({
        data: result.rows,
        headers: [
          "Series",
          "Employee Name",
          "Category",
          "Type",
          "Amount",
          "Currency",
          "Description",
          "Expense Date",
          "Project",
          "Client Code",
          "Payment Mode",
          "Status",
          "Created At",
          "Manager 1",
          "Manager 1 Status",
          "Manager 2",
          "Manager 2 Status",
          "Manager 3",
          "Manager 3 Status",
          "HR Name",
          "HR Approved At",
        ],
      });
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error("Error exporting expenses:", error);
    res.status(500).json({ error: "Failed to export expenses" });
  }
});

// Get hierarchy report (HR only)
router.get("/hierarchy-export", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "hr") {
      return res
        .status(403)
        .json({ error: "Access denied. HR role required." });
    }

    const result = await pool.query(`
      SELECT 
        em.employee_id,
        em.employee_name,
        em.company_email,
        em.manager_id,
        em.manager_name,
        em.manager2_id,
        em.manager2_name,
        em.manager3_id,
        em.manager3_name,
        em.department,
        em.designation,
        em.status,
        u.id as user_id,
        u.role
      FROM employee_master em
      LEFT JOIN users u ON u.email = em.company_email
      WHERE em.status = 'active'
      ORDER BY em.department, em.employee_name
    `);

    res.json({
      data: result.rows,
      headers: [
        "Employee ID",
        "Employee Name",
        "Company Email",
        "Department",
        "Designation",
        "Manager 1 ID",
        "Manager 1 Name",
        "Manager 2 ID",
        "Manager 2 Name",
        "Manager 3 ID",
        "Manager 3 Name",
        "Status",
        "User ID",
        "Role",
      ],
    });
  } catch (error) {
    console.error("Error exporting hierarchy:", error);
    res.status(500).json({ error: "Failed to export hierarchy" });
  }
});

// Get employee expenses - Missing endpoint
router.get(
  "/employee",
  [authenticateToken, requireEmployee],
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM expense_requests WHERE employee_id = $1 ORDER BY created_at DESC`,
        [req.user.userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get employee expenses error:", error);
      res.status(500).json({ error: "Failed to get expenses" });
    }
  }
);

// Get HR expenses - Missing endpoint
router.get("/hr", [authenticateToken, requireHR], async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT er.*, u.first_name, u.last_name, u.email 
       FROM expense_requests er 
       JOIN users u ON er.employee_id = u.id 
       ORDER BY er.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get HR expenses error:", error);
    res.status(500).json({ error: "Failed to get expenses" });
  }
});

// Create expense request - Missing endpoint
router.post(
  "/requests",
  [authenticateToken, requireEmployee],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { expense_type, amount, description, date } = req.body;

      const result = await pool.query(
        `INSERT INTO expense_requests (employee_id, expense_type, amount, description, date, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
        [req.user.userId, expense_type, amount, description, date]
      );

      res.json({
        message: "Expense request created successfully",
        expense: result.rows[0],
      });
    } catch (error) {
      console.error("Create expense request error:", error);
      res.status(500).json({ error: "Failed to create expense request" });
    }
  }
);

module.exports = router;
