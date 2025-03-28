FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Make the server executable
RUN chmod +x src/index.js

# Set the entrypoint
ENTRYPOINT ["node", "src/index.js"]
