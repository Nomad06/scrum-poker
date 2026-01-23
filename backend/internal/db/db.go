package db

import (
	"database/sql"

	_ "github.com/glebarez/go-sqlite"
)

var DB *sql.DB

// InitDB initializes the database connection and schema
func InitDB(path string) error {
	var err error
	DB, err = sql.Open("sqlite", path)
	if err != nil {
		return err
	}

	if err = DB.Ping(); err != nil {
		return err
	}

	return createTables()
}

func createTables() error {
	// Rooms table
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS rooms (
			code TEXT PRIMARY KEY,
			host_id TEXT,
			host_token TEXT,
			created_at DATETIME,
			last_active DATETIME,
			expiry_hours INTEGER,
			scale_type TEXT,
			timer_end_time INTEGER,
			timer_auto_reveal BOOLEAN,
			revealed BOOLEAN,
			current_issue TEXT
		);
	`)
	if err != nil {
		return err
	}

	// Schema migration: Add current_issue if it doesn't exist
	// We ignore the error if column already exists (SQLite doesn't support IF NOT EXISTS for ADD COLUMN)
	_, _ = DB.Exec(`ALTER TABLE rooms ADD COLUMN current_issue TEXT;`)

	// Players table
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS players (
			id TEXT PRIMARY KEY,
			room_code TEXT,
			name TEXT,
			avatar TEXT,
			has_voted BOOLEAN,
			vote TEXT,
			is_host BOOLEAN,
			FOREIGN KEY(room_code) REFERENCES rooms(code) ON DELETE CASCADE
		);
	`)
	return err
}
