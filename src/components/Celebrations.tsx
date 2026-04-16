import { useEffect, useState } from 'react';

const CONFETTI_COLORS = ['#E8836B', '#8B5CF6', '#3BA55C', '#E8C93B', '#3BA5A0', '#E8963B'];
const HEART_COLORS = ['#E8836B', '#8B5CF6', '#F472B6', '#FB7185', '#E879F9'];
const STAR_COLORS = ['#E8C93B', '#FBBF24', '#F59E0B', '#FCD34D', '#FDE68A'];

type CelebrationType = 'confetti' | 'hearts' | 'stars';

interface CelebrationProps {
  type: CelebrationType;
  onDone: () => void;
}

export default function Celebration({ type, onDone }: CelebrationProps) {
  const [pieces] = useState(() => {
    const count = type === 'confetti' ? 40 : 25;
    const colors = type === 'confetti' ? CONFETTI_COLORS : type === 'hearts' ? HEART_COLORS : STAR_COLORS;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      color: colors[i % colors.length],
      size: type === 'confetti' ? 6 + Math.random() * 6 : 14 + Math.random() * 14,
      drift: (Math.random() - 0.5) * 60,
      spin: Math.random() * 720 - 360,
    }));
  });

  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute celebration-piece"
          style={{
            left: `${p.left}%`,
            top: -20,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            '--drift': `${p.drift}px`,
            '--spin': `${p.spin}deg`,
          } as React.CSSProperties}
        >
          {type === 'confetti' && (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                backgroundColor: p.color,
              }}
            />
          )}
          {type === 'hearts' && (
            <svg viewBox="0 0 24 24" fill={p.color} width={p.size} height={p.size}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          )}
          {type === 'stars' && (
            <svg viewBox="0 0 24 24" fill={p.color} width={p.size} height={p.size}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

// Pick a random celebration type
export function getRandomCelebration(): CelebrationType {
  const types: CelebrationType[] = ['confetti', 'hearts', 'stars'];
  return types[Math.floor(Math.random() * types.length)];
}
