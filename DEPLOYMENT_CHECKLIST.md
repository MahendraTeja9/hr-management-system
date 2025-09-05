# 📋 Deployment Checklist

## Before Starting

- [ ] Download and extract the source code
- [ ] Install Node.js (version 16+)
- [ ] Install PostgreSQL (version 12+)
- [ ] Create database named `onboardd`

## Configuration

- [ ] Open `backend/config.env`
- [ ] Set `DB_PASSWORD` to your PostgreSQL password
- [ ] Optionally set `JWT_SECRET` to a secure random string

## Deployment

- [ ] Run deployment script:
  - Linux/macOS: `./deploy.sh`
  - Windows: `deploy.bat`
- [ ] Wait for "Deployment Completed Successfully!" message
- [ ] Check that all 31 tables were created

## Starting Application

- [ ] Run start script:
  - Linux/macOS: `./start-application.sh`
  - Windows: `start-application.bat`
- [ ] Verify backend starts on port 5001
- [ ] Verify frontend starts on port 3001

## Testing

- [ ] Open http://localhost:3001 in browser
- [ ] Login with HR credentials: `hr@nxzen.com` / `hr123`
- [ ] Verify dashboard loads correctly
- [ ] Test manager login: `strawhatluff124@gmail.com` / `luffy123`

## Post-Setup

- [ ] Change default passwords
- [ ] Add your first employees
- [ ] Configure system settings as needed

## If Something Goes Wrong

1. Check `backend/server.log` for errors
2. Ensure PostgreSQL is running
3. Verify database connection in config.env
4. See DEPLOYMENT_GUIDE.md for detailed troubleshooting

---

**🎉 Ready to use!** Your HR Onboard System is now deployed successfully.
