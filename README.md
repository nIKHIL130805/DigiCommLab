# DigiCommLab — Digital Communication Systems Testbed

An interactive web-based laboratory testbed for **Digital Communication Systems (DCS)**. DigiCommLab bridges communication theory and empirical digital signal processing through real-time numerical simulation, interactive waveform oscilloscopes, spectral magnitude estimation, constellation diagrams, spread-spectrum systems, and over-the-air RF benchmarking.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript 5**, and **Recharts**.

---

## Laboratory Experiments

DigiCommLab is organized as a single-page interactive testbed featuring six core engineering modules:

### 1. Sampling & Quantization (`#module-sampling`)
- **Continuous Signal Sampling:** Adjustable message frequency ($f_m$) and sampling frequency ($f_s$).
- **Nyquist Rate Verification:** Real-time Nyquist rate indicator ($f_s \ge 2 f_m$) with oversampling and undersampling/aliasing demonstrations.
- **Waveform Reconstruction:** Interactive comparison between original continuous signals, discrete sampling impulses, uniform quantization levels, and sinc-interpolated reconstructed signals.

### 2. Digital Coding (`#module-digital-coding`)
- **Pulse Code Modulation (PCM):** Uniform mid-rise quantization across 2 to 8 bits ($L = 2^n$ levels), binary codeword mapping, and SNR / Mean Squared Error (MSE) estimation.
- **Differential PCM (DPCM):** 1st-order linear prediction filter simulating prediction error quantization and receiver accumulation.
- **Delta Modulation (DM):** 1-bit comparative quantization with adjustable step size $\Delta$, tracking slope-overload distortion and granular noise.

### 3. Line Coding & Spectral PSD (`#module-linecoding`)
- **Signaling Formats:** Unipolar NRZ, Unipolar RZ, Polar NRZ, Polar RZ, Bipolar AMI (Alternate Mark Inversion), and Manchester coding.
- **Oscilloscope Waveforms:** Clock-synchronized pulse trains generated from custom or randomized bit sequences.
- **Power Spectral Density (PSD):** Closed-form and empirical spectral plots comparing bandwidth efficiency, DC component presence, and clock timing recovery attributes.

### 4. Digital Modulation (`#module-modulation`)
- **Modulation Schemes:** BASK, BPSK, BFSK, CPFSK, GFSK, PAM4, QPSK, 8PSK, MSK, DPSK, 16-QAM, and 64-QAM.
- **Channel Impairments:** Additive White Gaussian Noise (AWGN) channel model parameterized by Signal-to-Noise Ratio (SNR: 0 to 40 dB).
- **Multi-Domain Inspection:** Time-domain modulated carrier waveforms, empirical Discrete Fourier Transform (DFT) magnitude spectra, received $I/Q$ constellation scatter plots with ideal crosshair targets, and a comparative modulation matrix.

### 5. PN Sequence & Spread Spectrum (`#module-pn-sequence`)
- **Linear Feedback Shift Registers (LFSR):** Fibonacci and Galois architectures supporting 3-stage to 5-stage registers with selectable feedback polynomials.
- **m-Sequence Verification:** Maximal period ($N = 2^m - 1$), balance property checking, run-length distributions, and cyclic auto-correlation function $R(\tau)$.
- **Direct Sequence Spread Spectrum (DSSS):** Baseband data modulation by high-rate pseudo-random chip sequences, BPSK carrier modulation, single-tone/narrowband jammer injection, and coherent correlator despreading with processing gain demonstration.
- **Frequency Hopping Spread Spectrum (FHSS):** Pseudorandom M-ary FSK carrier frequency synthesizer hopping across 8 discrete RF channels, tracking tone-jammer hit collisions and de-hopping demodulation.

### 6. RadioML 2016.10A Modulation Benchmark (`#section-radioml-benchmark`)
- **Dataset Integration:** Built on the DeepSig RadioML 2016.10A synthetic over-the-air RF corpus (220,000 labeled records, 11 modulation classes, 20 SNR steps from $-20\text{ dB}$ to $+18\text{ dB}$ in 2 dB increments).
- **Authentic I/Q Waveforms:** Interactive inspection of authentic $(2 \times 128)$ continuous time-series records ($I[t]$ and $Q[t]$ channels) at $-4\text{ dB}$, $0\text{ dB}$, and $+10\text{ dB}$ SNR.
- **Empirical BER vs. Theory:** Monte Carlo bit error rate curves plotted directly against textbook closed-form waterfall bounds (e.g., $Q(\sqrt{2E_b/N_0})$ for BPSK).

---

## Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) 16.3.8 (App Router, Turbopack)
- **UI Library:** [React](https://react.dev/) 19.2.8
- **Language:** [TypeScript](https://www.typescriptlang.org/) 5
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) v4 (`@tailwindcss/postcss`) with CSS variables and 3D transform perspectives
- **Plotting:** [Recharts](https://recharts.org/) 3.10.1
- **Typography:** Space Grotesk, IBM Plex Sans, IBM Plex Mono via `next/font/google`

---

## Getting Started

### Prerequisites
- **Node.js:** `18.18.0` or later (Node 20 LTS recommended)
- **Package Manager:** `npm` (included with Node.js)

### Installation & Local Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/DigiCommLab.git
   cd DigiCommLab
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

### Production Build

To verify and create an optimized production build:
```bash
npm run build
npm start
```

---

## RadioML Dataset Workflow

The repository includes a precomputed summary dataset located at:
```
public/data/radioml_summary.json (84.4 KB)
```
The web application reads this static file at runtime; **the original multi-gigabyte dataset is NOT required to build, deploy, or run DigiCommLab.**

### Regenerating the Summary (Optional)

If you have downloaded the original `RML2016.10a_dict.pkl` dataset from DeepSig and wish to regenerate or modify the summary data:

1. Ensure Python 3.8+ with `numpy` is installed.
2. Run the preprocessing script:
   ```bash
   python scripts/prepare_radioml.py --input /path/to/RML2016.10a_dict.pkl --output public/data/radioml_summary.json
   ```

---

## Known Boundaries & Implementation Details

To maintain transparency for academic review and grading:

1. **In-Browser Numerical Computation:** All simulations run directly on the client using native JavaScript `Float64Array` buffers. To preserve responsive 60 FPS rendering, time signals use downsampled display steps for long durations.
2. **DFT Magnitude Estimation:** Magnitude spectra are computed using a 200-bin Discrete Fourier Transform (DFT) centered around the carrier frequency, optimized for interactive educational exploration rather than high-resolution 65,536-point FFT analysis.
3. **Pulse Shaping:** Digital modulation carrier transitions use standard rectangular pulses by default for clear pedagogical contrast rather than root-raised-cosine (RRC) filtering.
4. **RadioML Representative Samples:** To keep the repository lightweight and deployable without large external object stores, representative I/Q sample arrays are pre-extracted at $-4\text{ dB}$, $0\text{ dB}$, and $+10\text{ dB}$ SNR levels.

---

## Academic & Presentation Material

- [`DigiCommLab_Professor_QA.md`](./DigiCommLab_Professor_QA.md): Comprehensive 20-question viva preparation handbook covering DCS theoretical proofs, mathematical derivations, code mappings, and limitations.
- [`DigiCommLab_Professor_QA.pdf`](./DigiCommLab_Professor_QA.pdf): Formatted PDF viva preparation guide.

---

## License

This project was developed for the 5th Semester Digital Communication Systems (DCS) coursework. Provided for academic and educational use.
