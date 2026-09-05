import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideLinkProps {
  sectionId: string;
  label?: string;
  className?: string;
}

export const GuideLink: React.FC<GuideLinkProps> = ({ sectionId, label = '?', className }) => {
  return (
    <Link
      to={`/system-guide#${sectionId}`}
      title={`Open System Guide: ${sectionId}`}
      className={cn(
        "inline-flex items-center justify-center gap-1 font-mono text-[11px] font-extrabold px-1.5 py-0.5 border-2 border-black bg-white hover:bg-[var(--color-brand-yellow)] text-black transition-all shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 shrink-0 cursor-pointer",
        className
      )}
    >
      <HelpCircle size={13} className="stroke-[2.5]" />
      {label && label !== '?' && <span>{label}</span>}
      {label === '?' && <span>?</span>}
    </Link>
  );
};
