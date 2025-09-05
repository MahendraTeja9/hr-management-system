import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { format } from "date-fns";

const ManagerLeaveApproval = () => {
  const { user, token } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    action: "",
    notes: "",
  });
  const [leaveTypes, setLeaveTypes] = useState([]);

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/leave/types");
      setLeaveTypes(response.data);
    } catch (error) {
      console.error("Error fetching leave types:", error);
    }
  };

  const fetchPendingRequests = useCallback(async () => {
    try {
      if (!token) {
        console.error("No token available");
        return;
      }

      const response = await axios.get(
        "http://localhost:5001/api/leave/manager/pending",
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
        setMessage("Access denied. Manager role required.");
      }
    }
  }, [token]);

  useEffect(() => {
    fetchLeaveTypes();
    if (token) {
      fetchPendingRequests();
    }
  }, [token, fetchPendingRequests]);

  const handleApproval = (request) => {
    setSelectedRequest(request);
    setApprovalData({ action: "", notes: "" });
    setShowModal(true);
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
        `http://localhost:5001/api/leave/manager/${selectedRequest.id}/approve`,
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

      // Refresh the list
      fetchPendingRequests();
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

  if (user?.role !== "manager") {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">
            This page is only accessible to managers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Manager Leave Approval
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

        {pendingRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Pending Requests
            </h3>
            <p className="text-gray-500">
              All leave requests have been processed.
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
                    Balance
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
                      {formatDate(request.to_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.total_leave_days}
                      {request.half_day && " (½ day)"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {request.leave_balance_before} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleApproval(request)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review Leave Request
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
                  <strong>To:</strong> {formatDate(selectedRequest.to_date)}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Total Days:</strong>{" "}
                  {selectedRequest.total_leave_days}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Reason:</strong> {selectedRequest.reason}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action *
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

export default ManagerLeaveApproval;
