import { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../hooks/useWebSocket';
import { PlayerCard } from './PlayerCard';
import { VotingCard } from './VotingCard';
import { CowboyAvatar } from './CowboyAvatar';
import { Timer } from './Timer';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { AmbientParticles } from './AmbientParticles';
import { VOTING_VALUES } from '../types';
import type { RoomState, VotingResult, Player, TimerState } from '../types';

export function Room() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerName = searchParams.get('name') || 'Anonymous';

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [votingResult, setVotingResult] = useState<VotingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
  const [timerAutoReveal, setTimerAutoReveal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Handlers for WebSocket events
  const handleStateSync = useCallback((state: RoomState) => {
    setRoomState(state);
    setVotingResult(null);
    // Clear selected vote on sync (new round)
    const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);
    if (!currentPlayer?.hasVoted) {
      setSelectedVote(null);
    }
    // Sync timer state
    if (state.timerEndTime) {
      setTimerEndTime(state.timerEndTime);
      setTimerAutoReveal(state.timerAutoReveal || false);
    } else {
      setTimerEndTime(null);
      setTimerAutoReveal(false);
    }
  }, []);

  const handlePlayerJoined = useCallback((player: Player) => {
    setRoomState(prev => {
      if (!prev) return prev;
      // Check if player already exists
      if (prev.players.some(p => p.id === player.id)) return prev;
      return {
        ...prev,
        players: [...prev.players, player],
      };
    });
  }, []);

  const handlePlayerLeft = useCallback((playerId: string, newHostId: string) => {
    setRoomState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players
          .filter(p => p.id !== playerId)
          .map(p => ({
            ...p,
            isHost: p.id === newHostId,
          })),
        hostId: newHostId,
      };
    });
  }, []);

  const handleVoted = useCallback((playerId: string, hasVoted: boolean) => {
    setRoomState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p =>
          p.id === playerId ? { ...p, hasVoted } : p
        ),
      };
    });
  }, []);

  const handleRevealed = useCallback((result: VotingResult) => {
    setVotingResult(result);
    setRoomState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        revealed: true,
        players: prev.players.map(p => ({
          ...p,
          vote: result.votes[p.id],
        })),
      };
    });
  }, []);

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setTimeout(() => setError(null), 3000);
  }, []);

  const handleRoomNotFound = useCallback(() => {
    setError('Room not found or has expired');
    setTimeout(() => navigate('/'), 2000);
  }, [navigate]);

  const handleTimerSync = useCallback((timer: TimerState) => {
    if (timer.endTime > 0) {
      setTimerEndTime(timer.endTime);
      setTimerAutoReveal(timer.autoReveal);
    } else {
      setTimerEndTime(null);
      setTimerAutoReveal(false);
    }
  }, []);

  const handleTimerEnd = useCallback(() => {
    setTimerEndTime(null);
    setTimerAutoReveal(false);
  }, []);

  const { isConnected, isConnecting, vote, reveal, reset, startTimer, stopTimer } = useWebSocket({
    roomCode: code || '',
    playerName,
    onStateSync: handleStateSync,
    onPlayerJoined: handlePlayerJoined,
    onPlayerLeft: handlePlayerLeft,
    onVoted: handleVoted,
    onRevealed: handleRevealed,
    onError: handleError,
    onRoomNotFound: handleRoomNotFound,
    onTimerSync: handleTimerSync,
    onTimerEnd: handleTimerEnd,
  });

  // Handle voting
  const handleVote = useCallback((value: string) => {
    // Toggle vote if clicking the same card
    if (selectedVote === value) {
      setSelectedVote(null);
      vote('');
    } else {
      setSelectedVote(value);
      vote(value);
    }
  }, [selectedVote, vote]);

  // Copy room link
  const copyRoomLink = async () => {
    const url = `${window.location.origin}/room/${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Leave room
  const leaveRoom = () => {
    navigate('/');
  };

  // Get current player and others
  const currentPlayer = roomState?.players.find(p => p.id === roomState.currentPlayerId);
  const otherPlayers = roomState?.players.filter(p => p.id !== roomState.currentPlayerId) || [];
  const isHost = currentPlayer?.isHost || false;
  const allVoted = roomState?.players.every(p => p.hasVoted) || false;
  const revealed = roomState?.revealed || false;

  // Get voting scale - use room's scale or default to Fibonacci
  const votingScale = roomState?.scale?.values || VOTING_VALUES;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle help with ? key (Shift + /)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }

      // Close help with Escape
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
        return;
      }

      // Don't process other shortcuts if help is shown
      if (showShortcuts) return;

      if (!revealed) {
        // Number keys for voting
        const keyMap: Record<string, string> = {};

        // Dynamic mapping based on current scale
        // Map 1-9 covers most decks comfortably
        const validOptions = votingScale.filter(v => v !== '?');
        validOptions.slice(0, 9).forEach((value, index) => {
          keyMap[(index + 1).toString()] = value;
        });

        // Special keys
        keyMap['/'] = '?'; // Standard help/unknown key

        // Legacy/Extended Fibonacci support
        if (votingScale.includes('13')) keyMap['q'] = '13';
        if (votingScale.includes('21')) keyMap['w'] = '21';

        if (keyMap[e.key]) {
          handleVote(keyMap[e.key]);
        }

        // R for reveal (host only)
        if (e.key === 'r' && isHost && allVoted) {
          reveal();
        }
      } else {
        // N for new round (host only, when revealed)
        if (e.key === 'n' && isHost) {
          reset();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, isHost, allVoted, reveal, reset, showShortcuts, handleVote, votingScale]);

  if (!code) {
    navigate('/');
    return null;
  }

  // Check if there's a strong consensus for celebration
  const showCelebration = revealed && votingResult && (() => {
    const votes = Object.values(votingResult.votes);
    const voteCount: Record<string, number> = {};
    votes.forEach(v => { voteCount[v] = (voteCount[v] || 0) + 1; });
    const maxCount = Math.max(...Object.values(voteCount));
    return votes.length > 1 && (maxCount / votes.length) >= 0.8;
  })();

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      {/* Ambient particles */}
      <AmbientParticles count={12} showSparkles={showCelebration || false} />

      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8">
        <div className="wanted-poster rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl text-wood-800">SCRUM POKER</h1>
            <div className="flex items-center gap-2">
              <span className="text-wood-600">Room:</span>
              <code className="bg-sand-300 px-3 py-1 rounded text-lg font-mono tracking-wider text-wood-800">
                {code}
              </code>
              <button
                onClick={copyRoomLink}
                className="p-2 hover:bg-sand-300 rounded transition-colors"
                title="Copy room link"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-cactus-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-wood-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                )}
              </button>
              {roomState?.scale && (
                <span className="text-xs bg-wood-200 text-wood-700 px-2 py-0.5 rounded">
                  {roomState.scale.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            {!revealed && (
              <Timer
                endTime={timerEndTime}
                autoReveal={timerAutoReveal}
                isHost={isHost}
                onStartTimer={startTimer}
                onStopTimer={stopTimer}
              />
            )}

            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? 'bg-cactus-500' : isConnecting ? 'bg-sand-500 animate-pulse' : 'bg-leather-500'
                  }`}
              />
              <span className="text-sm text-wood-600">
                {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>

            <button
              onClick={leaveRoom}
              className="text-leather-600 hover:text-leather-800 underline text-sm"
            >
              Leave Room
            </button>
          </div>
        </div>
      </header>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-6xl mx-auto mb-4"
          >
            <div className="bg-leather-100 border border-leather-400 text-leather-800 px-4 py-2 rounded text-center">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="max-w-6xl mx-auto">
        {/* Players area */}
        <section className="mb-8">
          <h2 className="text-xl text-wood-700 mb-4 flex items-center gap-2">
            <span>🤠</span> Players ({roomState?.players.length || 0})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AnimatePresence>
              {/* Current player first */}
              {currentPlayer && (
                <PlayerCard
                  key={currentPlayer.id}
                  player={currentPlayer}
                  isCurrentPlayer={true}
                  revealed={revealed}
                />
              )}
              {/* Other players */}
              {otherPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  revealed={revealed}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Voting results */}
        <AnimatePresence>
          {revealed && votingResult && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <div className="wanted-poster rounded-lg p-6">
                <h2 className="text-2xl text-wood-800 mb-4 text-center">🎯 Results</h2>

                {/* Enhanced Statistics */}
                {(() => {
                  const votes = Object.values(votingResult.votes);
                  const numericVotes = votes.filter(v => v !== '?' && !isNaN(parseFloat(v)));
                  const numericValues = numericVotes.map(v => parseFloat(v));

                  // Calculate statistics
                  const totalVotes = votes.length;
                  const uncertainVotes = votes.filter(v => v === '?').length;

                  // Mode (most common vote)
                  const voteCount: Record<string, number> = {};
                  votes.forEach(v => { voteCount[v] = (voteCount[v] || 0) + 1; });
                  const maxCount = Math.max(...Object.values(voteCount));
                  const modeVotes = Object.entries(voteCount)
                    .filter(([, count]) => count === maxCount)
                    .map(([vote]) => vote);

                  // Consensus percentage (% of votes matching mode)
                  const consensusPercent = totalVotes > 0
                    ? Math.round((maxCount / totalVotes) * 100)
                    : 0;

                  // Spread (min/max for numeric)
                  const min = numericValues.length > 0 ? Math.min(...numericValues) : null;
                  const max = numericValues.length > 0 ? Math.max(...numericValues) : null;
                  const spread = min !== null && max !== null ? max - min : null;

                  // Determine consensus level
                  const getConsensusLevel = () => {
                    if (consensusPercent >= 80) return { label: 'Strong Consensus', color: 'text-cactus-600', bg: 'bg-cactus-100' };
                    if (consensusPercent >= 60) return { label: 'Good Agreement', color: 'text-cactus-500', bg: 'bg-cactus-50' };
                    if (consensusPercent >= 40) return { label: 'Mixed Opinions', color: 'text-leather-500', bg: 'bg-leather-50' };
                    return { label: 'Discussion Needed', color: 'text-leather-600', bg: 'bg-leather-100' };
                  };
                  const consensus = getConsensusLevel();

                  return (
                    <>
                      {/* Consensus Indicator */}
                      <div className={`mb-6 p-3 rounded-lg ${consensus.bg} text-center`}>
                        <div className={`text-lg font-semibold ${consensus.color}`}>
                          {consensus.label}
                        </div>
                        <div className="text-sm text-wood-600 mt-1">
                          {consensusPercent}% agreement on {modeVotes.join(' or ')}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {/* Average */}
                        <div className="text-center p-3 bg-sand-100 rounded-lg">
                          <div className="text-3xl font-bold text-leather-600">
                            {votingResult.average?.toFixed(1) || '—'}
                          </div>
                          <div className="text-sm text-wood-600">Average</div>
                        </div>

                        {/* Mode */}
                        <div className="text-center p-3 bg-sand-100 rounded-lg">
                          <div className="text-3xl font-bold text-wood-700">
                            {modeVotes.length <= 2 ? modeVotes.join(', ') : modeVotes[0]}
                          </div>
                          <div className="text-sm text-wood-600">Most Common</div>
                        </div>

                        {/* Spread */}
                        <div className="text-center p-3 bg-sand-100 rounded-lg">
                          <div className="text-3xl font-bold text-wood-600">
                            {spread !== null ? (
                              <>
                                <span className="text-lg">{min}</span>
                                <span className="mx-1 text-wood-400">→</span>
                                <span className="text-lg">{max}</span>
                              </>
                            ) : '—'}
                          </div>
                          <div className="text-sm text-wood-600">
                            {spread !== null ? `Spread: ${spread}` : 'Spread'}
                          </div>
                        </div>

                        {/* Vote counts */}
                        <div className="text-center p-3 bg-sand-100 rounded-lg">
                          <div className="text-3xl font-bold text-cactus-600">
                            {numericVotes.length}
                            {uncertainVotes > 0 && (
                              <span className="text-lg text-wood-500 ml-1">+{uncertainVotes}?</span>
                            )}
                          </div>
                          <div className="text-sm text-wood-600">Total Votes</div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Vote distribution */}
                <div className="pt-4 border-t border-wood-300">
                  <h3 className="text-lg text-wood-700 mb-3 text-center">Vote Distribution</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {votingScale.map(value => {
                      const count = Object.values(votingResult.votes).filter(v => v === value).length;
                      if (count === 0) return null;
                      const isMode = count === Math.max(...Object.values(
                        votingScale.reduce((acc, v) => {
                          const c = Object.values(votingResult.votes).filter(vote => vote === v).length;
                          if (c > 0) acc[v] = c;
                          return acc;
                        }, {} as Record<string, number>)
                      ));
                      return (
                        <motion.div
                          key={value}
                          className="flex flex-col items-center"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: isMode ? 1.1 : 1 }}
                        >
                          <div className={isMode ? 'ring-2 ring-cactus-500 ring-offset-2 rounded-lg' : ''}>
                            <VotingCard value={value} isRevealed={true} />
                          </div>
                          <span className={`mt-2 font-semibold ${isMode ? 'text-cactus-600' : 'text-wood-700'}`}>
                            ×{count}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Voting cards */}
        {!revealed && (
          <section className="mb-8">
            <h2 className="text-xl text-wood-700 mb-4 flex items-center gap-2">
              <span>🎴</span> Choose Your Card
            </h2>
            <div className="flex flex-wrap justify-center gap-4 p-6 bg-sand-200/50 rounded-lg">
              {votingScale.map(value => (
                <VotingCard
                  key={value}
                  value={value}
                  isSelected={selectedVote === value}
                  onClick={() => handleVote(value)}
                />
              ))}
            </div>
            <p className="text-center text-wood-800 text-sm mt-3 bg-sand-100/80 inline-block mx-auto px-4 py-1 rounded">
              {(() => {
                const validOptions = votingScale.filter(v => v !== '?');
                const hints = validOptions.slice(0, 5).map((v, i) => `${i + 1}(${v})`);

                if (validOptions.length > 5) hints.push('...');

                if (votingScale.includes('13')) hints.push('Q(13)');
                if (votingScale.includes('21')) hints.push('W(21)');

                hints.push('/(?)');

                return `Keyboard: ${hints.join(', ')} | Press ? for help`;
              })()}
            </p>
          </section>
        )}

        {/* Action buttons */}
        <section className="flex flex-wrap justify-center gap-4">
          {isHost && !revealed && (
            <button
              onClick={reveal}
              disabled={!allVoted}
              className="btn-western text-lg disabled:opacity-50"
              title={!allVoted ? 'Wait for all players to vote' : 'Reveal all votes'}
            >
              🎭 Reveal Cards
              {!allVoted && (
                <span className="ml-2 text-sm opacity-70">
                  ({roomState?.players.filter(p => p.hasVoted).length}/{roomState?.players.length})
                </span>
              )}
            </button>
          )}

          {isHost && revealed && (
            <button
              onClick={reset}
              className="btn-western text-lg"
            >
              🔄 New Round
            </button>
          )}

          {!isHost && !revealed && (
            <div className="text-wood-600 italic flex items-center gap-2">
              <span>Waiting for the host to reveal...</span>
              {allVoted && <span className="text-cactus-600">All votes are in!</span>}
            </div>
          )}

          {!isHost && revealed && (
            <div className="text-wood-600 italic">
              Waiting for the host to start a new round...
            </div>
          )}
        </section>

        {/* Your current selection */}
        {selectedVote && !revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <p className="text-wood-600 mb-2">Your selection:</p>
            <div className="inline-flex items-center gap-4 bg-sand-200 px-6 py-3 rounded-lg">
              <CowboyAvatar type={currentPlayer?.avatar || 'sheriff'} size="sm" hasVoted={true} />
              <VotingCard value={selectedVote} isSelected={true} disabled />
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-12 text-center text-wood-500 text-sm">
        <p>Scrum Poker - Wild West Edition 🤠</p>
      </footer>

      {/* Keyboard shortcuts overlay */}
      <KeyboardShortcuts
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        isHost={isHost}
        revealed={revealed}
        scaleValues={[...votingScale]}
      />
    </div>
  );
}

export default Room;
