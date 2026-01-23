package game

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/poker/backend/internal/models"
)

const (
	emptyRoomGracePeriod = 30 * time.Second
	MaxRooms             = 1000
)

// RoomRepository defines the interface for room persistence
type RoomRepository interface {
	SaveRoom(room *Room) error
	GetRoom(code string) (*Room, error)
	DeleteRoom(code string) error
	GetAllRooms() ([]*Room, error)
}

// Hub manages all rooms and connections
type Hub struct {
	Rooms         map[string]*Room
	DefaultExpiry int // hours
	repo          RoomRepository
	mu            sync.RWMutex
	cleanupTicker *time.Ticker
	done          chan struct{}
}

// NewHub creates a new hub
func NewHub(defaultExpiryHours int, repo RoomRepository) *Hub {
	h := &Hub{
		Rooms:         make(map[string]*Room),
		DefaultExpiry: defaultExpiryHours,
		repo:          repo,
		done:          make(chan struct{}),
	}

	// Load existing rooms
	if repo != nil {
		rooms, err := repo.GetAllRooms()
		if err != nil {
			log.Printf("Error loading rooms from DB: %v", err)
		} else {
			for _, r := range rooms {
				h.Rooms[r.Code] = r
				log.Printf("Loaded room %s from DB", r.Code)
			}
		}
	}

	// Start cleanup routine
	h.cleanupTicker = time.NewTicker(10 * time.Minute)
	go h.cleanupRoutine()

	return h
}

// CreateRoom creates a new room with a unique code
func (h *Hub) CreateRoom(expiryHours int) *Room {
	return h.CreateRoomWithScale(expiryHours, models.ScaleFibonacci)
}

// CreateRoomWithScale creates a new room with a specific voting scale
func (h *Hub) CreateRoomWithScale(expiryHours int, scaleType models.VotingScaleType) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if len(h.Rooms) >= MaxRooms {
		log.Printf("Max rooms reached (%d), rejecting creation", MaxRooms)
		return nil
	}

	if expiryHours <= 0 {
		expiryHours = h.DefaultExpiry
	}

	code := h.generateRoomCode()
	room := NewRoomWithScale(code, expiryHours, scaleType)
	h.Rooms[code] = room

	if h.repo != nil {
		if err := h.repo.SaveRoom(room); err != nil {
			log.Printf("Error saving new room %s: %v", code, err)
		}
	}

	log.Printf("Room created: %s (expires in %d hours, scale: %s)", code, expiryHours, scaleType)
	return room
}

// SaveRoom saves the room state (for updates)
func (h *Hub) SaveRoom(room *Room) {
	if h.repo != nil {
		if err := h.repo.SaveRoom(room); err != nil {
			log.Printf("Error saving room %s: %v", room.Code, err)
		}
	}
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
	if h.repo != nil {
		h.repo.DeleteRoom(code)
	}
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
			if h.repo != nil {
				h.repo.DeleteRoom(code)
			}
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
			if h.repo != nil {
				h.repo.DeleteRoom(code)
			}
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
