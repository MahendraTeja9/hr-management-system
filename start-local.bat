@echo off
REM Local Development Startup Script for Windows

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

REM Start the local development environment
echo 🐳 Starting Docker containers for local development...
docker-compose -f docker-compose.local.yml up --build

echo ✅ Local development environment started!
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:5008
echo 🗄️  Database: localhost:5432
pause
