import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   Breadcrumb — Contextual Navigation Trail
   ═══════════════════════════════════════════════════════════ */

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Home className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3 h-3 text-[var(--color-text-tertiary)]" />
            {isLast ? (
              <span className="text-[var(--color-text-primary)] font-medium truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
