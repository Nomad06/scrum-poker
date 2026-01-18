package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/poker/backend/internal/game"
	"github.com/poker/backend/internal/models"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	hub *game.Hub
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *game.Hub) *WebSocketHandler {
	return &WebSocketHandler{hub: hub}
}

// HandleConnection handles a new WebSocket connection
func (h *WebSocketHandler) HandleConnection(c *gin.Context) {
	roomCode := c.Query("room")
	playerName := c.Query("name")

	if roomCode == "" || playerName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room and name are required"})
		return
	}

	room := h.hub.GetRoom(roomCode)
	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	playerID := uuid.New().String()
	player := game.NewPlayer(playerID, playerName, "", conn, false)

	room.AddPlayer(player)
	log.Printf("Player %s (%s) joined room %s", playerName, playerID, roomCode)

	// Send initial state to player
	h.sendState(player, room)

	// Notify others
	room.BroadcastExcept(&models.ServerMessage{
		Type:    models.MsgTypePlayerJoin,
		Payload: player.ToModel(false),
	}, playerID)

	// Handle messages
	go h.handleMessages(player, room)
}

// handleMessages handles incoming messages from a player
func (h *WebSocketHandler) handleMessages(player *game.Player, room *game.Room) {
	defer func() {
		h.handleDisconnect(player, room)
	}()

	for {
		var msg models.ClientMessage
		err := player.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		h.processMessage(player, room, &msg)
	}
}

// processMessage processes a client message
func (h *WebSocketHandler) processMessage(player *game.Player, room *game.Room, msg *models.ClientMessage) {
	switch msg.Type {
	case models.MsgTypeVote:
		h.handleVote(player, room, msg.Vote)

	case models.MsgTypeReveal:
		h.handleReveal(player, room)

	case models.MsgTypeReset:
		h.handleReset(player, room)

	default:
		player.SendMessage(&models.ServerMessage{
			Type:  models.MsgTypeError,
			Error: "unknown message type",
		})
	}
}

// handleVote handles a vote from a player
func (h *WebSocketHandler) handleVote(player *game.Player, room *game.Room, vote string) {
	if room.Vote(player.ID, vote) {
		// Notify all players that this player has voted
		room.Broadcast(&models.ServerMessage{
			Type: models.MsgTypeVoted,
			Payload: map[string]interface{}{
				"playerId": player.ID,
				"hasVoted": true,
			},
		})
		log.Printf("Player %s voted in room %s", player.Name, room.Code)
	}
}

// handleReveal handles reveal request from host
func (h *WebSocketHandler) handleReveal(player *game.Player, room *game.Room) {
	if room.Reveal(player.ID) {
		results := room.GetVotingResults()
		room.Broadcast(&models.ServerMessage{
			Type:    models.MsgTypeRevealed,
			Payload: results,
		})
		log.Printf("Votes revealed in room %s by %s", room.Code, player.Name)
	} else {
		player.SendMessage(&models.ServerMessage{
			Type:  models.MsgTypeError,
			Error: "only the host can reveal votes",
		})
	}
}

// handleReset handles reset request
func (h *WebSocketHandler) handleReset(player *game.Player, room *game.Room) {
	// Only host can reset
	if player.ID != room.HostID {
		player.SendMessage(&models.ServerMessage{
			Type:  models.MsgTypeError,
			Error: "only the host can reset",
		})
		return
	}

	room.Reset()

	// Send full state to all players
	for _, p := range room.Players {
		h.sendState(p, room)
	}

	log.Printf("Room %s reset by %s", room.Code, player.Name)
}

// handleDisconnect handles player disconnection
func (h *WebSocketHandler) handleDisconnect(player *game.Player, room *game.Room) {
	player.Conn.Close()
	room.RemovePlayer(player.ID)

	log.Printf("Player %s left room %s", player.Name, room.Code)

	// Notify remaining players
	room.Broadcast(&models.ServerMessage{
		Type: models.MsgTypePlayerLeft,
		Payload: map[string]interface{}{
			"playerId": player.ID,
			"newHostId": room.HostID,
		},
	})

	// Schedule cleanup for empty rooms (with grace period for reconnection)
	if room.IsEmpty() {
		h.hub.ScheduleDeleteIfEmpty(room.Code)
	}
}

// sendState sends the current room state to a player
func (h *WebSocketHandler) sendState(player *game.Player, room *game.Room) {
	state := room.GetState(player.ID)
	player.SendMessage(&models.ServerMessage{
		Type:    models.MsgTypeSync,
		Payload: state,
	})
}
