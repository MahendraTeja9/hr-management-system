# Complete Deployment Guide: GitHub → Contabo Server

## Prerequisites

### On Your Local Machine:
- Git installed
- GitHub account
- Your project files ready

### On Your Contabo Server:
- Ubuntu/CentOS with root access
- Docker installed
- Docker Compose installed
- aaPanel installed (optional, for easier management)

## Step 1: Push Code to GitHub

### 1.1 Initialize Git Repository
```bash
# In your project directory
git init
git add .
git commit -m "Initial commit: Production-ready HR system"
```

### 1.2 Create GitHub Repository
1. Go to GitHub.com
2. Click "New repository"
3. Name it: `hr-management-system` (or your preferred name)
4. Make it **Private** (recommended for production)
5. Don't initialize with README (you already have files)

### 1.3 Push to GitHub
```bash
# Add remote origin (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/hr-management-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Prepare Your Server

### 2.1 Connect to Your Server
```bash
# SSH into your Contabo server
ssh root@149.102.158.71
```

### 2.2 Install Docker
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2.3 Install Git
```bash
# Install Git
apt install git -y

# Configure Git (optional)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Clone and Deploy

### 3.1 Create Project Directory
```bash
# Create project directory
mkdir -p /opt/hr-system
cd /opt/hr-system
```

### 3.2 Clone Your Repository
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/hr-management-system.git .

# Or if you made it private, use SSH:
# git clone git@github.com:YOUR_USERNAME/hr-management-system.git .
```

### 3.3 Create Production Environment File
```bash
# Create production environment file
nano production.env
```

**Add this content to `production.env`:**
```bash
# Production Environment Configuration
# Server: 149.102.158.71
# Frontend: 149.102.158.71:3008
# Backend: 149.102.158.71:5008

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=onboardd
DB_USER=postgres
DB_PASSWORD=YourSecurePassword123!

# Server Configuration
NODE_ENV=production
PORT=5008
FRONTEND_URL=http://149.102.158.71:3008
BACKEND_URL=http://149.102.158.71:5008

# JWT Configuration
JWT_SECRET=YourSuperSecureJWTSecretKey123456789!
JWT_EXPIRES_IN=7d

# Email Configuration (Update with your SMTP settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
FROM_EMAIL=noreply@nxzen.com
FROM_NAME=NxZen HR System

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/app/uploads

# CORS Configuration
CORS_ORIGIN=http://149.102.158.71:3008

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=YourSessionSecret123456789!

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important:** Change these values:
- `DB_PASSWORD` - Use a strong password
- `JWT_SECRET` - Use a long, random string
- `SMTP_USER` and `SMTP_PASS` - Your email credentials
- `SESSION_SECRET` - Another random string

### 3.4 Add Your Database Dump
```bash
# Upload your onboardd.sql file to the server
# You can use SCP, SFTP, or copy-paste the content

# If using SCP from your local machine:
# scp onboardd.sql root@149.102.158.71:/opt/hr-system/

# Or create the file manually:
nano onboardd.sql
# Paste your database dump content here
```

### 3.5 Make Deployment Script Executable
```bash
# Make deployment script executable
chmod +x deploy-production.sh
```

## Step 4: Deploy the Application

### 4.1 Run Deployment Script
```bash
# Run the deployment script
./deploy-production.sh
```

### 4.2 Manual Deployment (Alternative)
If the script doesn't work, run these commands manually:

```bash
# Stop any existing containers
docker-compose down

# Build and start services
docker-compose up --build -d

# Wait for services to start
sleep 30

# Check service status
docker-compose ps
```

## Step 5: Verify Deployment

### 5.1 Check Service Health
```bash
# Check if all services are running
docker-compose ps

# Check logs
docker-compose logs -f
```

### 5.2 Test Endpoints
```bash
# Test frontend
curl http://149.102.158.71:3008

# Test backend
curl http://149.102.158.71:5008/api/health

# Test database connection
docker-compose exec postgres pg_isready -U postgres -d onboardd
```

### 5.3 Run Database Migrations
```bash
# Run production migrations
docker-compose exec backend node production-migration-runner.js migrate

# Check migration status
docker-compose exec backend node production-migration-runner.js status
```

## Step 6: Configure Firewall

### 6.1 Open Required Ports
```bash
# Install UFW if not installed
apt install ufw -y

# Allow SSH
ufw allow ssh

# Allow HTTP ports
ufw allow 3008
ufw allow 5008

# Enable firewall
ufw enable

# Check status
ufw status
```

## Step 7: Set Up SSL (Optional but Recommended)

### 7.1 Install Certbot
```bash
# Install Certbot
apt install certbot -y
```

### 7.2 Get SSL Certificate
```bash
# Get SSL certificate (replace with your domain if you have one)
# For IP address, you might need to use a service like Cloudflare
certbot certonly --standalone -d your-domain.com
```

## Step 8: Access Your Application

### 8.1 Default Login Credentials
- **HR User**: `hr@nxzen.com` / `hr123`
- **Admin User**: `admin@nxzen.com` / `admin123`

### 8.2 Access URLs
- **Frontend**: http://149.102.158.71:3008
- **Backend API**: http://149.102.158.71:5008
- **API Health Check**: http://149.102.158.71:5008/api/health

## Step 9: Maintenance Commands

### 9.1 Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

### 9.2 Backup Database
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres onboardd > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U postgres onboardd < backup_file.sql
```

### 9.3 View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 9.4 Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

## Troubleshooting

### Common Issues:

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :3008
   netstat -tulpn | grep :5008
   
   # Kill the process
   kill -9 <PID>
   ```

2. **Docker Permission Issues**
   ```bash
   # Add user to docker group
   usermod -aG docker $USER
   # Logout and login again
   ```

3. **Database Connection Issues**
   ```bash
   # Check if PostgreSQL is running
   docker-compose exec postgres pg_isready -U postgres
   
   # Check database logs
   docker-compose logs postgres
   ```

4. **Frontend Not Loading**
   ```bash
   # Check nginx logs
   docker-compose logs frontend
   
   # Check if backend is accessible
   curl http://149.102.158.71:5008/api/health
   ```

## Security Recommendations

1. **Change Default Passwords**
   - Update database password in `production.env`
   - Change JWT secret
   - Update default user passwords

2. **Configure Firewall**
   ```bash
   # Only allow necessary ports
   ufw allow 22    # SSH
   ufw allow 3008  # Frontend
   ufw allow 5008  # Backend
   ```

3. **Regular Updates**
   ```bash
   # Update system packages
   apt update && apt upgrade -y
   
   # Update Docker images
   docker-compose pull
   docker-compose up -d
   ```

## Monitoring

### Check Resource Usage
```bash
# Check container resource usage
docker stats

# Check disk usage
df -h
docker system df
```

### Set Up Log Rotation
Add this to your `docker-compose.yml`:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## Quick Reference Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Run migrations
docker-compose exec backend node production-migration-runner.js migrate

# Backup database
docker-compose exec postgres pg_dump -U postgres onboardd > backup.sql

# Update application
git pull && docker-compose up --build -d
```

Your HR management system is now deployed and ready to use! 🎉
