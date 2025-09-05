const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../config/database.js");
const {
  sendLeaveRequestToManager,
  sendManagerApprovalToHR,
  sendLeaveApprovalToEmployee,
} = require("../utils/mailer.js");
const {
  authenticateToken,
  requireEmployee,
  requireHR,
} = require("../middleware/auth.js");

const router = express.Router();

// Helper function to generate unique series ID
const generateSeriesId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `LR-${timestamp}-${random}`.toUpperCase();
};

// Helper functions for multi-manager approval workflow
const checkAllManagersApproved = (leaveRequest) => {
  const managers = [];
  if (leaveRequest.manager1_id) managers.push(leaveRequest.manager1_status);
  if (leaveRequest.manager2_id) managers.push(leaveRequest.manager2_status);
  if (leaveRequest.manager3_id) managers.push(leaveRequest.manager3_status);

  return (
    managers.length > 0 && managers.every((status) => status === "Approved")
  );
};

const checkAnyManagerRejected = (leaveRequest) => {
  const managers = [];
  if (leaveRequest.manager1_id) managers.push(leaveRequest.manager1_status);
  if (leaveRequest.manager2_id) managers.push(leaveRequest.manager2_status);
  if (leaveRequest.manager3_id) managers.push(leaveRequest.manager3_status);

  return managers.some((status) => status === "Rejected");
};

const getApprovedManagerCount = (leaveRequest) => {
  const managers = [];
  if (leaveRequest.manager1_id) managers.push(leaveRequest.manager1_status);
  if (leaveRequest.manager2_id) managers.push(leaveRequest.manager2_status);
  if (leaveRequest.manager3_id) managers.push(leaveRequest.manager3_status);

  return managers.filter((status) => status === "Approved").length;
};

const getTotalManagerCount = (leaveRequest) => {
  let count = 0;
  if (leaveRequest.manager1_id) count++;
  if (leaveRequest.manager2_id) count++;
  if (leaveRequest.manager3_id) count++;
  return count;
};

// Helper function to get manager's direct reporting manager
const getManagerDirectManager = async (managerId) => {
  try {
    // Get the manager's direct reporting manager from employee_master table
    const managerResult = await pool.query(
      `SELECT em.manager_id, em.manager_name, em.company_email
       FROM employee_master em
       WHERE em.company_email = (
         SELECT email FROM users WHERE id = $1
       )`,
      [managerId]
    );

    if (managerResult.rows.length === 0) {
      console.log("🔍 No direct manager found for manager:", managerId);
      return null;
    }

    const manager = managerResult.rows[0];

    if (!manager.manager_id || !manager.manager_name) {
      console.log("🔍 Manager has no direct reporting manager");
      return null;
    }

    // Get the direct manager's details
    const directManagerResult = await pool.query(
      `SELECT em.employee_name as manager_name, em.company_email, u.id as user_id
       FROM employee_master em
       LEFT JOIN users u ON u.email = em.company_email
       WHERE em.employee_name = $1 AND em.status = 'active'`,
      [manager.manager_name]
    );

    if (directManagerResult.rows.length === 0) {
      console.log("🔍 Direct manager not found in active employees");
      return null;
    }

    const directManager = directManagerResult.rows[0];

    return {
      manager_id: directManager.user_id,
      manager_name: directManager.manager_name,
      email: directManager.company_email,
    };
  } catch (error) {
    console.error("❌ Error getting manager's direct manager:", error);
    return null;
  }
};

// Helper function to calculate leave days
const calculateLeaveDays = (fromDate, toDate, halfDay) => {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return halfDay ? diffDays - 0.5 : diffDays;
};

// Helper function to get employee's managers
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
        // Use company email from employee_master table (HR assigned)
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
        // Use company email from employee_master table (HR assigned)
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
        // Use company email from employee_master table (HR assigned)
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
    console.log(
      "🔍 Manager emails:",
      managers.map((m) => ({ name: m.manager_name, email: m.email }))
    );
    console.log("🔍 Manager count:", managers.length);
    managers.forEach((m, index) => {
      console.log(`🔍 Manager ${index + 1}:`, {
        name: m.manager_name,
        email: m.email,
        id: m.manager_id,
        user_id: m.id,
      });
    });
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

// Get leave types (only active ones for employee use)
router.get("/types", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM leave_types 
      WHERE is_active = true 
      ORDER BY type_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching leave types:", error);
    res.status(500).json({ error: "Failed to fetch leave types" });
  }
});

// Get basic system settings for employees (public endpoint)
router.get("/system-info", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT allow_half_day, total_annual_leaves 
      FROM system_settings 
      ORDER BY id LIMIT 1
    `);

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        allow_half_day: true,
        total_annual_leaves: 15,
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.json({
      allow_half_day: true,
      total_annual_leaves: 15,
    });
  }
});

// Get employee leave balance
router.get("/balance", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const currentYear = new Date().getFullYear();
    const result = await pool.query(
      `
      SELECT * FROM leave_balances 
      WHERE employee_id = $1 AND year = $2
    `,
      [req.user.userId, currentYear]
    );

    if (result.rows.length === 0) {
      // Initialize balance if not exists
      await pool.query(
        `
        INSERT INTO leave_balances (employee_id, year, total_allocated, leaves_taken, leaves_remaining)
        VALUES ($1, $2, 15, 0, 15)
      `,
        [req.user.userId, currentYear]
      );

      res.json({
        total_allocated: 15,
        leaves_taken: 0,
        leaves_remaining: 15,
        year: currentYear,
      });
    } else {
      // Ensure numeric values are returned as numbers
      const balance = result.rows[0];
      res.json({
        total_allocated: parseInt(balance.total_allocated) || 0,
        leaves_taken: parseInt(balance.leaves_taken) || 0,
        leaves_remaining: parseInt(balance.leaves_remaining) || 0,
        year: balance.year,
      });
    }
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    res.status(500).json({ error: "Failed to fetch leave balance" });
  }
});

// Submit leave request
router.post(
  "/submit",
  authenticateToken,
  [
    body("leaveType").notEmpty().withMessage("Leave type is required"),
    body("fromDate").notEmpty().withMessage("From date is required"),
    body("toDate")
      .optional()
      .notEmpty()
      .withMessage("To date must not be empty if provided"),
    body("reason").notEmpty().withMessage("Reason is required"),
    body("halfDay").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      console.log("🔍 Leave request received:", req.body);
      console.log("🔍 Request body types:", {
        leaveType: typeof req.body.leaveType,
        fromDate: typeof req.body.fromDate,
        toDate: typeof req.body.toDate,
        reason: typeof req.body.reason,
        halfDay: typeof req.body.halfDay,
      });
      console.log("🔍 User:", req.user);

      // Manual validation instead of express-validator
      const errors = [];

      if (!req.body.leaveType || req.body.leaveType.trim() === "") {
        errors.push({ field: "leaveType", message: "Leave type is required" });
      }

      if (!req.body.fromDate || req.body.fromDate.trim() === "") {
        errors.push({ field: "fromDate", message: "From date is required" });
      }

      if (req.body.toDate && req.body.toDate.trim() === "") {
        errors.push({
          field: "toDate",
          message: "To date must not be empty if provided",
        });
      }

      if (!req.body.reason || req.body.reason.trim() === "") {
        errors.push({ field: "reason", message: "Reason is required" });
      }

      if (errors.length > 0) {
        console.log("❌ Manual validation errors:", errors);
        return res.status(400).json({ errors: errors });
      }

      const {
        leaveType,
        fromDate,
        toDate,
        reason,
        halfDay = false,
        role = "employee",
      } = req.body;
      const employeeId = req.user.userId;

      // Validate and convert dates
      let validatedFromDate, validatedToDate;

      try {
        validatedFromDate = new Date(fromDate);
        if (isNaN(validatedFromDate.getTime())) {
          return res.status(400).json({
            error: "Invalid from date format. Please use YYYY-MM-DD format.",
          });
        }

        if (toDate) {
          validatedToDate = new Date(toDate);
          if (isNaN(validatedToDate.getTime())) {
            return res.status(400).json({
              error: "Invalid to date format. Please use YYYY-MM-DD format.",
            });
          }
        }
      } catch (error) {
        return res.status(400).json({
          error: "Invalid date format. Please use YYYY-MM-DD format.",
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

      // Get current leave balance
      const currentYear = new Date().getFullYear();
      const balanceResult = await pool.query(
        `
      SELECT leaves_remaining FROM leave_balances 
      WHERE employee_id = $1 AND year = $2
    `,
        [employeeId, currentYear]
      );

      const leaveBalanceBefore = balanceResult.rows[0]?.leaves_remaining || 27;

      // Calculate total leave days
      const totalLeaveDays = toDate
        ? calculateLeaveDays(
            validatedFromDate.toISOString().split("T")[0],
            validatedToDate.toISOString().split("T")[0],
            halfDay
          )
        : halfDay
        ? 0.5
        : 1;

      // Check if employee has enough leave balance
      if (totalLeaveDays > leaveBalanceBefore) {
        return res.status(400).json({
          error: `Insufficient leave balance. You have ${leaveBalanceBefore} days remaining, but requesting ${totalLeaveDays} days.`,
        });
      }

      // Generate unique series ID
      const series = generateSeriesId();

      // Generate approval token for email links
      const approvalToken = require("crypto").randomBytes(32).toString("hex");

      // Get employee's manager
      const managers = await getEmployeeManagers(employeeId);
      console.log("🔍 Retrieved managers:", managers);

      // Insert leave request with manager information
      const insertResult = await pool.query(
        `
      INSERT INTO leave_requests (
        series, employee_id, employee_name, leave_type, leave_balance_before,
        from_date, to_date, half_day, total_leave_days, reason, 
        status, role, approval_token,
        manager1_id, manager1_name, manager1_status,
        manager2_id, manager2_name, manager2_status,
        manager3_id, manager3_name, manager3_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `,
        [
          series,
          employeeId,
          employeeName,
          leaveType,
          leaveBalanceBefore,
          validatedFromDate.toISOString().split("T")[0],
          validatedToDate ? validatedToDate.toISOString().split("T")[0] : null,
          halfDay,
          totalLeaveDays,
          reason,
          role === "manager"
            ? "Pending HR Approval"
            : "Pending Manager Approval", // Managers go directly to HR
          role,
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

      const leaveRequest = insertResult.rows[0];

      // Handle email notifications based on role
      if (role === "manager") {
        // For manager requests, send to their direct manager first
        console.log("📧 Manager leave request - sending to direct manager");

        const directManager = await getManagerDirectManager(employeeId);

        if (directManager) {
          console.log(
            "📧 Sending manager leave request to direct manager:",
            directManager.email
          );

          const emailData = {
            id: leaveRequest.id,
            employeeName,
            employeeEmail: employee.email,
            leaveType,
            fromDate,
            toDate,
            totalDays: totalLeaveDays,
            reason,
            approvalToken,
            isManagerRequest: true,
          };

          // Send email to direct manager for manager requests
          sendLeaveRequestToManager(directManager.email, emailData)
            .then((emailResult) => {
              console.log(
                "📧 Email sent to direct manager for manager request:",
                emailResult
              );
            })
            .catch((emailError) => {
              console.error(
                "❌ Email sending to direct manager failed:",
                emailError
              );
            });
        } else {
          // If no direct manager, send to HR
          console.log("📧 No direct manager found - sending to HR");
          const hrEmail = "hr@nxzen.com";

          const emailData = {
            id: leaveRequest.id,
            employeeName,
            employeeEmail: employee.email,
            leaveType,
            fromDate,
            toDate,
            totalDays: totalLeaveDays,
            reason,
            approvalToken,
            isManagerRequest: true,
          };

          sendLeaveRequestToManager(hrEmail, emailData)
            .then((emailResult) => {
              console.log(
                "📧 Email sent to HR for manager request:",
                emailResult
              );
            })
            .catch((emailError) => {
              console.error("❌ Email sending to HR failed:", emailError);
            });
        }
      } else {
        // For employee requests, send to manager as before
        console.log("🔍 Managers found:", managers);
        if (managers && managers.length > 0) {
          // Only send email to the primary manager (first manager in the array)
          const primaryManager = managers[0];
          console.log(
            "📧 Sending email to PRIMARY manager only:",
            primaryManager.email
          );

          const emailData = {
            id: leaveRequest.id,
            employeeName,
            employeeEmail: employee.email, // Add employee email for reply-to functionality
            leaveType,
            fromDate,
            toDate,
            totalDays: totalLeaveDays,
            reason,
            approvalToken,
            totalManagers: managers.length,
            primaryManagerOnly: true, // Flag to indicate this is primary manager only
          };

          // Send email ONLY to primary manager
          sendLeaveRequestToManager(primaryManager.email, emailData)
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
      }

      res.status(201).json({
        message: "Leave request submitted successfully",
        leaveRequest,
        series,
      });
    } catch (error) {
      console.error("❌ Error submitting leave request:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail,
      });
      res.status(500).json({
        error: "Failed to submit leave request",
        details: error.message,
      });
    }
  }
);

// Get employee's leave requests with all manager info
router.get("/my-requests", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 Fetching leave requests for user ID:", req.user.userId);

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
      FROM leave_requests
      WHERE employee_id = $1 
      ORDER BY created_at DESC
    `,
      [req.user.userId]
    );

    console.log(
      "🔍 Leave requests with manager data:",
      result.rows.map((r) => ({
        id: r.id,
        from_date: r.from_date,
        manager_name: r.manager_name,
        current_manager_name: r.current_manager_name,
      }))
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
});

// Get pending leave requests for manager (filtered by department)
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
          lrm.*, 
          u.email as employee_email,
          lrm.current_manager_name as manager_name
        FROM leave_requests_with_manager lrm
        JOIN users u ON lrm.employee_id = u.id
        WHERE lrm.status = 'Pending Manager Approval' 
          AND lrm.current_manager_id = $1
        ORDER BY lrm.created_at ASC
      `,
        [managerId]
      );

      return res.json(result.rows);
    }

    const departmentId = departmentResult.rows[0].id;

    // Get leave requests from employees in manager's department
    const result = await pool.query(
      `
      SELECT 
        lr.*, 
        u.email as employee_email,
        em.employee_name,
        d.name as department_name
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      JOIN employee_master em ON em.company_email = u.email
      JOIN departments d ON em.department_id = d.id
      WHERE lr.status = 'Pending Manager Approval' 
        AND d.id = $1
        AND d.manager_id = $2
      ORDER BY lr.created_at ASC
    `,
      [departmentId, req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching pending leave requests:", error);
    res.status(500).json({ error: "Failed to fetch pending leave requests" });
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
      `SELECT * FROM leave_requests WHERE id = $1 AND approval_token = $2`,
      [id, token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid or expired token",
        message: "The approval link is invalid or has expired",
      });
    }

    const leaveRequest = tokenResult.rows[0];

    // Check if already processed (allow partial approvals to continue)
    if (
      leaveRequest.status === "rejected" ||
      leaveRequest.status === "hr_approved"
    ) {
      return res.status(400).json({
        error: "Request already processed",
        message: `This request has already been ${leaveRequest.status.toLowerCase()}`,
      });
    }

    // For email-based approval, we need to identify which manager is approving
    // This is tricky since we don't have the manager's user ID from the email link
    // We'll need to match by manager name or use a different approach

    // For now, let's use a simplified approach - update the first available manager status
    let managerStatusField = null;
    let managerName = "Manager";

    if (
      leaveRequest.manager1_id &&
      leaveRequest.manager1_status === "Pending"
    ) {
      managerStatusField = "manager1_status";
      managerName = leaveRequest.manager1_name;
    } else if (
      leaveRequest.manager2_id &&
      leaveRequest.manager2_status === "Pending"
    ) {
      managerStatusField = "manager2_status";
      managerName = leaveRequest.manager2_name;
    } else if (
      leaveRequest.manager3_id &&
      leaveRequest.manager3_status === "Pending"
    ) {
      managerStatusField = "manager3_status";
      managerName = leaveRequest.manager3_name;
    } else {
      return res.status(400).json({
        error: "No pending manager approval",
        message: "All assigned managers have already processed this request",
      });
    }

    // Update the specific manager's status
    const newStatus = action === "approve" ? "Approved" : "Rejected";
    const updateResult = await pool.query(
      `UPDATE leave_requests 
       SET ${managerStatusField} = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [newStatus, id]
    );

    const updatedRequest = updateResult.rows[0];

    // Check if all assigned managers have approved (for multi-manager workflow)
    const allManagersApproved = checkAllManagersApproved(updatedRequest);
    const anyManagerRejected = checkAnyManagerRejected(updatedRequest);

    let finalStatus = updatedRequest.status;
    let shouldNotifyHR = false;

    if (anyManagerRejected) {
      // If any manager rejects, the request is rejected
      finalStatus = "rejected";
      await pool.query(
        `UPDATE leave_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [finalStatus, id]
      );
    } else if (allManagersApproved) {
      // If all assigned managers approve, move to HR approval
      finalStatus = "manager_approved";
      await pool.query(
        `UPDATE leave_requests SET status = $1, manager_approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [finalStatus, id]
      );
      shouldNotifyHR = true;
    } else {
      // Update status to show partial approval
      const approvedCount = getApprovedManagerCount(updatedRequest);
      const totalManagers = getTotalManagerCount(updatedRequest);
      finalStatus = `Partially Approved (${approvedCount}/${totalManagers})`;
      await pool.query(
        `UPDATE leave_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [finalStatus, id]
      );
    }

    // If all managers approved, notify HR
    if (shouldNotifyHR) {
      const hrUsers = await getHRUsers();
      for (const hrUser of hrUsers) {
        await sendManagerApprovalToHR(
          hrUser.email,
          updatedRequest,
          managerName
        );
      }

      // Return success page for manager approval
      const isFullApproval = finalStatus === "manager_approved";
      const title = isFullApproval
        ? "Leave Request Approved!"
        : "Manager Approval Recorded";
      const message = isFullApproval
        ? `<p>You have successfully approved the leave request from <strong>${leaveRequest.employee_name}</strong>.</p>
           <p>The request has been forwarded to HR for final approval.</p>`
        : `<p>You have successfully approved the leave request from <strong>${leaveRequest.employee_name}</strong>.</p>
           <p>Status: <strong>${finalStatus}</strong></p>
           <p>Waiting for other managers to approve before forwarding to HR.</p>`;

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
            .info { color: #666; margin-bottom: 30px; }
            .button { background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="success">✅ ${title}</div>
          <div class="info">
            ${message}
          </div>
          <a href="http://localhost:3001/manager/leave-requests" class="button">View All Requests</a>
        </body>
        </html>
      `);
    } else if (action === "approve") {
      // Partial approval - show status
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Manager Approval Recorded</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
            .info { color: #666; margin-bottom: 30px; }
            .button { background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="success">✅ Manager Approval Recorded</div>
          <div class="info">
            <p>You have successfully approved the leave request from <strong>${leaveRequest.employee_name}</strong>.</p>
            <p>Status: <strong>${finalStatus}</strong></p>
            <p>Waiting for other managers to approve before forwarding to HR.</p>
          </div>
          <a href="http://localhost:3001/manager/leave-requests" class="button">View All Requests</a>
        </body>
        </html>
      `);
    } else {
      // Send rejection notification to employee
      const employeeResult = await pool.query(
        `SELECT email FROM users WHERE id = $1`,
        [leaveRequest.employee_id]
      );

      if (employeeResult.rows.length > 0) {
        await sendLeaveApprovalToEmployee(
          employeeResult.rows[0].email,
          updatedRequest,
          "rejected",
          leaveRequest.manager_name || "Manager"
        );
      }

      // Return success page for manager rejection
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Leave Request Rejected</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .rejected { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
            .info { color: #666; margin-bottom: 30px; }
            .button { background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="rejected">❌ Leave Request Rejected</div>
          <div class="info">
            <p>You have successfully rejected the leave request from <strong>${leaveRequest.employee_name}</strong>.</p>
            <p>The employee has been notified of the rejection.</p>
          </div>
          <a href="http://localhost:3001/manager/leave-requests" class="button">View All Requests</a>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error("Email approval error:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="error">❌ Error Processing Request</div>
        <p>An error occurred while processing your request. Please try again or contact support.</p>
      </body>
      </html>
    `);
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

      // First, get the current leave request to check manager assignments
      const leaveRequestResult = await pool.query(
        `
      SELECT * FROM leave_requests WHERE id = $1
    `,
        [id]
      );

      if (leaveRequestResult.rows.length === 0) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      const leaveRequest = leaveRequestResult.rows[0];

      // Check if this is a manager leave request
      if (leaveRequest.role === "manager") {
        // For manager leave requests, check if this manager is the direct manager
        const directManager = await getManagerDirectManager(
          leaveRequest.employee_id
        );

        if (!directManager || directManager.manager_id !== managerId) {
          return res.status(403).json({
            error:
              "You are not the direct manager for this manager leave request",
          });
        }

        // For manager requests, we'll use manager1_status field
        managerStatusField = "manager1_status";
      } else {
        // For employee requests, check if this manager is assigned to this leave request
        if (
          leaveRequest.manager1_id &&
          leaveRequest.manager1_name === managerName
        ) {
          managerStatusField = "manager1_status";
        } else if (
          leaveRequest.manager2_id &&
          leaveRequest.manager2_name === managerName
        ) {
          managerStatusField = "manager2_status";
        } else if (
          leaveRequest.manager3_id &&
          leaveRequest.manager3_name === managerName
        ) {
          managerStatusField = "manager3_status";
        } else {
          return res.status(403).json({
            error: "You are not assigned as a manager for this leave request",
          });
        }
      }

      // Check if this manager has already processed this request
      const currentStatus = leaveRequest[managerStatusField];
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
      UPDATE leave_requests 
      SET 
        ${managerStatusField} = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `,
        [newStatus, id]
      );

      const updatedLeaveRequest = updateResult.rows[0];

      // Check if all assigned managers have approved (for multi-manager workflow)
      const allManagersApproved = checkAllManagersApproved(updatedLeaveRequest);
      const anyManagerRejected = checkAnyManagerRejected(updatedLeaveRequest);

      let finalStatus = updatedLeaveRequest.status;
      let shouldNotifyHR = false;

      if (anyManagerRejected) {
        // If any manager rejects, the request is rejected
        finalStatus = "rejected";
        await pool.query(
          `UPDATE leave_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [finalStatus, id]
        );
      } else if (allManagersApproved) {
        // If all assigned managers approve, move to HR approval
        if (leaveRequest.role === "manager") {
          // For manager requests, go directly to HR approval
          finalStatus = "manager_approved";
          await pool.query(
            `UPDATE leave_requests SET status = $1, manager_approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [finalStatus, id]
          );
          shouldNotifyHR = true;
        } else {
          // For employee requests, move to HR approval
          finalStatus = "manager_approved";
          await pool.query(
            `UPDATE leave_requests SET status = $1, manager_approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [finalStatus, id]
          );
          shouldNotifyHR = true;
        }
      } else {
        // Update status to show partial approval
        const approvedCount = getApprovedManagerCount(updatedLeaveRequest);
        const totalManagers = getTotalManagerCount(updatedLeaveRequest);
        finalStatus = `Partially Approved (${approvedCount}/${totalManagers})`;
        await pool.query(
          `UPDATE leave_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
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
                id: leaveRequest.id,
                employeeName: leaveRequest.employee_name,
                employeeEmail: leaveRequest.employee_email || "Not available",
                leaveType: leaveRequest.leave_type,
                fromDate: leaveRequest.from_date,
                toDate: leaveRequest.to_date,
                totalDays: leaveRequest.total_leave_days,
                reason: leaveRequest.reason,
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
        message: `Leave request ${action}d successfully`,
        leaveRequest: updatedLeaveRequest,
        status: finalStatus,
        managerStatus: newStatus,
      });
    } catch (error) {
      console.error("❌ Error processing manager approval:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Error message:", error.message);
      if (error.code) {
        console.error("❌ Error code:", error.code);
      }
      if (error.detail) {
        console.error("❌ Error detail:", error.detail);
      }

      // Provide more specific error messages
      let errorMessage = "Failed to process approval";
      if (error.code === "23503") {
        errorMessage = "Invalid leave request reference";
      } else if (error.message.includes("email")) {
        errorMessage = "Failed to send notification email";
      }

      res.status(500).json({
        error: errorMessage,
        details: error.message,
        code: error.code || "UNKNOWN_ERROR",
      });
    }
  }
);

// Get HR-approved leave requests
router.get("/hr/pending", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "hr") {
      return res
        .status(403)
        .json({ error: "Access denied. HR role required." });
    }

    const result = await pool.query(`
      SELECT 
        lr.*, 
        u.email as employee_email,
        CASE 
          WHEN lr.manager1_id IS NOT NULL THEN
            CONCAT(
              'Manager 1: ', lr.manager1_name, ' (', lr.manager1_status, ')',
              CASE WHEN lr.manager2_id IS NOT NULL THEN 
                CONCAT(' | Manager 2: ', lr.manager2_name, ' (', lr.manager2_status, ')')
              ELSE '' END,
              CASE WHEN lr.manager3_id IS NOT NULL THEN 
                CONCAT(' | Manager 3: ', lr.manager3_name, ' (', lr.manager3_status, ')')
              ELSE '' END
            )
          ELSE 'No managers assigned'
        END as manager_approval_status
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      WHERE lr.status = 'manager_approved'
      ORDER BY lr.manager_approved_at ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching HR pending leave requests:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch HR pending leave requests" });
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
    const client = await pool.connect();
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

      // Start transaction
      await client.query("BEGIN");

      // Get HR details
      const hrResult = await client.query(
        `SELECT first_name, last_name FROM users WHERE id = $1`,
        [hrId]
      );
      const hrName = `${hrResult.rows[0].first_name} ${hrResult.rows[0].last_name}`;

      // Update leave request
      const status = action === "approve" ? "approved" : "rejected";
      const updateResult = await client.query(
        `UPDATE leave_requests 
         SET 
           status = $1,
           hr_id = $2,
           hr_name = $3,
           hr_approved_at = CURRENT_TIMESTAMP,
           hr_approval_notes = $4,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [status, hrId, hrName, notes, id]
      );

      if (updateResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Leave request not found" });
      }

      const leaveRequest = updateResult.rows[0];

      // If approved, update leave balance and attendance
      if (action === "approve") {
        try {
          // Update leave balance based on leave type
          const currentYear = new Date().getFullYear();
          const totalDays = Math.round(
            parseFloat(leaveRequest.total_leave_days) || 1
          );

          console.log("🔍 Updating leave balance:", {
            employeeId: leaveRequest.employee_id,
            year: currentYear,
            totalDays: totalDays,
            leaveType: leaveRequest.leave_type,
            originalValue: leaveRequest.total_leave_days,
          });

          // Handle different leave types
          if (leaveRequest.leave_type === "Unpaid Leave") {
            // Unpaid Leave: Do not deduct from annual allocation
            console.log(
              "🔍 Unpaid Leave - No deduction from annual allocation"
            );
          } else if (leaveRequest.leave_type === "Comp Off") {
            // Comp Off: Deduct from Comp Off balance
            console.log("🔍 Comp Off - Deducting from Comp Off balance");

            // Check if employee has Comp Off balance
            const compOffResult = await client.query(
              `SELECT * FROM comp_off_balances WHERE employee_id = $1 AND year = $2`,
              [leaveRequest.employee_id, currentYear]
            );

            if (compOffResult.rows.length === 0) {
              // Create Comp Off balance record if it doesn't exist
              await client.query(
                `INSERT INTO comp_off_balances (employee_id, year, total_earned, comp_off_taken, comp_off_remaining) 
                 VALUES ($1, $2, 0, 0, 0)`,
                [leaveRequest.employee_id, currentYear]
              );
            }

            // Update Comp Off balance
            await client.query(
              `UPDATE comp_off_balances 
               SET 
                 comp_off_taken = comp_off_taken + $1,
                 comp_off_remaining = comp_off_remaining - $1,
                 updated_at = CURRENT_TIMESTAMP
               WHERE employee_id = $2 AND year = $3`,
              [totalDays, leaveRequest.employee_id, currentYear]
            );
          } else {
            // Paid Leave, Privilege Leave, Sick Leave, Casual Leave, etc.: Deduct from annual allocation
            console.log("🔍 Paid Leave - Deducting from annual allocation");

            // Update overall leave balance
            await client.query(
              `UPDATE leave_balances 
               SET 
                 leaves_taken = leaves_taken + $1,
                 leaves_remaining = leaves_remaining - $1,
                 updated_at = CURRENT_TIMESTAMP
               WHERE employee_id = $2 AND year = $3`,
              [totalDays, leaveRequest.employee_id, currentYear]
            );

            // Skip leave type balance update for now to avoid database schema issues
            console.log(
              "🔍 Skipping leave type balance update for:",
              leaveRequest.leave_type,
              "(schema compatibility issue)"
            );
          }

          console.log("✅ Leave balance updated successfully");
        } catch (balanceError) {
          console.error("❌ Error updating leave balance:", balanceError);
          // Continue with the approval process even if balance update fails
          // The leave request is still approved
        }

        // Add to attendance table (optimized)
        const fromDate = new Date(leaveRequest.from_date);
        const toDate = leaveRequest.to_date
          ? new Date(leaveRequest.to_date)
          : fromDate; // Use from_date if to_date is NULL (single day leave)

        // Optimized attendance creation - batch insert
        const attendanceValues = [];

        if (leaveRequest.to_date) {
          // Multi-day leave: collect all dates
          for (
            let d = new Date(fromDate);
            d <= toDate;
            d.setDate(d.getDate() + 1)
          ) {
            // Skip weekends
            if (d.getDay() === 0 || d.getDay() === 6) continue;

            attendanceValues.push(
              `(${leaveRequest.employee_id}, '${
                d.toISOString().split("T")[0]
              }', 'Leave', 'Approved leave: ${leaveRequest.reason}')`
            );
          }
        } else {
          // Single day leave
          attendanceValues.push(
            `(${leaveRequest.employee_id}, '${
              fromDate.toISOString().split("T")[0]
            }', 'Leave', 'Approved leave: ${leaveRequest.reason}')`
          );
        }

        // Batch insert attendance records
        if (attendanceValues.length > 0) {
          await client.query(
            `INSERT INTO attendance (employee_id, date, status, reason)
             VALUES ${attendanceValues.join(", ")}
             ON CONFLICT (employee_id, date) DO NOTHING`
          );
          console.log(
            `✅ Created ${attendanceValues.length} attendance records`
          );
        }

        // Notify employee using new email system (asynchronous)
        const employeeResult = await client.query(
          `SELECT email FROM users WHERE id = $1`,
          [leaveRequest.employee_id]
        );

        // Commit transaction first
        await client.query("COMMIT");
        console.log("✅ Transaction committed successfully");

        // Send email asynchronously (don't wait for it)
        if (employeeResult.rows.length > 0) {
          sendLeaveApprovalToEmployee(
            employeeResult.rows[0].email,
            leaveRequest,
            "approved",
            hrName
          ).catch((emailError) => {
            console.error(
              "❌ Email sending failed (non-blocking):",
              emailError
            );
          });
        }
      } else {
        // If rejected, notify employee
        const employeeResult = await client.query(
          `SELECT email FROM users WHERE id = $1`,
          [leaveRequest.employee_id]
        );

        // Commit transaction first
        await client.query("COMMIT");
        console.log("✅ Transaction committed successfully");

        // Send email asynchronously (don't wait for it)
        if (employeeResult.rows.length > 0) {
          sendLeaveApprovalToEmployee(
            employeeResult.rows[0].email,
            leaveRequest,
            "rejected",
            hrName
          ).catch((emailError) => {
            console.error(
              "❌ Email sending failed (non-blocking):",
              emailError
            );
          });
        }
      }

      res.json({
        message: `Leave request ${action}d successfully`,
        leaveRequest,
      });
    } catch (error) {
      console.error("❌ Error processing HR approval:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Error message:", error.message);
      if (error.code) {
        console.error("❌ Error code:", error.code);
      }
      if (error.detail) {
        console.error("❌ Error detail:", error.detail);
      }

      // Rollback transaction on error
      try {
        await client.query("ROLLBACK");
        console.log("✅ Transaction rolled back due to error");
      } catch (rollbackError) {
        console.error("❌ Error rolling back transaction:", rollbackError);
      }

      // Provide more specific error messages
      let errorMessage = "Failed to process approval";
      if (error.code === "23505") {
        errorMessage =
          "Duplicate attendance record - leave may already be processed";
      } else if (error.code === "23503") {
        errorMessage = "Invalid employee or leave request reference";
      } else if (error.message.includes("date")) {
        errorMessage = "Invalid date format in leave request";
      }

      res.status(500).json({
        error: errorMessage,
        details: error.message,
        code: error.code || "UNKNOWN_ERROR",
      });
    } finally {
      client.release();
    }
  }
);

// Get all leave requests (for admin/HR overview)
router.get("/all", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "hr") {
      return res
        .status(403)
        .json({ error: "Access denied. HR role required." });
    }

    const result = await pool.query(`
      SELECT 
        lr.*, 
        u.email as employee_email,
        CASE 
          WHEN lr.manager1_id IS NOT NULL THEN
            CONCAT(
              'Manager 1: ', lr.manager1_name, ' (', lr.manager1_status, ')',
              CASE WHEN lr.manager2_id IS NOT NULL THEN 
                CONCAT(' | Manager 2: ', lr.manager2_name, ' (', lr.manager2_status, ')')
              ELSE '' END,
              CASE WHEN lr.manager3_id IS NOT NULL THEN 
                CONCAT(' | Manager 3: ', lr.manager3_name, ' (', lr.manager3_status, ')')
              ELSE '' END
            )
          ELSE 'No managers assigned'
        END as manager_approval_status
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      ORDER BY lr.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all leave requests:", error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
});

// Delete a leave request (HR only)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "hr") {
      return res
        .status(403)
        .json({ error: "Access denied. HR role required." });
    }

    const { id } = req.params;
    const exists = await pool.query(
      "SELECT id FROM leave_requests WHERE id = $1",
      [id]
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    await pool.query("DELETE FROM leave_requests WHERE id = $1", [id]);
    res.json({ message: "Leave request deleted" });
  } catch (error) {
    console.error("Delete leave request error:", error);
    res.status(500).json({ error: "Failed to delete leave request" });
  }
});

// Get comprehensive leave balances including Comp Off (for HR/Managers)
router.get("/balances/:employeeId", authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const currentYear = new Date().getFullYear();

    // Get annual leave balance
    const leaveBalanceResult = await pool.query(
      `SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2`,
      [employeeId, currentYear]
    );

    // Get leave type balances
    const leaveTypeBalancesResult = await pool.query(
      `SELECT * FROM leave_type_balances WHERE employee_id = $1 AND year = $2 ORDER BY leave_type`,
      [employeeId, currentYear]
    );

    // Get Comp Off balance
    const compOffBalanceResult = await pool.query(
      `SELECT * FROM comp_off_balances WHERE employee_id = $1 AND year = $2`,
      [employeeId, currentYear]
    );

    // Create default balances if they don't exist
    let leaveBalance = leaveBalanceResult.rows[0];
    if (!leaveBalance) {
      await pool.query(
        `INSERT INTO leave_balances (employee_id, year, total_allocated, leaves_taken, leaves_remaining) 
         VALUES ($1, $2, 15, 0, 15)`,
        [employeeId, currentYear]
      );
      leaveBalance = {
        employee_id: employeeId,
        year: currentYear,
        total_allocated: 15,
        leaves_taken: 0,
        leaves_remaining: 15,
      };
    }

    // Create default leave type balances if they don't exist
    let leaveTypeBalances = leaveTypeBalancesResult.rows;
    if (leaveTypeBalances.length === 0) {
      const currentMonth = new Date().getMonth() + 1;
      let monthsOfService = 0;
      if (currentMonth >= 4) {
        // April onwards
        monthsOfService = currentMonth - 3; // April = month 1
      } else {
        monthsOfService = currentMonth + 9; // Jan-Mar = months 10-12 of previous year
      }

      await pool.query(
        `
        INSERT INTO leave_type_balances (employee_id, year, leave_type, total_allocated, leaves_taken, leaves_remaining)
        VALUES 
          ($1, $2, 'Earned/Annual Leave', $3, 0, $3),
          ($1, $2, 'Sick Leave', $4, 0, $4),
          ($1, $2, 'Casual Leave', $5, 0, $5)
        ON CONFLICT (employee_id, year, leave_type) DO NOTHING
      `,
        [
          employeeId,
          currentYear,
          Math.min(monthsOfService * 1.25, 15), // Earned Leave: 1.25/month, max 15
          Math.min(monthsOfService * 0.5, 6), // Sick Leave: 0.5/month, max 6
          Math.min(monthsOfService * 0.5, 6), // Casual Leave: 0.5/month, max 6
        ]
      );

      // Fetch the newly created balances
      const newBalancesResult = await pool.query(
        `SELECT * FROM leave_type_balances WHERE employee_id = $1 AND year = $2 ORDER BY leave_type`,
        [employeeId, currentYear]
      );
      leaveTypeBalances = newBalancesResult.rows;
    }

    let compOffBalance = compOffBalanceResult.rows[0];
    if (!compOffBalance) {
      await pool.query(
        `INSERT INTO comp_off_balances (employee_id, year, total_earned, comp_off_taken, comp_off_remaining) 
         VALUES ($1, $2, 0, 0, 0)`,
        [employeeId, currentYear]
      );
      compOffBalance = {
        employee_id: employeeId,
        year: currentYear,
        total_earned: 0,
        comp_off_taken: 0,
        comp_off_remaining: 0,
      };
    }

    res.json({
      annualLeave: {
        totalAllocated: leaveBalance.total_allocated,
        leavesTaken: leaveBalance.leaves_taken,
        leavesRemaining: leaveBalance.leaves_remaining,
      },
      leaveTypeBalances: leaveTypeBalances,
      compOff: {
        totalEarned: compOffBalance.total_earned,
        compOffTaken: compOffBalance.comp_off_taken,
        compOffRemaining: compOffBalance.comp_off_remaining,
      },
    });
  } catch (error) {
    console.error("Error fetching leave balances:", error);
    res.status(500).json({ error: "Failed to fetch leave balances" });
  }
});

// Get employee's own leave type balances
router.get("/my-leave-type-balances", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.userId;
    const currentYear = new Date().getFullYear();

    // Get leave type balances
    const leaveTypeBalancesResult = await pool.query(
      `SELECT * FROM leave_type_balances WHERE employee_id = $1 AND year = $2 ORDER BY leave_type`,
      [employeeId, currentYear]
    );

    // Create default leave type balances if they don't exist
    let leaveTypeBalances = leaveTypeBalancesResult.rows;
    if (leaveTypeBalances.length === 0) {
      const currentMonth = new Date().getMonth() + 1;
      let monthsOfService = 0;
      if (currentMonth >= 4) {
        // April onwards
        monthsOfService = currentMonth - 3; // April = month 1
      } else {
        monthsOfService = currentMonth + 9; // Jan-Mar = months 10-12 of previous year
      }

      await pool.query(
        `
        INSERT INTO leave_type_balances (employee_id, year, leave_type, total_allocated, leaves_taken, leaves_remaining)
        VALUES 
          ($1, $2, 'Earned/Annual Leave', $3, 0, $3),
          ($1, $2, 'Sick Leave', $4, 0, $4),
          ($1, $2, 'Casual Leave', $5, 0, $5)
        ON CONFLICT (employee_id, year, leave_type) DO NOTHING
      `,
        [
          employeeId,
          currentYear,
          Math.min(monthsOfService * 1.25, 15), // Earned Leave: 1.25/month, max 15
          Math.min(monthsOfService * 0.5, 6), // Sick Leave: 0.5/month, max 6
          Math.min(monthsOfService * 0.5, 6), // Casual Leave: 0.5/month, max 6
        ]
      );

      // Fetch the newly created balances
      const newBalancesResult = await pool.query(
        `SELECT * FROM leave_type_balances WHERE employee_id = $1 AND year = $2 ORDER BY leave_type`,
        [employeeId, currentYear]
      );
      leaveTypeBalances = newBalancesResult.rows;
    }

    res.json({
      leaveTypeBalances: leaveTypeBalances,
      year: currentYear,
    });
  } catch (error) {
    console.error("Error fetching leave type balances:", error);
    res.status(500).json({ error: "Failed to fetch leave type balances" });
  }
});

// Create leave request - Missing endpoint
router.post(
  "/requests",
  [authenticateToken, requireEmployee],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { leave_type, from_date, to_date, reason, half_day } = req.body;

      const result = await pool.query(
        `INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, reason, half_day, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
        [req.user.userId, leave_type, from_date, to_date, reason, half_day]
      );

      res.json({
        message: "Leave request created successfully",
        leaveRequest: result.rows[0],
      });
    } catch (error) {
      console.error("Create leave request error:", error);
      res.status(500).json({ error: "Failed to create leave request" });
    }
  }
);

module.exports = router;
