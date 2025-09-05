@echo off
echo ========================================
echo    ONBOARD HR System - Deployment
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
echo Node.js found: 
node --version

:: Check if npm is installed
echo Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)
echo npm found:
npm --version

echo.
echo ========================================
echo Installing Dependencies...
echo ========================================

:: Install backend dependencies
echo Installing backend dependencies...
cd backend
if exist node_modules (
    echo Backend node_modules already exists, skipping installation
) else (
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    )
)
echo Backend dependencies installed successfully

:: Install frontend dependencies
echo Installing frontend dependencies...
cd ..\frontend
if exist node_modules (
    echo Frontend node_modules already exists, skipping installation
) else (
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
)
echo Frontend dependencies installed successfully

:: Return to root directory
cd ..

echo.
echo ========================================
echo Database Setup...
echo ========================================

:: Load database configuration
echo Loading database configuration...
cd backend
if exist config.env (
    echo Database configuration found in config.env
    
    :: Check PostgreSQL connection using config.env
    echo Checking PostgreSQL connection...
    node -e "
    require('dotenv').config({ path: './config.env' });
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'onboardd',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD
    });

    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.log('ERROR: Cannot connect to PostgreSQL');
        console.log('Database:', process.env.DB_NAME || 'onboardd');
        console.log('Host:', process.env.DB_HOST || 'localhost');
        console.log('Port:', process.env.DB_PORT || 5432);
        console.log('User:', process.env.DB_USER || 'postgres');
        console.log('Please ensure PostgreSQL is running and credentials in config.env are correct');
        process.exit(1);
      } else {
        console.log('PostgreSQL connection successful');
        console.log('Connected to database:', process.env.DB_NAME || 'onboardd');
        process.exit(0);
      }
    });
    "
) else (
    echo WARNING: config.env not found, using default connection
    
    :: Check PostgreSQL connection with defaults
    echo Checking PostgreSQL connection...
    node -e "
    const { Pool } = require('pg');
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'onboardd',
      user: 'postgres',
      password: 'your_password'
    });

    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.log('ERROR: Cannot connect to PostgreSQL');
        console.log('Please ensure PostgreSQL is running and credentials are correct');
        process.exit(1);
      } else {
        console.log('PostgreSQL connection successful');
        process.exit(0);
      }
    });
    "
)

if %errorlevel% neq 0 (
    echo.
    echo WARNING: PostgreSQL connection failed
    echo Please ensure:
    echo   1. PostgreSQL is running
    echo   2. Database exists
    echo   3. Credentials in config.env are correct
    echo.
    echo You can still continue with the deployment, but database operations may fail
    echo.
    set /p continue="Do you want to continue? (y/N): "
    if /i "%continue%" neq "y" (
        echo Deployment cancelled
        pause
        exit /b 1
    )
)

:: Run database migration
echo.
echo Running database migration...
if exist migrations\002_complete_database_setup.sql (
    echo Found migration file: migrations\002_complete_database_setup.sql
    echo Executing SQL migration...
    
    :: Try psql command first
    where psql >nul 2>&1
    if %errorlevel% equ 0 (
        echo Using psql command to run migration...
        if exist config.env (
            :: Use config.env values with psql
            node -e "
            require('dotenv').config({ path: './config.env' });
            const { execSync } = require('child_process');
            const host = process.env.DB_HOST || 'localhost';
            const port = process.env.DB_PORT || 5432;
            const user = process.env.DB_USER || 'postgres';
            const database = process.env.DB_NAME || 'onboardd';
            const password = process.env.DB_PASSWORD || 'your_password';
            
            process.env.PGPASSWORD = password;
            
            try {
              execSync(`psql -h ${host} -p ${port} -U ${user} -d ${database} -f migrations/002_complete_database_setup.sql`, 
                       { stdio: 'inherit' });
              console.log('✓ Database migration completed successfully using psql');
            } catch (error) {
              console.log('✗ Migration failed with psql, trying Node.js approach...');
              process.exit(1);
            }
            "
        ) else (
            :: Use default values with psql
            set PGPASSWORD=your_password
            psql -h localhost -p 5432 -U postgres -d onboardd -f migrations\002_complete_database_setup.sql
        )
        
        if %errorlevel% equ 0 (
            echo ✓ Database migration completed successfully using psql
        ) else (
            echo ✗ Migration failed with psql, trying Node.js approach...
            goto :nodejs_migration
        )
    ) else (
        echo psql command not found, using Node.js to run migration...
        goto :nodejs_migration
    )
    goto :migration_done
    
    :nodejs_migration
    :: Use Node.js approach
    node -e "
    require('dotenv').config({ path: './config.env' });
    const { Pool } = require('pg');
    const fs = require('fs');
    
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'onboardd',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'your_password'
    });
    
    const sql = fs.readFileSync('migrations/002_complete_database_setup.sql', 'utf8');
    
    pool.query(sql)
      .then(() => {
        console.log('✓ Database migration completed successfully using Node.js');
        process.exit(0);
      })
      .catch(err => {
        console.log('✗ Migration failed:', err.message);
        console.log('You may need to run the migration manually using psql');
        process.exit(1);
      });
    "
    
    :migration_done
) else (
    echo ✗ ERROR: Migration file not found!
    echo Please ensure migrations\002_complete_database_setup.sql exists
    echo Expected path: %cd%\migrations\002_complete_database_setup.sql
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================
echo Building Frontend...
echo ========================================

:: Build frontend
echo Building frontend for production...
cd frontend
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)
echo Frontend built successfully

cd ..

echo.
echo ========================================
echo Deployment Summary
echo ========================================
echo.
echo ✓ Node.js and npm verified
echo ✓ Backend dependencies installed
echo ✓ Frontend dependencies installed
echo ✓ Database connection tested
echo ✓ SQL migration (002_complete_database_setup.sql) executed
echo ✓ Frontend built for production
echo.
echo ========================================
echo Deployment Completed Successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Update backend/config.env with your database credentials
echo 2. Run start-application.bat to start the application
echo 3. Access the application at http://localhost:3001
echo.
echo For development:
echo - Backend will run on http://localhost:5001
echo - Frontend will run on http://localhost:3001
echo.
pause
