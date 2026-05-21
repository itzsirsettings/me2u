"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function LandingCTA() {
  return (
    <section className="py-40 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-slate-950 rounded-[4rem] p-12 md:p-24 lg:p-32 text-center max-w-6xl mx-auto relative overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)]"
        >
          {/* Subtle Background Glow */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-[10px] font-black tracking-[0.2em] uppercase mb-10">
              Future of Cooperative Finance
            </div>
            
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-10 tracking-tight leading-[1.02]">
              Join the new era of <br/>
              <span className="text-emerald-500 text-glow-emerald">trust-based lending.</span>
            </h2>
            
            <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto mb-16 leading-relaxed tracking-tight">
              Start your journey today. Build your trust score, access 0% loans, and grow with your community.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link 
                href="/register" 
                className="w-full sm:w-auto px-12 py-6 bg-white text-slate-950 font-black rounded-2xl transition-all hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 text-lg shadow-2xl"
              >
                Create Account
              </Link>
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-12 py-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all active:scale-95 text-lg"
              >
                Sign In
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
