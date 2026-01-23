package main

import (
	"log"
	"os"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/poker/backend/internal/db"
	"github.com/poker/backend/internal/game"
	"github.com/poker/backend/internal/handler"
	"github.com/poker/backend/internal/jira"
	"github.com/poker/backend/internal/middleware"
)

func main() {
	// Load .env file if exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error loading it, using environment variables")
	}

	// Configuration from environment
	port := getEnv("PORT", "8080")
	defaultExpiry, _ := strconv.Atoi(getEnv("DEFAULT_ROOM_EXPIRY_HOURS", "24"))
	allowedOrigins := getEnv("ALLOWED_ORIGINS", "*")
	dbPath := getEnv("DB_PATH", "./data/poker.db")

	// Ensure data directory exists
	if err := os.MkdirAll("./data", 0755); err != nil {
		log.Printf("Warning: Failed to create data directory: %v", err)
	}

	// Initialize Database
	if err := db.InitDB(dbPath); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	repo := db.NewRoomRepo(db.DB)

	// Create hub
	hub := game.NewHub(defaultExpiry, repo)
	defer hub.Stop()

	// Create handlers
	roomHandler := handler.NewRoomHandler(hub)
	wsHandler := handler.NewWebSocketHandler(hub)

	// Initialize Jira Client
	var jiraHandler *handler.JiraHandler
	jiraBaseURL := getEnv("JIRA_URL", "")
	if jiraBaseURL != "" {
		jiraConfig := jira.Config{
			BaseURL:          jiraBaseURL,
			Email:            getEnv("JIRA_EMAIL", ""),
			APIToken:         getEnv("JIRA_TOKEN", ""),
			StoryPointsField: getEnv("JIRA_POINTS_FIELD", "customfield_10016"),
		}

		jiraClient, err := jira.NewClient(jiraConfig)
		if err != nil {
			log.Printf("⚠️  Failed to create Jira client: %v", err)
			log.Println("Jira integration disabled due to configuration error")
		} else {
			// Validate Jira connection on startup (warn but don't fail)
			if err := jiraClient.ValidateConnection(); err != nil {
				log.Printf("⚠️  Jira connection validation failed: %v", err)
				log.Println("⚠️  Jira integration enabled but connection could not be validated")
				log.Println("⚠️  Please check your JIRA_URL, JIRA_EMAIL, and JIRA_TOKEN")
				log.Println("⚠️  Server will continue, but Jira features may not work")
			} else {
				log.Printf("✓ Jira integration enabled and validated for %s", jiraBaseURL)
			}

			jiraHandler = handler.NewJiraHandler(jiraClient)
		}
	} else {
		log.Println("Jira integration disabled: JIRA_URL not set")
	}

	// Setup router
	r := gin.Default()

	// CORS configuration
	var origins []string
	if allowedOrigins == "*" {
		origins = []string{"*"}
	} else {
		origins = []string{
			"https://scrum-poker.pages.dev", // Your Cloudflare Pages domain
			"https://*.pages.dev",           // Cloudflare Pages preview domains
			"http://localhost:5173",         // Local development
			"http://localhost:3000",         // Alternative local port
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

		// Jira routes
		if jiraHandler != nil {
			api.GET("/jira/search", jiraHandler.Search)
			api.POST("/jira/issue/:key/estimate", jiraHandler.UpdateEstimation)
		}
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
