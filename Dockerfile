# Use Node.js 18 as base image
FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy project files
COPY . .

# Build the app
RUN yarn build

# Expose the port the app runs on
EXPOSE 10000

# Start the application
CMD ["yarn", "start"]