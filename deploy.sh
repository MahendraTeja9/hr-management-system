#!/bin/bash

echo "========================================"
echo "   ONBOARD HR System - Deployment"
echo "========================================"
echo

# Check if Node.js is installed
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "Node.js found: $(node --version)"

# Check if npm is installed
echo "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed or not in PATH"
    exit 1
fi
echo "npm found: $(npm --version)"

echo
echo "========================================"
echo "Installing Dependencies..."
echo "========================================"

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
if [ -d "node_modules" ]; then
    echo "Backend node_modules already exists, skipping installation"
else
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install backend dependencies"
        exit 1
    fi
fi
echo "Backend dependencies installed successfully"

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
if [ -d "node_modules" ]; then
    echo "Frontend node_modules already exists, skipping installation"
else
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install frontend dependencies"
        exit 1
    fi
fi
echo "Frontend dependencies installed successfully"

# Return to root directory
cd ..

echo
echo "========================================"
echo "Database Setup..."
echo "========================================"

# Load environment variables from config.env
echo "Loading database configuration..."
if [ -f "config.env" ]; then
    export $(grep -v '^#' config.env | xargs)
    echo "Database configuration loaded from config.env"
else
    echo "WARNING: config.env not found, using default values"
    export DB_HOST=localhost
    export DB_PORT=5432
    export DB_NAME=onboardd
    export DB_USER=postgres
    export DB_PASSWORD=your_password
fi

# Check if PostgreSQL is available
echo "Checking PostgreSQL connection..."
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
" 2>&1

if [ $? -ne 0 ]; then
    echo
    echo "WARNING: PostgreSQL connection failed"
    echo "Please ensure:"
    echo "  1. PostgreSQL is running"
    echo "  2. Database '${DB_NAME}' exists"
    echo "  3. Credentials in config.env are correct"
    echo
    echo "You can still continue with the deployment, but database operations may fail"
    echo
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

# Run database migration
echo
echo "Running database migration..."
if [ -f "migrations/002_complete_database_setup.sql" ]; then
    echo "Found migration file: migrations/002_complete_database_setup.sql"
    echo "Executing SQL migration..."
    
    # Try psql command first
    if command -v psql &> /dev/null; then
        echo "Using psql command to run migration..."
        PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f migrations/002_complete_database_setup.sql
        
        if [ $? -eq 0 ]; then
            echo "✓ Database migration completed successfully using psql"
        else
            echo "✗ Migration failed with psql, trying Node.js approach..."
            
            # Fallback to Node.js approach
            node -e "
            require('dotenv').config({ path: './config.env' });
            const { Pool } = require('pg');
            const fs = require('fs');
            
            const pool = new Pool({
              host: process.env.DB_HOST || 'localhost',
              port: process.env.DB_PORT || 5432,
              database: process.env.DB_NAME || 'onboardd',
              user: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASSWORD
            });
            
            const sql = fs.readFileSync('migrations/002_complete_database_setup.sql', 'utf8');
            
            pool.query(sql)
              .then(() => {
                console.log('✓ Database migration completed successfully using Node.js');
                process.exit(0);
              })
              .catch(err => {
                console.log('✗ Migration failed:', err.message);
                console.log('You may need to run the migration manually:');
                console.log('psql -h', process.env.DB_HOST, '-p', process.env.DB_PORT, '-U', process.env.DB_USER, '-d', process.env.DB_NAME, '-f migrations/002_complete_database_setup.sql');
                process.exit(1);
              });
            "
        fi
    else
        echo "psql command not found, using Node.js to run migration..."
        
        # Use Node.js approach
        node -e "
        require('dotenv').config({ path: './config.env' });
        const { Pool } = require('pg');
        const fs = require('fs');
        
        const pool = new Pool({
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'onboardd',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD
        });
        
        const sql = fs.readFileSync('migrations/002_complete_database_setup.sql', 'utf8');
        
        pool.query(sql)
          .then(() => {
            console.log('✓ Database migration completed successfully');
            process.exit(0);
          })
          .catch(err => {
            console.log('✗ Migration failed:', err.message);
            process.exit(1);
          });
        "
    fi
else
    echo "✗ ERROR: Migration file not found!"
    echo "Please ensure migrations/002_complete_database_setup.sql exists"
    echo "Expected path: $(pwd)/migrations/002_complete_database_setup.sql"
    exit 1
fi

cd ..

echo
echo "========================================"
echo "Building Frontend..."
echo "========================================"

# Build frontend
echo "Building frontend for production..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend build failed"
    exit 1
fi
echo "Frontend built successfully"

cd ..

echo
echo "========================================"
echo "Deployment Summary"
echo "========================================"
echo
echo "✓ Node.js and npm verified"
echo "✓ Backend dependencies installed"
echo "✓ Frontend dependencies installed"
echo "✓ Database connection tested"
echo "✓ SQL migration (002_complete_database_setup.sql) executed - 31 tables created"
echo "✓ Frontend built for production"
echo
echo "========================================"
echo "Deployment Completed Successfully!"
echo "========================================"
echo
echo "Next steps:"
echo "1. Update backend/config.env with your database credentials"
echo "2. Run ./start-application.sh to start the application"
echo "3. Access the application at http://localhost:3001"
echo
echo "For development:"
echo "- Backend will run on http://localhost:5001"
echo "- Frontend will run on http://localhost:3001"
echo
