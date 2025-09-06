FROM node:20-alpine

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 5008

# Start the application
CMD ["npm", "start"]
