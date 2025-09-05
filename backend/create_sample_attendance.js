const { pool } = require("./config/database");

async function createSampleAttendance() {
  try {
    console.log("🔧 Creating sample attendance data for stalin j...");
    
    const employeeId = 87; // stalin j's user ID
    
    // Generate dates for the last 2 weeks
    const dates = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    console.log("📅 Generating attendance for dates:", dates);
    
    // Sample attendance patterns
    const attendanceData = [
      { date: dates[0], status: 'present', clock_in: '09:00', clock_out: '17:00', reason: 'Regular work day' },
      { date: dates[1], status: 'present', clock_in: '08:45', clock_out: '17:30', reason: 'Regular work day' },
      { date: dates[2], status: 'wfh', clock_in: null, clock_out: null, reason: 'Working from home' },
      { date: dates[3], status: 'present', clock_in: '09:15', clock_out: '17:00', reason: 'Regular work day' },
      { date: dates[4], status: 'present', clock_in: '08:30', clock_out: '16:45', reason: 'Regular work day' },
      { date: dates[5], status: 'absent', clock_in: null, clock_out: null, reason: 'Sick leave' },
      { date: dates[6], status: 'present', clock_in: '09:00', clock_out: '17:00', reason: 'Regular work day' },
      { date: dates[7], status: 'present', clock_in: '08:50', clock_out: '17:15', reason: 'Regular work day' },
      { date: dates[8], status: 'wfh', clock_in: null, clock_out: null, reason: 'Working from home' },
      { date: dates[9], status: 'present', clock_in: '09:00', clock_out: '17:00', reason: 'Regular work day' },
      { date: dates[10], status: 'present', clock_in: '08:45', clock_out: '16:30', reason: 'Regular work day' },
      { date: dates[11], status: 'present', clock_in: '09:00', clock_out: '17:00', reason: 'Regular work day' },
      { date: dates[12], status: 'present', clock_in: '08:30', clock_out: '17:30', reason: 'Regular work day' },
      { date: dates[13], status: 'present', clock_in: '09:00', clock_out: '17:00', reason: 'Regular work day' }
    ];
    
    let insertedCount = 0;
    
    for (const record of attendanceData) {
      // Check if attendance already exists for this date
      const existing = await pool.query(
        "SELECT id FROM attendance WHERE employee_id = $1 AND date = $2",
        [employeeId, record.date]
      );
      
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO attendance (employee_id, date, status, clock_in_time, clock_out_time, reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [employeeId, record.date, record.status, record.clock_in, record.clock_out, record.reason]
        );
        insertedCount++;
        console.log(`✅ Added attendance for ${record.date}: ${record.status}`);
      } else {
        console.log(`ℹ️  Attendance already exists for ${record.date}`);
      }
    }
    
    console.log(`\n🎉 Sample attendance data created successfully!`);
    console.log(`📊 Total records inserted: ${insertedCount}`);
    console.log(`📅 Date range: ${dates[13]} to ${dates[0]}`);
    
    // Verify the data
    const verification = await pool.query(
      "SELECT date, status, clock_in_time, clock_out_time, reason FROM attendance WHERE employee_id = $1 ORDER BY date DESC LIMIT 5",
      [employeeId]
    );
    
    console.log("\n📋 Recent attendance records:");
    verification.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.status} (${row.clock_in_time || 'N/A'} - ${row.clock_out_time || 'N/A'})`);
    });
    
  } catch (error) {
    console.error("❌ Error creating sample attendance:", error);
  } finally {
    await pool.end();
  }
}

createSampleAttendance();
