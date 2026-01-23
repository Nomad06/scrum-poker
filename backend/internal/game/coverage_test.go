package game

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/poker/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestRoom_IsExpired(t *testing.T) {
	room := NewRoom("TEST", 1)
	assert.False(t, room.IsExpired())

	// Manually expire
	room.LastActive = time.Now().Add(-2 * time.Hour)
	assert.True(t, room.IsExpired())
}

func TestRoom_IsEmpty(t *testing.T) {
	room := NewRoom("TEST", 1)
	assert.True(t, room.IsEmpty())

	p := NewPlayer("p1", "Player", "", nil, false)
	room.AddPlayer(p)
	assert.False(t, room.IsEmpty())
}

func TestRoom_ClearTimer(t *testing.T) {
	room := NewRoom("TEST", 1)
	p := NewPlayer("p1", "Host", "", nil, false)
	room.AddPlayer(p)

	room.StartTimer(p.ID, 60, true)
	assert.NotNil(t, room.TimerEndTime)

	room.ClearTimer()
	assert.Nil(t, room.TimerEndTime)
}

func TestRoom_GetSetScale(t *testing.T) {
	room := NewRoom("TEST", 1)
	assert.Equal(t, models.ScaleFibonacci, room.GetScale().Type)

	newScale := models.PresetScales[models.ScaleTShirt]
	room.SetScale(&newScale)
	assert.Equal(t, models.ScaleTShirt, room.GetScale().Type)
}

func TestHub_Cleanup(t *testing.T) {
	hub := NewHub(1, nil)
	defer hub.Stop()

	// Create room and expire it
	room := hub.CreateRoom(1)
	room.LastActive = time.Now().Add(-2 * time.Hour)

	// Trigger cleanup
	hub.cleanup()

	// Should be deleted
	assert.Nil(t, hub.GetRoom(room.Code))
}

// Helper to create a player with a real websocket connection
func createTestPlayer(t *testing.T, id, name string) (*Player, *websocket.Conn) {
	connChan := make(chan *websocket.Conn, 1)
	s2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Errorf("Upgrade failed: %v", err)
			return
		}
		connChan <- conn
	}))
	defer s2.Close()

	wsURL := "ws" + strings.TrimPrefix(s2.URL, "http")
	clientConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	assert.Nil(t, err)

	// Wait for server conn
	serverConn := <-connChan

	p := NewPlayer(id, name, "", serverConn, false)
	return p, clientConn
}

func TestRoom_Broadcast(t *testing.T) {
	room := NewRoom("TEST", 1)

	p1, client1 := createTestPlayer(t, "p1", "Player 1")
	defer client1.Close()
	defer p1.Conn.Close()

	room.AddPlayer(p1)

	msg := &models.ServerMessage{
		Type: models.MsgTypeSync,
	}

	room.Broadcast(msg)

	// Read from client
	var received models.ServerMessage
	err := client1.ReadJSON(&received)
	assert.Nil(t, err)
	assert.Equal(t, models.MsgTypeSync, received.Type)
}
