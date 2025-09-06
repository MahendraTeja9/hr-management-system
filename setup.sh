#!/bin/bash

# HR Management System Setup Script
echo "🏢 HR Management System Setup"
echo "=============================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Ask user for environment choice
echo ""
echo "🌍 Choose your environment:"
echo "1) Local Development (localhost)"
echo "2) Production (server deployment)"
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo "🔧 Setting up for Local Development..."
        
        # Copy environment files
        if [ ! -f ".env" ]; then
            cp env.local.example .env
            echo "✅ Created .env file for local development"
        fi
        
        if [ ! -f "frontend/.env" ]; then
            cp frontend/env.local.example frontend/.env
            echo "✅ Created frontend/.env file for local development"
        fi
        
        echo ""
        echo "🚀 Starting local development environment..."
        echo "This will start:"
        echo "  - PostgreSQL database on localhost:5432"
        echo "  - Backend API on localhost:5008"
        echo "  - Frontend will be available after build"
        echo ""
        
        docker-compose -f docker-compose.local.yml up --build
        ;;
    2)
        echo "🏭 Setting up for Production..."
        
        # Copy environment files
        if [ ! -f ".env" ]; then
            cp env.production.example .env
            echo "✅ Created .env file for production"
        fi
        
        if [ ! -f "frontend/.env" ]; then
            cp frontend/env.production.example frontend/.env
            echo "✅ Created frontend/.env file for production"
        fi
        
        echo ""
        echo "🚀 Starting production environment..."
        echo "This will start:"
        echo "  - PostgreSQL database container"
        echo "  - Backend API on port 5008"
        echo "  - Frontend on port 3008"
        echo ""
        
        docker-compose up --build
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again and choose 1 or 2."
        exit 1
        ;;
esac

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 For more information, see DUAL_ENVIRONMENT_SETUP.md"