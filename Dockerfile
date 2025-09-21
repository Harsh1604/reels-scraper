# Use official Playwright image with browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.55.0-jammy

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Expose port (same as in app.js)
EXPOSE 5000

# Start the app
CMD ["node", "app.js"]
