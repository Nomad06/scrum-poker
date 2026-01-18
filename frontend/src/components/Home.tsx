import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'initial' | 'create' | 'join'>('initial');

  const createRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name, partner!');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/rooms', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to create room');

      const data = await response.json();
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
      const response = await fetch(`/api/rooms/${joinCode.toUpperCase()}/check`);
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
