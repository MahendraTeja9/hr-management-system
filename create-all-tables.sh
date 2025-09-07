#!/bin/bash

# HR Management System - Complete Database Table Creation Script
# This script creates all 34 tables required for the HR Management System
# Usage: ./create-all-tables.sh

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="deploy"
DB_USER="postgres"
DB_PASSWORD="shibin"

echo -e "${BLUE}🚀 HR Management System - Database Table Creation${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo -e "${YELLOW}Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}${NC}"
echo -e "${YELLOW}User: ${DB_USER}${NC}"
echo ""

# Function to execute SQL command
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo -e "${BLUE}📋 ${description}${NC}"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Success: ${description}${NC}"
    else
        echo -e "${RED}❌ Failed: ${description}${NC}"
        return 1
    fi
}

# Function to create table
create_table() {
    local table_name="$1"
    local sql="$2"
    
    execute_sql "$sql" "Creating table: $table_name"
}

echo -e "${YELLOW}🔧 Creating all 34 tables...${NC}"
echo ""

# 1. Users table
create_table "users" "
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 2. Employees table
create_table "employees" "
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(255),
    position VARCHAR(255),
    hire_date DATE,
    salary DECIMAL(10,2),
    manager_id INTEGER REFERENCES employees(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 3. Departments table
create_table "departments" "
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    manager_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 4. Employee Master table
create_table "employee_master" "
CREATE TABLE IF NOT EXISTS employee_master (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100) NOT NULL UNIQUE,
    employee_name VARCHAR(255) NOT NULL,
    company_email VARCHAR(255) NOT NULL UNIQUE,
    manager_id VARCHAR(100),
    manager_name VARCHAR(100),
    type VARCHAR(50) NOT NULL,
    role VARCHAR(100),
    doj DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    department VARCHAR(100),
    designation VARCHAR(100),
    salary_band VARCHAR(50),
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    department_id INTEGER,
    manager2_id VARCHAR(100),
    manager2_name VARCHAR(100),
    manager3_id VARCHAR(100),
    manager3_name VARCHAR(100)
);"

# 5. Managers table
create_table "managers" "
CREATE TABLE IF NOT EXISTS managers (
    id SERIAL PRIMARY KEY,
    manager_id VARCHAR(100) NOT NULL UNIQUE,
    manager_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    department VARCHAR(100),
    designation VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER
);"

# 6. Attendance table
create_table "attendance" "
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    break_start_time TIME,
    break_end_time TIME,
    total_hours DECIMAL(4,2),
    status VARCHAR(50) DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);"

# 7. Attendance Settings table
create_table "attendance_settings" "
CREATE TABLE IF NOT EXISTS attendance_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 8. Leave Types table
create_table "leave_types" "
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_days_per_year INTEGER DEFAULT 0,
    carry_forward BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 9. Leave Requests table
create_table "leave_requests" "
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    leave_type_id INTEGER,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 10. Leave Balances table
create_table "leave_balances" "
CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    leave_type_id INTEGER,
    year INTEGER NOT NULL,
    allocated_days INTEGER DEFAULT 0,
    used_days INTEGER DEFAULT 0,
    remaining_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, leave_type_id, year)
);"

# 11. Leave Type Balances table
create_table "leave_type_balances" "
CREATE TABLE IF NOT EXISTS leave_type_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    leave_type VARCHAR(100) NOT NULL,
    total_allocated DECIMAL(5,2) DEFAULT 0,
    used_balance DECIMAL(5,2) DEFAULT 0,
    remaining_balance DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, year, leave_type)
);"

# 12. Documents table
create_table "documents" "
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    document_type VARCHAR(255) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(255),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    notes TEXT
);"

# 13. Employee Documents table
create_table "employee_documents" "
CREATE TABLE IF NOT EXISTS employee_documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_category VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    is_required BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 14. Document Collection table
create_table "document_collection" "
CREATE TABLE IF NOT EXISTS document_collection (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    emp_id VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    join_date DATE NOT NULL,
    due_date DATE NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) DEFAULT 'Required' NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    notes TEXT,
    uploaded_file_url VARCHAR(500),
    uploaded_file_name VARCHAR(255),
    uploaded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 15. Document Templates table
create_table "document_templates" "
CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) DEFAULT 'Required' NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(50),
    is_required BOOLEAN DEFAULT false,
    allow_multiple BOOLEAN DEFAULT false
);"

# 16. Expenses table
create_table "expenses" "
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    expense_type VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    receipt_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 17. Expense Categories table
create_table "expense_categories" "
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 18. Expense Requests table
create_table "expense_requests" "
CREATE TABLE IF NOT EXISTS expense_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    category_id INTEGER,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    receipt_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 19. Expense Attachments table
create_table "expense_attachments" "
CREATE TABLE IF NOT EXISTS expense_attachments (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 20. Onboarding Tasks table
create_table "onboarding_tasks" "
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INTEGER,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 21. Onboarded Employees table
create_table "onboarded_employees" "
CREATE TABLE IF NOT EXISTS onboarded_employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    employee_id VARCHAR(100),
    company_email VARCHAR(255),
    manager_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    assigned_by INTEGER,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 22. HR Settings table
create_table "hr_settings" "
CREATE TABLE IF NOT EXISTS hr_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 23. System Settings table
create_table "system_settings" "
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    total_annual_leaves INTEGER DEFAULT 27,
    allow_half_day BOOLEAN DEFAULT true,
    approval_workflow VARCHAR(50) DEFAULT 'manager_then_hr',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 24. Company Emails table
create_table "company_emails" "
CREATE TABLE IF NOT EXISTS company_emails (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    manager_id VARCHAR(100),
    company_email VARCHAR(255) NOT NULL UNIQUE,
    is_primary BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 25. Comp Off Balances table
create_table "comp_off_balances" "
CREATE TABLE IF NOT EXISTS comp_off_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_earned DECIMAL(5,1) DEFAULT 0,
    comp_off_taken DECIMAL(5,1) DEFAULT 0,
    comp_off_remaining DECIMAL(5,1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 26. Contract Employees table
create_table "contract_employees" "
CREATE TABLE IF NOT EXISTS contract_employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    designation VARCHAR(100),
    contract_start_date DATE,
    contract_end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 27. Full Time Employees table
create_table "full_time_employees" "
CREATE TABLE IF NOT EXISTS full_time_employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    designation VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 28. Interns table
create_table "interns" "
CREATE TABLE IF NOT EXISTS interns (
    id SERIAL PRIMARY KEY,
    intern_id VARCHAR(100) NOT NULL,
    intern_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    designation VARCHAR(100),
    internship_start_date DATE,
    internship_end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 29. Employee Forms table
create_table "employee_forms" "
CREATE TABLE IF NOT EXISTS employee_forms (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    type VARCHAR(50),
    form_data JSONB,
    files TEXT[],
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 30. Employee Notifications table
create_table "employee_notifications" "
CREATE TABLE IF NOT EXISTS employee_notifications (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 31. Manager Employee Mapping table
create_table "manager_employee_mapping" "
CREATE TABLE IF NOT EXISTS manager_employee_mapping (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER,
    employee_id INTEGER,
    mapping_type VARCHAR(50) DEFAULT 'primary',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# 32. Monthly Leave Accruals table
create_table "monthly_leave_accruals" "
CREATE TABLE IF NOT EXISTS monthly_leave_accruals (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    earned_leave_accrued DECIMAL(3,2) DEFAULT 0,
    sick_leave_accrued DECIMAL(3,2) DEFAULT 0,
    casual_leave_accrued DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, year, month)
);"

# 33. Migration Log table
create_table "migration_log" "
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'completed'
);"

# 34. Migrations table
create_table "migrations" "
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    id_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

echo ""
echo -e "${YELLOW}📊 Inserting default data...${NC}"

# Insert default system settings
execute_sql "
INSERT INTO system_settings (total_annual_leaves, allow_half_day, approval_workflow)
SELECT 27, true, 'manager_then_hr'
WHERE NOT EXISTS (SELECT 1 FROM system_settings);
" "Inserting default system settings"

# Insert default expense categories
execute_sql "
INSERT INTO expense_categories (name, description) VALUES
('Travel', 'Travel related expenses'),
('Meals', 'Meals related expenses'),
('Office Supplies', 'Office Supplies related expenses'),
('Training', 'Training related expenses'),
('Software/Tools', 'Software/Tools related expenses'),
('Communication', 'Communication related expenses'),
('Other', 'Other related expenses')
ON CONFLICT (name) DO NOTHING;
" "Inserting default expense categories"

# Insert default departments
execute_sql "
INSERT INTO departments (name, code, description) VALUES
('Engineering', 'ENG', 'Software development and technical teams'),
('Product', 'PRD', 'Product management and strategy'),
('Design', 'DSN', 'UI/UX and graphic design'),
('Marketing', 'MKT', 'Marketing and communications'),
('Human Resources', 'HR', 'HR and administrative functions'),
('Finance', 'FIN', 'Finance and accounting'),
('Operations', 'OPS', 'Operations and support')
ON CONFLICT (name) DO NOTHING;
" "Inserting default departments"

# Insert default leave types
execute_sql "
INSERT INTO leave_types (name, description, max_days_per_year) VALUES
('Annual Leave', 'Yearly vacation leave', 21),
('Sick Leave', 'Medical leave', 10),
('Personal Leave', 'Personal time off', 5),
('Maternity Leave', 'Maternity leave', 90),
('Paternity Leave', 'Paternity leave', 14)
ON CONFLICT (name) DO NOTHING;
" "Inserting default leave types"

# Record migration
execute_sql "
INSERT INTO migration_log (migration_name, status)
VALUES ('create_all_tables_shell_script', 'completed')
ON CONFLICT DO NOTHING;
" "Recording migration completion"

echo ""
echo -e "${GREEN}🎉 SUCCESS: All 34 tables created successfully!${NC}"
echo -e "${GREEN}📊 Database is ready for HR Management System${NC}"
echo ""
echo -e "${BLUE}📋 Tables created:${NC}"
echo -e "${YELLOW}   Core: users, employees, employee_master, managers, departments${NC}"
echo -e "${YELLOW}   Attendance: attendance, attendance_settings${NC}"
echo -e "${YELLOW}   Leave: leave_types, leave_requests, leave_balances, leave_type_balances, monthly_leave_accruals, comp_off_balances${NC}"
echo -e "${YELLOW}   Documents: documents, employee_documents, document_collection, document_templates${NC}"
echo -e "${YELLOW}   Expenses: expenses, expense_categories, expense_requests, expense_attachments${NC}"
echo -e "${YELLOW}   Employee Types: full_time_employees, contract_employees, interns${NC}"
echo -e "${YELLOW}   Onboarding: onboarded_employees, onboarding_tasks${NC}"
echo -e "${YELLOW}   Communication: employee_notifications, employee_forms, company_emails${NC}"
echo -e "${YELLOW}   Management: manager_employee_mapping${NC}"
echo -e "${YELLOW}   System: hr_settings, system_settings, migration_log, migrations${NC}"
echo ""
echo -e "${GREEN}✅ Setup complete! Your HR Management System database is ready.${NC}"