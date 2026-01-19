package game

import (
	"sync"

	"github.com/gorilla/websocket"
	"github.com/poker/backend/internal/models"
	"golang.org/x/time/rate"
)

// Avatars available for players
var Avatars = []string{
	"sheriff",
	"outlaw",
	"cowgirl",
	"prospector",
	"banker",
	"deputy",
	"saloon-owner",
	"bounty-hunter",
}

// Player represents a connected user
type Player struct {
	ID          string
	Name        string
	Avatar      string
	IsHost      bool
	Vote        string
	HasVoted    bool
	Conn        *websocket.Conn
	Room        *Room
	mu          sync.RWMutex
	RateLimiter *rate.Limiter
}

// NewPlayer creates a new player
func NewPlayer(id, name, avatar string, conn *websocket.Conn, isHost bool) *Player {
	return &Player{
		ID:          id,
		Name:        name,
		Avatar:      avatar,
		Conn:        conn,
		HasVoted:    false,
		Vote:        "",
		IsHost:      isHost,
		RateLimiter: rate.NewLimiter(5, 10), // 5 messages/sec, burst 10
	}
}

// ToModel converts player to API model
func (p *Player) ToModel(includeVote bool) *models.Player {
	player := &models.Player{
		ID:       p.ID,
		Name:     p.Name,
		Avatar:   p.Avatar,
		HasVoted: p.HasVoted,
		IsHost:   p.IsHost,
	}
	if includeVote {
		player.Vote = p.Vote
	}
	return player
}

// SendMessage sends a message to the player
func (p *Player) SendMessage(msg *models.ServerMessage) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.Conn.WriteJSON(msg)
}

// ResetVote resets the player's vote
func (p *Player) ResetVote() {
	p.HasVoted = false
	p.Vote = ""
}

// SetVote sets the player's vote
func (p *Player) SetVote(vote string) {
	if vote == "" {
		p.Vote = ""
		p.HasVoted = false
	} else {
		p.Vote = vote
		p.HasVoted = true
	}
}
