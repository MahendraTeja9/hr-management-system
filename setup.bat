@echo off
REM HR Management System Setup Script for Windows

echo 🏢 HR Management System Setup
echo ==============================

REM Check prerequisites based on user choice
echo 🔍 Checking prerequisites...

REM Ask user for environment choice
echo.
echo 🌍 Choose your environment:
echo 1^) Local Development with Docker ^(localhost with Docker DB^)
echo 2^) Local Development Direct ^(localhost with your PostgreSQL^)
echo 3^) Production ^(server deployment^)
echo.
set /p choice="Enter your choice (1, 2, or 3): "

if "%choice%"=="1" (
    echo 🔧 Setting up for Local Development with Docker...
    
    REM Check if Docker is installed
    docker --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker is not installed. Please install Docker Desktop first.
        pause
        exit /b 1
    )
    
    REM Check if Docker Compose is installed
    docker-compose --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker Compose is not installed. Please install Docker Compose first.
        pause
        exit /b 1
    )
    
    echo ✅ Docker and Docker Compose are installed
    
    REM Copy environment files
    if not exist ".env" (
        copy env.local.example .env
        echo ✅ Created .env file for local development
    )
    
    if not exist "frontend\.env" (
        copy frontend\env.local.example frontend\.env
        echo ✅ Created frontend\.env file for local development
    )
    
    echo.
    echo 🚀 Starting local development environment with Docker...
    echo This will start:
    echo   - PostgreSQL database on localhost:5432
    echo   - Backend API on localhost:5001
    echo   - Frontend will be available after build
    echo.
    
    docker-compose -f docker-compose.local.yml up --build
) else if "%choice%"=="2" (
    echo 🔧 Setting up for Local Development with your PostgreSQL...
    
    REM Check if Node.js is installed
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Node.js is not installed. Please install Node.js first.
        pause
        exit /b 1
    )
    
    echo ✅ Node.js is installed
    
    REM Copy environment files
    if not exist ".env" (
        copy env.local.example .env
        echo ✅ Created .env file for local development
    )
    
    if not exist "frontend\.env" (
        copy frontend\env.local.example frontend\.env
        echo ✅ Created frontend\.env file for local development
    )
    
    echo.
    echo 🚀 Starting local development environment with your PostgreSQL...
    echo This will start:
    echo   - Backend API on localhost:5001 (using your PostgreSQL)
    echo   - Frontend on localhost:3000
    echo   - Database: 127.0.0.1:5432 (onboardd)
    echo.
    echo Please ensure PostgreSQL is running with:
    echo   Database: onboardd
    echo   User: postgres
    echo   Password: Maahi123
    echo.
    
    call start-local-direct.bat
) else if "%choice%"=="3" (
    echo 🏭 Setting up for Production...
    
    REM Check if Docker is installed
    docker --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker is not installed. Please install Docker Desktop first.
        pause
        exit /b 1
    )
    
    REM Check if Docker Compose is installed
    docker-compose --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker Compose is not installed. Please install Docker Compose first.
        pause
        exit /b 1
    )
    
    echo ✅ Docker and Docker Compose are installed
    
    REM Copy environment files
    if not exist ".env" (
        copy env.production.example .env
        echo ✅ Created .env file for production
    )
    
    if not exist "frontend\.env" (
        copy frontend\env.production.example frontend\.env
        echo ✅ Created frontend\.env file for production
    )
    
    echo.
    echo 🚀 Starting production environment...
    echo This will start:
    echo   - PostgreSQL database container
    echo   - Backend API on port 5008
    echo   - Frontend on port 3008
    echo.
    
    docker-compose up --build
) else (
    echo ❌ Invalid choice. Please run the script again and choose 1, 2, or 3.
    pause
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo 📚 For more information, see DUAL_ENVIRONMENT_SETUP.md
pause
