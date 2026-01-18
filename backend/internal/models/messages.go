package models

// MessageType represents the type of WebSocket message
type MessageType string

const (
	// Client -> Server messages
	MsgTypeJoin   MessageType = "join"
	MsgTypeVote   MessageType = "vote"
	MsgTypeReveal MessageType = "reveal"
	MsgTypeReset  MessageType = "reset"

	// Server -> Client messages
	MsgTypeSync       MessageType = "sync"
	MsgTypeError      MessageType = "error"
	MsgTypePlayerJoin MessageType = "player_joined"
	MsgTypePlayerLeft MessageType = "player_left"
	MsgTypeVoted      MessageType = "voted"
	MsgTypeRevealed   MessageType = "revealed"
	MsgTypeResetDone  MessageType = "reset_done"
)

// ClientMessage represents a message from client to server
type ClientMessage struct {
	Type     MessageType `json:"type"`
	RoomCode string      `json:"roomCode,omitempty"`
	Name     string      `json:"name,omitempty"`
	Vote     string      `json:"vote,omitempty"`
}

// ServerMessage represents a message from server to client
type ServerMessage struct {
	Type    MessageType `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Player represents a player in a room
type Player struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Avatar   string `json:"avatar"`
	HasVoted bool   `json:"hasVoted"`
	Vote     string `json:"vote,omitempty"`
	IsHost   bool   `json:"isHost"`
}

// RoomState represents the current state of a room
type RoomState struct {
	Code           string    `json:"code"`
	Players        []*Player `json:"players"`
	Revealed       bool      `json:"revealed"`
	CurrentPlayerID string   `json:"currentPlayerId"`
	HostID         string    `json:"hostId"`
}

// VotingResult represents the voting results after reveal
type VotingResult struct {
	Votes    map[string]string `json:"votes"`
	Average  float64           `json:"average,omitempty"`
	Revealed bool              `json:"revealed"`
}
