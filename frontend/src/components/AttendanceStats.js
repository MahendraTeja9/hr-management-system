import React, { useState, useEffect } from "react";
import { FaUsers, FaCalendarAlt } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";

const AttendanceStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    stats: {
      Present: 0,
      "Work From Home": 0,
      Leave: 0,
    },
    percentages: {
      Present: 0,
      "Work From Home": 0,
      Leave: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/attendance/stats", {
        params: {
          month: selectedMonth,
          year: selectedYear,
        },
      });
      console.log("🔍 AttendanceStats API Response:", response.data);
      setStats(response.data.stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to fetch attendance statistics");
      // Fallback to empty stats
      setStats({
        total: 0,
        stats: {
          Present: 0,
          "Work From Home": 0,
          Leave: 0,
        },
        percentages: {
          Present: "0",
          "Work From Home": "0",
          Leave: "0",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // Pie chart removed; keep placeholder for future use

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month/Year Selector */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">
          Select Month:
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="input-field w-32"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2024, i).toLocaleDateString("en-US", { month: "long" })}
            </option>
          ))}
        </select>

        <label className="text-sm font-medium text-gray-700">Year:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="input-field w-24"
        >
          {Array.from({ length: 5 }, (_, i) => {
            const year = new Date().getFullYear() - 2 + i;
            return (
              <option key={year} value={year}>
                {year}
              </option>
            );
          })}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <FaUsers className="w-4 h-4 text-primary-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Total Employees
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.total}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
                <FaCalendarAlt className="w-4 h-4 text-success-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Present</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.stats?.Present || 0}
              </p>
              <p className="text-sm text-success-600">
                {stats?.percentages?.Present || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FaCalendarAlt className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Work From Home
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.stats?.["Work From Home"] || 0}
              </p>
              <p className="text-sm text-blue-600">
                {stats?.percentages?.["Work From Home"] || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <FaCalendarAlt className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Leave</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.stats?.Leave || 0}
              </p>
              <p className="text-sm text-red-600">
                {stats?.percentages?.Leave || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pie Chart removed per request */}

      {/* Detailed Statistics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Detailed Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Present</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Count:</span>
                <span className="text-sm font-medium">
                  {stats?.stats?.Present || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="text-sm font-medium text-success-600">
                  {stats?.percentages?.Present || 0}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">
              Work From Home
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Count:</span>
                <span className="text-sm font-medium">
                  {stats?.stats?.["Work From Home"] || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="text-sm font-medium text-blue-600">
                  {stats?.percentages?.["Work From Home"] || 0}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Leave</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Count:</span>
                <span className="text-sm font-medium">
                  {stats?.stats?.Leave || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="text-sm font-medium text-red-600">
                  {stats?.percentages?.Leave || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceStats;
