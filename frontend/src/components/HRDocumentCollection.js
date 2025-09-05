import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPlus, FaFileAlt, FaSync } from "react-icons/fa";
import toast from "react-hot-toast";

const HRDocumentCollection = () => {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employeeForms, setEmployeeForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [filters, setFilters] = useState({
    status: "",
    documentType: "",
    department: "",
    formStatus: "",
    employmentType: "",
    searchTerm: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [employeesPerPage] = useState(5);

  // Form states
  const [formData, setFormData] = useState({
    employee_id: "",
    employee_name: "",
    emp_id: "",
    department: "",
    join_date: "",
    due_date: "",
    document_name: "",
    document_type: "Required",
    notes: "",
  });

  const [bulkFormData, setBulkFormData] = useState({
    employee_id: "",
    employee_name: "",
    emp_id: "",
    department: "",
    join_date: "",
    due_date: "",
    selectedDocuments: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [documentsRes, employeesRes, requirementsRes, formsRes] =
        await Promise.all([
          axios.get("/hr/document-collection"),
          axios.get("/hr/master"),
          axios.get("/documents/requirements"), // Get actual onboarding form documents
          axios.get("/hr/approved-employee-forms"), // Use approved employee forms only
        ]);

      console.log("🔍 Document Collection Data:", {
        documents: documentsRes.data.documents?.length || 0,
        employees: employeesRes.data.employees?.length || 0,
        requirements: requirementsRes.data,
        forms: formsRes.data.forms?.length || 0,
        formsData: formsRes.data.forms,
      });

      // Convert requirements to templates format for compatibility
      const onboardingTemplates = [];
      Object.entries(requirementsRes.data).forEach(([category, documents]) => {
        documents.forEach((doc, index) => {
          onboardingTemplates.push({
            id: `${category}_${doc.type}`,
            document_name: doc.name,
            document_type: doc.type,
            category: category,
            is_required: doc.required,
            is_active: true,
          });
        });
      });

      setDocuments(documentsRes.data.documents || []);
      setEmployees(employeesRes.data.employees || []);
      setTemplates(onboardingTemplates); // Use only onboarding form documents
      setEmployeeForms(formsRes.data.forms || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch document collection data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBulkInputChange = (e) => {
    const { name, value } = e.target;
    setBulkFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find((emp) => emp.id === parseInt(employeeId));
    if (employee) {
      setFormData({
        ...formData,
        employee_id: employee.id,
        employee_name: employee.employee_name,
        emp_id: employee.employee_id,
        department: employee.department || "",
        join_date: employee.doj || "",
      });
    }
  };

  const handleBulkEmployeeSelect = (employeeId) => {
    const employee = employees.find((emp) => emp.id === parseInt(employeeId));
    if (employee) {
      setBulkFormData({
        ...bulkFormData,
        employee_id: employee.id,
        employee_name: employee.employee_name,
        emp_id: employee.employee_id,
        department: employee.department || "",
        join_date: employee.doj || "",
      });
    }
  };

  const handleDocumentToggle = (templateId) => {
    const template = templates.find((t) => t.id === templateId);
    setBulkFormData((prev) => {
      const isSelected = prev.selectedDocuments.some(
        (doc) => doc.id === templateId
      );
      if (isSelected) {
        return {
          ...prev,
          selectedDocuments: prev.selectedDocuments.filter(
            (doc) => doc.id !== templateId
          ),
        };
      } else {
        return {
          ...prev,
          selectedDocuments: [...prev.selectedDocuments, template],
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/hr/document-collection", formData);
      toast.success("Document collection record created successfully");
      setShowAddModal(false);
      setFormData({
        employee_id: "",
        employee_name: "",
        emp_id: "",
        department: "",
        join_date: "",
        due_date: "",
        document_name: "",
        document_type: "Required",
        notes: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error creating document record:", error);
      toast.error(
        error.response?.data?.error || "Failed to create document record"
      );
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (bulkFormData.selectedDocuments.length === 0) {
      toast.error("Please select at least one document");
      return;
    }

    try {
      const documents = bulkFormData.selectedDocuments.map((doc) => ({
        document_name: doc.document_name,
        document_type: doc.document_type,
        notes: doc.description,
      }));

      await axios.post("/hr/document-collection/bulk", {
        ...bulkFormData,
        documents,
      });

      toast.success("Document collection records created successfully");
      setShowBulkAddModal(false);
      setBulkFormData({
        employee_id: "",
        employee_name: "",
        emp_id: "",
        department: "",
        join_date: "",
        due_date: "",
        selectedDocuments: [],
      });
      fetchData();
    } catch (error) {
      console.error("Error creating bulk document records:", error);
      toast.error(
        error.response?.data?.error || "Failed to create document records"
      );
    }
  };

  const handleStatusUpdate = async (documentId, newStatus) => {
    try {
      console.log("🔍 Updating document status:", { documentId, newStatus });
      await axios.put(`/hr/document-collection/${documentId}`, {
        status: newStatus,
      });
      toast.success("Document status updated successfully");
      setShowStatusModal(false);
      setSelectedDocument(null);
      fetchData();
    } catch (error) {
      console.error("Error updating document status:", error);
      toast.error("Failed to update document status");
    }
  };

  const openStatusModal = (document) => {
    console.log("🔍 Opening status modal for document:", document);
    setSelectedDocument(document);
    setShowStatusModal(true);
  };

  const handleSyncDocuments = async () => {
    try {
      const response = await axios.post("/hr/sync-document-collection");
      toast.success(response.data.message);
      fetchData(); // Refresh the data
    } catch (error) {
      console.error("Sync documents error:", error);
      toast.error("Failed to sync document collection");
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "Received":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Pending":
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case "Uploaded":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Not Uploaded":
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case "Follow-Up":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "N/A":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "Received":
        return "text-green-600";
      case "Pending":
        return "text-orange-600";
      case "Uploaded":
        return "text-green-600";
      case "Not Uploaded":
        return "text-orange-600";
      case "Follow-Up":
        return "text-blue-600";
      case "N/A":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getTypeBadge = (type) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (type) {
      case "Required":
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case "Optional":
        return `${baseClasses} bg-purple-100 text-purple-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Group employees by form submission status
  // Show only approved employees (who have been moved to onboarded_employees) with their document collection status
  console.log(
    "🔍 Processing employee forms for grouping:",
    employeeForms.length
  );

  const groupedEmployees = employeeForms.reduce((acc, form) => {
    const key = `${form.employee_id}-${form.first_name} ${form.last_name}`;

    // Find corresponding employee master data
    const employeeMaster = employees.find((emp) => emp.id === form.employee_id);

    // Find documents for this employee
    const employeeDocuments = documents.filter(
      (doc) => doc.employee_id === form.employee_id
    );

    // Get employment type for filtering
    const employmentType =
      form.employee_type || form.form_data?.employmentType || "";

    // All employees from approved-employee-forms endpoint are already approved
    // No need to filter by status

    // Now all documents shown are from the onboarding form, no need to filter by employment type
    const requiredDocuments = templates.map(
      (template) => template.document_name
    );

    // Create a complete list of required documents for this employment type
    // This ensures we show all required documents even if they don't exist in collection yet
    const completeDocumentList = requiredDocuments.map((docName) => {
      // Find if this document exists in the collection
      const existingDoc = employeeDocuments.find(
        (doc) => doc.document_name === docName
      );

      if (existingDoc) {
        return existingDoc;
      } else {
        // Create a placeholder document for missing required documents
        return {
          id: `placeholder-${docName}`,
          employee_id: form.employee_id,
          document_name: docName,
          document_type: "Required", // Default to Required
          status: "Pending",
          effective_status: "Pending",
          uploaded_file_url: null,
          created_at: null,
          updated_at: null,
          is_placeholder: true, // Flag to identify placeholder documents
        };
      }
    });

    const filteredDocuments = completeDocumentList;

    // Debug logging for intern employees
    if (employmentType === "Intern") {
      console.log(`🔍 Intern Employee ${form.employee_id} Debug:`, {
        employeeId: form.employee_id,
        employmentType: employmentType,
        totalEmployeeDocuments: employeeDocuments.length,
        requiredDocuments: requiredDocuments,
        completeDocumentList: completeDocumentList.length,
        filteredDocuments: filteredDocuments.length,
      });
    }

    // Deduplicate documents by document_name, keeping the one with the best status
    const documentMap = new Map();
    filteredDocuments.forEach((doc) => {
      const existingDoc = documentMap.get(doc.document_name);
      const currentStatus = doc.uploaded_file_url
        ? "Received"
        : doc.status || "Pending";

      if (!existingDoc) {
        documentMap.set(doc.document_name, doc);
      } else {
        // If existing document has "Pending" status and current has "Received", replace it
        const existingStatus = existingDoc.uploaded_file_url
          ? "Received"
          : existingDoc.status || "Pending";
        if (existingStatus === "Pending" && currentStatus === "Received") {
          documentMap.set(doc.document_name, doc);
        }
      }
    });

    // Create document status mapping - use effective_status from backend or fallback to calculated status
    const documentsWithStatus = Array.from(documentMap.values()).map((doc) => {
      // Use effective_status from backend if available, otherwise calculate it
      let displayStatus;
      if (doc.effective_status) {
        displayStatus = doc.effective_status;
      } else {
        // Map backend statuses to frontend display statuses
        if (doc.status === "Uploaded" || doc.status === "Received") {
          displayStatus = "Received";
        } else if (doc.status === "Not Uploaded" || doc.status === "Pending") {
          displayStatus = "Pending";
        } else {
          // Fallback calculation
          const hasUploadedFile = doc.uploaded_file_url;
          if (hasUploadedFile) {
            displayStatus = "Received";
          } else {
            displayStatus = "Pending";
          }
        }
      }

      return {
        ...doc,
        display_status: displayStatus,
      };
    });

    acc[key] = {
      employee_id: form.employee_id,
      employee_name: `${form.first_name} ${form.last_name}`,
      emp_id: form.assigned_employee_id || employeeMaster?.employee_id || "N/A",
      department: employeeMaster?.department || "N/A",
      join_date: form.form_data?.doj || employeeMaster?.doj || "N/A",
      due_date:
        filteredDocuments.length > 0 ? filteredDocuments[0].due_date : "N/A",
      // Complete Employee form details
      form_status: form.status || "Not Submitted",
      employment_type:
        form.employee_type ||
        form.form_data?.employmentType ||
        employeeMaster?.type ||
        "Not Specified",
      form_submitted_at: form.submitted_at || null,
      assigned_manager: form.assigned_manager || "Not assigned",
      user_email: form.user_email || "N/A",
      // All form details from employee form
      first_name: form.first_name || "",
      last_name: form.last_name || "",
      phone: form.form_data?.phone || "",
      address: form.form_data?.address || "",
      education: form.form_data?.education || "",
      experience: form.form_data?.experience || "",
      emergency_contact: form.form_data?.emergencyContact || {},
      // Form submission details
      submitted_at: form.submitted_at || null,
      updated_at: form.updated_at || null,
      reviewed_by: form.reviewed_by || null,
      reviewed_at: form.reviewed_at || null,
      review_notes: form.reviewed_notes || null,
      // Document collection status with proper status mapping
      documents: documentsWithStatus,
      total_documents: documentsWithStatus.length,
      submitted_documents: documentsWithStatus.filter(
        (doc) => doc.display_status === "Received"
      ).length,
      pending_documents: documentsWithStatus.filter(
        (doc) => doc.display_status === "Pending"
      ).length,
    };

    return acc;
  }, {});

  console.log("🔍 Grouped employees result:", {
    totalGrouped: Object.keys(groupedEmployees).length,
    groupedKeys: Object.keys(groupedEmployees),
    sampleGroup: Object.values(groupedEmployees)[0],
  });

  const filteredGroupedEmployees = Object.values(groupedEmployees).filter(
    (group) => {
      // Check form status filter
      const matchesFormStatus =
        !filters.formStatus || group.form_status === filters.formStatus;
      // Check employment type filter
      const matchesEmploymentType =
        !filters.employmentType ||
        group.employment_type === filters.employmentType;
      // Check department filter
      const matchesDepartment =
        !filters.department || group.department === filters.department;

      // Check search filter
      const matchesSearch =
        !filters.searchTerm ||
        group.employee_name
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        group.user_email
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        group.emp_id.toLowerCase().includes(filters.searchTerm.toLowerCase());

      // Check document status filter - if status filter is applied, only show employees who have documents with that status
      const hasMatchingDocument = (() => {
        // If no status filter is applied (All Status), show all employees
        if (!filters.status) {
          return true;
        }

        // If status filter is applied, only show employees who have documents with matching status
        return group.documents.some((doc) => {
          const matchesStatus = doc.display_status === filters.status;
          const matchesType =
            !filters.documentType || doc.document_type === filters.documentType;
          return matchesStatus && matchesType;
        });
      })();

      return (
        matchesFormStatus &&
        matchesEmploymentType &&
        matchesDepartment &&
        matchesSearch &&
        hasMatchingDocument
      );
    }
  );

  // Pagination calculations
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredGroupedEmployees.slice(
    indexOfFirstEmployee,
    indexOfLastEmployee
  );
  const totalPages = Math.ceil(
    filteredGroupedEmployees.length / employeesPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const departments = [
    ...new Set(employees.map((emp) => emp.department).filter(Boolean)),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          HR Document Collection - Complete Employee Form Details
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Employee name, email, or ID..."
              value={filters.searchTerm}
              onChange={(e) =>
                setFilters({ ...filters, searchTerm: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Received">Received</option>
              <option value="Not Uploaded">Not Uploaded</option>
              <option value="Uploaded">Uploaded</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={filters.documentType}
              onChange={(e) =>
                setFilters({ ...filters, documentType: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="Required">Required</option>
              <option value="Optional">Optional</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employment Type
            </label>
            <select
              value={filters.employmentType}
              onChange={(e) =>
                setFilters({ ...filters, employmentType: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Intern">Intern</option>
              <option value="Contract">Contract</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Form Status
            </label>
            <select
              value={filters.formStatus}
              onChange={(e) =>
                setFilters({ ...filters, formStatus: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto" style={{ maxWidth: "100%" }}>
          <table
            className="min-w-full border border-gray-300"
            style={{ tableLayout: "fixed" }}
          >
            <thead className="bg-blue-800">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400 sticky left-0 z-10 bg-blue-800"
                  style={{ width: "200px", minWidth: "200px" }}
                >
                  Employee Details
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400"
                  style={{ width: "120px", minWidth: "120px" }}
                >
                  Join Date
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400"
                  style={{ width: "140px", minWidth: "140px" }}
                >
                  Form Status
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400"
                  style={{ width: "120px", minWidth: "120px" }}
                >
                  Type
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400"
                  style={{ width: "120px", minWidth: "120px" }}
                >
                  Submitted
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400"
                  style={{ width: "150px", minWidth: "150px" }}
                >
                  Document Summary
                </th>
                {/* Dynamic document type columns */}
                {templates.map((template) => (
                  <th
                    key={template.id}
                    className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400"
                    style={{ width: "180px", minWidth: "180px" }}
                  >
                    {template.document_name}
                    {template.is_required && "*"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentEmployees.map((group, groupIndex) => (
                <tr
                  key={`${group.employee_id}-${groupIndex}`}
                  className="hover:bg-gray-50"
                >
                  {/* Employee Details - Frozen Column */}
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300 sticky left-0 z-10 bg-white shadow-sm"
                    style={{ width: "200px", minWidth: "200px" }}
                  >
                    <div>
                      <div className="text-gray-900 font-medium">
                        {group.user_email}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {group.first_name} {group.last_name}
                      </div>
                    </div>
                  </td>

                  {/* Join Date */}
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300"
                    style={{ width: "120px", minWidth: "120px" }}
                  >
                    {group.join_date && group.join_date !== "N/A"
                      ? new Date(group.join_date).toISOString().split("T")[0]
                      : "N/A"}
                  </td>

                  {/* Form Status */}
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300"
                    style={{ width: "140px", minWidth: "140px" }}
                  >
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        group.form_status === "approved"
                          ? "bg-green-100 text-green-800"
                          : group.form_status === "pending"
                          ? "bg-orange-100 text-orange-800"
                          : group.form_status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {group.form_status === "approved"
                        ? "Form Approved"
                        : group.form_status === "pending"
                        ? "Form Pending"
                        : group.form_status === "rejected"
                        ? "Form Rejected"
                        : "Not Submitted"}
                    </span>
                  </td>

                  {/* Type */}
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300"
                    style={{ width: "120px", minWidth: "120px" }}
                  >
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        group.employment_type === "Full-Time"
                          ? "bg-purple-100 text-purple-800"
                          : group.employment_type === "Intern"
                          ? "bg-blue-100 text-blue-800"
                          : group.employment_type === "Contract"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {group.employment_type || "Not Specified"}
                    </span>
                  </td>

                  {/* Submitted */}
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300"
                    style={{ width: "120px", minWidth: "120px" }}
                  >
                    {group.form_submitted_at
                      ? new Date(group.form_submitted_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "numeric",
                            day: "numeric",
                            year: "numeric",
                          }
                        )
                      : "Not submitted"}
                  </td>

                  {/* Document Summary */}
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300"
                    style={{ width: "150px", minWidth: "150px" }}
                  >
                    <div className="text-xs">
                      <div className="font-medium text-gray-900">
                        {group.submitted_documents}/{group.total_documents}{" "}
                        Submitted
                      </div>
                      <div className="text-gray-500">
                        {group.pending_documents} Pending
                      </div>
                    </div>
                  </td>

                  {/* Individual Document Status Columns */}
                  {templates.map((template) => {
                    // Find the document for this employee and template
                    const document = group.documents.find(
                      (doc) => doc.document_name === template.document_name
                    );

                    const status = document
                      ? document.display_status
                      : "Not Uploaded";

                    return (
                      <td
                        key={template.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300"
                        style={{ width: "180px", minWidth: "180px" }}
                      >
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            status === "Received" || status === "Uploaded"
                              ? "bg-green-100 text-green-800"
                              : status === "Pending" ||
                                status === "Not Uploaded"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {status === "Received" || status === "Uploaded"
                            ? "Uploaded"
                            : status}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {currentEmployees.length === 0 && (
          <div className="text-center py-12">
            <FaFileAlt className="mx-auto text-gray-400 text-4xl mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Employee Data Found
            </h3>
            <p className="text-gray-500">
              {filters.searchTerm ||
              Object.values(filters).some((f) => f !== "" && f !== "all")
                ? "Try adjusting your search or filter criteria."
                : "No employee forms have been submitted yet. Employee data will appear here once they submit their onboarding forms."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredGroupedEmployees.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {indexOfFirstEmployee + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      indexOfLastEmployee,
                      filteredGroupedEmployees.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {filteredGroupedEmployees.length}
                  </span>{" "}
                  results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNumber) => (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNumber === currentPage
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Document Collection Record
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employee
                    </label>
                    <select
                      name="employee_id"
                      value={formData.employee_id}
                      onChange={(e) => handleEmployeeSelect(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employee_name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Document Name
                    </label>
                    <input
                      type="text"
                      name="document_name"
                      value={formData.document_name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Document Type
                    </label>
                    <select
                      name="document_type"
                      value={formData.document_type}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="Required">Required</option>
                      <option value="Optional">Optional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Document
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Documents Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Bulk Add Document Collection Records
              </h3>
              <form onSubmit={handleBulkSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employee
                    </label>
                    <select
                      name="employee_id"
                      value={bulkFormData.employee_id}
                      onChange={(e) => handleBulkEmployeeSelect(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employee_name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={bulkFormData.due_date}
                      onChange={handleBulkInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Documents ({bulkFormData.selectedDocuments.length}{" "}
                      selected)
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center space-x-3 py-2"
                        >
                          <input
                            type="checkbox"
                            id={`template-${template.id}`}
                            checked={bulkFormData.selectedDocuments.some(
                              (doc) => doc.id === template.id
                            )}
                            onChange={() => handleDocumentToggle(template.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`template-${template.id}`}
                            className="flex-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">
                                {template.document_name}
                              </span>
                              <span
                                className={getTypeBadge(template.document_type)}
                              >
                                {template.document_type}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {template.description}
                            </p>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowBulkAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Documents
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update Document Status
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Employee:</strong> {selectedDocument.employee_name}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Document:</strong> {selectedDocument.document_name}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Current Status:</strong> {selectedDocument.status}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  id="newStatus"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={selectedDocument.status}
                >
                  <option value="Pending">Pending</option>
                  <option value="Received">Received</option>
                  <option value="Follow-Up">Follow-Up</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedDocument(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const newStatus =
                      document.getElementById("newStatus").value;
                    handleStatusUpdate(selectedDocument.id, newStatus);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDocumentCollection;
