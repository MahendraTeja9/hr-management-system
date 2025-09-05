# 🚀 HR Onboard System - Complete Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Application Setup](#application-setup)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Starting the Application](#starting-the-application)
7. [Post-Deployment Setup](#post-deployment-setup)
8. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

### System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Node.js**: Version 16.0 or higher
- **PostgreSQL**: Version 12.0 or higher
- **Git**: For version control (optional)

### Install Required Software

#### A. Install Node.js

1. Visit [https://nodejs.org/](https://nodejs.org/)
2. Download and install the LTS version
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

#### B. Install PostgreSQL

1. Visit [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
2. Download and install PostgreSQL for your OS
3. During installation:
   - Set a password for the `postgres` user (remember this!)
   - Use default port `5432`
   - Remember the installation directory
4. Verify installation:
   ```bash
   psql --version
   ```

---

## 2. Database Setup

### Step 1: Start PostgreSQL Service

**Windows:**

```cmd
# Start PostgreSQL service
net start postgresql-x64-14
```

**macOS:**

```bash
# Start PostgreSQL service
brew services start postgresql
# OR
pg_ctl -D /usr/local/var/postgres start
```

**Linux:**

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Create Database

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create the database
CREATE DATABASE onboardd;

# Exit psql
\q
```

### Step 3: Verify Database Connection

```bash
psql -U postgres -d onboardd -c "SELECT NOW();"
```

---

## 3. Application Setup

### Step 1: Extract/Copy Source Code

1. Extract the source code to your desired directory
2. Navigate to the project directory:
   ```bash
   cd path/to/onboard
   ```

### Step 2: Verify Project Structure

Your directory should contain:

```
onboard/
├── backend/
├── frontend/
├── deploy.sh (Linux/macOS)
├── deploy.bat (Windows)
├── start-application.sh (Linux/macOS)
├── start-application.bat (Windows)
└── README.md
```

---

## 4. Configuration

### Step 1: Configure Database Credentials

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Open `config.env` file in a text editor
3. Update the database configuration:

   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=onboardd
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password_here

   # Application Configuration
   NODE_ENV=production
   PORT=5001

   # JWT Secret (change this to a secure random string)
   JWT_SECRET=your_secure_jwt_secret_key_here

   # Email Configuration (optional - for notifications)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   ```

4. **IMPORTANT**: Replace `your_postgres_password_here` with your actual PostgreSQL password

### Step 2: Generate JWT Secret (Optional but Recommended)

Generate a secure JWT secret:

```bash
# Linux/macOS
openssl rand -base64 32

# Windows (in PowerShell)
[System.Web.Security.Membership]::GeneratePassword(32, 0)
```

---

## 5. Deployment

### Method 1: Automatic Deployment (Recommended)

#### For Linux/macOS:

```bash
# Make the deploy script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

#### For Windows:

```cmd
# Run the deployment script
deploy.bat
```

The deployment script will:

- ✅ Check Node.js and npm installation
- ✅ Install backend dependencies
- ✅ Install frontend dependencies
- ✅ Test database connection
- ✅ Create all 31 database tables
- ✅ Insert initial data (leave types, expense categories, etc.)
- ✅ Build frontend for production

### Method 2: Manual Deployment

If the automatic deployment fails, follow these manual steps:

#### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

#### Step 2: Run Database Migration

```bash
# From the project root directory
psql -U postgres -d onboardd -f backend/migrations/002_complete_database_setup.sql
```

#### Step 3: Build Frontend

```bash
cd frontend
npm run build
cd ..
```

---

## 6. Starting the Application

### Method 1: Using Start Scripts (Recommended)

#### For Linux/macOS:

```bash
# Make the start script executable
chmod +x start-application.sh

# Start the application
./start-application.sh
```

#### For Windows:

```cmd
# Start the application
start-application.bat
```

### Method 2: Manual Start

#### Terminal 1 - Start Backend:

```bash
cd backend
npm start
```

#### Terminal 2 - Start Frontend:

```bash
cd frontend
npm start
```

### Application URLs

- **Frontend**: [http://localhost:3001](http://localhost:3001)
- **Backend API**: [http://localhost:5001](http://localhost:5001)

---

## 7. Post-Deployment Setup

### Step 1: Access the Application

1. Open your web browser
2. Navigate to [http://localhost:3001](http://localhost:3001)
3. You should see the HR Onboard login page

### Step 2: Default Login Credentials

#### HR Admin:

- **Email**: `hr@nxzen.com`
- **Password**: `hr123`

#### Manager:

- **Email**: `strawhatluff124@gmail.com`
- **Password**: `luffy123`

#### Test Manager:

- **Email**: `test.manager@company.com`
- **Password**: `manager123`

### Step 3: Create Your First Employee

1. Login as HR Admin
2. Navigate to "Employee Management"
3. Add new employees using the employee form
4. Set up manager-employee relationships

### Step 4: Configure System Settings (Optional)

1. Update company information
2. Configure leave policies
3. Set up expense categories
4. Upload document templates

---

## 8. Troubleshooting

### Common Issues and Solutions

#### Issue 1: Database Connection Failed

**Error**: "Cannot connect to PostgreSQL"
**Solutions**:

1. Check if PostgreSQL is running:
   ```bash
   # Check PostgreSQL status
   pg_isready -p 5432
   ```
2. Verify database credentials in `backend/config.env`
3. Ensure database `onboardd` exists
4. Check firewall settings

#### Issue 2: Port Already in Use

**Error**: "Port 5001 already in use" or "Port 3001 already in use"
**Solutions**:

1. Kill existing processes:

   ```bash
   # Kill process on port 5001
   npx kill-port 5001

   # Kill process on port 3001
   npx kill-port 3001
   ```

2. Or change ports in configuration files

#### Issue 3: npm Install Fails

**Error**: "npm install failed"
**Solutions**:

1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
2. Delete node_modules and try again:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Use yarn instead of npm:
   ```bash
   yarn install
   ```

#### Issue 4: Frontend Build Fails

**Error**: "npm run build failed"
**Solutions**:

1. Check Node.js version (must be 16+)
2. Increase memory limit:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

#### Issue 5: Tables Not Created

**Error**: "Migration failed" or "Tables missing"
**Solutions**:

1. Run migration manually:
   ```bash
   psql -U postgres -d onboardd -f backend/migrations/002_complete_database_setup.sql
   ```
2. Check database permissions
3. Verify PostgreSQL version (12+)

### Logs and Debugging

- Backend logs: `backend/server.log`
- Browser console: F12 → Console tab
- Database logs: PostgreSQL log files

---

## 9. Database Schema Information

### Tables Created (31 Total):

1. **users** - User authentication and profiles
2. **employee_forms** - Employee onboarding forms
3. **employee_master** - Master employee data
4. **onboarded_employees** - Onboarded employee tracking
5. **managers** - Manager master data
6. **departments** - Department master data
7. **interns** - Intern details
8. **full_time_employees** - Full-time employee details
9. **contract_employees** - Contract employee details
10. **document_templates** - Document templates
11. **document_collection** - Document collection status
12. **employee_documents** - Employee document mapping
13. **documents** - Document storage
14. **attendance** - Employee attendance records
15. **attendance_settings** - Attendance configuration
16. **manager_employee_mapping** - Manager-employee relationships
17. **leave_types** - Leave type master data
18. **leave_balances** - Leave balance tracking
19. **leave_requests** - Leave request records
20. **leave_type_balances** - Leave type specific balances
21. **monthly_leave_accruals** - Monthly leave accrual records
22. **comp_off_balances** - Compensatory off balances
23. **expense_categories** - Expense category master
24. **expense_requests** - Expense requests
25. **expenses** - Expense records
26. **expense_attachments** - Expense attachment files
27. **employee_notifications** - Employee notifications
28. **company_emails** - Company email management
29. **system_settings** - System configuration
30. **migration_log** - Database migration tracking
31. **relations** - Employee relationship data

---

## 10. Production Deployment Notes

### For Production Environment:

1. **Change default passwords** for all accounts
2. **Set strong JWT_SECRET** in production
3. **Configure proper email settings** for notifications
4. **Set up SSL/HTTPS** for secure connections
5. **Configure reverse proxy** (nginx/Apache) if needed
6. **Set up database backups**
7. **Monitor application logs**
8. **Configure firewall rules**

### Security Checklist:

- [ ] Change all default passwords
- [ ] Set secure JWT secret
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up database encryption
- [ ] Regular security updates
- [ ] Monitor access logs

---

## 11. Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review log files for error messages
3. Ensure all prerequisites are properly installed
4. Verify database connection and permissions

---

**🎉 Congratulations! Your HR Onboard System is now ready to use!**

For any questions or support, refer to the troubleshooting section or check the application logs.
