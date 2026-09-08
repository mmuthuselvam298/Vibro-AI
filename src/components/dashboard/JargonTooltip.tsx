import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JargonTooltipProps {
  term: string;
  explanation: string;
  analogy?: string;
  technicalDetails?: string;
  className?: string;
}

export const JargonTooltip: React.FC<JargonTooltipProps> = ({
  term,
  explanation,
  analogy,
  technicalDetails,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className={cn(
          "w-6 h-6 min-w-[24px] min-h-[24px] rounded-full border border-black bg-neutral-100 hover:bg-neutral-800 hover:text-white flex items-center justify-center text-[11px] font-bold font-mono transition-colors ml-1 shrink-0",
          isOpen ? "bg-black text-white" : "text-neutral-700",
          className
        )}
        title={`What is ${term}? Click for plain-English explanation`}
        aria-label={`What is ${term}?`}
      >
        ?
      </button>

      {isOpen && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 bg-white border-2 border-black p-3 font-mono text-xs shadow-[4px_4px_0px_0px_#000] text-black animate-in fade-in zoom-in-95 duration-150"
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Header */}
          <div className="flex items-center gap-1.5 border-b-2 border-black pb-1 mb-2">
            <Info size={14} className="text-black shrink-0" />
            <span className="font-extrabold uppercase text-[11px] tracking-tight">{term}</span>
            <span className="ml-auto text-[9px] px-1 py-0.2 bg-neutral-100 border border-black text-neutral-600 font-bold">
              PLAIN ENGLISH
            </span>
          </div>

          {/* Plain explanation */}
          <p className="text-[11px] text-neutral-900 leading-snug font-medium mb-2">
            {explanation}
          </p>

          {/* Simple Analogy if present */}
          {analogy && (
            <div className="p-1.5 bg-[var(--color-brand-light)] border border-black mb-2 text-[10px] leading-tight">
              <strong className="text-black">Like:</strong> {analogy}
            </div>
          )}

          {/* Small technical definition */}
          {technicalDetails && (
            <div className="pt-1.5 border-t border-neutral-200 text-[9px] text-neutral-500 leading-tight">
              <strong>Technical Spec:</strong> {technicalDetails}
            </div>
          )}

          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r-2 border-b-2 border-black rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
};
