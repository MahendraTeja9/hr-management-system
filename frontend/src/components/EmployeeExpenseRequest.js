import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const EmployeeExpenseRequest = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    expenseCategory: "",
    expenseType: "",
    otherCategory: "",
    amount: "",
    currency: "INR",
    description: "",
    expenseDate: "",
    taxIncluded: false,
  });
  const [attachments, setAttachments] = useState([]);
  const [categories, setCategories] = useState({});
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get("/expenses/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setFormData({
      ...formData,
      expenseCategory: category,
      expenseType: "",
      otherCategory: "",
    });
    setSubCategories(categories[category] || []);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Validate files
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB
      const maxFiles = 5;

      if (files.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
          setError("Only PDF, JPG, and PNG files are allowed");
          return;
        }

        if (file.size > maxSize) {
          setError("File size must be less than 10MB per file");
          return;
        }
      }

      setAttachments(files);
      setError("");
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!formData.expenseCategory) {
      setError("Please select an expense category");
      return false;
    }

    if (!formData.expenseType) {
      setError("Please select an expense type");
      return false;
    }

    if (
      formData.expenseCategory === "Other" &&
      !formData.otherCategory.trim()
    ) {
      setError("Please specify the other category");
      return false;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return false;
    }

    if (!formData.description.trim()) {
      setError("Please enter a description");
      return false;
    }

    if (!formData.expenseDate) {
      setError("Please select an expense date");
      return false;
    }

    // Check if expense date is in the future
    const expenseDate = new Date(formData.expenseDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (expenseDate > today) {
      setError("Expense date cannot be in the future");
      return false;
    }

    if (attachments.length === 0) {
      setError("Please upload at least one attachment (invoice/receipt)");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();

      // Add form data
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== "") {
          submitData.append(key, formData[key]);
        }
      });

      // Add attachments
      attachments.forEach((file, index) => {
        submitData.append("attachments", file);
      });

      const response = await axios.post("/expenses/submit", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = response.data;

      if (response.status === 200 || response.status === 201) {
        setSuccess("Expense request submitted successfully!");
        setFormData({
          expenseCategory: "",
          expenseType: "",
          otherCategory: "",
          amount: "",
          currency: "INR",
          description: "",
          expenseDate: "",
          projectReference: "",
          clientCode: "",
          paymentMode: "",
          taxIncluded: false,
        });
        setAttachments([]);
        setSubCategories([]);
        // Reset file input
        const fileInput = document.getElementById("attachment");
        if (fileInput) fileInput.value = "";
      } else {
        setError(data.error || "Failed to submit expense request");
      }
    } catch (error) {
      console.error("Error submitting expense request:", error);
      setError("Failed to submit expense request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Submit Expense Request
        </h2>
        <p className="text-gray-600">
          Fill out the form below to submit your expense for approval.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Expense Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expense Category *
          </label>
          <select
            name="expenseCategory"
            value={formData.expenseCategory}
            onChange={handleCategoryChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Category</option>
            {Object.keys(categories).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Expense Type */}
        {formData.expenseCategory && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expense Type *
            </label>
            {formData.expenseCategory === "Other" ? (
              <input
                type="text"
                name="otherCategory"
                value={formData.otherCategory}
                onChange={handleInputChange}
                placeholder="Specify expense type"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            ) : (
              <select
                name="expenseType"
                value={formData.expenseType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Type</option>
                {subCategories.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Amount and Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            placeholder="Describe the purpose and details of this expense"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Expense Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expense Date *
          </label>
          <input
            type="date"
            name="expenseDate"
            value={formData.expenseDate}
            onChange={handleInputChange}
            max={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Tax Included */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="taxIncluded"
            checked={formData.taxIncluded}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            Tax is included in the amount
          </label>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attachments (Invoice/Receipt) *
          </label>
          <input
            type="file"
            id="attachment"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Upload PDF, JPG, or PNG files (max 5 files, 10MB each)
          </p>
          {attachments.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Selected files:
              </p>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-2 rounded"
                  >
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                expenseCategory: "",
                expenseType: "",
                otherCategory: "",
                amount: "",
                currency: "INR",
                description: "",
                expenseDate: "",
                taxIncluded: false,
              });
              setAttachments([]);
              setSubCategories([]);
              setError("");
              setSuccess("");
              const fileInput = document.getElementById("attachment");
              if (fileInput) fileInput.value = "";
            }}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit Expense Request"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeExpenseRequest;
