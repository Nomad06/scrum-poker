package models

// MessageType represents the type of WebSocket message
type MessageType string

const (
	// Client -> Server messages
	MsgTypeJoin       MessageType = "join"
	MsgTypeVote       MessageType = "vote"
	MsgTypeReveal     MessageType = "reveal"
	MsgTypeReset      MessageType = "reset"
	MsgTypeStartTimer MessageType = "start_timer"
	MsgTypeStopTimer  MessageType = "stop_timer"

	// Server -> Client messages
	MsgTypeSync       MessageType = "sync"
	MsgTypeError      MessageType = "error"
	MsgTypePlayerJoin MessageType = "player_joined"
	MsgTypePlayerLeft MessageType = "player_left"
	MsgTypeVoted      MessageType = "voted"
	MsgTypeRevealed   MessageType = "revealed"
	MsgTypeResetDone  MessageType = "reset_done"
	MsgTypeTimerSync  MessageType = "timer_sync"
	MsgTypeTimerEnd   MessageType = "timer_end"
)

// VotingScaleType represents different voting scale presets
type VotingScaleType string

const (
	ScaleFibonacci VotingScaleType = "fibonacci"
	ScaleTShirt    VotingScaleType = "tshirt"
	ScalePowers2   VotingScaleType = "powers2"
	ScaleCustom    VotingScaleType = "custom"
)

// VotingScale represents a voting scale configuration
type VotingScale struct {
	Type   VotingScaleType `json:"type"`
	Name   string          `json:"name"`
	Values []string        `json:"values"`
}

// Preset voting scales
var PresetScales = map[VotingScaleType]VotingScale{
	ScaleFibonacci: {
		Type:   ScaleFibonacci,
		Name:   "Fibonacci",
		Values: []string{"1", "2", "3", "5", "8", "13", "21", "?"},
	},
	ScaleTShirt: {
		Type:   ScaleTShirt,
		Name:   "T-Shirt Sizes",
		Values: []string{"XS", "S", "M", "L", "XL", "XXL", "?"},
	},
	ScalePowers2: {
		Type:   ScalePowers2,
		Name:   "Powers of 2",
		Values: []string{"1", "2", "4", "8", "16", "32", "64", "?"},
	},
}

// ClientMessage represents a message from client to server
type ClientMessage struct {
	Type          MessageType `json:"type"`
	RoomCode      string      `json:"roomCode,omitempty"`
	Name          string      `json:"name,omitempty"`
	Vote          string      `json:"vote,omitempty"`
	TimerDuration int         `json:"timerDuration,omitempty"` // Duration in seconds
	AutoReveal    bool        `json:"autoReveal,omitempty"`    // Auto-reveal when timer ends
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
	Code            string       `json:"code"`
	Players         []*Player    `json:"players"`
	Revealed        bool         `json:"revealed"`
	CurrentPlayerID string       `json:"currentPlayerId"`
	HostID          string       `json:"hostId"`
	Scale           *VotingScale `json:"scale"`
	TimerEndTime    *int64       `json:"timerEndTime,omitempty"` // Unix timestamp in milliseconds
	TimerAutoReveal bool         `json:"timerAutoReveal"`
}

// TimerState represents the timer state broadcast to clients
type TimerState struct {
	EndTime    int64 `json:"endTime"`    // Unix timestamp in milliseconds
	AutoReveal bool  `json:"autoReveal"` // Whether to auto-reveal when timer ends
}

// VotingResult represents the voting results after reveal
type VotingResult struct {
	Votes    map[string]string `json:"votes"`
	Average  float64           `json:"average,omitempty"`
	Revealed bool              `json:"revealed"`
}
