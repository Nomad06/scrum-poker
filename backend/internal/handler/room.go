package handler

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/poker/backend/internal/game"
	"github.com/poker/backend/internal/models"
)

// RoomHandler handles room-related HTTP requests
type RoomHandler struct {
	hub *game.Hub
}

// NewRoomHandler creates a new room handler
func NewRoomHandler(hub *game.Hub) *RoomHandler {
	return &RoomHandler{hub: hub}
}

// CreateRoomRequest represents the request body for room creation
type CreateRoomRequest struct {
	Scale string `json:"scale"`
}

// CreateRoom creates a new room
func (h *RoomHandler) CreateRoom(c *gin.Context) {
	// Parse optional expiry hours from query
	expiryStr := c.DefaultQuery("expiry", "24")
	expiryHours, err := strconv.Atoi(expiryStr)
	if err != nil || expiryHours <= 0 {
		expiryHours = 24
	}

	// Parse optional scale from body or query
	var req CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("JSON parse (may be empty): %v", err)
	}

	scaleType := c.DefaultQuery("scale", req.Scale)
	if scaleType == "" {
		scaleType = string(models.ScaleFibonacci)
	}

	log.Printf("Creating room with scale: '%s' (from body: '%s')", scaleType, req.Scale)

	room := h.hub.CreateRoomWithScale(expiryHours, models.VotingScaleType(scaleType))

	log.Printf("Room created: %s with scale: %v", room.Code, room.Scale)

	c.JSON(http.StatusCreated, gin.H{
		"code":        room.Code,
		"hostToken":   room.HostToken,
		"expiryHours": room.ExpiryHours,
		"scale":       room.Scale,
	})
}

// GetScales returns available voting scales
func (h *RoomHandler) GetScales(c *gin.Context) {
	scales := make([]models.VotingScale, 0, len(models.PresetScales))
	for _, scale := range models.PresetScales {
		scales = append(scales, scale)
	}
	c.JSON(http.StatusOK, gin.H{
		"scales": scales,
	})
}

// GetRoom returns room info
func (h *RoomHandler) GetRoom(c *gin.Context) {
	code := c.Param("code")

	room := h.hub.GetRoom(code)
	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":        room.Code,
		"playerCount": room.PlayerCount(),
		"expiryHours": room.ExpiryHours,
		"scale":       room.GetScale(),
	})
}

// CheckRoom checks if a room exists
func (h *RoomHandler) CheckRoom(c *gin.Context) {
	code := c.Param("code")

	room := h.hub.GetRoom(code)
	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"exists": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"exists":      true,
		"playerCount": room.PlayerCount(),
	})
}

// GetStats returns hub statistics
func (h *RoomHandler) GetStats(c *gin.Context) {
	stats := h.hub.Stats()
	c.JSON(http.StatusOK, stats)
}

// HealthCheck returns server health status
func (h *RoomHandler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
