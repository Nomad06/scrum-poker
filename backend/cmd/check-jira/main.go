package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env from backend root (assuming we run from backend dir)
	_ = godotenv.Load()

	baseURL := os.Getenv("JIRA_URL")
	email := os.Getenv("JIRA_EMAIL")
	token := os.Getenv("JIRA_TOKEN")

	if baseURL == "" || email == "" || token == "" {
		log.Fatal("Please set JIRA_URL, JIRA_EMAIL, and JIRA_TOKEN in .env")
	}

	url := fmt.Sprintf("%s/rest/api/3/field", baseURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Fatal(err)
	}

	req.SetBasicAuth(email, token)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		log.Fatalf("Error: Status %d", resp.StatusCode)
	}

	var fields []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&fields); err != nil {
		log.Fatal(err)
	}

	fmt.Println("Found Fields matching 'Story Points' or 'Estimate':")
	fmt.Println("------------------------------------------------")
	found := false
	for _, f := range fields {
		nameLower := strings.ToLower(f.Name)
		if strings.Contains(nameLower, "story") || strings.Contains(nameLower, "point") || strings.Contains(nameLower, "estimate") {
			fmt.Printf("ID: %-20s | Name: %s\n", f.ID, f.Name)
			found = true
		}
	}

	if !found {
		fmt.Println("No matching fields found. Listing all custom fields:")
		for _, f := range fields {
			if strings.HasPrefix(f.ID, "customfield") {
				fmt.Printf("ID: %-20s | Name: %s\n", f.ID, f.Name)
			}
		}
	} else {
		fmt.Println("------------------------------------------------")
		fmt.Println("Update your .env file with the correct JIRA_POINTS_FIELD value.")
	}
}
