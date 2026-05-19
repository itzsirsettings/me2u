import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import {
  companyInfo,
  footerDisclaimer,
  legalFooterGroups,
  type PolicyDocument,
  type PolicySection,
} from "@/lib/legal-content";

function documentHref(basePath: string, slug: string) {
  if (basePath === "/legal" && slug === "legal-information") return "/legal";
  if (basePath === "/support" && slug === "support") return "/support";
  return `${basePath}/${slug}`;
}

function isExternal(href: string) {
  return href.startsWith("mailto:") || href.startsWith("tel:");
}

function SectionBlock({ section, depth = 0 }: { section: PolicySection; depth?: number }) {
  const Heading = depth > 0 ? "h3" : "h2";

  return (
    <section className={depth > 0 ? "mt-5 rounded-[12px] bg-[var(--mobile-surface-muted)] p-4 md:rounded-[5px]" : "mobile-soft-card p-4 md:p-6"}>
      <Heading className={depth > 0 ? "text-base font-black leading-tight tracking-normal" : "text-xl font-black leading-tight tracking-normal md:text-2xl"}>
        {section.title}
      </Heading>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] md:text-base">
          {paragraph}
        </p>
      ))}
      {section.bullets && (
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {section.bullets.map((item) => (
            <li
              key={item}
              className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)] md:rounded-[5px]"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      {section.subsections?.map((subsection) => (
        <SectionBlock key={subsection.title} section={subsection} depth={depth + 1} />
      ))}
    </section>
  );
}

function PublicFooter() {
  return (
    <footer className="mt-10 rounded-[22px] bg-[var(--color-accent-deep)] p-5 text-[var(--color-on-accent)] md:rounded-[5px] md:p-8">
      <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr_0.9fr_1fr]">
        <div>
          <BrandLogo className="h-10 w-28 brightness-0 invert" />
          <p className="mt-4 text-sm leading-6 text-white/72">
            Me2U is legally owned by {companyInfo.legalName}.
          </p>
          <p className="mt-3 text-sm font-black leading-6 text-white">{companyInfo.tradingName} support</p>
        </div>
        {legalFooterGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-black uppercase tracking-[0.12em] text-white">{group.title}</h2>
            <div className="mt-4 grid gap-2">
              {group.links.map((link) =>
                isExternal(link.href) ? (
                  <a key={link.href} href={link.href} className="text-sm font-semibold leading-6 text-white/72 transition hover:text-white">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} href={link.href} className="text-sm font-semibold leading-6 text-white/72 transition hover:text-white">
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 border-t border-white/14 pt-5">
        <p className="text-xs font-semibold leading-6 text-white/64">{footerDisclaimer}</p>
        <p className="mt-3 text-xs font-semibold text-white/52">©2026 Me2U by {companyInfo.legalName}</p>
      </div>
    </footer>
  );
}

export default function LegalPolicyPage({
  document,
  documents,
  basePath,
}: {
  document: PolicyDocument;
  documents: PolicyDocument[];
  basePath: "/legal" | "/support";
}) {
  return (
    <main className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-6xl md:px-6 md:py-24">
      <header className="mobile-soft-card overflow-hidden p-5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" aria-label="Me2U home" className="inline-flex">
            <BrandLogo className="h-10 w-28" />
          </Link>
          <Link href="/register" className="btn-primary min-h-11">
            Create account
          </Link>
        </div>
        <div className="mt-8 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            {document.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-display font-black leading-none tracking-normal md:text-6xl">
            {document.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--color-text-secondary)] md:text-lg">
            {document.summary}
          </p>
          <p className="mt-4 text-sm font-black text-[var(--color-text-primary)]">
            Last Updated: {document.lastUpdated}
          </p>
        </div>
      </header>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {documents.map((item) => (
          <Link
            key={item.slug}
            href={documentHref(basePath, item.slug)}
            className={`rounded-[14px] border p-3 text-sm font-black transition md:rounded-[5px] ${
              item.slug === document.slug
                ? "border-[var(--color-accent-primary)] bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-soft)]"
            }`}
          >
            {item.title}
          </Link>
        ))}
      </div>

      <article className="mt-5 grid gap-4">
        {document.sections.map((section) => (
          <SectionBlock key={section.title} section={section} />
        ))}
      </article>

      <PublicFooter />
    </main>
  );
}
