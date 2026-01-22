#!/bin/bash
# ============================================
# PICKLE PLAY API - CRUD Test Script
# ============================================
# Usage: ./api-crud-test.sh [BASE_URL]
# Default: https://pickleball-app-production-9cc2.up.railway.app
# ============================================

BASE_URL="${1:-https://pickleball-app-production-9cc2.up.railway.app}"
PASS=0
FAIL=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "PICKLE PLAY API - CRUD Test Suite"
echo "============================================"
echo "Target: $BASE_URL"
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Helper function for testing
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_status="$4"
    local data="$5"
    local headers="${6:--H Content-Type: application/json}"

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n__STATUS__%{http_code}" --max-time 30 \
            -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${BASE_URL}${endpoint}" 2>/dev/null)
    else
        response=$(curl -s -w "\n__STATUS__%{http_code}" --max-time 30 \
            -X "$method" \
            "${BASE_URL}${endpoint}" 2>/dev/null)
    fi

    body=$(echo "$response" | sed 's/__STATUS__[0-9]*$//')
    status=$(echo "$response" | grep -o '__STATUS__[0-9]*$' | sed 's/__STATUS__//')

    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}[PASS]${NC} $name"
        echo "       Status: $status (expected $expected_status)"
        ((PASS++))
    else
        echo -e "${RED}[FAIL]${NC} $name"
        echo "       Status: $status (expected $expected_status)"
        echo "       Response: $body"
        ((FAIL++))
    fi
}

# ============================================
# 1. DATABASE CONNECTIVITY
# ============================================
echo ""
echo "=== 1. DATABASE CONNECTIVITY ==="
echo ""
test_endpoint "Health Check" "GET" "/health" "200"

# ============================================
# 2. COURTS CRUD
# ============================================
echo ""
echo "=== 2. COURTS CRUD ==="
echo ""

# List courts (should return 200 with empty or populated array)
test_endpoint "List Courts" "GET" "/api/v1/courts" "200"

# List courts with pagination
test_endpoint "List Courts (paginated)" "GET" "/api/v1/courts?page=1&limit=10" "200"

# List courts with geo filter
test_endpoint "List Courts (geo filter)" "GET" "/api/v1/courts?lat=40.7128&lng=-74.0060&radius=25" "200"

# Get non-existent court (should return 404)
test_endpoint "Get Non-existent Court" "GET" "/api/v1/courts/00000000-0000-0000-0000-000000000000" "404"

# Create review without auth (should return 401)
test_endpoint "Create Review (no auth)" "POST" "/api/v1/courts/00000000-0000-0000-0000-000000000000/reviews" "401" '{"rating": 5, "comment": "Test"}'

# ============================================
# 3. GAMES CRUD
# ============================================
echo ""
echo "=== 3. GAMES CRUD ==="
echo ""

# List games
test_endpoint "List Games" "GET" "/api/v1/games" "200"

# List games with filters
test_endpoint "List Games (filtered)" "GET" "/api/v1/games?status=completed&page=1" "200"

# Get recent games
test_endpoint "Recent Games" "GET" "/api/v1/games/recent" "200"

# Get non-existent game (should return 404)
test_endpoint "Get Non-existent Game" "GET" "/api/v1/games/00000000-0000-0000-0000-000000000000" "404"

# Create game without auth (should return 401)
test_endpoint "Create Game (no auth)" "POST" "/api/v1/games" "401" '{"gameType":"singles","team1PlayerIds":["00000000-0000-0000-0000-000000000001"],"team2PlayerIds":["00000000-0000-0000-0000-000000000002"]}'

# Join game without auth (should return 401)
test_endpoint "Join Game (no auth)" "POST" "/api/v1/games/00000000-0000-0000-0000-000000000000/join" "401"

# ============================================
# 4. ERROR HANDLING
# ============================================
echo ""
echo "=== 4. ERROR HANDLING ==="
echo ""

# 404 for non-existent route
test_endpoint "404 Not Found" "GET" "/api/v1/nonexistent" "404"

# Invalid UUID format (should return 400)
test_endpoint "Invalid UUID Format" "GET" "/api/v1/courts/invalid-uuid" "400"

# Invalid query parameter type
test_endpoint "Invalid Query Param" "GET" "/api/v1/courts?page=invalid" "400"

# ============================================
# 5. OTHER ENDPOINTS
# ============================================
echo ""
echo "=== 5. OTHER ENDPOINTS ==="
echo ""

# Users endpoint (requires auth for most operations)
test_endpoint "List Users (no auth)" "GET" "/api/v1/users" "401"

# Matchmaking (requires auth)
test_endpoint "Get Queue (no auth)" "GET" "/api/v1/matchmaking/queue" "401"

# ============================================
# SUMMARY
# ============================================
echo ""
echo "============================================"
echo "TEST SUMMARY"
echo "============================================"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo "Total: $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed. Check the output above.${NC}"
    exit 1
fi
