import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PRESET_SCALES, type VotingScaleType } from '../types';
import { buildApiUrl } from '../config/api';

export function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedScale, setSelectedScale] = useState<VotingScaleType>('fibonacci');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'initial' | 'create' | 'join'>('initial');
  const [recentRooms, setRecentRooms] = useState<string[]>([]);

  useEffect(() => {
    const rooms: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('scrum_poker_token_')) {
        rooms.push(key.replace('scrum_poker_token_', ''));
      }
    }
    setRecentRooms(rooms);
  }, []);

  const createRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name, partner!');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl('api/rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scale: selectedScale }),
      });
      if (!response.ok) throw new Error('Failed to create room');

      const data = await response.json();

      // Store host token for persistence
      if (data.hostToken) {
        localStorage.setItem(`scrum_poker_token_${data.code}`, data.hostToken);
      }

      navigate(`/room/${data.code}?name=${encodeURIComponent(playerName.trim())}`);
    } catch {
      setError('Failed to create room. Try again!');
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name, partner!');
      return;
    }
    if (!joinCode.trim()) {
      setError('Please enter a room code!');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl(`api/rooms/${joinCode.toUpperCase()}/check`));
      const data = await response.json();

      if (!data.exists) {
        setError("That room doesn't exist, partner!");
        return;
      }

      navigate(`/room/${joinCode.toUpperCase()}?name=${encodeURIComponent(playerName.trim())}`);
    } catch {
      setError('Failed to join room. Try again!');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Ambient dust particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-sand-600/40 rounded-full"
            style={{
              left: `${10 + i * 12}%`,
              bottom: '10%',
            }}
            animate={{
              y: [0, -150, -300],
              x: [0, 20, 40],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 8 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.8,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="wanted-poster rounded-lg p-8 w-full max-w-md"
      >
        {/* Title */}
        <div className="text-center mb-8">
          <motion.h1
            className="text-4xl text-wood-800 mb-2 text-shadow-western"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            SCRUM POKER
          </motion.h1>
          <p className="text-wood-600 text-lg italic">Wild West Edition</p>
          <div className="mt-2 flex justify-center gap-2">
            <span className="text-2xl">🤠</span>
            <span className="text-2xl">🎴</span>
            <span className="text-2xl">🌵</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-leather-100 border border-leather-400 text-leather-800 px-4 py-2 rounded mb-4 text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Initial view - choose action */}
        {mode === 'initial' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <button
              onClick={() => setMode('create')}
              className="btn-western w-full text-lg"
            >
              Start a New Game
            </button>
            <button
              onClick={() => setMode('join')}
              className="btn-western w-full text-lg"
              style={{
                background: 'linear-gradient(180deg, var(--color-wood-500) 0%, var(--color-wood-700) 100%)',
              }}
            >
              Join a Game
            </button>

            {/* Recent Rooms */}
            {recentRooms.length > 0 && (
              <div className="mt-6 border-t border-wood-300 pt-4 w-full">
                <h3 className="text-wood-700 font-semibold mb-2 text-center text-sm uppercase tracking-wider">Your Games</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {recentRooms.map(code => (
                    <button
                      key={code}
                      onClick={() => { setJoinCode(code); setMode('join'); }}
                      className="w-full bg-sand-100 hover:bg-sand-200 text-wood-800 p-2 rounded text-sm font-mono tracking-widest border border-wood-300 transition-colors"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Create room view */}
        {mode === 'create' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-wood-700 mb-2 font-semibold">
                What's your name, stranger?
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                className="input-western w-full"
                maxLength={20}
                onKeyDown={(e) => e.key === 'Enter' && createRoom()}
              />
            </div>

            <div>
              <label className="block text-wood-700 mb-2 font-semibold">
                Voting Scale
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PRESET_SCALES) as VotingScaleType[])
                  .filter((key) => key !== 'custom')
                  .map((scaleType) => (
                    <button
                      key={scaleType}
                      onClick={() => setSelectedScale(scaleType)}
                      className={`
                        p-2 rounded-lg border-2 text-sm font-medium transition-all
                        ${selectedScale === scaleType
                          ? 'border-leather-500 bg-leather-100 text-leather-800'
                          : 'border-wood-300 bg-sand-100 text-wood-700 hover:border-wood-400'
                        }
                      `}
                    >
                      <div className="font-bold">{PRESET_SCALES[scaleType].name}</div>
                      <div className="text-xs mt-1 opacity-70 truncate">
                        {PRESET_SCALES[scaleType].values.slice(0, 4).join(', ')}...
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            <button
              onClick={createRoom}
              disabled={isCreating}
              className="btn-western w-full text-lg disabled:opacity-50"
            >
              {isCreating ? 'Saddling up...' : 'Create Room'}
            </button>

            <button
              onClick={() => {
                setMode('initial');
                setError('');
              }}
              className="w-full text-wood-600 hover:text-wood-800 underline"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* Join room view */}
        {mode === 'join' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-wood-700 mb-2 font-semibold">
                What's your name, stranger?
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                className="input-western w-full"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-wood-700 mb-2 font-semibold">
                Room Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code..."
                className="input-western w-full text-center tracking-widest text-xl"
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              />
            </div>

            <button
              onClick={joinRoom}
              disabled={isJoining}
              className="btn-western w-full text-lg disabled:opacity-50"
            >
              {isJoining ? 'Riding in...' : 'Join Room'}
            </button>

            <button
              onClick={() => {
                setMode('initial');
                setError('');
              }}
              className="w-full text-wood-600 hover:text-wood-800 underline"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-wood-300 text-center text-wood-500 text-sm">
          <p>Gather your posse and estimate together!</p>
        </div>
      </motion.div>
    </div>
  );
}

export default Home;
