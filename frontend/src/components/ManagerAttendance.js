import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import {
  FaArrowLeft,
  FaClock,
  FaHome,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import toast from "react-hot-toast";

const ManagerAttendance = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [currentDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentTime] = useState(
    new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  // Weekly attendance functions
  const getWeekDates = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return { start, end };
  };

  const generateWeekDays = () => {
    const { start } = getWeekDates(new Date());
    const days = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dayOfWeek = date.getDay();
      // Skip Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.push(date);
      }
    }

    return days;
  };

  const formatWeekRange = () => {
    const weekDays = generateWeekDays();
    if (weekDays.length === 0) return "";

    const firstDay = weekDays[0];
    const lastDay = weekDays[weekDays.length - 1];

    const formatDate = (date) => {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    };

    return `${formatDate(firstDay)} - ${formatDate(lastDay)}`;
  };

  const fetchAttendance = useCallback(async () => {
    try {
      if (!token) {
        console.error("No token found");
        toast.error("Please login to view attendance");
        setAttendance([]);
        setLoading(false);
        return;
      }

      const { start, end } = getWeekDates(new Date());

      const response = await axios.get("/attendance/my-attendance", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end, "yyyy-MM-dd"),
        },
      });
      setAttendance(response.data.attendance || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);

      if (error.response?.status === 401) {
        toast.error("Please login again to continue");
        // Clear invalid token
        localStorage.removeItem("token");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to view attendance");
      } else if (error.response?.status === 404) {
        // This shouldn't happen now since we return empty array instead of 404
        setAttendance([]);
      } else if (error.response?.status === 500) {
        console.error(
          "Server error fetching attendance:",
          error.response?.data
        );
        toast.error("Failed to fetch attendance. Please try again.");
      } else {
        toast.error("Failed to fetch attendance. Please try again.");
      }

      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    console.log("🔍 ManagerAttendance component mounted");
    console.log("🔍 Current URL:", window.location.pathname);
    console.log("🔍 User role:", user?.role);
    console.log("🔍 User:", user);
    fetchAttendance();
  }, [user, fetchAttendance]);

  const markAttendance = async (status) => {
    setMarkingAttendance(true);
    try {
      const attendanceData = {
        date: currentDate,
        status: status,
        checkintime: currentTime,
        hours: 8, // Default to 8 hours
      };

      await axios.post("/attendance/mark", attendanceData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success(
        `Attendance marked as ${
          status === "Work From Home"
            ? "WFH"
            : status.charAt(0).toUpperCase() + status.slice(1)
        }`
      );
      fetchAttendance(); // Refresh the attendance data
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error(error.response?.data?.error || "Failed to mark attendance");
    } finally {
      setMarkingAttendance(false);
    }
  };

  const markWeeklyAttendance = async (status, date) => {
    setMarkingAttendance(true);
    try {
      const attendanceData = {
        date: date,
        status: status,
        checkintime: currentTime,
        hours: 8, // Default to 8 hours
      };

      await axios.post("/attendance/mark", attendanceData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success(
        `Attendance marked as ${
          status === "Work From Home"
            ? "WFH"
            : status.charAt(0).toUpperCase() + status.slice(1)
        } for ${formatDate(date)}`
      );
      fetchAttendance(); // Refresh the attendance data
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error(error.response?.data?.error || "Failed to mark attendance");
    } finally {
      setMarkingAttendance(false);
    }
  };

  const getAttendanceForDate = (dateStr) => {
    return attendance.find(
      (att) => format(new Date(att.date), "yyyy-MM-dd") === dateStr
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "text-green-600 bg-green-100";
      case "Work From Home":
        return "text-blue-600 bg-blue-100";
      case "leave":
        return "text-yellow-600 bg-yellow-100";
      case "absent":
        return "text-red-600 bg-red-100";
      case "Half Day":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (error) {
      return "-";
    }
  };

  const todayAttendance = attendance.find((a) => a.date === currentDate);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
              My Attendance (Manager)
            </h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Today's Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(currentDate)}
            </p>
          </div>
        </div>

        {/* Today's Attendance Status */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Today's Attendance Status
          </h3>
          {todayAttendance ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaCheckCircle className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Attendance Marked
                  </p>
                  <p className="text-sm text-gray-600">
                    Status:{" "}
                    {todayAttendance.status === "Work From Home"
                      ? "WFH"
                      : todayAttendance.status.charAt(0).toUpperCase() +
                        todayAttendance.status.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Time: {todayAttendance.checkintime}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                  todayAttendance.status
                )}`}
              >
                {todayAttendance.status === "Work From Home"
                  ? "WFH"
                  : todayAttendance.status.charAt(0).toUpperCase() +
                    todayAttendance.status.slice(1)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaTimesCircle className="w-6 h-6 text-red-600 mr-3" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    No Attendance Marked
                  </p>
                  <p className="text-sm text-gray-600">
                    Please mark your attendance for today
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Options */}
        {!todayAttendance && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Mark Your Attendance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => markAttendance("present")}
                disabled={markingAttendance}
                className="flex flex-col items-center p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors duration-200 disabled:opacity-50"
              >
                <FaCheckCircle className="w-8 h-8 text-green-600 mb-2" />
                <h4 className="font-medium text-green-800">Present</h4>
                <p className="text-sm text-green-600">Mark as present</p>
              </button>

              <button
                onClick={() => markAttendance("Work From Home")}
                disabled={markingAttendance}
                className="flex flex-col items-center p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 disabled:opacity-50"
              >
                <FaHome className="w-8 h-8 text-blue-600 mb-2" />
                <h4 className="font-medium text-blue-800">Work From Home</h4>
                <p className="text-sm text-blue-600">Mark as WFH</p>
              </button>

              <button
                onClick={() => markAttendance("Half Day")}
                disabled={markingAttendance}
                className="flex flex-col items-center p-6 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors duration-200 disabled:opacity-50"
              >
                <FaClock className="w-8 h-8 text-orange-600 mb-2" />
                <h4 className="font-medium text-orange-800">Half Day</h4>
                <p className="text-sm text-orange-600">Mark as half day</p>
              </button>
            </div>
          </div>
        )}

        {/* Weekly Attendance View */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Current Week: {formatWeekRange()}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {generateWeekDays().map((date, index) => {
                  const attendanceRecord = getAttendanceForDate(
                    date.toISOString().split("T")[0]
                  );
                  const isToday =
                    date.toDateString() === new Date().toDateString();

                  return (
                    <tr
                      key={index}
                      className={`hover:bg-gray-50 transition-colors duration-200 ${
                        isToday ? "bg-blue-50 border-l-4 border-blue-500" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {date.toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attendanceRecord ? (
                          <span
                            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                              attendanceRecord.status
                            )}`}
                          >
                            {attendanceRecord.status === "Work From Home"
                              ? "WFH"
                              : attendanceRecord.status === "present"
                              ? "Present"
                              : attendanceRecord.status
                                  .charAt(0)
                                  .toUpperCase() +
                                attendanceRecord.status.slice(1)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Not marked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          defaultValue={attendanceRecord?.status || ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              markWeeklyAttendance(
                                e.target.value,
                                date.toISOString().split("T")[0]
                              );
                            }
                          }}
                        >
                          <option value="">Select Status</option>
                          <option value="present">Present</option>
                          <option value="Work From Home">WFH</option>
                          <option value="Half Day">Half Day</option>
                          <option value="leave">Leave</option>
                          <option value="absent">Absent</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          defaultValue={attendanceRecord?.hours || ""}
                        >
                          <option value="">Select Hours</option>
                          <option value="4">4 Hours</option>
                          <option value="8">8 Hours</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerAttendance;
