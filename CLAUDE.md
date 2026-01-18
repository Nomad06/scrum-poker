# Poker Planning Application

## Overview
A real-time planning poker application for agile estimation sessions. Currently being rewritten from Java (Spring Boot) + TypeScript (React/Vite) to Go backend.

## Project Structure
```
poker/
├── backend/           # Go backend (in progress)
│   ├── internal/
│   │   └── models/    # Data models and message types
│   └── go.mod
└── frontend/          # React + TypeScript + Vite (being removed/rewritten)
```

## Tech Stack

### Backend (New - Go)
- Go 1.25+
- WebSocket for real-time communication

### Frontend (Legacy - being replaced)
- React + TypeScript
- Vite
- Tailwind CSS
- Jest for testing
- Cypress for E2E testing

## Key Concepts

### WebSocket Messages
- **Client -> Server**: join, vote, reveal, reset
- **Server -> Client**: sync, error, player_joined, player_left, voted, revealed, reset_done

### Data Models
- `Player`: id, name, avatar, hasVoted, vote, isHost
- `RoomState`: code, players, revealed, currentPlayerId, hostId
- `VotingResult`: votes map, average, revealed flag

## Commands

### Backend
```bash
cd backend
go build ./...
go test ./...
```

## Development Notes
- Project is in transition from Java/React to Go
- WebSocket-based real-time communication
- Room-based multiplayer sessions with host controls
