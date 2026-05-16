import React from 'react';

export const AppLogo = ({ className = "w-12 h-12" }: { className?: string }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Cave Painting SVG in Gold */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-sm">
        <defs>
          {/* Filter for a rough, painted edge effect */}
          <filter id="roughPaint" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          </filter>
          
          {/* Golden gradient for paint texture */}
          <radialGradient id="goldPaintGradient" cx="45%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fef08a" />   {/* yellow-200 */}
            <stop offset="40%" stopColor="#eab308" />  {/* yellow-500 */}
            <stop offset="75%" stopColor="#d97706" />  {/* amber-600 */}
            <stop offset="100%" stopColor="#92400e" /> {/* amber-800 */}
          </radialGradient>

          {/* Darker golden shade for contrast lines */}
          <radialGradient id="darkGoldPaint" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#b45309" />   {/* amber-700 */}
            <stop offset="100%" stopColor="#78350f" /> {/* amber-900 */}
          </radialGradient>
        </defs>
        
        {/* The symbol group with the rough paint filter applied */}
        <g filter="url(#roughPaint)">
          
          {/* Outer painted blob / rock base */}
          <path 
            d="M 50,6 C 75,4 88,18 94,38 C 98,58 85,85 50,94 C 15,85 2,58 6,38 C 12,18 25,4 50,6 Z" 
            fill="#fef3c7" 
            opacity="0.95"
          />

          {/* Abstract Hand-Painted Diamond Background Base */}
          <path 
            d="M 50,83 C 35,65 18,48 15,42 C 18,30 25,22 28,18 C 40,16 60,16 72,18 C 75,22 82,30 85,42 C 82,48 65,65 50,83 Z" 
            fill="url(#goldPaintGradient)" 
            fillOpacity="0.8"
            stroke="url(#goldPaintGradient)" 
            strokeWidth="5.5" 
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Hand-drawn inner facets mimicking a diamond */}
          <path 
            d="M 16,42 Q 50,40 84,42 M 28,18 Q 38,30 50,82 M 72,18 Q 62,30 50,82 M 43,42 Q 50,45 57,42 M 50,17 L 50,42" 
            fill="none" 
            stroke="url(#darkGoldPaint)" 
            strokeWidth="3.5" 
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        </g>
      </svg>
      
      {/* Letter G - Modern, legible and stylish */}
      <div className="absolute z-10 flex flex-col items-center justify-center w-full h-full pb-[4px]">
        <span 
          className="font-black drop-shadow-md" 
          style={{ 
            fontSize: '1.8rem', 
            fontFamily: 'system-ui, -apple-system, sans-serif', 
            letterSpacing: '-0.02em',
            background: 'linear-gradient(to bottom, #ffffff, #fef08a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0px 2px 2px rgba(120, 53, 15, 0.8))'
          }}
        >
          G
        </span>
      </div>
    </div>
  );
}
