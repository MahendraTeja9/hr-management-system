import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import PasswordReset from "./components/PasswordReset";
import HRDashboard from "./components/HRDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import AttendancePortal from "./components/AttendancePortal";
import EmployeeAttendance from "./components/EmployeeAttendance";
import ProtectedRoute from "./components/ProtectedRoute";
import EmployeeLeaveRequest from "./components/EmployeeLeaveRequest";
import ManagerLeaveApproval from "./components/ManagerLeaveApproval";
import HRLeaveApproval from "./components/HRLeaveApproval";
import ManagerDashboard from "./components/ManagerDashboard";
import ManagerAttendance from "./components/ManagerAttendance";
import ManagerLeaveRequests from "./components/ManagerLeaveRequests";
import ManagerLeaveRequest from "./components/ManagerLeaveRequest";
import ManagerEmployeeAttendance from "./components/ManagerEmployeeAttendance";
import Profile from "./components/Profile";
import CompanyPolicies from "./components/CompanyPolicies";

function AppRoutes() {
  const { user, loading } = useAuth();

  // Debug logging
  console.log("🔍 AppRoutes - User:", user, "Loading:", loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/reset-password" element={<PasswordReset />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            {user?.role === "hr" ? (
              <Navigate to="/hr" />
            ) : user?.role === "manager" ? (
              <Navigate to="/manager/dashboard" />
            ) : (
              <Navigate to="/employee" />
            )}
          </ProtectedRoute>
        }
      />

      {/* Employee Routes */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute role="employee">
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute role="employee">
            <EmployeeAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/attendance"
        element={
          <ProtectedRoute role="employee">
            <EmployeeAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave-request"
        element={
          <ProtectedRoute role="employee">
            <EmployeeLeaveRequest />
          </ProtectedRoute>
        }
      />

      {/* Manager Routes */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute role="manager">
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute role="manager">
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/my-attendance"
        element={
          <ProtectedRoute role="manager">
            <ManagerAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/attendance"
        element={
          <ProtectedRoute role="manager">
            <ManagerEmployeeAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/attendance/:employeeId"
        element={
          <ProtectedRoute role="manager">
            <ManagerEmployeeAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/leave-requests"
        element={
          <ProtectedRoute role="manager">
            <ManagerLeaveRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/leave-request"
        element={
          <ProtectedRoute role="manager">
            <ManagerLeaveRequest />
          </ProtectedRoute>
        }
      />

      {/* HR Routes */}
      <Route
        path="/hr"
        element={
          <ProtectedRoute role="hr">
            <HRDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/leave-requests"
        element={
          <ProtectedRoute role="hr">
            <HRLeaveApproval />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/employees"
        element={
          <ProtectedRoute role="hr">
            <HRDashboard />
          </ProtectedRoute>
        }
      />

      {/* Profile Route - Available to all authenticated users */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Company Policies Route - Available to all authenticated users */}
      <Route
        path="/company-policies"
        element={
          <ProtectedRoute>
            <CompanyPolicies />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#22c55e",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
