#!/bin/bash

# API Testing Script for BirdSphere Backend
# Tests all endpoints and reports issues

echo "=== BirdSphere API Test Suite ==="
echo "Testing backend on http://localhost:5000"
echo "====================================="

BASE_URL="http://localhost:5000"
ERRORS=()

# Test function that captures output and errors
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing: $description... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$http_code" -eq "$expected_status" ] 2>/dev/null; then
        echo "✅ PASS ($http_code)"
    else
        echo "❌ FAIL (Expected: $expected_status, Got: $http_code)"
        ERRORS+=("$description: Expected $expected_status, got $http_code")
        echo "   Response: $body"
    fi
}

# Test function for GET requests that should return data
test_get_endpoint() {
    local endpoint=$1
    local description=$2
    local expected_status=${3:-200}
    
    test_endpoint "GET" "$endpoint" "" "$expected_status" "$description"
}

# Test function for POST requests
test_post_endpoint() {
    local endpoint=$1
    local data=$2
    local description=$3
    local expected_status=${4:-201}
    
    test_endpoint "POST" "$endpoint" "$data" "$expected_status" "$description"
}

echo
echo "1. BASIC HEALTH CHECKS"
echo "======================"
test_get_endpoint "/health" "Health Check"
test_get_endpoint "/api" "API Info"

echo
echo "2. AUTH ENDPOINTS"
echo "================="
test_post_endpoint "/api/auth/register" '{"email":"test@example.com","password":"password123","name":"Test User"}' "User Registration" 400
test_post_endpoint "/api/auth/login" '{"email":"invalid@example.com","password":"wrongpass"}' "Invalid Login" 401
test_get_endpoint "/api/auth/profile" "Get Profile (No Auth)" 401

echo
echo "3. LISTINGS ENDPOINTS"
echo "===================="
test_get_endpoint "/api/listings" "Get All Listings"
test_get_endpoint "/api/listings?query=bird" "Search Listings with Query"
test_post_endpoint "/api/listings" '{"title":"Test Bird","description":"A test listing","price":100}' "Create Listing (No Auth)" 401

echo
echo "4. USER ENDPOINTS"
echo "================="
test_get_endpoint "/api/users/profile" "Get User Profile (No Auth)" 401

echo
echo "5. LOCATION ENDPOINTS"
echo "===================="
test_get_endpoint "/api/location/geocode?address=New%20York" "Geocode Address"
test_get_endpoint "/api/location/reverse?lat=40.7128&lng=-74.0060" "Reverse Geocode"  
test_get_endpoint "/api/location/nearby?latitude=40.7128&longitude=-74.0060&radius=10" "Find Nearby Listings"

echo
echo "6. MESSAGE ENDPOINTS"
echo "==================="
test_get_endpoint "/api/messages" "Get Messages (No Auth)" 401
test_post_endpoint "/api/messages" '{"recipientId":"123","content":"Test message"}' "Send Message (No Auth)" 401

echo
echo "7. CHAT ENDPOINTS"
echo "================="
test_get_endpoint "/api/chat/rooms" "Get Chat Rooms (No Auth)" 401

echo
echo "8. UPLOAD ENDPOINTS"
echo "==================="
test_get_endpoint "/api/upload/avatar" "Get Avatar (No Auth)" 401

echo
echo "9. API DOCUMENTATION"
echo "===================="
test_get_endpoint "/api-docs/" "Swagger Documentation" 200

echo
echo "=============================="
echo "API TEST SUMMARY"
echo "=============================="

if [ ${#ERRORS[@]} -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Found ${#ERRORS[@]} issues:"
    for error in "${ERRORS[@]}"; do
        echo "   - $error"
    done
fi

echo
echo "Test completed at $(date)"