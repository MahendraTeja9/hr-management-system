import React, { useState } from "react";
import { FaEye, FaCheck, FaTimes, FaTrash } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";

const EmployeeList = ({ employees, onRefresh, onApprove }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    status: "approved",
    managerId: "",
    employeeId: "",
    companyEmail: "",
    userId: "",
  });

  const handleViewDetails = async (employeeId) => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/hr/employees/${employeeId}/form`
      );
      setSelectedEmployee(response.data.form);
    } catch (error) {
      toast.error("Failed to fetch employee details");
    }
  };

  const handleApprove = (employee) => {
    console.log("✅ Approving employee:", employee);
    setApprovalData({
      status: "approved",
      userId: employee.id, // Store the actual user ID for the API call
    });
    setShowApprovalModal(true);
  };

  const handleReject = (employee) => {
    console.log("❌ Rejecting employee:", employee);
    setApprovalData({
      status: "rejected",
      userId: employee.id, // Store the actual user ID for the API call
    });
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async () => {
    try {
      // Use the stored user ID directly
      if (!approvalData.userId) {
        toast.error("Employee ID not found");
        return;
      }

      console.log("🎯 Submitting approval:", {
        userId: approvalData.userId,
        status: approvalData.status,
        data: approvalData,
      });

      await axios.put(
        `http://localhost:5001/api/hr/employees/${approvalData.userId}/approve`,
        approvalData
      );
      toast.success(`Employee ${approvalData.status} successfully!`);
      setShowApprovalModal(false);
      setSelectedEmployee(null);
      onApprove();
    } catch (error) {
      console.error("Approval error:", error);
      if (error.response) {
        console.log("Response status:", error.response.status);
        console.log("Response data:", error.response.data);
      }
      toast.error(
        error.response?.data?.error || "Failed to update employee status"
      );
    }
  };

  const handleDelete = async (employeeId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this employee? This action cannot be undone."
      )
    ) {
      try {
        await axios.delete(
          `http://localhost:5001/api/hr/employees/${employeeId}`
        );
        toast.success("Employee deleted successfully!");
        onRefresh();
      } catch (error) {
        toast.error("Failed to delete employee");
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "submitted":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-warning-100 text-warning-800 rounded-full">
            Pending
          </span>
        );
      case "approved":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-success-100 text-success-800 rounded-full">
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-danger-100 text-danger-800 rounded-full">
            Rejected
          </span>
        );
      case "no_form":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
            No Form
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

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
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
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {employee.email}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {employee.id}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {employee.type || "N/A"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(employee.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {employee.submitted_at
                    ? new Date(employee.submitted_at).toLocaleDateString()
                    : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewDetails(employee.id)}
                      className="text-primary-600 hover:text-primary-900"
                      title="View Details"
                    >
                      <FaEye className="w-4 h-4" />
                    </button>
                    {employee.status === "submitted" && (
                      <>
                        <button
                          onClick={() => handleApprove(employee)}
                          className="text-success-600 hover:text-success-900"
                          title="Approve"
                        >
                          <FaCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(employee)}
                          className="text-warning-600 hover:text-warning-900"
                          title="Reject"
                        >
                          <FaTimes className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {employee.status === "no_form" && (
                      <span className="text-xs text-gray-400">
                        No form to approve
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="text-danger-600 hover:text-danger-900"
                      title="Delete"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Employee Details
              </h3>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Employment Type
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedEmployee.type}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedEmployee.status}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Form Data
                </label>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-64">
                  {JSON.stringify(selectedEmployee.form_data, null, 2)}
                </pre>
              </div>

              {selectedEmployee.files && selectedEmployee.files.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Files
                  </label>
                  <ul className="text-sm text-gray-900">
                    {selectedEmployee.files.map((file, index) => (
                      <li key={index}>{file}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {approvalData.status === "approved" ? "Approve" : "Reject"}{" "}
                Employee
              </h3>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleApprovalSubmit();
              }}
              className="space-y-4"
            >
              {approvalData.status === "approved" && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Approval Note
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          Employee will be moved to the "Onboarded Employees"
                          tab where you can assign their name, company email,
                          and other details.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn-${
                    approvalData.status === "approved" ? "success" : "danger"
                  }`}
                >
                  {approvalData.status === "approved" ? "Approve" : "Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
