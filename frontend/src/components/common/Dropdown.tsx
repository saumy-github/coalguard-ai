import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
}

// A from-scratch dropdown, not a native <select> — a native select's popup,
// nested inside an ancestor with `backdrop-filter` (this app's `.glass-panel`,
// index.css), hits a real Chromium/Blink bug where the popup closes almost
// immediately instead of staying open, making an option unreachable. This
// sidesteps it entirely: no OS-level popup is ever opened, just an ordinary
// absolutely-positioned list composited like any other element on the page.
export const Dropdown = ({ value, onChange, options, placeholder, className }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50 flex items-center justify-between gap-2 text-left"
      >
        <span className={selected ? '' : 'text-slate-500'}>{selected ? selected.label : (placeholder ?? 'Select...')}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto rounded-xl bg-[#1a1511] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-mono transition-colors ${
                option.value === value ? 'bg-orange-500/20 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
