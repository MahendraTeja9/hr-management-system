const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

// Middleware to check if user is HR/Admin
const checkHRRole = (req, res, next) => {
  if (req.user.role !== "hr" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. HR role required." });
  }
  next();
};

// ============================================================================
// LEAVE TYPES MANAGEMENT
// ============================================================================

// Get all leave types
router.get(
  "/leave-types",
  [authenticateToken, checkHRRole],
  async (req, res) => {
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
  }
);

// Get all leave types (including inactive for admin)
router.get(
  "/leave-types/all",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT * FROM leave_types 
      ORDER BY is_active DESC, type_name
    `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching all leave types:", error);
      res.status(500).json({ error: "Failed to fetch leave types" });
    }
  }
);

// Create new leave type
router.post(
  "/leave-types",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const { type_name, description, max_days, color } = req.body;

      // Validate required fields
      if (!type_name || !description) {
        return res
          .status(400)
          .json({ error: "Leave type name and description are required" });
      }

      // Check if leave type already exists
      const existingType = await pool.query(
        "SELECT id FROM leave_types WHERE LOWER(type_name) = LOWER($1)",
        [type_name]
      );

      if (existingType.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Leave type with this name already exists" });
      }

      const result = await pool.query(
        `
      INSERT INTO leave_types (type_name, description, max_days, color, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `,
        [type_name, description, max_days || null, color || "#3B82F6"]
      );

      res.status(201).json({
        message: "Leave type created successfully",
        leaveType: result.rows[0],
      });
    } catch (error) {
      console.error("Error creating leave type:", error);
      if (error.code === "23505") {
        // Unique constraint violation
        res
          .status(400)
          .json({ error: "Leave type with this name already exists" });
      } else {
        res.status(500).json({ error: "Failed to create leave type" });
      }
    }
  }
);

// Update leave type
router.put(
  "/leave-types/:id",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type_name, description, max_days, color, is_active } = req.body;

      // Validate required fields
      if (!type_name || !description) {
        return res
          .status(400)
          .json({ error: "Leave type name and description are required" });
      }

      // Check if leave type exists
      const existingType = await pool.query(
        "SELECT * FROM leave_types WHERE id = $1",
        [id]
      );
      if (existingType.rows.length === 0) {
        return res.status(404).json({ error: "Leave type not found" });
      }

      // Check if name is already taken by another leave type
      const duplicateCheck = await pool.query(
        "SELECT id FROM leave_types WHERE LOWER(type_name) = LOWER($1) AND id != $2",
        [type_name, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Leave type with this name already exists" });
      }

      const result = await pool.query(
        `
      UPDATE leave_types 
      SET type_name = $1, description = $2, max_days = $3, color = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `,
        [
          type_name,
          description,
          max_days || null,
          color || "#3B82F6",
          is_active !== false,
          id,
        ]
      );

      res.json({
        message: "Leave type updated successfully",
        leaveType: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating leave type:", error);
      if (error.code === "23505") {
        // Unique constraint violation
        res
          .status(400)
          .json({ error: "Leave type with this name already exists" });
      } else {
        res.status(500).json({ error: "Failed to update leave type" });
      }
    }
  }
);

// Delete leave type (soft delete)
router.delete(
  "/leave-types/:id",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if leave type exists
      const existingType = await pool.query(
        "SELECT * FROM leave_types WHERE id = $1",
        [id]
      );
      if (existingType.rows.length === 0) {
        return res.status(404).json({ error: "Leave type not found" });
      }

      // Check if leave type is used in any leave requests
      const usageCheck = await pool.query(
        "SELECT COUNT(*) as count FROM leave_requests WHERE leave_type = $1",
        [existingType.rows[0].type_name]
      );

      if (parseInt(usageCheck.rows[0].count) > 0) {
        // Soft delete - mark as inactive
        await pool.query(
          `
        UPDATE leave_types 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
          [id]
        );

        res.json({
          message:
            "Leave type deactivated successfully (has existing leave requests)",
          action: "deactivated",
        });
      } else {
        // Hard delete if no usage
        await pool.query("DELETE FROM leave_types WHERE id = $1", [id]);

        res.json({
          message: "Leave type deleted successfully",
          action: "deleted",
        });
      }
    } catch (error) {
      console.error("Error deleting leave type:", error);
      res.status(500).json({ error: "Failed to delete leave type" });
    }
  }
);

// ============================================================================
// SYSTEM SETTINGS MANAGEMENT
// ============================================================================

// Get system settings
router.get(
  "/system-settings",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM system_settings ORDER BY id LIMIT 1"
      );

      if (result.rows.length === 0) {
        // Return default settings if none exist
        return res.json({
          total_annual_leaves: 15,
          allow_half_day: true,
          approval_workflow: "manager_then_hr",
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ error: "Failed to fetch system settings" });
    }
  }
);

// Update system settings
router.put(
  "/system-settings",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const { total_annual_leaves, allow_half_day, approval_workflow } =
        req.body;

      // Validate required fields
      if (
        !total_annual_leaves ||
        typeof allow_half_day !== "boolean" ||
        !approval_workflow
      ) {
        return res
          .status(400)
          .json({ error: "All system settings fields are required" });
      }

      // Validate values
      if (total_annual_leaves < 1 || total_annual_leaves > 365) {
        return res
          .status(400)
          .json({ error: "Total annual leaves must be between 1 and 365" });
      }

      const validWorkflows = ["manager_then_hr", "direct_hr", "manager_only"];
      if (!validWorkflows.includes(approval_workflow)) {
        return res.status(400).json({ error: "Invalid approval workflow" });
      }

      // Check if settings exist
      const existingSettings = await pool.query(
        "SELECT * FROM system_settings ORDER BY id LIMIT 1"
      );

      let result;
      if (existingSettings.rows.length === 0) {
        // Create new settings
        result = await pool.query(
          `
        INSERT INTO system_settings (total_annual_leaves, allow_half_day, approval_workflow)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
          [total_annual_leaves, allow_half_day, approval_workflow]
        );
      } else {
        // Update existing settings
        result = await pool.query(
          `
        UPDATE system_settings 
        SET total_annual_leaves = $1, allow_half_day = $2, approval_workflow = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `,
          [
            total_annual_leaves,
            allow_half_day,
            approval_workflow,
            existingSettings.rows[0].id,
          ]
        );
      }

      // Update all employee leave balances for current year if total_annual_leaves changed
      if (
        existingSettings.rows.length === 0 ||
        existingSettings.rows[0].total_annual_leaves !== total_annual_leaves
      ) {
        const currentYear = new Date().getFullYear();
        await pool.query(
          `
        UPDATE leave_balances 
        SET total_allocated = $1, 
            leaves_remaining = $1 - leaves_taken,
            updated_at = CURRENT_TIMESTAMP
        WHERE year = $2
      `,
          [total_annual_leaves, currentYear]
        );
      }

      res.json({
        message: "System settings updated successfully",
        settings: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating system settings:", error);
      res.status(500).json({ error: "Failed to update system settings" });
    }
  }
);

// ============================================================================
// DEPARTMENTS MANAGEMENT
// ============================================================================

// Get all departments
router.get(
  "/departments",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT d.*, u.first_name, u.last_name, u.email as manager_email
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
      WHERE d.is_active = true
      ORDER BY d.name
    `);

      // Format the response to include manager info
      const departments = result.rows.map((dept) => ({
        ...dept,
        manager_name:
          dept.first_name && dept.last_name
            ? `${dept.first_name} ${dept.last_name}`
            : null,
      }));

      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  }
);

// Get all departments (including inactive)
router.get(
  "/departments/all",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT d.*, u.first_name, u.last_name, u.email as manager_email
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
      ORDER BY d.is_active DESC, d.name
    `);

      // Format the response to include manager info
      const departments = result.rows.map((dept) => ({
        ...dept,
        manager_name:
          dept.first_name && dept.last_name
            ? `${dept.first_name} ${dept.last_name}`
            : null,
      }));

      res.json(departments);
    } catch (error) {
      console.error("Error fetching all departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  }
);

// Create new department
router.post(
  "/departments",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const { name, code, description, manager_id } = req.body;

      // Validate required fields
      if (!name || !code) {
        return res
          .status(400)
          .json({ error: "Department name and code are required" });
      }

      // Check if department name or code already exists
      const existingDept = await pool.query(
        "SELECT id FROM departments WHERE LOWER(name) = LOWER($1) OR UPPER(code) = UPPER($2)",
        [name, code]
      );

      if (existingDept.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Department with this name or code already exists" });
      }

      // Validate manager_id if provided
      if (manager_id) {
        const managerCheck = await pool.query(
          "SELECT id FROM users WHERE id = $1 AND (role = $2 OR role = $3)",
          [manager_id, "manager", "hr"]
        );

        if (managerCheck.rows.length === 0) {
          return res
            .status(400)
            .json({ error: "Invalid manager ID or user is not a manager" });
        }
      }

      const result = await pool.query(
        `
      INSERT INTO departments (name, code, description, manager_id, is_active)
      VALUES ($1, UPPER($2), $3, $4, true)
      RETURNING *
    `,
        [name, code, description || null, manager_id || null]
      );

      res.status(201).json({
        message: "Department created successfully",
        department: result.rows[0],
      });
    } catch (error) {
      console.error("Error creating department:", error);
      if (error.code === "23505") {
        // Unique constraint violation
        res
          .status(400)
          .json({ error: "Department with this name or code already exists" });
      } else {
        res.status(500).json({ error: "Failed to create department" });
      }
    }
  }
);

// Update department
router.put(
  "/departments/:id",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, description, manager_id, is_active } = req.body;

      // Validate required fields
      if (!name || !code) {
        return res
          .status(400)
          .json({ error: "Department name and code are required" });
      }

      // Check if department exists
      const existingDept = await pool.query(
        "SELECT * FROM departments WHERE id = $1",
        [id]
      );
      if (existingDept.rows.length === 0) {
        return res.status(404).json({ error: "Department not found" });
      }

      // Check if name or code is already taken by another department
      const duplicateCheck = await pool.query(
        "SELECT id FROM departments WHERE (LOWER(name) = LOWER($1) OR UPPER(code) = UPPER($2)) AND id != $3",
        [name, code, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Department with this name or code already exists" });
      }

      // Validate manager_id if provided
      if (manager_id) {
        const managerCheck = await pool.query(
          "SELECT id FROM users WHERE id = $1 AND (role = $2 OR role = $3)",
          [manager_id, "manager", "hr"]
        );

        if (managerCheck.rows.length === 0) {
          return res
            .status(400)
            .json({ error: "Invalid manager ID or user is not a manager" });
        }
      }

      const result = await pool.query(
        `
      UPDATE departments 
      SET name = $1, code = UPPER($2), description = $3, manager_id = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `,
        [
          name,
          code,
          description || null,
          manager_id || null,
          is_active !== false,
          id,
        ]
      );

      res.json({
        message: "Department updated successfully",
        department: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating department:", error);
      if (error.code === "23505") {
        // Unique constraint violation
        res
          .status(400)
          .json({ error: "Department with this name or code already exists" });
      } else {
        res.status(500).json({ error: "Failed to update department" });
      }
    }
  }
);

// Delete department (soft delete)
router.delete(
  "/departments/:id",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if department exists
      const existingDept = await pool.query(
        "SELECT * FROM departments WHERE id = $1",
        [id]
      );
      if (existingDept.rows.length === 0) {
        return res.status(404).json({ error: "Department not found" });
      }

      // Check if department has employees
      const employeeCheck = await pool.query(
        "SELECT COUNT(*) as count FROM employee_master WHERE department_id = $1",
        [id]
      );

      if (parseInt(employeeCheck.rows[0].count) > 0) {
        // Soft delete - mark as inactive
        await pool.query(
          `
        UPDATE departments 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
          [id]
        );

        res.json({
          message:
            "Department deactivated successfully (has employees assigned)",
          action: "deactivated",
        });
      } else {
        // Hard delete if no employees
        await pool.query("DELETE FROM departments WHERE id = $1", [id]);

        res.json({
          message: "Department deleted successfully",
          action: "deleted",
        });
      }
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ error: "Failed to delete department" });
    }
  }
);

// Get available managers for department assignment
router.get("/managers", [authenticateToken, checkHRRole], async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT manager_id, manager_name, email, department, designation
      FROM managers 
      WHERE status = 'active'
      ORDER BY manager_name
    `);

    res.json({ managers: result.rows });
  } catch (error) {
    console.error("Error fetching available managers:", error);
    res.status(500).json({ error: "Failed to fetch available managers" });
  }
});

// Get all managers (including assigned ones)
router.get(
  "/managers/all",
  [authenticateToken, checkHRRole],
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.id = d.manager_id
      WHERE u.role IN ('manager', 'hr')
      ORDER BY u.first_name, u.last_name
    `);

      // Format the response
      const managers = result.rows.map((manager) => ({
        ...manager,
        full_name: `${manager.first_name} ${manager.last_name}`,
        is_assigned: !!manager.department_name,
      }));

      res.json(managers);
    } catch (error) {
      console.error("Error fetching all managers:", error);
      res.status(500).json({ error: "Failed to fetch managers" });
    }
  }
);

// Get HR config - Missing endpoint
router.get("/", [authenticateToken, checkHRRole], async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM hr_config ORDER BY created_at DESC LIMIT 1`
    );
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error("Get HR config error:", error);
    res.status(500).json({ error: "Failed to get HR config" });
  }
});

module.exports = router;
