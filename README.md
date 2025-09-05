# ONBOARD - Employee Onboarding + Attendance Management System

A comprehensive full-stack application for managing employee onboarding, document collection, and attendance tracking with advanced HR management capabilities.

## 🚀 Quick Deployment

**New to this system?** Start here:

- 📋 **[QUICK_START.md](QUICK_START.md)** - 5-minute setup guide
- 📖 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete step-by-step instructions
- 🔧 **[Troubleshooting](#troubleshooting)** - Common issues and solutions

## 🚀 Features

### Authentication & User Management

- **Dual Login System**: HR and Employee portals with role-based access
- **JWT Authentication**: Secure token-based authentication with automatic token refresh
- **Password Management**: Temporary password generation and forced reset for new employees
- **Role-based Access Control**: HR and Employee permissions with middleware protection

### HR Management

- **Employee Onboarding**: Add new employees with automatic email notifications and unique email generation
- **Form Management**: View, edit, and approve employee onboarding forms with automatic document collection creation
- **Employee Master Table**: Centralized employee database with comprehensive employee tracking
- **Approval Workflow**: Approve/reject onboarding applications with automatic employment type detection
- **Document Collection**: Automated document requirement creation based on employment type
- **Onboarded Employees**: Intermediate approval stage with manager assignment capabilities

### Employee Portal

- **Onboarding Forms**: Dynamic forms based on employment type (Intern/Contract/Full-Time/Manager)
- **Status Tracking**: Real-time onboarding status updates with detailed progress tracking
- **File Uploads**: Optional document attachments with validation
- **Form Locking**: Prevents editing after submission with status-based restrictions

### Document Management

- **Automatic Document Collection**: Creates required documents automatically when HR approves forms
- **Employment Type Detection**: Automatically determines employment type based on form data
- **Document Templates**: Configurable document requirements for different employment types
- **Status Tracking**: Track document submission status (Pending, Received, N/A)
- **Document Upload**: Support for file uploads with validation

### Attendance System

- **Daily Attendance**: Mark Present/Work From Home/Leave with reason tracking
- **Calendar View**: Visual attendance calendar with color coding and monthly views
- **Time Tracking**: Clock in/out functionality for present employees
- **Leave Management**: Submit and track leave requests with approval workflow
- **Leave Balances**: Automatic leave balance tracking and management

### HR Dashboard

- **Attendance Overview**: View all employees' attendance with filtering options
- **Statistics**: Pie charts showing attendance percentages and trends
- **Filtering**: Filter by month, day, or specific employee
- **Drill-down**: Detailed employee attendance history with export capabilities

## 🛠️ Tech Stack

### Backend

- **Node.js** with Express.js framework
- **PostgreSQL** database with advanced querying
- **JWT** for secure authentication
- **Nodemailer** for email integration with templates
- **bcrypt** for password hashing and security
- **Express Validator** for comprehensive input validation
- **Multer** for file upload handling
- **CORS** with advanced configuration

### Frontend

- **React.js** with functional components and hooks
- **TailwindCSS** for responsive styling
- **React Router** for navigation with protected routes
- **Axios** for API calls with interceptors
- **date-fns** for date manipulation
- **Recharts** for data visualization
- **React Hot Toast** for user notifications
- **React Icons** for consistent iconography

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager
- Gmail account for email notifications

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ONDOARD
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all dependencies (frontend + backend)
npm run install-all
```

### 3. Database Setup

1. Create a PostgreSQL database named `onboard`
2. Update database credentials in `backend/config.env`:

```env
DB_HOST=localhost
DB_PORT=5434
DB_NAME=onboard
DB_USER=postgres
DB_PASSWORD=postgres
```

### 4. Email Configuration

Update email settings in `backend/config.env`:

```env
EMAIL_USER=alphanxzen@gmail.com
EMAIL_PASS=rewn cxqu eiuz fgmd
```

### 5. Environment Variables

Ensure your `backend/config.env` file contains:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5434
DB_NAME=onboard
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Email Configuration
EMAIL_USER=alphanxzen@gmail.com
EMAIL_PASS=rewn cxqu eiuz fgmd

# Server Configuration
PORT=5001
NODE_ENV=development
```

## 🚀 Running the Application

### Development Mode (Both Frontend & Backend)

```bash
npm run dev
```

### Backend Only

```bash
npm run server
```

### Frontend Only

```bash
npm run client
```

### Production Build

```bash
npm run build
npm start
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/api/health

## 🔐 Default Credentials

### HR Login

- **Email**: hr@nxzen.com
- **Password**: hr123

### Employee Login

- Employees receive temporary passwords via email when added by HR
- First login requires password reset for security

## 📊 Database Schema

### Core Tables

1. **users** - User authentication and roles
2. **employee_forms** - Onboarding form submissions with employment type
3. **employee_master** - Approved employee records
4. **onboarded_employees** - Intermediate approval stage
5. **document_collection** - Document requirements and status tracking
6. **document_templates** - Configurable document templates
7. **attendance** - Daily attendance records
8. **leave_requests** - Employee leave applications
9. **leave_balances** - Leave balance tracking
10. **managers** - Manager assignments and hierarchy

## 🔄 API Endpoints

### Authentication

- `POST /api/auth/login` - User login with role validation
- `POST /api/auth/reset-password` - Password reset with email verification
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/change-password` - Change password with validation

### HR Management

- `POST /api/hr/employees` - Add new employee with email generation
- `GET /api/hr/employees` - Get all employees with filtering
- `PUT /api/hr/employees/:id/approve` - Approve/reject employee with automatic document creation
- `GET /api/hr/master` - Get employee master table
- `GET /api/hr/onboarded` - Get onboarded employees pending assignment
- `PUT /api/hr/onboarded/:id/assign` - Assign employee details and move to master
- `GET /api/hr/document-collection` - Get document collection data
- `POST /api/hr/document-collection` - Add document collection records
- `GET /api/hr/approved-employee-forms` - Get approved employee forms
- `GET /api/hr/document-templates` - Get document templates

### Employee Portal

- `GET /api/employee/onboarding-status` - Get onboarding status with document tracking
- `POST /api/employee/onboarding-form` - Submit onboarding form with validation
- `GET /api/employee/is-onboarded` - Check if onboarded
- `POST /api/employee/public/onboarding-form` - Public form submission

### Attendance

- `POST /api/attendance/mark` - Mark attendance with validation
- `GET /api/attendance/calendar` - Get calendar data with filtering
- `GET /api/attendance/stats` - Get attendance statistics
- `GET /api/attendance/employee/:id` - Get employee attendance history

### Leave Management

- `POST /api/leave/request` - Submit leave request
- `GET /api/leave/requests` - Get leave requests with filtering
- `PUT /api/leave/requests/:id/approve` - Approve/reject leave requests
- `GET /api/leave/balances` - Get leave balances

## 📧 Email Integration

The application automatically sends emails for:

- **Employee Onboarding**: Welcome email with login credentials and temporary password
- **Password Reset**: Password reset links with secure tokens
- **Notifications**: Status updates and approvals
- **Leave Requests**: Approval notifications to managers
- **Document Reminders**: Due date notifications for document collection

## 🎨 UI Components

### Core Components

- **Login/PasswordReset**: Authentication forms with validation
- **HRDashboard**: HR management interface with navigation
- **EmployeeDashboard**: Employee onboarding portal with status tracking
- **AttendancePortal**: Attendance management with calendar view
- **AttendanceCalendar**: Visual calendar component with color coding
- **HRDocumentCollection**: Document collection management
- **OnboardedEmployees**: Employee assignment interface
- **EmployeeCRUD**: Employee creation and management

### Reusable Components

- **ProtectedRoute**: Authentication guard with role checking
- **AddEmployeeModal**: Employee creation form with email generation
- **EmployeeList**: Employee management table with actions
- **AttendanceStats**: Statistics visualization with charts
- **DocumentUploadSection**: File upload component with validation

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth with automatic refresh
- **Password Hashing**: bcrypt encryption with salt rounds
- **Input Validation**: Express validator middleware with custom rules
- **CORS Protection**: Cross-origin request handling with whitelist
- **Rate Limiting**: API request throttling to prevent abuse
- **Helmet**: Security headers for XSS protection
- **SQL Injection Prevention**: Parameterized queries throughout
- **File Upload Security**: File type and size validation

## 🚀 Recent Improvements

### Automatic Document Collection Creation

- **Employment Type Detection**: Automatically determines Intern/Contract/Full-Time/Manager based on form data
- **Document Generation**: Creates required documents automatically when HR approves forms
- **Status Tracking**: Tracks document submission status with proper workflow
- **Template Management**: Configurable document templates for different employment types

### Email Conflict Resolution

- **Unique Email Generation**: Automatic email suggestion system to prevent conflicts
- **Conflict Handling**: Graceful error handling for duplicate emails
- **Email Validation**: Comprehensive email format validation
- **User-Friendly Messages**: Clear error messages with suggestions

### Enhanced HR Workflows

- **Approval Process**: Streamlined approval workflow with automatic data creation
- **Manager Assignment**: Flexible manager assignment system with multiple managers
- **Document Tracking**: Comprehensive document collection and status tracking
- **Employee Onboarding**: Complete onboarding workflow from form submission to master table

### Data Consistency

- **Foreign Key Constraints**: Proper database relationships and constraints
- **Data Validation**: Comprehensive validation at all levels
- **Error Handling**: Graceful error handling with user-friendly messages
- **Data Integrity**: Ensures data consistency across all operations

## 🚀 Deployment

### Backend Deployment

1. Set production environment variables
2. Build and deploy to your server
3. Configure PostgreSQL connection with SSL
4. Set up email SMTP credentials
5. Configure CORS for production domains

### Frontend Deployment

1. Build the production bundle: `npm run build`
2. Deploy the `build` folder to your web server
3. Configure API endpoint URLs for production
4. Set up HTTPS for secure communication

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**: Verify PostgreSQL is running and credentials are correct
2. **Email Sending**: Check Gmail app password and SMTP settings
3. **Port Conflicts**: Ensure ports 3000 and 5001 are available
4. **CORS Issues**: Verify frontend URL in backend CORS configuration
5. **Document Collection**: Check if approved employees have document records
6. **Email Conflicts**: Use the email generation system to avoid duplicates

### Logs

- Backend logs are displayed in the console with detailed error messages
- Check browser console for frontend errors and API responses
- Database connection status is logged on startup
- Document collection creation is logged for debugging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper testing
4. Test thoroughly with different scenarios
5. Submit a pull request with detailed description

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Check the troubleshooting section
- Review API documentation
- Check console logs for detailed error messages
- Open an issue on GitHub with detailed information

---

**Note**: This is a production-ready application with comprehensive security measures, data validation, and error handling. For production deployment, ensure proper environment variable management, database backup strategies, and monitoring are implemented.
