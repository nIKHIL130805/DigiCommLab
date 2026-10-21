import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import SamplingLab from "@/components/laboratories/SamplingLab";
import DigitalCoding from "@/components/laboratories/DigitalCoding";
import LineCoding from "@/components/laboratories/LineCoding";
import Modulation from "@/components/laboratories/Modulation";
import PnSequence from "@/components/laboratories/PnSequence";
import RadioMLBenchmark from "@/components/laboratories/RadioMLBenchmark";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-x-hidden">
      <Navigation />
      
      <div className="flex-grow pt-16 md:pt-20 flex flex-col">
        <Hero />
        
        {/* Active Laboratories */}
        <SamplingLab />
        <DigitalCoding />
        <LineCoding />
        <Modulation />
        <PnSequence />

        {/* RadioML 2016.10A Modulation Benchmark */}
        <RadioMLBenchmark />
      </div>

      <Footer />
    </main>
  );
}
