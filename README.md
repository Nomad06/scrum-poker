# Scrum Poker - Wild West Edition 🤠

A real-time scrum poker application with a fun Wild West theme. Designed for speed and simplicity - no sign-up required, just create a room and share the link!

## Features

- **Instant Room Creation** - No sign-up, just create and share
- **Real-time Updates** - WebSocket-powered live synchronization
- **Wild West Theme** - Cowboy avatars, warm desert colors, western typography
- **Animated Cards** - Smooth card flip animations on reveal
- **Fibonacci Voting** - Standard scale: 1, 2, 3, 5, 8, 13, 21, ?
- **Keyboard Shortcuts** - Vote with number keys for speed
- **Host Controls** - Only host can reveal votes and start new rounds
- **Auto-assigned Avatars** - Each player gets a unique cowboy character
- **Configurable Room Expiry** - Rooms auto-delete after 24h (configurable)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, TailwindCSS, Framer Motion |
| Backend | Go, Gorilla WebSocket, Gin |
| Deployment | Docker, Docker Compose |

## Quick Start

### Development

**Prerequisites:**
- Go 1.21+
- Node.js 18+

**Backend:**
```bash
cd backend
go mod tidy
go run ./cmd/server
# Server runs on http://localhost:8080
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

### Production (Docker)

```bash
docker-compose up --build
# App runs on http://localhost
```

## Project Structure

```
poker/
├── backend/
│   ├── cmd/server/          # Application entry point
│   ├── internal/
│   │   ├── game/            # Room and player logic
│   │   ├── handler/         # HTTP and WebSocket handlers
│   │   └── models/          # Data structures
│   ├── Dockerfile
│   └── go.mod
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks (WebSocket)
│   │   ├── types/           # TypeScript types
│   │   └── index.css        # Western theme styles
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## API Endpoints

### REST

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create a new room |
| GET | `/api/rooms/:code` | Get room info |
| GET | `/api/rooms/:code/check` | Check if room exists |
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Server statistics |

### WebSocket

Connect to `/ws?room=CODE&name=NAME`

**Client → Server Messages:**
- `{ "type": "vote", "vote": "5" }` - Submit vote
- `{ "type": "reveal" }` - Reveal votes (host only)
- `{ "type": "reset" }` - Start new round (host only)

**Server → Client Messages:**
- `sync` - Full room state
- `player_joined` - New player joined
- `player_left` - Player left
- `voted` - Player submitted vote
- `revealed` - Votes revealed with results
- `error` - Error message

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| 1, 2, 3, 5, 8 | Vote with number |
| Q | Vote 13 |
| W | Vote 21 |
| / | Vote ? |
| R | Reveal (host only) |

## Environment Variables

**Backend:**
- `PORT` - Server port (default: 8080)
- `DEFAULT_ROOM_EXPIRY_HOURS` - Room expiry time (default: 24)

## Roadmap

- [x] **Iteration 2**: Custom voting scales, timer, improved animations
- [ ] **Iteration 3**: Optional authentication, persistent rooms
- [ ] **Iteration 4**: Jira/Slack integrations
- [ ] Sound effects

## License

MIT
