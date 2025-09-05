#!/bin/bash

echo "========================================"
echo "   ONBOARD HR System - Starting Application"
echo "========================================"
echo

# Check if Node.js is installed
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if required directories exist
if [ ! -d "backend" ]; then
    echo "ERROR: Backend directory not found"
    echo "Please ensure you are running this script from the project root directory"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo "ERROR: Frontend directory not found"
    echo "Please ensure you are running this script from the project root directory"
    exit 1
fi

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
    echo "ERROR: Backend dependencies not installed"
    echo "Please run ./deploy.sh first to install dependencies"
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "ERROR: Frontend dependencies not installed"
    echo "Please run ./deploy.sh first to install dependencies"
    exit 1
fi

echo
echo "========================================"
echo "Starting Backend Server..."
echo "========================================"

# Start backend server in background
echo "Starting backend server on port 5001..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

echo
echo "========================================"
echo "Starting Frontend Server..."
echo "========================================"

# Start frontend server in background
echo "Starting frontend server on port 3001..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 5

echo
echo "========================================"
echo "Application Started Successfully!"
echo "========================================"
echo
echo "Backend Server: http://localhost:5001"
echo "Frontend Application: http://localhost:3001"
echo
echo "Test Credentials:"
echo "- Employee: test.employee@company.com / test123"
echo "- Manager: (create manager account through HR portal)"
echo
echo "========================================"
echo "Application Status"
echo "========================================"
echo
echo "Checking application status..."

# Check if backend is running
echo "Checking backend server..."
if curl -s http://localhost:5001/api/auth/me > /dev/null 2>&1; then
    echo "✓ Backend server is running"
else
    echo "⚠ Backend server may still be starting up"
fi

# Check if frontend is running
echo "Checking frontend server..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✓ Frontend server is running"
else
    echo "⚠ Frontend server may still be starting up"
fi

echo
echo "========================================"
echo "Next Steps"
echo "========================================"
echo
echo "1. Open your browser and go to: http://localhost:3001"
echo "2. Login with the test credentials"
echo "3. Navigate to the attendance section"
echo
echo "To stop the application:"
echo "- Press Ctrl+C in this terminal"
echo "- Or kill the processes: kill $BACKEND_PID $FRONTEND_PID"
echo
echo "========================================"
echo "Application is ready!"
echo "========================================"
echo

# Function to handle cleanup on script exit
cleanup() {
    echo
    echo "Stopping application servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "Application stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running
echo "Press Ctrl+C to stop the application"
while true; do
    sleep 1
done
