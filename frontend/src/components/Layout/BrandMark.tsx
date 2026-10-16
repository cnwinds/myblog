import { useId } from 'react';

interface BrandMarkProps {
  size?: number;
  /** solid：深色底的完整标志；plain：只有白色风线，放在渐变头像里 */
  variant?: 'solid' | 'plain';
  className?: string;
}

const STROKES = [
  'M8 15c6-4 12 4 18 0 2.5-1.6 4-3.6 3-5.4-1-1.8-3.6-1.4-4 .6',
  'M8 22c7-3.5 13 3.5 22 0',
  'M8 29c5-2.6 9 2.4 15 0 2.6-1 3.4-3.6 1.6-4.6',
];

export default function BrandMark({ size = 34, variant = 'solid', className }: BrandMarkProps) {
  const gradientId = useId();

  if (variant === 'plain') {
    return (
      <svg className={className} width={size} height={size} viewBox="2 2 36 36" fill="none" aria-hidden="true">
        {STROKES.map((d) => (
          <path key={d} d={d} stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        ))}
      </svg>
    );
  }

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff6a3d" />
          <stop offset="0.5" stopColor="#ff4f8b" />
          <stop offset="1" stopColor="#6b5cff" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" className="brand-mark-bg" />
      {STROKES.map((d, i) => (
        <path
          key={d}
          d={d}
          stroke={`url(#${gradientId})`}
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity={i === 2 ? 0.85 : 1}
        />
      ))}
    </svg>
  );
}
