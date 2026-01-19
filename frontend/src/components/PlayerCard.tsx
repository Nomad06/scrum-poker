import { motion } from 'framer-motion';
import { CowboyAvatar } from './CowboyAvatar';
import { PlayerVoteCard } from './VotingCard';
import type { Player } from '../types';

// ... existing imports
interface PlayerCardProps {
  player: Player;
  isCurrentPlayer?: boolean;
  revealed?: boolean;
  isSuspicious?: boolean;
}

export function PlayerCard({ player, isCurrentPlayer = false, revealed = false, isSuspicious = false }: PlayerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      className={`
        flex flex-col items-center gap-2 p-4 rounded-lg
        ${isCurrentPlayer ? 'bg-sand-300/50 ring-2 ring-leather-500' : 'bg-sand-200/30'}
      `}
    >
      {/* Avatar */}
      <CowboyAvatar
        type={player.avatar}
        size="md"
        hasVoted={player.hasVoted}
        isVoting={!player.hasVoted && !revealed}
        isSuspicious={isSuspicious}
      />

      {/* Name and role */}
      <div className="text-center">
        <div className="flex items-center gap-1 justify-center">
          <span className="font-semibold text-wood-800 truncate max-w-[100px]">
            {player.name}
          </span>
          {isCurrentPlayer && (
            <span className="text-xs text-leather-600">(you)</span>
          )}
        </div>
        {player.isHost && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-1 text-xs text-sand-700 bg-sand-400 px-2 py-0.5 rounded-full mt-1"
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Host
          </motion.span>
        )}
      </div>

      {/* Vote card (for other players) */}
      {!isCurrentPlayer && (
        <PlayerVoteCard
          hasVoted={player.hasVoted}
          vote={player.vote}
          revealed={revealed}
        />
      )}
    </motion.div>
  );
}

export default PlayerCard;
