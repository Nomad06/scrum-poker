import { motion, type Variants } from 'framer-motion';

interface CowboyAvatarProps {
  type: string;
  size?: 'sm' | 'md' | 'lg';
  isVoting?: boolean;
  hasVoted?: boolean;
}

// Western color schemes for different characters
const avatarColors: Record<string, { hat: string; face: string; bandana: string; accent: string }> = {
  sheriff: { hat: '#4a3728', face: '#e8c4a0', bandana: '#c9a227', accent: '#ffd700' },
  outlaw: { hat: '#2d2d2d', face: '#d4a574', bandana: '#8b0000', accent: '#1a1a1a' },
  cowgirl: { hat: '#8b4513', face: '#f5d5c8', bandana: '#ff6b6b', accent: '#ffd93d' },
  prospector: { hat: '#5c4033', face: '#c9a66b', bandana: '#666666', accent: '#c0c0c0' },
  banker: { hat: '#1a1a1a', face: '#f0e6d3', bandana: '#2e4057', accent: '#d4af37' },
  deputy: { hat: '#654321', face: '#deb887', bandana: '#4169e1', accent: '#c0c0c0' },
  'saloon-owner': { hat: '#800020', face: '#f5e6d3', bandana: '#ffd700', accent: '#800020' },
  'bounty-hunter': { hat: '#3d3d3d', face: '#c4a77d', bandana: '#2f4f4f', accent: '#8b0000' },
};

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
};

export function CowboyAvatar({ type, size = 'md', isVoting = false, hasVoted = false }: CowboyAvatarProps) {
  // Extract base type (remove any suffix like "-123")
  const baseType = type.split('-')[0];
  const colors = avatarColors[baseType] || avatarColors.sheriff;

  // Idle animation - subtle looking around
  const eyeVariants: Variants = {
    idle: {
      x: [0, 2, 0, -2, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    voting: {
      x: [0, -3, 0, 3, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    voted: {
      x: 0,
    },
  };

  // Hat tip animation when voted
  const hatVariants: Variants = {
    idle: { rotate: 0, y: 0 },
    voting: { rotate: [-2, 2, -2], transition: { duration: 0.5, repeat: Infinity } },
    voted: {
      rotate: [0, -10, 0],
      y: [0, -3, 0],
      transition: { duration: 0.5 },
    },
  };

  const animationState = hasVoted ? 'voted' : isVoting ? 'voting' : 'idle';

  return (
    <motion.div className={`${sizeClasses[size]} relative`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Face */}
        <ellipse cx="50" cy="58" rx="28" ry="32" fill={colors.face} />

        {/* Ears */}
        <ellipse cx="22" cy="55" rx="5" ry="8" fill={colors.face} />
        <ellipse cx="78" cy="55" rx="5" ry="8" fill={colors.face} />

        {/* Bandana/Neckerchief */}
        <path
          d={`M 30 75 Q 50 85 70 75 L 65 90 Q 50 95 35 90 Z`}
          fill={colors.bandana}
        />
        <path
          d={`M 45 85 L 50 98 L 55 85`}
          fill={colors.bandana}
          stroke={colors.bandana}
          strokeWidth="2"
        />

        {/* Hat - animated */}
        <motion.g variants={hatVariants} animate={animationState}>
          {/* Hat brim */}
          <ellipse cx="50" cy="32" rx="40" ry="8" fill={colors.hat} />
          {/* Hat crown */}
          <path
            d={`M 30 32 Q 30 10 50 8 Q 70 10 70 32`}
            fill={colors.hat}
          />
          {/* Hat band */}
          <rect x="32" y="26" width="36" height="4" fill={colors.accent} rx="1" />
          {/* Sheriff badge or decoration */}
          {baseType === 'sheriff' && (
            <polygon
              points="50,20 52,24 56,24 53,27 54,31 50,28 46,31 47,27 44,24 48,24"
              fill={colors.accent}
            />
          )}
        </motion.g>

        {/* Eyes container */}
        <motion.g variants={eyeVariants} animate={animationState}>
          {/* Left eye */}
          <ellipse cx="40" cy="52" rx="6" ry="4" fill="white" />
          <circle cx="41" cy="52" r="2.5" fill="#3d2314" />
          <circle cx="42" cy="51" r="1" fill="white" />

          {/* Right eye */}
          <ellipse cx="60" cy="52" rx="6" ry="4" fill="white" />
          <circle cx="61" cy="52" r="2.5" fill="#3d2314" />
          <circle cx="62" cy="51" r="1" fill="white" />

          {/* Eyebrows */}
          <path d="M 33 47 Q 40 44 47 47" stroke="#5c4033" strokeWidth="2" fill="none" />
          <path d="M 53 47 Q 60 44 67 47" stroke="#5c4033" strokeWidth="2" fill="none" />
        </motion.g>

        {/* Nose */}
        <ellipse cx="50" cy="60" rx="4" ry="3" fill={`${colors.face}dd`} />

        {/* Mouth */}
        {hasVoted ? (
          // Slight smirk when voted
          <path d="M 43 68 Q 50 73 57 68" stroke="#5c4033" strokeWidth="2" fill="none" />
        ) : (
          // Neutral/focused expression
          <path d="M 44 69 L 56 69" stroke="#5c4033" strokeWidth="2" fill="none" />
        )}

        {/* Stubble for some characters */}
        {(baseType === 'outlaw' || baseType === 'prospector' || baseType === 'bounty-hunter') && (
          <g fill="#5c4033" opacity="0.3">
            {[...Array(12)].map((_, i) => (
              <circle
                key={i}
                cx={38 + (i % 4) * 8 + Math.random() * 4}
                cy={72 + Math.floor(i / 4) * 4}
                r="0.5"
              />
            ))}
          </g>
        )}
      </svg>

      {/* Voted indicator */}
      {hasVoted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 -right-1 w-6 h-6 bg-cactus-500 rounded-full flex items-center justify-center border-2 border-sand-100"
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}

export default CowboyAvatar;
