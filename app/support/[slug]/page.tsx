import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { supportDocumentMap, supportDocuments } from "@/lib/legal-content";

type SupportPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return supportDocuments.filter((document) => document.slug !== "support").map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params }: SupportPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = supportDocumentMap[slug];

  if (!document || slug === "support") {
    return {
      title: "Support - Me2U",
    };
  }

  return {
    title: `${document.title} - Me2U`,
    description: document.summary,
  };
}

export default async function SupportDocumentPage({ params }: SupportPageProps) {
  const { slug } = await params;
  const document = supportDocumentMap[slug];

  if (!document || slug === "support") notFound();

  return <LegalPolicyPage document={document} documents={supportDocuments} basePath="/support" />;
}
