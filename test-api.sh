#!/bin/bash

# Production API Test Script
echo "🔍 Testing production API endpoints..."

BASE_URL="http://149.102.158.71:5008"

echo "Testing health endpoint..."
curl -s "$BASE_URL/api/health" | head -1

echo -e "\nTesting auth endpoint..."
curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' | head -1

echo -e "\nTesting attendance endpoint..."
curl -s "$BASE_URL/api/attendance/stats" | head -1

echo -e "\n🎉 API endpoint tests complete!"
