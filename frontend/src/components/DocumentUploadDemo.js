import React, { useState } from "react";
import DocumentUploadSection from "./DocumentUploadSection";
import { FaUser, FaBriefcase } from "react-icons/fa";

const DocumentUploadDemo = () => {
  const [employmentType, setEmploymentType] = useState("Full-Time");
  const employeeId = "1"; // Demo with HR user ID

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FaUser className="mr-3 text-blue-600" />
            Document Upload System Demo
          </h2>
          <p className="text-gray-600 mt-2">
            This demonstrates the dynamic document upload system based on
            employment type.
          </p>
        </div>

        {/* Employment Type Selector */}
        <div className="mb-8 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-4">
            <FaBriefcase className="mr-2 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Employment Type
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {["Full-Time", "Contract", "Intern", "Manager"].map((type) => (
              <button
                key={type}
                onClick={() => setEmploymentType(type)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  employmentType === type
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-center">
                  <div className="font-medium">{type}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {type === "Full-Time" && "All documents required"}
                    {type === "Contract" && "All documents required"}
                    {type === "Intern" && "Limited documents"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Document Upload Section */}
        <DocumentUploadSection
          employmentType={employmentType}
          employeeId={employeeId}
          onDocumentsChange={() => console.log("Documents changed")}
        />

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">💡 How to test:</h4>
          <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
            <li>
              Select different employment types to see different document
              requirements
            </li>
            <li>
              Upload sample files (PDF, DOC, JPG, PNG) to test the upload
              functionality
            </li>
            <li>Notice how required documents are marked with (*)</li>
            <li>See real-time validation status with checkmarks</li>
            <li>Test file preview and download functionality</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadDemo;
