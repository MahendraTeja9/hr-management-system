@echo off
REM Local Development Startup Script (Direct Node.js) for Windows

echo 🚀 Starting HR Management System in Local Development Mode...

REM Check if .env files exist, if not copy from examples
if not exist ".env" (
    echo 📋 Creating .env file from example...
    copy env.local.example .env
    echo ✅ .env file created. Please review and update if needed.
)

if not exist "frontend\.env" (
    echo 📋 Creating frontend .env file from example...
    copy frontend\env.local.example frontend\.env
    echo ✅ Frontend .env file created. Please review and update if needed.
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if PostgreSQL is running (simplified check)
echo 🔍 Checking PostgreSQL connection...
echo Please ensure PostgreSQL is running on localhost:5432
echo Database: onboardd, User: postgres, Password: Maahi123
echo.

REM Install dependencies if needed
if not exist "backend\node_modules" (
    echo 📦 Installing backend dependencies...
    cd backend && npm install && cd ..
)

if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

REM Start backend
echo 🔧 Starting backend server...
start "Backend Server" cmd /k "cd backend && npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo 🌐 Starting frontend development server...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo ✅ Local development environment started!
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:5001
echo 🗄️  Database: 127.0.0.1:5432 (onboardd)
echo.
echo Press any key to exit...
pause >nul
