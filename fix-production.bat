@echo off
REM Quick Production Fix Script
echo 🔧 Fixing production deployment...

REM Copy production environment files
if exist "env.production.example" (
    copy env.production.example .env
    echo ✅ Backend .env updated for production
)

if exist "frontend\env.production.example" (
    copy frontend\env.production.example frontend\.env
    echo ✅ Frontend .env updated for production
)

echo 🎉 Production environment files updated!
echo 📋 Next steps:
echo 1. Rebuild the frontend: cd frontend && npm run build
echo 2. Restart the backend server
echo 3. Test the application

pause
