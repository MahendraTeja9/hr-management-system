const { Pool } = require("pg");
require("dotenv").config({ path: "./config.env" });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL database");
    client.release();

    // Initialize database tables
    await initializeTables();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
};

// Initialize database tables
const initializeTables = async () => {
  try {
    // Users table - Enhanced with more user details
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'employee',
        temp_password VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relationship VARCHAR(50),
        emergency_contact_name2 VARCHAR(100),
        emergency_contact_phone2 VARCHAR(20),
        emergency_contact_relationship2 VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Employee forms table - Enhanced with more form details
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_forms (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES users(id),
        type VARCHAR(50),
        form_data JSONB,
        files TEXT[],
        status VARCHAR(50) DEFAULT 'draft',
        submitted_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        review_notes TEXT,
        draft_data JSONB,
        documents_uploaded JSONB
      )
    `);

    // Onboarded employees table - For intermediate approval stage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS onboarded_employees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE,
        employee_id VARCHAR(100),
        company_email VARCHAR(255),
        manager_id VARCHAR(100),
        manager_name VARCHAR(100),
        assigned_by INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending_assignment',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Employee master table - Enhanced with more employee details and multiple managers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_master (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(100) UNIQUE NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        company_email VARCHAR(255) UNIQUE NOT NULL,
        manager_id VARCHAR(100),
        manager_name VARCHAR(100),
        manager2_id VARCHAR(100),
        manager2_name VARCHAR(100),
        manager3_id VARCHAR(100),
        manager3_name VARCHAR(100),
        type VARCHAR(50) NOT NULL,
        role VARCHAR(100),
        doj DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        department VARCHAR(100),
        designation VARCHAR(100),
        salary_band VARCHAR(50),
        location VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Managers table - To store manager information
    await pool.query(`
      CREATE TABLE IF NOT EXISTS managers (
        id SERIAL PRIMARY KEY,
        manager_id VARCHAR(100) UNIQUE NOT NULL,
        manager_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        department VARCHAR(100),
        designation VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Manager-Employee Mapping table for attendance management
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manager_employee_mapping (
        id SERIAL PRIMARY KEY,
        manager_id INTEGER REFERENCES users(id),
        employee_id INTEGER REFERENCES users(id),
        mapping_type VARCHAR(50) DEFAULT 'primary', -- primary, secondary, tertiary
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(manager_id, employee_id, mapping_type)
      )
    `);

    // Attendance table for daily attendance records
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES users(id),
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'wfh', 'leave', 'half_day', 'holiday')),
        check_in_time TIME,
        check_out_time TIME,
        total_hours DECIMAL(4,2),
        notes TEXT,
        marked_by INTEGER REFERENCES users(id), -- who marked the attendance (employee or manager)
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, date)
      )
    `);

    // Leave requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        series VARCHAR(50) UNIQUE NOT NULL,
        employee_id INTEGER NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        leave_type VARCHAR(100) NOT NULL,
        leave_balance_before DECIMAL(5,1) NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE,
        half_day BOOLEAN DEFAULT FALSE,
        total_leave_days DECIMAL(5,1) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending_manager_approval',
        manager_approved_at TIMESTAMP,
        manager_approval_notes TEXT,
        hr_id INTEGER,
        hr_name VARCHAR(255),
        hr_approved_at TIMESTAMP,
        hr_approval_notes TEXT,
        approval_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create leave_types table - Enhanced for HR Config
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id SERIAL PRIMARY KEY,
        type_name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(20) DEFAULT '#3B82F6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new columns to existing leave_types table
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_types' AND column_name = 'max_days'
        ) THEN
          ALTER TABLE leave_types ADD COLUMN max_days INTEGER;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_types' AND column_name = 'is_active'
        ) THEN
          ALTER TABLE leave_types ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
      END $$;
    `);

    // Add multiple manager columns to existing employee_master table
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employee_master' AND column_name = 'manager2_id'
        ) THEN
          ALTER TABLE employee_master ADD COLUMN manager2_id VARCHAR(100);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employee_master' AND column_name = 'manager2_name'
        ) THEN
          ALTER TABLE employee_master ADD COLUMN manager2_name VARCHAR(100);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employee_master' AND column_name = 'manager3_id'
        ) THEN
          ALTER TABLE employee_master ADD COLUMN manager3_id VARCHAR(100);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employee_master' AND column_name = 'manager3_name'
        ) THEN
          ALTER TABLE employee_master ADD COLUMN manager3_name VARCHAR(100);
        END IF;
      END $$;
    `);

    // Add multiple manager columns to existing leave_requests table
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'manager1_id'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN manager1_id VARCHAR(100);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'manager1_name'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN manager1_name VARCHAR(100);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'manager1_status'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN manager1_status VARCHAR(50) DEFAULT 'Pending';
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'manager2_id'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN manager2_id VARCHAR(100);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'manager2_name'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN manager2_name VARCHAR(100);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'manager2_status'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN manager2_status VARCHAR(50) DEFAULT 'Pending';
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'manager3_id'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN manager3_id VARCHAR(100);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'manager3_name'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN manager3_name VARCHAR(100);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'manager3_status'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN manager3_status VARCHAR(50) DEFAULT 'Pending';
        END IF;
      END $$;
    `);

    // Create leave_balances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
              total_allocated INTEGER DEFAULT 15,
      leaves_taken INTEGER DEFAULT 0,
      leaves_remaining INTEGER DEFAULT 15,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, year),
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create comp_off_balances table for tracking Comp Off separately
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comp_off_balances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        total_earned DECIMAL(5,1) DEFAULT 0,
        comp_off_taken DECIMAL(5,1) DEFAULT 0,
        comp_off_remaining DECIMAL(5,1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, year),
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create system_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        total_annual_leaves INTEGER DEFAULT 15,
        allow_half_day BOOLEAN DEFAULT TRUE,
        approval_workflow VARCHAR(50) DEFAULT 'manager_then_hr',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create departments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(20) NOT NULL UNIQUE,
        description TEXT,
        manager_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Add department_id to employee_master table if not exists
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employee_master' AND column_name = 'department_id'
        ) THEN
          ALTER TABLE employee_master ADD COLUMN department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Create employee_documents table for document uploads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_documents (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        document_category VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        is_required BOOLEAN DEFAULT FALSE,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create expenses table for expense management
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        series VARCHAR(50) UNIQUE NOT NULL,
        employee_id INTEGER NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        expense_category VARCHAR(100) NOT NULL,
        expense_type VARCHAR(100) NOT NULL,
        other_category VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        description TEXT NOT NULL,
        attachment_url VARCHAR(500),
        attachment_name VARCHAR(255),
        expense_date DATE NOT NULL,
        project_reference VARCHAR(255),
        client_code VARCHAR(100),
        payment_mode VARCHAR(50),
        tax_included BOOLEAN DEFAULT FALSE,
        total_reimbursable DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'pending_manager_approval',
        manager1_id VARCHAR(100),
        manager1_name VARCHAR(100),
        manager1_status VARCHAR(50) DEFAULT 'Pending',
        manager1_approved_at TIMESTAMP,
        manager1_approval_notes TEXT,
        manager2_id VARCHAR(100),
        manager2_name VARCHAR(100),
        manager2_status VARCHAR(50) DEFAULT 'Pending',
        manager2_approved_at TIMESTAMP,
        manager2_approval_notes TEXT,
        manager3_id VARCHAR(100),
        manager3_name VARCHAR(100),
        manager3_status VARCHAR(50) DEFAULT 'Pending',
        manager3_approved_at TIMESTAMP,
        manager3_approval_notes TEXT,
        hr_id INTEGER,
        hr_name VARCHAR(255),
        hr_approved_at TIMESTAMP,
        hr_approval_notes TEXT,
        approval_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create expense_attachments table for multiple file uploads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expense_attachments (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
      )
    `);

    // Create document_collection table for HR document tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_collection (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        emp_id VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        join_date DATE NOT NULL,
        due_date DATE NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(50) NOT NULL DEFAULT 'Required',
        status VARCHAR(50) DEFAULT 'Pending',
        notes TEXT,
        uploaded_file_url VARCHAR(500),
        uploaded_file_name VARCHAR(255),
        uploaded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create document_templates table for predefined document types
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id SERIAL PRIMARY KEY,
        document_name VARCHAR(255) NOT NULL UNIQUE,
        document_type VARCHAR(50) NOT NULL DEFAULT 'Required',
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default system settings
    await pool.query(`
      INSERT INTO system_settings (total_annual_leaves, allow_half_day, approval_workflow)
      SELECT 15, TRUE, 'manager_then_hr'
      WHERE NOT EXISTS (SELECT 1 FROM system_settings)
    `);

    // Insert default departments
    await pool.query(`
      INSERT INTO departments (name, code, description) VALUES
      ('Engineering', 'ENG', 'Software development and technical teams'),
      ('Product', 'PRD', 'Product management and strategy'),
      ('Design', 'DSN', 'UI/UX and graphic design'),
      ('Marketing', 'MKT', 'Marketing and communications'),
      ('Human Resources', 'HR', 'HR and administrative functions')
      ON CONFLICT (name) DO NOTHING
    `);

    // Insert default leave types
    await pool.query(`
      INSERT INTO leave_types (type_name, description, max_days, color) VALUES
      ('Earned/Annual Leave', 'Annual leave earned monthly (1.25 days/month)', 15, '#3B82F6'),
      ('Sick Leave', 'Medical leave earned monthly (0.5 days/month)', 6, '#EF4444'),
      ('Casual Leave', 'Short-term leave earned monthly (0.5 days/month)', 6, '#10B981'),
      ('Maternity Leave', 'Leave for expecting mothers', 180, '#8B5CF6'),
      ('Paternity Leave', 'Leave for new fathers', 15, '#F59E0B'),
      ('Comp Off', 'Compensatory off for overtime work', NULL, '#84CC16')
      ON CONFLICT (type_name) DO NOTHING
    `);

    // Insert default document templates with proper categorization and required flags
    await pool.query(`
      INSERT INTO document_templates (document_name, document_type, category, is_required, allow_multiple, description) VALUES
      ('Updated Resume', 'resume', 'employment', false, false, 'Current resume with latest experience and skills'),
      ('Offer & Appointment Letter', 'offer_letter', 'employment', false, false, 'Official offer letter and appointment confirmation'),
      ('Latest Compensation Letter', 'compensation_letter', 'employment', false, false, 'Most recent salary and compensation details'),
      ('Experience & Relieving Letter', 'experience_letter', 'employment', false, false, 'Previous employment experience and relieving letter'),
      ('Latest 3 Months Pay Slips', 'payslip', 'employment', false, true, 'Pay slips from the last 3 months of previous employment'),
      ('Form 16 / Form 12B / Taxable Income Statement', 'form16', 'employment', false, false, 'Tax-related documents for income verification'),
      ('SSC Certificate (10th)', 'ssc_certificate', 'education', false, false, 'Secondary School Certificate for 10th standard'),
      ('SSC Marksheet (10th)', 'ssc_marksheet', 'education', false, false, 'Secondary School Certificate marksheet for 10th standard'),
      ('HSC Certificate (12th)', 'hsc_certificate', 'education', false, false, 'Higher Secondary Certificate for 12th standard'),
      ('HSC Marksheet (12th)', 'hsc_marksheet', 'education', false, false, 'Higher Secondary Certificate marksheet for 12th standard'),
      ('Graduation Consolidated Marksheet', 'graduation_marksheet', 'education', false, false, 'Graduation consolidated marksheet'),
      ('Latest Graduation', 'graduation_certificate', 'education', true, false, 'Latest graduation certificate'),
      ('Post-Graduation Marksheet', 'postgrad_marksheet', 'education', false, false, 'Post-graduation marksheet if applicable'),
      ('Post-Graduation Certificate', 'postgrad_certificate', 'education', false, false, 'Post-graduation certificate if applicable'),
      ('Aadhaar Card', 'aadhaar', 'identity', true, false, 'Aadhaar card for identity verification'),
      ('PAN Card', 'pan', 'identity', true, false, 'Permanent Account Number card for tax purposes'),
      ('Passport', 'passport', 'identity', false, false, 'Passport for identity verification'),
      ('Address Proof', 'address_proof', 'identity', false, false, 'Valid address proof document'),
      ('Educational Certificates', 'educational_certificates', 'education', false, true, 'Relevant educational qualification certificates'),
      ('Professional Certifications', 'professional_certifications', 'employment', false, true, 'Professional certifications and training documents')
      ON CONFLICT (document_name) DO UPDATE SET
        document_type = EXCLUDED.document_type,
        category = EXCLUDED.category,
        is_required = EXCLUDED.is_required,
        allow_multiple = EXCLUDED.allow_multiple,
        description = EXCLUDED.description
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_employee_forms_employee_id ON employee_forms(employee_id);
      CREATE INDEX IF NOT EXISTS idx_employee_forms_status ON employee_forms(status);
      CREATE INDEX IF NOT EXISTS idx_onboarded_employees_user_id ON onboarded_employees(user_id);
      CREATE INDEX IF NOT EXISTS idx_onboarded_employees_status ON onboarded_employees(status);
      CREATE INDEX IF NOT EXISTS idx_employee_master_employee_id ON employee_master(employee_id);
      CREATE INDEX IF NOT EXISTS idx_employee_master_manager_id ON employee_master(manager_id);
      CREATE INDEX IF NOT EXISTS idx_managers_manager_id ON managers(manager_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

      CREATE INDEX IF NOT EXISTS idx_leave_requests_hr_id ON leave_requests(hr_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(from_date, to_date);
      CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON leave_balances(employee_id, year);
      CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
      CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
      CREATE INDEX IF NOT EXISTS idx_employee_master_department_id ON employee_master(department_id);
      CREATE INDEX IF NOT EXISTS idx_leave_types_active ON leave_types(is_active);
      CREATE INDEX IF NOT EXISTS idx_comp_off_balances_employee_year ON comp_off_balances(employee_id, year);
      CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON employee_documents(employee_id);
      CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON employee_documents(document_type);
      CREATE INDEX IF NOT EXISTS idx_employee_documents_category ON employee_documents(document_category);
      CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON expenses(employee_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
      CREATE INDEX IF NOT EXISTS idx_expenses_series ON expenses(series);
      CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
      CREATE INDEX IF NOT EXISTS idx_expenses_hr_id ON expenses(hr_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(expense_category);
      CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_reference);
      CREATE INDEX IF NOT EXISTS idx_expenses_client ON expenses(client_code);
      CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense_id ON expense_attachments(expense_id);
      CREATE INDEX IF NOT EXISTS idx_document_collection_employee_id ON document_collection(employee_id);
      CREATE INDEX IF NOT EXISTS idx_document_collection_status ON document_collection(status);
      CREATE INDEX IF NOT EXISTS idx_document_collection_document_type ON document_collection(document_type);
      CREATE INDEX IF NOT EXISTS idx_document_collection_due_date ON document_collection(due_date);
      CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active);
    `);

    // Insert default HR user if not exists
    const hrExists = await pool.query("SELECT * FROM users WHERE email = $1", [
      "hr@nxzen.com",
    ]);
    if (hrExists.rows.length === 0) {
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("hr123", 10);
      await pool.query(
        "INSERT INTO users (email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5)",
        ["hr@nxzen.com", hashedPassword, "hr", "HR", "Manager"]
      );
      console.log("✅ Default HR user created: hr@nxzen.com / hr123");
    }

    // Insert default managers if not exists
    const managers = [
      {
        id: "MGR001",
        name: "Pradeep",
        email: "strawhatluff124@gmail.com",
        department: "Engineering",
      },
      {
        id: "MGR002",
        name: "Vamshi",
        email: "vamshi@company.com",
        department: "Product",
      },
      {
        id: "MGR003",
        name: "Vinod",
        email: "vinod@company.com",
        department: "Design",
      },
      {
        id: "MGR004",
        name: "Rakesh",
        email: "rakesh@company.com",
        department: "Marketing",
      },
    ];

    for (const manager of managers) {
      const managerExists = await pool.query(
        "SELECT * FROM managers WHERE manager_id = $1",
        [manager.id]
      );
      if (managerExists.rows.length === 0) {
        await pool.query(
          "INSERT INTO managers (manager_id, manager_name, email, department, designation) VALUES ($1, $2, $3, $4, $5)",
          [
            manager.id,
            manager.name,
            manager.email,
            manager.department,
            "Manager",
          ]
        );
        console.log(
          `✅ Default manager created: ${manager.name} (${manager.id})`
        );
      }
    }

    // Company Emails table - To store company email addresses for all users and managers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_emails (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        manager_id VARCHAR(100) REFERENCES managers(manager_id) ON DELETE CASCADE,
        company_email VARCHAR(255) UNIQUE NOT NULL,
        is_primary BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_user_or_manager CHECK (
          (user_id IS NOT NULL AND manager_id IS NULL) OR 
          (user_id IS NULL AND manager_id IS NOT NULL)
        )
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_company_emails_user_id ON company_emails(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_company_emails_manager_id ON company_emails(manager_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_company_emails_email ON company_emails(company_email);
    `);

    // Insert default company emails for existing users and managers
    console.log(
      "🔄 Setting up company emails for existing users and managers..."
    );

    // Insert company emails for users (employees, HR, admin)
    const usersResult = await pool.query(`
      SELECT id, email, role FROM users WHERE role IN ('employee', 'hr', 'admin')
    `);

    for (const user of usersResult.rows) {
      // Check if company email already exists
      const emailExists = await pool.query(
        "SELECT id FROM company_emails WHERE user_id = $1",
        [user.id]
      );

      if (emailExists.rows.length === 0) {
        // Generate company email based on user's current email
        let companyEmail;
        if (user.email.includes("@nxzen.com")) {
          companyEmail = user.email; // Already a company email
        } else {
          // Extract username and create company email
          const username = user.email.split("@")[0];
          companyEmail = `${username}@nxzen.com`;
        }

        await pool.query(
          "INSERT INTO company_emails (user_id, company_email, is_primary, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT (company_email) DO NOTHING",
          [user.id, companyEmail, true, true]
        );
        console.log(
          `✅ Company email created for user ${user.id}: ${companyEmail}`
        );
      }
    }

    // Insert company emails for managers
    const managersResult = await pool.query(`
      SELECT manager_id, manager_name, email FROM managers WHERE status = 'active'
    `);

    for (const manager of managersResult.rows) {
      // Check if company email already exists
      const emailExists = await pool.query(
        "SELECT id FROM company_emails WHERE manager_id = $1",
        [manager.manager_id]
      );

      if (emailExists.rows.length === 0) {
        // Generate company email based on manager's name
        const username = manager.manager_name
          .toLowerCase()
          .replace(/\s+/g, ".");
        const companyEmail = `${username}@nxzen.com`;

        await pool.query(
          "INSERT INTO company_emails (manager_id, company_email, is_primary, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT (manager_id) DO NOTHING",
          [manager.manager_id, companyEmail, true, true]
        );
        console.log(
          `✅ Company email created for manager ${manager.manager_id}: ${companyEmail}`
        );
      }
    }

    // Create function to update document collection status when documents are uploaded
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_document_collection_status()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update document_collection status when employee_documents are inserted/updated
        UPDATE document_collection 
        SET 
          status = 'Received',
          updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = NEW.employee_id
        AND (
          (NEW.document_type = 'resume' AND document_name LIKE '%Resume%')
          OR (NEW.document_type = 'offer_letter' AND document_name LIKE '%Offer%')
          OR (NEW.document_type = 'compensation_letter' AND document_name LIKE '%Compensation%')
          OR (NEW.document_type = 'experience_letter' AND document_name LIKE '%Experience%')
          OR (NEW.document_type = 'payslip' AND document_name LIKE '%Pay%')
          OR (NEW.document_type = 'form16' AND document_name LIKE '%Form 16%')
          OR (NEW.document_type = 'ssc_certificate' AND document_name LIKE '%SSC%Certificate%')
          OR (NEW.document_type = 'ssc_marksheet' AND document_name LIKE '%SSC%Marksheet%')
          OR (NEW.document_type = 'hsc_certificate' AND document_name LIKE '%HSC%Certificate%')
          OR (NEW.document_type = 'hsc_marksheet' AND document_name LIKE '%HSC%Marksheet%')
          OR (NEW.document_type = 'graduation_marksheet' AND document_name LIKE '%Graduation%Marksheet%')
          OR (NEW.document_type = 'graduation_certificate' AND document_name LIKE '%Graduation%Certificate%')
          OR (NEW.document_type = 'postgrad_marksheet' AND document_name LIKE '%Post-Graduation%Marksheet%')
          OR (NEW.document_type = 'postgrad_certificate' AND document_name LIKE '%Post-Graduation%Certificate%')
          OR (NEW.document_type = 'aadhaar' AND document_name LIKE '%Aadhaar%')
          OR (NEW.document_type = 'pan' AND document_name LIKE '%PAN%')
          OR (NEW.document_type = 'passport' AND document_name LIKE '%Passport%')
        );
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger to automatically update document collection status
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_document_collection ON employee_documents;
      CREATE TRIGGER trigger_update_document_collection
      AFTER INSERT OR UPDATE ON employee_documents
      FOR EACH ROW
      EXECUTE FUNCTION update_document_collection_status();
    `);

    // Drop existing function if it exists
    await pool.query(
      `DROP FUNCTION IF EXISTS manually_add_employee(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) CASCADE`
    );

    // Create function to manually add employee with employment type-specific storage
    await pool.query(`
      CREATE OR REPLACE FUNCTION manually_add_employee(
        p_email VARCHAR,
        p_first_name VARCHAR,
        p_last_name VARCHAR,
        p_employment_type VARCHAR,
        p_temp_password VARCHAR
      )
      RETURNS INTEGER AS $$
      DECLARE
        v_user_id INTEGER;
        v_generated_password VARCHAR;
        v_employee_id VARCHAR;
        v_full_name VARCHAR;
      BEGIN
        -- Generate password if not provided
        IF p_temp_password IS NULL OR p_temp_password = '' THEN
          v_generated_password := substr(md5(random()::text), 1, 8);
        ELSE
          v_generated_password := p_temp_password;
        END IF;

        -- Generate employee ID
        v_employee_id := substr(md5(random()::text), 1, 6);
        
        -- Create full name
        v_full_name := p_first_name || ' ' || p_last_name;

        -- Create user
        INSERT INTO users (email, password, role, temp_password, first_name, last_name)
        VALUES (p_email, '', 'employee', v_generated_password, p_first_name, p_last_name)
        RETURNING id INTO v_user_id;

        -- Create initial employee form record with employment type
        INSERT INTO employee_forms (employee_id, type, status)
        VALUES (v_user_id, p_employment_type, 'pending');

        -- Create employee master record
        INSERT INTO employee_master (
          employee_id,
          employee_name,
          company_email,
          type,
          status,
          doj,
          created_at,
          updated_at
        ) VALUES (
          v_employee_id,
          v_full_name,
          p_email,
          p_employment_type,
          'active',
          CURRENT_DATE,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        );

        -- Store in type-specific table based on employment type
        CASE p_employment_type
          WHEN 'Manager' THEN
            INSERT INTO managers (manager_id, manager_name, email, status)
            VALUES (v_employee_id, v_full_name, p_email, 'active');
            
          WHEN 'Intern' THEN
            INSERT INTO interns (intern_id, intern_name, email, status)
            VALUES (v_employee_id, v_full_name, p_email, 'active');
            
          WHEN 'Full-Time' THEN
            INSERT INTO full_time_employees (employee_id, employee_name, email, status)
            VALUES (v_employee_id, v_full_name, p_email, 'active');
            
          WHEN 'Contract' THEN
            INSERT INTO contract_employees (employee_id, employee_name, email, status)
            VALUES (v_employee_id, v_full_name, p_email, 'active');
            
          ELSE
            -- Default to full-time employees table for unknown types
            INSERT INTO full_time_employees (employee_id, employee_name, email, status)
            VALUES (v_employee_id, v_full_name, p_email, 'active');
        END CASE;

        RETURN v_user_id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Attendance settings table for configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default attendance settings
    await pool.query(`
      INSERT INTO attendance_settings (setting_key, setting_value, description) VALUES
      ('working_hours', '8', 'Standard working hours per day'),
      ('check_in_time', '09:00', 'Standard check-in time'),
      ('check_out_time', '18:00', 'Standard check-out time'),
      ('late_threshold_minutes', '15', 'Minutes after check-in time to be considered late'),
      ('early_leave_threshold_minutes', '30', 'Minutes before check-out time to be considered early leave'),
      ('allow_attendance_edit_days', '7', 'Number of days in the past for which attendance can be edited'),
      ('manager_edit_attendance_days', '30', 'Number of days in the past for which managers can edit attendance')
      ON CONFLICT (setting_key) DO NOTHING
    `);

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leave_requests' AND column_name = 'role'
        ) THEN
          ALTER TABLE leave_requests ADD COLUMN role VARCHAR(20) DEFAULT 'employee';
        END IF;
      END $$;
    `);

    console.log("✅ Database tables initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize tables:", error);
    throw error;
  }
};

module.exports = { pool, connectDB };
