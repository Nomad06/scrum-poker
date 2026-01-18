package game

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"strings"
	"sync"
	"time"
)

const emptyRoomGracePeriod = 30 * time.Second

// Hub manages all rooms and connections
type Hub struct {
	Rooms          map[string]*Room
	DefaultExpiry  int // hours
	mu             sync.RWMutex
	cleanupTicker  *time.Ticker
	done           chan struct{}
}

// NewHub creates a new hub
func NewHub(defaultExpiryHours int) *Hub {
	h := &Hub{
		Rooms:         make(map[string]*Room),
		DefaultExpiry: defaultExpiryHours,
		done:          make(chan struct{}),
	}

	// Start cleanup routine
	h.cleanupTicker = time.NewTicker(10 * time.Minute)
	go h.cleanupRoutine()

	return h
}

// CreateRoom creates a new room with a unique code
func (h *Hub) CreateRoom(expiryHours int) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if expiryHours <= 0 {
		expiryHours = h.DefaultExpiry
	}

	code := h.generateRoomCode()
	room := NewRoom(code, expiryHours)
	h.Rooms[code] = room

	log.Printf("Room created: %s (expires in %d hours)", code, expiryHours)
	return room
}

// GetRoom returns a room by code
func (h *Hub) GetRoom(code string) *Room {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.Rooms[strings.ToUpper(code)]
}

// DeleteRoom removes a room
func (h *Hub) DeleteRoom(code string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.Rooms, code)
	log.Printf("Room deleted: %s", code)
}

// ScheduleDeleteIfEmpty schedules room deletion after grace period if still empty
func (h *Hub) ScheduleDeleteIfEmpty(code string) {
	go func() {
		time.Sleep(emptyRoomGracePeriod)
		h.mu.Lock()
		defer h.mu.Unlock()

		if room, exists := h.Rooms[code]; exists && room.IsEmpty() {
			delete(h.Rooms, code)
			log.Printf("Room deleted after grace period: %s", code)
		}
	}()
}

// generateRoomCode creates a unique 6-character room code
func (h *Hub) generateRoomCode() string {
	for {
		bytes := make([]byte, 3)
		rand.Read(bytes)
		code := strings.ToUpper(hex.EncodeToString(bytes))

		// Make sure code doesn't exist
		if _, exists := h.Rooms[code]; !exists {
			return code
		}
	}
}

// cleanupRoutine periodically removes expired and empty rooms
func (h *Hub) cleanupRoutine() {
	for {
		select {
		case <-h.cleanupTicker.C:
			h.cleanup()
		case <-h.done:
			h.cleanupTicker.Stop()
			return
		}
	}
}

// cleanup removes expired and empty rooms
func (h *Hub) cleanup() {
	h.mu.Lock()
	defer h.mu.Unlock()

	for code, room := range h.Rooms {
		if room.IsEmpty() || room.IsExpired() {
			delete(h.Rooms, code)
			log.Printf("Room cleaned up: %s (empty: %v, expired: %v)",
				code, room.IsEmpty(), room.IsExpired())
		}
	}
}

// Stop stops the hub cleanup routine
func (h *Hub) Stop() {
	close(h.done)
}

// RoomCount returns the number of active rooms
func (h *Hub) RoomCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.Rooms)
}

// Stats returns hub statistics
func (h *Hub) Stats() map[string]interface{} {
	h.mu.RLock()
	defer h.mu.RUnlock()

	totalPlayers := 0
	for _, room := range h.Rooms {
		totalPlayers += room.PlayerCount()
	}

	return map[string]interface{}{
		"rooms":   len(h.Rooms),
		"players": totalPlayers,
	}
}
