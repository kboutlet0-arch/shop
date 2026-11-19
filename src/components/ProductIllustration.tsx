import { useState } from 'react';
import type { VisualPreset } from '../types/store';

interface ProductIllustrationProps {
  preset: VisualPreset;
  imageUrl?: string;
  alt: string;
  className?: string;
}

export function ProductIllustration({ preset, imageUrl, alt, className = '' }: ProductIllustrationProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imageUrl && !imgFailed) {
    return (
      <div className={`relative overflow-hidden bg-[#F2F1EE] ${className}`}>
        <img
          src={imageUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#F4F3F0] to-[#EAE8E3] ${className}`}
      aria-label={alt}
    >
      {/* Subtle studio pedestal shadow */}
      <div className="pointer-events-none absolute inset-x-10 bottom-4 h-4 rounded-full bg-black/8 blur-md" />
      <svg
        viewBox="0 0 240 180"
        className="relative z-10 h-3/4 w-3/4 drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {preset === 'headphones' && (
          <g>
            <path d="M56 102C56 64 84 36 120 36C156 36 184 64 184 102" stroke="#18181B" strokeWidth="12" strokeLinecap="round" />
            <path d="M62 96C62 64 88 40 120 40C152 40 178 64 178 96" stroke="#3F3F46" strokeWidth="4" strokeLinecap="round" />
            <rect x="40" y="92" width="28" height="52" rx="12" fill="#18181B" />
            <rect x="64" y="96" width="10" height="44" rx="5" fill="#DC2626" />
            <rect x="172" y="92" width="28" height="52" rx="12" fill="#18181B" />
            <rect x="166" y="96" width="10" height="44" rx="5" fill="#DC2626" />
          </g>
        )}

        {preset === 'earbuds' && (
          <g>
            <rect x="74" y="48" width="92" height="92" rx="28" fill="#18181B" />
            <rect x="78" y="52" width="84" height="34" rx="20" fill="#27272A" />
            <line x1="76" y1="88" x2="164" y2="88" stroke="#3F3F46" strokeWidth="2" />
            <rect x="108" y="98" width="24" height="4" rx="2" fill="#DC2626" />
            <circle cx="102" cy="70" r="9" fill="#F4F4F5" />
            <circle cx="138" cy="70" r="9" fill="#F4F4F5" />
          </g>
        )}

        {preset === 'watch' && (
          <g>
            <rect x="102" y="20" width="36" height="140" rx="8" fill="#27272A" />
            <circle cx="120" cy="90" r="42" fill="#E4E4E7" stroke="#18181B" strokeWidth="4" />
            <circle cx="120" cy="90" r="34" fill="#141413" />
            <circle cx="120" cy="90" r="3" fill="#DC2626" />
            <line x1="120" y1="90" x2="120" y2="66" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="120" y1="90" x2="138" y2="96" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="162" y="84" width="6" height="12" rx="2" fill="#18181B" />
          </g>
        )}

        {preset === 'sneakers' && (
          <g>
            <path
              d="M42 122C42 112 52 106 64 102L96 70L128 84C144 92 172 96 194 102C202 104 206 112 204 122L42 122Z"
              fill="#18181B"
            />
            <path d="M38 122H206C206 132 198 138 186 138H50C40 138 38 130 38 122Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="2" />
            <path d="M98 92L134 108" stroke="#DC2626" strokeWidth="5" strokeLinecap="round" />
            <path d="M108 82L120 88" stroke="#E4E4E7" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {preset === 'hoodie' && (
          <g>
            <path
              d="M84 42C92 32 148 32 156 42L192 66L178 136H156V96L154 146H86L84 96V136H62L48 66L84 42Z"
              fill="#18181B"
            />
            <path d="M96 42C102 58 138 58 144 42" stroke="#3F3F46" strokeWidth="4" fill="#27272A" />
            <rect x="98" y="102" width="44" height="24" rx="6" fill="#27272A" />
            <rect x="106" y="72" width="28" height="4" rx="2" fill="#DC2626" />
          </g>
        )}

        {preset === 'backpack' && (
          <g>
            <path d="M98 44C98 32 142 32 142 44" stroke="#18181B" strokeWidth="7" strokeLinecap="round" />
            <rect x="68" y="46" width="104" height="106" rx="24" fill="#18181B" />
            <rect x="80" y="92" width="80" height="46" rx="12" fill="#27272A" />
            <line x1="88" y1="86" x2="152" y2="86" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
          </g>
        )}

        {preset === 'powerbank' && (
          <g>
            <rect x="76" y="34" width="88" height="116" rx="14" fill="#18181B" />
            <rect x="84" y="42" width="72" height="100" rx="8" fill="#27272A" />
            <circle cx="120" cy="76" r="14" stroke="#DC2626" strokeWidth="3" />
            <path d="M122 68L114 78H122L118 86L126 76H118L122 68Z" fill="#FFFFFF" />
            <rect x="102" y="116" width="36" height="5" rx="2.5" fill="#52525B" />
          </g>
        )}

        {preset === 'sunglasses' && (
          <g>
            <rect x="44" y="70" width="64" height="44" rx="14" fill="#18181B" />
            <rect x="132" y="70" width="64" height="44" rx="14" fill="#18181B" />
            <rect x="52" y="76" width="48" height="32" rx="9" fill="#27272A" />
            <rect x="140" y="76" width="48" height="32" rx="9" fill="#27272A" />
            <path d="M108 84H132" stroke="#18181B" strokeWidth="6" strokeLinecap="round" />
            <line x1="60" y1="84" x2="78" y2="98" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="148" y1="84" x2="166" y2="98" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
}
