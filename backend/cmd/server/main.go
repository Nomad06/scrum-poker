package main

import (
	"log"
	"os"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/poker/backend/internal/game"
	"github.com/poker/backend/internal/handler"
)

func main() {
	// Configuration from environment
	port := getEnv("PORT", "8080")
	defaultExpiry, _ := strconv.Atoi(getEnv("DEFAULT_ROOM_EXPIRY_HOURS", "24"))

	// Create hub
	hub := game.NewHub(defaultExpiry)
	defer hub.Stop()

	// Create handlers
	roomHandler := handler.NewRoomHandler(hub)
	wsHandler := handler.NewWebSocketHandler(hub)

	// Setup router
	r := gin.Default()

	// CORS configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	// Routes
	api := r.Group("/api")
	{
		api.GET("/health", roomHandler.HealthCheck)
		api.GET("/stats", roomHandler.GetStats)
		api.GET("/scales", roomHandler.GetScales)

		// Room routes
		api.POST("/rooms", roomHandler.CreateRoom)
		api.GET("/rooms/:code", roomHandler.GetRoom)
		api.GET("/rooms/:code/check", roomHandler.CheckRoom)
	}

	// WebSocket route
	r.GET("/ws", wsHandler.HandleConnection)

	log.Printf("Starting server on port %s", port)
	log.Printf("Default room expiry: %d hours", defaultExpiry)

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
