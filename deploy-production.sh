#!/bin/bash

# Production Deployment Script for Contabo Server
# Server IP: 149.102.158.71
# Frontend: 149.102.158.71:3008
# Backend: 149.102.158.71:5008

echo "🚀 Starting Production Deployment..."
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if production.env exists
if [ ! -f "production.env" ]; then
    echo "❌ production.env file not found. Please create it first."
    exit 1
fi

# Check if onboardd.sql exists
if [ ! -f "onboardd.sql" ]; then
    echo "❌ onboardd.sql file not found. Please add your database dump."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images (optional - uncomment if you want to force rebuild)
# echo "🗑️ Removing old images..."
# docker-compose down --rmi all

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🏥 Checking service health..."

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres -d onboardd; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
    exit 1
fi

# Check Backend
if curl -f http://149.102.158.71:5008/api/health > /dev/null 2>&1; then
    echo "✅ Backend API is ready"
else
    echo "❌ Backend API is not ready"
    exit 1
fi

# Check Frontend
if curl -f http://149.102.158.71:3008 > /dev/null 2>&1; then
    echo "✅ Frontend is ready"
else
    echo "❌ Frontend is not ready"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "=================================="
echo "🌐 Frontend: http://149.102.158.71:3008"
echo "🔧 Backend API: http://149.102.158.71:5008"
echo "🗄️ Database: PostgreSQL on port 5432"
echo ""
echo "📋 Default Login Credentials:"
echo "   HR User: hr@nxzen.com / hr123"
echo "   Admin User: admin@nxzen.com / admin123"
echo ""
echo "📊 To check logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 To stop services:"
echo "   docker-compose down"
echo ""
echo "🔄 To restart services:"
echo "   docker-compose restart"
