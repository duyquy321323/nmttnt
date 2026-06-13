"use client";

import { Menu } from "lucide-react";

interface MobileTopBarProps {
  title?: string;
  subtitle?: string;
  onMenuOpen: () => void;
}

export function MobileTopBar({
  title = "Edu Chatbot",
  subtitle,
  onMenuOpen,
}: MobileTopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
      <button
        type="button"
        onClick={onMenuOpen}
        className="rounded-lg p-2 text-text-strong transition-colors hover:bg-surface-inset"
        aria-label="Mở menu"
      >
        <Menu size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{title}</p>
        {subtitle && <p className="truncate text-[10px] text-text-muted">{subtitle}</p>}
      </div>
    </header>
  );
}
