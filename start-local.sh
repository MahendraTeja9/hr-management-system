#!/bin/bash

# Local Development Startup Script
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

# Start the local development environment
echo "🐳 Starting Docker containers for local development..."
docker-compose -f docker-compose.local.yml up --build

echo "✅ Local development environment started!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5001"
echo "🗄️  Database: localhost:5432"
