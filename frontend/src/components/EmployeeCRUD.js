import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaSave,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";
import { format } from "date-fns";

const EmployeeCRUD = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    type: "Full-Time",
    status: "active",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/hr/employees");
      console.log("🔍 Employee data received:", response.data.employees);
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      type: "Full-Time",
    });
  };

  const handleCreate = async () => {
    try {
      if (!formData.email || !formData.first_name || !formData.last_name) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      const employeeData = {
        name: `${formData.first_name} ${formData.last_name}`,
        email: formData.email, // Personal email
        type: formData.type,
        doj: new Date().toISOString(),
      };

      console.log("Sending employee data:", employeeData);

      await axios.post("http://localhost:5001/api/hr/employees", employeeData);

      toast.success("Employee created successfully");
      setShowAddModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error("Error creating employee:", error);
      console.error("Error response:", error.response?.data);

      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error;
        if (errorMessage) {
          toast.error(errorMessage);
        } else {
          toast.error("Something went wrong, please try again.");
        }
      } else {
        // Handle other errors with generic message
        toast.error("Something went wrong, please try again.");
      }
    }
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      first_name: employee.first_name || "",
      last_name: employee.last_name || "",
      email: employee.email || "",
      type: employee.assigned_job_role || "Full-Time",
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    try {
      if (!selectedEmployee) return;

      await axios.put(
        `http://localhost:5001/api/hr/employees/${selectedEmployee.id}`,
        formData
      );

      toast.success("Employee updated successfully");
      setShowEditModal(false);
      setSelectedEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error(error.response?.data?.error || "Failed to update employee");
    }
  };

  const handleView = async (employee) => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/hr/employees/${employee.id}`
      );
      setSelectedEmployee(response.data.employee);
      setShowViewModal(true);
    } catch (error) {
      console.error("Error fetching employee details:", error);
      toast.error("Failed to fetch employee details");
    }
  };

  const handleDelete = async (employee) => {
    const employeeName =
      employee.first_name && employee.last_name
        ? `${employee.first_name} ${employee.last_name}`
        : employee.first_name ||
          employee.last_name ||
          employee.email ||
          "this employee";

    if (!window.confirm(`Are you sure you want to delete ${employeeName}?`)) {
      return;
    }

    try {
      await axios.delete(`/hr/employees/${employee.id}`);
      toast.success("Employee deleted successfully");
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error(error.response?.data?.error || "Failed to delete employee");
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${employee.first_name || ""} ${
      employee.last_name || ""
    }`.trim();
    return (
      fullName.toLowerCase().includes(searchLower) ||
      (employee.email?.toLowerCase() || "").includes(searchLower) ||
      (employee.assigned_job_role?.toLowerCase() || "").includes(searchLower)
    );
  });

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    return status === "active"
      ? `${baseClasses} bg-green-100 text-green-800`
      : `${baseClasses} bg-red-100 text-red-800`;
  };

  const getRoleBadge = (role) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (role) {
      case "Full-Time":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Contract":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "Intern":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "Product Developer":
        return `${baseClasses} bg-indigo-100 text-indigo-800`;
      case "hr":
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case "manager":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "Not Assigned":
        return `${baseClasses} bg-gray-100 text-gray-600`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Employee Management
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <FaPlus className="mr-2" />
          Add Employee
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchEmployees}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <FaUser className="mx-auto text-gray-400 text-4xl mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Employees Found
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? "No employees match your search."
                : "No employees added yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Managers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <FaUser className="text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.first_name && employee.last_name
                              ? `${employee.first_name} ${employee.last_name}`
                              : employee.first_name ||
                                employee.last_name ||
                                employee.email ||
                                "Unknown Employee"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {employee.assigned_employee_id ? (
                          <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {employee.assigned_employee_id}
                          </span>
                        ) : (
                          <span className="text-gray-500 italic">
                            Not Assigned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {employee.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={getRoleBadge(employee.assigned_job_role)}
                      >
                        {employee.assigned_job_role || "Not Assigned"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {employee.assigned_manager && (
                          <div className="mb-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {employee.assigned_manager}
                            </span>
                          </div>
                        )}
                        {employee.manager2_name && (
                          <div className="mb-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {employee.manager2_name}
                            </span>
                          </div>
                        )}
                        {employee.manager3_name && (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {employee.manager3_name}
                            </span>
                          </div>
                        )}
                        {!employee.assigned_manager &&
                          !employee.manager2_name &&
                          !employee.manager3_name && (
                            <span className="text-gray-500 italic">
                              No Managers
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(employee.status)}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.created_at
                        ? format(new Date(employee.created_at), "MMM dd, yyyy")
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(employee)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(employee)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add New Employee
              </h3>

              <div className="space-y-4">
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
                    required
                  />
                </div>

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
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  <FaTimes className="mr-2 inline" />
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <FaSave className="mr-2 inline" />
                  Create Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Employee
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEmployee(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  <FaTimes className="mr-2 inline" />
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  <FaSave className="mr-2 inline" />
                  Update Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Employee Details
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="text-gray-900">
                    {selectedEmployee.first_name && selectedEmployee.last_name
                      ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                      : selectedEmployee.first_name ||
                        selectedEmployee.last_name ||
                        selectedEmployee.email ||
                        "Unknown Employee"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">
                    Employee ID:
                  </span>
                  <span className="text-gray-900">
                    {selectedEmployee.assigned_employee_id ? (
                      <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {selectedEmployee.assigned_employee_id}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">Not Assigned</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="text-gray-900">
                    {selectedEmployee.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Role:</span>
                  <span
                    className={getRoleBadge(selectedEmployee.assigned_job_role)}
                  >
                    {selectedEmployee.assigned_job_role || "Not Assigned"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={getStatusBadge(selectedEmployee.status)}>
                    {selectedEmployee.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Created:</span>
                  <span className="text-gray-900">
                    {selectedEmployee.created_at
                      ? format(
                          new Date(selectedEmployee.created_at),
                          "MMM dd, yyyy"
                        )
                      : "-"}
                  </span>
                </div>
                {selectedEmployee.form_name && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">
                      Form Name:
                    </span>
                    <span className="text-gray-900">
                      {selectedEmployee.form_name}
                    </span>
                  </div>
                )}
                {selectedEmployee.phone && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Phone:</span>
                    <span className="text-gray-900">
                      {selectedEmployee.phone}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedEmployee(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  <FaTimes className="mr-2 inline" />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCRUD;
