import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { FaLock, FaEye, FaEyeSlash, FaCheck, FaUser } from "react-icons/fa";
import toast from "react-hot-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password change form state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [resetData, setResetData] = useState(null);

  const { login, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.requiresPasswordReset) {
        // Show password change form instead of redirecting
        setResetData({
          userId: result.userId,
          email: result.email,
          role: result.role,
        });
        setShowPasswordChange(true);
        setPassword("");
        setLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setPasswordChangeLoading(true);

    try {
      const result = await resetPassword(resetData.userId, newPassword);
      if (result.success) {
        toast.success(
          "Password set successfully! Please login with your new password."
        );
        // Reset the form and show login again
        setShowPasswordChange(false);
        setNewPassword("");
        setConfirmPassword("");
        setResetData(null);
        setEmail("");
        setPassword("");
      }
    } catch (error) {
      console.error("Password change error:", error);
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const goBackToLogin = () => {
    setShowPasswordChange(false);
    setNewPassword("");
    setConfirmPassword("");
    setResetData(null);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Starry background effect */}
      <div className="absolute inset-0">
        <div className="stars"></div>
      </div>

      <div className="flex flex-col md:flex-row max-w-5xl w-full relative z-10">
        {/* Left Section: Logo */}
        <div className="md:w-1/2 flex items-center justify-center p-8">
          
        </div>

        {/* Right Section: Login Form */}
        <div className="md:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                 nxzen
                </h2>
              </div>

              {!showPasswordChange ? (
                // Login Form
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                        ) : (
                          <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                    ) : (
                      "Sign in"
                    )}
                  </button>

                  <div className="text-center">
                    <a
                      href="#"
                      className="text-white hover:text-green-400 text-sm transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>
                </form>
              ) : (
                // Password Change Form
                <>
                  <div className="text-center mb-6">
                    <div className="mx-auto h-12 w-12 bg-green-600 rounded-full flex items-center justify-center mb-4">
                      <FaCheck className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Set New Password
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Welcome! Please set your new password to continue
                    </p>
                    <p className="text-green-400 font-medium text-sm mt-1">
                      {resetData?.email}
                    </p>
                  </div>

                  <form className="space-y-6" onSubmit={handlePasswordChange}>
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                          placeholder="New Password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                          ) : (
                            <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                          placeholder="Confirm New Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                          ) : (
                            <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={goBackToLogin}
                        className="flex-1 px-4 py-3 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                      >
                        Back to Login
                      </button>
                      <button
                        type="submit"
                        disabled={passwordChangeLoading}
                        className="flex-1 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {passwordChangeLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                        ) : (
                          "Set Password"
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
