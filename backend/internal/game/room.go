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
	Code            string
	Players         map[string]*Player
	Revealed        bool
	HostID          string
	CreatedAt       time.Time
	LastActive      time.Time
	ExpiryHours     int
	Scale           *models.VotingScale
	TimerEndTime    *time.Time
	TimerAutoReveal bool
	timerCancel     chan struct{}
	mu              sync.RWMutex
	usedAvatars     map[string]bool
}

// NewRoom creates a new room with the given code
func NewRoom(code string, expiryHours int) *Room {
	// Default to Fibonacci scale
	defaultScale := models.PresetScales[models.ScaleFibonacci]
	return &Room{
		Code:        code,
		Players:     make(map[string]*Player),
		Revealed:    false,
		CreatedAt:   time.Now(),
		LastActive:  time.Now(),
		ExpiryHours: expiryHours,
		Scale:       &defaultScale,
		usedAvatars: make(map[string]bool),
	}
}

// NewRoomWithScale creates a new room with a specific voting scale
func NewRoomWithScale(code string, expiryHours int, scaleType models.VotingScaleType) *Room {
	// Get the requested scale, default to Fibonacci if not found
	scale, ok := models.PresetScales[scaleType]
	if !ok {
		scale = models.PresetScales[models.ScaleFibonacci]
	}

	return &Room{
		Code:        code,
		Players:     make(map[string]*Player),
		Revealed:    false,
		CreatedAt:   time.Now(),
		LastActive:  time.Now(),
		ExpiryHours: expiryHours,
		Scale:       &scale,
		usedAvatars: make(map[string]bool),
	}
}

const MaxPlayers = 30

// AddPlayer adds a player to the room
func (r *Room) AddPlayer(player *Player) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.Players) >= MaxPlayers {
		return false
	}

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

	return true
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

	state := &models.RoomState{
		Code:            r.Code,
		Players:         players,
		Revealed:        r.Revealed,
		CurrentPlayerID: forPlayerID,
		HostID:          r.HostID,
		Scale:           r.Scale,
		TimerAutoReveal: r.TimerAutoReveal,
	}

	// Include timer end time if active
	if r.TimerEndTime != nil && r.TimerEndTime.After(time.Now()) {
		endTimeMs := r.TimerEndTime.UnixMilli()
		state.TimerEndTime = &endTimeMs
	}

	return state
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

// StartTimer starts a voting timer (host only)
func (r *Room) StartTimer(playerID string, durationSec int, autoReveal bool) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Only host can start timer
	if r.HostID != playerID {
		return false
	}

	// Cancel any existing timer
	if r.timerCancel != nil {
		close(r.timerCancel)
	}

	endTime := time.Now().Add(time.Duration(durationSec) * time.Second)
	r.TimerEndTime = &endTime
	r.TimerAutoReveal = autoReveal
	r.timerCancel = make(chan struct{})
	r.LastActive = time.Now()

	return true
}

// StopTimer stops the current timer (host only)
func (r *Room) StopTimer(playerID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Only host can stop timer
	if r.HostID != playerID {
		return false
	}

	if r.timerCancel != nil {
		close(r.timerCancel)
		r.timerCancel = nil
	}
	r.TimerEndTime = nil
	r.TimerAutoReveal = false
	r.LastActive = time.Now()

	return true
}

// GetTimerCancel returns the timer cancel channel
func (r *Room) GetTimerCancel() <-chan struct{} {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.timerCancel
}

// ClearTimer clears the timer state (used after timer ends)
func (r *Room) ClearTimer() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.TimerEndTime = nil
	r.timerCancel = nil
}

// GetScale returns the room's voting scale
func (r *Room) GetScale() *models.VotingScale {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.Scale
}

// SetScale sets the room's voting scale
func (r *Room) SetScale(scale *models.VotingScale) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.Scale = scale
	r.LastActive = time.Now()
}
