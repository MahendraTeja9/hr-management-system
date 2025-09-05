-- Migration: 002_complete_database_setup.sql
-- Description: Complete database setup with all 31 tables
-- Created: 2025-01-09
-- Author: System
-- Version: 2.0

-- =============================================================================
-- COMPLETE DATABASE SCHEMA - ALL TABLES
-- =============================================================================

-- Core authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'hr', 'admin')),
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
);

-- Employee forms and onboarding
CREATE TABLE IF NOT EXISTS employee_forms (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Intern', 'Contract', 'Full-Time', 'Manager')),
    form_data JSONB,
    files TEXT[],
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    draft_data JSONB,
    documents_uploaded JSONB,
    assigned_manager VARCHAR(255),
    manager2_name VARCHAR(255),
    manager3_name VARCHAR(255)
);

-- Employee master table - Final approved employee records
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
    department_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarded employees tracking
CREATE TABLE IF NOT EXISTS onboarded_employees (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Managers table
CREATE TABLE IF NOT EXISTS managers (
    manager_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    manager_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    designation VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    manager_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee specific tables by type
CREATE TABLE IF NOT EXISTS interns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE,
    end_date DATE,
    stipend DECIMAL(10,2),
    mentor_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS full_time_employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    salary DECIMAL(12,2),
    joining_date DATE,
    probation_end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contract_employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    contract_start_date DATE,
    contract_end_date DATE,
    hourly_rate DECIMAL(8,2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document management
CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(50),
    is_required BOOLEAN DEFAULT false,
    allow_multiple BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS document_collection (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    employee_name VARCHAR(255),
    emp_id VARCHAR(100),
    department VARCHAR(100),
    join_date DATE,
    due_date DATE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    uploaded_file_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_category VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    is_required BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance system
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TIME,
    clock_out_time TIME,
    total_hours DECIMAL(4,2),
    status VARCHAR(50) DEFAULT 'present',
    reason TEXT,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_settings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    work_start_time TIME DEFAULT '09:00:00',
    work_end_time TIME DEFAULT '18:00:00',
    break_duration INTEGER DEFAULT 60,
    work_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manager_employee_mapping (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(manager_id, employee_id)
);

-- Leave management
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    max_days_per_year INTEGER DEFAULT 0,
    carry_forward BOOLEAN DEFAULT false,
    is_paid BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id INTEGER REFERENCES leave_types(id) ON DELETE CASCADE,
    total_days DECIMAL(5,2) DEFAULT 0,
    used_days DECIMAL(5,2) DEFAULT 0,
    remaining_days DECIMAL(5,2) DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,1) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    manager_id INTEGER REFERENCES users(id),
    manager2_id INTEGER REFERENCES users(id),
    manager3_id INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_type_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id INTEGER REFERENCES leave_types(id) ON DELETE CASCADE,
    balance DECIMAL(5,2) DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS monthly_leave_accruals (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id INTEGER REFERENCES leave_types(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    accrual_amount DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, leave_type_id, month, year)
);

CREATE TABLE IF NOT EXISTS comp_off_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(5,2) DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, year)
);

-- Expense management
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    max_amount DECIMAL(10,2),
    requires_receipt BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES expense_categories(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
    manager_id INTEGER REFERENCES users(id),
    manager2_id INTEGER REFERENCES users(id),
    manager3_id INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_attachments (
    id SERIAL PRIMARY KEY,
    expense_request_id INTEGER NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications and communications
CREATE TABLE IF NOT EXISTS employee_notifications (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_emails (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email_address VARCHAR(255) UNIQUE NOT NULL,
    is_primary BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(50),
    data_type VARCHAR(20) DEFAULT 'string',
    is_editable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration tracking
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT
);

-- Relations/lookup table
CREATE TABLE IF NOT EXISTS relations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Employee master indexes
CREATE INDEX IF NOT EXISTS idx_employee_master_employee_id ON employee_master(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_master_company_email ON employee_master(company_email);
CREATE INDEX IF NOT EXISTS idx_employee_master_status ON employee_master(status);
CREATE INDEX IF NOT EXISTS idx_employee_master_manager_id ON employee_master(manager_id);
CREATE INDEX IF NOT EXISTS idx_employee_master_department_id ON employee_master(department_id);

-- Employee forms indexes
CREATE INDEX IF NOT EXISTS idx_employee_forms_employee_id ON employee_forms(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_forms_status ON employee_forms(status);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON employee_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_employee_documents_category ON employee_documents(document_category);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);

-- Leave indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON leave_balances(employee_id);

-- Expense indexes
CREATE INDEX IF NOT EXISTS idx_expense_requests_employee_id ON expense_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON expense_requests(status);

-- =============================================================================
-- TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Function to update document collection status
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
    OR (NEW.document_type = 'graduation_certificate' AND (document_name LIKE '%Graduation%Certificate%' OR document_name = 'Latest Graduation'))
    OR (NEW.document_type = 'postgrad_marksheet' AND document_name LIKE '%Post-Graduation%Marksheet%')
    OR (NEW.document_type = 'postgrad_certificate' AND document_name LIKE '%Post-Graduation%Certificate%')
    OR (NEW.document_type = 'aadhaar' AND document_name LIKE '%Aadhaar%')
    OR (NEW.document_type = 'pan' AND document_name LIKE '%PAN%')
    OR (NEW.document_type = 'passport' AND document_name LIKE '%Passport%')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on employee_documents
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_document_collection') THEN
    CREATE TRIGGER trigger_update_document_collection
      AFTER INSERT OR UPDATE ON employee_documents
      FOR EACH ROW EXECUTE FUNCTION update_document_collection_status();
  END IF;
END $$;

-- Function for employee master cleanup on delete
CREATE OR REPLACE FUNCTION trigger_delete_employee_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up related data when employee is deleted from master
  DELETE FROM attendance WHERE employee_id IN (
    SELECT id FROM users WHERE email = OLD.company_email
  );
  DELETE FROM leave_requests WHERE employee_id IN (
    SELECT id FROM users WHERE email = OLD.company_email
  );
  DELETE FROM expense_requests WHERE employee_id IN (
    SELECT id FROM users WHERE email = OLD.company_email
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on employee_master
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_employee_master_delete') THEN
    CREATE TRIGGER trigger_employee_master_delete
      AFTER DELETE ON employee_master
      FOR EACH ROW EXECUTE FUNCTION trigger_delete_employee_data();
  END IF;
END $$;

-- =============================================================================
-- DEFAULT DATA INSERTION
-- =============================================================================

-- Insert default leave types
INSERT INTO leave_types (name, description, max_days_per_year, carry_forward, is_paid) VALUES
('Annual Leave', 'Annual vacation leave', 21, true, true),
('Sick Leave', 'Medical leave', 12, false, true),
('Personal Leave', 'Personal time off', 5, false, true),
('Maternity Leave', 'Maternity leave', 180, false, true),
('Paternity Leave', 'Paternity leave', 15, false, true),
('Emergency Leave', 'Emergency situations', 3, false, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default expense categories
INSERT INTO expense_categories (name, description, max_amount, requires_receipt) VALUES
('Travel', 'Travel expenses', 10000.00, true),
('Meals', 'Business meal expenses', 2000.00, true),
('Office Supplies', 'Office equipment and supplies', 5000.00, true),
('Training', 'Training and certification', 15000.00, true),
('Internet', 'Internet and communication', 3000.00, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default relations
INSERT INTO relations (name) VALUES
('Father'), ('Mother'), ('Spouse'), ('Sibling'), ('Child'), ('Friend'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- Insert system settings
INSERT INTO system_settings (key, value, description, category) VALUES
('company_name', 'NXZEN', 'Company name', 'general'),
('working_hours_per_day', '8', 'Standard working hours per day', 'attendance'),
('week_start_day', 'monday', 'First day of the week', 'attendance'),
('max_leave_days_carry_forward', '5', 'Maximum leave days that can be carried forward', 'leave'),
('expense_approval_limit', '10000', 'Expense amount requiring manager approval', 'expense')
ON CONFLICT (key) DO NOTHING;

-- Log this migration
INSERT INTO migration_log (migration_name, status) VALUES 
('002_complete_database_setup', 'completed')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 002_complete_database_setup completed successfully!';
  RAISE NOTICE 'Created all 31 tables with indexes, triggers, and default data.';
END $$;
