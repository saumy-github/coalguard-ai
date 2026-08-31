import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const EmptyState = ({ 
  icon, 
  title = 'No records found', 
  description = 'Everything is currently up to date.', 
  actionLabel, 
  onAction 
}) => {
  return (
    <div className="glass-card rounded-2xl p-8 sm:p-12 text-center border border-[#51443d]/40 flex flex-col items-center justify-center my-4">
      <div className="w-12 h-12 rounded-xl bg-[#252423] border border-[#51443d]/60 flex items-center justify-center text-[#f6b994] mb-3">
        {icon || <ShieldCheck className="w-6 h-6" />}
      </div>
      <h3 className="text-sm sm:text-base font-bold text-white font-['Sora'] mb-1">
        {title}
      </h3>
      <p className="text-xs text-[#9e8d85] font-mono max-w-md mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-bronze px-4 py-2 rounded-xl text-xs font-mono font-bold"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
