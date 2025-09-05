import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, getDay } from 'date-fns';

const AttendanceCalendar = ({
  currentDate,
  attendance,
  onDateClick,
  getAttendanceForDate,
  isDateDisabled,
  getStatusColor,
  getStatusIcon
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = monthStart;
  const endDate = monthEnd;

  // Get all days in the month
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  // Get the first day of the month to determine padding
  const firstDayOfMonth = getDay(monthStart);

  // Create calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="p-2"></div>);
  }

  // Add all days in the month
  daysInMonth.forEach(day => {
    const attendanceData = getAttendanceForDate(day);
    const isWeekendDay = isWeekend(day);
    const isDisabled = isDateDisabled(day);
    
    let dayClass = "p-2 text-center cursor-pointer hover:bg-gray-100 transition-colors duration-200";
    let statusIndicator = null;
    
    if (isWeekendDay) {
      dayClass += " bg-gray-100 text-gray-500";
    } else if (isDisabled) {
      dayClass += " text-gray-400 cursor-not-allowed";
    } else if (attendanceData) {
      dayClass += " cursor-pointer";
      const statusColor = getStatusColor(attendanceData.status);
      statusIndicator = (
        <div className={`w-6 h-6 rounded-full ${statusColor} flex items-center justify-center mx-auto mb-1`}>
          {getStatusIcon(attendanceData.status)}
        </div>
      );
    } else {
      dayClass += " cursor-pointer";
    }

    calendarDays.push(
      <div
        key={day.toISOString()}
        className={dayClass}
        onClick={() => !isWeekendDay && !isDisabled && onDateClick(day)}
        title={attendanceData ? `${attendanceData.status}${attendanceData.reason ? ` - ${attendanceData.reason}` : ''}` : ''}
      >
        <div className="text-sm font-medium">{format(day, 'd')}</div>
        {statusIndicator}
        {attendanceData && (
          <div className="text-xs text-gray-500 truncate">
            {attendanceData.status}
          </div>
        )}
      </div>
    );
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border-b">
        {weekDays.map(day => (
          <div key={day} className="bg-gray-50 p-3 text-center">
            <div className="text-sm font-medium text-gray-900">{day}</div>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {calendarDays}
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-success-500 rounded-full"></div>
            <span>Present</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-primary-500 rounded-full"></div>
            <span>Work From Home</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-danger-500 rounded-full"></div>
            <span>Leave</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
            <span>Weekend</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
