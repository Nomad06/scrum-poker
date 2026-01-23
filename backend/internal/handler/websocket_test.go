package handler

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/poker/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestWebSocketHandler_Connection(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()
	wsHandler := NewWebSocketHandler(hub)
	router.GET("/ws", wsHandler.HandleConnection)

	room := hub.CreateRoom(24)

	// Create test server
	server := httptest.NewServer(router)
	defer server.Close()

	// Convert http URL to ws URL
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?room=" + room.Code + "&name=TestUser"

	// Connect
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	assert.Nil(t, err)
	defer ws.Close()

	// Read initial state
	var msg models.ServerMessage
	err = ws.ReadJSON(&msg)
	assert.Nil(t, err)
	assert.Equal(t, models.MsgTypeSync, msg.Type)

	// Verify player is in room
	assert.Equal(t, 1, room.PlayerCount())
}

func TestWebSocketHandler_Voting(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()
	wsHandler := NewWebSocketHandler(hub)
	router.GET("/ws", wsHandler.HandleConnection)

	room := hub.CreateRoom(24)
	server := httptest.NewServer(router)
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?room=" + room.Code + "&name=Voter"
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	assert.Nil(t, err)
	defer ws.Close()

	// Read initial sync
	var initMsg models.ServerMessage
	ws.ReadJSON(&initMsg)

	// Send vote
	voteMsg := models.ClientMessage{
		Type: models.MsgTypeVote,
		Vote: "5",
	}
	err = ws.WriteJSON(voteMsg)
	assert.Nil(t, err)

	// Should receive "voted" broadcast
	var response models.ServerMessage
	err = ws.ReadJSON(&response)
	assert.Nil(t, err)
	assert.Equal(t, models.MsgTypeVoted, response.Type)

	payload := response.Payload.(map[string]interface{})
	assert.Equal(t, true, payload["hasVoted"])
	playerID := payload["playerId"].(string)

	// Verify in room
	p := room.GetPlayer(playerID)
	assert.NotNil(t, p)
	assert.Equal(t, "5", p.Vote)
}

func TestWebSocketHandler_Timer(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()
	wsHandler := NewWebSocketHandler(hub)
	router.GET("/ws", wsHandler.HandleConnection)

	room := hub.CreateRoom(24)
	server := httptest.NewServer(router)
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?room=" + room.Code + "&name=Host"
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	assert.Nil(t, err)
	defer ws.Close()

	// Read initial sync
	var ignore models.ServerMessage
	ws.ReadJSON(&ignore)

	// Start timer
	startMsg := models.ClientMessage{
		Type:          models.MsgTypeStartTimer,
		TimerDuration: 1, // 1 second
		AutoReveal:    true,
	}
	ws.WriteJSON(startMsg)

	// Receive timer started sync
	var msg models.ServerMessage
	ws.ReadJSON(&msg)
	assert.Equal(t, models.MsgTypeTimerSync, msg.Type)

	// Wait for timer end
	ws.ReadJSON(&msg)
	assert.Equal(t, models.MsgTypeTimerEnd, msg.Type)

	// Wait for auto reveal
	ws.ReadJSON(&msg)
	assert.Equal(t, models.MsgTypeRevealed, msg.Type)
}

func TestWebSocketHandler_Reveal_Reset(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()
	wsHandler := NewWebSocketHandler(hub)
	router.GET("/ws", wsHandler.HandleConnection)

	room := hub.CreateRoom(24)
	server := httptest.NewServer(router)
	defer server.Close()

	// Connect as host
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?room=" + room.Code + "&name=Host"
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	assert.Nil(t, err)
	defer ws.Close()

	// Read init
	var ignore models.ServerMessage
	ws.ReadJSON(&ignore)

	// Connect as guest
	wsURL2 := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?room=" + room.Code + "&name=Guest"
	ws2, _, err := websocket.DefaultDialer.Dial(wsURL2, nil)
	assert.Nil(t, err)
	defer ws2.Close()
	ws2.ReadJSON(&ignore)

	// Host receives sync (new player joined triggers sync)
	var joinMsg models.ServerMessage
	ws.ReadJSON(&joinMsg)
	assert.Equal(t, models.MsgTypeSync, joinMsg.Type)

	// Guest tries to reveal (should fail or error)
	ws2.WriteJSON(models.ClientMessage{Type: models.MsgTypeReveal})
	var errBytes models.ServerMessage
	ws2.ReadJSON(&errBytes)
	assert.Equal(t, models.MsgTypeError, errBytes.Type)

	// Host reveals
	ws.WriteJSON(models.ClientMessage{Type: models.MsgTypeReveal})

	// Both receive revealed
	var msg models.ServerMessage
	ws.ReadJSON(&msg)
	assert.Equal(t, models.MsgTypeRevealed, msg.Type)
	ws2.ReadJSON(&msg)
	assert.Equal(t, models.MsgTypeRevealed, msg.Type)

	// Host resets
	ws.WriteJSON(models.ClientMessage{Type: models.MsgTypeReset})

	// Both receive sync (reset done triggers sync)
	// Actually handleReset implementation sends SendState to all players.
	// So we should expect MsgTypeSync
	ws.ReadJSON(&msg)
	assert.Equal(t, models.MsgTypeSync, msg.Type)

	ws2.ReadJSON(&msg)
	assert.Equal(t, models.MsgTypeSync, msg.Type)
}

func TestWebSocketHandler_StopTimer(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()
	wsHandler := NewWebSocketHandler(hub)
	router.GET("/ws", wsHandler.HandleConnection)

	room := hub.CreateRoom(24)
	server := httptest.NewServer(router)
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?room=" + room.Code + "&name=Host"
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	assert.Nil(t, err)
	defer ws.Close()
	var ignore models.ServerMessage
	ws.ReadJSON(&ignore)

	// Start timer
	ws.WriteJSON(models.ClientMessage{
		Type:          models.MsgTypeStartTimer,
		TimerDuration: 60,
	})
	var msg models.ServerMessage
	ws.ReadJSON(&msg)
	assert.Equal(t, models.MsgTypeTimerSync, msg.Type)

	// Stop timer
	ws.WriteJSON(models.ClientMessage{Type: models.MsgTypeStopTimer})

	ws.ReadJSON(&msg)
	assert.Equal(t, models.MsgTypeTimerSync, msg.Type)
	payload := msg.Payload.(map[string]interface{})
	assert.Equal(t, float64(0), payload["endTime"])
}
