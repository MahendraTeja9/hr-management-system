const { pool } = require("../config/database");

const insertSampleDocumentCollection = async () => {
  try {
    console.log("🔄 Inserting sample document collection data...");

    // Get existing employees from employee_master
    const employeesResult = await pool.query(`
      SELECT id, employee_name, employee_id, department, doj 
      FROM employee_master 
      LIMIT 5
    `);

    if (employeesResult.rows.length === 0) {
      console.log("❌ No employees found in employee_master table");
      return;
    }

    const employees = employeesResult.rows;
    console.log(`✅ Found ${employees.length} employees for document collection`);

    // Sample document collection data
    const sampleDocuments = [
      {
        document_name: "Updated Resume",
        document_type: "Required",
        status: "Received",
        notes: "Resume received and verified"
      },
      {
        document_name: "Offer & Appointment Letter",
        document_type: "Optional",
        status: "Pending",
        notes: "Awaiting submission"
      },
      {
        document_name: "Latest Compensation Letter",
        document_type: "Optional",
        status: "Pending",
        notes: "Awaiting submission"
      },
      {
        document_name: "Experience & Relieving Letter",
        document_type: "Optional",
        status: "N/A",
        notes: "Not applicable for this employee"
      },
      {
        document_name: "Latest 3 Months Pay Slips",
        document_type: "Required",
        status: "Follow-Up",
        notes: "Follow-up required"
      },
      {
        document_name: "Form 16 / Form 12B / Taxable Income Statement",
        document_type: "Optional",
        status: "Pending",
        notes: "Awaiting submission"
      },
      {
        document_name: "PAN Card",
        document_type: "Required",
        status: "Received",
        notes: "PAN card verified"
      },
      {
        document_name: "Aadhaar Card",
        document_type: "Required",
        status: "Received",
        notes: "Aadhaar card verified"
      },
      {
        document_name: "Passport Size Photographs",
        document_type: "Required",
        status: "Pending",
        notes: "Awaiting submission"
      },
      {
        document_name: "Address Proof",
        document_type: "Required",
        status: "Follow-Up",
        notes: "Follow-up required"
      }
    ];

    let insertedCount = 0;

    for (const employee of employees) {
      // Calculate due date (30 days from join date)
      const joinDate = new Date(employee.doj);
      const dueDate = new Date(joinDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // Insert 6-8 documents per employee
      const documentsForEmployee = sampleDocuments.slice(0, 6 + (employee.id % 3));
      
      for (const doc of documentsForEmployee) {
        try {
          await pool.query(`
            INSERT INTO document_collection (
              employee_id, employee_name, emp_id, department, join_date, due_date,
              document_name, document_type, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            employee.id,
            employee.employee_name,
            employee.employee_id,
            employee.department || "Engineering",
            employee.doj,
            dueDate.toISOString().split('T')[0],
            doc.document_name,
            doc.document_type,
            doc.status,
            doc.notes
          ]);

          insertedCount++;
        } catch (error) {
          if (error.code === '23505') { // Unique constraint violation
            console.log(`⚠️  Document record already exists for ${employee.employee_name} - ${doc.document_name}`);
          } else {
            console.error(`❌ Error inserting document for ${employee.employee_name}:`, error.message);
          }
        }
      }
    }

    console.log(`✅ Successfully inserted ${insertedCount} document collection records`);
    console.log("🎉 Sample document collection data insertion completed!");

  } catch (error) {
    console.error("❌ Error inserting sample document collection data:", error);
  } finally {
    await pool.end();
  }
};

// Run the script
insertSampleDocumentCollection();
