FROM node:20-alpine

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies (as root)
RUN npm install --omit=dev

# Copy rest of the source
COPY . .

# Create a non-root user with UID 10001 and GID 10001
RUN addgroup -g 10001 appgroup && \
    adduser -D -u 10001 -G appgroup appuser && \
    chown -R appuser:appgroup /app

# Switch to the non-root user (Choreo requirement)
USER 10001

# Expose needed port
EXPOSE 8080

CMD ["node", "server.js"]
