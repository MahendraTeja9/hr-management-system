-- Migration: 001_initial_attendance_setup.sql
-- Description: Complete initial setup for attendance and employee management system
-- Created: 2025-01-09
-- Author: System
-- Version: 1.0

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table - Core user authentication and basic info
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

-- Employee forms table - Form submissions and document management
CREATE TABLE IF NOT EXISTS employee_forms (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Intern', 'Contract', 'Full-Time', 'Manager')),
    form_data JSONB,
    files TEXT[],
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP,
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

-- Onboarded employees table - Intermediate approval stage
CREATE TABLE IF NOT EXISTS onboarded_employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    employee_id VARCHAR(100),
    company_email VARCHAR(255),
    manager_id VARCHAR(100),
    manager_name VARCHAR(100),
    employee_type VARCHAR(50) DEFAULT 'Full-Time',
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending_assignment' CHECK (status IN ('pending_assignment', 'assigned', 'completed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee master table - Final employee records
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
    type VARCHAR(50) NOT NULL CHECK (type IN ('Intern', 'Contract', 'Full-Time', 'Manager')),
    role VARCHAR(100),
    doj DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    department VARCHAR(100),
    designation VARCHAR(100),
    salary_band VARCHAR(50),
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Managers table - Manager information
CREATE TABLE IF NOT EXISTS managers (
    id SERIAL PRIMARY KEY,
    manager_id VARCHAR(100) UNIQUE NOT NULL,
    manager_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    designation VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ATTENDANCE SYSTEM TABLES
-- =============================================================================

-- Manager-Employee Mapping table for attendance management
CREATE TABLE IF NOT EXISTS manager_employee_mapping (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mapping_type VARCHAR(50) DEFAULT 'primary' CHECK (mapping_type IN ('primary', 'secondary', 'tertiary')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(manager_id, employee_id, mapping_type)
);

-- Attendance table for daily attendance records
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'wfh', 'leave', 'half_day', 'holiday')),
    check_in_time TIME,
    check_out_time TIME,
    clock_in_time TIME,
    clock_out_time TIME,
    total_hours DECIMAL(4,2),
    notes TEXT,
    reason TEXT,
    marked_by INTEGER REFERENCES users(id),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- Attendance settings table for configuration
CREATE TABLE IF NOT EXISTS attendance_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- LEAVE MANAGEMENT TABLES
-- =============================================================================

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('casual', 'sick', 'annual', 'maternity', 'paternity', 'comp_off')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_leave_days INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending_manager_approval' CHECK (status IN ('pending_manager_approval', 'pending_hr_approval', 'approved', 'rejected')),
    manager_id INTEGER REFERENCES users(id),
    manager_approved_at TIMESTAMP,
    manager_comments TEXT,
    hr_id INTEGER REFERENCES users(id),
    hr_approved_at TIMESTAMP,
    hr_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_notes TEXT
);

-- Leave balances table
CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('casual', 'sick', 'annual', 'maternity', 'paternity', 'comp_off')),
    total_allocated INTEGER DEFAULT 0,
    leaves_taken INTEGER DEFAULT 0,
    leaves_remaining INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, year, leave_type)
);

-- =============================================================================
-- EXPENSE MANAGEMENT TABLES
-- =============================================================================

-- Expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense requests table
CREATE TABLE IF NOT EXISTS expense_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES expense_categories(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- DOCUMENT MANAGEMENT TABLES
-- =============================================================================

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    uploaded_by INTEGER REFERENCES users(id),
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SYSTEM CONFIGURATION TABLES
-- =============================================================================

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    manager_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, setting_key)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_employee_forms_employee_id ON employee_forms(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_forms_status ON employee_forms(status);
CREATE INDEX IF NOT EXISTS idx_employee_master_company_email ON employee_master(company_email);
CREATE INDEX IF NOT EXISTS idx_employee_master_status ON employee_master(status);

-- Attendance system indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_manager_employee_mapping_manager ON manager_employee_mapping(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_employee_mapping_employee ON manager_employee_mapping(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_employee_mapping_active ON manager_employee_mapping(is_active);

-- Leave management indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON leave_balances(employee_id, year);

-- Expense management indexes
CREATE INDEX IF NOT EXISTS idx_expense_requests_employee_id ON expense_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON expense_requests(status);
CREATE INDEX IF NOT EXISTS idx_expense_requests_date ON expense_requests(expense_date);

-- Document management indexes
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

-- =============================================================================
-- DEFAULT DATA INSERTION
-- =============================================================================

-- Insert default attendance settings
INSERT INTO attendance_settings (setting_key, setting_value, description) VALUES
('allow_edit_past_days', 'true', 'Allow employees to edit attendance for past days'),
('max_edit_days', '7', 'Maximum number of days in the past that can be edited'),
('require_check_in_time', 'false', 'Require check-in time when marking attendance'),
('require_check_out_time', 'false', 'Require check-out time when marking attendance'),
('default_work_hours', '8', 'Default work hours per day'),
('week_start_day', 'monday', 'First day of the work week'),
('timezone', 'UTC', 'Default timezone for attendance records'),
('auto_approve_attendance', 'true', 'Automatically approve attendance submissions'),
('notification_enabled', 'true', 'Enable attendance notifications'),
('late_threshold_minutes', '15', 'Minutes after which attendance is marked as late')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default expense categories
INSERT INTO expense_categories (name, description) VALUES
('Travel', 'Travel and transportation expenses'),
('Meals', 'Business meal expenses'),
('Office Supplies', 'Office supplies and equipment'),
('Training', 'Training and development expenses'),
('Communication', 'Phone and internet expenses'),
('Others', 'Miscellaneous expenses')
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings (only if system_settings table has category column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'category') THEN
        INSERT INTO system_settings (category, setting_key, setting_value, description) VALUES
        ('company', 'name', 'NXZEN Technologies', 'Company name'),
        ('company', 'address', 'Your Company Address', 'Company address'),
        ('company', 'email', 'hr@nxzen.com', 'Company email'),
        ('leave', 'casual_leave_per_year', '12', 'Annual casual leave allocation'),
        ('leave', 'sick_leave_per_year', '12', 'Annual sick leave allocation'),
        ('leave', 'annual_leave_per_year', '21', 'Annual leave allocation'),
        ('attendance', 'office_start_time', '09:00', 'Office start time'),
        ('attendance', 'office_end_time', '18:00', 'Office end time'),
        ('expense', 'max_amount_without_approval', '5000', 'Maximum expense amount without approval')
        ON CONFLICT (category, setting_key) DO NOTHING;
    END IF;
END $$;

-- =============================================================================
-- FUNCTIONS AND STORED PROCEDURES
-- =============================================================================

-- Drop existing function to prevent parameter conflicts
DROP FUNCTION IF EXISTS manually_add_employee(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) CASCADE;

-- Function to manually add employee with employment type
CREATE OR REPLACE FUNCTION manually_add_employee(
    p_email VARCHAR,
    p_first_name VARCHAR,
    p_last_name VARCHAR,
    p_role VARCHAR,
    p_employment_type VARCHAR
) RETURNS INTEGER AS $$
DECLARE
    user_id INTEGER;
    employee_id_val VARCHAR;
BEGIN
    -- Insert into users table
    INSERT INTO users (email, first_name, last_name, role, password)
    VALUES (p_email, p_first_name, p_last_name, p_role, '$2b$10$defaulthash')
    RETURNING id INTO user_id;
    
    -- Generate employee ID
    employee_id_val := 'EMP' || LPAD(user_id::TEXT, 6, '0');
    
    -- Insert into employee_forms table with employment type
    INSERT INTO employee_forms (employee_id, type, status)
    VALUES (user_id, p_employment_type, 'pending');
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get attendance statistics
CREATE OR REPLACE FUNCTION get_attendance_stats(
    p_employee_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE(
    total_days INTEGER,
    present_days INTEGER,
    wfh_days INTEGER,
    leave_days INTEGER,
    absent_days INTEGER,
    half_day_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_days,
        COUNT(CASE WHEN status = 'present' THEN 1 END)::INTEGER as present_days,
        COUNT(CASE WHEN status = 'wfh' THEN 1 END)::INTEGER as wfh_days,
        COUNT(CASE WHEN status = 'leave' THEN 1 END)::INTEGER as leave_days,
        COUNT(CASE WHEN status = 'absent' THEN 1 END)::INTEGER as absent_days,
        COUNT(CASE WHEN status = 'half_day' THEN 1 END)::INTEGER as half_day_days
    FROM attendance 
    WHERE employee_id = p_employee_id 
        AND date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate leave balance
CREATE OR REPLACE FUNCTION update_leave_balance(
    p_employee_id INTEGER,
    p_year INTEGER,
    p_leave_type VARCHAR
) RETURNS VOID AS $$
DECLARE
    total_allocated INTEGER;
    leaves_taken INTEGER;
BEGIN
    -- Get total allocated leaves based on leave type
    SELECT 
        CASE 
            WHEN p_leave_type = 'casual' THEN 12
            WHEN p_leave_type = 'sick' THEN 12
            WHEN p_leave_type = 'annual' THEN 21
            ELSE 0
        END INTO total_allocated;
    
    -- Calculate leaves taken
    SELECT COALESCE(SUM(total_leave_days), 0) INTO leaves_taken
    FROM leave_requests 
    WHERE employee_id = p_employee_id 
        AND leave_type = p_leave_type
        AND EXTRACT(YEAR FROM from_date) = p_year
        AND status = 'approved';
    
    -- Insert or update leave balance
    INSERT INTO leave_balances (employee_id, year, leave_type, total_allocated, leaves_taken, leaves_remaining)
    VALUES (p_employee_id, p_year, p_leave_type, total_allocated, leaves_taken, total_allocated - leaves_taken)
    ON CONFLICT (employee_id, year, leave_type) 
    DO UPDATE SET 
        total_allocated = EXCLUDED.total_allocated,
        leaves_taken = EXCLUDED.leaves_taken,
        leaves_remaining = EXCLUDED.leaves_remaining,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS FOR REPORTING
-- =============================================================================

-- Attendance summary view
CREATE OR REPLACE VIEW attendance_summary AS
SELECT 
    u.id as employee_id,
    u.first_name,
    u.last_name,
    u.email,
    em.employee_id as emp_id,
    em.department,
    em.designation,
    a.date,
    a.status,
    a.clock_in_time,
    a.clock_out_time,
    a.reason,
    a.updated_at
FROM attendance a
JOIN users u ON a.employee_id = u.id
LEFT JOIN employee_master em ON u.email = em.company_email
ORDER BY a.date DESC, u.first_name, u.last_name;

-- Employee details view
CREATE OR REPLACE VIEW employee_details AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    em.employee_id,
    em.company_email,
    em.department,
    em.designation,
    em.manager_name,
    em.status,
    em.doj,
    em.type as employment_type
FROM users u
LEFT JOIN employee_master em ON u.email = em.company_email
WHERE u.role IN ('employee', 'manager');

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Trigger to update leave balance when leave request is approved
CREATE OR REPLACE FUNCTION trigger_update_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        PERFORM update_leave_balance(NEW.employee_id, EXTRACT(YEAR FROM NEW.from_date)::INTEGER, NEW.leave_type);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'leave_balance_update_trigger') THEN
        CREATE TRIGGER leave_balance_update_trigger
            AFTER UPDATE ON leave_requests
            FOR EACH ROW
            EXECUTE FUNCTION trigger_update_leave_balance();
    END IF;
END $$;

-- =============================================================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE users IS 'Core user authentication and profile information';
COMMENT ON TABLE employee_forms IS 'Employee onboarding forms and document submissions';
COMMENT ON TABLE onboarded_employees IS 'Intermediate stage for employee approval process';
COMMENT ON TABLE employee_master IS 'Final approved employee records';
COMMENT ON TABLE managers IS 'Manager information and hierarchy';
COMMENT ON TABLE manager_employee_mapping IS 'Mapping between managers and their team members';
COMMENT ON TABLE attendance IS 'Daily attendance records for employees';
COMMENT ON TABLE attendance_settings IS 'Configuration settings for attendance system';
COMMENT ON TABLE leave_requests IS 'Employee leave requests and approvals';
COMMENT ON TABLE leave_balances IS 'Employee leave balance tracking';
COMMENT ON TABLE expense_requests IS 'Employee expense claims and reimbursements';
COMMENT ON TABLE expense_categories IS 'Categories for expense classification';
COMMENT ON TABLE documents IS 'Employee document uploads and management';
COMMENT ON TABLE departments IS 'Company departments and organizational structure';
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';

COMMENT ON FUNCTION manually_add_employee IS 'Manually add an employee with specified employment type';
COMMENT ON FUNCTION get_attendance_stats IS 'Get attendance statistics for an employee within a date range';
COMMENT ON FUNCTION update_leave_balance IS 'Update leave balance for an employee for a specific year and leave type';

-- =============================================================================
-- MIGRATION COMPLETION
-- =============================================================================

-- Verify critical tables exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
        AND table_name IN ('users', 'employee_master', 'attendance', 'leave_requests', 'managers');
    
    IF table_count = 5 THEN
        RAISE NOTICE 'Migration completed successfully - all critical tables created';
    ELSE
        RAISE EXCEPTION 'Migration failed - not all critical tables were created';
    END IF;
END $$;

-- Log migration completion
SELECT 'Migration 001_initial_attendance_setup completed successfully at ' || CURRENT_TIMESTAMP as migration_status;