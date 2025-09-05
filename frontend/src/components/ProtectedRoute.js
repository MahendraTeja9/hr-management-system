import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If role is specified, check if user has the required role
  if (role && user.role !== role) {
    // Redirect based on user's actual role
    if (user.role === "hr") {
      return <Navigate to="/hr" />;
    } else if (user.role === "manager") {
      return <Navigate to="/manager" />;
    } else {
      return <Navigate to="/employee" />;
    }
  }

  return children;
};

export default ProtectedRoute;
