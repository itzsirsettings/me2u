import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { supportDocumentMap, supportDocuments } from "@/lib/legal-content";

const document = supportDocumentMap.support;

export const metadata: Metadata = {
  title: `${document.title} - Me2U`,
  description: document.summary,
};

export default function SupportPage() {
  return <LegalPolicyPage document={document} documents={supportDocuments} basePath="/support" />;
}
