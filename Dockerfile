# ==========================================
# Stage 1: Build Frontend (Node.js)
# ==========================================
FROM node:20-slim as frontend-builder

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code only (ignore bulky backend files if possible, or just copy all)
COPY . .

# Build the frontend (outputs to /app/out)
RUN npm run build


# ==========================================
# Stage 2: Production Runtime (Python)
# ==========================================
FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies (if any needed for psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the built frontend assets from the previous stage
COPY --from=frontend-builder /app/out ./out

# Copy the backend code
COPY api ./api
COPY .env.example .

# Expose the port (Railway sets $PORT automatically)
EXPOSE 8000

# Start the application
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
