import React from 'react';

export const BackgroundDoodles: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
      {/* Abstract shape - Bottom Left */}
      <svg className="absolute -bottom-10 -left-10 w-64 h-64 text-[#E5E0D8]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 100 Q 60 40 100 60 T 160 100 T 100 160 T 40 100" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none"/>
        <circle cx="50" cy="150" r="10" fill="currentColor" />
        <path d="M20 120 C 20 120 50 180 100 180" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      </svg>

      {/* Abstract Face/Shape - Top Right */}
      <svg className="absolute -top-10 -right-10 w-96 h-96 text-[#E5E0D8]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="150" cy="50" r="20" stroke="currentColor" strokeWidth="8" fill="none" />
        <path d="M100 20 Q 180 20 180 100" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <path d="M180 100 Q 180 180 100 180" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      </svg>

      {/* Scattered bits */}
      <svg className="absolute top-1/4 left-1/4 w-8 h-8 text-[#E5E0D8]" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
       <svg className="absolute bottom-1/3 right-1/4 w-12 h-12 text-[#E5E0D8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M5 12h14M12 5v14" />
      </svg>
    </div>
  );
};