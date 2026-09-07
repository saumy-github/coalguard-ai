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

// A from-scratch dropdown, not a native <select> — kept from before Caldera:
// a native select's popup, nested inside certain ancestor stacking contexts,
// can hit real browser popup-positioning bugs. This sidesteps it entirely:
// no OS-level popup is ever opened, just an ordinary absolutely-positioned
// list composited like any other element on the page.
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
        className="w-full px-6 py-3 rounded-input bg-limestone text-obsidian text-sm font-medium focus:outline-none flex items-center justify-between gap-2 text-left"
      >
        <span className={selected ? '' : 'text-obsidian/40'}>{selected ? selected.label : (placeholder ?? 'Select...')}</span>
        <ChevronDown className={`w-4 h-4 text-obsidian/50 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto rounded-2xl bg-chalk p-1.5">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                option.value === value ? 'bg-ember text-chalk' : 'text-obsidian hover:bg-pumice'
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
