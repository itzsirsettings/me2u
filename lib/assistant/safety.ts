import type { AssistantCitation } from "@/lib/assistant/knowledge";

export type AssistantStructuredAnswer = {
  answer: string;
  citations: AssistantCitation[];
  suggestedActions: string[];
  confidence: "low" | "medium" | "high";
  handoffNeeded: boolean;
  supportRequest?: {
    topic: string;
    summary: string;
    conversationExcerpt: string;
    userId?: string;
    route?: string;
    createdAt: string;
  };
};

const blockedSecrets = [
  "card number",
  "secret",
  "token",
  "private key",
];

const credentialWords = ["otp", "password", "pin"];
const unsafeCredentialActions = [
  "bypass",
  "crack",
  "find",
  "get",
  "guess",
  "recover",
  "reveal",
  "send",
  "share",
  "show",
  "steal",
  "tell",
  "unlock",
  "what is",
];

const supportKeywords = [
  "fraud",
  "scam",
  "dispute",
  "failed",
  "missing",
  "stolen",
  "unauthorized",
  "wrong transfer",
  "not credited",
  "repayment conflict",
  "withdrawal issue",
];

const complianceKeywords = [
  "loan",
  "repay",
  "repayment",
  "withdraw",
  "kyc",
  "deposit",
  "legal",
  "terms",
  "dispute",
  "fraud",
];

const conversationalPatterns = [
  /^(hi|hello|hey|yo|good morning|good afternoon|good evening|thanks|thank you|sup)\b[\s!.?]*$/i,
  /^(how are you|how far|what'?s up|are you there)\b[\s!.?]*$/i,
  /^(who are you|what can you do|can you help|help|i need help)\b[\s!.?]*$/i,
];

const gettingStartedPatterns = [
  /\b(how|where)\s+(can|do|should)\s+i\s+(start|begin|get started)\b/i,
  /\b(start|begin|get started)\s+(with|using|on)\s+me2u\b/i,
  /\b(new|first time)\s+(user|customer|account)\b/i,
  /\b(sign up|signup|register|registration)\b/i,
];

export function asksForSecret(message: string) {
  const normalized = message.toLowerCase();
  if (blockedSecrets.some((keyword) => normalized.includes(keyword))) return true;

  return credentialWords.some((credential) => {
    if (!normalized.includes(credential)) return false;
    return unsafeCredentialActions.some((action) => normalized.includes(action));
  });
}

export function isConversationalMessage(message: string) {
  const normalized = message.trim();
  return conversationalPatterns.some((pattern) => pattern.test(normalized));
}

export function isGettingStartedMessage(message: string) {
  const normalized = message.trim();
  return gettingStartedPatterns.some((pattern) => pattern.test(normalized));
}

export function needsSupportHandoff(message: string) {
  const normalized = message.toLowerCase();
  return supportKeywords.some((keyword) => normalized.includes(keyword));
}

export function needsComplianceNote(message: string) {
  const normalized = message.toLowerCase();
  return complianceKeywords.some((keyword) => normalized.includes(keyword));
}

export function makeRefusalAnswer(message: string, route?: string): AssistantStructuredAnswer {
  return {
    answer: message || "I do not have enough verified Me2U information to answer that.",
    citations: [],
    suggestedActions: ["Contact official support", "Try asking about Me2U app rules or your account status"],
    confidence: "low",
    handoffNeeded: true,
    supportRequest: {
      topic: "Assistant could not verify an answer",
      summary: message,
      conversationExcerpt: message,
      route,
      createdAt: new Date().toISOString(),
    },
  };
}

export function buildSupportRequest(params: {
  topic: string;
  summary: string;
  conversationExcerpt: string;
  userId?: string;
  route?: string;
}) {
  return {
    topic: params.topic,
    summary: params.summary,
    conversationExcerpt: params.conversationExcerpt.slice(0, 1200),
    userId: params.userId,
    route: params.route,
    createdAt: new Date().toISOString(),
  };
}

export function sanitizeAssistantAnswer(
  candidate: Partial<AssistantStructuredAnswer>,
  allowedCitationIds: Set<string>,
  latestUserMessage: string,
  route?: string,
): AssistantStructuredAnswer {
  if (asksForSecret(latestUserMessage)) {
    return makeRefusalAnswer(
      "I cannot help reveal or recover OTPs, passwords, PINs, tokens, or private credentials. Use the official recovery or support flow instead.",
      route,
    );
  }

  const citations = (candidate.citations || []).filter((citation) => allowedCitationIds.has(citation.id));

  if ((isConversationalMessage(latestUserMessage) || isGettingStartedMessage(latestUserMessage)) && candidate.answer) {
    return {
      answer: candidate.answer.trim(),
      citations,
      suggestedActions: Array.isArray(candidate.suggestedActions) ? candidate.suggestedActions.slice(0, 4) : [],
      confidence: candidate.confidence === "high" || candidate.confidence === "medium" ? candidate.confidence : "medium",
      handoffNeeded: false,
    };
  }

  if (!candidate.answer || citations.length === 0) {
    return makeRefusalAnswer("I do not have enough verified Me2U information to answer that.", route);
  }

  let answer = candidate.answer.trim();
  const handoffNeeded = Boolean(candidate.handoffNeeded || needsSupportHandoff(latestUserMessage));

  if (needsComplianceNote(latestUserMessage) && !answer.toLowerCase().includes("support")) {
    answer += "\n\nFor account obligations, repayments, disputes, or restrictions, confirm with official Me2U support before acting.";
  }

  return {
    answer,
    citations,
    suggestedActions: Array.isArray(candidate.suggestedActions) ? candidate.suggestedActions.slice(0, 4) : [],
    confidence: candidate.confidence === "high" || candidate.confidence === "medium" ? candidate.confidence : "low",
    handoffNeeded,
    supportRequest: handoffNeeded
      ? candidate.supportRequest || buildSupportRequest({
          topic: "Me2U Guide support handoff",
          summary: latestUserMessage,
          conversationExcerpt: latestUserMessage,
          route,
        })
      : undefined,
  };
}
