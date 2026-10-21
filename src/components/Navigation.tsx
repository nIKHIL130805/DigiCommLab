"use client";

import React from "react";
import { scrollToSection } from "@/utils/scroll";

export default function Navigation() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex-shrink-0">
            <button onClick={(e) => scrollToSection('top', e)} className="flex items-center gap-2.5 cursor-pointer focus:outline-none">
              <div className="w-7 h-7 rounded-[5px] bg-[var(--text-primary)] flex items-center justify-center">
                <span className="text-[var(--bg-surface)] text-[13px] font-bold leading-none block">~</span>
              </div>
              <span className="font-display font-semibold text-[var(--text-primary)] text-base tracking-tight">DigiCommLab</span>
            </button>
          </div>
          <div className="hidden md:flex items-center">
            <div className="flex items-baseline space-x-8">
              <button onClick={(e) => scrollToSection('top', e)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[14px] font-medium transition-colors focus:outline-none">Overview</button>
              <button onClick={(e) => scrollToSection('module-sampling', e)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[14px] font-medium transition-colors focus:outline-none">Experiments</button>
              <button onClick={(e) => scrollToSection('section-radioml-benchmark', e)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[14px] font-medium transition-colors focus:outline-none">RadioML Benchmark</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
