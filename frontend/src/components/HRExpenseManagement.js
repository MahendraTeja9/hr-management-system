import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import toast from "react-hot-toast";
import { FaEye } from "react-icons/fa";

const HRExpenseManagement = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [activeTab]);

  const fetchExpenses = async () => {
    try {
      const endpoint =
        activeTab === "pending" ? "/expenses/hr/pending" : "/expenses/all";
      const response = await axios.get(endpoint);
      setExpenses(response.data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setError("Failed to fetch expense requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (expenseId, action, notes = "") => {
    setProcessingId(expenseId);
    try {
      const response = await axios.put(
        `/expenses/hr/${expenseId}/approve`,
        {
          action,
          notes,
        },
        {
          timeout: 20000, // 20 second timeout for expense approval
        }
      );

      if (response.status === 200) {
        // Show success message
        const actionText = action === "approve" ? "approved" : "rejected";
        toast.success(`Expense request ${actionText} successfully!`, {
          duration: 4000,
          position: "top-right",
        });

        // Remove the processed expense from pending list
        if (activeTab === "pending") {
          setExpenses(expenses.filter((expense) => expense.id !== expenseId));
        } else {
          // Refresh all expenses
          fetchExpenses();
        }
        setError("");
      }
    } catch (error) {
      console.error(`Error ${action}ing expense:`, error);

      let errorMessage = `Failed to ${action} expense request`;

      if (error.code === "ECONNABORTED") {
        errorMessage = `Request timed out. Please try again. The ${action} operation may still have been processed.`;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 5000,
        position: "top-right",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewDetails = (expense) => {
    setSelectedExpense(expense);
    setShowDetailsModal(true);
  };

  const handleDelete = async (expenseId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this expense request? This action cannot be undone."
      )
    ) {
      return;
    }

    setProcessingId(expenseId);
    try {
      const response = await axios.delete(`/expenses/${expenseId}`);

      if (response.status === 200) {
        toast.success("Expense request deleted successfully!", {
          duration: 4000,
          position: "top-right",
        });

        // Remove the deleted expense from the list
        setExpenses(expenses.filter((expense) => expense.id !== expenseId));
        setError("");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to delete expense request";
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 5000,
        position: "top-right",
      });
    } finally {
      setProcessingId(null);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Expense Management
        </h2>
        <p className="text-gray-600">
          Review and manage all expense requests in the system.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("pending")}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "pending"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pending HR Approval
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "all"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              All Expenses
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">
            {activeTab === "pending" ? "✅" : "📄"}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === "pending"
              ? "No pending expense requests"
              : "No expense requests found"}
          </h3>
          <p className="text-gray-500">
            {activeTab === "pending"
              ? "All expense requests have been processed."
              : "No expense requests have been submitted yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Pending HR Approval - Card View */}
          {activeTab === "pending" && (
            <div className="space-y-6">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-white shadow rounded-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {expense.expense_category} - {expense.expense_type}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Series: {expense.series}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(expense.expense_date)}
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          expense.status
                        )}`}
                      >
                        {getStatusText(expense.status)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Employee Details
                      </h4>
                      <p className="text-sm text-gray-600">
                        <strong>Name:</strong> {expense.employee_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Email:</strong> {expense.employee_email}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Submitted:</strong>{" "}
                        {formatDate(expense.created_at)}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Expense Details
                      </h4>
                      <p className="text-sm text-gray-600">
                        <strong>Category:</strong> {expense.expense_category}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Type:</strong> {expense.expense_type}
                      </p>
                      {expense.project_reference && (
                        <p className="text-sm text-gray-600">
                          <strong>Project:</strong> {expense.project_reference}
                        </p>
                      )}
                      {expense.payment_mode && (
                        <p className="text-sm text-gray-600">
                          <strong>Payment Mode:</strong> {expense.payment_mode}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      {expense.description}
                    </p>
                  </div>

                  {/* Manager Approval Status */}
                  {expense.manager_approval_status && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">
                        Manager Approval Status
                      </h4>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                        {expense.manager_approval_status}
                      </p>
                    </div>
                  )}

                  {/* HR Approval */}
                  {expense.hr_name && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">
                        HR Approval
                      </h4>
                      <p className="text-sm text-gray-600">
                        <strong>Approved by:</strong> {expense.hr_name} on{" "}
                        {formatDate(expense.hr_approved_at)}
                      </p>
                      {expense.hr_approval_notes && (
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Notes:</strong> {expense.hr_approval_notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Attachment */}
                  {expense.attachment_url && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">
                        Attachment
                      </h4>
                      <a
                        href={`http://localhost:5001${expense.attachment_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
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
                        View {expense.attachment_name}
                      </a>
                    </div>
                  )}

                  {/* Approval Actions - Only show for pending requests */}
                  {activeTab === "pending" &&
                    expense.status === "manager_approved" && (
                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                          onClick={() => {
                            const notes = prompt(
                              "Add approval notes (optional):"
                            );
                            handleApproval(expense.id, "approve", notes || "");
                          }}
                          disabled={processingId === expense.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {processingId === expense.id && (
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          )}
                          {processingId === expense.id
                            ? "Processing..."
                            : "Approve"}
                        </button>
                        <button
                          onClick={() => {
                            const notes = prompt(
                              "Add rejection notes (optional):"
                            );
                            handleApproval(expense.id, "reject", notes || "");
                          }}
                          disabled={processingId === expense.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {processingId === expense.id && (
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          )}
                          {processingId === expense.id
                            ? "Processing..."
                            : "Reject"}
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {/* All Expenses - Table View */}
          {activeTab === "all" && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expense Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {expense.employee_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {expense.employee_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {expense.expense_category} -{" "}
                              {expense.expense_type}
                            </div>
                            <div className="text-sm text-gray-500">
                              Series: {expense.series}
                            </div>
                            {expense.project_reference && (
                              <div className="text-sm text-gray-500">
                                Project: {expense.project_reference}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(expense.amount, expense.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(expense.expense_date)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Submitted: {formatDate(expense.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              expense.status
                            )}`}
                          >
                            {getStatusText(expense.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(expense)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="View Details"
                          >
                            <FaEye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Expense Details Modal */}
      {showDetailsModal && selectedExpense && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Expense Details - {selectedExpense.expense_category} -{" "}
                  {selectedExpense.expense_type}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">
                    Employee Details
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Name:</strong> {selectedExpense.employee_name}
                    </p>
                    <p className="text-sm">
                      <strong>Email:</strong> {selectedExpense.employee_email}
                    </p>
                    <p className="text-sm">
                      <strong>Submitted:</strong>{" "}
                      {formatDate(selectedExpense.created_at)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3">
                    Expense Details
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Category:</strong>{" "}
                      {selectedExpense.expense_category}
                    </p>
                    <p className="text-sm">
                      <strong>Type:</strong> {selectedExpense.expense_type}
                    </p>
                    <p className="text-sm">
                      <strong>Amount:</strong>{" "}
                      {formatCurrency(
                        selectedExpense.amount,
                        selectedExpense.currency
                      )}
                    </p>
                    <p className="text-sm">
                      <strong>Date:</strong>{" "}
                      {formatDate(selectedExpense.expense_date)}
                    </p>
                    {selectedExpense.project_reference && (
                      <p className="text-sm">
                        <strong>Project:</strong>{" "}
                        {selectedExpense.project_reference}
                      </p>
                    )}
                    {selectedExpense.payment_mode && (
                      <p className="text-sm">
                        <strong>Payment Mode:</strong>{" "}
                        {selectedExpense.payment_mode}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-3">Description</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedExpense.description}
                </p>
              </div>

              {selectedExpense.manager_approval_status && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-700 mb-3">
                    Manager Approval Status
                  </h4>
                  <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                    {selectedExpense.manager_approval_status}
                  </p>
                </div>
              )}

              {selectedExpense.hr_name && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-700 mb-3">
                    HR Approval
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Approved by:</strong> {selectedExpense.hr_name}
                    </p>
                    <p className="text-sm">
                      <strong>Approved on:</strong>{" "}
                      {formatDate(selectedExpense.hr_approved_at)}
                    </p>
                    {selectedExpense.hr_approval_notes && (
                      <p className="text-sm">
                        <strong>Notes:</strong>{" "}
                        {selectedExpense.hr_approval_notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedExpense.attachment_url && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-700 mb-3">Attachment</h4>
                  <a
                    href={`http://localhost:5001${selectedExpense.attachment_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
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
                    View {selectedExpense.attachment_name}
                  </a>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRExpenseManagement;
