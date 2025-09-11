#!/bin/bash

# BirdSphere Development Restart Script
# This script kills existing processes and starts both frontend and backend in development mode

echo "🔄 Restarting BirdSphere Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local process_name=$2
    
    echo -e "${YELLOW}Checking for processes on port $port ($process_name)...${NC}"
    
    # Find and kill processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo -e "${RED}Killing existing processes on port $port: $pids${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 2
    else
        echo -e "${GREEN}No existing processes found on port $port${NC}"
    fi
}

# Kill existing processes
echo -e "\n${BLUE}🛑 Stopping existing services...${NC}"
kill_port 3000 "Backend API"
kill_port 3002 "Frontend React"

# Kill any nodemon processes
echo -e "${YELLOW}Killing nodemon processes...${NC}"
pkill -f nodemon 2>/dev/null || true

# Kill any node processes related to our project
echo -e "${YELLOW}Killing BirdSphere node processes...${NC}"
pkill -f "birdsphere" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true

# Wait a moment for processes to fully terminate
echo -e "${YELLOW}Waiting for processes to terminate...${NC}"
sleep 3

# Start backend in development mode
echo -e "\n${BLUE}🚀 Starting Backend API (port 3000)...${NC}"
cd /media/jason/Array2/Development/claude/birdsphere
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to initialize...${NC}"
sleep 5

# Start frontend in development mode
echo -e "\n${BLUE}🌐 Starting Frontend React App (port 3002)...${NC}"
cd /media/jason/Array2/Development/claude/birdsphere/frontend
BROWSER=none PORT=3002 npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to initialize...${NC}"
sleep 8

# Check if services are running
echo -e "\n${BLUE}🔍 Checking service status...${NC}"

# Check backend
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend API is running on http://localhost:3000${NC}"
    echo -e "   📚 API Documentation: http://localhost:3000/api-docs"
    echo -e "   🩺 Health Check: http://localhost:3000/health"
else
    echo -e "${RED}❌ Backend API is not responding${NC}"
fi

# Check frontend
if curl -s http://localhost:3002 > /dev/null; then
    echo -e "${GREEN}✅ Frontend React App is running on http://localhost:3002${NC}"
else
    echo -e "${RED}❌ Frontend React App is not responding${NC}"
fi

echo -e "\n${GREEN}🎉 BirdSphere Development Environment Started!${NC}"
echo -e "\n${BLUE}📋 Service Information:${NC}"
echo -e "   🔧 Backend (API):     http://localhost:3000"
echo -e "   🌐 Frontend (React):  http://localhost:3002"
echo -e "   📖 API Docs:          http://localhost:3000/api-docs"
echo -e "\n${YELLOW}💡 Both services are running with nodemon for auto-restart on file changes${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop this script (services will continue running)${NC}"
echo -e "${YELLOW}💡 To stop services manually: pkill -f nodemon${NC}"

# Keep script running to show logs (optional)
echo -e "\n${BLUE}📝 Monitoring logs... (Press Ctrl+C to exit monitoring)${NC}"
wait