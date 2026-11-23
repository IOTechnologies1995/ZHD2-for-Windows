import { useState } from 'react';
import { Disc3, Film } from 'lucide-react';
import { MediaType } from '../types';

interface MediaArtProps {
  src: string;
  alt: string;
  type?: MediaType;
  className?: string;
}

export function MediaArt({ src, alt, type = 'audio', className = '' }: MediaArtProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--zhd-surface-2)] text-[var(--zhd-muted)] ${className}`}
        aria-label={alt}
      >
        {type === 'video' ? <Film className="w-8 h-8 opacity-60" /> : <Disc3 className="w-8 h-8 opacity-60" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover block ${className}`}
    />
  );
}
