import { useState } from 'react';
import './CoverImage.css';

interface CoverImageProps {
  src: string | null;
  title: string;
  seed: number;
  className?: string;
  eager?: boolean;
}

function initialOf(title: string): string {
  const first = Array.from(title.trim())[0] ?? '·';
  return /[a-z]/i.test(first) ? `${first.toUpperCase()}.` : first;
}

/** 有图显示图片；没图或加载失败时用渐变 + 首字生成封面。 */
export default function CoverImage({ src, title, seed, className = '', eager = false }: CoverImageProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        className={`cover-img ${className}`}
        src={src}
        alt={title}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  const initial = initialOf(title);
  return (
    <div className={`cover-gen cover-gen-${seed % 3} ${className}`} role="img" aria-label={title}>
      <span className={initial.endsWith('.') ? 'latin' : 'art'}>{initial}</span>
    </div>
  );
}
