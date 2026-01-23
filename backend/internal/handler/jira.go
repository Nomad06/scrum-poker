package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/poker/backend/internal/jira"
)

const (
	errJiraNotConfigured = "Jira integration not configured"
	errInvalidPayload    = "invalid payload"
	errJiraSearchFailed  = "failed to search jira"
	errJiraUpdateFailed  = "failed to update jira"
)

type JiraHandler struct {
	client *jira.Client
}

func NewJiraHandler(client *jira.Client) *JiraHandler {
	return &JiraHandler{client: client}
}

func (h *JiraHandler) Search(c *gin.Context) {
	if h.client == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": errJiraNotConfigured})
		return
	}

	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query required"})
		return
	}

	issues, err := h.client.SearchIssues(query)
	if err != nil {
		log.Printf("Jira search error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": errJiraSearchFailed, "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"issues": issues})
}

func (h *JiraHandler) UpdateEstimation(c *gin.Context) {
	if h.client == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": errJiraNotConfigured})
		return
	}

	key := c.Param("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "issue key required"})
		return
	}

	var body struct {
		Points float64 `json:"points" binding:"required"`
	}

	if err := c.BindJSON(&body); err != nil {
		log.Printf("Invalid payload: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidPayload})
		return
	}

	// Validate story points
	if body.Points < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "story points must be non-negative"})
		return
	}

	if err := h.client.UpdateStoryPoints(key, body.Points); err != nil {
		log.Printf("Jira update error for key %s: %v", key, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": errJiraUpdateFailed, "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated", "key": key, "points": body.Points})
}
