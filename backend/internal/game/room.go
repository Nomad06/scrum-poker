package game

import (
	"math/rand"
	"strconv"
	"sync"
	"time"

	"github.com/poker/backend/internal/models"
)

// Room represents a poker planning room
type Room struct {
	Code       string
	Players    map[string]*Player
	Revealed   bool
	HostID     string
	CreatedAt  time.Time
	LastActive time.Time
	ExpiryHours int
	mu         sync.RWMutex
	usedAvatars map[string]bool
}

// NewRoom creates a new room with the given code
func NewRoom(code string, expiryHours int) *Room {
	return &Room{
		Code:        code,
		Players:     make(map[string]*Player),
		Revealed:    false,
		CreatedAt:   time.Now(),
		LastActive:  time.Now(),
		ExpiryHours: expiryHours,
		usedAvatars: make(map[string]bool),
	}
}

// AddPlayer adds a player to the room
func (r *Room) AddPlayer(player *Player) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Assign avatar
	player.Avatar = r.assignAvatar()

	// First player is the host
	if len(r.Players) == 0 {
		player.IsHost = true
		r.HostID = player.ID
	}

	r.Players[player.ID] = player
	player.Room = r
	r.LastActive = time.Now()
}

// RemovePlayer removes a player from the room
func (r *Room) RemovePlayer(playerID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if player, exists := r.Players[playerID]; exists {
		// Free up the avatar
		r.usedAvatars[player.Avatar] = false
		delete(r.Players, playerID)

		// If host left, assign new host
		if r.HostID == playerID && len(r.Players) > 0 {
			for id, p := range r.Players {
				p.IsHost = true
				r.HostID = id
				break
			}
		}
	}
	r.LastActive = time.Now()
}

// GetPlayer returns a player by ID
func (r *Room) GetPlayer(playerID string) *Player {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.Players[playerID]
}

// assignAvatar assigns an unused avatar to a player
func (r *Room) assignAvatar() string {
	// Find unused avatar
	for _, avatar := range Avatars {
		if !r.usedAvatars[avatar] {
			r.usedAvatars[avatar] = true
			return avatar
		}
	}
	// If all avatars used, assign random one with suffix
	avatar := Avatars[rand.Intn(len(Avatars))]
	return avatar + "-" + strconv.Itoa(rand.Intn(1000))
}

// Vote records a player's vote
func (r *Room) Vote(playerID, vote string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	if player, exists := r.Players[playerID]; exists {
		player.SetVote(vote)
		r.LastActive = time.Now()
		return true
	}
	return false
}

// Reveal reveals all votes (host only)
func (r *Room) Reveal(playerID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Only host can reveal
	if r.HostID != playerID {
		return false
	}

	r.Revealed = true
	r.LastActive = time.Now()
	return true
}

// Reset resets the room for a new round
func (r *Room) Reset() {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.Revealed = false
	for _, player := range r.Players {
		player.ResetVote()
	}
	r.LastActive = time.Now()
}

// GetState returns the current room state
func (r *Room) GetState(forPlayerID string) *models.RoomState {
	r.mu.RLock()
	defer r.mu.RUnlock()

	players := make([]*models.Player, 0, len(r.Players))
	for _, p := range r.Players {
		players = append(players, p.ToModel(r.Revealed))
	}

	return &models.RoomState{
		Code:            r.Code,
		Players:         players,
		Revealed:        r.Revealed,
		CurrentPlayerID: forPlayerID,
		HostID:          r.HostID,
	}
}

// IsEmpty returns true if the room has no players
func (r *Room) IsEmpty() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.Players) == 0
}

// IsExpired returns true if the room has expired
func (r *Room) IsExpired() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return time.Since(r.LastActive) > time.Duration(r.ExpiryHours)*time.Hour
}

// Broadcast sends a message to all players in the room
func (r *Room) Broadcast(msg *models.ServerMessage) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, player := range r.Players {
		player.SendMessage(msg)
	}
}

// BroadcastExcept sends a message to all players except one
func (r *Room) BroadcastExcept(msg *models.ServerMessage, exceptID string) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, player := range r.Players {
		if player.ID != exceptID {
			player.SendMessage(msg)
		}
	}
}

// GetVotingResults calculates voting results
func (r *Room) GetVotingResults() *models.VotingResult {
	r.mu.RLock()
	defer r.mu.RUnlock()

	votes := make(map[string]string)
	var sum float64
	var count int

	for _, player := range r.Players {
		if player.HasVoted {
			votes[player.ID] = player.Vote
			// Try to parse as number for average calculation
			if val, err := strconv.ParseFloat(player.Vote, 64); err == nil {
				sum += val
				count++
			}
		}
	}

	var average float64
	if count > 0 {
		average = sum / float64(count)
	}

	return &models.VotingResult{
		Votes:    votes,
		Average:  average,
		Revealed: r.Revealed,
	}
}

// PlayerCount returns the number of players
func (r *Room) PlayerCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.Players)
}
