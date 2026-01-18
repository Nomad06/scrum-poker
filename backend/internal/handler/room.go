package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/poker/backend/internal/game"
)

// RoomHandler handles room-related HTTP requests
type RoomHandler struct {
	hub *game.Hub
}

// NewRoomHandler creates a new room handler
func NewRoomHandler(hub *game.Hub) *RoomHandler {
	return &RoomHandler{hub: hub}
}

// CreateRoom creates a new room
func (h *RoomHandler) CreateRoom(c *gin.Context) {
	// Parse optional expiry hours from query
	expiryStr := c.DefaultQuery("expiry", "24")
	expiryHours, err := strconv.Atoi(expiryStr)
	if err != nil || expiryHours <= 0 {
		expiryHours = 24
	}

	room := h.hub.CreateRoom(expiryHours)

	c.JSON(http.StatusCreated, gin.H{
		"code":        room.Code,
		"expiryHours": room.ExpiryHours,
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
