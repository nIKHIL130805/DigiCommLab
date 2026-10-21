import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <div className="w-4 h-4 rounded-[3px] bg-[var(--text-primary)] flex items-center justify-center">
            <span className="text-[var(--bg-surface)] text-[8px] font-bold leading-none block">~</span>
          </div>
          <span className="font-semibold text-[var(--text-primary)] text-lg tracking-tight">DigiCommLab</span>
        </div>
      </div>
    </footer>
  );
}
