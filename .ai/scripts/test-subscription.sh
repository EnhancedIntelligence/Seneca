#!/bin/bash

# Test script for subscription-gated API endpoints
# Tests auth flow and subscription requirements

API_BASE="http://localhost:3000/api"

echo "=== Seneca Protocol Subscription Testing ==="
echo ""

# Test 1: No authentication token - expect 401
echo "TEST 1: API call without auth token (expect 401)"
echo "----------------------------------------"
response=$(curl -s -w "\n%{http_code}" "$API_BASE/memories?family_id=test-family")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "401" ]; then
    echo "✅ PASS: Got 401 Unauthorized"
    echo "Response: $body"
else
    echo "❌ FAIL: Expected 401, got $http_code"
    echo "Response: $body"
fi
echo ""

# Test 2: With mock auth token but no subscription - expect 403
echo "TEST 2: API call with auth but no subscription (expect 403)"
echo "----------------------------------------"
echo "Note: This requires a valid auth token from a user without subscription"
echo "To test manually:"
echo "1. Login to get a session token"
echo "2. Make API call with Authorization: Bearer <token>"
echo "3. Should get 403 if user has no active subscription"
echo ""

# Test 3: Dev subscribe endpoint
echo "TEST 3: Testing dev-subscribe endpoint"
echo "----------------------------------------"
echo "Note: This requires a valid auth token"
echo "To test manually:"
echo "1. Login to get a session token"
echo "2. Call POST /api/auth/dev-subscribe with the token"
echo "3. Retry protected endpoints - should now work (200)"
echo ""

# Test health check (should work without auth)
echo "TEST 4: Health check endpoint (no auth required)"
echo "----------------------------------------"
response=$(curl -s -w "\n%{http_code}" "$API_BASE/health-simple")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo "✅ PASS: Health check accessible without auth"
    echo "Response: $body"
else
    echo "❌ FAIL: Health check failed with $http_code"
    echo "Response: $body"
fi
echo ""

echo "=== Test Summary ==="
echo "Protected endpoints require both:"
echo "1. Valid authentication token (401 if missing)"
echo "2. Active subscription (403 if missing/expired)"
echo ""
echo "To complete manual testing:"
echo "1. Create a test user account"
echo "2. Login to get auth token"
echo "3. Test protected endpoint (should get 403)"
echo "4. Call dev-subscribe endpoint"
echo "5. Retry protected endpoint (should get 200)"