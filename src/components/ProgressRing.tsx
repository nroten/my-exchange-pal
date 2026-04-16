import { useEffect, useState } from 'react';

interface ProgressRingProps {
  value: number;
  target: number;
  label: string;
  emoji: string;
  colorClass: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'exchange-starches': '#E8963B',
  'exchange-fruits': '#E8C93B',
  'exchange-vegetables': '#3BA55C',
  'exchange-proteins': '#3BA5A0',
  'exchange-dairy': '#8B5CF6',
  'exchange-fats': '#E8836B',
};

export default function ProgressRing({ value, target, label, emoji, colorClass }: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const size = 80;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(value / target, 1) : 0;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const offset = circumference * (1 - animatedProgress);
  const strokeColor = CATEGORY_COLORS[colorClass] || '#E8836B';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold">{value}</span>
          <span className="text-[10px] text-muted-foreground">/ {target}</span>
        </div>
      </div>
      <span className="text-xs font-medium">{emoji} {label}</span>
    </div>
  );
}
