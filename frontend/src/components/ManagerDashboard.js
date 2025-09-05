import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FaSignOutAlt,
  FaUsers,
  FaCalendarAlt,
  FaClock,
  FaHome,
  FaBed,
  FaArrowLeft,
  FaEye,
  FaEdit,
} from "react-icons/fa";
import { toast } from "react-toastify";

const ManagerDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState({});
  const [showTooltip, setShowTooltip] = useState({
    employeeId: null,
    type: null,
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        "http://localhost:5001/api/manager/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      } else if (response.status === 401) {
        toast.error("Please login again to continue");
        logout();
        navigate("/login");
      } else {
        toast.error("Failed to fetch employees");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalances = async (employeeId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `http://localhost:5001/api/leave/balances/${employeeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaveBalances((prev) => ({
          ...prev,
          [employeeId]: data,
        }));
      }
    } catch (error) {
      console.error("Error fetching leave balances:", error);
    }
  };

  const handleMouseEnter = (employeeId, type) => {
    setShowTooltip({ employeeId, type });
    if (!leaveBalances[employeeId]) {
      fetchLeaveBalances(employeeId);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip({ employeeId: null, type: null });
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleViewAttendance = (employee) => {
    setSelectedEmployee(employee);
    setShowAttendanceModal(true);
  };

  const handleNavigateToAttendance = () => {
    navigate("/manager/attendance");
  };

  const handleNavigateToMyAttendance = () => {
    console.log("🔍 Navigating to My Attendance");
    console.log("🔍 Current user role:", user?.role);
    console.log("🔍 Current user:", user);
    navigate("/manager/my-attendance");
  };

  const handleNavigateToLeaveRequests = () => {
    navigate("/manager/leave-requests");
  };

  const handleNavigateToManagerLeaveRequest = () => {
    navigate("/manager/leave-request");
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
              <h1 className="text-2xl font-bold text-gray-900">
                Manager Dashboard
              </h1>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                Manager
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleNavigateToAttendance}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <FaClock />
                <span>Attendance Management</span>
              </button>
              <button
                onClick={handleNavigateToMyAttendance}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
              >
                <FaClock />
                <span>My Attendance</span>
              </button>
              <button
                onClick={handleNavigateToLeaveRequests}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <FaCalendarAlt />
                <span>Leave Management</span>
              </button>
              <button
                onClick={handleNavigateToManagerLeaveRequest}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <FaCalendarAlt />
                <span>Leave Request</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FaUsers className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Employees
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {employees.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FaCalendarAlt className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Active Today
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    employees.filter((emp) => emp.employee_status === "active")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <FaBed className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">On Leave</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {employees.filter((emp) => emp.leaves_taken > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">My Team</h2>
            <p className="text-sm text-gray-600">
              Manage your team's attendance and leave
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
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employment Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leaves Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leaves Remaining
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
                {employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No employees assigned to your team
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {employee.first_name?.charAt(0)}
                                {employee.last_name?.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.first_name} {employee.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.department || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.employment_type || "N/A"}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 relative cursor-pointer"
                        onMouseEnter={() =>
                          handleMouseEnter(employee.id, "taken")
                        }
                        onMouseLeave={handleMouseLeave}
                      >
                        {employee.leaves_taken || 0}
                        {showTooltip.employeeId === employee.id &&
                          showTooltip.type === "taken" && (
                            <div className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg top-full left-1/2 transform -translate-x-1/2 mt-2 min-w-64 whitespace-nowrap">
                              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                              <div className="font-semibold mb-2">
                                Leaves Taken:
                              </div>
                              {leaveBalances[
                                employee.id
                              ]?.leaveTypeBalances?.map((balance, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between mb-1"
                                >
                                  <span>{balance.leave_type}:</span>
                                  <span className="font-medium">
                                    {balance.leaves_taken || 0}
                                  </span>
                                </div>
                              )) || <div>Loading...</div>}
                            </div>
                          )}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 relative cursor-pointer"
                        onMouseEnter={() =>
                          handleMouseEnter(employee.id, "remaining")
                        }
                        onMouseLeave={handleMouseLeave}
                      >
                        {employee.leaves_remaining || 0}
                        {showTooltip.employeeId === employee.id &&
                          showTooltip.type === "remaining" && (
                            <div className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg top-full left-1/2 transform -translate-x-1/2 mt-2 min-w-64 whitespace-nowrap">
                              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                              <div className="font-semibold mb-2">
                                Leaves Remaining:
                              </div>
                              {leaveBalances[
                                employee.id
                              ]?.leaveTypeBalances?.map((balance, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between mb-1"
                                >
                                  <span>{balance.leave_type}:</span>
                                  <span className="font-medium">
                                    {balance.leaves_remaining || 0}
                                  </span>
                                </div>
                              )) || <div>Loading...</div>}
                            </div>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            employee.employee_status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {employee.employee_status || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewAttendance(employee)}
                          className="text-blue-600 hover:text-blue-900 mr-3 flex items-center space-x-1"
                        >
                          <FaEye />
                          <span>View Attendance</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      {showAttendanceModal && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Attendance - {selectedEmployee.first_name}{" "}
                  {selectedEmployee.last_name}
                </h3>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaArrowLeft />
                </button>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Click "View Attendance" to see detailed attendance records
                </p>
                <button
                  onClick={() => {
                    setShowAttendanceModal(false);
                    navigate(`/manager/attendance/${selectedEmployee.id}`);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  View Detailed Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
