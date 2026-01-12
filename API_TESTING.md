# 🧪 API Testing Scripts

Complete collection of curl commands for testing the betting exchange API.

---

## Prerequisites

1. Docker containers running: `docker-compose up -d`
2. Backend running: `cd backend && npm run start:dev`
3. Base URL: `http://localhost:4000/api`

---

## Test Scenario 1: Single User Flow

### Step 1: Register
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "username": "alice",
    "password": "Alice123"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "alice@example.com",
    "username": "alice",
    "balance": 1000,
    "escrowBalance": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token!** Export it:
```bash
export ALICE_TOKEN="paste-token-here"
```

### Step 2: Check Balance
```bash
curl http://localhost:4000/api/wallet/balance \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:**
```json
{
  "balance": 1000,
  "escrowBalance": 0,
  "availableBalance": 1000
}
```

### Step 3: Deposit Funds
```bash
curl -X POST http://localhost:4000/api/wallet/deposit \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500}'
```

**Expected Response:**
```json
{
  "balance": 1500,
  "transaction": {
    "id": "...",
    "type": "DEPOSIT",
    "amount": 500,
    "balanceBefore": 1000,
    "balanceAfter": 1500
  }
}
```

### Step 4: View Transaction History
```bash
curl http://localhost:4000/api/wallet/transactions \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

---

## Test Scenario 2: Complete Bet Flow (Two Users)

### Setup: Create Two Users

**User 1 - Alice (Backer)**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@betting.com",
    "username": "alice_backer",
    "password": "Alice2024!"
  }'

# Save token
export ALICE_TOKEN="..."
```

**User 2 - Bob (Layer)**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@betting.com",
    "username": "bob_layer",
    "password": "Bob2024!"
  }'

# Save token
export BOB_TOKEN="..."
```

### Alice Creates a BACK Bet
```bash
curl -X POST http://localhost:4000/api/bets \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "premier-league-2024-match-42",
    "matchTitle": "Manchester United vs Liverpool",
    "matchStartTime": "2026-02-15T15:00:00Z",
    "betType": "BACK",
    "outcome": "HOME_WIN",
    "odds": 2.5,
    "stake": 100,
    "isPublic": true
  }'
```

**Expected Response:**
```json
{
  "bet": {
    "id": "bet-abc-123",
    "betType": "BACK",
    "outcome": "HOME_WIN",
    "odds": 2.5,
    "stake": 100,
    "liability": 100,
    "status": "PENDING"
  },
  "challengeLink": null
}
```

**Save the bet ID:**
```bash
export BET_ID="paste-bet-id-here"
```

### Check Available Bets (Bob's View)
```bash
curl http://localhost:4000/api/bets/available \
  -H "Authorization: Bearer $BOB_TOKEN"
```

### Bob Accepts the Bet (LAY)
```bash
curl -X POST http://localhost:4000/api/bets/accept \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"betId\": \"$BET_ID\"}"
```

**Expected Response:**
```json
{
  "originalBet": {
    "id": "...",
    "status": "MATCHED",
    "matchedBetId": "..."
  },
  "matchedBet": {
    "id": "...",
    "betType": "LAY",
    "liability": 150
  },
  "escrow": {
    "id": "...",
    "totalHeld": 250,
    "status": "HOLDING"
  }
}
```

### Verify Escrow (Both Users)
```bash
# Alice's balance
curl http://localhost:4000/api/wallet/balance \
  -H "Authorization: Bearer $ALICE_TOKEN"
# escrowBalance should be 100

# Bob's balance
curl http://localhost:4000/api/wallet/balance \
  -H "Authorization: Bearer $BOB_TOKEN"
# escrowBalance should be 150
```

### View My Bets
```bash
# Alice's bets
curl http://localhost:4000/api/bets/my-bets \
  -H "Authorization: Bearer $ALICE_TOKEN"

# Bob's bets
curl http://localhost:4000/api/bets/my-bets \
  -H "Authorization: Bearer $BOB_TOKEN"
```

---

## Test Scenario 3: Private Challenge

### Alice Creates Private Challenge
```bash
curl -X POST http://localhost:4000/api/bets \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "champions-league-final",
    "matchTitle": "Real Madrid vs Bayern Munich",
    "matchStartTime": "2026-05-30T19:00:00Z",
    "betType": "BACK",
    "outcome": "HOME_WIN",
    "odds": 3.0,
    "stake": 200,
    "isPublic": false
  }'
```

**Response includes:**
```json
{
  "bet": {...},
  "challengeLink": "http://localhost:3000/challenge/bet-xyz789"
}
```

### Bob Accesses Challenge Link
```bash
# Get challenge details
curl http://localhost:4000/api/bets/challenge/bet-xyz789 \
  -H "Authorization: Bearer $BOB_TOKEN"

# Accept challenge
curl -X POST http://localhost:4000/api/bets/accept \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"betId": "..."}'
```

---

## Test Scenario 4: Edge Cases & Error Handling

### Test 1: Insufficient Balance
```bash
curl -X POST http://localhost:4000/api/bets \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "test",
    "matchTitle": "Test Match",
    "matchStartTime": "2026-12-31T23:59:59Z",
    "betType": "BACK",
    "outcome": "HOME_WIN",
    "odds": 2.0,
    "stake": 999999,
    "isPublic": true
  }'
```

**Expected:** 400 Bad Request - "Insufficient balance"

### Test 2: Accept Own Bet
```bash
# Alice tries to accept her own bet
curl -X POST http://localhost:4000/api/bets/accept \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"betId\": \"$BET_ID\"}"
```

**Expected:** 400 Bad Request - "You cannot accept your own bet"

### Test 3: Accept Already Matched Bet
```bash
# Try to accept the same bet twice
curl -X POST http://localhost:4000/api/bets/accept \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"betId\": \"$BET_ID\"}"
```

**Expected:** 409 Conflict - "This bet is no longer available"

### Test 4: Invalid Bet Data
```bash
curl -X POST http://localhost:4000/api/bets \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "test",
    "matchTitle": "Test",
    "matchStartTime": "invalid-date",
    "betType": "INVALID",
    "outcome": "HOME_WIN",
    "odds": 0.5,
    "stake": -100
  }'
```

**Expected:** 400 Bad Request with validation errors

### Test 5: Unauthorized Access
```bash
curl http://localhost:4000/api/wallet/balance
# No Authorization header
```

**Expected:** 401 Unauthorized

---

## Test Scenario 5: Concurrent Bet Acceptance (Load Test)

### Setup: Create One Bet
```bash
curl -X POST http://localhost:4000/api/bets \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "load-test",
    "matchTitle": "Load Test Match",
    "matchStartTime": "2026-12-31T23:59:59Z",
    "betType": "BACK",
    "outcome": "HOME_WIN",
    "odds": 2.0,
    "stake": 100,
    "isPublic": true
  }'

export LOAD_TEST_BET_ID="..."
```

### Simulate 10 Concurrent Acceptances (PowerShell)
```powershell
$BET_ID = "paste-bet-id-here"
$BOB_TOKEN = "paste-bob-token"

1..10 | ForEach-Object -Parallel {
  curl -X POST http://localhost:4000/api/bets/accept `
    -H "Authorization: Bearer $using:BOB_TOKEN" `
    -H "Content-Type: application/json" `
    -d "{`"betId`": `"$using:BET_ID`"}"
} -ThrottleLimit 10
```

**Expected Result:**
- First request: 200 OK - Bet matched
- All others: 409 Conflict - "This bet is currently being processed" or "Bet is no longer available"

This proves the **Redis locking works!** 🎉

---

## Test Scenario 6: Full Lifecycle

### Complete Flow Script (PowerShell)
```powershell
# 1. Create Alice
$alice = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"alice@test.local","username":"alice_test","password":"Test1234"}'

$ALICE_TOKEN = $alice.token

# 2. Create Bob
$bob = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"bob@test.local","username":"bob_test","password":"Test1234"}'

$BOB_TOKEN = $bob.token

# 3. Alice creates bet
$bet = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/bets" `
  -Headers @{Authorization="Bearer $ALICE_TOKEN"} `
  -ContentType "application/json" `
  -Body '{
    "matchId":"test-123",
    "matchTitle":"Test Match",
    "matchStartTime":"2026-12-31T23:59:59Z",
    "betType":"BACK",
    "outcome":"HOME_WIN",
    "odds":2.0,
    "stake":100,
    "isPublic":true
  }'

$BET_ID = $bet.bet.id
Write-Host "Bet created: $BET_ID"

# 4. Bob accepts
$match = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/bets/accept" `
  -Headers @{Authorization="Bearer $BOB_TOKEN"} `
  -ContentType "application/json" `
  -Body "{`"betId`":`"$BET_ID`"}"

Write-Host "Bet matched! Escrow created."

# 5. Check balances
$aliceBalance = Invoke-RestMethod -Uri "http://localhost:4000/api/wallet/balance" `
  -Headers @{Authorization="Bearer $ALICE_TOKEN"}

$bobBalance = Invoke-RestMethod -Uri "http://localhost:4000/api/wallet/balance" `
  -Headers @{Authorization="Bearer $BOB_TOKEN"}

Write-Host "Alice escrow: $($aliceBalance.escrowBalance)"
Write-Host "Bob escrow: $($bobBalance.escrowBalance)"
```

---

## Test Scenario 7: Negative Balance Protection

### Try to Withdraw More Than Available
```bash
curl -X POST http://localhost:4000/api/wallet/withdraw \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 999999}'
```

**Expected:** 400 Bad Request - "Insufficient balance"

---

## Useful Testing Tools

### Save Tokens to File (PowerShell)
```powershell
$ALICE_TOKEN | Out-File -FilePath "alice_token.txt"
$BOB_TOKEN | Out-File -FilePath "bob_token.txt"

# Load later
$ALICE_TOKEN = Get-Content "alice_token.txt"
```

### Pretty Print JSON Responses
```bash
# Add | jq at the end (requires jq installed)
curl http://localhost:4000/api/bets/available | jq
```

### Save Response to File
```bash
curl http://localhost:4000/api/bets/available > response.json
```

---

## Monitoring During Tests

### Watch PostgreSQL Logs
```bash
docker-compose logs -f postgres
```

### Watch Redis Keys
```bash
docker exec -it betting_redis redis-cli MONITOR
```

### Watch Backend Logs
Backend logs appear in the terminal where you ran `npm run start:dev`

---

## Expected Database State After Tests

### After Complete Bet Flow:
```sql
-- Check users
SELECT id, username, balance, "escrowBalance" FROM users;

-- Check bets
SELECT id, "betType", status, stake, liability FROM bets;

-- Check escrow
SELECT id, "totalHeld", status FROM escrow;

-- Check transactions
SELECT "userId", type, amount FROM transactions ORDER BY "createdAt" DESC;
```

Run in pgAdmin or:
```bash
docker exec -it betting_postgres psql -U postgres -d betting_exchange
```

---

**Happy Testing!** 🧪

These scripts will help you verify that all the complex locking and transaction logic works correctly.
