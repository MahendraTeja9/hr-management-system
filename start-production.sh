#!/bin/bash

# Production Startup Script
echo "🚀 Starting HR Management System in Production Mode..."

# Check if .env files exist, if not copy from examples
if [ ! -f ".env" ]; then
    echo "📋 Creating .env file from production example..."
    cp env.production.example .env
    echo "✅ .env file created. Please review and update if needed."
fi

if [ ! -f "frontend/.env" ]; then
    echo "📋 Creating frontend .env file from production example..."
    cp frontend/env.production.example frontend/.env
    echo "✅ Frontend .env file created. Please review and update if needed."
fi

# Start the production environment
echo "🐳 Starting Docker containers for production..."
docker-compose up --build

echo "✅ Production environment started!"
echo "🌐 Frontend: http://149.102.158.71:3008"
echo "🔧 Backend API: http://149.102.158.71:5008"
echo "🗄️  Database: postgres:5432"
