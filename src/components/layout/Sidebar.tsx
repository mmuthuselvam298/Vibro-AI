import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Activity,
  BarChart2,
  AlertTriangle,
  Cpu,
  Database,
  ShieldCheck,
  Server,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

interface NavGroup {
  groupName: string;
  items: {
    icon: React.ReactNode;
    label: string;
    path: string;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle }) => {
  const navGroups: NavGroup[] = [
    {
      groupName: 'OPERATIONS',
      items: [
        { icon: <Activity size={20} />, label: 'Command Center', path: '/command-center' },
        { icon: <BarChart2 size={20} />, label: 'Signal Analysis', path: '/signal-analysis' },
        { icon: <AlertTriangle size={20} />, label: 'Fault Diagnosis', path: '/fault-diagnosis' },
        { icon: <Cpu size={20} />, label: 'Digital Twin', path: '/digital-twin' },
        { icon: <Database size={20} />, label: 'Degradation & RUL', path: '/degradation-rul' },
      ]
    },
    {
      groupName: 'SYSTEM',
      items: [
        { icon: <ShieldCheck size={20} />, label: 'Evidence & Hardware', path: '/evidence-hardware' },
        { icon: <Server size={20} />, label: 'System Status', path: '/system-status' },
      ]
    },
    {
      groupName: 'LEARN',
      items: [
        { icon: <BookOpen size={20} />, label: 'System Guide', path: '/system-guide', badge: '14 CH' },
      ]
    }
  ];

  return (
    <aside
      className={cn(
        "border-r-4 border-black bg-[var(--color-brand-light)] flex flex-col transition-all duration-300 relative z-40 shadow-[4px_0px_0px_0px_#000000]",
        isOpen ? "w-64" : "w-20"
      )}
    >
      {/* Brand Header */}
      <div className="p-4 border-b-4 border-black flex items-center justify-between h-20 bg-white">
        {isOpen && (
          <div className="font-bold text-2xl tracking-tighter uppercase whitespace-nowrap overflow-hidden">
            VIBRO-<span className="text-[var(--color-brand-blue)]">AI</span>
            <span className="text-[10px] ml-1.5 font-mono font-bold px-1 py-0.5 border border-black bg-[var(--color-brand-yellow)]">
              FUSION
            </span>
          </div>
        )}
        <button
          onClick={toggle}
          className="p-2 border-2 border-transparent hover:border-black hover:bg-white hover:shadow-[var(--shadow-neobrutalism-sm)] transition-all mx-auto"
        >
          {isOpen ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
        </button>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="px-2">
            {isOpen && (
              <div className="text-[10px] font-mono font-bold text-gray-500 uppercase px-3 mb-1.5 tracking-wider">
                {group.groupName}
              </div>
            )}
            <ul className="space-y-1">
              {group.items.map((item, idx) => (
                <li key={idx}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => cn(
                      "w-full flex items-center p-2.5 border-2 transition-all text-left font-bold group",
                      isActive
                        ? "border-black bg-white shadow-[var(--shadow-neobrutalism-sm)] translate-x-1 text-black"
                        : "border-transparent hover:border-black hover:bg-white hover:shadow-[var(--shadow-neobrutalism-sm)] text-neutral-800"
                    )}
                  >
                    <span className={cn("text-black shrink-0", !isOpen && "mx-auto")}>
                      {item.icon}
                    </span>
                    {isOpen && (
                      <div className="ml-3 flex-1 flex justify-between items-center whitespace-nowrap overflow-hidden">
                        <span className="text-xs group-hover:translate-x-0.5 transition-transform truncate">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="text-[9px] font-mono px-1 py-0.2 border border-black bg-[var(--color-brand-yellow)] text-black font-bold">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Status */}
      <div className="p-3 border-t-4 border-black text-xs font-mono bg-white">
        {isOpen ? (
          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase">SIH26054 PROTOTYPE</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-green)] border border-black animate-pulse" />
              <span className="font-bold text-[11px]">MULTI-PARAMETER READY</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-3 h-3 rounded-full bg-[var(--color-brand-green)] border border-black animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
