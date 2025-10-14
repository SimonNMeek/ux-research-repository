FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies
RUN npm install

# Copy source code
COPY mcp-remote-server.js .

# Expose port
EXPOSE 3000

# Start the remote MCP server
CMD ["node", "mcp-remote-server.js"]
