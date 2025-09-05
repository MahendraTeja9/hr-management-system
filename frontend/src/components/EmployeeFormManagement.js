import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import {
  FaTrash,
  FaDownload,
  FaSearch,
  FaCheck,
  FaTimes,
  FaFileAlt,
  FaEdit,
} from "react-icons/fa";
import DocumentStatus from "./DocumentStatus";

const EmployeeFormManagement = ({ onRefresh }) => {
  const { user } = useAuth();
  const [employeeForms, setEmployeeForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedForm, setSelectedForm] = useState(null);
  const [showFormDetails, setShowFormDetails] = useState(false);
  const [showDocumentStatus, setShowDocumentStatus] = useState(false);
  const [selectedEmployeeForDocs, setSelectedEmployeeForDocs] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [availableManagers, setAvailableManagers] = useState([]);

  // State for tracking selected managers to prevent duplicates
  const [selectedManager1, setSelectedManager1] = useState("");
  const [selectedManager2, setSelectedManager2] = useState("");
  const [selectedManager3, setSelectedManager3] = useState("");

  // Helpers for rendering attached files nicely (avoid dumping base64 strings)
  const parseDataUrl = (dataUrl) => {
    if (!dataUrl || typeof dataUrl !== "string")
      return { mime: "application/octet-stream", base64: "" };
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) return { mime: "application/octet-stream", base64: "" };
    return {
      mime: match[1] || "application/octet-stream",
      base64: match[2] || "",
    };
  };

  const getExtensionFromMime = (mime) => {
    if (!mime) return "bin";
    if (mime.includes("png")) return "png";
    if (mime.includes("jpeg")) return "jpg";
    if (mime.includes("jpg")) return "jpg";
    if (mime.includes("pdf")) return "pdf";
    if (mime.includes("gif")) return "gif";
    return mime.split("/")[1] || "bin";
  };

  const estimateFileSize = (base64) => {
    if (!base64) return 0;
    // Rough estimate of decoded size in bytes for base64
    return Math.ceil((base64.length * 3) / 4);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      sizes.length - 1
    );
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleDownloadFile = (dataUrl, suggestedName) => {
    try {
      const { mime, base64 } = parseDataUrl(dataUrl);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        suggestedName || `attachment.${getExtensionFromMime(mime)}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download error:", e);
      toast.error("Failed to download file");
    }
  };

  useEffect(() => {
    fetchEmployeeForms();
    fetchAvailableManagers();
  }, []);

  const fetchAvailableManagers = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5001/api/hr/master-managers"
      );
      console.log(
        "🔍 Fetched managers from master table:",
        response.data.managers
      );
      setAvailableManagers(response.data.managers || []);
    } catch (error) {
      console.error("Error fetching managers from master table:", error);
      setAvailableManagers([]);
    }
  };

  const fetchEmployeeForms = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "http://localhost:5001/api/hr/employee-forms"
      );
      setEmployeeForms(response.data.forms);
    } catch (error) {
      console.error("Error fetching employee forms:", error);
      toast.error("Failed to fetch employee forms");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocuments = (form) => {
    setSelectedEmployeeForDocs({
      id: form.employee_id,
      name: form.form_data?.name || `${form.first_name} ${form.last_name}`,
      employmentType: form.employee_type,
    });
    setShowDocumentStatus(true);
  };

  const handleEditEmployee = (form) => {
    setEditingEmployee(form);

    // Initialize manager selections with current assignments
    setSelectedManager1(form.assigned_manager || "");
    setSelectedManager2(form.assigned_manager2 || "");
    setSelectedManager3(form.assigned_manager3 || "");

    setShowEditForm(true);
  };

  // Helper function to get filtered managers for each dropdown
  const getFilteredManagers = (
    excludeCurrentSelection = "",
    dropdownType = ""
  ) => {
    if (!availableManagers) return [];

    return availableManagers.filter((manager) => {
      // Exclude the current employee from manager list if they are a manager
      const currentEmployeeEmail = editingEmployee?.form_data?.email;
      const currentEmployeeCompanyEmail = editingEmployee?.company_email;
      const currentLoggedInUserEmail = user?.email;

      // Get currently selected manager emails to prevent duplicates
      const selectedEmails = [
        selectedManager1,
        selectedManager2,
        selectedManager3,
      ]
        .filter((name) => name && name !== excludeCurrentSelection)
        .map((name) => {
          const found = availableManagers.find((m) => m.employee_name === name);
          return found?.company_email;
        })
        .filter(Boolean);

      const isExcludedDueToDuplicate = selectedEmails.includes(
        manager.company_email
      );
      const isCurrentEmployee =
        manager.company_email === currentEmployeeEmail ||
        manager.company_email === currentEmployeeCompanyEmail;
      const isLoggedInUser = manager.company_email === currentLoggedInUserEmail;

      console.log(`🔍 Manager filter for ${dropdownType}:`, {
        managerName: manager.employee_name,
        managerEmail: manager.company_email,
        currentEmployeeEmail,
        currentEmployeeCompanyEmail,
        currentLoggedInUserEmail,
        selectedEmails,
        isExcludedDueToDuplicate,
        isCurrentEmployee,
        isLoggedInUser,
        willShow:
          !isExcludedDueToDuplicate && !isCurrentEmployee && !isLoggedInUser,
      });

      return !isExcludedDueToDuplicate && !isCurrentEmployee && !isLoggedInUser;
    });
  };

  const handleUpdateEmployee = async (updatedData) => {
    try {
      await axios.put(
        `http://localhost:5001/api/hr/employee-forms/${editingEmployee.id}`,
        updatedData
      );
      toast.success("Employee details updated successfully!");
      setShowEditForm(false);
      setEditingEmployee(null);

      // Reset manager selections
      setSelectedManager1("");
      setSelectedManager2("");
      setSelectedManager3("");
      fetchEmployeeForms();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Update employee error:", error);
      toast.error(error.response?.data?.error || "Failed to update employee");
    }
  };

  const handleDeleteForm = async (formId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this form? This action cannot be undone."
      )
    ) {
      try {
        await axios.delete(
          `http://localhost:5001/api/hr/employee-forms/${formId}`
        );
        toast.success("Form deleted successfully!");
        fetchEmployeeForms();
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Delete form error:", error);
        toast.error("Failed to delete form");
      }
    }
  };

  const handleApproveForm = async (form) => {
    const employeeName =
      form.form_data?.name || `${form.first_name} ${form.last_name}`;
    if (
      window.confirm(
        `Are you sure you want to approve ${employeeName}'s application?\n\nNote: Employee can be approved even with missing documents. Documents can be uploaded later during employment.`
      )
    ) {
      try {
        await axios.put(
          `http://localhost:5001/api/hr/employee-forms/${form.id}/approve`,
          {
            action: "approve",
          }
        );

        toast.success(
          "Employee form approved! Employee moved to onboarded list."
        );
        fetchEmployeeForms();
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Approve form error:", error);
        toast.error(error.response?.data?.error || "Failed to approve form");
      }
    }
  };

  const handleRejectForm = async (form) => {
    if (
      window.confirm(
        `Are you sure you want to reject ${form.full_name}'s application?`
      )
    ) {
      try {
        await axios.put(
          `http://localhost:5001/api/hr/employee-forms/${form.id}/approve`,
          {
            action: "reject",
          }
        );

        toast.success("Employee form rejected.");
        fetchEmployeeForms();
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Reject form error:", error);
        toast.error(error.response?.data?.error || "Failed to reject form");
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Pending
          </span>
        );
      case "submitted":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            Submitted
          </span>
        );
      case "approved":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
            {status || "Unknown"}
          </span>
        );
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "Full-Time":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
            Full-Time
          </span>
        );
      case "Contract":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
            Contract
          </span>
        );
      case "Intern":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
            Intern
          </span>
        );
      case "Manager":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Manager
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
            {type || "Unknown"}
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (
      !dateString ||
      dateString === "1970-01-01T00:00:00.000Z" ||
      dateString === "1970-01-01"
    ) {
      return "Not submitted";
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const filteredForms = employeeForms.filter((form) => {
    const matchesSearch =
      form.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.form_data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.form_data?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || form.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Employee Form Management
        </h2>
        <p className="text-gray-600">
          View and manage all employee onboarding forms submitted by candidates.
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Forms Table */}
      {filteredForms.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Employee Forms Found
          </h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "No employee forms have been submitted yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredForms.map((form) => (
                <tr key={form.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {form.user_email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {form.first_name && form.last_name
                          ? `${form.first_name} ${form.last_name}`
                          : form.form_data?.name || "Name not available"}
                      </div>
                      {form.phone && (
                        <div className="text-xs text-gray-400">
                          📞 {form.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(form.employee_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(form.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDocuments(form)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        <FaFileAlt className="mr-1" />
                        View Status
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {form.assigned_manager ? (
                      <span className="text-sm text-green-600 font-medium">
                        {form.assigned_manager}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">
                        Not assigned
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(form.submitted_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditEmployee(form)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Edit Employee Details"
                      >
                        <FaEdit className="inline-block" />
                      </button>

                      {/* Show approve/reject buttons only for submitted forms */}
                      {form.status === "submitted" && (
                        <>
                          <button
                            onClick={() => handleApproveForm(form)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve Application"
                          >
                            <FaCheck className="inline-block" />
                          </button>
                          <button
                            onClick={() => handleRejectForm(form)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject Application"
                          >
                            <FaTimes className="inline-block" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Delete Form"
                      >
                        <FaTrash className="inline-block" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Details Modal */}
      {showFormDetails && selectedForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Employee Form Details
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowFormDetails(false);
                    setSelectedEmployeeForDocs({
                      id: selectedForm.employee_id,
                      name:
                        selectedForm.form_data?.name ||
                        `${selectedForm.first_name} ${selectedForm.last_name}`,
                      employmentType: selectedForm.employee_type,
                    });
                    setShowDocumentStatus(true);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FaFileAlt className="mr-2" />
                  View Documents
                </button>
                <button
                  onClick={() => setShowFormDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Email
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedForm.user_email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Type
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedForm.employee_type}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div>{getStatusBadge(selectedForm.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Submitted Date
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedForm.submitted_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedForm.phone || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Manager
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedForm.assigned_manager || "Not assigned"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedForm.department || "Not assigned"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedForm.designation || "Not assigned"}
                  </p>
                </div>
              </div>

              {/* Emergency Contact Information */}
              {(selectedForm.emergency_contact_name ||
                selectedForm.emergency_contact_phone) && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Emergency Contact
                  </h4>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedForm.emergency_contact_name && (
                        <div>
                          <label className="block text-sm font-medium text-red-700 mb-1">
                            Contact Name
                          </label>
                          <p className="text-sm text-red-900">
                            {selectedForm.emergency_contact_name}
                          </p>
                        </div>
                      )}
                      {selectedForm.emergency_contact_phone && (
                        <div>
                          <label className="block text-sm font-medium text-red-700 mb-1">
                            Contact Phone
                          </label>
                          <p className="text-sm text-red-900">
                            {selectedForm.emergency_contact_phone}
                          </p>
                        </div>
                      )}
                      {selectedForm.emergency_contact_relationship && (
                        <div>
                          <label className="block text-sm font-medium text-red-700 mb-1">
                            Relationship
                          </label>
                          <p className="text-sm text-red-900">
                            {selectedForm.emergency_contact_relationship}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Second Emergency Contact Information */}
              {(selectedForm.emergency_contact_name2 ||
                selectedForm.emergency_contact_phone2) && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Second Emergency Contact
                  </h4>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedForm.emergency_contact_name2 && (
                        <div>
                          <label className="block text-sm font-medium text-orange-700 mb-1">
                            Contact Name
                          </label>
                          <p className="text-sm text-orange-900">
                            {selectedForm.emergency_contact_name2}
                          </p>
                        </div>
                      )}
                      {selectedForm.emergency_contact_phone2 && (
                        <div>
                          <label className="block text-sm font-medium text-orange-700 mb-1">
                            Contact Phone
                          </label>
                          <p className="text-sm text-orange-900">
                            {selectedForm.emergency_contact_phone2}
                          </p>
                        </div>
                      )}
                      {selectedForm.emergency_contact_relationship2 && (
                        <div>
                          <label className="block text-sm font-medium text-orange-700 mb-1">
                            Relationship
                          </label>
                          <p className="text-sm text-orange-900">
                            {selectedForm.emergency_contact_relationship2}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Data */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Form Information
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedForm.form_data || {}).map(
                      ([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                            {key.replace(/_/g, " ")}
                          </label>
                          <p className="text-sm text-gray-900">
                            {typeof value === "string"
                              ? value
                              : JSON.stringify(value)}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Document Status */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Document Upload Status
                </h4>
                <DocumentStatus
                  employeeId={selectedForm.employee_id}
                  employeeName={
                    selectedForm.form_data?.name ||
                    `${selectedForm.first_name} ${selectedForm.last_name}`
                  }
                  isHR={true}
                  onRefresh={fetchEmployeeForms}
                />
              </div>

              {/* Legacy Files (if any from old system) */}
              {selectedForm.files && selectedForm.files.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Legacy Attached Files
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedForm.files.map((file, index) => {
                        const { mime, base64 } = parseDataUrl(file);
                        const ext = getExtensionFromMime(mime);
                        const size = formatBytes(estimateFileSize(base64));
                        const isImage = mime.startsWith("image/");
                        const fileName = `attachment_${index + 1}.${ext}`;
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white rounded border p-3"
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              {isImage ? (
                                <img
                                  src={file}
                                  alt={fileName}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-xs uppercase">
                                  {ext}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {fileName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {mime} • {size}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownloadFile(file, fileName)}
                              className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                            >
                              <FaDownload className="inline-block mr-1" />
                              Download
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => {
                  setShowFormDetails(false);
                  setSelectedEmployeeForDocs({
                    id: selectedForm.employee_id,
                    name:
                      selectedForm.form_data?.name ||
                      `${selectedForm.first_name} ${selectedForm.last_name}`,
                  });
                  setShowDocumentStatus(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FaFileAlt className="mr-2" />
                View All Documents
              </button>
              <button
                onClick={() => setShowFormDetails(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Status Modal */}
      {showDocumentStatus && selectedEmployeeForDocs && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Document Status - {selectedEmployeeForDocs.name}
              </h3>
              <button
                onClick={() => {
                  setShowDocumentStatus(false);
                  setSelectedEmployeeForDocs(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <DocumentStatus
              employeeId={selectedEmployeeForDocs.id}
              employeeName={selectedEmployeeForDocs.name}
              isHR={true}
              onRefresh={fetchEmployeeForms}
            />

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowDocumentStatus(false);
                  setSelectedEmployeeForDocs(null);
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditForm && editingEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Edit Employee Details
              </h3>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingEmployee(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const updatedData = {
                  form_data: {
                    ...editingEmployee.form_data,
                    name: formData.get("name"),
                    email: formData.get("email"),
                    phone: formData.get("phone"),
                    address: formData.get("address"),
                    education: formData.get("education"),
                    experience: formData.get("experience"),
                    doj: formData.get("doj"),
                    emergencyContact: {
                      name: formData.get("emergency_name"),
                      phone: formData.get("emergency_phone"),
                      relationship: formData.get("emergency_relationship"),
                    },
                    emergencyContact2: {
                      name: formData.get("emergency_name2"),
                      phone: formData.get("emergency_phone2"),
                      relationship: formData.get("emergency_relationship2"),
                    },
                  },
                  employee_type: formData.get("employment_type"),
                  manager1: selectedManager1,
                  manager2: selectedManager2,
                  manager3: selectedManager3,
                };
                handleUpdateEmployee(updatedData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingEmployee.form_data?.name || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    defaultValue={editingEmployee.form_data?.email || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID (6 digits) *
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.form_data?.employee_id || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Employee ID is permanent and cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={editingEmployee.form_data?.phone || ""}
                    maxLength="10"
                    pattern="[0-9]{10}"
                    placeholder="Enter 10 digit number"
                    onInput={(e) => {
                      // Allow only numeric input and limit to 10 digits
                      e.target.value = e.target.value
                        .replace(/[^0-9]/g, "")
                        .slice(0, 10);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Joining *
                  </label>
                  <input
                    type="date"
                    name="doj"
                    defaultValue={editingEmployee.form_data?.doj || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Type *
                  </label>
                  <select
                    name="employment_type"
                    defaultValue={editingEmployee.employee_type || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
              </div>

              {/* Manager Assignment Section */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Manager Assignment
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manager 1 *
                    </label>
                    <select
                      name="manager1"
                      value={selectedManager1}
                      onChange={(e) => setSelectedManager1(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Manager 1</option>
                      {getFilteredManagers(selectedManager1, "Manager 1").map(
                        (manager, index) => (
                          <option
                            key={`${manager.employee_name}-${manager.company_email}-${index}`}
                            value={manager.employee_name}
                          >
                            {manager.employee_name} ({manager.company_email})
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manager 2 (Optional)
                    </label>
                    <select
                      name="manager2"
                      value={selectedManager2}
                      onChange={(e) => setSelectedManager2(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Manager 2</option>
                      {getFilteredManagers(selectedManager2, "Manager 2").map(
                        (manager, index) => (
                          <option
                            key={`${manager.employee_name}-${manager.company_email}-manager2-${index}`}
                            value={manager.employee_name}
                          >
                            {manager.employee_name} ({manager.company_email})
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manager 3 (Optional)
                    </label>
                    <select
                      name="manager3"
                      value={selectedManager3}
                      onChange={(e) => setSelectedManager3(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Manager 3</option>
                      {getFilteredManagers(selectedManager3, "Manager 3").map(
                        (manager, index) => (
                          <option
                            key={`${manager.employee_name}-${manager.company_email}-manager3-${index}`}
                            value={manager.employee_name}
                          >
                            {manager.employee_name} ({manager.company_email})
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Manager 1 is required. Manager 2 and 3 are optional for
                  multi-manager approval workflow.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  defaultValue={editingEmployee.form_data?.address || ""}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latest Graduation
                  </label>
                  <textarea
                    name="education"
                    defaultValue={editingEmployee.form_data?.education || ""}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience
                  </label>
                  <textarea
                    name="experience"
                    defaultValue={editingEmployee.form_data?.experience || ""}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      name="emergency_name"
                      defaultValue={
                        editingEmployee.form_data?.emergencyContact?.name || ""
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="emergency_phone"
                      defaultValue={
                        editingEmployee.form_data?.emergencyContact?.phone || ""
                      }
                      maxLength="10"
                      pattern="[0-9]{10}"
                      placeholder="Enter 10 digit number"
                      onInput={(e) => {
                        // Allow only numeric input and limit to 10 digits
                        e.target.value = e.target.value
                          .replace(/[^0-9]/g, "")
                          .slice(0, 10);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship
                    </label>
                    <input
                      type="text"
                      name="emergency_relationship"
                      defaultValue={
                        editingEmployee.form_data?.emergencyContact
                          ?.relationship || ""
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Second Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      name="emergency_name2"
                      defaultValue={
                        editingEmployee.form_data?.emergencyContact2?.name || ""
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="emergency_phone2"
                      defaultValue={
                        editingEmployee.form_data?.emergencyContact2?.phone ||
                        ""
                      }
                      maxLength="10"
                      pattern="[0-9]{10}"
                      placeholder="Enter 10 digit number"
                      onInput={(e) => {
                        // Allow only numeric input and limit to 10 digits
                        e.target.value = e.target.value
                          .replace(/[^0-9]/g, "")
                          .slice(0, 10);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship
                    </label>
                    <input
                      type="text"
                      name="emergency_relationship2"
                      defaultValue={
                        editingEmployee.form_data?.emergencyContact2
                          ?.relationship || ""
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingEmployee(null);
                    // Reset manager selections
                    setSelectedManager1("");
                    setSelectedManager2("");
                    setSelectedManager3("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Update Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeFormManagement;
