import { motion, AnimatePresence } from 'framer-motion';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  revealed: boolean;
  scaleValues: string[];
}

export function KeyboardShortcuts({
  isOpen,
  onClose,
  isHost,
  revealed,
  scaleValues,
}: KeyboardShortcutsProps) {
  // Generate keyboard hints based on scale values
  const getKeyboardHints = () => {
    const hints: { key: string; action: string; available: boolean }[] = [];

    // Voting keys (only when not revealed)
    if (!revealed) {
      // Number keys for first 9 values
      scaleValues.slice(0, 9).forEach((value, index) => {
        if (index < 8) {
          const key = value === '?' ? '/' : (index + 1).toString();
          hints.push({
            key,
            action: `Vote ${value}`,
            available: true,
          });
        }
      });

      // Special keys for common Fibonacci values
      if (scaleValues.includes('13')) {
        hints.push({ key: 'Q', action: 'Vote 13', available: true });
      }
      if (scaleValues.includes('21')) {
        hints.push({ key: 'W', action: 'Vote 21', available: true });
      }
    }

    // Host controls
    if (isHost) {
      if (!revealed) {
        hints.push({ key: 'R', action: 'Reveal votes', available: true });
      } else {
        hints.push({ key: 'N', action: 'New round', available: true });
      }
    }

    // General shortcuts
    hints.push({ key: '?', action: 'Toggle this help', available: true });
    hints.push({ key: 'Esc', action: 'Close overlay', available: isOpen });

    return hints;
  };

  const hints = getKeyboardHints();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-wood-900/50 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="wanted-poster rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-wood-800 font-display" style={{ fontFamily: "'Rye', serif" }}>
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-sand-300 rounded transition-colors"
                >
                  <svg className="w-5 h-5 text-wood-600" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                {/* Voting section */}
                {!revealed && (
                  <>
                    <h3 className="text-sm font-semibold text-wood-700 mt-4 mb-2">Voting</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {hints
                        .filter((h) => h.action.startsWith('Vote'))
                        .map((hint) => (
                          <div
                            key={hint.key}
                            className="flex items-center gap-2 p-2 bg-sand-100 rounded"
                          >
                            <kbd className="px-2 py-1 bg-wood-200 text-wood-800 rounded text-sm font-mono min-w-[2rem] text-center">
                              {hint.key}
                            </kbd>
                            <span className="text-sm text-wood-700">{hint.action}</span>
                          </div>
                        ))}
                    </div>
                  </>
                )}

                {/* Host controls */}
                {isHost && (
                  <>
                    <h3 className="text-sm font-semibold text-wood-700 mt-4 mb-2">Host Controls</h3>
                    <div className="space-y-2">
                      {hints
                        .filter((h) => h.action === 'Reveal votes' || h.action === 'New round')
                        .map((hint) => (
                          <div
                            key={hint.key}
                            className="flex items-center gap-2 p-2 bg-leather-50 rounded"
                          >
                            <kbd className="px-2 py-1 bg-leather-200 text-leather-800 rounded text-sm font-mono min-w-[2rem] text-center">
                              {hint.key}
                            </kbd>
                            <span className="text-sm text-leather-700">{hint.action}</span>
                          </div>
                        ))}
                    </div>
                  </>
                )}

                {/* General shortcuts */}
                <h3 className="text-sm font-semibold text-wood-700 mt-4 mb-2">General</h3>
                <div className="space-y-2">
                  {hints
                    .filter((h) => h.action.includes('help') || h.action.includes('overlay'))
                    .map((hint) => (
                      <div
                        key={hint.key}
                        className="flex items-center gap-2 p-2 bg-sand-100 rounded"
                      >
                        <kbd className="px-2 py-1 bg-wood-200 text-wood-800 rounded text-sm font-mono min-w-[2rem] text-center">
                          {hint.key}
                        </kbd>
                        <span className="text-sm text-wood-700">{hint.action}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-wood-300 text-center">
                <p className="text-xs text-wood-500">
                  Press <kbd className="px-1 bg-sand-200 rounded">?</kbd> or{' '}
                  <kbd className="px-1 bg-sand-200 rounded">Esc</kbd> to close
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default KeyboardShortcuts;
