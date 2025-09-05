import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FaSignOutAlt,
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaEye,
  FaClock,
  FaUser,
} from "react-icons/fa";
import { toast } from "react-toastify";

const ManagerLeaveRequests = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({
    action: "approve",
    notes: "",
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        "http://localhost:5001/api/manager/leave-requests",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data.leaveRequests || []);
      } else if (response.status === 401) {
        toast.error("Please login again to continue");
        logout();
        navigate("/login");
      } else {
        toast.error("Failed to fetch leave requests");
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      toast.error("Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5001/api/manager/leave-requests/${selectedRequest.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(actionForm),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowActionModal(false);
        setSelectedRequest(null);
        setActionForm({ action: "approve", notes: "" });
        fetchLeaveRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update leave request");
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
      toast.error("Failed to update leave request");
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case "Pending Manager Approval":
        return {
          color: "bg-yellow-100 text-yellow-800",
          text: "Pending for Manager Approval",
          icon: <FaClock className="text-yellow-600" />,
        };
      case "Pending HR Approval":
        return {
          color: "bg-blue-100 text-blue-800",
          text: "Pending for HR Approval",
          icon: <FaClock className="text-blue-600" />,
        };
      case "approved":
        return {
          color: "bg-green-100 text-green-800",
          text: "Approved",
          icon: <FaCheck className="text-green-600" />,
        };
      case "rejected":
        return {
          color: "bg-red-100 text-red-800",
          text: "Rejected",
          icon: <FaTimes className="text-red-600" />,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          text: status,
          icon: null,
        };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const canTakeAction = (status) => {
    return status === "Pending Manager Approval";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/manager/dashboard")}
                className="text-gray-600 hover:text-gray-900"
              >
                <FaArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Leave Requests
              </h1>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                Manager
              </span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <FaClock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Pending Approval
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    leaveRequests.filter(
                      (req) => req.status === "Pending Manager Approval"
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FaClock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending HR</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    leaveRequests.filter(
                      (req) => req.status === "Pending HR Approval"
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FaCheck className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    leaveRequests.filter((req) => req.status === "approved")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <FaTimes className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    leaveRequests.filter((req) => req.status === "rejected")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Leave Requests
            </h2>
            <p className="text-sm text-gray-600">
              Review and manage leave requests from your team
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Range
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
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No leave requests found
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((request) => {
                    const statusDisplay = getStatusDisplay(request.status);
                    return (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {request.first_name?.charAt(0)}
                                  {request.last_name?.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {request.first_name} {request.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {request.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.leave_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div>{formatDate(request.from_date)}</div>
                            {request.to_date &&
                              request.to_date !== request.from_date && (
                                <div className="text-gray-500">
                                  to {formatDate(request.to_date)}
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.total_leave_days} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.color}`}
                          >
                            {statusDisplay.icon && (
                              <span className="mr-1">{statusDisplay.icon}</span>
                            )}
                            {statusDisplay.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(request.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {canTakeAction(request.status) ? (
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowActionModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                            >
                              <FaEye />
                              <span>Review</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowActionModal(true);
                              }}
                              className="text-gray-600 hover:text-gray-900 flex items-center space-x-1"
                            >
                              <FaEye />
                              <span>View</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {canTakeAction(selectedRequest.status)
                    ? "Review Leave Request"
                    : "Leave Request Details"}
                </h3>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Request Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Employee:</span>
                      <div className="font-medium">
                        {selectedRequest.first_name} {selectedRequest.last_name}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Leave Type:</span>
                      <div className="font-medium">
                        {selectedRequest.leave_type}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">From Date:</span>
                      <div className="font-medium">
                        {formatDate(selectedRequest.from_date)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">To Date:</span>
                      <div className="font-medium">
                        {selectedRequest.to_date
                          ? formatDate(selectedRequest.to_date)
                          : "Same day"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Days:</span>
                      <div className="font-medium">
                        {selectedRequest.total_leave_days} days
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <div className="font-medium">
                        {getStatusDisplay(selectedRequest.status).text}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-gray-600">Reason:</span>
                    <div className="font-medium mt-1">
                      {selectedRequest.reason}
                    </div>
                  </div>
                </div>

                {canTakeAction(selectedRequest.status) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Action
                      </label>
                      <select
                        value={actionForm.action}
                        onChange={(e) =>
                          setActionForm({
                            ...actionForm,
                            action: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="approve">Approve</option>
                        <option value="reject">Reject</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={actionForm.notes}
                        onChange={(e) =>
                          setActionForm({
                            ...actionForm,
                            notes: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        rows="3"
                        placeholder="Add any notes or comments..."
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowActionModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                  {canTakeAction(selectedRequest.status) && (
                    <button
                      onClick={handleAction}
                      className={`px-4 py-2 rounded-lg text-white ${
                        actionForm.action === "approve"
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {actionForm.action === "approve" ? "Approve" : "Reject"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerLeaveRequests;
