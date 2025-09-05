# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Copy production environment file
COPY production.env .env

# Copy SQL dump file
COPY onboardd.sql ./

# Create uploads directory
RUN mkdir -p uploads/documents uploads/expenses logs

# Set permissions
RUN chmod -R 755 uploads logs

# Expose port
EXPOSE 5008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5008/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
