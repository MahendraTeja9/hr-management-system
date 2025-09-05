import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { format } from "date-fns";

const HRLeaveApproval = () => {
  const { user, token } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [approvalData, setApprovalData] = useState({
    action: "",
    notes: "",
  });
  const [leaveTypes, setLeaveTypes] = useState([]);

  useEffect(() => {
    fetchLeaveTypes();
    if (token) {
      fetchPendingRequests();
      fetchAllRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchPendingRequests = async () => {
    try {
      if (!token) {
        console.error("No token available");
        return;
      }

      const response = await axios.get(
        "http://localhost:5001/api/leave/hr/pending",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setPendingRequests(response.data);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      if (error.response?.status === 403) {
        setMessage("Access denied. HR role required.");
      }
    }
  };

  const fetchAllRequests = async () => {
    try {
      if (!token) {
        console.error("No token available");
        return;
      }

      const response = await axios.get("http://localhost:5001/api/leave/all", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAllRequests(response.data);
    } catch (error) {
      console.error("Error fetching all requests:", error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/leave/types");
      setLeaveTypes(response.data);
    } catch (error) {
      console.error("Error fetching leave types:", error);
    }
  };

  const handleApproval = (request) => {
    setSelectedRequest(request);
    setApprovalData({ action: "", notes: "" });
    setShowModal(true);
  };

  const handleDirectApproval = async (request, action) => {
    setLoading(true);
    setMessage("");

    try {
      await axios.put(
        `http://localhost:5001/api/leave/hr/${request.id}/approve`,
        { action, notes: "" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(`Leave request ${action}d successfully`);

      // Refresh the lists
      fetchPendingRequests();
      fetchAllRequests();
    } catch (error) {
      console.error("Error processing approval:", error);
      setMessage(error.response?.data?.error || "Failed to process approval");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!approvalData.action) {
      setMessage("Please select an action (approve or reject)");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await axios.put(
        `http://localhost:5001/api/leave/hr/${selectedRequest.id}/approve`,
        approvalData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(response.data.message);
      setShowModal(false);
      setSelectedRequest(null);

      // Refresh the lists
      fetchPendingRequests();
      fetchAllRequests();
    } catch (error) {
      console.error("Error processing approval:", error);
      setMessage(error.response?.data?.error || "Failed to process approval");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setApprovalData({ action: "", notes: "" });
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "text-green-600 bg-green-100";
      case "Rejected":
        return "text-red-600 bg-red-100";
      case "manager_approved":
        return "text-blue-600 bg-blue-100";
      case "Pending Manager Approval":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (user?.role !== "hr") {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">
            This page is only accessible to HR personnel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          HR Leave Management
        </h2>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.includes("successfully")
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center p-4 mb-6 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-800">Processing request...</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "pending"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pending Approval ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "all"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              All Requests ({allRequests.length})
            </button>
          </nav>
        </div>

        {/* Pending Requests Tab */}
        {activeTab === "pending" && (
          <div>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Pending Requests
                </h3>
                <p className="text-gray-500">
                  All manager-approved requests have been processed.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Series
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        From
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {request.series}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.employee_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.employee_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {leaveTypes.find(
                              (t) => t.type_name === request.leave_type
                            )?.color && (
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{
                                  backgroundColor: leaveTypes.find(
                                    (t) => t.type_name === request.leave_type
                                  )?.color,
                                }}
                              ></div>
                            )}
                            <span className="text-sm text-gray-900">
                              {request.leave_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(request.from_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.to_date ? formatDate(request.to_date) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.total_leave_days}
                          {request.half_day && " (½ day)"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.manager_approval_status ||
                                "No managers assigned"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.manager_approved_at &&
                                formatDate(request.manager_approved_at)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                handleDirectApproval(request, "approve")
                              }
                              disabled={loading}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() =>
                                handleDirectApproval(request, "reject")
                              }
                              disabled={loading}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              ❌ Reject
                            </button>
                            <button
                              onClick={() => handleApproval(request)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              📝 Review
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
        )}

        {/* All Requests Tab */}
        {activeTab === "all" && (
          <div>
            {allRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Leave Requests
                </h3>
                <p className="text-gray-500">
                  No leave requests have been submitted yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Series
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        From
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days
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
                    {allRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {request.series}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.employee_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.employee_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {leaveTypes.find(
                              (t) => t.type_name === request.leave_type
                            )?.color && (
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{
                                  backgroundColor: leaveTypes.find(
                                    (t) => t.type_name === request.leave_type
                                  )?.color,
                                }}
                              ></div>
                            )}
                            <span className="text-sm text-gray-900">
                              {request.leave_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(request.from_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.to_date ? formatDate(request.to_date) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.total_leave_days}
                          {request.half_day && " (½ day)"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Final Review - Leave Request
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Employee:</strong> {selectedRequest.employee_name}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <div className="flex items-center">
                    {leaveTypes.find(
                      (t) => t.type_name === selectedRequest.leave_type
                    )?.color && (
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{
                          backgroundColor: leaveTypes.find(
                            (t) => t.type_name === selectedRequest.leave_type
                          )?.color,
                        }}
                      ></div>
                    )}
                    <span>
                      <strong>Leave Type:</strong> {selectedRequest.leave_type}
                    </span>
                  </div>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>From:</strong> {formatDate(selectedRequest.from_date)}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>To:</strong>{" "}
                  {selectedRequest.to_date
                    ? formatDate(selectedRequest.to_date)
                    : "-"}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Total Days:</strong>{" "}
                  {selectedRequest.total_leave_days}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Reason:</strong> {selectedRequest.reason}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Manager Approval Status:</strong>{" "}
                  {selectedRequest.manager_approval_status ||
                    "No managers assigned"}
                </p>
                {selectedRequest.manager_approval_notes && (
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Manager Notes:</strong>{" "}
                    {selectedRequest.manager_approval_notes}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Action *
                </label>
                <select
                  value={approvalData.action}
                  onChange={(e) =>
                    setApprovalData((prev) => ({
                      ...prev,
                      action: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Action</option>
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={approvalData.notes}
                  onChange={(e) =>
                    setApprovalData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Add any notes or comments..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovalSubmit}
                  disabled={loading || !approvalData.action}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Submit Decision"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRLeaveApproval;
