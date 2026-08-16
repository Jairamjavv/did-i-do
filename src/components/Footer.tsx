import React, { useState } from 'react';
import { Heart } from 'lucide-react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <footer className={`w-full border-t-2 border-black dark:border-white bg-white dark:bg-zinc-950 py-3 mt-auto transition-colors duration-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center relative">
        <div
          className="relative inline-flex items-center gap-1.5 cursor-pointer group select-none py-1"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* TAMIL TOOLTIP ON HOVER */}
          <div
            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-xl border-2 border-black dark:border-white bg-yellow-400 text-black font-titan text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 pointer-events-none z-50 flex items-center gap-1.5 whitespace-nowrap ${isHovered
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-1 scale-95 pointer-events-none'
              }`}
          >
            <span>🙏</span>
            <span className="font-bold tracking-wide">வணக்கம்,</span>
            {/* TOOLTIP ARROW */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-black dark:border-t-white" />
          </div>

          {/* MAIN FOOTER TEXT */}
          <p className="font-mono-clean text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white transition-colors flex items-center gap-1.5">
            <span>Idea by</span>
            <span className="font-titan text-black dark:text-white px-2 py-0.5 rounded-lg border border-black dark:border-white bg-zinc-100 dark:bg-zinc-800 group-hover:bg-yellow-400 group-hover:text-black transition-colors shadow-xs">
              JRM@JAVV
            </span>
            <span>| Made By</span>
            <span className="font-titan text-black dark:text-white px-2 py-0.5 rounded-lg border border-black dark:border-white bg-zinc-100 dark:bg-zinc-800 group-hover:bg-yellow-400 group-hover:text-black transition-colors shadow-xs">
              AI
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};
