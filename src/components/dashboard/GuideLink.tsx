import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideLinkProps {
  sectionId: string;
  label?: string;
  className?: string;
}

export const GuideLink: React.FC<GuideLinkProps> = ({ sectionId, label, className }) => {
  return (
    <Link
      to={`/system-guide#${sectionId}`}
      title={label ? `Open System Guide: ${label}` : `Open System Guide (${sectionId})`}
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 rounded-none border border-black bg-white hover:bg-[var(--color-brand-yellow)] text-black transition-all hover:-translate-y-0.5 active:translate-y-0 text-[10px] font-mono font-bold shrink-0 shadow-[1px_1px_0px_#000]",
        className
      )}
    >
      <HelpCircle size={13} className="stroke-[2.5]" />
    </Link>
  );
};
