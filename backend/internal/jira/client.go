package jira

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/andygrunwald/go-jira"
)

// Config holds Jira connection details
type Config struct {
	BaseURL          string
	Email            string
	APIToken         string
	StoryPointsField string
}

// Client handles Jira API interactions
type Client struct {
	config    Config
	jiraClient *jira.Client
}

// NewClient creates a new Jira client
func NewClient(config Config) (*Client, error) {
	if config.BaseURL == "" {
		return nil, fmt.Errorf("jira base URL is required")
	}
	if config.Email == "" || config.APIToken == "" {
		return nil, fmt.Errorf("jira email and API token are required")
	}

	if config.StoryPointsField == "" {
		config.StoryPointsField = "customfield_10016" // Common default
	}

	// Create authenticated Jira client
	tp := jira.BasicAuthTransport{
		Username: config.Email,
		Password: config.APIToken,
	}

	jiraClient, err := jira.NewClient(tp.Client(), config.BaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create jira client: %w", err)
	}

	return &Client{
		config:     config,
		jiraClient: jiraClient,
	}, nil
}

// Issue represents a simplified Jira issue
type Issue struct {
	Key     string  `json:"key"`
	Summary string  `json:"summary"`
	Points  float64 `json:"points,omitempty"`
}

// SearchIssues searches for issues by text or key using the new JQL search API
func (c *Client) SearchIssues(query string) ([]Issue, error) {
	if query == "" {
		return []Issue{}, nil
	}

	// Optimization: If query looks like an issue key (e.g. PROJ-123), try direct fetch first
	if isIssueKey(query) {
		issue, err := c.GetIssue(query)
		if err == nil && issue != nil {
			return []Issue{*issue}, nil
		}
		// If direct fetch fails, fall back to search
	}

	// JQL: summary ~ "query" OR key = "query"
	// Note: text ~ is fuzzy, key = is exact.
	jql := fmt.Sprintf("summary ~ \"%s\" OR key = \"%s\" ORDER BY updated DESC", query, query)

	// Use the new /rest/api/3/search/jql endpoint to avoid 410 deprecation errors
	result, err := c.searchJQL(jql, 10)
	if err != nil {
		return nil, fmt.Errorf("jira search failed: %w", err)
	}

	return result, nil
}

// searchJQL performs a JQL search using the new /rest/api/3/search/jql endpoint
func (c *Client) searchJQL(jql string, maxResults int) ([]Issue, error) {
	// Build the search payload for the new API
	payload := map[string]interface{}{
		"jql":        jql,
		"maxResults": maxResults,
		"fields":     []string{"summary", c.config.StoryPointsField},
	}

	// Use the new /rest/api/3/search/jql endpoint (replaces deprecated /rest/api/3/search)
	req, err := c.jiraClient.NewRequest("POST", "rest/api/3/search/jql", payload)
	if err != nil {
		return nil, fmt.Errorf("failed to create search request: %w", err)
	}

	// Response structure for the new API
	var searchResponse struct {
		Issues []jira.Issue `json:"values"`
	}

	resp, err := c.jiraClient.Do(req, &searchResponse)
	if err != nil {
		return nil, fmt.Errorf("search request failed: %w", err)
	}
	if resp != nil {
		defer resp.Body.Close()
	}

	// Convert Jira issues to our Issue type
	result := make([]Issue, 0, len(searchResponse.Issues))
	for _, jiraIssue := range searchResponse.Issues {
		issue := Issue{
			Key:     jiraIssue.Key,
			Summary: jiraIssue.Fields.Summary,
		}

		// Extract story points from custom field
		if points := extractStoryPoints(jiraIssue.Fields, c.config.StoryPointsField); points != nil {
			issue.Points = *points
		}

		result = append(result, issue)
	}

	return result, nil
}

// GetIssue fetches a single issue by key
func (c *Client) GetIssue(key string) (*Issue, error) {
	if key == "" {
		return nil, fmt.Errorf("issue key is required")
	}

	opts := &jira.GetQueryOptions{
		Fields: "summary," + c.config.StoryPointsField,
	}

	jiraIssue, _, err := c.jiraClient.Issue.Get(key, opts)
	if err != nil {
		// Check if it's a 404 error
		if strings.Contains(err.Error(), "404") {
			return nil, fmt.Errorf("issue not found: %s", key)
		}
		return nil, fmt.Errorf("jira get issue failed: %w", err)
	}

	if jiraIssue == nil {
		return nil, fmt.Errorf("issue not found: %s", key)
	}

	issue := &Issue{
		Key:     jiraIssue.Key,
		Summary: jiraIssue.Fields.Summary,
	}

	// Extract story points from custom field
	if points := extractStoryPoints(jiraIssue.Fields, c.config.StoryPointsField); points != nil {
		issue.Points = *points
	}

	return issue, nil
}

// UpdateStoryPoints updates the story points for an issue
func (c *Client) UpdateStoryPoints(issueKey string, points float64) error {
	if issueKey == "" {
		return fmt.Errorf("issue key is required")
	}

	if points < 0 {
		return fmt.Errorf("story points must be non-negative")
	}

	// Build update payload
	payload := map[string]interface{}{
		"fields": map[string]interface{}{
			c.config.StoryPointsField: points,
		},
	}

	_, err := c.jiraClient.Issue.UpdateIssue(issueKey, payload)
	if err != nil {
		return fmt.Errorf("jira update failed: %w", err)
	}

	return nil
}

// ValidateConnection tests the Jira connection by attempting a simple API call
func (c *Client) ValidateConnection() error {
	// Try a simple JQL search using the new API to validate the connection
	// Search for any issue with maxResults=1 to minimize API load
	_, err := c.searchJQL("order by created DESC", 1)
	if err != nil {
		return fmt.Errorf("jira connection validation failed: %w", err)
	}
	return nil
}

// extractStoryPoints extracts story points from a Jira issue's fields
func extractStoryPoints(fields *jira.IssueFields, fieldName string) *float64 {
	if fields == nil || fields.Unknowns == nil {
		return nil
	}

	// Get the custom field value from unknowns
	if value, ok := fields.Unknowns[fieldName]; ok {
		switch v := value.(type) {
		case float64:
			return &v
		case int:
			f := float64(v)
			return &f
		case string:
			// Try to parse string to float
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				return &f
			}
		}
	}

	return nil
}

// isIssueKey validates if a string looks like a Jira issue key (e.g., PROJ-123)
func isIssueKey(query string) bool {
	// Simple validation: Uppercase letters, hyphen, digits
	parts := strings.Split(query, "-")
	if len(parts) != 2 {
		return false
	}

	// First part should be uppercase letters only
	if len(parts[0]) == 0 {
		return false
	}
	for _, r := range parts[0] {
		if r < 'A' || r > 'Z' {
			return false
		}
	}

	// Second part should be digits only
	if len(parts[1]) == 0 {
		return false
	}
	for _, r := range parts[1] {
		if r < '0' || r > '9' {
			return false
		}
	}

	return true
}
