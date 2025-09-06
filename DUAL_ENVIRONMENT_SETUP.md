# HR Management System - Dual Environment Setup

This application is configured to work seamlessly in both **local development** and **production** environments without requiring code changes when switching between environments.

## 🏗️ Architecture Overview

The application uses environment variables to automatically configure:
- Database connections
- API endpoints
- CORS settings
- Email settings
- JWT configuration

## 📁 Environment Files

### Backend Environment Files
- `env.local.example` - Local development configuration
- `env.production.example` - Production configuration

### Frontend Environment Files
- `frontend/env.local.example` - Local development configuration
- `frontend/env.production.example` - Production configuration

## 🚀 Quick Start

### For Local Development

1. **Windows Users:**
   ```bash
   start-local.bat
   ```

2. **Linux/Mac Users:**
   ```bash
   chmod +x start-local.sh
   ./start-local.sh
   ```

3. **Manual Setup:**
   ```bash
   # Copy environment files
   cp env.local.example .env
   cp frontend/env.local.example frontend/.env
   
   # Start local development
   docker-compose -f docker-compose.local.yml up --build
   ```

### For Production Deployment

1. **Linux/Mac Users:**
   ```bash
   chmod +x start-production.sh
   ./start-production.sh
   ```

2. **Manual Setup:**
   ```bash
   # Copy environment files
   cp env.production.example .env
   cp frontend/env.production.example frontend/.env
   
   # Start production
   docker-compose up --build
   ```

## 🔧 Environment Configuration

### Local Development Settings
- **Database:** `127.0.0.1:5432`
- **Backend API:** `http://localhost:5001`
- **Frontend:** `http://localhost:3000`
- **Email:** Disabled (EMAIL_ENABLED=false)

### Production Settings
- **Database:** `postgres:5432` (Docker container)
- **Backend API:** `http://149.102.158.71:5008`
- **Frontend:** `http://149.102.158.71:3008`
- **Email:** Enabled (EMAIL_ENABLED=true)

## 🐳 Docker Compose Files

- `docker-compose.yml` - Production configuration
- `docker-compose.local.yml` - Local development configuration
- `docker-compose-db.yml` - Database-only configuration

## 📋 Environment Variables Reference

### Backend Variables
```bash
NODE_ENV=development|production
PORT=5001|5008
DB_HOST=127.0.0.1|postgres
DB_PORT=5432
DB_NAME=onboardd|onboardd_new
DB_USER=postgres|onboardd_user
DB_PASSWORD=Maahi123
JWT_SECRET=f5229580f156aa586d01e7e2f3c1e491c2c5f9ddad443f624dab69d873928e8d
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000|http://149.102.158.71:3008
EMAIL_ENABLED=false|true
API_BASE_URL=http://localhost:5001/api|http://149.102.158.71:5008/api
```

### Frontend Variables
```bash
REACT_APP_API_BASE_URL=http://localhost:5001/api|http://149.102.158.71:5008/api
REACT_APP_NODE_ENV=development|production
```

## 🔄 Switching Between Environments

### From Local to Production
1. Stop local containers: `docker-compose -f docker-compose.local.yml down`
2. Copy production env files: `cp env.production.example .env && cp frontend/env.production.example frontend/.env`
3. Start production: `docker-compose up --build`

### From Production to Local
1. Stop production containers: `docker-compose down`
2. Copy local env files: `cp env.local.example .env && cp frontend/env.local.example frontend/.env`
3. Start local: `docker-compose -f docker-compose.local.yml up --build`

## 🛠️ Development Workflow

### Making Changes
1. **Always work in local development first**
2. **Test thoroughly in local environment**
3. **Copy environment files to production**
4. **Deploy to production**

### Database Migrations
- Database migrations run automatically on startup
- Both environments use the same migration system
- Production migrations are handled by `ProductionMigration` class

## 🔒 Security Notes

- **Never commit `.env` files to version control**
- **Use `.env.example` files as templates**
- **Review environment variables before deployment**
- **JWT secrets should be different in production**

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Local: Uses ports 3000, 5001, 5432
   - Production: Uses ports 3008, 5008, 5433

2. **Database connection issues:**
   - Check DB_HOST and DB_PORT settings
   - Ensure database container is running

3. **CORS errors:**
   - Verify CORS_ORIGIN matches frontend URL
   - Check REACT_APP_API_BASE_URL in frontend

4. **Email not working:**
   - Check EMAIL_ENABLED setting
   - Verify email credentials

### Logs
- Backend logs: `docker logs onboardd-backend-local` (local) or `docker logs onboardd-backend` (production)
- Database logs: `docker logs onboardd-postgres-local` (local) or `docker logs onboardd-postgres` (production)

## 📞 Support

If you encounter issues:
1. Check the logs first
2. Verify environment variables
3. Ensure all containers are running
4. Check port availability

---

**Important:** This setup ensures your production environment remains unchanged while enabling seamless local development. Always test changes locally before deploying to production.
