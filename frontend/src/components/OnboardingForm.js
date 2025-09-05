import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaBriefcase,
  FaCalendarAlt,
  FaSave,
} from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";
import DocumentUploadSection from "./DocumentUploadSection";

const OnboardingForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    education: "",
    experience: "",
    doj: "",
    emergencyContact: {
      name: "",
      phone: "",
      relationship: "",
    },
    emergencyContact2: {
      name: "",
      phone: "",
      relationship: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [submittedUserId, setSubmittedUserId] = useState(null);
  const [errors, setErrors] = useState({});
  const [hasSavedForm, setHasSavedForm] = useState(false);

  // Load saved form data on component mount
  useEffect(() => {
    const loadSavedForm = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get("/employee/onboarding-form", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.hasForm && response.data.form.form_data) {
          setFormData(response.data.form.form_data);
          setHasSavedForm(true);
          toast.success("Saved form data loaded successfully!");
        }
      } catch (error) {
        // Silently handle errors - form might not exist yet
        console.log("No saved form found or error loading:", error.message);
      }
    };

    loadSavedForm();
  }, []);

  const handleBackToForm = () => {
    setShowDocuments(false);
    setSubmittedUserId(null);
  };

  // Validation functions
  const validateName = (name) => {
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!name.trim()) return "Name is required";
    if (!nameRegex.test(name))
      return "Name should contain only letters and spaces";
    if (name.trim().length < 2) return "Name should be at least 2 characters";
    return "";
  };

  const validateEmail = (email) => {
    if (!email.trim()) return "Email is required";
    if (!email.endsWith("@gmail.com")) return "Email must end with @gmail.com";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\d{10}$/;
    if (!phone.trim()) return "Phone number is required";
    if (!phoneRegex.test(phone))
      return "Phone number must be exactly 10 digits";
    return "";
  };

  const validateRelationship = (relationship) => {
    const relationshipRegex = /^[a-zA-Z]+$/;
    if (!relationship.trim()) return "Relationship is required";
    if (!relationshipRegex.test(relationship))
      return "Relationship should contain only letters (no spaces)";
    return "";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Clear error for this field when user starts typing
    setErrors((prev) => ({ ...prev, [name]: "" }));

    // Filter input based on field type
    let filteredValue = value;
    if (
      name === "name" ||
      name === "emergencyContact.name" ||
      name === "emergencyContact.relationship" ||
      name === "emergencyContact2.name" ||
      name === "emergencyContact2.relationship"
    ) {
      // Remove any numbers and special characters, keep only letters and spaces
      filteredValue = value.replace(/[^a-zA-Z\s]/g, "");
    } else if (
      name === "phone" ||
      name === "emergencyContact.phone" ||
      name === "emergencyContact2.phone"
    ) {
      // Remove any non-digit characters, keep only numbers
      filteredValue = value.replace(/[^0-9]/g, "");
    }

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: filteredValue,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: filteredValue,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate name
    const nameError = validateName(formData.name);
    if (nameError) newErrors.name = nameError;

    // Validate email
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    // Validate phone
    const phoneError = validatePhone(formData.phone);
    if (phoneError) newErrors.phone = phoneError;

    // Validate emergency contact name
    const contactNameError = validateName(formData.emergencyContact.name);
    if (contactNameError) newErrors["emergencyContact.name"] = contactNameError;

    // Validate emergency contact phone
    const contactPhoneError = validatePhone(formData.emergencyContact.phone);
    if (contactPhoneError)
      newErrors["emergencyContact.phone"] = contactPhoneError;

    // Validate relationship
    const relationshipError = validateRelationship(
      formData.emergencyContact.relationship
    );
    if (relationshipError)
      newErrors["emergencyContact.relationship"] = relationshipError;

    // Validate second emergency contact name
    const contactName2Error = validateName(formData.emergencyContact2.name);
    if (contactName2Error)
      newErrors["emergencyContact2.name"] = contactName2Error;

    // Validate second emergency contact phone
    const contactPhone2Error = validatePhone(formData.emergencyContact2.phone);
    if (contactPhone2Error)
      newErrors["emergencyContact2.phone"] = contactPhone2Error;

    // Validate second relationship
    const relationship2Error = validateRelationship(
      formData.emergencyContact2.relationship
    );
    if (relationship2Error)
      newErrors["emergencyContact2.relationship"] = relationship2Error;

    // Validate that all phone numbers are different
    const phoneNumbers = [
      formData.phone,
      formData.emergencyContact.phone,
      formData.emergencyContact2.phone,
    ].filter((phone) => phone && phone.trim() !== "");

    const uniquePhoneNumbers = new Set(phoneNumbers);
    if (uniquePhoneNumbers.size !== phoneNumbers.length) {
      if (formData.phone === formData.emergencyContact.phone) {
        newErrors["emergencyContact.phone"] =
          "Emergency contact phone must be different from your phone";
      }
      if (formData.phone === formData.emergencyContact2.phone) {
        newErrors["emergencyContact2.phone"] =
          "Second emergency contact phone must be different from your phone";
      }
      if (
        formData.emergencyContact.phone === formData.emergencyContact2.phone
      ) {
        newErrors["emergencyContact2.phone"] =
          "Both emergency contact phone numbers must be different";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5001/api/employee/public/onboarding-form",
        {
          formData: {
            ...formData,
            submittedAt: new Date().toISOString(),
          },
          files: [], // No files in basic form - handled separately in document upload
        }
      );

      // Store the user ID for document uploads
      setSubmittedUserId(response.data.userId);

      toast.success(
        response.data.message + "! Please upload required documents."
      );
      setShowDocuments(true);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to submit form");
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to save your progress");
        return;
      }

      await axios.post(
        "/employee/onboarding-form/save-draft",
        {
          formData: {
            ...formData,
            savedAt: new Date().toISOString(),
          },
          files: [],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setHasSavedForm(true);
      toast.success("Form saved successfully! You can continue later.");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  if (showDocuments) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">Document Upload</h3>
          <p className="text-sm text-gray-600 mt-1">
            Please upload the required documents for your position.
          </p>
        </div>

        <DocumentUploadSection
          employeeId={submittedUserId}
          onDocumentsChange={() => {}}
          onBack={handleBackToForm}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        Complete Your Onboarding
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <div className="relative">
              <FaUser className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`input-field pl-10 ${
                  errors.name ? "border-red-500" : ""
                }`}
                placeholder="Enter full name"
                required
              />
            </div>
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`input-field pl-10 ${
                  errors.email ? "border-red-500" : ""
                }`}
                required
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <div className="relative">
              <FaPhone className="absolute left-3 top-3 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                pattern="[0-9]{10}"
                onInput={(e) => {
                  // Allow only numeric input and limit to 10 digits
                  e.target.value = e.target.value
                    .replace(/[^0-9]/g, "")
                    .slice(0, 10);
                }}
                className={`input-field pl-10 ${
                  errors.phone ? "border-red-500" : ""
                }`}
                placeholder="Enter 10 digit number"
                maxLength="10"
                required
              />
            </div>
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Joining *
            </label>
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
              <input
                type="date"
                name="doj"
                value={formData.doj}
                onChange={handleInputChange}
                className="input-field pl-10"
                required
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address *
          </label>
          <div className="relative">
            <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" />
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={3}
              className="input-field pl-10"
              required
            />
          </div>
        </div>

        {/* Education & Experience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Latest Graduation *
            </label>
            <div className="relative">
              <FaGraduationCap className="absolute left-3 top-3 text-gray-400" />
              <textarea
                name="education"
                value={formData.education}
                onChange={handleInputChange}
                rows={3}
                className="input-field pl-10"
                placeholder="Degree, Institution, Year"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Experience
            </label>
            <div className="relative">
              <FaBriefcase className="absolute left-3 top-3 text-gray-400" />
              <textarea
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                rows={3}
                className="input-field pl-10"
                placeholder="Previous companies, roles, duration"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Emergency Contact
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name *
              </label>
              <input
                type="text"
                name="emergencyContact.name"
                value={formData.emergencyContact.name}
                onChange={handleInputChange}
                className={`input-field ${
                  errors["emergencyContact.name"] ? "border-red-500" : ""
                }`}
                placeholder="Enter contact name"
                required
              />
              {errors["emergencyContact.name"] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors["emergencyContact.name"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone *
              </label>
              <input
                type="tel"
                name="emergencyContact.phone"
                value={formData.emergencyContact.phone}
                onChange={handleInputChange}
                pattern="[0-9]{10}"
                onInput={(e) => {
                  // Allow only numeric input and limit to 10 digits
                  e.target.value = e.target.value
                    .replace(/[^0-9]/g, "")
                    .slice(0, 10);
                }}
                className={`input-field ${
                  errors["emergencyContact.phone"] ? "border-red-500" : ""
                }`}
                placeholder="Enter 10 digit number"
                maxLength="10"
                required
              />
              {errors["emergencyContact.phone"] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors["emergencyContact.phone"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship *
              </label>
              <input
                type="text"
                name="emergencyContact.relationship"
                value={formData.emergencyContact.relationship}
                onChange={handleInputChange}
                className={`input-field ${
                  errors["emergencyContact.relationship"]
                    ? "border-red-500"
                    : ""
                }`}
                placeholder="e.g., Spouse, Parent (letters only)"
                required
              />
              {errors["emergencyContact.relationship"] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors["emergencyContact.relationship"]}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Second Emergency Contact */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Additional Emergency Contact
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name *
              </label>
              <input
                type="text"
                name="emergencyContact2.name"
                value={formData.emergencyContact2.name}
                onChange={handleInputChange}
                className={`input-field ${
                  errors["emergencyContact2.name"] ? "border-red-500" : ""
                }`}
                placeholder="Enter contact name"
                required
              />
              {errors["emergencyContact2.name"] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors["emergencyContact2.name"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone *
              </label>
              <input
                type="tel"
                name="emergencyContact2.phone"
                value={formData.emergencyContact2.phone}
                onChange={handleInputChange}
                pattern="[0-9]{10}"
                onInput={(e) => {
                  // Allow only numeric input and limit to 10 digits
                  e.target.value = e.target.value
                    .replace(/[^0-9]/g, "")
                    .slice(0, 10);
                }}
                className={`input-field ${
                  errors["emergencyContact2.phone"] ? "border-red-500" : ""
                }`}
                placeholder="Enter 10 digit number"
                maxLength="10"
                required
              />
              {errors["emergencyContact2.phone"] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors["emergencyContact2.phone"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship *
              </label>
              <input
                type="text"
                name="emergencyContact2.relationship"
                value={formData.emergencyContact2.relationship}
                onChange={handleInputChange}
                className={`input-field ${
                  errors["emergencyContact2.relationship"]
                    ? "border-red-500"
                    : ""
                }`}
                placeholder="e.g., Spouse, Parent (letters only)"
                required
              />
              {errors["emergencyContact2.relationship"] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors["emergencyContact2.relationship"]}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Note about documents */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-1">
            📄 Document Upload
          </h4>
          <p className="text-sm text-blue-700">
            After submitting this form, you'll be able to upload required
            documents for your position.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {hasSavedForm && (
              <div className="flex items-center text-green-600 text-sm">
                <FaSave className="mr-1" />
                <span>Form saved</span>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              ) : (
                <FaSave className="mr-2" />
              )}
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-8 py-3"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                "Document Upload"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OnboardingForm;
