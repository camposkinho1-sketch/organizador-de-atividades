import React from 'react';

export const AppLogo = ({ className = "w-12 h-12" }: { className?: string }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Deconstructed Diamond - Dark Tech Neo-Brutalism */}
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Top Left Facet */}
        <polygon 
          points="5,35 45,5 45,35" 
          fill="#3b82f6" 
          stroke="#ffffff" 
          strokeWidth="3" 
          strokeLinejoin="miter"
          className="drop-shadow-[3px_3px_0px_#ffffff]"
        />
        
        {/* Top Right Facet */}
        <polygon 
          points="55,5 95,35 55,35" 
          fill="#ec4899" 
          stroke="#ffffff" 
          strokeWidth="3" 
          strokeLinejoin="miter"
          className="drop-shadow-[3px_3px_0px_#ffffff]"
        />
        
        {/* Bottom Facet */}
        <polygon 
          points="15,45 85,45 50,95" 
          fill="#a3e635" 
          stroke="#ffffff" 
          strokeWidth="3" 
          strokeLinejoin="miter"
          className="drop-shadow-[3px_3px_0px_#ffffff]"
        />
      </svg>
      
      {/* Letter G - Neo-Brutalist floating */}
      <div className="absolute z-10 flex flex-col items-center justify-center w-full h-full pb-[4px]">
        <span 
          className="font-black" 
          style={{ 
            fontSize: '1.5rem', 
            fontFamily: '"Space Grotesk", system-ui, sans-serif', 
            color: '#09090b',
            textShadow: '2px 2px 0px #ffffff, -1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff'
          }}
        >
          G
        </span>
      </div>
    </div>
  );
}
