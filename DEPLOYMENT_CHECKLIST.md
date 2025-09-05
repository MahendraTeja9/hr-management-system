# Quick Deployment Checklist

## Pre-Deployment Checklist

### ✅ Local Machine
- [ ] Code is ready and tested
- [ ] All unnecessary files removed
- [ ] `.gitignore` file created
- [ ] Git repository initialized
- [ ] Code pushed to GitHub

### ✅ Server Preparation
- [ ] SSH access to server (149.102.158.71)
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Git installed
- [ ] Firewall configured (ports 3008, 5008)

### ✅ Files Ready
- [ ] `production.env` file created with secure passwords
- [ ] `onboardd.sql` database dump uploaded
- [ ] `deploy-production.sh` script executable

## Deployment Steps

### 1. GitHub Setup
```bash
git init
git add .
git commit -m "Production-ready HR system"
git remote add origin https://github.com/YOUR_USERNAME/hr-management-system.git
git push -u origin main
```

### 2. Server Setup
```bash
# SSH to server
ssh root@149.102.158.71

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 3. Clone and Deploy
```bash
# Create directory
mkdir -p /opt/hr-system
cd /opt/hr-system

# Clone repository
git clone https://github.com/YOUR_USERNAME/hr-management-system.git .

# Create production.env with secure passwords
nano production.env

# Upload onboardd.sql
nano onboardd.sql

# Deploy
chmod +x deploy-production.sh
./deploy-production.sh
```

### 4. Verify Deployment
```bash
# Check services
docker-compose ps

# Test endpoints
curl http://149.102.158.71:3008
curl http://149.102.158.71:5008/api/health

# Run migrations
docker-compose exec backend node production-migration-runner.js migrate
```

## Access Information

- **Frontend**: http://149.102.158.71:3008
- **Backend**: http://149.102.158.71:5008
- **HR Login**: hr@nxzen.com / hr123
- **Admin Login**: admin@nxzen.com / admin123

## Important Security Notes

1. **Change these passwords in production.env:**
   - `DB_PASSWORD` - Database password
   - `JWT_SECRET` - JWT secret key
   - `SESSION_SECRET` - Session secret

2. **Update email settings:**
   - `SMTP_USER` - Your email
   - `SMTP_PASS` - Your app password

3. **Configure firewall:**
   ```bash
   ufw allow 22    # SSH
   ufw allow 3008  # Frontend
   ufw allow 5008  # Backend
   ufw enable
   ```

## Troubleshooting Commands

```bash
# Check logs
docker-compose logs -f

# Restart services
docker-compose restart

# Check resource usage
docker stats

# Backup database
docker-compose exec postgres pg_dump -U postgres onboardd > backup.sql
```
