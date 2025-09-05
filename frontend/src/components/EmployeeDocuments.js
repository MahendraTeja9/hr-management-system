
import React, { useState, useEffect } from "react";
import {
  FaEye,
  FaDownload,
  FaFile,
  FaFilePdf,
  FaFileWord,
  FaFileImage,
  FaCheck,
  FaExclamationTriangle,
  FaUser,
  FaBriefcase,
  FaGraduationCap,
  FaIdCard,
} from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";

const EmployeeDocuments = ({ employeeId, employeeName, employmentType }) => {
  const [documents, setDocuments] = useState({});
  const [validation, setValidation] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (employeeId) {
      fetchDocuments();
      fetchValidation();
    }
  }, [employeeId, employmentType]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/documents/employee/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const fetchValidation = async () => {
    if (!employmentType) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/documents/validation/${employeeId}/${employmentType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setValidation(response.data.validation);
    } catch (error) {
      console.error("Error fetching validation:", error);
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5001/api/documents/download/${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
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

  const getCategoryIcon = (category) => {
    switch (category) {
      case "employment":
        return <FaBriefcase className="text-blue-600" />;
      case "education":
        return <FaGraduationCap className="text-green-600" />;
      case "identity":
        return <FaIdCard className="text-purple-600" />;
      default:
        return <FaFile className="text-gray-600" />;
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

  const getValidationStatus = (category, documentType) => {
    const categoryValidation = validation[category];
    if (!categoryValidation) return null;

    const docValidation = categoryValidation.find(
      (v) => v.type === documentType
    );
    return docValidation;
  };

  const getOverallStatus = () => {
    let totalRequired = 0;
    let uploadedRequired = 0;

    Object.keys(validation).forEach((category) => {
      validation[category].forEach((req) => {
        if (req.required) {
          totalRequired++;
          if (req.uploaded > 0) {
            uploadedRequired++;
          }
        }
      });
    });

    return { totalRequired, uploadedRequired };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  const { totalRequired, uploadedRequired } = getOverallStatus();

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <FaUser className="mr-2 text-blue-600" />
              {employeeName}'s Documents
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Employment Type:{" "}
              <span className="font-medium">{employmentType}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">
                Document Status:
              </span>
              {uploadedRequired === totalRequired ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <FaCheck className="mr-1" />
                  Complete ({uploadedRequired}/{totalRequired})
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <FaExclamationTriangle className="mr-1" />
                  Incomplete ({uploadedRequired}/{totalRequired})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="p-6">
        {Object.keys(documents).length === 0 ? (
          <div className="text-center py-12">
            <FaFile className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No documents uploaded
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              This employee hasn't uploaded any documents yet.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(documents).map(([category, categoryDocuments]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  {getCategoryIcon(category)}
                  <span className="ml-2">{getCategoryName(category)}</span>
                </h3>

                <div className="grid gap-4">
                  {categoryDocuments.map((document) => {
                    const validationStatus = getValidationStatus(
                      category,
                      document.document_type
                    );

                    return (
                      <div
                        key={document.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            <div className="flex-shrink-0 mr-3">
                              {getFileIcon(document.mime_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {document.file_name}
                                </h4>
                                {validationStatus && (
                                  <span className="ml-2">
                                    {validationStatus.isValid ? (
                                      <FaCheck className="text-green-500" />
                                    ) : (
                                      <FaExclamationTriangle className="text-red-500" />
                                    )}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                Document Type:{" "}
                                {document.document_type
                                  .replace(/_/g, " ")
                                  .toUpperCase()}
                              </p>
                              <p className="text-xs text-gray-400">
                                Size: {formatFileSize(document.file_size)} •
                                Uploaded:{" "}
                                {new Date(
                                  document.uploaded_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => {
                                setSelectedDocument(document);
                                setShowModal(true);
                              }}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <FaEye className="mr-1" />
                              View
                            </button>
                            <button
                              onClick={() =>
                                handleDownload(document.id, document.file_name)
                              }
                              className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <FaDownload className="mr-1" />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {showModal && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Document Preview: {selectedDocument.file_name}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
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
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">
                        Document Type:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {selectedDocument.document_type
                          .replace(/_/g, " ")
                          .toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Category:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {getCategoryName(selectedDocument.document_category)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        File Size:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {formatFileSize(selectedDocument.file_size)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Uploaded:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {new Date(
                          selectedDocument.uploaded_at
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Area */}
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 text-center">
                {selectedDocument.mime_type?.includes("image") ? (
                  <img
                    src={`http://localhost:5001/${selectedDocument.file_url}`}
                    alt={selectedDocument.file_name}
                    className="max-w-full max-h-96 mx-auto rounded"
                  />
                ) : selectedDocument.mime_type?.includes("pdf") ? (
                  <div>
                    <FaFilePdf className="mx-auto h-16 w-16 text-red-500 mb-4" />
                    <p className="text-gray-600 mb-4">PDF Preview</p>
                    <iframe
                      src={`http://localhost:5001/${selectedDocument.file_url}`}
                      className="w-full h-96 border border-gray-300 rounded"
                      title={selectedDocument.file_name}
                    />
                  </div>
                ) : (
                  <div>
                    {getFileIcon(selectedDocument.mime_type)}
                    <p className="text-gray-600 mt-4">
                      Preview not available for this file type.
                      <button
                        onClick={() =>
                          handleDownload(
                            selectedDocument.id,
                            selectedDocument.file_name
                          )
                        }
                        className="text-blue-600 hover:text-blue-800 ml-2"
                      >
                        Download to view
                      </button>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() =>
                    handleDownload(
                      selectedDocument.id,
                      selectedDocument.file_name
                    )
                  }
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FaDownload className="mr-2" />
                  Download
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

export default EmployeeDocuments;
