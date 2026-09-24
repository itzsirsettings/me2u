"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    question: "Is Me2U really 0% interest?",
    answer: "Eligible Me2U loan products use 0% interest. Other actions can still have applicable processor, withdrawal, marketplace, or service charges, so review the confirmation screen before continuing.",
  },
  {
    question: "What do I need to join?",
    answer: "You need the required account details, email verification, identity information, and a registration deposit. KYC, bank details, a passport photo, and review may be required before some features become available.",
  },
  {
    question: "How does the Trust Score work?",
    answer: "Your Trust Score reflects verified identity, repayment behavior, wallet activity, referral progress, account history, and dispute outcomes. It supports progression, but available loans and approval decisions still depend on the rules and checks shown in your account.",
  },
  {
    question: "Can I use Me2U with my family or church group?",
    answer: "Absolutely. Me2U Circles are designed for exactly this. Create private lending groups with family, faith communities, traders, students, or any trusted network. Manage group savings and loans transparently with people you know.",
  },
  {
    question: "How do withdrawals work?",
    answer: "Withdrawals go from your verified wallet to a linked bank account when the withdrawal conditions are met. Applicable processor or withdrawal charges and any retained balance are shown as part of the flow.",
  },
  {
    question: "What if I live outside Nigeria?",
    answer: "Me2U is currently focused on Nigeria. Some diaspora-related readiness may be planned, but account eligibility and available features depend on the supported onboarding and banking rails shown in the product.",
  },
  {
    question: "Is my data and wallet secure?",
    answer: "Me2U provides identity verification, transaction PINs, wallet freeze and recovery actions, fraud reporting, and session controls. Use the Security area to review the controls currently available on your account.",
  },
  {
    question: "How do referrals work?",
    answer: "The current referral lifecycle can award you ₦1,500 when a referred friend signs up, while they receive ₦500. A further ₦250 may follow their first withdrawal and another ₦250 their first repayment, for a potential ₦2,500 across stages. Rewards depend on onboarding, verification, eligibility, and anti-abuse checks, and potential earnings are not automatically a withdrawable balance.",
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

interface FAQItemProps {
  faq: typeof faqs[0];
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
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
              <p className="landing-body text-sm md:text-base leading-relaxed">
                {faq.answer}
              </p>
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
            Everything you need to know about joining Me2U, building trust, and accessing 0% interest loans.
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
