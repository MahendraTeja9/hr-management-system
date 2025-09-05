import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { FaArrowLeft } from "react-icons/fa";

const EmployeeLeaveRequest = () => {
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
      // For employees, we can fetch basic system settings without auth if needed
      // Or we can make a public endpoint for basic settings
      const response = await axios.get("/leave/system-info");
      setSystemSettings(response.data);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      // Set default values if API fails
      setSystemSettings({
        allow_half_day: true,
        total_annual_leaves: 15,
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
      // Set default values if fetch fails
      setLeaveBalance({
        total_allocated: 15,
        leaves_taken: 0,
        leaves_remaining: 15,
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
      // Set default values if fetch fails
      setLeaveTypeBalances([
        {
          leave_type: "Earned/Annual Leave",
          total_allocated: 15,
          leaves_taken: 0,
          leaves_remaining: 15,
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

    // If no toDate is provided, it's a single day leave
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
        // Unpaid Leave: No balance validation needed
        console.log("🔍 Unpaid Leave - No balance validation required");
      } else if (formData.leaveType === "Comp Off") {
        // Comp Off: Check Comp Off balance (we'll need to implement this)
        console.log("🔍 Comp Off - Comp Off balance validation needed");
        // For now, allow Comp Off requests (balance will be checked on approval)
      } else {
        // Paid Leave, Privilege Leave, Sick Leave, etc.: Check annual leave balance
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
      };

      console.log("🔍 Frontend - Data being sent:", requestData);
      console.log("🔍 Frontend - Token available:", !!token);

      await axios.post("/leave/submit", requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000, // 15 second timeout for leave submission
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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 mr-4"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <h2 className="text-2xl font-bold text-gray-800">
              Leave Request Form
            </h2>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Leave Balance */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {leaveBalance ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">
                Your Leave Balance
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center mb-6">
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
                  <p className="text-sm text-green-600">Remaining</p>
                </div>
              </div>

              {/* Detailed Leave Type Balances */}
              <div className="pt-4 border-t border-blue-200">
                <h4 className="text-sm font-semibold text-blue-700 mb-3">
                  Leave Type Breakdown:
                </h4>
                <div className="space-y-3">
                  {leaveTypeBalances.map((balance, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-3 border border-blue-100"
                    >
                      <h5 className="text-sm font-semibold text-blue-800 mb-2">
                        {balance.leave_type}
                      </h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Allocated:</span>
                          <span className="font-semibold text-blue-600">
                            {balance.total_allocated}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Taken:</span>
                          <span className="font-semibold text-orange-600">
                            {balance.leaves_taken}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Remaining:</span>
                          <span className="font-semibold text-green-600">
                            {balance.leaves_remaining}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Side - Leave Request Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">
            Submit Leave Request
          </h3>
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
                  required
                  disabled={leaveTypes.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {leaveTypes.length === 0
                      ? "Loading leave types..."
                      : "Select Leave Type"}
                  </option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.type_name}>
                      {type.type_name}
                    </option>
                  ))}
                </select>
                {formData.leaveType && (
                  <div className="mt-2">
                    <div className="flex items-center mb-1">
                      {leaveTypes.find(
                        (t) => t.type_name === formData.leaveType
                      )?.color && (
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{
                            backgroundColor: leaveTypes.find(
                              (t) => t.type_name === formData.leaveType
                            )?.color,
                          }}
                        ></div>
                      )}
                      <span className="text-sm text-gray-600">
                        {
                          leaveTypes.find(
                            (t) => t.type_name === formData.leaveType
                          )?.description
                        }
                      </span>
                    </div>
                    {leaveTypes.find((t) => t.type_name === formData.leaveType)
                      ?.max_days && (
                      <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        Maximum allowed:{" "}
                        {
                          leaveTypes.find(
                            (t) => t.type_name === formData.leaveType
                          )?.max_days
                        }{" "}
                        days per year
                      </div>
                    )}
                  </div>
                )}
              </div>

              {systemSettings?.allow_half_day && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Half Day
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="halfDay"
                      checked={formData.halfDay}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Check if this is a half-day leave
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date *
                </label>
                <input
                  type="date"
                  name="fromDate"
                  value={formData.fromDate}
                  onChange={handleInputChange}
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  min={
                    formData.fromDate || new Date().toISOString().split("T")[0]
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for single day leave
                </p>
              </div>
            </div>

            {formData.fromDate && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Total Leave Days:</strong> {calculateTotalDays()}{" "}
                  {calculateTotalDays() === 1 ? "day" : "days"}
                  {formData.halfDay && " (including half-day adjustment)"}
                  {!formData.toDate && " - Single day leave"}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason *
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Please provide a detailed reason for your leave request..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {message && (
              <div
                className={`p-4 rounded-lg ${
                  message.includes("successfully")
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-red-100 text-red-700 border border-red-200"
                }`}
              >
                {message}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Leave Request"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* My Leave Requests History */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          My Leave Requests
        </h3>

        {myRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No leave requests found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
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
                      <div className="flex flex-wrap gap-1">
                        {request.manager1_name && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {request.manager1_name}
                          </span>
                        )}
                        {request.manager2_name && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {request.manager2_name}
                          </span>
                        )}
                        {request.manager3_name && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            {request.manager3_name}
                          </span>
                        )}
                        {!request.manager1_name &&
                          !request.manager2_name &&
                          !request.manager3_name && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                              Not Assigned
                            </span>
                          )}
                      </div>
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

export default EmployeeLeaveRequest;
