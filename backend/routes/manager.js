const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../config/database");
const { authenticateToken, requireManager } = require("../middleware/auth");

const router = express.Router();

// Apply authentication to all manager routes
router.use(authenticateToken);
router.use(requireManager);

// Get manager's dashboard data
router.get("/dashboard", async (req, res) => {
  try {
    const managerId = req.user.userId;

    // Get all employees under this manager with their leave information
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        em.employee_id as emp_id,
        em.department,
        em.designation,
        em.type as employment_type,
        em.status as employee_status,
        COALESCE(lb.leaves_taken, 0) as leaves_taken,
        COALESCE(lb.leaves_remaining, 0) as leaves_remaining,
        COALESCE(lb.total_allocated, 0) as total_allocated
      FROM users u
      JOIN manager_employee_mapping mem ON u.id = mem.employee_id
      LEFT JOIN employee_master em ON u.email = em.company_email
      LEFT JOIN leave_balances lb ON u.id = lb.employee_id AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
      WHERE mem.manager_id = $1 
        AND mem.is_active = true 
        AND u.role = 'employee'
      ORDER BY u.first_name, u.last_name
    `,
      [managerId]
    );

    res.json({
      employees: result.rows,
      totalEmployees: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching manager dashboard:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get employees under manager with detailed leave information
router.get("/employees", async (req, res) => {
  try {
    const managerId = req.user.userId;

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        em.employee_id as emp_id,
        em.department,
        em.designation,
        em.type as employment_type,
        em.status as employee_status,
        COALESCE(lb.leaves_taken, 0) as leaves_taken,
        COALESCE(lb.leaves_remaining, 0) as leaves_remaining,
        COALESCE(lb.total_allocated, 0) as total_allocated,
        (
          SELECT json_agg(
            json_build_object(
              'leave_type', lr.leave_type,
              'from_date', lr.from_date,
              'to_date', lr.to_date,
              'total_days', lr.total_leave_days,
              'status', lr.status,
              'reason', lr.reason
            )
          )
          FROM leave_requests lr 
          WHERE lr.employee_id = u.id 
            AND lr.status IN ('approved', 'pending_manager_approval', 'pending_hr_approval')
            AND lr.from_date >= CURRENT_DATE - INTERVAL '1 year'
        ) as recent_leaves
      FROM users u
      JOIN manager_employee_mapping mem ON u.id = mem.employee_id
      LEFT JOIN employee_master em ON u.email = em.company_email
      LEFT JOIN leave_balances lb ON u.id = lb.employee_id AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
      WHERE mem.manager_id = $1 
        AND mem.is_active = true 
        AND u.role = 'employee'
      ORDER BY u.first_name, u.last_name
    `,
      [managerId]
    );

    res.json({ employees: result.rows });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get employee attendance for the last 2 weeks
router.get("/employee/:employeeId/attendance", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const managerId = req.user ? req.user.userId : null;

    // Validate manager ID
    if (!managerId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate employee ID
    if (!employeeId || isNaN(employeeId)) {
      return res.status(400).json({ error: "Invalid employee ID" });
    }

    // Check if employee exists
    const employeeCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [employeeId]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Verify the manager has permission to view this employee's attendance
    const permissionCheck = await pool.query(
      `
      SELECT mem.id FROM manager_employee_mapping mem
      WHERE mem.employee_id = $1 AND mem.manager_id = $2 AND mem.is_active = true
    `,
      [employeeId, managerId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You don't have permission to view this employee's attendance",
      });
    }

    // Get attendance for present week and future week only (2 weeks total)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfNextWeek = new Date(startOfWeek);
    endOfNextWeek.setDate(startOfWeek.getDate() + 13); // End of next week (Saturday)
    endOfNextWeek.setHours(23, 59, 59, 999);

    const startDate = startOfWeek.toISOString().split("T")[0];
    const endDate = endOfNextWeek.toISOString().split("T")[0];

    const result = await pool.query(
      `
      SELECT 
        id, 
        TO_CHAR(date, 'YYYY-MM-DD') as date, 
        status, 
        clock_in_time as check_in_time, 
        clock_out_time as check_out_time, 
        hours,
        reason as notes, 
        created_at as marked_at, 
        updated_at
      FROM attendance 
      WHERE employee_id = $1 AND date BETWEEN $2 AND $3
      ORDER BY date DESC
    `,
      [employeeId, startDate, endDate]
    );

    // Get employee details
    const employeeResult = await pool.query(
      `
      SELECT 
        u.id, u.first_name, u.last_name, u.email,
        em.employee_id as emp_id, em.department, em.designation
      FROM users u
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE u.id = $1
    `,
      [employeeId]
    );

    res.json({
      attendance: result.rows,
      employee: employeeResult.rows[0] || null,
    });
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
    });
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Manager mark/update attendance for employee
router.post(
  "/employee/:employeeId/attendance",
  [
    body("date").isISO8601().toDate().withMessage("Valid date is required"),
    body("status")
      .isIn([
        "present",
        "absent",
        "Work From Home",
        "leave",
        "Half Day",
        "holiday",
      ])
      .withMessage("Valid status is required"),
    body("checkintime")
      .optional()
      .custom((value) => {
        if (value === null || value === undefined || value === "") {
          return true;
        }
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(value);
      })
      .withMessage(
        "Valid check-in time format is required (HH:MM or HH:MM:SS)"
      ),
    body("checkouttime")
      .optional()
      .custom((value) => {
        if (value === null || value === undefined || value === "") {
          return true;
        }
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(value);
      })
      .withMessage(
        "Valid check-out time format is required (HH:MM or HH:MM:SS)"
      ),
    body("notes").optional().isString().withMessage("Notes must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { employeeId } = req.params;
      const { date, status, checkintime, checkouttime, notes } = req.body;
      const managerId = req.user.userId;

      // Validate employee ID
      if (!employeeId || isNaN(employeeId)) {
        return res.status(400).json({ error: "Invalid employee ID" });
      }

      // Verify the manager has permission to manage this employee's attendance
      const permissionCheck = await pool.query(
        `
      SELECT mem.id FROM manager_employee_mapping mem
      WHERE mem.employee_id = $1 AND mem.manager_id = $2 AND mem.is_active = true
    `,
        [employeeId, managerId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          error:
            "You don't have permission to manage this employee's attendance",
        });
      }

      // Validate that the date is within the allowed range (present week and future week only)
      const attendanceDate = new Date(date);
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfNextWeek = new Date(startOfWeek);
      endOfNextWeek.setDate(startOfWeek.getDate() + 13); // End of next week (Saturday)
      endOfNextWeek.setHours(23, 59, 59, 999);

      if (attendanceDate < startOfWeek) {
        return res.status(400).json({
          error:
            "Managers can only mark attendance for the present week and future week (2 weeks total)",
        });
      }

      // Use time strings directly (database columns are now TIME type)
      const clockInTime = checkintime || null;
      const clockOutTime = checkouttime || null;

      // Check if attendance already exists for this date
      const existingAttendance = await pool.query(
        "SELECT id FROM attendance WHERE employee_id = $1 AND date = $2",
        [employeeId, date]
      );

      if (existingAttendance.rows.length > 0) {
        // Update existing attendance
        await pool.query(
          `
        UPDATE attendance 
        SET status = $1, clock_in_time = $2, clock_out_time = $3, reason = $4, 
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $5 AND date = $6
      `,
          [status, clockInTime, clockOutTime, notes, employeeId, date]
        );

        res.json({ message: "Employee attendance updated successfully" });
      } else {
        // Create new attendance record
        await pool.query(
          `
        INSERT INTO attendance (employee_id, date, status, clock_in_time, clock_out_time, reason)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
          [employeeId, date, status, clockInTime, clockOutTime, notes]
        );

        res.json({ message: "Employee attendance marked successfully" });
      }
    } catch (error) {
      console.error("Error marking employee attendance:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get employee leave requests for manager approval
router.get("/leave-requests", async (req, res) => {
  try {
    const managerId = req.user.userId;

    const result = await pool.query(
      `
      SELECT 
        lr.id,
        lr.series,
        lr.employee_id,
        lr.employee_name,
        lr.leave_type,
        lr.from_date,
        lr.to_date,
        lr.total_leave_days,
        lr.reason,
        lr.status,
        lr.created_at,
        u.first_name,
        u.last_name,
        u.email,
        em.employee_id as emp_id,
        em.department
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      JOIN manager_employee_mapping mem ON u.id = mem.employee_id
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE mem.manager_id = $1 
        AND mem.is_active = true
        AND lr.status IN ('pending_manager_approval', 'pending_hr_approval', 'approved', 'rejected')
      ORDER BY lr.created_at DESC
    `,
      [managerId]
    );

    res.json({ leaveRequests: result.rows });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Manager approve/reject leave request
router.put(
  "/leave-requests/:requestId",
  [
    body("action")
      .isIn(["approve", "reject"])
      .withMessage("Action must be 'approve' or 'reject'"),
    body("notes").optional().isString().withMessage("Notes must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { requestId } = req.params;
      const { action, notes } = req.body;
      const managerId = req.user.userId;

      // Validate request ID
      if (!requestId || isNaN(requestId)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }

      // Verify the manager has permission to approve this leave request
      const permissionCheck = await pool.query(
        `
      SELECT lr.id FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      JOIN manager_employee_mapping mem ON u.id = mem.employee_id
      WHERE lr.id = $1 AND mem.manager_id = $2 AND mem.is_active = true
    `,
        [requestId, managerId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          error: "You don't have permission to approve this leave request",
        });
      }

      // Update leave request status
      const newStatus =
        action === "approve" ? "Pending HR Approval" : "rejected";

      await pool.query(
        `
      UPDATE leave_requests 
      SET status = $1, manager_approval_notes = $2, manager_approved_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
        [newStatus, notes, requestId]
      );

      res.json({
        message: `Leave request ${action}d successfully`,
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating leave request:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get manager's team attendance summary
router.get("/team-attendance-summary", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const managerId = req.user.userId;

    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ error: "Start date and end date are required" });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    const result = await pool.query(
      `
      SELECT 
        u.id, u.first_name, u.last_name, u.email,
        em.employee_id as emp_id, em.department,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'wfh' THEN 1 END) as wfh_days,
        COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_days,
        COUNT(a.id) as total_days
      FROM users u
      JOIN manager_employee_mapping mem ON u.id = mem.employee_id
      LEFT JOIN employee_master em ON u.email = em.company_email
      LEFT JOIN attendance a ON u.id = a.employee_id AND a.date BETWEEN $2 AND $3
      WHERE mem.manager_id = $1 AND mem.is_active = true AND u.role = 'employee'
      GROUP BY u.id, u.first_name, u.last_name, u.email, em.employee_id, em.department
      ORDER BY u.first_name, u.last_name
    `,
      [managerId, start_date, end_date]
    );

    res.json({ summary: result.rows });
  } catch (error) {
    console.error("Error fetching team attendance summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
