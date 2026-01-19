package game

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRoom_MaxPlayers(t *testing.T) {
	room := NewRoom("TEST", 24)

	// Mock websocket connection (nil is fine for this test as we don't write to it)
	// BUT AddPlayer might try to write to it if we aren't careful?
	// Actually NewPlayer stores the connection but AddPlayer doesn't write to it immediately
	// except for maybe setting up things.
	// Looking at AddPlayer implementation: it assigns avatar.

	// Create max players
	for i := 0; i < MaxPlayers; i++ {
		p := NewPlayer("p"+string(rune(i)), "Player", "", nil, false)
		success := room.AddPlayer(p)
		assert.True(t, success, "Should be able to add player %d", i)
	}

	// Verify count
	assert.Equal(t, MaxPlayers, room.PlayerCount())

	// Try to add one more
	p := NewPlayer("excess", "Excess", "", nil, false)
	success := room.AddPlayer(p)
	assert.False(t, success, "Should not be able to add player above limit")
}

func TestRoom_AddRemovePlayer(t *testing.T) {
	room := NewRoom("TEST", 24)

	p1 := NewPlayer("p1", "Player 1", "", nil, false)
	p2 := NewPlayer("p2", "Player 2", "", nil, false)

	// Add first player (should be host)
	room.AddPlayer(p1)
	assert.Equal(t, 1, room.PlayerCount())
	assert.True(t, p1.IsHost)
	assert.Equal(t, p1.ID, room.HostID)
	assert.NotEmpty(t, p1.Avatar)

	// Add second player
	room.AddPlayer(p2)
	assert.Equal(t, 2, room.PlayerCount())
	assert.False(t, p2.IsHost)
	assert.NotEqual(t, p1.Avatar, p2.Avatar)

	// Remove host
	room.RemovePlayer(p1.ID)
	assert.Equal(t, 1, room.PlayerCount())
	assert.Nil(t, room.GetPlayer(p1.ID))

	// Verify p2 became host
	assert.True(t, p2.IsHost)
	assert.Equal(t, p2.ID, room.HostID)
}

func TestRoom_Vote(t *testing.T) {
	room := NewRoom("TEST", 24)
	p1 := NewPlayer("p1", "Player 1", "", nil, false)
	room.AddPlayer(p1)

	// Vote
	success := room.Vote(p1.ID, "5")
	assert.True(t, success)
	assert.True(t, p1.HasVoted)
	assert.Equal(t, "5", p1.Vote)

	// Unvote (empty string)
	success = room.Vote(p1.ID, "")
	assert.True(t, success)
	assert.False(t, p1.HasVoted)
	assert.Equal(t, "", p1.Vote)

	// Vote for non-existent player
	success = room.Vote("unknown", "3")
	assert.False(t, success)
}

func TestRoom_Reveal_Reset(t *testing.T) {
	room := NewRoom("TEST", 24)
	p1 := NewPlayer("p1", "Host", "", nil, false)
	p2 := NewPlayer("p2", "Guest", "", nil, false)
	room.AddPlayer(p1)
	room.AddPlayer(p2)

	room.Vote(p1.ID, "5")
	room.Vote(p2.ID, "8")

	// Guest tries to reveal
	success := room.Reveal(p2.ID)
	assert.False(t, success)
	assert.False(t, room.Revealed)

	// Host reveals
	success = room.Reveal(p1.ID)
	assert.True(t, success)
	assert.True(t, room.Revealed)

	// Reset
	room.Reset()
	assert.False(t, room.Revealed)
	assert.False(t, p1.HasVoted)
	assert.False(t, p2.HasVoted)
	assert.Empty(t, p1.Vote)
}

func TestRoom_Timer(t *testing.T) {
	room := NewRoom("TEST", 24)
	p1 := NewPlayer("p1", "Host", "", nil, false)
	p2 := NewPlayer("p2", "Guest", "", nil, false)
	room.AddPlayer(p1)
	room.AddPlayer(p2)

	// Guest tries to start timer
	success := room.StartTimer(p2.ID, 60, true)
	assert.False(t, success)
	assert.Nil(t, room.TimerEndTime)

	// Host starts timer
	success = room.StartTimer(p1.ID, 60, true)
	assert.True(t, success)
	assert.NotNil(t, room.TimerEndTime)
	assert.True(t, room.TimerAutoReveal)
	assert.NotNil(t, room.GetTimerCancel())

	// Guest tries to stop timer
	success = room.StopTimer(p2.ID)
	assert.False(t, success)
	assert.NotNil(t, room.TimerEndTime)

	// Host stops timer
	success = room.StopTimer(p1.ID)
	assert.True(t, success)
	assert.Nil(t, room.TimerEndTime)
	assert.False(t, room.TimerAutoReveal)
}

func TestRoom_GetVotingResults(t *testing.T) {
	room := NewRoom("TEST", 24)
	p1 := NewPlayer("p1", "P1", "", nil, false)
	p2 := NewPlayer("p2", "P2", "", nil, false)
	p3 := NewPlayer("p3", "P3", "", nil, false)
	room.AddPlayer(p1)
	room.AddPlayer(p2)
	room.AddPlayer(p3)

	room.Vote(p1.ID, "3")
	room.Vote(p2.ID, "5")
	room.Vote(p3.ID, "?") // Non-numeric

	results := room.GetVotingResults()
	assert.NotNil(t, results)
	assert.Equal(t, 3, len(results.Votes))
	assert.Equal(t, "3", results.Votes[p1.ID])
	assert.Equal(t, "?", results.Votes[p3.ID])

	// Average calculation (3+5)/2 = 4. '?' is ignored.
	assert.Equal(t, float64(4), results.Average)
}
