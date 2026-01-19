import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type: 'dust' | 'tumbleweed' | 'sparkle';
}

interface AmbientParticlesProps {
  count?: number;
  showTumbleweed?: boolean;
  showSparkles?: boolean;
}

export function AmbientParticles({
  count = 15,
  showTumbleweed = false,
  showSparkles = false,
}: AmbientParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  // Generate particles with stable positions
  useEffect(() => {
    const result: Particle[] = [];

    // Dust particles
    for (let i = 0; i < count; i++) {
      result.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100, // Distributed across full height
        size: 2 + Math.random() * 3, // Slightly larger
        duration: 10 + Math.random() * 10, // Slower float
        delay: Math.random() * 5,
        type: 'dust',
      });
    }

    // Tumbleweed (optional)
    if (showTumbleweed) {
      result.push({
        id: count,
        x: -10,
        y: 85,
        size: 24,
        duration: 15,
        delay: Math.random() * 10,
        type: 'tumbleweed',
      });
    }

    // Sparkles (optional, for celebrations)
    if (showSparkles) {
      for (let i = 0; i < 20; i++) { // More sparkles
        result.push({
          id: count + 1 + i,
          x: 10 + Math.random() * 80,
          y: 20 + Math.random() * 60,
          size: 4 + Math.random() * 4,
          duration: 0.8 + Math.random() * 1.5,
          delay: Math.random() * 0.5,
          type: 'sparkle',
        });
      }
    }

    setParticles(result);
  }, [count, showTumbleweed, showSparkles]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => {
        if (particle.type === 'dust') {
          return (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-sand-500/40"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
              }}
              animate={{
                y: [0, -100],
                x: [0, 20],
                opacity: [0, 0.6, 0.2, 0],
                scale: [1, 1.2, 0.8],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: 'linear',
              }}
            />
          );
        }

        if (particle.type === 'tumbleweed') {
          return (
            <motion.div
              key={particle.id}
              className="absolute"
              style={{
                left: `${particle.x}%`,
                bottom: `${100 - particle.y}%`,
                width: particle.size,
                height: particle.size,
              }}
              animate={{
                x: [0, window.innerWidth + 100],
                rotate: [0, 720],
                y: [0, -20, 0, -15, 0, -10, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: 'linear',
                y: {
                  duration: particle.duration / 4,
                  repeat: 4,
                  ease: 'easeInOut',
                },
              }}
            >
              {/* Tumbleweed SVG */}
              <svg viewBox="0 0 40 40" className="w-full h-full text-wood-600/60">
                <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M 5 20 Q 20 10 35 20 Q 20 30 5 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M 20 5 Q 10 20 20 35 Q 30 20 20 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            </motion.div>
          );
        }

        if (particle.type === 'sparkle') {
          return (
            <motion.div
              key={particle.id}
              className="absolute text-yellow-400"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size * 4,
                height: particle.size * 4,
              }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
                rotate: [0, 180],
                y: [0, -20],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: 'easeInOut',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-full h-full drop-shadow-lg"
              >
                <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
              </svg>
            </motion.div>
          );
        }

        return null;
      })}

      {/* Subtle gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center bottom, transparent 60%, rgba(139, 69, 19, 0.05) 100%)',
        }}
      />
    </div>
  );
}

export default AmbientParticles;
