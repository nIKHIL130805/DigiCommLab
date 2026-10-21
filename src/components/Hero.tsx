"use client";

import React from "react";
import { scrollToSection } from "@/utils/scroll";

const BackgroundTraces = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
    <svg className="w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      
      {/* Animated Sine Wave */}
      <path 
        d="M -100 250 Q 100 150 300 250 T 700 250 T 1100 250 T 1500 250 T 1900 250" 
        stroke="url(#fade)" 
        strokeWidth="1.5" 
        fill="none" 
        opacity="0.4"
        strokeDasharray="10 5"
      >
        <animate attributeName="stroke-dashoffset" from="15" to="0" dur="2s" repeatCount="indefinite" />
      </path>

      {/* Binary Pulse Train */}
      <path 
        d="M 10% 70% L 10% 65% L 20% 65% L 20% 70% L 35% 70% L 35% 65% L 40% 65% L 40% 70% L 60% 70% L 60% 65% L 65% 65% L 65% 70% L 80% 70%" 
        stroke="var(--text-tertiary)" 
        strokeWidth="1" 
        fill="none" 
        opacity="0.3"
      />
      
      {/* Sampling Markers on Pulse */}
      <circle cx="15%" cy="65%" r="2" fill="var(--accent)" opacity="0.5" />
      <circle cx="37.5%" cy="65%" r="2" fill="var(--accent)" opacity="0.5" />
      <circle cx="62.5%" cy="65%" r="2" fill="var(--accent)" opacity="0.5" />

      {/* Spectral Traces */}
      <g fill="var(--text-secondary)" opacity="0.15">
        <rect x="85%" y="60%" width="1" height="10%" />
        <rect x="86%" y="55%" width="1" height="15%" />
        <rect x="87%" y="45%" width="2" height="25%" fill="var(--accent)" />
        <rect x="88%" y="58%" width="1" height="12%" />
        <rect x="89%" y="65%" width="1" height="5%" />
      </g>
    </svg>
  </div>
);



import ModuleCarousel from "./ModuleCarousel";

export default function Hero() {
  return (
    <section id="top" className="relative py-12 lg:py-16 bg-grid-pattern min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] flex items-center border-b border-[var(--border-subtle)] overflow-hidden">
      <BackgroundTraces />
      
      <div className="relative z-10 max-w-[85rem] mx-auto px-6 sm:px-8 lg:px-12 w-full">
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-24 w-full">
          
          {/* LEFT: Title Area */}
          <div className="w-full lg:w-[50%] flex flex-col items-start xl:pl-8">
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 text-[var(--text-primary)] leading-none">
              DigiComm<span className="text-[var(--accent)] font-semibold">Lab</span>
            </h1>
            
            
            <h2 className="text-2xl md:text-3xl text-[var(--text-primary)] font-medium mb-6 tracking-tight leading-snug max-w-2xl opacity-90">
              An Interactive Digital Communication Testbed for Signal and Performance Analysis.
            </h2>

            
            <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed max-w-lg border-l-2 border-[var(--border-strong)] pl-4">
              An interactive environment for exploring digital communication signals, coding, modulation.
            </p>
          </div>

          {/* RIGHT: Carousel */}
          <div className="w-full lg:w-[45%] flex justify-center lg:justify-end mt-12 lg:mt-0">
            <ModuleCarousel />
          </div>

        </div>

      </div>

    </section>
  );
}
