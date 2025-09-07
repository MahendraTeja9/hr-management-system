@echo off
REM HR Management System - Complete Database Table Creation Script (Windows)
REM This script creates all 34 tables required for the HR Management System
REM Usage: create-all-tables.bat

setlocal enabledelayedexpansion

REM Database configuration
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=deploy
set DB_USER=postgres
set DB_PASSWORD=shibin

echo.
echo ==========================================
echo  HR Management System - Database Setup
echo ==========================================
echo.
echo Database: %DB_NAME%@%DB_HOST%:%DB_PORT%
echo User: %DB_USER%
echo.
echo Creating all 34 tables...
echo.

REM Set PostgreSQL password environment variable
set PGPASSWORD=%DB_PASSWORD%

REM Function to execute SQL (using labels as functions)
goto :create_tables

:execute_sql
set "sql=%~1"
set "description=%~2"
echo [INFO] %description%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "%sql%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] %description%
) else (
    echo [ERROR] Failed: %description%
)
goto :eof

:create_tables

REM 1. Users table
call :execute_sql "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL DEFAULT 'employee', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: users"

REM 2. Employees table
call :execute_sql "CREATE TABLE IF NOT EXISTS employees (id SERIAL PRIMARY KEY, employee_id VARCHAR(50) UNIQUE NOT NULL, user_id INTEGER, first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, phone VARCHAR(20), department VARCHAR(255), position VARCHAR(255), hire_date DATE, salary DECIMAL(10,2), manager_id INTEGER, status VARCHAR(50) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: employees"

REM 3. Departments table
call :execute_sql "CREATE TABLE IF NOT EXISTS departments (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, code VARCHAR(20) NOT NULL UNIQUE, description TEXT, manager_id INTEGER, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: departments"

REM 4. Employee Master table
call :execute_sql "CREATE TABLE IF NOT EXISTS employee_master (id SERIAL PRIMARY KEY, employee_id VARCHAR(100) NOT NULL UNIQUE, employee_name VARCHAR(255) NOT NULL, company_email VARCHAR(255) NOT NULL UNIQUE, manager_id VARCHAR(100), manager_name VARCHAR(100), type VARCHAR(50) NOT NULL, role VARCHAR(100), doj DATE NOT NULL, status VARCHAR(50) DEFAULT 'active', department VARCHAR(100), designation VARCHAR(100), salary_band VARCHAR(50), location VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, department_id INTEGER, manager2_id VARCHAR(100), manager2_name VARCHAR(100), manager3_id VARCHAR(100), manager3_name VARCHAR(100));" "Creating table: employee_master"

REM 5. Managers table
call :execute_sql "CREATE TABLE IF NOT EXISTS managers (id SERIAL PRIMARY KEY, manager_id VARCHAR(100) NOT NULL UNIQUE, manager_name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE, department VARCHAR(100), designation VARCHAR(100), status VARCHAR(50) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, user_id INTEGER);" "Creating table: managers"

REM 6. Attendance table
call :execute_sql "CREATE TABLE IF NOT EXISTS attendance (id SERIAL PRIMARY KEY, employee_id INTEGER, date DATE NOT NULL, check_in_time TIME, check_out_time TIME, break_start_time TIME, break_end_time TIME, total_hours DECIMAL(4,2), status VARCHAR(50) DEFAULT 'present', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(employee_id, date));" "Creating table: attendance"

REM 7. Attendance Settings table
call :execute_sql "CREATE TABLE IF NOT EXISTS attendance_settings (id SERIAL PRIMARY KEY, setting_key VARCHAR(100) NOT NULL UNIQUE, setting_value TEXT, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: attendance_settings"

REM 8. Leave Types table
call :execute_sql "CREATE TABLE IF NOT EXISTS leave_types (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, max_days_per_year INTEGER DEFAULT 0, carry_forward BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: leave_types"

REM 9. Leave Requests table
call :execute_sql "CREATE TABLE IF NOT EXISTS leave_requests (id SERIAL PRIMARY KEY, employee_id INTEGER, leave_type_id INTEGER, start_date DATE NOT NULL, end_date DATE NOT NULL, days_requested INTEGER NOT NULL, reason TEXT, status VARCHAR(50) DEFAULT 'pending', approved_by INTEGER, approved_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: leave_requests"

REM 10. Leave Balances table
call :execute_sql "CREATE TABLE IF NOT EXISTS leave_balances (id SERIAL PRIMARY KEY, employee_id INTEGER, leave_type_id INTEGER, year INTEGER NOT NULL, allocated_days INTEGER DEFAULT 0, used_days INTEGER DEFAULT 0, remaining_days INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(employee_id, leave_type_id, year));" "Creating table: leave_balances"

REM 11. Leave Type Balances table
call :execute_sql "CREATE TABLE IF NOT EXISTS leave_type_balances (id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL, year INTEGER NOT NULL, leave_type VARCHAR(100) NOT NULL, total_allocated DECIMAL(5,2) DEFAULT 0, used_balance DECIMAL(5,2) DEFAULT 0, remaining_balance DECIMAL(5,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE (employee_id, year, leave_type));" "Creating table: leave_type_balances"

REM 12. Documents table
call :execute_sql "CREATE TABLE IF NOT EXISTS documents (id SERIAL PRIMARY KEY, employee_id INTEGER, document_type VARCHAR(255) NOT NULL, document_name VARCHAR(255) NOT NULL, file_path VARCHAR(500), file_size INTEGER, mime_type VARCHAR(255), upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, status VARCHAR(50) DEFAULT 'pending', reviewed_by INTEGER, reviewed_at TIMESTAMP, notes TEXT);" "Creating table: documents"

REM 13. Employee Documents table
call :execute_sql "CREATE TABLE IF NOT EXISTS employee_documents (id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL, document_type VARCHAR(100) NOT NULL, document_category VARCHAR(50) NOT NULL, file_name VARCHAR(255) NOT NULL, file_url VARCHAR(500) NOT NULL, file_size INTEGER, mime_type VARCHAR(100), is_required BOOLEAN DEFAULT false, uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: employee_documents"

REM 14. Document Collection table
call :execute_sql "CREATE TABLE IF NOT EXISTS document_collection (id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL, employee_name VARCHAR(255) NOT NULL, emp_id VARCHAR(100) NOT NULL, department VARCHAR(100), join_date DATE NOT NULL, due_date DATE NOT NULL, document_name VARCHAR(255) NOT NULL, document_type VARCHAR(50) DEFAULT 'Required' NOT NULL, status VARCHAR(50) DEFAULT 'Pending', notes TEXT, uploaded_file_url VARCHAR(500), uploaded_file_name VARCHAR(255), uploaded_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: document_collection"

REM 15. Document Templates table
call :execute_sql "CREATE TABLE IF NOT EXISTS document_templates (id SERIAL PRIMARY KEY, document_name VARCHAR(255) NOT NULL, document_type VARCHAR(50) DEFAULT 'Required' NOT NULL, description TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, category VARCHAR(50), is_required BOOLEAN DEFAULT false, allow_multiple BOOLEAN DEFAULT false);" "Creating table: document_templates"

REM 16. Expenses table
call :execute_sql "CREATE TABLE IF NOT EXISTS expenses (id SERIAL PRIMARY KEY, employee_id INTEGER, expense_type VARCHAR(255) NOT NULL, amount DECIMAL(10,2) NOT NULL, description TEXT, expense_date DATE NOT NULL, receipt_path VARCHAR(500), status VARCHAR(50) DEFAULT 'pending', approved_by INTEGER, approved_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: expenses"

REM 17. Expense Categories table
call :execute_sql "CREATE TABLE IF NOT EXISTS expense_categories (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, description TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: expense_categories"

REM 18. Expense Requests table
call :execute_sql "CREATE TABLE IF NOT EXISTS expense_requests (id SERIAL PRIMARY KEY, employee_id INTEGER, category_id INTEGER, amount DECIMAL(10,2) NOT NULL, description TEXT, expense_date DATE NOT NULL, receipt_url VARCHAR(500), status VARCHAR(50) DEFAULT 'pending', approved_by INTEGER, approved_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: expense_requests"

REM 19. Expense Attachments table
call :execute_sql "CREATE TABLE IF NOT EXISTS expense_attachments (id SERIAL PRIMARY KEY, expense_id INTEGER NOT NULL, file_name VARCHAR(255) NOT NULL, file_url VARCHAR(500) NOT NULL, file_size INTEGER, mime_type VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: expense_attachments"

REM 20. Onboarding Tasks table
call :execute_sql "CREATE TABLE IF NOT EXISTS onboarding_tasks (id SERIAL PRIMARY KEY, employee_id INTEGER, task_name VARCHAR(255) NOT NULL, description TEXT, assigned_to INTEGER, due_date DATE, status VARCHAR(50) DEFAULT 'pending', completed_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: onboarding_tasks"

REM 21. Onboarded Employees table
call :execute_sql "CREATE TABLE IF NOT EXISTS onboarded_employees (id SERIAL PRIMARY KEY, user_id INTEGER, employee_id VARCHAR(100), company_email VARCHAR(255), manager_id VARCHAR(100), status VARCHAR(50) DEFAULT 'pending', assigned_by INTEGER, assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: onboarded_employees"

REM 22. HR Settings table
call :execute_sql "CREATE TABLE IF NOT EXISTS hr_settings (id SERIAL PRIMARY KEY, setting_key VARCHAR(255) UNIQUE NOT NULL, setting_value TEXT, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: hr_settings"

REM 23. System Settings table
call :execute_sql "CREATE TABLE IF NOT EXISTS system_settings (id SERIAL PRIMARY KEY, total_annual_leaves INTEGER DEFAULT 27, allow_half_day BOOLEAN DEFAULT true, approval_workflow VARCHAR(50) DEFAULT 'manager_then_hr', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: system_settings"

REM 24. Company Emails table
call :execute_sql "CREATE TABLE IF NOT EXISTS company_emails (id SERIAL PRIMARY KEY, user_id INTEGER, manager_id VARCHAR(100), company_email VARCHAR(255) NOT NULL UNIQUE, is_primary BOOLEAN DEFAULT true, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: company_emails"

REM 25. Comp Off Balances table
call :execute_sql "CREATE TABLE IF NOT EXISTS comp_off_balances (id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL, year INTEGER NOT NULL, total_earned DECIMAL(5,1) DEFAULT 0, comp_off_taken DECIMAL(5,1) DEFAULT 0, comp_off_remaining DECIMAL(5,1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: comp_off_balances"

REM 26. Contract Employees table
call :execute_sql "CREATE TABLE IF NOT EXISTS contract_employees (id SERIAL PRIMARY KEY, employee_id VARCHAR(100) NOT NULL, employee_name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, department VARCHAR(100), designation VARCHAR(100), contract_start_date DATE, contract_end_date DATE, status VARCHAR(50) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: contract_employees"

REM 27. Full Time Employees table
call :execute_sql "CREATE TABLE IF NOT EXISTS full_time_employees (id SERIAL PRIMARY KEY, employee_id VARCHAR(100) NOT NULL, employee_name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, department VARCHAR(100), designation VARCHAR(100), status VARCHAR(50) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: full_time_employees"

REM 28. Interns table
call :execute_sql "CREATE TABLE IF NOT EXISTS interns (id SERIAL PRIMARY KEY, intern_id VARCHAR(100) NOT NULL, intern_name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, department VARCHAR(100), designation VARCHAR(100), internship_start_date DATE, internship_end_date DATE, status VARCHAR(50) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: interns"

REM 29. Employee Forms table
call :execute_sql "CREATE TABLE IF NOT EXISTS employee_forms (id SERIAL PRIMARY KEY, employee_id INTEGER, type VARCHAR(50), form_data JSONB, files TEXT[], status VARCHAR(50) DEFAULT 'pending', reviewed_by INTEGER, reviewed_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: employee_forms"

REM 30. Employee Notifications table
call :execute_sql "CREATE TABLE IF NOT EXISTS employee_notifications (id SERIAL PRIMARY KEY, employee_id INTEGER, notification_type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT, is_read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: employee_notifications"

REM 31. Manager Employee Mapping table
call :execute_sql "CREATE TABLE IF NOT EXISTS manager_employee_mapping (id SERIAL PRIMARY KEY, manager_id INTEGER, employee_id INTEGER, mapping_type VARCHAR(50) DEFAULT 'primary', is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: manager_employee_mapping"

REM 32. Monthly Leave Accruals table
call :execute_sql "CREATE TABLE IF NOT EXISTS monthly_leave_accruals (id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, earned_leave_accrued DECIMAL(3,2) DEFAULT 0, sick_leave_accrued DECIMAL(3,2) DEFAULT 0, casual_leave_accrued DECIMAL(3,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE (employee_id, year, month));" "Creating table: monthly_leave_accruals"

REM 33. Migration Log table
call :execute_sql "CREATE TABLE IF NOT EXISTS migration_log (id SERIAL PRIMARY KEY, migration_name VARCHAR(255) NOT NULL, executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, status VARCHAR(50) DEFAULT 'completed');" "Creating table: migration_log"

REM 34. Migrations table
call :execute_sql "CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, id_name VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, description TEXT, executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" "Creating table: migrations"

echo.
echo Inserting default data...
echo.

REM Insert default system settings
call :execute_sql "INSERT INTO system_settings (total_annual_leaves, allow_half_day, approval_workflow) SELECT 27, true, 'manager_then_hr' WHERE NOT EXISTS (SELECT 1 FROM system_settings);" "Inserting default system settings"

REM Insert default expense categories
call :execute_sql "INSERT INTO expense_categories (name, description) VALUES ('Travel', 'Travel related expenses'), ('Meals', 'Meals related expenses'), ('Office Supplies', 'Office Supplies related expenses'), ('Training', 'Training related expenses'), ('Software/Tools', 'Software/Tools related expenses'), ('Communication', 'Communication related expenses'), ('Other', 'Other related expenses') ON CONFLICT (name) DO NOTHING;" "Inserting default expense categories"

REM Insert default departments
call :execute_sql "INSERT INTO departments (name, code, description) VALUES ('Engineering', 'ENG', 'Software development and technical teams'), ('Product', 'PRD', 'Product management and strategy'), ('Design', 'DSN', 'UI/UX and graphic design'), ('Marketing', 'MKT', 'Marketing and communications'), ('Human Resources', 'HR', 'HR and administrative functions'), ('Finance', 'FIN', 'Finance and accounting'), ('Operations', 'OPS', 'Operations and support') ON CONFLICT (name) DO NOTHING;" "Inserting default departments"

REM Insert default leave types
call :execute_sql "INSERT INTO leave_types (name, description, max_days_per_year) VALUES ('Annual Leave', 'Yearly vacation leave', 21), ('Sick Leave', 'Medical leave', 10), ('Personal Leave', 'Personal time off', 5), ('Maternity Leave', 'Maternity leave', 90), ('Paternity Leave', 'Paternity leave', 14) ON CONFLICT (name) DO NOTHING;" "Inserting default leave types"

REM Record migration
call :execute_sql "INSERT INTO migration_log (migration_name, status) VALUES ('create_all_tables_batch_script', 'completed');" "Recording migration completion"

echo.
echo ==========================================
echo  SUCCESS: All 34 tables created!
echo ==========================================
echo.
echo Database is ready for HR Management System
echo.
echo Tables created:
echo   - Core: users, employees, employee_master, managers, departments
echo   - Attendance: attendance, attendance_settings
echo   - Leave: leave_types, leave_requests, leave_balances, leave_type_balances, monthly_leave_accruals, comp_off_balances
echo   - Documents: documents, employee_documents, document_collection, document_templates
echo   - Expenses: expenses, expense_categories, expense_requests, expense_attachments
echo   - Employee Types: full_time_employees, contract_employees, interns
echo   - Onboarding: onboarded_employees, onboarding_tasks
echo   - Communication: employee_notifications, employee_forms, company_emails
echo   - Management: manager_employee_mapping
echo   - System: hr_settings, system_settings, migration_log, migrations
echo.
echo Setup complete! Your HR Management System database is ready.
echo.
pause