import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaClock,
  FaHome,
  FaBed,
  FaCalendarAlt,
  FaCheck,
} from "react-icons/fa";
import { toast } from "react-toastify";

const ManagerEmployeeAttendance = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (employeeId && employees.length > 0) {
      const employee = employees.find(
        (emp) => emp.id.toString() === employeeId
      );
      if (employee) {
        setSelectedEmployee(employee);
        fetchEmployeeAttendance(employee.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, employees]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        "http://localhost:5001/api/manager/employees",
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

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    fetchEmployeeAttendance(employee.id);
  };

  const fetchEmployeeAttendance = async (empId) => {
    try {
      // Validate employee ID
      if (!empId || isNaN(empId)) {
        console.error("Invalid employee ID:", empId);
        toast.error("Invalid employee selected");
        setAttendance([]);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        toast.error("Please login to view attendance");
        setAttendance([]);
        return;
      }

      const response = await fetch(
        `http://localhost:5001/api/manager/employee/${empId}/attendance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAttendance(data.attendance || []);
      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || "Invalid employee ID";
        toast.error(message);
        setAttendance([]);
      } else if (response.status === 403) {
        toast.error(
          "You don't have permission to view this employee's attendance"
        );
        setAttendance([]);
      } else if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || "Employee not found";
        toast.error(message);
        setAttendance([]);
      } else if (response.status === 500) {
        console.error("Server error fetching attendance:", response.status);
        toast.error("Failed to fetch attendance. Please try again.");
        setAttendance([]);
      } else {
        console.error("Failed to fetch attendance:", response.status);
        toast.error("Failed to fetch attendance. Please try again.");
        setAttendance([]);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to fetch attendance. Please try again.");
      setAttendance([]);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case "present":
        return {
          icon: <FaCheck className="text-green-600" />,
          color: "bg-green-100 text-green-800",
          text: "Present",
        };
      case "Work From Home":
        return {
          icon: <FaHome className="text-blue-600" />,
          color: "bg-blue-100 text-blue-800",
          text: "Work From Home",
        };
      case "leave":
        return {
          icon: <FaBed className="text-red-600" />,
          color: "bg-red-100 text-red-800",
          text: "Leave",
        };
      case "absent":
        return {
          icon: <span className="text-gray-600">✗</span>,
          color: "bg-gray-100 text-gray-800",
          text: "Absent",
        };
      case "Half Day":
        return {
          icon: <FaClock className="text-orange-600" />,
          color: "bg-orange-100 text-orange-800",
          text: "Half Day",
        };
      case "holiday":
        return {
          icon: <FaCalendarAlt className="text-purple-600" />,
          color: "bg-purple-100 text-purple-800",
          text: "Holiday",
        };
      default:
        return {
          icon: null,
          color: "bg-gray-100 text-gray-800",
          text: status,
        };
    }
  };

  const formatTime = (time) => {
    if (!time) return "-";
    return time.substring(0, 5); // Show only HH:MM
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
                Employee Attendance Management
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
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Employee List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">My Team</h2>
                <p className="text-sm text-gray-600">
                  Select an employee to view attendance
                </p>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {employees.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No employees assigned
                    </p>
                  ) : (
                    employees.map((employee) => (
                      <button
                        key={employee.id}
                        onClick={() => handleEmployeeSelect(employee)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedEmployee?.id === employee.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {employee.first_name?.charAt(0)}
                                {employee.last_name?.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.first_name} {employee.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.email}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Details */}
          <div className="lg:col-span-2">
            {selectedEmployee ? (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        Attendance - {selectedEmployee.first_name}{" "}
                        {selectedEmployee.last_name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        Present week and future week attendance records (2 weeks
                        total)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendance.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-6 py-4 text-center text-gray-500"
                          >
                            No attendance records found for the present week and
                            future week
                          </td>
                        </tr>
                      ) : (
                        attendance.map((record) => {
                          const statusDisplay = getStatusDisplay(record.status);
                          return (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.color}`}
                                >
                                  {statusDisplay.icon && (
                                    <span className="mr-1">
                                      {statusDisplay.icon}
                                    </span>
                                  )}
                                  {statusDisplay.text}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.hours ? `${record.hours} Hours` : "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.notes || "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="text-center">
                  <FaCalendarAlt className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No Employee Selected
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Select an employee from the list to view their attendance
                    records.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerEmployeeAttendance;
