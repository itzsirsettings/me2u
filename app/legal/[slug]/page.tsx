import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { legalDocumentMap, legalDocuments } from "@/lib/legal-content";

type LegalPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return legalDocuments
    .filter((document) => document.slug !== "legal-information")
    .map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = legalDocumentMap[slug];

  if (!document || slug === "legal-information") {
    return {
      title: "Legal - Me2U",
    };
  }

  return {
    title: `${document.title} - Me2U`,
    description: document.summary,
  };
}

export default async function LegalDocumentPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = legalDocumentMap[slug];

  if (!document || slug === "legal-information") notFound();

  return <LegalPolicyPage document={document} documents={legalDocuments} basePath="/legal" />;
}
