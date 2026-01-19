import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimerProps {
  endTime: number | null; // Unix timestamp in milliseconds
  autoReveal: boolean;
  isHost: boolean;
  onStartTimer: (duration: number, autoReveal: boolean) => void;
  onStopTimer: () => void;
}

const TIMER_PRESETS = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '1.5m', value: 90 },
  { label: '2m', value: 120 },
];

export function Timer({ endTime, autoReveal, isHost, onStartTimer, onStopTimer }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showControls, setShowControls] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [selectedAutoReveal, setSelectedAutoReveal] = useState(true);

  // Calculate time left
  useEffect(() => {
    if (!endTime) {
      setTimeLeft(0);
      return;
    }

    const updateTimeLeft = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 100);
    return () => clearInterval(interval);
  }, [endTime]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getUrgencyClass = useCallback(() => {
    if (timeLeft <= 10) return 'text-leather-600 animate-pulse';
    if (timeLeft <= 30) return 'text-leather-500';
    return 'text-wood-700';
  }, [timeLeft]);

  const handleStart = () => {
    onStartTimer(selectedDuration, selectedAutoReveal);
    setShowControls(false);
  };

  const isTimerActive = endTime !== null && timeLeft > 0;

  return (
    <div className="relative">
      {/* Active Timer Display - Fixed floating position */}
      <AnimatePresence mode="popLayout" initial={false}>
        {isTimerActive ? (
          <motion.div
            key="timer-active"
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 bg-sand-100 border-2 border-wood-700 rounded-lg px-3 py-1.5 shadow-md origin-left"
          >
            <div className="flex items-center gap-3">
              {/* Compact Western clock face */}
              <div className="relative w-10 h-10">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Clock background */}
                  <circle cx="50" cy="50" r="45" fill="#f5e6d3" stroke="#4a3728" strokeWidth="4" />

                  {/* Clock tick marks */}
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 30 - 90) * (Math.PI / 180);
                    const x1 = 50 + 35 * Math.cos(angle);
                    const y1 = 50 + 35 * Math.sin(angle);
                    const x2 = 50 + 40 * Math.cos(angle);
                    const y2 = 50 + 40 * Math.sin(angle);
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#8b4513"
                        strokeWidth="2"
                      />
                    );
                  })}

                  {/* Progress arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#e8c4a0"
                    strokeWidth="6"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke={timeLeft <= 10 ? '#c9a227' : '#8b4513'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={2 * Math.PI * 38 * (1 - timeLeft / (endTime ? (endTime - Date.now() + timeLeft * 1000) / 1000 : selectedDuration))}
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                  />

                  {/* Center decoration */}
                  <circle cx="50" cy="50" r="8" fill="#4a3728" />
                  <polygon
                    points="50,48 52,50 50,52 48,50"
                    fill="#c9a227"
                  />
                </svg>
              </div>

              <div className="flex flex-col">
                <div className={`text-xl font-bold leading-none ${getUrgencyClass()}`} style={{ fontFamily: "'Rye', serif" }}>
                  {formatTime(timeLeft)}
                </div>
                {autoReveal && (
                  <div className="text-[10px] text-wood-600 leading-tight">Auto-reveal</div>
                )}
              </div>

              {isHost && (
                <button
                  onClick={onStopTimer}
                  className="p-1 hover:bg-leather-100 rounded transition-colors ml-1"
                  title="Stop timer"
                >
                  <svg className="w-4 h-4 text-leather-600" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          isHost && (
            <motion.div
              key="controls"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="origin-left"
            >
              <button
                onClick={() => setShowControls(true)}
                className="flex items-center gap-2 text-wood-600 hover:text-wood-800 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
                <span className="text-sm">Set Timer</span>
              </button>

              {/* Floating popover for timer controls */}
              <AnimatePresence>
                {showControls && (
                  <>
                    {/* Backdrop to close on click outside */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setShowControls(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="!absolute top-full right-0 mt-2 z-50 wanted-poster rounded-lg p-4 space-y-3 min-w-[280px] shadow-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-wood-700 font-semibold">Voting Timer</div>
                        <button
                          onClick={() => setShowControls(false)}
                          className="p-1 hover:bg-sand-300 rounded"
                        >
                          <svg className="w-4 h-4 text-wood-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      {/* Duration presets */}
                      <div className="flex gap-2 flex-wrap">
                        {TIMER_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => setSelectedDuration(preset.value)}
                            className={`
                              px-3 py-1 rounded text-sm font-medium transition-all
                              ${selectedDuration === preset.value
                                ? 'bg-leather-500 text-sand-100'
                                : 'bg-sand-200 text-wood-700 hover:bg-sand-300'
                              }
                            `}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Auto-reveal toggle */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAutoReveal}
                          onChange={(e) => setSelectedAutoReveal(e.target.checked)}
                          className="w-4 h-4 text-leather-500 border-wood-400 rounded focus:ring-leather-500"
                        />
                        <span className="text-sm text-wood-700">Auto-reveal when timer ends</span>
                      </label>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleStart}
                          className="btn-western text-sm flex-1"
                        >
                          Start Timer
                        </button>
                        <button
                          onClick={() => setShowControls(false)}
                          className="px-3 py-1 text-wood-600 hover:text-wood-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

export default Timer;
