import type { Metadata } from "next";
import LegalPolicyPage from "@/components/LegalPolicyPage";
import { legalDocumentMap, legalDocuments } from "@/lib/legal-content";

const document = legalDocumentMap["legal-information"];

export const metadata: Metadata = {
  title: `${document.title} - Me2U`,
  description: document.summary,
};

export default function LegalInformationPage() {
  return <LegalPolicyPage document={document} documents={legalDocuments} basePath="/legal" />;
}
