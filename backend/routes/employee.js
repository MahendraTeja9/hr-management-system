const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../config/database");
const { authenticateToken, requireEmployee } = require("../middleware/auth");

const router = express.Router();

// Public onboarding endpoint (no authentication required)
router.post(
  "/public/onboarding-form",
  [body("formData").isObject(), body("files").optional().isArray()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { formData, files = [] } = req.body;

      // Validate phone number uniqueness on server side
      const phoneNumbers = [
        formData.phone,
        formData.emergencyContact?.phone,
        formData.emergencyContact2?.phone,
      ].filter((phone) => phone && phone.trim() !== "");

      const uniquePhoneNumbers = new Set(phoneNumbers);
      if (uniquePhoneNumbers.size !== phoneNumbers.length) {
        return res.status(400).json({
          error:
            "All phone numbers (employee, emergency contact 1, and emergency contact 2) must be different",
        });
      }

      // Try to find user by email first, then by name and phone
      let userResult = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [formData.email]
      );

      // If not found by email, try to find by name and phone
      if (userResult.rows.length === 0) {
        // Split name into first and last name
        const nameParts = formData.name.trim().split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";

        userResult = await pool.query(
          "SELECT id FROM users WHERE first_name = $1 AND last_name = $2",
          [firstName, lastName]
        );
      }

      if (userResult.rows.length === 0) {
        return res.status(400).json({
          error:
            "User not found. Please contact HR to create your account first.",
        });
      }

      const userId = userResult.rows[0].id;

      // Check if form already exists
      const existingForm = await pool.query(
        "SELECT id, status, type FROM employee_forms WHERE employee_id = $1 ORDER BY submitted_at DESC LIMIT 1",
        [userId]
      );

      if (existingForm.rows.length > 0) {
        const form = existingForm.rows[0];

        // If form is already submitted, don't allow updates
        if (
          form.status === "submitted" ||
          form.status === "approved" ||
          form.status === "rejected"
        ) {
          return res
            .status(400)
            .json({ error: "Onboarding form already submitted" });
        }

        // If form is in draft status, update it instead of creating new
        if (form.status === "draft") {
          await pool.query(
            `
            UPDATE employee_forms 
            SET form_data = $2, files = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
            [form.id, formData, files]
          );

          res.json({
            message: "Onboarding form updated successfully",
            status: "draft",
            userId: userId,
          });
          return;
        }

        // If form is in pending status, update it with form data
        if (form.status === "pending") {
          await pool.query(
            `
            UPDATE employee_forms 
            SET form_data = $2, files = $3, status = 'draft', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
            [form.id, formData, files]
          );

          res.json({
            message: "Onboarding form submitted successfully",
            status: "draft",
            userId: userId,
          });
          return;
        }
      }

      // If no existing form, create a new one
      await pool.query(
        `
      INSERT INTO employee_forms (employee_id, form_data, files, status)
      VALUES ($1, $2, $3, 'draft')
    `,
        [userId, formData, files]
      );

      res.json({
        message: "Onboarding form submitted successfully",
        status: "draft",
        userId: userId,
      });
    } catch (error) {
      console.error("Public onboarding form error:", error);
      res.status(500).json({ error: "Failed to submit form" });
    }
  }
);

// Public endpoint to help employees find their account
router.post("/public/find-account", async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        error: "Name and phone number are required",
      });
    }

    // Try to find user by name and phone
    const userResult = await pool.query(
      "SELECT id, email, first_name, last_name FROM users WHERE first_name = $1 AND last_name = $2",
      [name.split(" ")[0], name.split(" ").slice(1).join(" ")]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error:
          "Account not found. Please contact HR to create your account first.",
      });
    }

    const user = userResult.rows[0];

    res.json({
      message: "Account found",
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    });
  } catch (error) {
    console.error("Find account error:", error);
    res.status(500).json({ error: "Failed to find account" });
  }
});

// Apply authentication to all employee routes except public onboarding
router.use(authenticateToken, requireEmployee);

// Check document completion status
router.get("/document-completion", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get required documents
    const requiredDocs = await pool.query(
      "SELECT document_type, document_name FROM document_templates WHERE is_active = true AND is_required = true"
    );

    // Get uploaded documents for this employee
    const uploadedDocs = await pool.query(
      `
      SELECT document_type, COUNT(*) as count
      FROM employee_documents 
      WHERE employee_id = $1
      GROUP BY document_type
    `,
      [userId]
    );

    const uploadedDocTypes = new Set(
      uploadedDocs.rows.map((doc) => doc.document_type)
    );
    const requiredDocTypes = requiredDocs.rows.map((doc) => doc.document_type);

    const missingDocs = requiredDocs.rows.filter(
      (doc) => !uploadedDocTypes.has(doc.document_type)
    );
    const completedDocs = requiredDocs.rows.filter((doc) =>
      uploadedDocTypes.has(doc.document_type)
    );

    const completionStatus = {
      totalRequired: requiredDocTypes.length,
      completed: completedDocs.length,
      missing: missingDocs.length,
      completionPercentage: Math.round(
        (completedDocs.length / requiredDocTypes.length) * 100
      ),
      canSubmitForm: missingDocs.length === 0,
      canCompleteOnboarding: missingDocs.length === 0,
      requiredDocuments: requiredDocs.rows.map((doc) => ({
        type: doc.document_type,
        name: doc.document_name,
        uploaded: uploadedDocTypes.has(doc.document_type),
      })),
      missingDocuments: missingDocs.map((doc) => ({
        type: doc.document_type,
        name: doc.document_name,
      })),
      uploadedDocuments: uploadedDocs.rows.map((doc) => ({
        type: doc.document_type,
        count: parseInt(doc.count),
      })),
    };

    res.json(completionStatus);
  } catch (error) {
    console.error("Error checking document completion:", error);
    res.status(500).json({ error: "Failed to check document completion" });
  }
});

// Get form status
router.get("/form-status", async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      "SELECT status FROM employee_forms WHERE employee_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ status: "not_started" });
    }

    res.json({ status: result.rows[0].status });
  } catch (error) {
    console.error("Error fetching form status:", error);
    res.status(500).json({ error: "Failed to fetch form status" });
  }
});

// Save draft
router.post("/save-draft", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { documents } = req.body;

    // Check if form exists
    const existingForm = await pool.query(
      "SELECT id, status FROM employee_forms WHERE employee_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [userId]
    );

    if (existingForm.rows.length > 0) {
      const form = existingForm.rows[0];

      // Update existing form to draft status
      await pool.query(
        "UPDATE employee_forms SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [form.id]
      );
    } else {
      // Create new draft form
      await pool.query(
        "INSERT INTO employee_forms (employee_id, form_data, status) VALUES ($1, $2, 'draft')",
        [userId, { documents }]
      );
    }

    res.json({
      message: "Draft saved successfully",
      status: "draft",
    });
  } catch (error) {
    console.error("Error saving draft:", error);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

// Submit form
router.post("/submit-form", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { documents } = req.body;

    // Validate that all required documents are uploaded
    const requiredDocs = await pool.query(
      "SELECT document_type FROM document_templates WHERE is_active = true AND is_required = true"
    );

    const uploadedDocTypes = new Set();
    Object.values(documents)
      .flat()
      .forEach((doc) => {
        uploadedDocTypes.add(doc.document_type);
      });

    const missingDocs = requiredDocs.rows.filter(
      (doc) => !uploadedDocTypes.has(doc.document_type)
    );

    if (missingDocs.length > 0) {
      return res.status(400).json({
        error: "Missing required documents",
        missing: missingDocs.map((doc) => doc.document_type),
      });
    }

    // Check if form exists
    const existingForm = await pool.query(
      "SELECT id, status FROM employee_forms WHERE employee_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [userId]
    );

    if (existingForm.rows.length > 0) {
      const form = existingForm.rows[0];

      // Update existing form to submitted status
      await pool.query(
        "UPDATE employee_forms SET status = 'submitted', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [form.id]
      );
    } else {
      // Create new submitted form
      await pool.query(
        "INSERT INTO employee_forms (employee_id, form_data, status) VALUES ($1, $2, 'submitted')",
        [userId, { documents }]
      );
    }

    res.json({
      message: "Form submitted successfully",
      status: "submitted",
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ error: "Failed to submit form" });
  }
});

// Get employee onboarding status
router.get("/onboarding-status", async (req, res) => {
  try {
    console.log("🔍 Checking onboarding status for user ID:", req.user.userId);

    const result = await pool.query(
      `
      SELECT ef.*, em.status as master_status
      FROM employee_forms ef
      LEFT JOIN users u ON ef.employee_id = u.id
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE ef.employee_id = $1
    `,
      [req.user.userId]
    );

    console.log("🔍 Query result:", result.rows);

    if (result.rows.length === 0) {
      return res.json({
        hasForm: false,
        message: "No onboarding form found. Please complete the form.",
      });
    }

    const form = result.rows[0];
    console.log("🔍 Form found:", form);

    if (form.status === "submitted" && !form.master_status) {
      // Check if documents are uploaded
      try {
        // Get required documents
        const requiredDocs = await pool.query(
          "SELECT document_type FROM document_templates WHERE is_active = true AND is_required = true"
        );

        const docValidationResponse = await pool.query(
          `
          SELECT 
            ed.document_type,
            COUNT(*) as count
          FROM employee_documents ed
          WHERE ed.employee_id = $1
          GROUP BY ed.document_type
        `,
          [req.user.userId]
        );

        const uploadedDocs = docValidationResponse.rows.reduce((acc, doc) => {
          acc[doc.document_type] = doc.count;
          return acc;
        }, {});

        // Check if all required documents are uploaded
        const requiredDocTypes = requiredDocs.rows.map(
          (doc) => doc.document_type
        );
        const missingDocs = requiredDocTypes.filter(
          (docType) => !uploadedDocs[docType] || uploadedDocs[docType] === 0
        );
        const allDocsUploaded = missingDocs.length === 0;

        if (allDocsUploaded) {
          return res.json({
            hasForm: true,
            status: "submitted",
            message:
              "Your form and all required documents are submitted, awaiting HR approval.",
            documentsUploaded: true,
            documentStatus: "All required documents uploaded",
            requiredDocuments: requiredDocTypes,
            uploadedDocuments: Object.keys(uploadedDocs),
          });
        } else {
          return res.json({
            hasForm: true,
            status: "submitted",
            message:
              "Your form is submitted, but required documents are missing. Please upload all required documents to complete onboarding.",
            documentsUploaded: false,
            documentStatus: "Required documents missing",
            missingDocuments: missingDocs,
            requiredDocuments: requiredDocTypes,
            uploadedDocuments: Object.keys(uploadedDocs),
            canCompleteOnboarding: false,
          });
        }
      } catch (docError) {
        console.error("Error checking documents:", docError);
        return res.json({
          hasForm: true,
          status: "submitted",
          message:
            "Your form is submitted, but document status is unknown. Please contact HR.",
          documentsUploaded: false,
          documentStatus: "Document status unknown",
          canCompleteOnboarding: false,
        });
      }
    }

    if (form.master_status === "active" || form.status === "approved") {
      return res.json({
        hasForm: true,
        status: "approved",
        message: "Employee access granted.",
      });
    }

    res.json({
      hasForm: true,
      status: form.status,
      message: `Form status: ${form.status}`,
    });
  } catch (error) {
    console.error("Get onboarding status error:", error);
    res.status(500).json({ error: "Failed to get onboarding status" });
  }
});

// Submit onboarding form
router.post(
  "/onboarding-form",
  [
    body("type").isIn(["Intern", "Contract", "Full-Time", "Manager"]),
    body("formData").isObject(),
    body("files").optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, formData, files = [] } = req.body;

      // Check if form already exists
      const existingForm = await pool.query(
        "SELECT id, status FROM employee_forms WHERE employee_id = $1",
        [req.user.userId]
      );

      if (existingForm.rows.length > 0) {
        const form = existingForm.rows[0];

        // If form is already submitted, don't allow updates
        if (
          form.status === "submitted" ||
          form.status === "approved" ||
          form.status === "rejected"
        ) {
          return res
            .status(400)
            .json({ error: "Onboarding form already submitted" });
        }

        // If form is in draft status, update it instead of creating new
        if (form.status === "draft") {
          await pool.query(
            `
            UPDATE employee_forms 
            SET type = $2, form_data = $3, files = $4, updated_at = CURRENT_TIMESTAMP
            WHERE employee_id = $1
          `,
            [req.user.userId, type, formData, files]
          );

          res.json({
            message: "Onboarding form updated successfully",
            status: "draft",
            userId: req.user.userId,
          });
          return;
        }
      }

      // Insert form with draft status initially
      await pool.query(
        `
      INSERT INTO employee_forms (employee_id, type, form_data, files, status)
      VALUES ($1, $2, $3, $4, 'draft')
    `,
        [req.user.userId, type, formData, files]
      );

      // Get user details for document collection
      const userResult = await pool.query(
        "SELECT first_name, last_name, email FROM users WHERE id = $1",
        [req.user.userId]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const employeeName = `${user.first_name} ${user.last_name}`.trim();

        // Get document templates
        const templatesResult = await pool.query(
          "SELECT document_name, document_type FROM document_templates WHERE is_active = true"
        );

        // Calculate due date (30 days from join date)
        const joinDate = new Date(formData.doj);
        const dueDate = new Date(joinDate);
        dueDate.setDate(dueDate.getDate() + 30);

        // Create document collection records for each template
        for (const template of templatesResult.rows) {
          await pool.query(
            `
            INSERT INTO document_collection (
              employee_id, employee_name, emp_id, department, join_date, due_date,
              document_name, document_type, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `,
            [
              req.user.userId,
              employeeName,
              req.user.userId, // Using user ID as emp_id for now
              formData.department || "N/A",
              formData.doj,
              dueDate.toISOString().split("T")[0],
              template.document_name,
              template.document_type,
              "Pending",
              "Document required for onboarding",
            ]
          );
        }
      }

      res.status(201).json({
        message: "Onboarding form created successfully",
        status: "draft",
        userId: req.user.userId,
      });
    } catch (error) {
      console.error("Submit form error:", error);
      res.status(500).json({ error: "Failed to submit form" });
    }
  }
);

// Submit onboarding form (change status from draft to submitted)
router.post("/onboarding-form/submit", async (req, res) => {
  try {
    // Check if form exists and is in draft status
    const existingForm = await pool.query(
      `
      SELECT id, status FROM employee_forms WHERE employee_id = $1
    `,
      [req.user.userId]
    );

    if (existingForm.rows.length === 0) {
      return res.status(404).json({ error: "Onboarding form not found" });
    }

    const form = existingForm.rows[0];

    if (form.status === "submitted") {
      return res.status(400).json({ error: "Form has already been submitted" });
    }

    if (form.status !== "draft") {
      return res.status(400).json({ error: "Form is not in draft status" });
    }

    // Validate that all required documents are uploaded before allowing submission
    const requiredDocs = await pool.query(
      "SELECT document_type FROM document_templates WHERE is_active = true AND is_required = true"
    );

    // Check uploaded documents for this employee
    const uploadedDocs = await pool.query(
      `
      SELECT document_type FROM employee_documents 
      WHERE employee_id = $1
    `,
      [req.user.userId]
    );

    const uploadedDocTypes = new Set(
      uploadedDocs.rows.map((doc) => doc.document_type)
    );
    const missingDocs = requiredDocs.rows.filter(
      (doc) => !uploadedDocTypes.has(doc.document_type)
    );

    if (missingDocs.length > 0) {
      return res.status(400).json({
        error: "Cannot submit form without required documents",
        message:
          "Please upload all required documents before submitting the form",
        missing: missingDocs.map((doc) => doc.document_type),
        requiredDocuments: requiredDocs.rows.map((doc) => doc.document_type),
      });
    }

    // Update form status to submitted
    await pool.query(
      `
      UPDATE employee_forms 
      SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP
      WHERE employee_id = $1
    `,
      [req.user.userId]
    );

    res.json({
      message: "Onboarding form submitted successfully",
      status: "submitted",
      userId: req.user.userId,
    });
  } catch (error) {
    console.error("Submit form error:", error);
    res.status(500).json({ error: "Failed to submit form" });
  }
});

// Save onboarding form draft (authenticated employees)
router.post("/onboarding-form/save-draft", async (req, res) => {
  try {
    const { formData, files = [] } = req.body;
    const userId = req.user.userId;

    // Check if form already exists
    const existingForm = await pool.query(
      "SELECT id, status FROM employee_forms WHERE employee_id = $1",
      [userId]
    );

    if (existingForm.rows.length > 0) {
      const form = existingForm.rows[0];

      // If form is already submitted, don't allow updates
      if (
        form.status === "submitted" ||
        form.status === "approved" ||
        form.status === "rejected"
      ) {
        return res
          .status(400)
          .json({ error: "Onboarding form already submitted" });
      }

      // Update existing form
      await pool.query(
        `
        UPDATE employee_forms 
        SET form_data = $2, files = $3, status = 'draft', updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $1
      `,
        [userId, formData, files]
      );

      res.json({
        message: "Onboarding form draft saved successfully",
        status: "draft",
        userId: userId,
      });
    } else {
      // Create new draft form
      await pool.query(
        `
        INSERT INTO employee_forms (employee_id, form_data, files, status)
        VALUES ($1, $2, $3, 'draft')
      `,
        [userId, formData, files]
      );

      res.json({
        message: "Onboarding form draft created successfully",
        status: "draft",
        userId: userId,
      });
    }
  } catch (error) {
    console.error("Save draft error:", error);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

// Get onboarding form
router.get("/onboarding-form", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT * FROM employee_forms WHERE employee_id = $1 ORDER BY updated_at DESC LIMIT 1
    `,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        hasForm: false,
        message: "No onboarding form found. Please start filling the form.",
        form: null,
      });
    }

    const form = result.rows[0];

    res.json({
      hasForm: true,
      form: {
        id: form.id,
        employee_id: form.employee_id,
        type: form.type,
        form_data: form.form_data,
        files: form.files,
        status: form.status,
        submitted_at: form.submitted_at,
        updated_at: form.updated_at,
        reviewed_by: form.reviewed_by,
        reviewed_at: form.reviewed_at,
        review_notes: form.review_notes,
      },
      message:
        form.status === "draft"
          ? "You have a saved draft. You can continue editing or submit when ready."
          : `Form status: ${form.status}`,
    });
  } catch (error) {
    console.error("Get form error:", error);
    res.status(500).json({ error: "Failed to get form" });
  }
});

// Update onboarding form (only if not submitted)
router.put(
  "/onboarding-form",
  [
    body("type").isIn(["Intern", "Contract", "Full-Time", "Manager"]),
    body("formData").isObject(),
    body("files").optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, formData, files = [] } = req.body;

      // Check if form exists and is not submitted
      const existingForm = await pool.query(
        `
      SELECT id, status FROM employee_forms WHERE employee_id = $1
    `,
        [req.user.userId]
      );

      if (existingForm.rows.length === 0) {
        return res.status(404).json({ error: "Form not found" });
      }

      if (existingForm.rows[0].status === "submitted") {
        return res.status(400).json({ error: "Cannot update submitted form" });
      }

      // Update form
      await pool.query(
        `
      UPDATE employee_forms 
      SET type = $1, form_data = $2, files = $3, updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $4
    `,
        [type, formData, files, req.user.userId]
      );

      res.json({ message: "Form updated successfully" });
    } catch (error) {
      console.error("Update form error:", error);
      res.status(500).json({ error: "Failed to update form" });
    }
  }
);

// Check if employee is in master table (onboarded)
router.get("/is-onboarded", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT em.* FROM employee_master em
      JOIN users u ON em.company_email = u.email
      WHERE u.id = $1
    `,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ isOnboarded: false });
    }

    res.json({
      isOnboarded: true,
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Check onboarded error:", error);
    res.status(500).json({ error: "Failed to check onboarding status" });
  }
});

// Get employee profile
router.get("/profile", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT u.id, u.email, u.first_name, u.last_name, ef.type, ef.form_data
      FROM users u
      LEFT JOIN employee_forms ef ON u.id = ef.employee_id
      WHERE u.id = $1
    `,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

module.exports = router;
