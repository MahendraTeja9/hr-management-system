# ONBOARD HR System - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the ONBOARD HR System, which includes an employee attendance tracking system with manager dashboard functionality.

## Prerequisites

### Required Software

1. **Node.js** (v16 or higher)

   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)

   - Verify installation: `npm --version`

3. **PostgreSQL** (v12 or higher)

   - Download from: https://www.postgresql.org/download/
   - Create a database named `onboardd`

4. **Git** (optional, for version control)
   - Download from: https://git-scm.com/

### System Requirements

- **Operating System**: Windows 10/11, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 2GB free space
- **Network**: Internet connection for dependency installation

## Quick Start

### Option 1: Automated Deployment (Windows)

1. **Run the deployment script**:

   ```bash
   deploy.bat
   ```

2. **Start the application**:

   ```bash
   start-application.bat
   ```

3. **Access the application**:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:5001

### Option 2: Manual Deployment

#### Step 1: Database Setup

1. **Create PostgreSQL database**:

   ```sql
   CREATE DATABASE onboardd;
   ```

2. **Run the migration**:
   ```bash
   cd backend
   psql -d onboardd -f migrations/001_initial_attendance_setup.sql
   ```

#### Step 2: Backend Setup

1. **Navigate to backend directory**:

   ```bash
   cd backend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment**:

   - Copy `config.env.example` to `config.env`
   - Update database credentials in `config.env`

4. **Start backend server**:
   ```bash
   npm start
   ```

#### Step 3: Frontend Setup

1. **Navigate to frontend directory**:

   ```bash
   cd frontend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start frontend server**:
   ```bash
   npm start
   ```

## Configuration

### Database Configuration

Update `backend/config.env` with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=onboardd
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
```

### Environment Variables

- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name (default: onboardd)
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Backend server port (default: 5001)

## Features

### Employee Features

- **Attendance Tracking**: Mark daily attendance (Present, WFH, Leave, Absent, Half Day)
- **Weekly View**: View and edit attendance for the current week
- **Calendar View**: Visual calendar representation of attendance
- **Profile Management**: Update personal information

### Manager Features

- **Team Dashboard**: View all team members
- **Attendance Management**: Edit team member attendance
- **Reports**: Generate attendance reports
- **Team Management**: Add/remove team members

### HR Features

- **Employee Management**: Add new employees
- **Document Collection**: Manage onboarding documents
- **Leave Management**: Approve/reject leave requests

## Test Credentials

### Default Test User

- **Email**: test.employee@company.com
- **Password**: test123
- **Role**: Employee

### Creating Manager Account

1. Login as HR user
2. Navigate to Employee Management
3. Add a new employee with role "manager"
4. Use the generated credentials to login

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5001`

**Solution**:

```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5001 | xargs kill -9
```

#### 2. Database Connection Failed

**Error**: `ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:

1. Ensure PostgreSQL is running
2. Check database credentials in `config.env`
3. Verify database `onboardd` exists

#### 3. Dependencies Installation Failed

**Error**: `npm ERR! code ENOENT`

**Solution**:

1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again

#### 4. Migration Failed

**Error**: `relation "attendance" already exists`

**Solution**:

1. Drop existing tables (if safe to do so):
   ```sql
   DROP TABLE IF EXISTS attendance CASCADE;
   DROP TABLE IF EXISTS manager_employee_mapping CASCADE;
   DROP TABLE IF EXISTS attendance_settings CASCADE;
   ```
2. Run migration again

### Logs and Debugging

#### Backend Logs

- Location: `backend/server.log`
- View logs: `tail -f backend/server.log`

#### Frontend Logs

- Check browser console (F12)
- Development server logs in terminal

#### Database Logs

- PostgreSQL logs: Check PostgreSQL configuration
- Query logs: Enable query logging in PostgreSQL

## Production Deployment

### Environment Setup

1. **Use environment variables** instead of config files
2. **Set up SSL certificates** for HTTPS
3. **Configure reverse proxy** (nginx/Apache)
4. **Set up PM2** for process management

### Security Considerations

1. **Change default passwords**
2. **Use strong JWT secrets**
3. **Enable HTTPS**
4. **Set up firewall rules**
5. **Regular security updates**

### Performance Optimization

1. **Database indexing** (already included in migration)
2. **Caching** (Redis recommended)
3. **CDN** for static assets
4. **Load balancing** for high traffic

## Support

### Getting Help

1. **Check the logs** for error messages
2. **Review this documentation**
3. **Check GitHub issues** (if applicable)
4. **Contact system administrator**

### Maintenance

- **Regular backups** of the database
- **Monitor disk space** and logs
- **Update dependencies** regularly
- **Test after updates**

## License

This project is proprietary software. All rights reserved.

---

**Last Updated**: September 3, 2025
**Version**: 1.0.0
