# Production Deployment Guide

## Server Information
- **Server IP**: 149.102.158.71
- **Frontend**: http://149.102.158.71:3008
- **Backend API**: http://149.102.158.71:5008
- **Database**: PostgreSQL on port 5432

## Prerequisites

1. **Docker** and **Docker Compose** installed on your Contabo server
2. **aaPanel** configured (optional, for easier management)
3. **onboardd.sql** database dump file
4. **production.env** environment file

## Quick Deployment

### 1. Upload Files to Server
Upload these files to your server:
- `docker-compose.yml`
- `production.env`
- `onboardd.sql`
- `nginx.conf`
- `deploy-production.sh`
- `backend/` directory
- `frontend/` directory

### 2. Configure Environment
Edit `production.env` and update:
```bash
# Change these values
DB_PASSWORD=your_secure_database_password
JWT_SECRET=your_super_secure_jwt_secret_key
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Deploy
```bash
# Make deployment script executable
chmod +x deploy-production.sh

# Run deployment
./deploy-production.sh
```

## Manual Deployment Steps

### 1. Build and Start Services
```bash
# Build and start all services
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Verify Deployment
```bash
# Check if services are running
curl http://149.102.158.71:3008  # Frontend
curl http://149.102.158.71:5008/api/health  # Backend
```

## Default Login Credentials

- **HR User**: hr@nxzen.com / hr123
- **Admin User**: admin@nxzen.com / admin123

## Service Management

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Update Services
```bash
# Pull latest changes and rebuild
docker-compose down
docker-compose up --build -d
```

## Database Management

### Run Migrations
```bash
# Inside backend container
docker-compose exec backend node production-migration-runner.js migrate

# Check migration status
docker-compose exec backend node production-migration-runner.js status
```

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres onboardd > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U postgres onboardd < backup_file.sql
```

## Troubleshooting

### Check Service Health
```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :3008
   sudo netstat -tulpn | grep :5008
   
   # Kill the process
   sudo kill -9 <PID>
   ```

2. **Database Connection Issues**
   ```bash
   # Check if PostgreSQL is running
   docker-compose exec postgres pg_isready -U postgres
   
   # Check database logs
   docker-compose logs postgres
   ```

3. **Frontend Not Loading**
   ```bash
   # Check nginx logs
   docker-compose logs frontend
   
   # Check if backend is accessible
   curl http://149.102.158.71:5008/api/health
   ```

## Security Considerations

1. **Change Default Passwords**
   - Update database password in `production.env`
   - Change JWT secret
   - Update default user passwords

2. **Firewall Configuration**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 3008
   sudo ufw allow 5008
   sudo ufw allow 5432  # Only if you need external DB access
   ```

3. **SSL/HTTPS** (Recommended)
   - Configure reverse proxy with SSL
   - Update CORS origins to use HTTPS

## Monitoring

### Resource Usage
```bash
# Check container resource usage
docker stats

# Check disk usage
docker system df
```

### Log Rotation
```bash
# Configure log rotation in docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables in `production.env`
3. Ensure all required files are present
4. Check server resources (CPU, RAM, Disk)
