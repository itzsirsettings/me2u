import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="landing-hero-heading"
      aria-describedby="landing-hero-description"
      className="hero-section"
    >
      <div className="hero-bg" aria-hidden="true">
        <Image
          src="/hero-final.webp"
          alt=""
          fill
          sizes="100vw"
          preload
          unoptimized
          className="hero-bg-img"
        />
      </div>
      <div className="hero-overlay" aria-hidden="true" />

      <div className="hero-content">
        <div className="hero-text-block">
          <h1 id="landing-hero-heading" className="hero-headline">
            Borrow with clarity.
            <br />
            Build trust that opens doors.
            <br />
            <span className="hero-trust-word">
              Me2U.
              <svg
                className="hero-trust-underline"
                viewBox="0 0 200 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 8C40 3 100 2 198 8"
                  stroke="var(--color-green)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p id="landing-hero-description" className="hero-subtext">
            A Nigerian finance platform for verified people.
            <br className="hidden sm:inline" /> Use your wallet, repayments, circles, and
            referrals to build a stronger Trust Score.
            <br className="hidden sm:inline" /> Then borrow, lend, save, and manage everyday
            money with clearer terms.
          </p>

          <div className="hero-cta-row">
            <Link
              href="https://app.me2ulend.online/register"
              className="hero-btn-primary"
              id="hero-open-account"
            >
              <span>Start Building Trust</span>
              <span className="hero-btn-shine" aria-hidden="true" />
            </Link>
            <a href="/#how-it-works" className="hero-btn-secondary" id="hero-learn-more">
              See the Me2U journey
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
