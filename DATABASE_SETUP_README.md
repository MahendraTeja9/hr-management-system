# ONDOARD Database Schema Setup

This directory contains a Python script to recreate the complete database schema for the ONDOARD application on any system.

## 📋 Prerequisites

1. **PostgreSQL** installed and running
2. **Python 3.6+** installed
3. **psycopg2** Python package

## 🚀 Quick Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Update Database Configuration

Edit `create_database_schema.py` and update the `DB_CONFIG` dictionary:

```python
DB_CONFIG = {
    'host': 'localhost',           # Your PostgreSQL host
    'port': 5432,                 # Your PostgreSQL port
    'user': 'postgres',           # Your PostgreSQL username
    'password': 'your_password',  # Your PostgreSQL password
    'database': 'onboardd'        # Database name (will be created if not exists)
}
```

### 3. Run the Script

```bash
python create_database_schema.py
```

## 📊 What Gets Created

The script creates the following database structure:

### Core Tables

- **users** - User accounts and authentication
- **managers** - Manager information
- **departments** - Department information
- **employee_master** - Employee master data

### Attendance & Leave Management

- **attendance** - Daily attendance records
- **attendance_settings** - Attendance configuration
- **leave_types** - Types of leave (sick, casual, etc.)
- **leave_balances** - Employee leave balances
- **leave_type_balances** - Leave type specific balances
- **leave_requests** - Leave request submissions
- **monthly_leave_accruals** - Monthly leave accrual tracking
- **comp_off_balances** - Compensatory off balances

### Document Management

- **document_collection** - Document uploads and tracking
- **document_templates** - Document template definitions
- **employee_documents** - Employee-specific documents
- **employee_forms** - Employee form submissions

### Expense Management

- **expenses** - Expense submissions
- **expense_attachments** - Expense file attachments

### Onboarding

- **onboarded_employees** - Employee onboarding tracking
- **company_emails** - Company email addresses

### Employment Type Specific

- **interns** - Intern-specific information
- **full_time_employees** - Full-time employee details
- **contract_employees** - Contract employee details

### System

- **system_settings** - System configuration
- **manager_employee_mapping** - Manager-employee relationships

## 🔧 Features

- ✅ Creates database if it doesn't exist
- ✅ Creates all tables with proper relationships
- ✅ Sets up indexes for optimal performance
- ✅ Includes foreign key constraints
- ✅ Uses `IF NOT EXISTS` to prevent errors on re-run
- ✅ No data is included (clean schema only)

## 🛠️ Troubleshooting

### Common Issues

1. **Connection Error**

   - Verify PostgreSQL is running
   - Check host, port, username, and password
   - Ensure the user has CREATE DATABASE permissions

2. **Permission Error**

   - Make sure your PostgreSQL user has sufficient privileges
   - You may need to run as a superuser or grant necessary permissions

3. **Port Already in Use**
   - Check if PostgreSQL is running on the specified port
   - Default port is 5432

### Verification

After running the script, you can verify the setup:

```sql
-- Connect to the database
\c onboardd

-- List all tables
\dt

-- Check table structure
\d users
\d managers
-- etc.
```

## 📝 Next Steps

After running the script:

1. **Update Application Configuration**

   - Update your application's database connection settings
   - Point to the newly created database

2. **Add Initial Data** (Optional)

   - Add default leave types
   - Create admin users
   - Set up departments

3. **Start Your Application**
   - The database is ready for your application to use

## 🔒 Security Notes

- Change the default password in the script
- Use environment variables for sensitive data in production
- Ensure proper database user permissions
- Consider using SSL connections for production

## 📞 Support

If you encounter issues:

1. Check the error messages in the script output
2. Verify PostgreSQL installation and configuration
3. Ensure all prerequisites are met
4. Check database user permissions

---

**Note**: This script creates the database structure only. No sample data or user accounts are created. You'll need to add data through your application or additional scripts.
