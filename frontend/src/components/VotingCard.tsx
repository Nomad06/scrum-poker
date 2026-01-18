import { motion, type Variants } from 'framer-motion';

interface VotingCardProps {
  value: string;
  isSelected?: boolean;
  isRevealed?: boolean;
  isOtherPlayer?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function VotingCard({
  value,
  isSelected = false,
  isRevealed = false,
  isOtherPlayer = false,
  onClick,
  disabled = false,
}: VotingCardProps) {
  // Card flip animation
  const cardVariants: Variants = {
    hidden: {
      rotateY: 180,
      scale: 0.8,
    },
    visible: {
      rotateY: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 20,
      },
    },
    selected: {
      rotateY: 0,
      scale: 1.05,
      y: -8,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
      },
    },
  };

  const showBack = isOtherPlayer && !isRevealed;

  return (
    <motion.button
      className={`
        relative w-16 h-24 cursor-pointer
        ${disabled ? 'cursor-not-allowed opacity-60' : ''}
      `}
      style={{ perspective: '1000px' }}
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { y: -4 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      variants={cardVariants}
      animate={isSelected ? 'selected' : 'visible'}
    >
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: showBack ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 25 }}
      >
        {/* Front of card */}
        <div
          className={`
            absolute inset-0 poker-card flex items-center justify-center
            ${isSelected ? 'ring-4 ring-leather-500 ring-offset-2 ring-offset-sand-200' : ''}
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Card decorations */}
          <div className="absolute top-1 left-1.5 text-leather-700 text-xs font-bold">{value}</div>
          <div className="absolute bottom-1 right-1.5 text-leather-700 text-xs font-bold rotate-180">
            {value}
          </div>

          {/* Center value */}
          <span
            className={`
              font-display text-2xl font-bold
              ${value === '?' ? 'text-leather-600' : 'text-wood-800'}
            `}
            style={{ fontFamily: "'Rye', serif" }}
          >
            {value}
          </span>

          {/* Corner decorations */}
          <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-wood-400" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-wood-400" />
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 poker-card-back flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Decorative pattern on back */}
          <div className="w-10 h-14 border-2 border-wood-500 rounded flex items-center justify-center">
            <svg className="w-6 h-6 text-wood-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
        </div>
      </motion.div>
    </motion.button>
  );
}

// Card for displaying other player's vote status
export function PlayerVoteCard({ hasVoted, vote, revealed }: { hasVoted: boolean; vote?: string; revealed: boolean }) {
  if (!hasVoted) {
    return (
      <div className="w-12 h-16 border-2 border-dashed border-wood-400 rounded-lg flex items-center justify-center bg-sand-100/50">
        <span className="text-wood-400 text-xs">...</span>
      </div>
    );
  }

  return (
    <VotingCard
      value={vote || '?'}
      isOtherPlayer={true}
      isRevealed={revealed}
    />
  );
}

export default VotingCard;
