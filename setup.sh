#!/bin/bash

echo "🚀 Setting up ONDOARD - Employee Onboarding + Attendance Application"
echo "================================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher first."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5434 &> /dev/null; then
    echo "⚠️  PostgreSQL is not running on port 5434. Please start PostgreSQL first."
    echo "   Make sure you have a database named 'onboard' created."
fi

echo "📦 Installing dependencies..."
npm run install-all

echo "🔧 Setting up environment..."
if [ ! -f "backend/config.env" ]; then
    echo "❌ Please create backend/config.env file with your configuration."
    echo "   See README.md for required environment variables."
    exit 1
fi

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev          # Start both frontend and backend"
echo "   npm run server       # Start backend only"
echo "   npm run client       # Start frontend only"
echo ""
echo "🌐 Access points:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "🔐 Default HR credentials:"
echo "   Email: hr@nxzen.com"
echo "   Password: hr123"
echo ""
echo "📚 For more information, see README.md"
