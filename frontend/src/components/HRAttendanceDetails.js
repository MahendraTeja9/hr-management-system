import React, { useState, useEffect } from "react";
import {
  FaCalendarAlt,
  FaUsers,
  FaDownload,
  FaSync,
  FaEdit,
} from "react-icons/fa";
import { format } from "date-fns";
import axios from "axios";
import toast from "react-hot-toast";

const HRAttendanceDetails = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [editReason, setEditReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAttendanceDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const fetchAttendanceDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/attendance/hr/details`, {
        params: {
          month: selectedMonth,
          year: selectedYear,
        },
      });
      setAttendanceRecords(response.data.employees || []);
    } catch (error) {
      console.error("Error fetching attendance details:", error);
      toast.error("Failed to fetch attendance details");
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "Present":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Work From Home":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "Leave":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "-";
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    try {
      return format(new Date(timeString), "hh:mm a");
    } catch (error) {
      console.error("Error formatting time:", timeString, error);
      return "-";
    }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setEditStatus(record.status || "");
    setEditReason(record.reason || "");
  };

  const closeEditModal = () => {
    setEditingRecord(null);
    setEditStatus("");
    setEditReason("");
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      await axios.put(`/attendance/${editingRecord.id}`, {
        status: editStatus,
        reason: editReason,
      });
      toast.success("Attendance updated");
      closeEditModal();
      fetchAttendanceDetails();
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error(error.response?.data?.error || "Failed to update attendance");
    }
  };

  const handleDownloadAttendance = () => {
    try {
      // Prepare CSV data
      const csvHeaders = [
        "Employee Name",
        "Employee Email",
        "Date",
        "Status",
        "Clock In",
        "Clock Out",
        "Reason",
      ];

      const csvData = filteredRecords.map((record) => [
        record.employee_name ||
          `${record.first_name} ${record.last_name}` ||
          "Unknown",
        record.email || "",
        formatDate(record.date),
        record.status || "",
        formatTime(record.clock_in_time),
        formatTime(record.clock_out_time),
        record.reason || "",
      ]);

      // Convert to CSV string
      const csvContent = [
        csvHeaders.join(","),
        ...csvData.map((row) => row.map((field) => `"${field}"`).join(",")),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);

      // Generate filename with current date and filters
      const currentDate = new Date().toISOString().split("T")[0];
      const monthName = format(
        new Date(selectedYear, selectedMonth - 1, 1),
        "MMMM"
      );
      const filename = `attendance_${monthName}_${selectedYear}_${currentDate}.csv`;

      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Attendance data downloaded as ${filename}`, {
        duration: 4000,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error downloading attendance data:", error);
      toast.error("Failed to download attendance data", {
        duration: 4000,
        position: "top-right",
      });
    }
  };

  const filteredRecords = attendanceRecords.filter((record) => {
    const employeeName =
      record.employee_name || `${record.first_name} ${record.last_name}`;
    const matchesSearch =
      !searchTerm ||
      employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment =
      !selectedDepartment || record.department === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

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
        <h2 className="text-2xl font-bold text-gray-900">Attendance Details</h2>
        <div className="flex space-x-3">
          <button
            onClick={fetchAttendanceDetails}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            title="Refresh data"
          >
            <FaSync className="mr-2" />
            Refresh
          </button>
          <button
            onClick={handleDownloadAttendance}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            title="Download attendance data as CSV"
          >
            <FaDownload className="mr-2" />
            Download CSV
          </button>
        </div>
      </div>

      {/* Month/Year Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {format(new Date(2025, i, 1), "MMMM")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Employee
            </label>
            <input
              type="text"
              placeholder="Name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Count */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FaUsers className="text-gray-400" />
            <span className="text-sm text-gray-600">
              Showing {filteredRecords.length} of {attendanceRecords.length}{" "}
              records
            </span>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <FaCalendarAlt className="mx-auto text-gray-400 text-4xl mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Attendance Records
            </h3>
            <p className="text-gray-500">
              No attendance records found for the selected criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Present Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    WFH Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.employee_name ||
                            `${record.first_name} ${record.last_name}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.department || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        {record.present_days}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {record.wfh_days}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                        {record.leave_days}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                        {record.total_attendance_days}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => openEditModal(record)}
                        className="font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-3 py-2 transition-colors duration-200 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 hover:border-blue-300"
                        title="View employee details"
                      >
                        <FaEdit className="inline mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editingRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Attendance - {editingRecord.employee_name || "Employee"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Present">Present</option>
                    <option value="Work From Home">Work From Home</option>
                    <option value="Leave">Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    rows={3}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional reason"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={closeEditModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRAttendanceDetails;
