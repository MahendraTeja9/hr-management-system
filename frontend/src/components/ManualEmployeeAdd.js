import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FaPlus, FaTimes } from "react-icons/fa";

const ManualEmployeeAdd = ({ onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    employment_type: "Full-Time",
    temp_password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      console.log("🔍 Sending employee data:", formData);
      const response = await axios.post("/hr/manual-add-employee", formData);

      toast.success("Employee manually added successfully!");

      if (onSuccess) {
        // Add a small delay to ensure database transaction is complete
        setTimeout(() => {
          console.log("🔍 Calling onSuccess after delay");
          onSuccess();
        }, 500);
      }

      // Reset form
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        employment_type: "Full-Time",
        temp_password: "",
      });

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error manually adding employee:", error);
      console.error("Error response:", error.response?.data);

      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error;
        const validationErrors = error.response?.data?.errors;

        if (validationErrors && validationErrors.length > 0) {
          const errorMessages = validationErrors
            .map((err) => err.msg)
            .join(", ");
          toast.error(`Validation errors: ${errorMessages}`);
        } else if (errorMessage) {
          toast.error(errorMessage);
        } else {
          toast.error("Please check your input and try again");
        }
      } else {
        toast.error("Failed to manually add employee");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Manually Add Employee
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="employee@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter first name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter last name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employment Type
            </label>
            <select
              name="employment_type"
              value={formData.employment_type}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Full-Time">Full-Time</option>
              <option value="Contract">Contract</option>
              <option value="Intern">Intern</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temporary Password (Optional)
            </label>
            <input
              type="text"
              name="temp_password"
              value={formData.temp_password}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Leave empty for auto-generation"
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              If left empty, a temporary password will be generated
              automatically
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will create a user account only. The
              employee will need to:
            </p>
            <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
              <li>Submit their onboarding form</li>
              <li>Get approved by HR</li>
              <li>Be assigned to the master table</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualEmployeeAdd;
