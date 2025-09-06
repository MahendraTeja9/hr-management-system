@echo off
REM Production Environment Fix Script
echo 🔧 Fixing production environment configuration...

REM Check if we're in production
if "%NODE_ENV%"=="production" (
    echo ✅ Running in production mode
) else (
    echo ⚠️  Not in production mode, setting NODE_ENV=production
    set NODE_ENV=production
)

REM Copy production environment files
if exist "env.production.example" (
    copy env.production.example .env
    echo ✅ Backend .env updated for production
) else (
    echo ❌ env.production.example not found
)

if exist "frontend\env.production.example" (
    copy frontend\env.production.example frontend\.env
    echo ✅ Frontend .env updated for production
) else (
    echo ❌ frontend\env.production.example not found
)

REM Verify the environment files
echo.
echo 📋 Verifying environment configuration:
echo Backend .env:
if exist ".env" (
    findstr "API_BASE_URL" .env
    findstr "CORS_ORIGIN" .env
) else (
    echo ❌ .env file not found
)

echo.
echo Frontend .env:
if exist "frontend\.env" (
    findstr "REACT_APP_API_BASE_URL" frontend\.env
) else (
    echo ❌ frontend\.env file not found
)

echo.
echo 🎉 Production environment configuration complete!
echo 📋 Next steps:
echo 1. Rebuild the frontend: cd frontend && npm run build
echo 2. Restart the backend server
echo 3. Clear browser cache and test

pause
