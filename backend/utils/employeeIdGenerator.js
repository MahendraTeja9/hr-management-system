const { pool } = require("../config/database");

/**
 * Generate a unique 6-digit employee ID
 * @returns {Promise<string>} A unique 6-digit employee ID
 */
async function generateEmployeeId() {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate a random 6-digit number
    const employeeId = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      // Check if this ID already exists in employee_master table
      const existingEmployee = await pool.query(
        "SELECT id FROM employee_master WHERE employee_id = $1",
        [employeeId]
      );

      if (existingEmployee.rows.length === 0) {
        // ID is unique, return it
        return employeeId;
      }

      attempts++;
    } catch (error) {
      console.error("Error checking employee ID uniqueness:", error);
      throw new Error("Failed to generate unique employee ID");
    }
  }

  throw new Error(
    "Unable to generate unique employee ID after multiple attempts"
  );
}

/**
 * Validate employee ID format (6 digits)
 * @param {string} employeeId - The employee ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateEmployeeId(employeeId) {
  return /^\d{6}$/.test(employeeId);
}

module.exports = {
  generateEmployeeId,
  validateEmployeeId,
};
