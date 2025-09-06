FROM node:20-alpine

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Accept build arguments
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_NODE_ENV

# Set environment variables for build
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_NODE_ENV=$REACT_APP_NODE_ENV

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3008

# Start the application
CMD ["serve", "-s", "build", "-l", "3008"]
