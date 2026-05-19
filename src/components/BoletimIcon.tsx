import React from 'react';

export const BoletimIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 100 100" 
    className={className}
    style={{ minWidth: '1.25em', minHeight: '1.25em' }}
  >
    {/* Outline Connections */}
    <line x1="50" y1="50" x2="18" y2="18" stroke="#003399" strokeWidth="4" />
    <line x1="50" y1="50" x2="82" y2="23" stroke="#003399" strokeWidth="4" />
    <line x1="50" y1="50" x2="22" y2="82" stroke="#003399" strokeWidth="4" />
    <line x1="50" y1="50" x2="78" y2="77" stroke="#003399" strokeWidth="4" />

    {/* Outer Circles */}
    <circle cx="18" cy="18" r="14" fill="white" stroke="#003399" strokeWidth="3" />
    <circle cx="82" cy="23" r="14" fill="white" stroke="#003399" strokeWidth="3" />
    <circle cx="22" cy="82" r="14" fill="white" stroke="#003399" strokeWidth="3" />
    <circle cx="78" cy="77" r="14" fill="white" stroke="#003399" strokeWidth="3" />

    {/* Central Circle */}
    <circle cx="50" cy="50" r="26" fill="white" stroke="#003399" strokeWidth="3" />

    {/* Pencil Wood */}
    <path d="M 38 46 L 50 26 L 62 46 Z" fill="white" stroke="#003399" strokeWidth="2" strokeLinejoin="round" />
    
    {/* Pencil Base / Body */}
    <path d="M 38 46 L 62 46 L 62 72 L 38 72 Z" fill="#ff0000" stroke="#003399" strokeWidth="2" strokeLinejoin="round" />
    
    {/* Pencil Middle Line */}
    <line x1="50" y1="46" x2="50" y2="72" stroke="#003399" strokeWidth="2" />

    {/* Pencil Tip */}
    <path d="M 45.2 34 L 50 26 L 54.8 34 Z" fill="#003399" />

    {/* 1. Top-Left: Leaf */}
    <path d="M 16 26 Q 16 20 14 12" stroke="#003399" strokeWidth="1.5" fill="none" />
    <path d="M 15 20 C 22 21, 24 16, 24 16 C 24 16, 19 13, 15 20 Z" fill="none" stroke="#003399" strokeWidth="1.5" />
    <path d="M 14 16 C 8 15, 8 10, 8 10 C 8 10, 13 8, 14 16 Z" fill="none" stroke="#003399" strokeWidth="1.5" />
    <path d="M 14 12 C 16 6, 12 4, 12 4 C 12 4, 8 8, 14 12 Z" fill="none" stroke="#003399" strokeWidth="1.5" />

    {/* 2. Top-Right: USB */}
    <rect x="76" y="19" width="12" height="13" fill="#003399" />
    <rect x="78" y="14" width="8" height="5" fill="white" stroke="#003399" strokeWidth="1.5" />
    <rect x="79.5" y="15.5" width="2" height="2" fill="#003399" />
    <rect x="82.5" y="15.5" width="2" height="2" fill="#003399" />

    {/* 3. Bottom-Left: Wrench */}
    <circle cx="22" cy="77" r="5" fill="#003399" />
    <polygon points="19,72 25,72 23,76 21,76" fill="white" />
    <rect x="20.5" y="77" width="3" height="12" rx="1" fill="#003399" />
    <circle cx="22" cy="87" r="1" fill="white" />

    {/* 4. Bottom-Right: Droplet & Brush */}
    <path d="M 74 72 Q 78 78 78 82 A 4 4 0 1 1 70 82 Q 70 78 74 72 Z" fill="#003399" />
    <path d="M 72 81 A 2 2 0 0 1 72.5 77" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" />
    <rect x="81" y="69" width="3" height="10" fill="#003399" rx="1" />
    <rect x="80.5" y="79" width="4" height="3" fill="none" stroke="#003399" strokeWidth="1" />
    <path d="M 80.5 82 L 84.5 82 L 83.5 87 C 83.5 87, 82.5 88, 81.5 87 Z" fill="#003399" />
  </svg>
);
