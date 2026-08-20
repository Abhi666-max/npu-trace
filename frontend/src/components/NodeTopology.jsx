import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, Activity } from 'lucide-react';

export default function NodeTopology({ status, demoMode }) {
  const isConnected = status.includes('Connected') || demoMode;

  return (
    <div className="w-full flex items-center justify-between mt-4 px-2 mb-2">
      {/* Host IDE Node */}
      <div className="flex flex-col items-center gap-2 relative">
        <div className="w-10 h-10 bg-[#111] border border-[#333] rounded-md flex items-center justify-center z-10">
          <Monitor className="w-5 h-5 text-[#888]" />
        </div>
        <span className="text-[8px] font-mono font-bold text-[#666] tracking-[0.2em] uppercase">HOST IDE</span>
        
        {/* Glow behind node */}
        {isConnected && <div className="absolute top-0 left-0 w-10 h-10 bg-[#FBBF24]/20 blur-xl rounded-full animate-pulse"></div>}
      </div>

      {/* Connection Line */}
      <div className="flex-1 h-[2px] bg-[#222] relative mx-2">
        {isConnected && (
          <motion.div 
            className="absolute top-0 left-0 h-full bg-[#34d399] shadow-[0_0_8px_#34d399]"
            initial={{ width: "0%", left: "0%" }}
            animate={{ width: ["0%", "50%", "0%"], left: ["0%", "25%", "100%"] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          />
        )}
      </div>

      {/* Mobile Node */}
      <div className="flex flex-col items-center gap-2 relative">
        <div className={`w-10 h-10 bg-[#111] border ${isConnected ? 'border-[#34d399]' : 'border-red-500'} rounded-md flex items-center justify-center z-10 transition-colors duration-500`}>
          <Smartphone className={`w-5 h-5 ${isConnected ? 'text-[#34d399]' : 'text-red-500'}`} />
        </div>
        <span className="text-[8px] font-mono font-bold text-[#666] tracking-[0.2em] uppercase">iQOO NPU</span>
        
        {/* Glow behind node */}
        {isConnected && <div className="absolute top-0 left-0 w-10 h-10 bg-[#34d399]/20 blur-xl rounded-full animate-pulse"></div>}
      </div>
    </div>
  );
}
