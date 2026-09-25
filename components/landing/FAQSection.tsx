"use client";

import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";

import { landingFaqs as faqs } from "@/lib/landing-faq";

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

interface FAQItemProps {
  faq: (typeof faqs)[0];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ faq, index, isOpen, onToggle }: FAQItemProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.article
      className="landing-card overflow-hidden"
      variants={shouldReduceMotion ? {} : itemVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.8 }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-5 md:p-6 flex items-start justify-between gap-4 group"
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
        id={`faq-question-${index}`}
      >
        <h3 className="landing-h3 text-base md:text-lg pr-4 group-hover:text-green transition-colors">
          {faq.question}
        </h3>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 text-green transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={shouldReduceMotion ? {} : { height: 0, opacity: 0 }}
            animate={shouldReduceMotion ? {} : { height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            id={`faq-answer-${index}`}
            role="region"
            aria-labelledby={`faq-question-${index}`}
          >
            <div className="px-5 md:px-6 pb-5 md:pb-6">
              <p className="landing-body text-sm md:text-base leading-relaxed">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      ref={sectionRef}
      id="faq"
      aria-labelledby="faq-heading"
      className="landing-section bg-gradient-to-b from-[var(--color-bg-primary)] to-[var(--color-bg-secondary)]"
    >
      <div className="landing-container">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 id="faq-heading" className="landing-h2 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="landing-body max-w-2xl mx-auto">
            Everything you need to know about joining Me2U, building trust, and accessing 0%
            interest loans.
          </p>
        </motion.div>

        {/* FAQ List */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
