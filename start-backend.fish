#!/usr/bin/env fish

# Waitlist Backend Startup Script for Fish Shell

echo "🚀 Starting Waitlist Backend Server..."
echo ""

# Check if virtual environment exists
if not test -d venv
    echo "❌ Virtual environment not found!"
    echo "Creating virtual environment..."
    python3 -m venv venv
end

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate.fish

# Install dependencies if needed
echo "📥 Checking dependencies..."
pip install -q -r requirements.txt

# Navigate to backend directory
cd backend

# Start the server
echo ""
echo "✅ Starting FastAPI server on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""
python main.py
