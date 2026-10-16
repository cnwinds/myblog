import { useMemo } from 'react';

const COLORS = ['#ff8a66', '#ff4f8b', '#8f84ff', '#5fe0bb', '#ffffff'];

interface WindFieldProps {
  lines?: number;
  className?: string;
}

/** 风场线条：确定性生成，每次渲染形状一致。 */
export default function WindField({ lines = 34, className }: WindFieldProps) {
  const paths = useMemo(() => {
    return Array.from({ length: lines }, (_, i) => {
      const y = 40 + i * 14;
      const amplitude = 26 + (i % 7) * 6;
      const phase = i * 0.38;
      let d = `M -20 ${y}`;
      for (let x = 0; x <= 600; x += 40) {
        const yy = y + Math.sin(x / 90 + phase) * amplitude + Math.cos(x / 50 + i) * 6;
        d += ` L ${x} ${yy.toFixed(1)}`;
      }
      const color = COLORS[i % COLORS.length];
      return {
        d,
        color,
        width: i % 5 === 0 ? 1.6 : 0.9,
        opacity: color === '#ffffff' ? 0.18 : 0.42,
        delay: `${(i % 9) * -1.3}s`,
      };
    });
  }, [lines]);

  return (
    <svg className={className} viewBox="0 0 560 560" preserveAspectRatio="none" aria-hidden="true">
      {paths.map((path) => (
        <path
          key={path.d}
          d={path.d}
          stroke={path.color}
          strokeWidth={path.width}
          fill="none"
          opacity={path.opacity}
          strokeLinejoin="round"
          style={{ animationDelay: path.delay }}
        />
      ))}
    </svg>
  );
}
