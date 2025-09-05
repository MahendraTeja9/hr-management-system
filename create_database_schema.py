#!/usr/bin/env python3
"""
Database Schema Generator for ONDOARD Application
This script creates the complete database schema without any data.
Run this script on another computer to recreate the exact same database structure.
"""

import psycopg2
import sys
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_database_schema():
    """Create the complete database schema for ONDOARD application"""
    
    # Database connection parameters - modify these as needed
    DB_CONFIG = {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres',
        'password': 'your_password_here',  # Change this
        'database': 'onboardd'
    }
    
    try:
        # First, connect to PostgreSQL to create database if it doesn't exist
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        try:
            cursor.execute("CREATE DATABASE onboardd")
            print("✅ Database 'onboardd' created successfully")
        except psycopg2.errors.DuplicateDatabase:
            print("ℹ️  Database 'onboardd' already exists")
        
        cursor.close()
        conn.close()
        
        # Now connect to the specific database
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database']
        )
        cursor = conn.cursor()
        
        print("🔧 Creating database schema...")
        
        # Create all tables
        create_tables(cursor)
        
        # Create indexes
        create_indexes(cursor)
        
        # Create foreign key constraints
        create_foreign_keys(cursor)
        
        # Commit all changes
        conn.commit()
        print("✅ Database schema created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating database schema: {e}")
        if 'conn' in locals():
            conn.rollback()
        sys.exit(1)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def create_tables(cursor):
    """Create all tables in the database"""
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
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
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created users table")
    
    # Managers table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS managers (
            manager_id SERIAL PRIMARY KEY,
            manager_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            department VARCHAR(100),
            designation VARCHAR(100),
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created managers table")
    
    # Departments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created departments table")
    
    # Employee Master table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employee_master (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(10) UNIQUE,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            phone VARCHAR(20),
            department_id INTEGER REFERENCES departments(id),
            designation VARCHAR(100),
            employment_type VARCHAR(50) DEFAULT 'Full-Time',
            joining_date DATE,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created employee_master table")
    
    # Manager Employee Mapping table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS manager_employee_mapping (
            id SERIAL PRIMARY KEY,
            manager_id INTEGER REFERENCES users(id),
            employee_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created manager_employee_mapping table")
    
    # Attendance table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES users(id),
            date DATE NOT NULL,
            clock_in_time TIME,
            clock_out_time TIME,
            reason TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created attendance table")
    
    # Attendance Settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance_settings (
            id SERIAL PRIMARY KEY,
            setting_name VARCHAR(100) NOT NULL UNIQUE,
            setting_value TEXT,
            description TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created attendance_settings table")
    
    # Leave Types table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leave_types (
            id SERIAL PRIMARY KEY,
            type_name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            max_days INTEGER,
            color VARCHAR(7) DEFAULT '#3B82F6',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created leave_types table")
    
    # Leave Balances table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leave_balances (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            leave_type_id INTEGER REFERENCES leave_types(id),
            total_days INTEGER DEFAULT 0,
            used_days INTEGER DEFAULT 0,
            remaining_days INTEGER DEFAULT 0,
            year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created leave_balances table")
    
    # Leave Type Balances table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leave_type_balances (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            leave_type VARCHAR(100) NOT NULL,
            total_balance INTEGER DEFAULT 0,
            used_balance INTEGER DEFAULT 0,
            remaining_balance INTEGER DEFAULT 0,
            year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created leave_type_balances table")
    
    # Leave Requests table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leave_requests (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            leave_type VARCHAR(100) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_days INTEGER NOT NULL,
            reason TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            hr_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            hr_comments TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created leave_requests table")
    
    # Monthly Leave Accruals table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS monthly_leave_accruals (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            leave_type VARCHAR(100) NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            accrued_days DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created monthly_leave_accruals table")
    
    # Comp Off Balances table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comp_off_balances (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            total_balance INTEGER DEFAULT 0,
            used_balance INTEGER DEFAULT 0,
            remaining_balance INTEGER DEFAULT 0,
            year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created comp_off_balances table")
    
    # Document Collection table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS document_collection (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            document_name VARCHAR(255) NOT NULL,
            document_type VARCHAR(100),
            file_path VARCHAR(500),
            file_size INTEGER,
            mime_type VARCHAR(100),
            status VARCHAR(20) DEFAULT 'pending',
            uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP WITHOUT TIME ZONE,
            reviewed_by INTEGER REFERENCES users(id),
            comments TEXT
        )
    """)
    print("✅ Created document_collection table")
    
    # Document Templates table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS document_templates (
            id SERIAL PRIMARY KEY,
            template_name VARCHAR(255) NOT NULL,
            template_description TEXT,
            employment_type VARCHAR(50),
            is_required BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created document_templates table")
    
    # Employee Documents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employee_documents (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            document_name VARCHAR(255) NOT NULL,
            document_type VARCHAR(100),
            file_path VARCHAR(500),
            file_size INTEGER,
            mime_type VARCHAR(100),
            status VARCHAR(20) DEFAULT 'pending',
            uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP WITHOUT TIME ZONE,
            reviewed_by INTEGER REFERENCES users(id),
            comments TEXT
        )
    """)
    print("✅ Created employee_documents table")
    
    # Employee Forms table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employee_forms (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES users(id),
            form_type VARCHAR(100) NOT NULL,
            form_data JSONB,
            status VARCHAR(20) DEFAULT 'pending',
            submitted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP WITHOUT TIME ZONE,
            reviewed_by INTEGER REFERENCES users(id),
            comments TEXT
        )
    """)
    print("✅ Created employee_forms table")
    
    # Expenses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            expense_type VARCHAR(100) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            description TEXT,
            date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            hr_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            hr_comments TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created expenses table")
    
    # Expense Attachments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expense_attachments (
            id SERIAL PRIMARY KEY,
            expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size INTEGER,
            mime_type VARCHAR(100),
            uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created expense_attachments table")
    
    # Company Emails table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS company_emails (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL UNIQUE,
            is_primary BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created company_emails table")
    
    # Onboarded Employees table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS onboarded_employees (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            employee_name VARCHAR(100),
            company_email VARCHAR(255),
            manager VARCHAR(100),
            manager2 VARCHAR(100),
            manager3 VARCHAR(100),
            status VARCHAR(20) DEFAULT 'pending',
            assigned_by INTEGER REFERENCES users(id),
            assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created onboarded_employees table")
    
    # System Settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL UNIQUE,
            setting_value TEXT,
            description TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created system_settings table")
    
    # Employment Type Specific Tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interns (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            internship_duration INTEGER,
            mentor_name VARCHAR(100),
            project_name VARCHAR(255),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created interns table")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS full_time_employees (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            probation_period INTEGER,
            notice_period INTEGER,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created full_time_employees table")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contract_employees (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            contract_start_date DATE,
            contract_end_date DATE,
            contract_value DECIMAL(12,2),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Created contract_employees table")

def create_indexes(cursor):
    """Create indexes for better performance"""
    
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date)",
        "CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id)",
        "CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status)",
        "CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id)",
        "CREATE INDEX IF NOT EXISTS idx_document_collection_employee ON document_collection(employee_id)",
        "CREATE INDEX IF NOT EXISTS idx_document_collection_status ON document_collection(status)",
        "CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id)",
        "CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status)",
        "CREATE INDEX IF NOT EXISTS idx_employee_master_email ON employee_master(email)",
        "CREATE INDEX IF NOT EXISTS idx_employee_master_employee_id ON employee_master(employee_id)",
        "CREATE INDEX IF NOT EXISTS idx_managers_email ON managers(email)",
        "CREATE INDEX IF NOT EXISTS idx_managers_status ON managers(status)",
        "CREATE INDEX IF NOT EXISTS idx_onboarded_employees_user_id ON onboarded_employees(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_onboarded_employees_status ON onboarded_employees(status)"
    ]
    
    for index_sql in indexes:
        cursor.execute(index_sql)
    
    print("✅ Created all indexes")

def create_foreign_keys(cursor):
    """Create foreign key constraints"""
    
    # Most foreign keys are already created in the table definitions
    # Additional foreign keys can be added here if needed
    
    print("✅ Foreign key constraints are already defined in table creation")

def main():
    """Main function"""
    print("🚀 Starting ONDOARD Database Schema Creation...")
    print("=" * 50)
    
    # Instructions for the user
    print("""
📋 Before running this script, please ensure:
1. PostgreSQL is installed and running
2. Update the DB_CONFIG in the script with your PostgreSQL credentials
3. The user has permission to create databases and tables

🔧 To run this script:
1. Install psycopg2: pip install psycopg2-binary
2. Update the DB_CONFIG dictionary with your credentials
3. Run: python create_database_schema.py
    """)
    
    # Ask for confirmation
    response = input("Do you want to proceed with database creation? (y/N): ")
    if response.lower() != 'y':
        print("❌ Database creation cancelled")
        return
    
    create_database_schema()
    
    print("""
🎉 Database schema creation completed!

📝 Next steps:
1. Update your application's database configuration
2. Run any necessary migrations
3. Start your application

💡 The database now contains all tables but no data.
   You can start adding data through your application.
    """)

if __name__ == "__main__":
    main()
