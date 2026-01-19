package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRateLimitMiddleware(t *testing.T) {
	// Setup Gin
	gin.SetMode(gin.TestMode)

	// Create middleware with strict limit: 2 req/sec, burst 2
	mw := RateLimitMiddleware(2, 2)

	r := gin.New()
	r.Use(mw)
	r.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// Helper to send request
	sendRequest := func() int {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		r.ServeHTTP(w, req)
		return w.Code
	}

	// 1. First request should pass
	assert.Equal(t, http.StatusOK, sendRequest())

	// 2. Second request should pass (burst is 2)
	assert.Equal(t, http.StatusOK, sendRequest())

	// 3. Third request should fail (instantaneous burst exceeded)
	assert.Equal(t, http.StatusTooManyRequests, sendRequest())

	// 4. Wait for 500ms (1 token should regenerate, since rate is 2/sec)
	time.Sleep(550 * time.Millisecond)

	// 5. Should pass now
	assert.Equal(t, http.StatusOK, sendRequest())
}
