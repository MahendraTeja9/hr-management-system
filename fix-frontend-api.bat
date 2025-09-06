@echo off
REM Critical Production Fix - Frontend API Configuration
echo 🚨 CRITICAL: Fixing frontend API configuration...

echo 📋 Current frontend build is using wrong API endpoints
echo 🔧 Frontend requests are going to port 3008 instead of 5008

REM Ensure production environment files exist
if not exist "frontend\.env" (
    echo 📝 Creating frontend .env file...
    echo REACT_APP_API_BASE_URL=http://149.102.158.71:5008/api > frontend\.env
    echo REACT_APP_NODE_ENV=production >> frontend\.env
) else (
    echo 📝 Updating existing frontend .env file...
    echo REACT_APP_API_BASE_URL=http://149.102.158.71:5008/api > frontend\.env
    echo REACT_APP_NODE_ENV=production >> frontend\.env
)

echo ✅ Frontend .env file updated:
type frontend\.env

echo.
echo 🚨 CRITICAL NEXT STEPS:
echo 1. Rebuild the frontend with correct environment variables
echo 2. Restart the containers
echo.
echo Run these commands on your server:
echo   cd frontend
echo   npm run build
echo   cd ..
echo   docker-compose down
echo   docker-compose up --build
echo.
echo 📋 This will fix the API routing issue!

pause
