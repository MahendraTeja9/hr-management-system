const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../config/database");
const {
  authenticateToken,
  requireEmployee,
  requireManager,
  requireHR,
} = require("../middleware/auth");

const router = express.Router();

// Apply authentication to all attendance routes
router.use(authenticateToken);

// Get attendance settings
router.get("/settings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT setting_key, setting_value, description FROM attendance_settings"
    );
    const settings = {};
    result.rows.forEach((row) => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json({ settings });
  } catch (error) {
    console.error("Error fetching attendance settings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get employee's own attendance for a date range
router.get("/my-attendance", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Get user ID from authenticated user
    const userId = req.user ? req.user.userId : null;

    console.log("🔍 Attendance route - req.user:", req.user);
    console.log("🔍 Attendance route - userId:", userId);

    // Validate user ID
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Check if user exists
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
      userId,
    ]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // If no date range provided, get last 30 days
    let queryStartDate, queryEndDate;

    if (!start_date || !end_date) {
      const today = new Date();
      queryEndDate = today.toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      queryStartDate = thirtyDaysAgo.toISOString().split("T")[0];
    } else {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
        return res
          .status(400)
          .json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      queryStartDate = start_date;
      queryEndDate = end_date;
    }

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
      [userId, queryStartDate, queryEndDate]
    );

    // Return empty array if no records found (instead of 404)
    res.json({ attendance: result.rows });
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

// Mark attendance for a single day
router.post(
  "/mark",
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
    body("hours")
      .optional()
      .isInt({ min: 1, max: 24 })
      .withMessage("Hours must be between 1 and 24"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { date, status, checkintime, checkouttime, notes, hours } =
        req.body;
      // For testing, use a default user ID if authentication is disabled
      const userId = req.user ? req.user.userId : 80;

      // Use time strings directly (database columns are now TIME type)
      const clockInTime = checkintime || null;
      const clockOutTime = checkouttime || null;

      // Check if attendance already exists for this date
      const existingAttendance = await pool.query(
        "SELECT id FROM attendance WHERE employee_id = $1 AND date = $2",
        [userId, date]
      );

      if (existingAttendance.rows.length > 0) {
        // Update existing attendance
        await pool.query(
          `
        UPDATE attendance 
        SET status = $1, clock_in_time = $2, clock_out_time = $3, reason = $4, hours = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $6 AND date = $7
      `,
          [status, clockInTime, clockOutTime, notes, hours, userId, date]
        );

        res.json({ message: "Attendance updated successfully" });
      } else {
        // Create new attendance record
        await pool.query(
          `
        INSERT INTO attendance (employee_id, date, status, clock_in_time, clock_out_time, reason, hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
          [userId, date, status, clockInTime, clockOutTime, notes, hours]
        );

        res.json({ message: "Attendance marked successfully" });
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get calendar attendance data for a month
router.get("/calendar", async (req, res) => {
  try {
    const { month, year } = req.query;
    // For testing, use a default user ID if authentication is disabled
    const userId = req.user ? req.user.userId : 80;

    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }

    const result = await pool.query(
      `
      SELECT 
        TO_CHAR(date, 'YYYY-MM-DD') as date, 
        status, 
        clock_in_time as check_in_time, 
        clock_out_time as check_out_time, 
        reason as notes
      FROM attendance 
      WHERE employee_id = $1 
        AND EXTRACT(MONTH FROM date) = $2 
        AND EXTRACT(YEAR FROM date) = $3
      ORDER BY date
    `,
      [userId, parseInt(month), parseInt(year)]
    );

    res.json({ calendar: result.rows });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    res.status(500).json({ error: "Failed to fetch calendar data" });
  }
});

// Mark attendance for multiple days (weekly submission)
router.post(
  "/mark-weekly",
  [
    body("attendance_data")
      .isArray()
      .withMessage("Attendance data must be an array"),
    body("attendance_data.*.date")
      .isISO8601()
      .toDate()
      .withMessage("Valid date is required"),
    body("attendance_data.*.status")
      .isIn([
        "present",
        "absent",
        "Work From Home",
        "leave",
        "Half Day",
        "holiday",
      ])
      .withMessage("Valid status is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { attendance_data } = req.body;
      // For testing, use a default user ID if authentication is disabled
      const userId = req.user ? req.user.userId : 80;

      // Use transaction to ensure all operations succeed or fail together
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        for (const record of attendance_data) {
          const { date, status, checkintime, checkouttime, notes, hours } =
            record;

          // Use time strings directly (database columns are now TIME type)
          const clockInTime = checkintime || null;
          const clockOutTime = checkouttime || null;

          // Check if attendance already exists
          const existingAttendance = await client.query(
            "SELECT id FROM attendance WHERE employee_id = $1 AND date = $2",
            [userId, date]
          );

          if (existingAttendance.rows.length > 0) {
            // Update existing
            await client.query(
              `
            UPDATE attendance 
            SET status = $1, clock_in_time = $2, clock_out_time = $3, reason = $4, hours = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE employee_id = $6 AND date = $7
          `,
              [status, clockInTime, clockOutTime, notes, hours, userId, date]
            );
          } else {
            // Create new
            await client.query(
              `
            INSERT INTO attendance (employee_id, date, status, clock_in_time, clock_out_time, reason, hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
              [userId, date, status, clockInTime, clockOutTime, notes, hours]
            );
          }
        }

        await client.query("COMMIT");
        res.json({ message: "Weekly attendance marked successfully" });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error marking weekly attendance:", error);
      res.status(500).json({ error: "Failed to mark weekly attendance" });
    }
  }
);

// Manager routes - require manager role (temporarily disabled)
// router.use(requireManager);

// Get employees under the manager
router.get("/my-team", async (req, res) => {
  try {
    // For testing, use a default manager ID if authentication is disabled
    const managerId = req.user ? req.user.userId : 70;

    const result = await pool.query(
      `
      SELECT 
        u.id, u.email, u.first_name, u.last_name,
        em.employee_id as emp_id, em.department, em.designation,
        em.type as employment_type, em.status as employee_status
      FROM users u
      JOIN manager_employee_mapping mem ON u.id = mem.employee_id
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE mem.manager_id = $1 AND mem.is_active = true AND u.role = 'employee'
      ORDER BY u.first_name, u.last_name
    `,
      [managerId]
    );

    res.json({ employees: result.rows });
  } catch (error) {
    console.error("Error fetching team employees:", error);
    res.status(500).json({ error: "Failed to fetch team employees" });
  }
});

// Get team attendance for a date range
router.get("/team-attendance", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    // For testing, use a default manager ID if authentication is disabled
    const managerId = req.user ? req.user.userId : 70;

    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ error: "Start date and end date are required" });
    }

    const result = await pool.query(
      `
      SELECT 
        a.id, a.employee_id, a.date, a.status, a.clock_in_time as check_in_time, a.clock_out_time as check_out_time, 
        a.total_hours, a.reason as notes, a.created_at as marked_at, a.updated_at,
        u.first_name, u.last_name, u.email,
        em.employee_id as emp_id, em.department
      FROM attendance a
      JOIN users u ON a.employee_id = u.id
      JOIN manager_employee_mapping mem ON u.id = mem.employee_id
      LEFT JOIN employee_master em ON u.email = em.company_email
      WHERE mem.manager_id = $1 AND mem.is_active = true 
        AND a.date BETWEEN $2 AND $3
      ORDER BY a.date DESC, u.first_name, u.last_name
    `,
      [managerId, start_date, end_date]
    );

    res.json({ attendance: result.rows });
  } catch (error) {
    console.error("Error fetching team attendance:", error);
    res.status(500).json({ error: "Failed to fetch team attendance" });
  }
});

// Manager edit employee attendance
router.put(
  "/edit-employee-attendance/:attendanceId",
  [
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
    body("hours")
      .optional()
      .isInt({ min: 1, max: 24 })
      .withMessage("Hours must be between 1 and 24"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { attendanceId } = req.params;
      const { status, checkintime, checkouttime, notes } = req.body;
      // For testing, use a default manager ID if authentication is disabled
      const managerId = req.user ? req.user.userId : 70;

      // Verify the manager has permission to edit this attendance
      const attendanceCheck = await pool.query(
        `
      SELECT a.id FROM attendance a
      JOIN users u ON a.employee_id = u.id
      JOIN manager_employee_mapping mem ON u.id = mem.employee_id
      WHERE a.id = $1 AND mem.manager_id = $2 AND mem.is_active = true
    `,
        [attendanceId, managerId]
      );

      if (attendanceCheck.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "You don't have permission to edit this attendance" });
      }

      // Update the attendance
      await pool.query(
        `
      UPDATE attendance 
      SET status = $1, clock_in_time = $2, clock_out_time = $3, reason = $4, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `,
        [status, checkintime, checkouttime, notes, managerId, attendanceId]
      );

      res.json({ message: "Attendance updated successfully" });
    } catch (error) {
      console.error("Error updating employee attendance:", error);
      res.status(500).json({ error: "Failed to update attendance" });
    }
  }
);

// Manager add attendance for employee
router.post(
  "/add-employee-attendance",
  [
    body("employee_id").isInt().withMessage("Valid employee ID is required"),
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
    body("hours")
      .optional()
      .isInt({ min: 1, max: 24 })
      .withMessage("Hours must be between 1 and 24"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        employee_id,
        date,
        status,
        checkintime,
        checkouttime,
        notes,
        hours,
      } = req.body;
      // For testing, use a default manager ID if authentication is disabled
      const managerId = req.user ? req.user.userId : 70;

      // Verify the manager has permission to add attendance for this employee
      const permissionCheck = await pool.query(
        `
      SELECT mem.id FROM manager_employee_mapping mem
      WHERE mem.employee_id = $1 AND mem.manager_id = $2 AND mem.is_active = true
    `,
        [employee_id, managerId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          error:
            "You don't have permission to add attendance for this employee",
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

      // Check if attendance already exists for this date
      const existingAttendance = await pool.query(
        "SELECT id FROM attendance WHERE employee_id = $1 AND date = $2",
        [employee_id, date]
      );

      if (existingAttendance.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Attendance already exists for this date" });
      }

      // Add new attendance record
      await pool.query(
        `
      INSERT INTO attendance (employee_id, date, status, clock_in_time, clock_out_time, reason, hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
        [employee_id, date, status, checkintime, checkouttime, notes, hours]
      );

      res.json({ message: "Attendance added successfully" });
    } catch (error) {
      console.error("Error adding employee attendance:", error);
      res.status(500).json({ error: "Failed to add attendance" });
    }
  }
);

// Get attendance summary for manager's team
router.get("/team-summary", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    // For testing, use a default manager ID if authentication is disabled
    const managerId = req.user ? req.user.userId : 70;

    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ error: "Start date and end date are required" });
    }

    // Validate that the date range is within the allowed range (present week and future week only)
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfNextWeek = new Date(startOfWeek);
    endOfNextWeek.setDate(startOfWeek.getDate() + 13); // End of next week (Saturday)
    endOfNextWeek.setHours(23, 59, 59, 999);

    if (startDate < startOfWeek || endDate > endOfNextWeek) {
      return res.status(400).json({
        error:
          "Managers can only view attendance data for the present week and future week (2 weeks total)",
      });
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
    console.error("Error fetching team summary:", error);
    res.status(500).json({ error: "Failed to fetch team summary" });
  }
});

// Get attendance statistics for HR dashboard
router.get("/stats", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }

    // Get total employees that exist in employee_master table
    const totalEmployeesResult = await pool.query(
      "SELECT COUNT(*) as total FROM employee_master WHERE status = 'active'"
    );
    const totalEmployees = parseInt(totalEmployeesResult.rows[0].total);

    // Get attendance statistics for the month (only for employees in employee_master)
    const statsResult = await pool.query(
      `
      SELECT 
        a.status,
        COUNT(*) as count
      FROM attendance a
      JOIN users u ON a.employee_id = u.id
      JOIN employee_master em ON u.email = em.company_email
      WHERE EXTRACT(MONTH FROM a.date) = $1 
        AND EXTRACT(YEAR FROM a.date) = $2
        AND em.status = 'active'
      GROUP BY a.status
    `,
      [parseInt(month), parseInt(year)]
    );

    // Calculate totals
    const stats = {
      total: totalEmployees,
      stats: {
        Present: 0,
        Absent: 0,
        "Work From Home": 0,
        Leave: 0,
        "Half Day": 0,
        Holiday: 0,
      },
      percentages: {
        Present: 0,
        Absent: 0,
        "Work From Home": 0,
        Leave: 0,
        "Half Day": 0,
        Holiday: 0,
      },
      total_attendance_records: 0,
    };

    // Map backend status to frontend status
    const statusMapping = {
      present: "Present",
      absent: "Absent",
      wfh: "Work From Home",
      leave: "Leave",
      half_day: "Half Day",
      holiday: "Holiday",
    };

    statsResult.rows.forEach((row) => {
      const frontendStatus = statusMapping[row.status] || row.status;
      stats.stats[frontendStatus] = parseInt(row.count);
      stats.total_attendance_records += parseInt(row.count);
    });

    // Calculate percentages
    const totalDays = stats.total_attendance_records;
    if (totalDays > 0) {
      Object.keys(stats.stats).forEach((status) => {
        stats.percentages[status] = Math.round(
          (stats.stats[status] / totalDays) * 100
        );
      });
    }

    res.json({ stats });
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    res.status(500).json({ error: "Failed to fetch attendance statistics" });
  }
});

// Get detailed attendance data for HR dashboard
router.get("/hr/details", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }

    // Get only employees that exist in employee_master table with their attendance for the month
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        em.employee_id as emp_id,
        em.employee_name,
        em.department,
        em.designation,
        em.type as employment_type,
        em.status as employee_status,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'wfh' THEN 1 END) as wfh_days,
        COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_days,
        COUNT(CASE WHEN a.status = 'holiday' THEN 1 END) as holiday_days,
        COUNT(a.id) as total_attendance_days
      FROM employee_master em
      INNER JOIN users u ON u.email = em.company_email
      LEFT JOIN attendance a ON u.id = a.employee_id 
        AND EXTRACT(MONTH FROM a.date) = $1 
        AND EXTRACT(YEAR FROM a.date) = $2
      WHERE em.status = 'active'
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, em.employee_id, em.employee_name, em.department, em.designation, em.type, em.status
      ORDER BY em.type, em.employee_name
    `,
      [parseInt(month), parseInt(year)]
    );

    res.json({ employees: result.rows });
  } catch (error) {
    console.error("Error fetching HR attendance details:", error);
    res.status(500).json({ error: "Failed to fetch attendance details" });
  }
});

module.exports = router;
