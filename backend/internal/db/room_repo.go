package db

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/poker/backend/internal/game"
	"github.com/poker/backend/internal/models"
)

// RoomRepo handles room persistence
type RoomRepo struct {
	db *sql.DB
}

func NewRoomRepo(db *sql.DB) *RoomRepo {
	return &RoomRepo{db: db}
}

// SaveRoom saves the room and its players
func (r *RoomRepo) SaveRoom(room *game.Room) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Save Room
	var timerEndTime *int64
	if room.TimerEndTime != nil {
		ts := room.TimerEndTime.UnixMilli()
		timerEndTime = &ts
	}

	// Serialize CurrentIssue
	var currentIssueJSON *string
	if room.CurrentIssue != nil {
		b, err := json.Marshal(room.CurrentIssue)
		if err == nil {
			s := string(b)
			currentIssueJSON = &s
		}
	}

	_, err = tx.Exec(`
		INSERT OR REPLACE INTO rooms (
			code, host_id, host_token, created_at, last_active, expiry_hours, 
			scale_type, timer_end_time, timer_auto_reveal, revealed, current_issue
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		room.Code,
		room.HostID,
		room.HostToken,
		room.CreatedAt,
		room.LastActive,
		room.ExpiryHours,
		room.Scale.Type,
		timerEndTime,
		room.TimerAutoReveal,
		room.Revealed,
		currentIssueJSON,
	)
	if err != nil {
		return err
	}

	// 2. Save Players (simpler to delete all for this room and re-insert given the small number)
	_, err = tx.Exec("DELETE FROM players WHERE room_code = ?", room.Code)
	if err != nil {
		return err
	}

	for _, p := range room.Players {
		_, err = tx.Exec(`
			INSERT INTO players (id, room_code, name, avatar, has_voted, vote, is_host)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`,
			p.ID,
			room.Code,
			p.Name,
			p.Avatar,
			p.HasVoted,
			p.Vote,
			p.IsHost,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// GetRoom loads a room and its players
func (r *RoomRepo) GetRoom(code string) (*game.Room, error) {
	// 1. Get Room
	var hostID, hostToken string
	var createdAt, lastActive time.Time
	var expiryHours int
	var scaleType string
	var timerEndTime *int64
	var timerAutoReveal, revealed bool
	var currentIssueJSON sql.NullString

	row := r.db.QueryRow(`
		SELECT host_id, host_token, created_at, last_active, expiry_hours, 
		       scale_type, timer_end_time, timer_auto_reveal, revealed, current_issue
		FROM rooms WHERE code = ?
	`, code)

	err := row.Scan(
		&hostID,
		&hostToken,
		&createdAt,
		&lastActive,
		&expiryHours,
		&scaleType,
		&timerEndTime,
		&timerAutoReveal,
		&revealed,
		&currentIssueJSON,
	)
	if err == sql.ErrNoRows {
		return nil, nil // Not found
	}
	if err != nil {
		return nil, err
	}

	// Restore complex fields
	var scale *models.VotingScale
	if s, ok := models.PresetScales[models.VotingScaleType(scaleType)]; ok {
		scale = &s
	} else {
		def := models.PresetScales[models.ScaleFibonacci]
		scale = &def
	}

	var tEndTime *time.Time
	if timerEndTime != nil {
		t := time.UnixMilli(*timerEndTime)
		tEndTime = &t
	}

	var currentIssue *models.JiraIssue
	if currentIssueJSON.Valid && currentIssueJSON.String != "" {
		var issue models.JiraIssue
		if err := json.Unmarshal([]byte(currentIssueJSON.String), &issue); err == nil {
			currentIssue = &issue
		}
	}

	room := game.RestoreRoom(
		code, hostID, hostToken, createdAt, lastActive, expiryHours,
		scale, tEndTime, timerAutoReveal, revealed, currentIssue,
	)

	// 2. Get Players
	rows, err := r.db.Query("SELECT id, name, avatar, has_voted, vote, is_host FROM players WHERE room_code = ?", code)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var p game.Player
		// Note: Conn is nil for restored players until they reconnect
		err := rows.Scan(&p.ID, &p.Name, &p.Avatar, &p.HasVoted, &p.Vote, &p.IsHost)
		if err != nil {
			return nil, err
		}
		room.RestorePlayer(&p)
	}

	return room, nil
}

// GetAllRooms loads all rooms (for startup)
func (r *RoomRepo) GetAllRooms() ([]*game.Room, error) {
	rows, err := r.db.Query("SELECT code FROM rooms")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []*game.Room
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}
		room, err := r.GetRoom(code)
		if err != nil {
			continue
		}
		if room != nil {
			rooms = append(rooms, room)
		}
	}
	return rooms, nil
}

// DeleteRoom deletes a room
func (r *RoomRepo) DeleteRoom(code string) error {
	_, err := r.db.Exec("DELETE FROM rooms WHERE code = ?", code)
	return err
}
