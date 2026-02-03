#!/bin/bash
set -euo pipefail

echo "🧪 Testing Full Booking Flow (API)"

API_URL="http://localhost:5000/api/v1"

echo "1️⃣ Fetching events..."
EVENT_ID=$(curl -s "$API_URL/events" | jq -r '.data[0]._id')
if [[ -z "$EVENT_ID" || "$EVENT_ID" == "null" ]]; then
  echo "No events found. Please seed an event first."
  exit 1
fi
echo "   Event ID: $EVENT_ID"

echo "2️⃣ Getting seat availability..."
SEAT_ID=$(curl -s "$API_URL/seats/event/$EVENT_ID/status" | jq -r '.data[0].seatId')
if [[ -z "$SEAT_ID" || "$SEAT_ID" == "null" ]]; then
  echo "No seats available for this event."
  exit 1
fi
echo "   First available seat: $SEAT_ID"

echo "3️⃣ Holding seats..."
SESSION_ID="test_session_$(date +%s)"
HOLD_RESPONSE=$(curl -s -X POST "$API_URL/seats/hold" \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"$EVENT_ID\",\"seatIds\":[\"$SEAT_ID\"],\"sessionId\":\"$SESSION_ID\"}")
HOLD_ID=$(echo "$HOLD_RESPONSE" | jq -r '.data.holdId')
echo "   Hold ID: $HOLD_ID"

echo "4️⃣ Creating checkout intent..."
ORDER_RESPONSE=$(curl -s -X POST "$API_URL/orders/checkout-intent" \
  -H "Content-Type: application/json" \
  -d "{
    \"eventId\":\"$EVENT_ID\",
    \"seatIds\":[\"$SEAT_ID\"],
    \"customerInfo\":{
      \"email\":\"test@example.com\",
      \"firstName\":\"Test\",
      \"lastName\":\"User\"
    },
    \"sessionId\":\"$SESSION_ID\"
  }")
ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data.orderId')
echo "   Order ID: $ORDER_ID"

echo "✅ Flow completed (manual verification of payment status may still be required)."
