package game

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlayer_SetVote(t *testing.T) {
	p := NewPlayer("p1", "Player 1", "avatar", nil, false)

	// Initial state
	assert.False(t, p.HasVoted)
	assert.Empty(t, p.Vote)

	// Set vote
	p.SetVote("8")
	assert.True(t, p.HasVoted)
	assert.Equal(t, "8", p.Vote)

	// Change vote
	p.SetVote("13")
	assert.True(t, p.HasVoted)
	assert.Equal(t, "13", p.Vote)

	// Clear vote
	p.SetVote("")
	assert.False(t, p.HasVoted)
	assert.Empty(t, p.Vote)
}

func TestPlayer_ToModel(t *testing.T) {
	p := NewPlayer("p1", "Player 1", "avatar", nil, true)
	p.SetVote("5")

	// Hide vote
	model := p.ToModel(false)
	assert.Equal(t, "p1", model.ID)
	assert.Equal(t, "Player 1", model.Name)
	assert.Equal(t, "avatar", model.Avatar)
	assert.True(t, model.IsHost)
	assert.True(t, model.HasVoted)
	assert.Empty(t, model.Vote)

	// Include vote
	modelWithVote := p.ToModel(true)
	assert.Equal(t, "5", modelWithVote.Vote)
}
