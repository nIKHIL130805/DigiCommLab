"use client";

import React, { useState } from "react";
import { scrollToSection } from "@/utils/scroll";

interface SectionBanner {
  id: number;
  title: string;
  badge: string;
  tagline: string;
  target: string;
  // Desktop 3D layout coordinates
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  baseZIndex: number;
  width: number;
  height: number;
  floatAnim: string;
  floatDuration: number;
  floatDelay: number;
}

const SECTION_BANNERS: SectionBanner[] = [
  {
    id: 1,
    title: "Sampling & Quantization",
    badge: "SAMPLING",
    tagline: "Nyquist Criterion, Aliasing & Sinc Reconstruction",
    target: "module-sampling",
    x: 8,
    y: 0,
    z: 22,
    rx: 4,
    ry: -6,
    rz: -1.5,
    baseZIndex: 12,
    width: 274,
    height: 152,
    floatAnim: "banner-float-1",
    floatDuration: 6.2,
    floatDelay: 0,
  },
  {
    id: 2,
    title: "Digital Coding",
    badge: "SOURCE CODING",
    tagline: "PCM, DPCM & Delta Quantization Staircase",
    target: "module-digital-coding",
    x: 258,
    y: 22,
    z: 14,
    rx: 5,
    ry: 6,
    rz: 1.8,
    baseZIndex: 11,
    width: 274,
    height: 152,
    floatAnim: "banner-float-2",
    floatDuration: 5.8,
    floatDelay: -1.2,
  },
  {
    id: 3,
    title: "Line Coding",
    badge: "BASEBAND",
    tagline: "Polar NRZ, RZ, Manchester & Spectral PSD",
    target: "module-linecoding",
    x: 0,
    y: 172,
    z: 34,
    rx: -2,
    ry: -5,
    rz: 1,
    baseZIndex: 14,
    width: 276,
    height: 152,
    floatAnim: "banner-float-3",
    floatDuration: 7.2,
    floatDelay: -2.4,
  },
  {
    id: 4,
    title: "Digital Modulation",
    badge: "PASSBAND",
    tagline: "PSK, QAM, FSK & I/Q Constellation Plots",
    target: "module-modulation",
    x: 250,
    y: 194,
    z: 44,
    rx: 2,
    ry: 7,
    rz: -1,
    baseZIndex: 15,
    width: 280,
    height: 152,
    floatAnim: "banner-float-1",
    floatDuration: 6.6,
    floatDelay: -0.8,
  },
  {
    id: 5,
    title: "PN Sequence / Spread Spectrum",
    badge: "SPREAD SPECTRUM",
    tagline: "LFSR Generator, DSSS & Frequency Hopping",
    target: "module-pn-sequence",
    x: 12,
    y: 344,
    z: 24,
    rx: -3.5,
    ry: -4,
    rz: -1.5,
    baseZIndex: 13,
    width: 274,
    height: 152,
    floatAnim: "banner-float-2",
    floatDuration: 7.6,
    floatDelay: -3.2,
  },
  {
    id: 6,
    title: "RadioML Benchmark",
    badge: "BENCHMARK · RF DATASET",
    tagline: "220,000 Over-the-Air Labeled RF Records",
    target: "section-radioml-benchmark",
    x: 260,
    y: 366,
    z: 32,
    rx: 3,
    ry: 5,
    rz: 1.5,
    baseZIndex: 14,
    width: 276,
    height: 152,
    floatAnim: "banner-float-3",
    floatDuration: 6.4,
    floatDelay: -1.8,
  },
];

const renderBannerGraphic = (id: number) => {
  switch (id) {
    case 1:
      // Sampling & Quantization: Analog sine wave with discrete sample stems and points
      return (
        <svg viewBox="0 0 200 38" className="w-full h-8 overflow-visible" fill="none">
          <line x1="0" y1="19" x2="200" y2="19" stroke="var(--border-subtle)" strokeWidth="0.8" strokeDasharray="2 2" />
          <path d="M 0 19 Q 25 3 50 19 T 100 19 T 150 19 T 200 19" stroke="var(--text-tertiary)" strokeWidth="1" opacity="0.4" strokeDasharray="3 2" />
          {[
            { x: 12, y: 10 }, { x: 34, y: 10 }, { x: 62, y: 28 }, { x: 86, y: 28 },
            { x: 112, y: 10 }, { x: 136, y: 10 }, { x: 162, y: 28 }, { x: 186, y: 28 }
          ].map((pt, i) => (
            <g key={i}>
              <line x1={pt.x} y1="19" x2={pt.x} y2={pt.y} stroke="var(--accent)" strokeWidth="1.4" />
              <circle cx={pt.x} cy={pt.y} r="2" fill="var(--accent)" />
            </g>
          ))}
          <path d="M 0 19 Q 25 5 50 19 T 100 19 T 150 19 T 200 19" stroke="var(--accent)" strokeWidth="1.2" opacity="0.8" />
        </svg>
      );
    case 2:
      // Digital Coding: Quantizer decision levels with staircase and binary words
      return (
        <svg viewBox="0 0 200 38" className="w-full h-8 overflow-visible" fill="none">
          <line x1="0" y1="8" x2="200" y2="8" stroke="var(--border-subtle)" strokeWidth="0.7" strokeDasharray="2 2" />
          <line x1="0" y1="18" x2="200" y2="18" stroke="var(--border-subtle)" strokeWidth="0.7" strokeDasharray="2 2" />
          <line x1="0" y1="28" x2="200" y2="28" stroke="var(--border-subtle)" strokeWidth="0.7" strokeDasharray="2 2" />
          <path d="M 4 33 C 35 32, 70 8, 105 8 C 140 8, 165 30, 196 33" stroke="var(--text-tertiary)" strokeWidth="0.9" opacity="0.4" />
          <path d="M 4 33 H 28 V 28 H 54 V 18 H 80 V 8 H 125 V 18 H 150 V 28 H 175 V 33 H 196" stroke="var(--accent)" strokeWidth="1.4" />
          <text x="34" y="24" fill="var(--text-tertiary)" fontSize="6.5" fontFamily="monospace">001</text>
          <text x="60" y="14" fill="var(--text-tertiary)" fontSize="6.5" fontFamily="monospace">010</text>
          <text x="96" y="6" fill="var(--accent)" fontSize="6.5" fontFamily="monospace" fontWeight="bold">011</text>
          <text x="131" y="14" fill="var(--text-tertiary)" fontSize="6.5" fontFamily="monospace">010</text>
          <text x="156" y="24" fill="var(--text-tertiary)" fontSize="6.5" fontFamily="monospace">001</text>
        </svg>
      );
    case 3:
      // Line Coding: Manchester and Polar NRZ pulse transitions
      return (
        <svg viewBox="0 0 200 38" className="w-full h-8 overflow-visible" fill="none">
          <line x1="0" y1="21" x2="200" y2="21" stroke="var(--border-subtle)" strokeWidth="0.8" strokeDasharray="2 2" />
          {[40, 80, 120, 160].map((cx) => (
            <line key={cx} x1={cx} y1="6" x2={cx} y2="34" stroke="var(--border-subtle)" strokeWidth="0.7" strokeDasharray="1 2" />
          ))}
          <path d="M 4 10 H 20 V 31 H 40 V 31 H 60 V 10 H 80 V 10 H 100 V 31 H 120 V 10 H 140 V 31 H 160 V 31 H 180 V 10 H 196" stroke="var(--accent)" strokeWidth="1.4" />
          <text x="17" y="7" fill="var(--text-secondary)" fontSize="7" fontFamily="monospace">1</text>
          <text x="57" y="7" fill="var(--text-secondary)" fontSize="7" fontFamily="monospace">0</text>
          <text x="97" y="7" fill="var(--text-secondary)" fontSize="7" fontFamily="monospace">1</text>
          <text x="137" y="7" fill="var(--text-secondary)" fontSize="7" fontFamily="monospace">1</text>
          <text x="177" y="7" fill="var(--text-secondary)" fontSize="7" fontFamily="monospace">0</text>
        </svg>
      );
    case 4:
      // Digital Modulation: I/Q constellation diagram with crosshair & QPSK symbols
      return (
        <svg viewBox="0 0 200 38" className="w-full h-8 overflow-visible" fill="none">
          <line x1="28" y1="4" x2="28" y2="34" stroke="var(--border-strong)" strokeWidth="0.9" />
          <line x1="13" y1="19" x2="43" y2="19" stroke="var(--border-strong)" strokeWidth="0.9" />
          <circle cx="28" cy="19" r="9" stroke="var(--border-subtle)" strokeWidth="0.7" strokeDasharray="2 2" />
          <circle cx="21" cy="12" r="2.2" fill="var(--accent)" />
          <circle cx="35" cy="12" r="2.2" fill="var(--accent)" />
          <circle cx="21" cy="26" r="2.2" fill="var(--accent)" />
          <circle cx="35" cy="26" r="2.2" fill="var(--accent)" />
          <line x1="52" y1="19" x2="60" y2="19" stroke="var(--text-tertiary)" strokeWidth="0.8" strokeDasharray="1 1" />
          <path d="M 62 19 Q 68 6 74 19 T 86 19 T 98 19 M 98 19 Q 104 32 110 19 T 122 19 T 134 19 M 134 19 Q 140 6 146 19 T 158 19 T 170 19 T 182 19 T 194 19" stroke="var(--accent)" strokeWidth="1.3" />
          <line x1="98" y1="7" x2="98" y2="31" stroke="var(--text-tertiary)" strokeWidth="0.7" strokeDasharray="1 2" />
          <line x1="134" y1="7" x2="134" y2="31" stroke="var(--text-tertiary)" strokeWidth="0.7" strokeDasharray="1 2" />
        </svg>
      );
    case 5:
      // PN Sequence: Shift registers with XOR tap feedback and chip sequence
      return (
        <svg viewBox="0 0 200 38" className="w-full h-8 overflow-visible" fill="none">
          <rect x="8" y="7" width="20" height="15" rx="1.5" stroke="var(--border-strong)" strokeWidth="0.9" fill="var(--bg-surface-alt)" />
          <text x="14" y="17.5" fill="var(--text-primary)" fontSize="7.5" fontFamily="monospace">S₃</text>
          <path d="M 28 14.5 H 37" stroke="var(--border-strong)" strokeWidth="0.9" />

          <rect x="37" y="7" width="20" height="15" rx="1.5" stroke="var(--border-strong)" strokeWidth="0.9" fill="var(--bg-surface-alt)" />
          <text x="43" y="17.5" fill="var(--text-primary)" fontSize="7.5" fontFamily="monospace">S₂</text>
          <path d="M 57 14.5 H 66" stroke="var(--border-strong)" strokeWidth="0.9" />

          <rect x="66" y="7" width="20" height="15" rx="1.5" stroke="var(--border-strong)" strokeWidth="0.9" fill="var(--bg-surface-alt)" />
          <text x="72" y="17.5" fill="var(--text-primary)" fontSize="7.5" fontFamily="monospace">S₁</text>
          <path d="M 86 14.5 H 95" stroke="var(--border-strong)" strokeWidth="0.9" />

          <rect x="95" y="7" width="20" height="15" rx="1.5" stroke="var(--accent)" strokeWidth="1" fill="var(--accent)" fillOpacity="0.1" />
          <text x="101" y="17.5" fill="var(--accent)" fontSize="7.5" fontFamily="monospace" fontWeight="bold">S₀</text>

          <circle cx="66" cy="30" r="4.5" stroke="var(--accent)" strokeWidth="0.9" fill="var(--bg-surface)" />
          <path d="M 66 27 V 33 M 63 30 H 69" stroke="var(--accent)" strokeWidth="0.9" />
          <path d="M 105 22 V 30 H 71 M 61 30 H 4 V 14.5 H 8" stroke="var(--accent)" strokeWidth="0.9" strokeDasharray="2 1.5" />

          <path d="M 124 19 H 133 V 10 H 142 V 19 H 149 V 10 H 160 V 19 H 170 V 10 H 180 V 19 H 194" stroke="var(--accent)" strokeWidth="1.2" />
          <text x="135" y="31" fill="var(--text-tertiary)" fontSize="6.5" fontFamily="monospace">m-seq chips</text>
        </svg>
      );
    case 6:
      // RadioML Benchmark: Dual I/Q channels and over-the-air trajectory
      return (
        <svg viewBox="0 0 200 38" className="w-full h-8 overflow-visible" fill="none">
          <path d="M 4 12 Q 18 3 32 12 T 60 12 T 90 12 T 120 12 T 150 12 T 180 12 T 196 12" stroke="var(--accent)" strokeWidth="1.3" opacity="0.9" />
          <path d="M 4 25 Q 18 34 32 25 T 60 25 T 90 25 T 120 25 T 150 25 T 180 25 T 196 25" stroke="#8b5cf6" strokeWidth="1.1" opacity="0.8" />
          <circle cx="32" cy="12" r="1.5" fill="var(--accent)" />
          <circle cx="90" cy="12" r="1.5" fill="var(--accent)" />
          <circle cx="150" cy="12" r="1.5" fill="var(--accent)" />
          <circle cx="60" cy="25" r="1.5" fill="#8b5cf6" />
          <circle cx="120" cy="25" r="1.5" fill="#8b5cf6" />
          <text x="168" y="9" fill="var(--accent)" fontSize="6.5" fontFamily="monospace" fontWeight="bold">I [t]</text>
          <text x="168" y="35" fill="#8b5cf6" fontSize="6.5" fontFamily="monospace" fontWeight="bold">Q [t]</text>
        </svg>
      );
    default:
      return null;
  }
};

export default function ModuleCarousel() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <div className="w-full flex justify-center lg:justify-end">
      {/* =========================================================================
          DESKTOP: FLOATING 3D COMPOSITION WITH PERSPECTIVE & DEPTH
          ========================================================================= */}
      <div className="hidden lg:block w-full max-w-[550px] lg:scale-[0.88] xl:scale-100 lg:origin-top-right xl:origin-center transition-transform duration-300">
        <div
          className="relative w-[540px] h-[525px] mx-auto select-none"
          style={{
            perspective: "1200px",
            transformStyle: "preserve-3d",
          }}
        >
          {SECTION_BANNERS.map((card) => {
            const isHovered = hoveredId === card.id;
            const isOtherHovered = hoveredId !== null && !isHovered;

            // Hover state: Enlarge 1.15x, bring forward in 3D (translateZ), straighten to 0deg orientation
            const transform = isHovered
              ? `translate3d(0, 0, 75px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1.15)`
              : isOtherHovered
                ? `translate3d(0, 0, ${card.z}px) rotateX(${card.rx}deg) rotateY(${card.ry}deg) rotateZ(${card.rz}deg) scale(0.97)`
                : `translate3d(0, 0, ${card.z}px) rotateX(${card.rx}deg) rotateY(${card.ry}deg) rotateZ(${card.rz}deg) scale(1)`;

            const zIndex = isHovered ? 50 : card.baseZIndex;
            const opacity = isOtherHovered ? 0.58 : 1;
            const filter = isOtherHovered ? "blur(0.2px)" : "none";

            return (
              <div
                key={card.id}
                className="absolute transition-all"
                style={{
                  left: `${card.x}px`,
                  top: `${card.y}px`,
                  width: `${card.width}px`,
                  transform,
                  zIndex,
                  opacity,
                  filter,
                  transformStyle: "preserve-3d",
                  transition: "transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 300ms ease, filter 300ms ease",
                }}
                onMouseEnter={() => setHoveredId(card.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className={`banner-float-anim group relative w-full rounded-[var(--radius-md)] bg-[var(--bg-surface)] border cursor-pointer overflow-hidden flex flex-col justify-between p-3.5 select-none transition-all duration-300 ${
                    isHovered
                      ? "border-[var(--accent)] shadow-[0_22px_44px_-10px_rgba(53,105,212,0.28),0_0_0_1.5px_var(--accent),0_6px_16px_rgba(32,34,37,0.08)] ring-1 ring-[var(--accent)]"
                      : "border-[var(--border-strong)] shadow-[0_4px_16px_-4px_rgba(32,34,37,0.08),0_1px_3px_rgba(32,34,37,0.04)] hover:border-[var(--accent)]"
                  }`}
                  style={{
                    animation:
                      hoveredId !== null
                        ? "none"
                        : `${card.floatAnim} ${card.floatDuration}s ease-in-out infinite ${card.floatDelay}s`,
                  }}
                  onClick={(e) => scrollToSection(card.target, e)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      scrollToSection(card.target);
                    }
                  }}
                >
                  {/* Subtle Top Accent Hairline */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-[2px] transition-colors duration-300 ${
                      isHovered ? "bg-[var(--accent)]" : "bg-transparent group-hover:bg-[var(--accent)]"
                    }`}
                  />

                  {/* Top Bar: Badge and Arrow */}
                  <div className="flex items-center justify-between mb-1.5 pt-0.5">
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold tracking-wider uppercase rounded-[var(--radius-sm)] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                      {card.badge}
                    </span>
                    <span className="text-[13px] font-mono text-[var(--text-tertiary)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all duration-200">
                      →
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <div className="mb-2">
                    <h3 className="text-[13.5px] font-bold tracking-tight text-[var(--text-primary)] font-heading leading-tight line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-[10.5px] text-[var(--text-secondary)] tracking-tight line-clamp-1 mt-0.5 opacity-90">
                      {card.tagline}
                    </p>
                  </div>

                  {/* Technical Graphic Strip */}
                  <div className="mt-auto pt-1 border-t border-[var(--border-subtle)]/70">
                    {renderBannerGraphic(card.id)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TABLET & MOBILE: TOUCH-FRIENDLY RESPONSIVE GRID (NO HOVER DEPENDENCE)
          ========================================================================= */}
      <div className="block lg:hidden w-full max-w-xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {SECTION_BANNERS.map((card) => (
            <div
              key={card.id}
              className="group relative w-full rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-strong)] p-3.5 shadow-sm hover:border-[var(--accent)] hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between active:scale-[0.98]"
              onClick={(e) => scrollToSection(card.target, e)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  scrollToSection(card.target);
                }
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-[var(--accent)] transition-colors duration-200" />
              
              <div className="flex items-center justify-between mb-1.5 pt-0.5">
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold tracking-wider uppercase rounded-[var(--radius-sm)] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                  {card.badge}
                </span>
                <span className="text-[13px] font-mono text-[var(--text-tertiary)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all duration-200">
                  →
                </span>
              </div>

              <div className="mb-2">
                <h3 className="text-[14px] font-bold tracking-tight text-[var(--text-primary)] font-heading leading-tight line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                  {card.title}
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] tracking-tight line-clamp-1 mt-0.5">
                  {card.tagline}
                </p>
              </div>

              <div className="mt-auto pt-1.5 border-t border-[var(--border-subtle)]/70">
                {renderBannerGraphic(card.id)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
