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
          className="bg-navy rounded-[32px] p-12 md:p-24 lg:p-32 text-center max-w-6xl mx-auto relative overflow-hidden shadow-2xl"
        >
          {/* Subtle Background Glow */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-green/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-lime/5 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-medium text-white mb-10 tracking-tight leading-[1.1]">
              Join the new era of <br/>
              <span className="text-green">trust-based lending.</span>
            </h2>
            
            <p className="text-lg md:text-xl text-white/60 font-normal max-w-2xl mx-auto mb-16 leading-relaxed tracking-tight">
              Start your journey today. Build your trust score, access 0% loans, and grow with your community.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link 
                href="/register" 
                className="btn-primary w-full sm:w-auto text-lg h-auto py-5 px-12"
              >
                Create Account
              </Link>
              <Link 
                href="/login" 
                className="btn-ghost text-white border-white/20 w-full sm:w-auto text-lg h-auto py-5 px-12"
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
