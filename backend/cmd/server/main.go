package main

import (
	"log"
	"os"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/poker/backend/internal/game"
	"github.com/poker/backend/internal/handler"
	"github.com/poker/backend/internal/middleware"
)

func main() {
	// Configuration from environment
	port := getEnv("PORT", "8080")
	defaultExpiry, _ := strconv.Atoi(getEnv("DEFAULT_ROOM_EXPIRY_HOURS", "24"))
	allowedOrigins := getEnv("ALLOWED_ORIGINS", "*")

	// Create hub
	hub := game.NewHub(defaultExpiry)
	defer hub.Stop()

	// Create handlers
	roomHandler := handler.NewRoomHandler(hub)
	wsHandler := handler.NewWebSocketHandler(hub)

	// Setup router
	r := gin.Default()

	// CORS configuration
	var origins []string
	if allowedOrigins == "*" {
		origins = []string{"*"}
	} else {
		origins = []string{
			"https://scrum-poker.pages.dev",     // Your Cloudflare Pages domain
			"https://*.pages.dev",               // Cloudflare Pages preview domains
			"http://localhost:5173",             // Local development
			"http://localhost:3000",             // Alternative local port
		}
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		AllowCredentials: true,
		AllowWebSockets:  true,
	}))

	// Routes
	api := r.Group("/api")
	api.Use(middleware.RateLimitMiddleware(10, 20)) // 10 requests/sec, burst 20
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
