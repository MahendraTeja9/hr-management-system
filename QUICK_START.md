# 🚀 Quick Start Guide - HR Onboard System

## ⚡ Fast Setup (5 Minutes)

### Prerequisites Check

- [ ] Node.js 16+ installed
- [ ] PostgreSQL 12+ installed and running
- [ ] Database `onboardd` created

### Setup Steps

#### 1. Configure Database

```bash
# Edit backend/config.env
DB_PASSWORD=your_postgres_password
```

#### 2. Run Deployment

```bash
# Linux/macOS
./deploy.sh

# Windows
deploy.bat
```

#### 3. Start Application

```bash
# Linux/macOS
./start-application.sh

# Windows
start-application.bat
```

#### 4. Access Application

- **URL**: http://localhost:3001
- **HR Login**: hr@nxzen.com / hr123
- **Manager Login**: strawhatluff124@gmail.com / luffy123

### ✅ Success Indicators

- [ ] See "Deployment Completed Successfully!" message
- [ ] Both frontend (port 3001) and backend (port 5001) running
- [ ] Can login with HR credentials
- [ ] Can see employee dashboard

### 🚨 Common Issues

1. **Database connection failed**: Check PostgreSQL is running
2. **Port in use**: Kill existing processes with `npx kill-port 5001`
3. **npm errors**: Run `npm cache clean --force`

For detailed instructions, see **DEPLOYMENT_GUIDE.md**
