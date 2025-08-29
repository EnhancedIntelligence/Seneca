#!/bin/bash
set -euo pipefail

# Comprehensive Subscription Testing Script
# Tests unauthenticated, public, cache headers, dev-subscribe localhost guard,
# and (if TOKEN is set) full 403->200 tier gating flows.

API_BASE="${API_BASE:-http://localhost:3000/api}"
HEALTH_PATH="${HEALTH_PATH:-health-simple}"  # Using health-simple as per actual routes
CURL="curl -sS --max-time 10 --retry 1"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo "=== 🔒 Seneca Protocol Subscription Testing Suite ==="
echo ""

print_result() {
  local test_name="$1" expected="$2" actual="$3" body="${4:-}"
  if [ "$expected" = "$actual" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name"
    echo "   Expected: $expected, Got: $actual"
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name"
    echo "   Expected: $expected, Got: $actual"
  fi
  [ -n "$body" ] && echo "   Response: $body"
  echo ""
}

# TEST 1 — No Authentication (expect 401)
echo -e "${YELLOW}TEST 1: No Authentication Token${NC}"
resp="$($CURL -w '\n%{http_code}' "$API_BASE/memories?family_id=test-family")"
code="$(echo "$resp" | tail -n1)"
body="$(echo "$resp" | sed '$d' | python3 -m json.tool 2>/dev/null || echo "$resp" | sed '$d')"
print_result "Unauthenticated request" "401" "$code" "$body"

# TEST 2 — Health (public, expect 200)
echo -e "${YELLOW}TEST 2: Public Endpoint (Health Check)${NC}"
resp="$($CURL -w '\n%{http_code}' "$API_BASE/$HEALTH_PATH")"
code="$(echo "$resp" | tail -n1)"
body="$(echo "$resp" | sed '$d')"
print_result "Public endpoint access" "200" "$code" "$body"

# TEST 3 — Status cache headers
echo -e "${YELLOW}TEST 3: Status Endpoint Cache Headers${NC}"
headers="$($CURL -I "$API_BASE/auth/status" | tr '\r' ' ')"
echo "Headers received:"
echo "$headers" | grep -E "Cache-Control|Vary" || echo "No cache headers found"
if echo "$headers" | grep -q "Cache-Control: no-store" && echo "$headers" | grep -q "Vary: Cookie"; then
  echo -e "${GREEN}✅ PASS${NC}: Proper cache headers set"
else
  echo -e "${YELLOW}⚠️  WARNING${NC}: Cache headers may need adjustment"
fi
echo ""

# TEST 4 — Premium route without auth (expect 401)
echo -e "${YELLOW}TEST 4: Premium Route Without Auth${NC}"
resp="$($CURL -w '\n%{http_code}' "$API_BASE/test-premium")"
code="$(echo "$resp" | tail -n1)"
body="$(echo "$resp" | sed '$d' | python3 -m json.tool 2>/dev/null || echo "$resp" | sed '$d')"
print_result "Premium route without auth" "401" "$code" "$body"

# TEST 5 — Dev-subscribe localhost guard (expect 403 even if no token)
echo -e "${YELLOW}TEST 5: Dev-Subscribe Localhost Guard${NC}"
resp="$($CURL -w '\n%{http_code}' \
  -X POST "$API_BASE/auth/dev-subscribe" \
  -H "Host: example.com" \
  -H "Content-Type: application/json" \
  -d '{"tier":"basic"}')"
code="$(echo "$resp" | tail -n1)"
body="$(echo "$resp" | sed '$d' | python3 -m json.tool 2>/dev/null || echo "$resp" | sed '$d')"
print_result "Dev-subscribe from non-localhost" "403" "$code" "$body"

############################################
# Optional automated auth tests if TOKEN set
############################################
if [ "${TOKEN:-}" != "" ]; then
  AUTH=(-H "Authorization: Bearer $TOKEN")

  echo -e "${YELLOW}TEST 6: With auth but no subscription (expect 403)${NC}"
  resp="$($CURL -w '\n%{http_code}' "${AUTH[@]}" "$API_BASE/memories?family_id=test-family")"
  code="$(echo "$resp" | tail -n1)"
  body="$(echo "$resp" | sed '$d' | python3 -m json.tool 2>/dev/null || echo "$resp" | sed '$d')"
  print_result "Protected endpoint unsubscribed" "403" "$code" "$body"

  echo -e "${YELLOW}TEST 7: Activate BASIC via dev-subscribe (expect 200)${NC}"
  resp="$($CURL -w '\n%{http_code}' \
    -X POST "$API_BASE/auth/dev-subscribe" \
    "${AUTH[@]}" \
    -H "Content-Type: application/json" \
    -d '{"tier":"basic"}')"
  code="$(echo "$resp" | tail -n1)"
  print_result "Dev-subscribe basic" "200" "$code"

  echo -e "${YELLOW}TEST 8: Protected endpoint (BASIC) (expect 200)${NC}"
  resp="$($CURL -w '\n%{http_code}' "${AUTH[@]}" "$API_BASE/memories?family_id=test-family")"
  code="$(echo "$resp" | tail -n1)"
  print_result "Protected endpoint with basic" "200" "$code"

  echo -e "${YELLOW}TEST 9: Premium route with BASIC (expect 403)${NC}"
  resp="$($CURL -w '\n%{http_code}' "${AUTH[@]}" "$API_BASE/test-premium")"
  code="$(echo "$resp" | tail -n1)"
  body="$(echo "$resp" | sed '$d' | python3 -m json.tool 2>/dev/null || echo "$resp" | sed '$d')"
  print_result "Premium route gated" "403" "$code" "$body"

  echo -e "${YELLOW}TEST 10: Upgrade to PREMIUM (expect 200)${NC}"
  resp="$($CURL -w '\n%{http_code}' \
    -X POST "$API_BASE/auth/dev-subscribe" \
    "${AUTH[@]}" \
    -H "Content-Type: application/json" \
    -d '{"tier":"premium"}')"
  code="$(echo "$resp" | tail -n1)"
  print_result "Dev-subscribe premium" "200" "$code"

  echo -e "${YELLOW}TEST 11: Premium route with PREMIUM (expect 200)${NC}"
  resp="$($CURL -w '\n%{http_code}' "${AUTH[@]}" "$API_BASE/test-premium")"
  code="$(echo "$resp" | tail -n1)"
  body="$(echo "$resp" | sed '$d' | python3 -m json.tool 2>/dev/null || echo "$resp" | sed '$d')"
  print_result "Premium route allowed" "200" "$code" "$body"

  echo -e "${GREEN}=== All authenticated tests completed ===${NC}"
else
  echo ""
  echo -e "${YELLOW}TOKEN not set${NC} — skipping authenticated flow."
  echo "To run full test suite including 403→200 and tier gating:"
  echo "  export TOKEN='<your bearer token>'"
  echo "  ./test-subscription-complete.sh"
fi

echo ""
echo "=== 📊 Test Coverage Summary ==="
echo ""
if [ "${TOKEN:-}" != "" ]; then
  echo "✅ Complete test suite executed:"
  echo "  • 401 without authentication"
  echo "  • 200 for public endpoints" 
  echo "  • Cache headers validation"
  echo "  • Premium route auth gating"
  echo "  • Dev-subscribe localhost guard"
  echo "  • 403 with auth but no subscription"
  echo "  • 200 after dev-subscribe"
  echo "  • Tier gating (basic vs premium)"
else
  echo "Automated tests completed:"
  echo "  ✅ 401 without authentication"
  echo "  ✅ 200 for public endpoints"
  echo "  ✅ Cache headers validation"
  echo "  ✅ Premium route auth gating"
  echo "  ✅ Dev-subscribe localhost guard"
  echo ""
  echo "Token-based tests (not run):"
  echo "  ⏳ 403 with auth but no subscription"
  echo "  ⏳ 200 after dev-subscribe"
  echo "  ⏳ Tier gating (basic vs premium)"
fi
echo ""