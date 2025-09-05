import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

// Configure axios defaults
axios.defaults.timeout = 15000; // 15 second timeout
axios.defaults.baseURL = "http://localhost:5001/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Check if user is authenticated on app load and configure axios defaults
  useEffect(() => {
    const checkAuth = async () => {
      // Configure axios defaults first
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        console.log(
          "🔐 Axios Authorization header set:",
          axios.defaults.headers.common["Authorization"]
        );

        try {
          const response = await axios.get("/auth/me");
          setUser(response.data.user);
        } catch (error) {
          console.error("Auth check failed:", error);

          // Handle different types of errors
          if (
            error.code === "ECONNABORTED" ||
            error.message === "Request aborted"
          ) {
            console.log("🔐 Auth request timed out or was aborted");
            // Don't clear token for timeout errors, just log and continue
            setUser(null);
          } else if (error.response?.data?.requiresPasswordReset) {
            console.log("🔐 User needs to change temporary password");
            toast.error("Please change your temporary password to continue");
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
            delete axios.defaults.headers.common["Authorization"];
          } else if (error.response?.status === 401) {
            // Invalid token - clear it
            console.log("🔐 Invalid token, clearing auth");
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
            delete axios.defaults.headers.common["Authorization"];
          } else {
            // Other errors - clear auth to be safe
            console.log("🔐 Auth error, clearing auth:", error.message);
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
            delete axios.defaults.headers.common["Authorization"];
          }
        }
      } else {
        delete axios.defaults.headers.common["Authorization"];
        console.log("🔐 Axios Authorization header cleared");
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post("/auth/login", {
        email,
        password,
      });

      if (response.data.requiresPasswordReset) {
        return {
          success: true,
          requiresPasswordReset: true,
          userId: response.data.userId,
          email: response.data.email,
          role: response.data.role,
        };
      }

      const { token: newToken, user: userData } = response.data;

      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(userData);

      toast.success("Login successful!");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || "Login failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (userId, newPassword) => {
    try {
      await axios.post("/auth/reset-password", {
        userId,
        newPassword,
      });

      toast.success(
        "Password updated successfully! Please login with your new password."
      );
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || "Password reset failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast.success("Logged out successfully");
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success("Password changed successfully!");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || "Password change failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    resetPassword,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
