import { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../hooks/useWebSocket';
import { PlayerCard } from './PlayerCard';
import { VotingCard } from './VotingCard';
import { CowboyAvatar } from './CowboyAvatar';
import { VOTING_VALUES } from '../types';
import type { RoomState, VotingResult, Player } from '../types';

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

  // Handlers for WebSocket events
  const handleStateSync = useCallback((state: RoomState) => {
    setRoomState(state);
    setVotingResult(null);
    // Clear selected vote on sync (new round)
    const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);
    if (!currentPlayer?.hasVoted) {
      setSelectedVote(null);
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

  const handleVoted = useCallback((playerId: string) => {
    setRoomState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p =>
          p.id === playerId ? { ...p, hasVoted: true } : p
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

  const { isConnected, isConnecting, vote, reveal, reset } = useWebSocket({
    roomCode: code || '',
    playerName,
    onStateSync: handleStateSync,
    onPlayerJoined: handlePlayerJoined,
    onPlayerLeft: handlePlayerLeft,
    onVoted: handleVoted,
    onRevealed: handleRevealed,
    onError: handleError,
    onRoomNotFound: handleRoomNotFound,
  });

  // Handle voting
  const handleVote = (value: string) => {
    setSelectedVote(value);
    vote(value);
  };

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (revealed) return;

      // Number keys for voting
      const keyMap: Record<string, string> = {
        '1': '1', '2': '2', '3': '3', '5': '5',
        '8': '8', 'q': '13', 'w': '21', '/': '?',
      };
      if (keyMap[e.key]) {
        handleVote(keyMap[e.key]);
      }

      // R for reveal (host only)
      if (e.key === 'r' && isHost && allVoted) {
        reveal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, isHost, allVoted, reveal]);

  if (!code) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
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
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-cactus-500' : isConnecting ? 'bg-sand-500 animate-pulse' : 'bg-leather-500'
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
                <div className="flex flex-wrap justify-center gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-leather-600 mb-1">
                      {votingResult.average?.toFixed(1) || '—'}
                    </div>
                    <div className="text-wood-600">Average</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-cactus-600 mb-1">
                      {Object.values(votingResult.votes).filter(v => v !== '?').length}
                    </div>
                    <div className="text-wood-600">Numeric Votes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-wood-600 mb-1">
                      {Object.values(votingResult.votes).filter(v => v === '?').length}
                    </div>
                    <div className="text-wood-600">Uncertain</div>
                  </div>
                </div>

                {/* Vote distribution */}
                <div className="mt-6 pt-4 border-t border-wood-300">
                  <h3 className="text-lg text-wood-700 mb-3 text-center">Vote Distribution</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {VOTING_VALUES.map(value => {
                      const count = Object.values(votingResult.votes).filter(v => v === value).length;
                      if (count === 0) return null;
                      return (
                        <div key={value} className="flex flex-col items-center">
                          <VotingCard value={value} isRevealed={true} />
                          <span className="mt-2 text-wood-700 font-semibold">×{count}</span>
                        </div>
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
              {VOTING_VALUES.map(value => (
                <VotingCard
                  key={value}
                  value={value}
                  isSelected={selectedVote === value}
                  onClick={() => handleVote(value)}
                />
              ))}
            </div>
            <p className="text-center text-wood-800 text-sm mt-3 bg-sand-100/80 inline-block mx-auto px-4 py-1 rounded">
              Keyboard: 1, 2, 3, 5, 8, Q(13), W(21), /(?)
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
    </div>
  );
}

export default Room;
