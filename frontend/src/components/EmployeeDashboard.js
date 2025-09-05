import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  FaSignOutAlt,
  FaUserEdit,
  FaCalendarAlt,
  FaCheckCircle,
  FaCalendarPlus,
  FaFileAlt,
  FaReceipt,
  FaHistory,
  FaClock,
  FaCheck,
  FaTimes,
  FaHome,
} from "react-icons/fa";
import axios from "axios";
import { format } from "date-fns";
import OnboardingForm from "./OnboardingForm";
import OnboardingStatus from "./OnboardingStatus";
import DocumentStatus from "./DocumentStatus";
import EmployeeExpenseRequest from "./EmployeeExpenseRequest";
import EmployeeExpenseHistory from "./EmployeeExpenseHistory";
import { Link } from "react-router-dom";

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Weekly attendance state
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
    checkIfOnboarded();
    if (user) {
      fetchEmployeeData();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const response = await axios.get("/employee/onboarding-status");
      setOnboardingStatus(response.data);
    } catch (error) {
      console.error("Failed to get onboarding status:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfOnboarded = async () => {
    try {
      const response = await axios.get("/employee/is-onboarded");
      setIsOnboarded(response.data.isOnboarded);
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    }
  };

  const fetchEmployeeData = async () => {
    try {
      const response = await axios.get("/employee/onboarding-form");
      setEmployeeData(response.data.form);
    } catch (error) {
      if (error.response?.status === 404) {
        // Employee hasn't submitted onboarding form yet - this is expected
        console.log(
          "No onboarding form found - employee needs to complete onboarding"
        );
        setEmployeeData(null);
      } else {
        console.error("Failed to fetch employee data:", error);
      }
    }
  };

  const handleLogout = () => {
    logout();
  };

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

  const fetchAttendance = async () => {
    if (!user) return;

    try {
      setAttendanceLoading(true);
      const { start, end } = getWeekDates(new Date());

      const response = await axios.get("/attendance/my-attendance", {
        params: {
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end, "yyyy-MM-dd"),
        },
      });

      setAttendance(response.data.attendance || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const getAttendanceForDate = (dateStr) => {
    return attendance.find(
      (att) => format(new Date(att.date), "yyyy-MM-dd") === dateStr
    );
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case "present":
        return {
          icon: <FaCheck className="text-green-600" />,
          color: "bg-green-100 text-green-800",
        };
      case "absent":
        return {
          icon: <FaTimes className="text-red-600" />,
          color: "bg-red-100 text-red-800",
        };
      case "Work From Home":
        return {
          icon: <FaHome className="text-blue-600" />,
          color: "bg-blue-100 text-blue-800",
        };
      case "leave":
        return {
          icon: <FaClock className="text-yellow-600" />,
          color: "bg-yellow-100 text-yellow-800",
        };
      case "Half Day":
        return {
          icon: <FaClock className="text-orange-600" />,
          color: "bg-orange-100 text-orange-800",
        };
      default:
        return { icon: null, color: "bg-gray-100 text-gray-800" };
    }
  };

  // Fetch attendance on component mount
  useEffect(() => {
    if (user && onboardingStatus?.status === "approved") {
      fetchAttendance();
    }
  }, [user, onboardingStatus]);

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
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <div className="flex items-center space-x-3 cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105">
                <img
                  src={require("../assets/nxzen.png")}
                  alt="nxzen Logo"
                  className="w-10 h-10 object-contain transition-transform duration-300 hover:rotate-12"
                />
                <div className="text-black font-semibold text-lg transition-colors duration-300 hover:text-primary-600">
                  NXZEN
                </div>
              </div>
              <div className="border-l border-gray-300 h-8"></div>
              <h1 className="text-2xl font-bold text-gray-900">
                Employee Portal
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/profile"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                <FaUserEdit className="mr-2" />
                Profile
              </Link>
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
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Expenses Tab Navigation */}
        {isOnboarded && activeTab === "expenses" && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("expenses")}
                  className="whitespace-nowrap py-2 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
                >
                  <FaReceipt className="inline mr-2" />
                  Submit Expense
                </button>
                <button
                  onClick={() => setActiveTab("expense-history")}
                  className="whitespace-nowrap py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  <FaHistory className="inline mr-2" />
                  Expense History
                </button>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="whitespace-nowrap py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  ← Back to Dashboard
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Expenses Content */}
        {isOnboarded && activeTab === "expenses" && <EmployeeExpenseRequest />}
        {isOnboarded && activeTab === "expense-history" && (
          <EmployeeExpenseHistory
            onNavigateToSubmit={() => setActiveTab("expenses")}
          />
        )}

        {/* Dashboard Content */}
        {activeTab === "dashboard" && (
          <>
            {/* Onboarding Form or Success Message */}
            {onboardingStatus?.hasForm ? (
              onboardingStatus.status ===
              "approved" ? null : onboardingStatus.status === "submitted" ? (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-warning-100 rounded-full flex items-center justify-center mr-4">
                      <div className="w-4 h-4 bg-warning-600 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-warning-800">
                        Form Submitted Successfully!
                      </h3>
                      <p className="text-warning-700 mt-1">
                        Your onboarding form has been submitted and is awaiting
                        HR approval. You will be notified once it's approved.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <OnboardingForm onSuccess={checkOnboardingStatus} />
              )
            ) : (
              <OnboardingForm onSuccess={checkOnboardingStatus} />
            )}

            {/* Quick Actions - Only show when onboarding is approved */}
            {onboardingStatus?.status === "approved" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Link
                    to="/employee/attendance"
                    className="bg-blue-600 text-white p-6 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <FaCalendarAlt className="text-3xl mr-4" />
                      <div>
                        <h3 className="text-xl font-semibold">
                          Book your time
                        </h3>
                      </div>
                    </div>
                  </Link>

                  <Link
                    to="/leave-request"
                    className="bg-green-600 text-white p-6 rounded-lg shadow-lg hover:bg-green-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <FaCalendarPlus className="text-3xl mr-4" />
                      <div>
                        <h3 className="text-xl font-semibold">Leave Request</h3>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={() => setActiveTab("expenses")}
                    className="bg-orange-600 text-white p-6 rounded-lg shadow-lg hover:bg-orange-700 transition-colors text-left"
                  >
                    <div className="flex items-center">
                      <FaReceipt className="text-3xl mr-4" />
                      <div>
                        <h3 className="text-xl font-semibold">
                          Expense Request
                        </h3>
                      </div>
                    </div>
                  </button>

                  <Link
                    to="/company-policies"
                    className="bg-indigo-600 text-white p-6 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <FaFileAlt className="text-3xl mr-4" />
                      <div>
                        <h3 className="text-xl font-semibold">
                          Company Policies
                        </h3>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Weekly Attendance Summary */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold text-gray-900">
                        This Week's Attendance
                      </h3>
                      <div className="text-sm text-gray-600">
                        {formatWeekRange()}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {attendanceLoading ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                              Day
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                              Status
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
                                  isToday
                                    ? "bg-blue-50 border-l-4 border-blue-500"
                                    : ""
                                }`}
                              >
                                <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-gray-900">
                                  {date.toLocaleDateString("en-US", {
                                    weekday: "short",
                                  })}
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">
                                  {date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                  {attendanceRecord ? (
                                    <span
                                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                                        getStatusDisplay(
                                          attendanceRecord.status
                                        ).color
                                      }`}
                                    >
                                      {
                                        getStatusDisplay(
                                          attendanceRecord.status
                                        ).icon
                                      }
                                      <span className="ml-2">
                                        {attendanceRecord.status ===
                                        "Work From Home"
                                          ? "Work From Home"
                                          : attendanceRecord.status
                                              .charAt(0)
                                              .toUpperCase() +
                                            attendanceRecord.status.slice(1)}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                      No Record
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            ) : onboardingStatus?.hasForm &&
              onboardingStatus?.status !== "approved" ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                    <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">
                      Employee Features Pending Approval
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Your onboarding form is being reviewed. Once approved by
                      HR, you'll have access to attendance, leave requests, and
                      expense management features.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
};

export default EmployeeDashboard;
