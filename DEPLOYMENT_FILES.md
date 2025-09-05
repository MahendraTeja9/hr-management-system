# ONBOARD HR System - Deployment Files

## Created Files Summary

This document lists all the deployment and migration files created for the ONBOARD HR System.

## 📁 Migration Files

### `backend/migrations/001_initial_attendance_setup.sql`

- **Purpose**: Database migration for initial attendance system setup
- **Contents**:
  - Creates attendance tables (attendance, manager_employee_mapping, attendance_settings)
  - Sets up database functions and views
  - Inserts default configuration settings
  - Creates performance indexes
  - Adds sample manager-employee mappings

## 🚀 Deployment Scripts

### Windows Batch Files

#### `deploy.bat`

- **Purpose**: Automated deployment script for Windows
- **Features**:
  - Checks Node.js and npm installation
  - Installs backend and frontend dependencies
  - Validates PostgreSQL connection
  - Runs database migration
  - Builds frontend for production
  - Provides deployment summary

#### `start-application.bat`

- **Purpose**: Starts the application on Windows
- **Features**:
  - Validates prerequisites
  - Starts backend server on port 5001
  - Starts frontend server on port 3001
  - Checks application status
  - Provides access information

### Unix/Linux Shell Scripts

#### `deploy.sh`

- **Purpose**: Automated deployment script for macOS/Linux
- **Features**:
  - Same functionality as deploy.bat but for Unix systems
  - Uses bash scripting
  - Handles Unix-specific commands

#### `start-application.sh`

- **Purpose**: Starts the application on macOS/Linux
- **Features**:
  - Same functionality as start-application.bat but for Unix systems
  - Background process management
  - Signal handling for graceful shutdown

## 📚 Documentation

### `DEPLOYMENT_README.md`

- **Purpose**: Comprehensive deployment guide
- **Contents**:
  - Prerequisites and system requirements
  - Step-by-step deployment instructions
  - Configuration details
  - Troubleshooting guide
  - Production deployment considerations

### `DEPLOYMENT_FILES.md` (this file)

- **Purpose**: Summary of all deployment files
- **Contents**: List and description of all created files

## 📋 File Structure

```
ONDOARD/
├── backend/
│   └── migrations/
│       └── 001_initial_attendance_setup.sql
├── deploy.bat                    # Windows deployment script
├── deploy.sh                     # Unix deployment script
├── start-application.bat         # Windows start script
├── start-application.sh          # Unix start script
├── DEPLOYMENT_README.md          # Deployment documentation
└── DEPLOYMENT_FILES.md           # This file
```

## 🎯 Usage Instructions

### For Windows Users:

1. **Deploy**: Double-click `deploy.bat` or run `deploy.bat` in Command Prompt
2. **Start**: Double-click `start-application.bat` or run `start-application.bat` in Command Prompt

### For macOS/Linux Users:

1. **Deploy**: Run `./deploy.sh` in Terminal
2. **Start**: Run `./start-application.sh` in Terminal

### Manual Deployment:

1. **Database**: Run `psql -d onboardd -f backend/migrations/001_initial_attendance_setup.sql`
2. **Backend**: `cd backend && npm install && npm start`
3. **Frontend**: `cd frontend && npm install && npm start`

## 🔧 Configuration

### Required Configuration:

- Update `backend/config.env` with PostgreSQL credentials
- Ensure PostgreSQL database `onboardd` exists
- Verify Node.js and npm are installed

### Optional Configuration:

- Modify attendance settings in the database
- Update manager-employee mappings
- Customize application ports

## ✅ Verification

### After Deployment:

- Backend accessible at: http://localhost:5001
- Frontend accessible at: http://localhost:3001
- Test login: test.employee@company.com / test123

### Database Verification:

```sql
-- Check tables exist
\dt attendance
\dt manager_employee_mapping
\dt attendance_settings

-- Check sample data
SELECT * FROM attendance LIMIT 5;
SELECT * FROM attendance_settings;
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Port conflicts**: Kill existing processes or change ports
2. **Database connection**: Verify PostgreSQL is running and credentials are correct
3. **Dependencies**: Clear npm cache and reinstall if needed
4. **Permissions**: Ensure scripts are executable (Unix systems)

### Logs:

- Backend logs: `backend/server.log`
- Frontend logs: Browser console (F12)
- Database logs: PostgreSQL server logs

---

**Created**: September 3, 2025  
**Version**: 1.0.0  
**Status**: Ready for deployment
