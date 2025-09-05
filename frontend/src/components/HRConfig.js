import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FaCog,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaBuilding,
  FaUsers,
  FaCalendarAlt,
  FaDownload,
  FaFileExcel,
  FaChartBar,
} from "react-icons/fa";

const HRConfig = () => {
  const { token } = useAuth();
  const [activeSection, setActiveSection] = useState("leave-types");
  const [loading, setLoading] = useState(false);

  // Leave Types State
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [leaveTypeForm, setLeaveTypeForm] = useState({
    type_name: "",
    description: "",
    max_days: "",
    color: "#3B82F6",
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
            total_annual_leaves: 15,
    allow_half_day: true,
    approval_workflow: "manager_then_hr",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Departments State
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    code: "",
    description: "",
    manager_id: "",
  });

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const response = await axios.get("/hr-config/leave-types/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaveTypes(response.data);
    } catch (error) {
      console.error("Error fetching leave types:", error);
      toast.error("Failed to fetch leave types");
    }
  }, [token]);

  const fetchSystemSettings = useCallback(async () => {
    try {
      const response = await axios.get("/hr-config/system-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSystemSettings(response.data);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      toast.error("Failed to fetch system settings");
    }
  }, [token]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await axios.get("/hr-config/departments/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to fetch departments");
    }
  }, [token]);

  const fetchManagers = useCallback(async () => {
    try {
      const response = await axios.get("/hr-config/managers/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setManagers(response.data);
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaveTypes();
    fetchSystemSettings();
    fetchDepartments();
    fetchManagers();
  }, [fetchLeaveTypes, fetchSystemSettings, fetchDepartments, fetchManagers]);

  // ============================================================================
  // LEAVE TYPES FUNCTIONS
  // ============================================================================

  const handleLeaveTypeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingLeaveType
        ? `/hr-config/leave-types/${editingLeaveType.id}`
        : "/hr-config/leave-types";

      const method = editingLeaveType ? "put" : "post";

      await axios[method](
        url,
        {
          ...leaveTypeForm,
          max_days: leaveTypeForm.max_days
            ? parseInt(leaveTypeForm.max_days)
            : null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(
        `Leave type ${editingLeaveType ? "updated" : "created"} successfully!`
      );
      setShowLeaveTypeModal(false);
      setEditingLeaveType(null);
      setLeaveTypeForm({
        type_name: "",
        description: "",
        max_days: "",
        color: "#3B82F6",
      });
      fetchLeaveTypes();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save leave type");
    } finally {
      setLoading(false);
    }
  };

  const handleEditLeaveType = (leaveType) => {
    setEditingLeaveType(leaveType);
    setLeaveTypeForm({
      type_name: leaveType.type_name,
      description: leaveType.description,
      max_days: leaveType.max_days || "",
      color: leaveType.color,
    });
    setShowLeaveTypeModal(true);
  };

  const handleDeleteLeaveType = async (id) => {
    if (!window.confirm("Are you sure you want to delete this leave type?")) {
      return;
    }

    try {
      await axios.delete(`/hr-config/leave-types/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Leave type deleted successfully!");
      fetchLeaveTypes();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete leave type");
    }
  };

  // ============================================================================
  // SYSTEM SETTINGS FUNCTIONS
  // ============================================================================

  const handleSystemSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);

    try {
      await axios.put("/hr-config/system-settings", systemSettings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("System settings updated successfully!");
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to update system settings"
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  // ============================================================================
  // DEPARTMENTS FUNCTIONS
  // ============================================================================

  const handleDepartmentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingDepartment
        ? `/hr-config/departments/${editingDepartment.id}`
        : "/hr-config/departments";

      const method = editingDepartment ? "put" : "post";

      await axios[method](
        url,
        {
          ...departmentForm,
          manager_id: departmentForm.manager_id || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(
        `Department ${editingDepartment ? "updated" : "created"} successfully!`
      );
      setShowDepartmentModal(false);
      setEditingDepartment(null);
      setDepartmentForm({
        name: "",
        code: "",
        description: "",
        manager_id: "",
      });
      fetchDepartments();
      fetchManagers(); // Refresh managers list
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save department");
    } finally {
      setLoading(false);
    }
  };

  const handleEditDepartment = (department) => {
    setEditingDepartment(department);
    setDepartmentForm({
      name: department.name,
      code: department.code,
      description: department.description || "",
      manager_id: department.manager_id || "",
    });
    setShowDepartmentModal(true);
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?")) {
      return;
    }

    try {
      await axios.delete(`/hr-config/departments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Department deleted successfully!");
      fetchDepartments();
      fetchManagers(); // Refresh managers list
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete department");
    }
  };

  const exportHierarchy = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/expenses/hierarchy-export");

      if (response.status === 200) {
        const data = response.data;

        // Convert to Excel format
        const csvContent = [
          data.headers.join(","),
          ...data.data.map((row) =>
            data.headers
              .map((header) => {
                const value =
                  row[header.toLowerCase().replace(/\s+/g, "_")] || "";
                return `"${value}"`;
              })
              .join(",")
          ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `employee_hierarchy_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success("Hierarchy report exported successfully!");
      } else {
        toast.error("Failed to export hierarchy report");
      }
    } catch (error) {
      console.error("Error exporting hierarchy:", error);
      toast.error("Failed to export hierarchy report");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: "leave-types", label: "Leave Types", icon: FaCalendarAlt },
    { id: "system-settings", label: "System Settings", icon: FaCog },
    { id: "departments", label: "Departments", icon: FaBuilding },
    { id: "reports", label: "Reports", icon: FaDownload },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <FaCog className="mr-3 text-blue-600" />
          HR Configuration
        </h2>
        <p className="text-gray-600 mt-1">
          Manage leave types, system settings, and departments
        </p>
      </div>

      {/* Section Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeSection === section.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="mr-2" />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Leave Types Section */}
        {activeSection === "leave-types" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Leave Types
                </h3>
                <p className="text-gray-600">
                  Manage available leave types for employees
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingLeaveType(null);
                  setLeaveTypeForm({
                    type_name: "",
                    description: "",
                    max_days: "",
                    color: "#3B82F6",
                  });
                  setShowLeaveTypeModal(true);
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus className="mr-2" />
                Add Leave Type
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveTypes.map((leaveType) => (
                    <tr key={leaveType.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-3"
                            style={{ backgroundColor: leaveType.color }}
                          ></div>
                          <span className="text-sm font-medium text-gray-900">
                            {leaveType.type_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {leaveType.description}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {leaveType.max_days
                            ? `${leaveType.max_days} days`
                            : "No limit"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            leaveType.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {leaveType.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEditLeaveType(leaveType)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteLeaveType(leaveType.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* System Settings Section */}
        {activeSection === "system-settings" && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                System Settings
              </h3>
              <p className="text-gray-600">
                Configure global leave management settings
              </p>
            </div>

            <form
              onSubmit={handleSystemSettingsSubmit}
              className="space-y-6 max-w-2xl"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Annual Leaves
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={systemSettings.total_annual_leaves}
                  onChange={(e) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      total_annual_leaves: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default number of annual leave days for all employees
                </p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={systemSettings.allow_half_day}
                    onChange={(e) =>
                      setSystemSettings((prev) => ({
                        ...prev,
                        allow_half_day: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Allow Half-Day Leaves
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Enable employees to request half-day leaves
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Workflow
                </label>
                <select
                  value={systemSettings.approval_workflow}
                  onChange={(e) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      approval_workflow: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="manager_then_hr">Manager → HR</option>
                  <option value="direct_hr">Direct HR</option>
                  <option value="manager_only">Manager Only</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Define the approval workflow for leave requests
                </p>
              </div>

              <button
                type="submit"
                disabled={settingsLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {settingsLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <FaCheck className="mr-2" />
                    Update Settings
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Departments Section */}
        {activeSection === "departments" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Departments
                </h3>
                <p className="text-gray-600">
                  Manage company departments and assign managers
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingDepartment(null);
                  setDepartmentForm({
                    name: "",
                    code: "",
                    description: "",
                    manager_id: "",
                  });
                  setShowDepartmentModal(true);
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus className="mr-2" />
                Add Department
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.map((department) => (
                    <tr key={department.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {department.name}
                          </div>
                          {department.description && (
                            <div className="text-sm text-gray-500">
                              {department.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded">
                          {department.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaUsers className="mr-2 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {department.manager_name || "No manager assigned"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            department.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {department.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEditDepartment(department)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(department.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Leave Type Modal */}
      {showLeaveTypeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingLeaveType ? "Edit Leave Type" : "Add Leave Type"}
              </h3>
              <form onSubmit={handleLeaveTypeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type Name *
                  </label>
                  <input
                    type="text"
                    value={leaveTypeForm.type_name}
                    onChange={(e) =>
                      setLeaveTypeForm((prev) => ({
                        ...prev,
                        type_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={leaveTypeForm.description}
                    onChange={(e) =>
                      setLeaveTypeForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Days (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={leaveTypeForm.max_days}
                    onChange={(e) =>
                      setLeaveTypeForm((prev) => ({
                        ...prev,
                        max_days: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty for no limit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={leaveTypeForm.color}
                    onChange={(e) =>
                      setLeaveTypeForm((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLeaveTypeModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading
                      ? "Saving..."
                      : editingLeaveType
                      ? "Update"
                      : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {showDepartmentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingDepartment ? "Edit Department" : "Add Department"}
              </h3>
              <form onSubmit={handleDepartmentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    value={departmentForm.name}
                    onChange={(e) =>
                      setDepartmentForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Code *
                  </label>
                  <input
                    type="text"
                    value={departmentForm.code}
                    onChange={(e) =>
                      setDepartmentForm((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    maxLength="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={departmentForm.description}
                    onChange={(e) =>
                      setDepartmentForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager
                  </label>
                  <select
                    value={departmentForm.manager_id}
                    onChange={(e) =>
                      setDepartmentForm((prev) => ({
                        ...prev,
                        manager_id: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Manager</option>
                    {managers
                      .filter(
                        (manager) =>
                          !manager.is_assigned ||
                          manager.id === departmentForm.manager_id
                      )
                      .map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.full_name} ({manager.email})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDepartmentModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading
                      ? "Saving..."
                      : editingDepartment
                      ? "Update"
                      : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reports Section */}
      {activeSection === "reports" && (
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Reports & Exports
            </h3>
            <p className="text-gray-600">
              Generate and download various reports
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hierarchy Report */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FaFileExcel className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Employee Hierarchy Report
                  </h4>
                  <p className="text-gray-600">
                    Export complete organizational structure
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Download a comprehensive report containing employee details,
                manager assignments, and organizational hierarchy.
              </p>
              <button
                onClick={exportHierarchy}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <FaDownload className="mr-2" />
                {loading ? "Generating..." : "Download Hierarchy Report"}
              </button>
            </div>

            {/* Expense Reports */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FaFileExcel className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Expense Reports
                  </h4>
                  <p className="text-gray-600">
                    Access expense analytics and reports
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                View detailed expense analytics, category breakdowns, and export
                expense data in various formats.
              </p>
              <button
                onClick={() => (window.location.href = "#expense-analytics")}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaChartBar className="mr-2" />
                Go to Expense Analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRConfig;
