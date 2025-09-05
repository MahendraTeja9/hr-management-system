import React, { useState, useEffect, useCallback } from "react";
import {
  FaUpload,
  FaFile,
  FaFilePdf,
  FaFileWord,
  FaFileImage,
  FaTrash,
  FaCheck,
  FaExclamationTriangle,
  FaSave,
  FaPaperPlane,
  FaClock,
  FaArrowLeft,
} from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";

const DocumentUploadSection = ({
  employeeId,
  onDocumentsChange,
  readOnly = false,
  onStatusChange,
  initialStatus = "draft",
  onBack,
}) => {
  const [requirements, setRequirements] = useState({});
  const [uploadedDocuments, setUploadedDocuments] = useState({});
  const [uploading, setUploading] = useState({});
  const [validation, setValidation] = useState({});
  const [formStatus, setFormStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [requiredDocuments, setRequiredDocuments] = useState([]);
  const [uploadedRequiredCount, setUploadedRequiredCount] = useState(0);

  const fetchRequirements = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/documents/requirements`
      );
      setRequirements(response.data);

      // Extract required documents
      const required = [];
      Object.entries(response.data).forEach(([category, docs]) => {
        docs.forEach((doc) => {
          if (doc.required) {
            required.push({
              type: doc.type,
              category: category,
              name: doc.name,
            });
          }
        });
      });
      setRequiredDocuments(required);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      toast.error("Failed to load document requirements");
    }
  }, []);

  const fetchUploadedDocuments = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/documents/employee/${employeeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUploadedDocuments(response.data);

      // Calculate uploaded required documents count
      const uploadedTypes = new Set();
      Object.values(response.data)
        .flat()
        .forEach((doc) => {
          uploadedTypes.add(doc.document_type);
        });

      const uploadedRequired = requiredDocuments.filter((doc) =>
        uploadedTypes.has(doc.type)
      ).length;
      setUploadedRequiredCount(uploadedRequired);

      // Also fetch validation status
      const validationResponse = await axios.get(
        `http://localhost:5001/api/documents/validation/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setValidation(validationResponse.data.validation);
    } catch (error) {
      console.error("Error fetching uploaded documents:", error);
    }
  }, [employeeId, requiredDocuments]);

  const fetchFormStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/employee/form-status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFormStatus(response.data.status);
      if (onStatusChange) {
        onStatusChange(response.data.status);
      }
    } catch (error) {
      console.error("Error fetching form status:", error);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  useEffect(() => {
    if (employeeId) {
      fetchUploadedDocuments();
      fetchFormStatus();
    }
  }, [employeeId, fetchUploadedDocuments, fetchFormStatus]);

  const handleFileUpload = async (documentType, documentCategory, files) => {
    if (!files || files.length === 0) return;

    setUploading((prev) => ({ ...prev, [documentType]: true }));

    try {
      const formData = new FormData();
      const documentTypes = [];
      const documentCategories = [];

      Array.from(files).forEach((file, index) => {
        formData.append("documents", file);
        documentTypes.push(documentType);
        documentCategories.push(documentCategory);
      });

      formData.append("documentTypes", JSON.stringify(documentTypes));
      formData.append("documentCategories", JSON.stringify(documentCategories));

      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:5001/api/documents/upload/${employeeId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success("Documents uploaded successfully!");
      fetchUploadedDocuments();

      if (onDocumentsChange) {
        onDocumentsChange();
      }
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error(error.response?.data?.error || "Failed to upload documents");
    } finally {
      setUploading((prev) => ({ ...prev, [documentType]: false }));
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:5001/api/employee/save-draft`,
        {
          employeeId,
          documents: uploadedDocuments,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFormStatus("draft");
      if (onStatusChange) {
        onStatusChange("draft");
      }
      toast.success("Draft saved successfully!");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async () => {
    // Check if all required documents are uploaded
    if (uploadedRequiredCount < requiredDocuments.length) {
      toast.error(
        `Please upload all required documents. ${uploadedRequiredCount}/${requiredDocuments.length} uploaded.`
      );
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `/employee/submit-form`,
        {
          employeeId,
          documents: uploadedDocuments,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFormStatus("submitted");
      if (onStatusChange) {
        onStatusChange("submitted");
      }
      toast.success("Form submitted successfully!");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Document deleted successfully!");
      fetchUploadedDocuments();

      if (onDocumentsChange) {
        onDocumentsChange();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes("pdf"))
      return <FaFilePdf className="text-red-500" />;
    if (mimeType?.includes("word") || mimeType?.includes("document"))
      return <FaFileWord className="text-blue-500" />;
    if (mimeType?.includes("image"))
      return <FaFileImage className="text-green-500" />;
    return <FaFile className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const renderDocumentSection = (category, categoryName) => {
    const categoryRequirements = requirements[category] || [];
    const categoryDocuments = uploadedDocuments[category] || [];

    return (
      <div key={category} className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          {category === "employment" && (
            <FaBriefcase className="mr-2 text-blue-600" />
          )}
          {category === "education" && (
            <FaGraduationCap className="mr-2 text-green-600" />
          )}
          {category === "identity" && (
            <FaIdCard className="mr-2 text-purple-600" />
          )}
          {categoryName}
        </h3>

        <div className="space-y-4">
          {categoryRequirements.map((requirement) => {
            const documentType = requirement.type;
            const isRequired = requirement.required;
            const allowMultiple = requirement.multiple;
            const documentsOfType = categoryDocuments.filter(
              (doc) => doc.document_type === documentType
            );
            const hasDocuments = documentsOfType.length > 0;
            const validationInfo = validation[category]?.find(
              (v) => v.type === documentType
            );

            return (
              <div
                key={documentType}
                className={`border rounded-lg p-4 ${
                  isRequired
                    ? hasDocuments
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">
                      {requirement.name}
                      {isRequired ? (
                        <span className="text-red-500 ml-1">(Required)</span>
                      ) : (
                        <span className="text-blue-500 ml-1">(Optional)</span>
                      )}
                    </span>
                    {validationInfo && (
                      <span className="ml-2">
                        {validationInfo.isValid ? (
                          <FaCheck className="text-green-500" />
                        ) : (
                          <FaExclamationTriangle className="text-red-500" />
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {allowMultiple && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Multiple files allowed
                      </span>
                    )}
                    {isRequired && !hasDocuments && (
                      <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                  </div>
                </div>

                {/* Upload Area */}
                {!readOnly && (
                  <div className="mb-3">
                    <label className="block">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer">
                        <input
                          type="file"
                          multiple={allowMultiple}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            handleFileUpload(
                              documentType,
                              category,
                              e.target.files
                            )
                          }
                          className="hidden"
                          disabled={uploading[documentType]}
                        />
                        {uploading[documentType] ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                            Uploading...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <FaUpload className="mr-2 text-gray-400" />
                            Click to upload or drag files here
                          </div>
                        )}
                      </div>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB per
                      file)
                    </p>
                  </div>
                )}

                {/* Uploaded Documents */}
                {hasDocuments && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Uploaded Files:
                    </h4>
                    {documentsOfType.map((document) => (
                      <div
                        key={document.id}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded"
                      >
                        <div className="flex items-center">
                          {getFileIcon(document.mime_type)}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {document.file_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(document.file_size)} • Uploaded{" "}
                              {new Date(
                                document.uploaded_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              window.open(
                                `/documents/download/${document.id}`,
                                "_blank"
                              )
                            }
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Download
                          </button>
                          {!readOnly && (
                            <button
                              onClick={() => handleDeleteDocument(document.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!hasDocuments && (
                  <div
                    className={`text-sm p-2 rounded ${
                      isRequired
                        ? "text-red-600 bg-red-50"
                        : "text-blue-600 bg-blue-50"
                    }`}
                  >
                    {isRequired
                      ? "This document is required. Please upload it to proceed."
                      : "This document is optional. You can upload it later if needed."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (Object.keys(requirements).length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading document requirements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div
        className={`border rounded-lg p-4 ${
          formStatus === "submitted"
            ? "bg-green-50 border-green-200"
            : "bg-blue-50 border-blue-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                title="Back to form"
              >
                <FaArrowLeft className="mr-2" />
                Back to Form
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Document Upload
              </h2>
              <p className="text-sm text-gray-600">
                {formStatus === "submitted"
                  ? "✅ Form submitted successfully! Your documents are under review."
                  : `📄 Upload your required documents. ${uploadedRequiredCount}/${requiredDocuments.length} required documents uploaded.`}
              </p>
              {formStatus === "draft" && (
                <p className="text-xs text-gray-500 mt-1">
                  You can save as draft and continue later, or submit when all
                  required documents are uploaded.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {formStatus === "draft" && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  <FaSave className="mr-2" />
                  Save Draft
                </button>
                <button
                  onClick={handleSubmitForm}
                  disabled={
                    loading || uploadedRequiredCount < requiredDocuments.length
                  }
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <FaPaperPlane className="mr-2" />
                  Submit Form
                </button>
              </>
            )}
            {formStatus === "submitted" && (
              <div className="flex items-center text-green-600">
                <FaCheck className="mr-2" />
                Submitted
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {formStatus === "draft" && (
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Required Documents Progress
            </span>
            <span className="text-sm text-gray-500">
              {uploadedRequiredCount}/{requiredDocuments.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  (uploadedRequiredCount / requiredDocuments.length) * 100
                }%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {requirements.employment &&
        renderDocumentSection("employment", "Employment Documents")}
      {requirements.education &&
        renderDocumentSection("education", "Education Documents")}
      {requirements.identity &&
        renderDocumentSection("identity", "Identity Proof")}
    </div>
  );
};

// Missing imports
const FaBriefcase = ({ className }) => <span className={className}>💼</span>;
const FaGraduationCap = ({ className }) => (
  <span className={className}>🎓</span>
);
const FaIdCard = ({ className }) => <span className={className}>🆔</span>;

export default DocumentUploadSection;
