import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FaSignOutAlt,
  FaCalendarAlt,
  FaClock,
  FaHome,
  FaBed,
  FaArrowLeft,
} from "react-icons/fa";
import { format } from "date-fns";
import axios from "axios";
import toast from "react-hot-toast";
import AttendanceCalendar from "./AttendanceCalendar";

const AttendancePortal = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const fetchAttendance = useCallback(async () => {
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      console.log("📊 Fetching attendance for:", month, year);
      console.log("🔐 Axios headers:", axios.defaults.headers.common);

      const response = await axios.get(
        `http://localhost:5001/api/attendance/calendar?month=${month}&year=${year}`
      );
      console.log("✅ Attendance data:", response.data);
      setAttendance(response.data.calendar);
    } catch (error) {
      console.error("❌ Fetch attendance error:", error);
      console.error("❌ Error response:", error.response?.data);
      toast.error("Failed to fetch attendance data");
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleMarkAttendance = async (date, status, reason = "") => {
    try {
      console.log("🔐 Current axios headers:", axios.defaults.headers.common);
      console.log(
        "📅 Marking attendance for:",
        format(date, "yyyy-MM-dd"),
        status,
        reason
      );

      const response = await axios.post(
        "http://localhost:5001/api/attendance/mark",
        {
          date: format(date, "yyyy-MM-dd"),
          status,
          reason,
        }
      );

      console.log("✅ Attendance response:", response.data);
      toast.success("Attendance marked successfully!");
      setShowAttendanceForm(false);
      setSelectedDate(null);

      // Refresh attendance data to show the update immediately
      fetchAttendance();
    } catch (error) {
      console.error("❌ Attendance error:", error);
      console.error("❌ Error response:", error.response?.data);
      toast.error(error.response?.data?.error || "Failed to mark attendance");
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getAttendanceForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return attendance.find((a) => {
      const apiDate = new Date(a.date);
      const apiDateStr = format(apiDate, "yyyy-MM-dd");
      return apiDateStr === dateStr;
    });
  };

  const isDateDisabled = (date) => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const dateStr = format(date, "yyyy-MM-dd");

    // Only allow marking attendance for today
    return dateStr !== todayStr;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Present":
        return "bg-success-500";
      case "Work From Home":
        return "bg-primary-500";
      case "Leave":
        return "bg-danger-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Present":
        return <FaClock className="w-4 h-4 text-white" />;
      case "Work From Home":
        return <FaHome className="w-4 h-4 text-white" />;
      case "Leave":
        return <FaBed className="w-4 h-4 text-white" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 mr-4"
              >
                <FaArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Attendance Portal
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                <FaSignOutAlt className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Quick Actions
            </h2>
            <button
              onClick={() => {
                const today = new Date();
                const todayAttendance = getAttendanceForDate(today);

                if (todayAttendance) {
                  toast(
                    `Attendance already marked as ${todayAttendance.status} for today`,
                    {
                      icon: "ℹ️",
                      style: {
                        background: "#3b82f6",
                        color: "white",
                      },
                    }
                  );
                  return;
                }

                setSelectedDate(today);
                setShowAttendanceForm(true);
              }}
              className="btn-primary flex items-center"
            >
              <FaCalendarAlt className="mr-2" />
              Mark Today's Attendance ({format(new Date(), "MMM dd")})
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-success-50 rounded-lg">
              <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FaClock className="w-6 h-6 text-success-600" />
              </div>
              <h3 className="font-medium text-success-800">Present</h3>
              <p className="text-sm text-success-600">Mark as present</p>
            </div>

            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FaHome className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-medium text-primary-800">Work From Home</h3>
              <p className="text-sm text-primary-600">Mark as WFH</p>
            </div>

            <div className="text-center p-4 bg-warning-50 rounded-lg">
              <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FaBed className="w-6 h-6 text-warning-600" />
              </div>
              <h3 className="font-medium text-warning-800">Leave</h3>
              <p className="text-sm text-warning-600">Request leave</p>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Attendance Calendar
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() - 1,
                      1
                    )
                  )
                }
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
              >
                Previous
              </button>
              <span className="text-lg font-medium text-gray-900">
                {format(currentDate, "MMMM yyyy")}
              </span>
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() + 1,
                      1
                    )
                  )
                }
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
              >
                Next
              </button>
            </div>
          </div>

          <AttendanceCalendar
            currentDate={currentDate}
            attendance={attendance}
            onDateClick={(date) => {
              if (!isDateDisabled(date)) {
                setSelectedDate(date);
                setShowAttendanceForm(true);
              }
            }}
            getAttendanceForDate={getAttendanceForDate}
            isDateDisabled={isDateDisabled}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
          />
        </div>

        {/* Attendance Form Modal */}
        {showAttendanceForm && selectedDate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Mark Attendance for {format(selectedDate, "MMMM dd, yyyy")}
                </h3>

                <div className="space-y-4">
                  <button
                    onClick={() =>
                      handleMarkAttendance(selectedDate, "Present")
                    }
                    className="w-full flex items-center justify-center px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors duration-200"
                  >
                    <FaClock className="mr-2" />
                    Present
                  </button>

                  <button
                    onClick={() =>
                      handleMarkAttendance(selectedDate, "Work From Home")
                    }
                    className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
                  >
                    <FaHome className="mr-2" />
                    Work From Home
                  </button>

                  <button
                    onClick={() =>
                      handleMarkAttendance(
                        selectedDate,
                        "Leave",
                        "Personal leave"
                      )
                    }
                    className="w-full flex items-center justify-center px-4 py-2 bg-warning-600 text-white rounded-lg hover:bg-warning-700 transition-colors duration-200"
                  >
                    <FaBed className="mr-2" />
                    Leave
                  </button>

                  <button
                    onClick={() => {
                      setShowAttendanceForm(false);
                      setSelectedDate(null);
                    }}
                    className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AttendancePortal;
