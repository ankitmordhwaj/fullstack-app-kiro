FROM node:20-slim

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for Vite dev server)
RUN npm install

# Copy remaining source files
# (In development the working directory is volume-mounted over this,
#  so this layer mainly matters for production/CI builds)
COPY . .

EXPOSE 3000

# Start Vite dev server bound to all interfaces on port 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
