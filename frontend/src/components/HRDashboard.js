import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  FaUsers,
  FaCalendarAlt,
  FaSignOutAlt,
  FaClipboardList,
  FaCalendarCheck,
  FaUserEdit,
  FaCog,
  FaReceipt,
  FaChartBar,
  FaFileAlt,
} from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";
import AddEmployeeModal from "./AddEmployeeModal";
// EmployeeList removed
import AttendanceStats from "./AttendanceStats";
import EmployeeMaster from "./EmployeeMaster";
import HRLeaveApproval from "./HRLeaveApproval";
import OnboardedEmployees from "./OnboardedEmployees";
import EmployeeFormManagement from "./EmployeeFormManagement";
import HRAttendanceDetails from "./HRAttendanceDetails";
import EmployeeCRUD from "./EmployeeCRUD";
import HRConfig from "./HRConfig";
import HRExpenseManagement from "./HRExpenseManagement";
import HRExpenseAnalytics from "./HRExpenseAnalytics";
import HRDocumentCollection from "./HRDocumentCollection";

const HRDashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("employees");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  // const [employees, setEmployees] = useState([]);
  const [masterEmployees, setMasterEmployees] = useState([]);
  // const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debug logging
  console.log("🔍 HRDashboard mounted - Active tab:", activeTab);
  console.log("🔍 HRDashboard - User auth state:", useAuth());

  useEffect(() => {
    console.log("🔍 HRDashboard useEffect triggered");
    try {
      fetchEmployees();
      fetchMasterEmployees();
    } catch (err) {
      console.error("❌ Error in HRDashboard useEffect:", err);
      setError(err.message);
    }
  }, []);

  const fetchEmployees = async () => {
    try {
      console.log("🔍 Fetching employees...");
      const response = await axios.get(
        "http://localhost:5001/api/hr/employees"
      );
      console.log("✅ Employees fetched:", response.data);
      // setEmployees(response.data.employees); // Unused - handled by EmployeeCRUD component
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    }
  };

  const fetchMasterEmployees = async () => {
    try {
      console.log("🔍 Fetching master employees...");
      const response = await axios.get("http://localhost:5001/api/hr/master");
      console.log("✅ Master employees fetched:", response.data);
      console.log("📊 Number of employees:", response.data.employees.length);
      setMasterEmployees(response.data.employees);
    } catch (error) {
      console.error("❌ Error fetching master employees:", error);
      toast.error("Failed to fetch master employees");
    }
  };

  const handleAddEmployee = async (employeeData) => {
    try {
      await axios.post("http://localhost:5001/api/hr/employees", employeeData);
      toast.success("Employee added successfully!");
      setShowAddEmployee(false);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add employee");
    }
  };

  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: "employees", label: "Employees", icon: FaUsers },
    { id: "forms", label: "Employee Forms", icon: FaClipboardList },
    {
      id: "document-collection",
      label: "Document Collection",
      icon: FaFileAlt,
    },
    { id: "onboarded", label: "Onboarded Employees", icon: FaUsers },
    { id: "master", label: "Employee Master", icon: FaUsers },
    { id: "attendance", label: "Attendance", icon: FaCalendarAlt },
    { id: "leave", label: "Leave Management", icon: FaCalendarCheck },
    { id: "expenses", label: "Expense Management", icon: FaReceipt },
    { id: "expense-analytics", label: "Expense Analytics", icon: FaChartBar },
    { id: "config", label: "HR Config", icon: FaCog },
  ];

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
                  nxzen
                </div>
              </div>
              <div className="border-l border-gray-300 h-8"></div>
              <h1 className="text-2xl font-bold text-gray-900">
                HR Employee Onboarding & Attendance Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/profile"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-md"
              >
                <FaUserEdit className="mr-2 transition-transform duration-300 hover:scale-110" />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-red-100 hover:text-red-700 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-md"
              >
                <FaSignOutAlt className="mr-2 transition-transform duration-300 hover:scale-110" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-3 border-b-2 font-medium text-sm transition-all duration-300 ease-in-out transform hover:scale-105 whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? "border-primary-500 text-primary-600 bg-primary-50"
                      : "border-transparent text-gray-500 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50"
                  }`}
                >
                  <Icon
                    className={`mr-2 transition-transform duration-300 ${
                      activeTab === tab.id ? "scale-110" : "hover:scale-110"
                    }`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Error Boundary */}
        <div className="mb-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-800 font-medium">
                  Dashboard Error: {error}
                </span>
              </div>
            </div>
          )}
        </div>
        {/* Employees Tab */}
        {activeTab === "employees" && (
          <div>
            <EmployeeCRUD />
          </div>
        )}

        {/* Employee Forms Tab */}
        {activeTab === "forms" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Employee Form Management
              </h2>
            </div>
            <EmployeeFormManagement
              onRefresh={() => {
                fetchEmployees();
                fetchMasterEmployees();
              }}
            />
          </div>
        )}

        {/* Document Collection Tab */}
        {activeTab === "document-collection" && (
          <div>
            <HRDocumentCollection />
          </div>
        )}

        {/* Onboarded Employees Tab */}
        {activeTab === "onboarded" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Onboarded Employees
              </h2>
            </div>
            <OnboardedEmployees
              onRefresh={() => {
                fetchEmployees();
                fetchMasterEmployees();
              }}
            />
          </div>
        )}

        {/* Master Tab */}
        {activeTab === "master" && (
          <div>
            <EmployeeMaster
              employees={masterEmployees}
              onRefresh={fetchMasterEmployees}
            />
          </div>
        )}

        {/* Attendance Tab (statistics removed per request) */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            {/* Summary cards only */}
            <div>
              <AttendanceStats />
            </div>
            <HRAttendanceDetails />
          </div>
        )}

        {/* Leave Management Tab */}
        {activeTab === "leave" && (
          <div>
            <HRLeaveApproval />
          </div>
        )}

        {/* Expense Management Tab */}
        {activeTab === "expenses" && (
          <div>
            <HRExpenseManagement />
          </div>
        )}

        {/* Expense Analytics Tab */}
        {activeTab === "expense-analytics" && (
          <div>
            <HRExpenseAnalytics />
          </div>
        )}

        {/* HR Config Tab */}
        {activeTab === "config" && (
          <div>
            <HRConfig />
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === "stats" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Attendance Statistics
            </h2>
            <AttendanceStats />
          </div>
        )}
      </main>

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <AddEmployeeModal
          onClose={() => setShowAddEmployee(false)}
          onSubmit={handleAddEmployee}
        />
      )}
    </div>
  );
};

export default HRDashboard;
