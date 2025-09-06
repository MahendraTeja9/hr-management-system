@echo off
echo 🔧 Fixing all API URLs in frontend components...
echo.

REM Fix AuthContext.js - Remove /api from baseURL
echo 📝 Fixing AuthContext.js...
powershell -Command "(Get-Content 'frontend\src\contexts\AuthContext.js') -replace 'http://149.102.158.71:5008/api', 'http://149.102.158.71:5008' | Set-Content 'frontend\src\contexts\AuthContext.js'"
echo ✅ AuthContext.js updated

REM Fix all component files - Add /api prefix to paths
echo 📝 Fixing component files...

REM AttendancePortal.js
powershell -Command "(Get-Content 'frontend\src\components\AttendancePortal.js') -replace '`"/attendance/', '`"/api/attendance/' | Set-Content 'frontend\src\components\AttendancePortal.js'"
echo ✅ AttendancePortal.js updated

REM ManagerAttendance.js
powershell -Command "(Get-Content 'frontend\src\components\ManagerAttendance.js') -replace '`"/attendance/', '`"/api/attendance/' | Set-Content 'frontend\src\components\ManagerAttendance.js'"
echo ✅ ManagerAttendance.js updated

REM EmployeeDashboard.js
powershell -Command "(Get-Content 'frontend\src\components\EmployeeDashboard.js') -replace '`"/attendance/', '`"/api/attendance/' | Set-Content 'frontend\src\components\EmployeeDashboard.js'"
echo ✅ EmployeeDashboard.js updated

REM AttendanceStats.js
powershell -Command "(Get-Content 'frontend\src\components\AttendanceStats.js') -replace '`"/attendance/', '`"/api/attendance/' | Set-Content 'frontend\src\components\AttendanceStats.js'"
echo ✅ AttendanceStats.js updated

REM HRAttendanceDetails.js
powershell -Command "(Get-Content 'frontend\src\components\HRAttendanceDetails.js') -replace '`"/attendance/', '`"/api/attendance/' | Set-Content 'frontend\src\components\HRAttendanceDetails.js'"
echo ✅ HRAttendanceDetails.js updated

REM HRDashboard.js
powershell -Command "(Get-Content 'frontend\src\components\HRDashboard.js') -replace '`"/hr/', '`"/api/hr/' | Set-Content 'frontend\src\components\HRDashboard.js'"
echo ✅ HRDashboard.js updated

REM EmployeeCRUD.js
powershell -Command "(Get-Content 'frontend\src\components\EmployeeCRUD.js') -replace '`"/hr/', '`"/api/hr/' | Set-Content 'frontend\src\components\EmployeeCRUD.js'"
echo ✅ EmployeeCRUD.js updated

REM ManagerDashboard.js
powershell -Command "(Get-Content 'frontend\src\components\ManagerDashboard.js') -replace '`"/hr/', '`"/api/hr/' | Set-Content 'frontend\src\components\ManagerDashboard.js'"
powershell -Command "(Get-Content 'frontend\src\components\ManagerDashboard.js') -replace '`"/attendance/', '`"/api/attendance/' | Set-Content 'frontend\src\components\ManagerDashboard.js'"
powershell -Command "(Get-Content 'frontend\src\components\ManagerDashboard.js') -replace '`"/leave/', '`"/api/leave/' | Set-Content 'frontend\src\components\ManagerDashboard.js'"
echo ✅ ManagerDashboard.js updated

REM LeaveManagement.js
powershell -Command "(Get-Content 'frontend\src\components\LeaveManagement.js') -replace '`"/leave/', '`"/api/leave/' | Set-Content 'frontend\src\components\LeaveManagement.js'"
echo ✅ LeaveManagement.js updated

REM HRLeaveManagement.js
powershell -Command "(Get-Content 'frontend\src\components\HRLeaveManagement.js') -replace '`"/leave/', '`"/api/leave/' | Set-Content 'frontend\src\components\HRLeaveManagement.js'"
echo ✅ HRLeaveManagement.js updated

REM ExpenseManagement.js
powershell -Command "(Get-Content 'frontend\src\components\ExpenseManagement.js') -replace '`"/expense/', '`"/api/expense/' | Set-Content 'frontend\src\components\ExpenseManagement.js'"
echo ✅ ExpenseManagement.js updated

REM HRExpenseManagement.js
powershell -Command "(Get-Content 'frontend\src\components\HRExpenseManagement.js') -replace '`"/expense/', '`"/api/expense/' | Set-Content 'frontend\src\components\HRExpenseManagement.js'"
echo ✅ HRExpenseManagement.js updated

REM DocumentUpload.js
powershell -Command "(Get-Content 'frontend\src\components\DocumentUpload.js') -replace '`"/documents/', '`"/api/documents/' | Set-Content 'frontend\src\components\DocumentUpload.js'"
echo ✅ DocumentUpload.js updated

REM HRDocumentCollection.js
powershell -Command "(Get-Content 'frontend\src\components\HRDocumentCollection.js') -replace '`"/hr/', '`"/api/hr/' | Set-Content 'frontend\src\components\HRDocumentCollection.js'"
powershell -Command "(Get-Content 'frontend\src\components\HRDocumentCollection.js') -replace '`"/documents/', '`"/api/documents/' | Set-Content 'frontend\src\components\HRDocumentCollection.js'"
echo ✅ HRDocumentCollection.js updated

REM OnboardingForm.js
powershell -Command "(Get-Content 'frontend\src\components\OnboardingForm.js') -replace '`"/employee/', '`"/api/employee/' | Set-Content 'frontend\src\components\OnboardingForm.js'"
echo ✅ OnboardingForm.js updated

REM EmployeeOnboardingStatus.js
powershell -Command "(Get-Content 'frontend\src\components\EmployeeOnboardingStatus.js') -replace '`"/employee/', '`"/api/employee/' | Set-Content 'frontend\src\components\EmployeeOnboardingStatus.js'"
echo ✅ EmployeeOnboardingStatus.js updated

REM HRConfig.js
powershell -Command "(Get-Content 'frontend\src\components\HRConfig.js') -replace '`"/hr-config/', '`"/api/hr-config/' | Set-Content 'frontend\src\components\HRConfig.js'"
echo ✅ HRConfig.js updated

echo.
echo 🎉 All API URLs have been fixed!
echo.
echo 📋 Summary of changes:
echo    - AuthContext.js: Removed /api from baseURL
echo    - All components: Added /api prefix to API paths
echo.
echo 🚀 Next steps:
echo    1. Test locally: npm start (frontend) + npm start (backend)
echo    2. Commit changes: git add . && git commit -m "Fix API URL concatenation"
echo    3. Push to GitHub: git push origin main
echo    4. On server: git pull && docker-compose build frontend && docker-compose up -d
echo.
pause
