"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function LandingCTA() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-50/50"></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-blue-600 rounded-[3rem] p-10 md:p-16 lg:p-24 text-center max-w-5xl mx-auto shadow-2xl shadow-blue-600/20 relative overflow-hidden"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50"></div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">
              Secure peer lending for individuals and cooperatives.
            </h2>
            <p className="text-xl md:text-2xl text-blue-100 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
              Register, complete your deposit, verify KYC, then use Me2U to fund your wallet, match with peers, manage 0% loans, and support cooperative groups.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link 
                href="/register" 
                className="w-full sm:w-auto px-10 py-5 bg-white text-blue-600 font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 text-lg"
              >
                Create your Me2U account
              </Link>
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-10 py-5 bg-blue-700 hover:bg-blue-800 border border-blue-500 text-white font-bold rounded-2xl transition-all active:scale-95 text-lg"
              >
                Login to wallet
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
