import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { FaArrowLeft } from "react-icons/fa";

const ManagerLeaveRequest = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [systemSettings, setSystemSettings] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveTypeBalances, setLeaveTypeBalances] = useState([]);
  const [compOffBalance, setCompOffBalance] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    halfDay: false,
    reason: "",
  });

  useEffect(() => {
    fetchLeaveTypes();
    fetchSystemSettings();
    if (token) {
      fetchLeaveBalance();
      fetchLeaveTypeBalances();
      fetchMyRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get("/leave/types");
      setLeaveTypes(response.data);
    } catch (error) {
      console.error("Error fetching leave types:", error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await axios.get("/leave/system-info");
      setSystemSettings(response.data);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      setSystemSettings({
        allow_half_day: true,
        total_annual_leaves: 21, // Managers get more leaves
      });
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      if (!token) {
        console.error("No token available");
        return;
      }

      const response = await axios.get("/leave/balance", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLeaveBalance(response.data);
    } catch (error) {
      console.error("Error fetching leave balance:", error);
      setLeaveBalance({
        total_allocated: 21, // Managers get more leaves
        leaves_taken: 0,
        leaves_remaining: 21,
        year: new Date().getFullYear(),
      });
    }
  };

  const fetchLeaveTypeBalances = async () => {
    try {
      if (!token) {
        console.error("No token available");
        return;
      }

      const response = await axios.get("/leave/my-leave-type-balances", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLeaveTypeBalances(response.data.leaveTypeBalances || []);
    } catch (error) {
      console.error("Error fetching leave type balances:", error);
      setLeaveTypeBalances([
        {
          leave_type: "Earned/Annual Leave",
          total_allocated: 21,
          leaves_taken: 0,
          leaves_remaining: 21,
        },
        {
          leave_type: "Sick Leave",
          total_allocated: 6,
          leaves_taken: 0,
          leaves_remaining: 6,
        },
        {
          leave_type: "Casual Leave",
          total_allocated: 6,
          leaves_taken: 0,
          leaves_remaining: 6,
        },
      ]);
    }
  };

  const fetchMyRequests = async () => {
    try {
      if (!token) {
        console.error("No token available");
        return;
      }

      const response = await axios.get("/leave/my-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMyRequests(response.data);
    } catch (error) {
      console.error("Error fetching my requests:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const calculateTotalDays = () => {
    if (!formData.fromDate) return 0;

    if (!formData.toDate) {
      return formData.halfDay ? 0.5 : 1;
    }

    const start = new Date(formData.fromDate);
    const end = new Date(formData.toDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return formData.halfDay ? diffDays - 0.5 : diffDays;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const totalDays = calculateTotalDays();

      if (!leaveBalance) {
        setMessage("Please wait while we load your leave balance...");
        setLoading(false);
        return;
      }

      // Validate based on leave type
      if (formData.leaveType === "Unpaid Leave") {
        console.log("🔍 Unpaid Leave - No balance validation required");
      } else if (formData.leaveType === "Comp Off") {
        console.log("🔍 Comp Off - Comp Off balance validation needed");
      } else {
        if (totalDays > leaveBalance.leaves_remaining) {
          setMessage(
            `Insufficient leave balance. You have ${leaveBalance.leaves_remaining} days remaining, but requesting ${totalDays} days.`
          );
          setLoading(false);
          return;
        }
      }

      const requestData = {
        ...formData,
        toDate: formData.toDate || null,
        totalDays,
        role: "manager", // Mark this as a manager request
      };

      console.log("🔍 Frontend - Manager leave request data:", requestData);
      console.log("🔍 Frontend - Token available:", !!token);

      await axios.post("/leave/submit", requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      });

      setMessage("Leave request submitted successfully!");
      setFormData({
        leaveType: "",
        fromDate: "",
        toDate: "",
        halfDay: false,
        reason: "",
      });

      // Refresh data
      fetchLeaveBalance();
      fetchMyRequests();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      setMessage(
        error.response?.data?.error || "Failed to submit leave request"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case "Pending Manager Approval":
        return "Pending for Manager Approval";
      case "Pending HR Approval":
        return "Pending for HR Approval";
      case "manager_approved":
        return "Manager Approved";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
      case "approved":
        return "text-green-600 bg-green-100";
      case "Rejected":
      case "rejected":
        return "text-red-600 bg-red-100";
      case "manager_approved":
        return "text-blue-600 bg-blue-100";
      case "Pending Manager Approval":
        return "text-yellow-600 bg-yellow-100";
      case "Pending HR Approval":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "-";
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 mr-4"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <h2 className="text-2xl font-bold text-gray-800">
              Manager Leave Request Form
            </h2>
          </div>
        </div>

        {/* Leave Balance Display */}
        {leaveBalance ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              Your Leave Balance
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {leaveBalance.total_allocated}
                </p>
                <p className="text-sm text-blue-600">Total Allocated</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {leaveBalance.leaves_taken}
                </p>
                <p className="text-sm text-orange-600">Leaves Taken</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {leaveBalance.leaves_remaining}
                </p>
                <p className="text-sm text-green-600">Leaves Remaining</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">Loading leave balance...</p>
          </div>
        )}

        {/* Leave Request Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type *
              </label>
              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.type_name}>
                    {type.type_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date *
              </label>
              <input
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date (Optional)
              </label>
              <input
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Days
              </label>
              <input
                type="text"
                value={calculateTotalDays()}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="halfDay"
              checked={formData.halfDay}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Half Day Leave
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason *
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please provide a detailed reason for your leave request..."
              required
            />
          </div>

          {message && (
            <div
              className={`p-4 rounded-md ${
                message.includes("successfully")
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Leave Request"}
            </button>
          </div>
        </form>
      </div>

      {/* My Leave Requests History */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          My Leave Requests
        </h3>
        {myRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No leave requests found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Series
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.series}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.leave_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(request.from_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(request.to_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.total_leave_days}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {formatStatus(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(request.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerLeaveRequest;
