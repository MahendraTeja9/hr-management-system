@echo off
echo ========================================
echo    ONBOARD HR System - Starting Application
echo ========================================
echo.

:: Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if required directories exist
if not exist "backend" (
    echo ERROR: Backend directory not found
    echo Please ensure you are running this script from the project root directory
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: Frontend directory not found
    echo Please ensure you are running this script from the project root directory
    pause
    exit /b 1
)

:: Check if node_modules exist
if not exist "backend\node_modules" (
    echo ERROR: Backend dependencies not installed
    echo Please run deploy.bat first to install dependencies
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo ERROR: Frontend dependencies not installed
    echo Please run deploy.bat first to install dependencies
    pause
    exit /b 1
)

echo.
echo ========================================
echo Starting Backend Server...
echo ========================================

:: Start backend server in a new window
echo Starting backend server on port 5001...
start "ONBOARD Backend Server" cmd /k "cd backend && npm start"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Starting Frontend Server...
echo ========================================

:: Start frontend server in a new window
echo Starting frontend server on port 3001...
start "ONBOARD Frontend Server" cmd /k "cd frontend && npm start"

:: Wait a moment for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo Application Started Successfully!
echo ========================================
echo.
echo Backend Server: http://localhost:5001
echo Frontend Application: http://localhost:3001
echo.
echo Test Credentials:
echo - Employee: test.employee@company.com / test123
echo - Manager: (create manager account through HR portal)
echo.
echo ========================================
echo Application Status
echo ========================================
echo.
echo Checking application status...

:: Check if backend is running
echo Checking backend server...
curl -s http://localhost:5001/api/auth/me >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend server is running
) else (
    echo ⚠ Backend server may still be starting up
)

:: Check if frontend is running
echo Checking frontend server...
curl -s http://localhost:3001 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Frontend server is running
) else (
    echo ⚠ Frontend server may still be starting up
)

echo.
echo ========================================
echo Next Steps
echo ========================================
echo.
echo 1. Open your browser and go to: http://localhost:3001
echo 2. Login with the test credentials
echo 3. Navigate to the attendance section
echo.
echo To stop the application:
echo - Close the command windows that opened
echo - Or press Ctrl+C in each window
echo.
echo ========================================
echo Application is ready!
echo ========================================
echo.
pause
