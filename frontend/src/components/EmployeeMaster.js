import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaCalendarAlt,
  FaPlus,
  FaTimes,
  FaEye,
  FaTrash,
  FaEdit,
  FaDownload,
  FaUpload,
} from "react-icons/fa";
import ManualEmployeeAdd from "./ManualEmployeeAdd";
import toast from "react-hot-toast";

const EmployeeMaster = ({ employees, onRefresh }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [managers, setManagers] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [employeesPerPage] = useState(20);

  const handleEmployeeAdded = () => {
    console.log("🔍 handleEmployeeAdded called");
    setShowAddForm(false);
    if (onRefresh) {
      console.log("🔍 Calling onRefresh function");
      onRefresh();
    } else {
      console.log("❌ onRefresh function not provided");
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await axios.get("/hr-config/managers");
      setManagers(response.data.managers);
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleViewEmployee = (employee) => {
    setViewingEmployee(employee);
    setShowViewModal(true);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEditFormData({
      employee_name: employee.employee_name,
      company_email: employee.company_email,
      type: employee.type,
      doj: employee.doj,
      status: employee.status,
      department: employee.department || "",
      designation: employee.designation || "",
      salary_band: employee.salary_band || "",
      location: employee.location || "",
      manager_id: employee.manager_id || "",
      manager2_id: employee.manager2_id || "",
      manager3_id: employee.manager3_id || "",
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateEmployee = async () => {
    try {
      await axios.put(`/hr/master/${editingEmployee.id}`, editFormData);
      setShowEditModal(false);
      setEditingEmployee(null);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error updating employee:", error);
      alert(error.response?.data?.error || "Failed to update employee");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const response = await axios.get("/hr/master/export", {
        responseType: "blob",
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Get filename from response headers or create default
      const contentDisposition = response.headers["content-disposition"];
      let filename = "employee_master.xlsx";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Employee master data downloaded successfully!");
    } catch (error) {
      console.error("Error downloading Excel:", error);
      toast.error("Failed to download employee data");
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await axios.get("/hr/master/export-csv", {
        responseType: "blob",
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Get filename from response headers or create default
      const contentDisposition = response.headers["content-disposition"];
      let filename = "employee_master.csv";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Employee master data downloaded as CSV successfully!");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Failed to download employee data as CSV");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];

      if (
        !validTypes.includes(file.type) &&
        !file.name.endsWith(".xlsx") &&
        !file.name.endsWith(".xls") &&
        !file.name.endsWith(".csv")
      ) {
        toast.error(
          "Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file"
        );
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      setUploadFile(file);
    }
  };

  const handleUploadExcel = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("excelFile", uploadFile);

      const response = await axios.post("/hr/master/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const results = response.data.results;

      // Show detailed results
      let message = `Import completed! `;
      message += `Total: ${results.total}, `;
      message += `Success: ${results.success}, `;
      message += `Skipped: ${results.skipped.length}, `;
      message += `Errors: ${results.errors.length}`;

      if (results.errors.length > 0) {
        message += `\n\nErrors:\n${results.errors
          .map((e) => `Row ${e.row}: ${e.error}`)
          .join("\n")}`;
      }

      toast.success(message, { duration: 8000 });

      // Reset form and refresh data
      setUploadFile(null);
      setShowUploadModal(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error uploading Excel:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to upload file";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Pagination calculations
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = employees.slice(
    indexOfFirstEmployee,
    indexOfLastEmployee
  );
  const totalPages = Math.ceil(employees.length / employeesPerPage);

  return (
    <div>
      {/* Header with Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Employee Master Table
        </h2>
        <div className="flex space-x-3">
          <div className="flex space-x-2">
            <button
              onClick={handleDownloadExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              title="Download employee data as Excel"
            >
              <FaDownload className="mr-2" />
              Excel
            </button>
            <button
              onClick={handleDownloadCSV}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
              title="Download employee data as CSV"
            >
              <FaDownload className="mr-2" />
              CSV
            </button>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            title="Upload employee data from Excel or CSV"
          >
            <FaUpload className="mr-2" />
            Upload Excel/CSV
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center"
          >
            {showAddForm ? (
              <>
                <FaTimes className="mr-2" />
                Hide Form
              </>
            ) : (
              <>
                <FaPlus className="mr-2" />
                Add Employee
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="mb-8">
          <React.Suspense fallback={<div>Loading form...</div>}>
            <ManualEmployeeAdd
              onSuccess={handleEmployeeAdded}
              onClose={() => setShowAddForm(false)}
            />
          </React.Suspense>
        </div>
      )}

      {/* Employee Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date of Joining
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Managers
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
            {currentEmployees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FaIdCard className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {employee.employee_id}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <FaUser className="h-4 w-4 text-primary-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.employee_name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FaEnvelope className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {employee.company_email}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                    {employee.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FaCalendarAlt className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {new Date(employee.doj).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {employee.manager_name && (
                      <div className="mb-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {employee.manager_name}
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
                    {!employee.manager_name &&
                      !employee.manager2_name &&
                      !employee.manager3_name && (
                        <span className="text-gray-500 italic">
                          No Managers
                        </span>
                      )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      employee.status === "active"
                        ? "bg-success-100 text-success-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {employee.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleViewEmployee(employee)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title="View"
                  >
                    <FaEye className="inline" />
                  </button>
                  <button
                    onClick={() => handleEditEmployee(employee)}
                    className="text-green-600 hover:text-green-900 mr-3"
                    title="Edit"
                  >
                    <FaEdit className="inline" />
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete ${employee.employee_name} from master?`
                        )
                      )
                        return;
                      try {
                        console.log(
                          "🗑️ Attempting to delete employee:",
                          employee.id
                        );
                        console.log(
                          "🔐 Current axios headers:",
                          axios.defaults.headers.common
                        );

                        const response = await axios.delete(
                          `http://localhost:5001/api/hr/master/${employee.id}`
                        );

                        console.log("✅ Delete response:", response.data);
                        toast.success("Employee deleted successfully!");
                        if (onRefresh) onRefresh();
                      } catch (e) {
                        console.error("❌ Delete error:", e);
                        console.error("❌ Error response:", e.response);

                        const errorMessage =
                          e.response?.data?.error ||
                          e.response?.data?.message ||
                          "Failed to delete employee";

                        toast.error(errorMessage);
                      }
                    }}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
                  >
                    <FaTrash className="inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {currentEmployees.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <FaUser className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium">
                No employees in master table
              </p>
              <p className="text-sm">
                Employees will appear here after their onboarding forms are
                approved.
              </p>
            </div>
          </div>
        )}

        {/* Pagination */}
        {employees.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {indexOfFirstEmployee + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastEmployee, employees.length)}
                  </span>{" "}
                  of <span className="font-medium">{employees.length}</span>{" "}
                  results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNumber) => (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNumber === currentPage
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Employee
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateEmployee();
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employee Name
                    </label>
                    <input
                      type="text"
                      name="employee_name"
                      value={editFormData.employee_name || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Company Email
                    </label>
                    <input
                      type="email"
                      name="company_email"
                      value={editFormData.company_email || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employment Type
                    </label>
                    <select
                      name="type"
                      value={editFormData.type || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="Full-Time">Full-Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Joining
                    </label>
                    <input
                      type="date"
                      name="doj"
                      value={editFormData.doj || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      name="status"
                      value={editFormData.status || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={editFormData.department || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Designation
                    </label>
                    <input
                      type="text"
                      name="designation"
                      value={editFormData.designation || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={editFormData.location || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Manager 1 (Optional)
                    </label>
                    <select
                      name="manager_id"
                      value={editFormData.manager_id || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Manager 1</option>
                      {managers &&
                        managers.map((manager) => (
                          <option
                            key={manager.manager_id}
                            value={manager.manager_id}
                          >
                            {manager.manager_name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Manager 2 (Optional)
                    </label>
                    <select
                      name="manager2_id"
                      value={editFormData.manager2_id || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Manager 2</option>
                      {managers &&
                        managers.map((manager) => (
                          <option
                            key={manager.manager_id}
                            value={manager.manager_id}
                          >
                            {manager.manager_name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Manager 3 (Optional)
                    </label>
                    <select
                      name="manager3_id"
                      value={editFormData.manager3_id || ""}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Manager 3</option>
                      {managers &&
                        managers.map((manager) => (
                          <option
                            key={manager.manager_id}
                            value={manager.manager_id}
                          >
                            {manager.manager_name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Update Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && viewingEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Employee Details
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Employee
                  </label>
                  <p className="text-sm text-gray-900">
                    {viewingEmployee.employee_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ID
                  </label>
                  <p className="text-sm text-gray-900">
                    {viewingEmployee.employee_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="text-sm text-gray-900">
                    {viewingEmployee.company_email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <p className="text-sm text-gray-900">
                    {viewingEmployee.type}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    DOJ
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingEmployee.doj).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Manager
                  </label>
                  <p className="text-sm text-gray-900">
                    {viewingEmployee.display_manager_name || "Not Assigned"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <p className="text-sm text-gray-900">
                    {viewingEmployee.status}
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Excel Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Upload Employee Data from Excel/CSV
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel/CSV File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Selected: {uploadFile.name}
                  </p>
                )}
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  Required Columns:
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• employee_name (required)</li>
                  <li>• company_email (required)</li>
                  <li>
                    • type (required: Intern, Contract, Full-Time, Manager)
                  </li>
                  <li>• doj (required: Date of Joining)</li>
                  <li>
                    • employee_id (optional: will be auto-generated if not
                    provided)
                  </li>
                  <li>• manager_name (optional)</li>
                  <li>
                    • department, designation, salary_band, location (optional)
                  </li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadExcel}
                  disabled={!uploadFile || uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {uploading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaUpload className="mr-2" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeMaster;
