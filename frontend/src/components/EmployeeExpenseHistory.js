import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const EmployeeExpenseHistory = ({ onNavigateToSubmit }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await axios.get("/expenses/my-requests");
      setExpenses(response.data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setError("Failed to fetch expense requests");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "Pending Manager Approval":
        return "bg-yellow-100 text-yellow-800";
      case "manager_approved":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "Pending Manager Approval":
        return "Pending for Manager Approval";
      case "manager_approved":
        return "Manager Approved - Pending HR";
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onNavigateToSubmit) {
              onNavigateToSubmit();
            } else {
              window.history.back();
            }
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 cursor-pointer select-none"
          type="button"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          My Expense Requests
        </h2>
        <p className="text-gray-600">
          View the status of all your submitted expense requests.
        </p>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No expense requests found
          </h3>
          <p className="text-gray-500">
            You haven't submitted any expense requests yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-lg shadow-lg border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {expense.expense_category} - {expense.expense_type}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Series: {expense.series}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    expense.status
                  )}`}
                >
                  {getStatusText(expense.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    Amount
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(expense.amount, expense.currency)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    Expense Date
                  </div>
                  <div className="text-sm text-gray-900">
                    {formatDate(expense.expense_date)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    Submitted
                  </div>
                  <div className="text-sm text-gray-900">
                    {formatDate(expense.created_at)}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-600 mb-2">
                  Description
                </div>
                <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">
                  {expense.description}
                </div>
              </div>

              {/* Additional Details */}
              {(expense.all_managers ||
                expense.project_reference ||
                expense.payment_mode) && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    Additional Details
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {expense.all_managers && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-600 mb-1">
                          Managers
                        </div>
                        <div className="text-sm text-gray-900">
                          {expense.all_managers}
                        </div>
                      </div>
                    )}
                    {expense.project_reference && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-600 mb-1">
                          Project
                        </div>
                        <div className="text-sm text-gray-900">
                          {expense.project_reference}
                        </div>
                      </div>
                    )}
                    {expense.payment_mode && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-600 mb-1">
                          Payment Mode
                        </div>
                        <div className="text-sm text-gray-900">
                          {expense.payment_mode}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Manager Approval Status */}
              {(expense.manager1_status ||
                expense.manager2_status ||
                expense.manager3_status) && (
                <div className="border-t pt-4 mb-4">
                  <div className="text-sm font-medium text-gray-600 mb-3">
                    Manager Approval Status
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {expense.manager1_name && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {expense.manager1_name}:{" "}
                        {expense.manager1_status || "Pending"}
                      </span>
                    )}
                    {expense.manager2_name && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {expense.manager2_name}:{" "}
                        {expense.manager2_status || "Pending"}
                      </span>
                    )}
                    {expense.manager3_name && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {expense.manager3_name}:{" "}
                        {expense.manager3_status || "Pending"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* HR Approval */}
              {expense.hr_name && (
                <div className="border-t pt-4 mb-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    HR Approval
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-900 mb-1">
                      {expense.hr_name} - {formatDate(expense.hr_approved_at)}
                    </div>
                    {expense.hr_approval_notes && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Notes:</span>{" "}
                        {expense.hr_approval_notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attachment */}
              {expense.attachment_url && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    Attachment
                  </div>
                  <a
                    href={`http://localhost:5001${expense.attachment_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg px-3 py-2"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    View Attachment
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeExpenseHistory;
