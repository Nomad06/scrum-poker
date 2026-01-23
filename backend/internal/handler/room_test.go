package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/poker/backend/internal/game"
	"github.com/poker/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter() (*gin.Engine, *game.Hub) {
	gin.SetMode(gin.TestMode)
	hub := game.NewHub(24, nil)
	handler := NewRoomHandler(hub)
	r := gin.New()

	r.POST("/rooms", handler.CreateRoom)
	r.GET("/rooms/:code", handler.GetRoom)
	r.GET("/rooms/:code/check", handler.CheckRoom)
	r.GET("/scales", handler.GetScales)

	return r, hub
}

func TestRoomHandler_CreateRoom(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()

	// 1. Default creation
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/rooms", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Nil(t, err)
	assert.NotEmpty(t, resp["code"])
	assert.Equal(t, float64(24), resp["expiryHours"]) // JSON numbers are float64

	// 2. Custom scale and expiry via query/body
	w = httptest.NewRecorder()
	body := `{"scale": "tshirt"}`
	req, _ = http.NewRequest("POST", "/rooms?expiry=48", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	// Parse response to find code
	var resp2 map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp2)
	assert.Equal(t, float64(48), resp2["expiryHours"])

	// Verify directly in hub
	code := resp2["code"].(string)
	room := hub.GetRoom(code)
	assert.NotNil(t, room)
	assert.Equal(t, models.ScaleTShirt, room.Scale.Type)
}

func TestRoomHandler_GetRoom(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()

	// Create room
	room := hub.CreateRoom(24)

	// Get existing room
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/rooms/"+room.Code, nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, room.Code, resp["code"])

	// Get non-existent room
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/rooms/NONEXISTENT", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestRoomHandler_CheckRoom(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()

	room := hub.CreateRoom(24)

	// Check existing
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/rooms/"+room.Code+"/check", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, true, resp["exists"])

	// Check non-existent
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/rooms/NONEXISTENT/check", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestRoomHandler_GetScales(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/scales", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	scales := resp["scales"].([]interface{})
	assert.GreaterOrEqual(t, len(scales), 3) // At least 3 presets
}

func TestRoomHandler_GetStats(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()

	hub.CreateRoom(24)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/stats", nil)
	// We need to register the stats route in setupTestRouter for this to work,
	// but setupTestRouter defines routes inside.
	// Let's manually register it here or update setupTestRouter.
	// Updating setupTestRouter is better but it changes the function signature or behavior for other tests?
	// No, just add the route.
	// But I cannot change setupTestRouter easily from here without replacing the whole file or that function.
	// For now, I will register it on the router returned.
	router.GET("/stats", NewRoomHandler(hub).GetStats)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	assert.Equal(t, float64(1), resp["rooms"])
}

func TestRoomHandler_HealthCheck(t *testing.T) {
	router, hub := setupTestRouter()
	defer hub.Stop()

	router.GET("/health", NewRoomHandler(hub).HealthCheck)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "ok", resp["status"])
}
