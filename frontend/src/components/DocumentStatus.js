import React, { useState, useEffect, useCallback } from "react";
import {
  FaCheck,
  FaExclamationTriangle,
  FaClock,
  FaUpload,
  FaEye,
  FaFileAlt,
  FaTrash,
  FaDownload,
} from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";
import DocumentUploadSection from "./DocumentUploadSection";

const DocumentStatus = ({
  employeeId,
  employeeName,
  isHR = false,
  readOnly = false,
  onRefresh,
}) => {
  const [validation, setValidation] = useState({});
  const [loading, setLoading] = useState(true);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [overallStatus, setOverallStatus] = useState({});

  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchValidation = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/documents/validation/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setValidation(response.data.validation);
      setOverallStatus({
        allRequiredUploaded: response.data.allRequiredUploaded,
        totalRequired: getTotalRequired(response.data.validation),
        uploadedRequired: getUploadedRequired(response.data.validation),
      });
    } catch (error) {
      console.error("Error fetching validation:", error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      fetchValidation();
    }
  }, [employeeId, fetchValidation]);

  const getTotalRequired = (validation) => {
    let total = 0;
    Object.keys(validation).forEach((category) => {
      validation[category].forEach((req) => {
        if (req.required) total++;
      });
    });
    return total;
  };

  const getUploadedRequired = (validation) => {
    let uploaded = 0;
    Object.keys(validation).forEach((category) => {
      validation[category].forEach((req) => {
        if (req.required && req.uploaded > 0) uploaded++;
      });
    });
    return uploaded;
  };

  const handleViewAllDocuments = () => {
    setShowAllDocuments(true);
  };

  const fetchUploadedFiles = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/documents/employee/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUploadedFiles(response.data);
    } catch (error) {
      console.error("Error fetching uploaded files:", error);
    }
  };

  const handleViewFile = async (documentType) => {
    try {
      await fetchUploadedFiles();
      const allDocs = Object.values(uploadedFiles).flat();
      const fileToView = allDocs.find(
        (doc) => doc.document_type === documentType
      );

      console.log("🔍 Debug - All docs:", allDocs);
      console.log("🔍 Debug - Looking for type:", documentType);
      console.log("🔍 Debug - Found file:", fileToView);

      if (fileToView && fileToView.id) {
        // Ensure all required properties exist
        const safeFile = {
          id: fileToView.id,
          document_type: fileToView.document_type || documentType,
          file_name: fileToView.file_name || "Unknown File",
          file_type: fileToView.file_type || "application/octet-stream",
          file_url: fileToView.file_url || "",
          file_size: fileToView.file_size || 0,
          uploaded_at: fileToView.uploaded_at || new Date().toISOString(),
        };

        console.log("✅ File found, opening viewer:", {
          documentId: safeFile.id,
          fileName: safeFile.file_name,
          fileType: safeFile.file_type,
        });

        setSelectedFile(safeFile);
        setShowFileViewer(true);
      } else {
        console.log("⚠️ File not found for document type:", documentType);
        console.log(
          "⚠️ Available document types:",
          allDocs.map((doc) => doc.document_type)
        );
        toast.error("Document not found");
      }
    } catch (error) {
      console.error("Error viewing file:", error);
      toast.error("Failed to load document");
    }
  };

  const handleDeleteDocument = async (documentType) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      console.log("🔍 Trying to delete document:", documentType);

      // Create mapping from type to document name
      const typeToNameMapping = {
        resume: "Updated Resume",
        offer_letter: "Offer & Appointment Letter",
        compensation_letter: "Latest Compensation Letter",
        experience_letter: "Experience & Relieving Letter",
        payslip: "Latest 3 Months Pay Slips",
        form16: "Form 16 / Form 12B / Taxable Income Statement",
        ssc_certificate: "SSC Certificate (10th)",
        ssc_marksheet: "SSC Marksheet (10th)",
        hsc_certificate: "HSC Certificate (12th)",
        hsc_marksheet: "HSC Marksheet (12th)",
        graduation_marksheet: "Graduation Consolidated Marksheet",
        graduation_certificate: "Latest Graduation",
        postgrad_marksheet: "Post-Graduation Marksheet",
        postgrad_certificate: "Post-Graduation Certificate",
        aadhaar: "Aadhaar Card",
        pan: "PAN Card",
        passport: "Passport",
      };

      const documentName = typeToNameMapping[documentType];
      console.log("🔍 Mapped document name:", documentName);

      if (!documentName) {
        console.log("❌ No mapping found for document type:", documentType);
        toast.error("Document type not found");
        return;
      }

      // Find the document ID for this type from document_collection
      const documents = await axios.get(
        `http://localhost:5001/api/hr/document-collection/employee/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const allDocs = documents.data.documents || [];
      console.log("🔍 All documents from API:", allDocs);
      console.log("🔍 Looking for document with name:", documentName);

      const docToDelete = allDocs.find(
        (doc) => doc.document_name === documentName
      );

      console.log("🔍 Found document to delete:", docToDelete);

      if (docToDelete) {
        await axios.delete(
          `http://localhost:5001/api/hr/document-collection/${docToDelete.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        toast.success("Document deleted successfully!");
        fetchValidation();
        // Refresh the parent component if it has a refresh function
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.log(
          "❌ Document not found. Available documents:",
          allDocs.map((d) => d.document_name)
        );
        toast.error("Document not found");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleReplaceDocument = async (
    documentType,
    documentCategory,
    files
  ) => {
    if (!files || files.length === 0) return;

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

      toast.success("Document replaced successfully!");
      fetchValidation();
    } catch (error) {
      console.error("Error replacing document:", error);
      toast.error(error.response?.data?.error || "Failed to replace document");
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const token = localStorage.getItem("token");
      console.log("🔍 Downloading document ID:", documentId);

      const response = await axios.get(
        `http://localhost:5001/api/documents/download/${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      // Create blob URL and download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("✅ Download initiated successfully");
      toast.success("Download started successfully");
    } catch (error) {
      console.error("❌ Download failed:", error);
      toast.error("Failed to download document");
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "employment":
        return "💼";
      case "education":
        return "🎓";
      case "identity":
        return "🆔";
      default:
        return "📄";
    }
  };

  const getCategoryName = (category) => {
    switch (category) {
      case "employment":
        return "Employment Documents";
      case "education":
        return "Education Documents";
      case "identity":
        return "Identity Proof";
      default:
        return "Other Documents";
    }
  };

  const getDocumentStatusBadge = (requirement) => {
    if (requirement.uploaded > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <FaCheck className="mr-1" />
          Uploaded ({requirement.uploaded})
        </span>
      );
    } else if (requirement.required) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <FaExclamationTriangle className="mr-1" />
          Required - Missing
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <FaClock className="mr-1" />
          Optional - Not uploaded
        </span>
      );
    }
  };

  const getOverallStatusBadge = () => {
    const { totalRequired, uploadedRequired } = overallStatus;

    if (uploadedRequired === totalRequired) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <FaCheck className="mr-2" />
          Complete ({uploadedRequired}/{totalRequired})
        </span>
      );
    } else if (uploadedRequired > 0) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <FaClock className="mr-2" />
          Partial ({uploadedRequired}/{totalRequired})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <FaExclamationTriangle className="mr-2" />
          Pending ({uploadedRequired}/{totalRequired})
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading document status...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FaFileAlt className="mr-2 text-blue-600" />
              Document Status
              {employeeName && (
                <span className="ml-2 text-gray-600">- {employeeName}</span>
              )}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Document Status for Employee
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {getOverallStatusBadge()}
            {!isHR && (
              <button
                onClick={() => setShowUploadSection(!showUploadSection)}
                className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <FaUpload className="mr-1" />
                {showUploadSection ? "Hide Upload" : "Upload Documents"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document Status List */}
      <div className="p-6">
        {Object.keys(validation).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No document requirements found for this employment type.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(validation).map(([category, requirements]) => (
              <div key={category}>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">{getCategoryIcon(category)}</span>
                  {getCategoryName(category)}
                </h4>

                <div className="space-y-2">
                  {requirements.map((requirement) => (
                    <div key={requirement.type} className="mb-3">
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            {requirement.name}
                            {requirement.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </span>
                          {requirement.multiple && (
                            <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              Multiple files allowed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getDocumentStatusBadge(requirement)}
                          {requirement.uploaded > 0 && !readOnly && (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() =>
                                  handleDeleteDocument(requirement.type)
                                }
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete document"
                              >
                                <FaTrash className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Individual Upload Button for each document */}
                      {!readOnly && (
                        <div className="mt-2 ml-3">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            multiple={requirement.multiple}
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleReplaceDocument(
                                  requirement.type,
                                  category,
                                  e.target.files
                                );
                              }
                            }}
                            className="hidden"
                            id={`upload-${requirement.type}`}
                          />
                          <label
                            htmlFor={`upload-${requirement.type}`}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 cursor-pointer"
                          >
                            <FaUpload className="w-3 h-3 mr-1" />
                            Upload
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HR Actions */}
        {isHR && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">HR Actions</h4>
              <p className="text-sm text-blue-700 mb-3">
                This employee can be approved even with missing documents.
                Documents can be uploaded later during employment.
              </p>
              <div className="flex space-x-2">
                <button className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                  <FaCheck className="mr-1" />
                  Approve Employee
                </button>
                <button
                  onClick={handleViewAllDocuments}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FaEye className="mr-1" />
                  View All Documents
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Employee Upload Section */}
        {!isHR && showUploadSection && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                Upload Documents
              </h4>
              <p className="text-sm text-gray-600">
                Upload any missing documents. All uploads are optional and can
                be done anytime.
              </p>
            </div>
            <DocumentUploadSection
              employeeId={employeeId}
              onDocumentsChange={fetchValidation}
              readOnly={false}
            />
          </div>
        )}
      </div>

      {/* View All Documents Modal */}
      {showAllDocuments && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                All Documents - {employeeName}
              </h3>
              <button
                onClick={() => setShowAllDocuments(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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

            <div className="max-h-96 overflow-y-auto">
              {Object.keys(validation).map((category) => (
                <div key={category} className="mb-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">
                    {category.replace(/_/g, " ").toUpperCase()}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {validation[category].map((doc) => (
                      <div
                        key={doc.type}
                        className="border rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-gray-900">
                            {doc.type.replace(/_/g, " ").toUpperCase()}
                          </h5>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              doc.uploaded > 0
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {doc.uploaded > 0 ? "Uploaded" : "Missing"}
                          </span>
                        </div>

                        {doc.required && (
                          <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mb-2">
                            Required
                          </span>
                        )}

                        {doc.uploaded > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              Files uploaded: {doc.uploaded}
                            </p>
                            {isHR && (
                              <div className="mt-2 flex space-x-2">
                                <button
                                  onClick={() => handleViewFile(doc.type)}
                                  className="text-green-600 hover:text-green-800 text-sm"
                                  title="View File"
                                >
                                  <FaEye className="inline mr-1" />
                                  View
                                </button>

                                <button
                                  onClick={() => handleDeleteDocument(doc.type)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  <FaTrash className="inline mr-1" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {doc.uploaded === 0 && (
                          <p className="text-sm text-gray-500">
                            No documents uploaded yet
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAllDocuments(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {showFileViewer && selectedFile && selectedFile.file_type && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                View Document -{" "}
                {selectedFile.document_type.replace(/_/g, " ").toUpperCase()}
              </h3>
              <button
                onClick={() => {
                  setShowFileViewer(false);
                  setSelectedFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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

            <div className="mb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">
                      File Name:
                    </span>
                    <p className="text-gray-900">
                      {selectedFile.file_name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      File Type:
                    </span>
                    <p className="text-gray-900">
                      {selectedFile.file_type || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Upload Date:
                    </span>
                    <p className="text-gray-900">
                      {selectedFile.uploaded_at
                        ? new Date(
                            selectedFile.uploaded_at
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      File Size:
                    </span>
                    <p className="text-gray-900">
                      {selectedFile.file_size
                        ? (selectedFile.file_size / 1024 / 1024).toFixed(2) +
                          " MB"
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              {/* Debug info */}
              {console.log("🔍 Document Debug:", {
                selectedFile,
                fileType: selectedFile?.file_type,
                fileUrl: selectedFile?.file_url,
                fileName: selectedFile?.file_name,
              })}

              {selectedFile &&
              (selectedFile.file_type?.startsWith("image/") ||
                selectedFile.file_name
                  ?.toLowerCase()
                  .match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) ? (
                <div className="text-center">
                  <img
                    src={`http://localhost:5001/api/documents/preview/${selectedFile.id}`}
                    alt={selectedFile.file_name || "Image"}
                    className="w-full h-auto max-h-96 object-contain mx-auto"
                    onError={(e) => {
                      console.error("❌ Image load error:", e);
                      toast.error("Failed to load image preview");
                    }}
                  />
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        if (selectedFile && selectedFile.id) {
                          handleDownload(
                            selectedFile.id,
                            selectedFile.file_name
                          );
                        }
                      }}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <FaDownload className="mr-2" />
                      Download Image
                    </button>
                  </div>
                </div>
              ) : selectedFile &&
                (selectedFile.file_type === "application/pdf" ||
                  selectedFile.file_type === "application/octet-stream" ||
                  selectedFile.file_name?.toLowerCase().endsWith(".pdf")) ? (
                <div className="text-center">
                  <iframe
                    src={`http://localhost:5001/api/documents/preview/${selectedFile.id}`}
                    className="w-full h-96 border border-gray-300 rounded-lg"
                    title={selectedFile.file_name || "PDF Preview"}
                    onError={(e) => {
                      console.error("❌ PDF load error:", e);
                      toast.error("Failed to load PDF preview");
                    }}
                  />
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        if (selectedFile && selectedFile.id) {
                          handleDownload(
                            selectedFile.id,
                            selectedFile.file_name
                          );
                        }
                      }}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <FaDownload className="mr-2" />
                      Download PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100">
                  <div className="text-center">
                    <FaFileAlt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 mb-4">
                      Preview not available for this file type
                      {selectedFile?.file_name && (
                        <span className="block text-sm text-gray-400 mt-1">
                          File: {selectedFile.file_name}
                        </span>
                      )}
                      {selectedFile?.file_type && (
                        <span className="block text-sm text-gray-400">
                          Type: {selectedFile.file_type}
                        </span>
                      )}
                    </p>
                    <button
                      onClick={() => {
                        if (selectedFile && selectedFile.id) {
                          handleDownload(
                            selectedFile.id,
                            selectedFile.file_name
                          );
                        } else {
                          console.log(
                            "⚠️ Download not available - missing document ID"
                          );
                          toast.error("Download not available");
                        }
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <FaDownload className="mr-2" />
                      Download File
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => {
                  if (selectedFile && selectedFile.id) {
                    handleDownload(selectedFile.id, selectedFile.file_name);
                  } else {
                    console.log(
                      "⚠️ Download not available - missing document ID"
                    );
                    toast.error("Download not available");
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FaDownload className="mr-2" />
                Download
              </button>
              <button
                onClick={() => {
                  setShowFileViewer(false);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentStatus;
