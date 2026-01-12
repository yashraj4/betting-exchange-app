# P2P Betting Exchange Platform

A peer-to-peer betting exchange with social features, built to demonstrate enterprise-grade architecture and complex system design.

## 🎯 Project Vision

Unlike traditional sportsbooks where users bet against the house, this platform connects **Backers** (betting FOR an outcome) with **Layers** (betting AGAINST an outcome). The platform acts as a neutral intermediary, holding funds in escrow and facilitating fair settlements.

## 🚀 Key Features

### Core Betting
- **Peer-to-Peer Matching**: Connect users with opposing views on match outcomes
- **Escrow System**: Secure fund holding with atomic transactions
- **Live Odds**: Real-time price discovery based on supply and demand
- **Automated Settlement**: API-driven result verification and payouts

### Social Features (Differentiators)
1. **Direct Challenges**: Create custom bets and share via unique links
2. **Copy-Trading**: Auto-follow profitable bettors with customizable stakes
3. **Order Book**: Stock-market-style trading interface with bid/ask spreads
4. **Leaderboard**: Transparent performance metrics for all users

## 🏗️ Architecture

### Backend
- **NestJS** (TypeScript) - Modular, scalable, enterprise-ready
- **PostgreSQL** - ACID-compliant transaction ledger
- **Redis** - Atomic locks, caching, pub/sub
- **Socket.io** - Real-time bidirectional communication

### Frontend
- **Next.js 14+** - Server-side rendering, App Router
- **TanStack Query** - Efficient data fetching and caching
- **Shadcn/UI** - Professional, accessible components
- **Tailwind CSS** - Utility-first styling

### Infrastructure
- **Docker** - Containerized microservices
- **Nginx** - Reverse proxy and load balancing
- **PM2** - Process management and monitoring

## 🛠️ Technical Highlights

### 1. Concurrency Control
Prevents race conditions using Redis-based distributed locks:
```typescript
// Atomic lock acquisition before bet matching
const lock = await redis.acquireLock(`bet:${betId}`, 5000);
```

### 2. Financial Integrity
PostgreSQL transactions ensure consistency:
```typescript
// All-or-nothing fund transfers
await db.transaction(async (trx) => {
  await debitWallet(userA, amount, trx);
  await creditEscrow(betId, amount, trx);
});
```

### 3. Real-time Updates
Socket.io pushes instant notifications:
```typescript
// Notify users when their bet is matched
io.to(userId).emit('betMatched', betDetails);
```

## 📦 Project Structure

```
gambling_freelancer/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/           # JWT authentication
│   │   ├── users/          # User management
│   │   ├── wallet/         # Financial transactions
│   │   ├── bets/           # Bet creation & matching
│   │   ├── escrow/         # Fund holding
│   │   ├── sports/         # External API integration
│   │   ├── matching/       # Order book engine
│   │   └── websocket/      # Real-time gateway
│   └── docker-compose.yml
├── frontend/               # Next.js app
│   ├── app/
│   │   ├── (auth)/        # Login/Register
│   │   ├── dashboard/     # User dashboard
│   │   ├── bets/          # Bet creation/browsing
│   │   ├── leaderboard/   # Top performers
│   │   └── trading/       # Order book
│   └── components/
└── docs/                  # Additional documentation
```

## 🚦 Getting Started

### Prerequisites
- Node.js 20 LTS
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone and navigate**
```bash
cd e:\gambling_freelancer
```

2. **Backend setup**
```bash
cd backend
npm install
cp .env.example .env
docker-compose up -d 
npm run migration:run
npm run migration:run
npm run dev
```

3. **Frontend setup**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

4. **Access**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Docs: http://localhost:4000/api

## 🧪 Testing

```bash
# Backend unit tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

## 📊 Development Roadmap

- [x] Project setup
- [ ] Phase 1: Core betting engine (MVP)
- [ ] Phase 2: Social features
- [ ] Phase 3: Performance optimization
- [ ] Phase 4: Production deployment

## 🎓 Learning Outcomes

This project demonstrates:
- **Distributed systems** (locking, consistency)
- **Financial transaction safety** (ACID, escrow)
- **Real-time architectures** (WebSockets, pub/sub)
- **Scalable API design** (NestJS modules, caching)
- **Modern frontend** (Next.js 14, Server Components)
- **DevOps practices** (Docker, CI/CD)

## 📝 License

MIT License - feel free to use this for learning or portfolio purposes.

## 🤝 Contributing

This is a portfolio/educational project, but suggestions are welcome!

---

**Built to impress.** 🚀
