#!/bin/bash

# Local Development Startup Script (Direct Node.js)
echo "🚀 Starting HR Management System in Local Development Mode..."

# Check if .env files exist, if not copy from examples
if [ ! -f ".env" ]; then
    echo "📋 Creating .env file from example..."
    cp env.local.example .env
    echo "✅ .env file created. Please review and update if needed."
fi

if [ ! -f "frontend/.env" ]; then
    echo "📋 Creating frontend .env file from example..."
    cp frontend/env.local.example frontend/.env
    echo "✅ Frontend .env file created. Please review and update if needed."
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if ! pg_isready -h 127.0.0.1 -p 5432 -U postgres &> /dev/null; then
    echo "❌ PostgreSQL is not running or not accessible."
    echo "Please ensure PostgreSQL is running on localhost:5432"
    echo "Database: onboardd, User: postgres, Password: Maahi123"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Install dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Start backend
echo "🔧 Starting backend server..."
cd backend && npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend development server..."
cd frontend && npm start &
FRONTEND_PID=$!

echo "✅ Local development environment started!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5001"
echo "🗄️  Database: 127.0.0.1:5432 (onboardd)"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
