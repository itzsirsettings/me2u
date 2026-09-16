import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { getAssistantAccountContext } from "@/lib/assistant/account-context";
import {
  getSupportContactSummary,
  retrieveAssistantKnowledge,
  toCitation,
  type AssistantCitation,
} from "@/lib/assistant/knowledge";
import {
  asksForSecret,
  buildSupportRequest,
  isConversationalMessage,
  isGettingStartedMessage,
  makeRefusalAnswer,
  needsSupportHandoff,
  sanitizeAssistantAnswer,
  type AssistantStructuredAnswer,
} from "@/lib/assistant/safety";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const encoder = new TextEncoder();
const defaultModel = "gpt-5.2";
const maxMessages = 12;
const maxMessageLength = 1200;
const defaultOpenAiTimeoutMs = 25_000;
const defaultOpenAiMaxOutputTokens = 900;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "citations", "suggestedActions", "confidence", "handoffNeeded"],
  properties: {
    answer: { type: "string" },
    citations: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "sourceType", "routeHref"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          sourceType: { type: "string", enum: ["document", "policy", "feature", "route", "rule", "support", "account"] },
          routeHref: { type: "string" },
        },
      },
    },
    suggestedActions: {
      type: "array",
      maxItems: 4,
      items: { type: "string" },
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    handoffNeeded: { type: "boolean" },
  },
};

function validateMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((message): message is ChatMessage => {
      if (!message || typeof message !== "object") return false;
      const candidate = message as Partial<ChatMessage>;
      return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
    })
    .slice(-maxMessages)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, maxMessageLength),
    }));
}

function sse(event: "delta" | "metadata" | "error", data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function chunkAnswer(answer: string) {
  const chunks: string[] = [];
  for (let index = 0; index < answer.length; index += 96) {
    chunks.push(answer.slice(index, index + 96));
  }
  return chunks;
}

function formatKnowledgeContext(citations: AssistantCitation[], snippets: string[]) {
  return citations
    .map((citation, index) => {
      return `SOURCE ${index + 1}\nID: ${citation.id}\nTitle: ${citation.title}\nRoute: ${citation.routeHref || "/support"}\nContent:\n${snippets[index]}`;
    })
    .join("\n\n");
}

function buildPrompt(params: {
  messages: ChatMessage[];
  route?: string;
  citations: AssistantCitation[];
  snippets: string[];
  accountSummary?: string;
}) {
  const latestQuestion = params.messages.at(-1)?.content || "";
  const conversation = params.messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  return [
    "You are Me2U Guide, a read-only assistant inside the Me2U app.",
    "You are not a human employee. You answer calmly, directly, and use the approved sources below or the safe account context for Me2U facts.",
    "For casual greetings, capability questions, and light conversational messages, respond naturally and briefly without pretending to perform actions.",
    "If the user asks how to start, get started, register, or sign up, explain the onboarding path from the Protected onboarding source.",
    "Never invent facts. If the sources do not support the answer, set answer to: I do not have enough verified Me2U information to answer that.",
    "Never ask for or reveal passwords, OTPs, PINs, tokens, card details, NIN, full account numbers, private image URLs, or auth secrets.",
    "Never perform actions. You may explain and link users to app pages.",
    "For fraud, disputes, failed wallet credits, repayment conflicts, and withdrawal issues, set handoffNeeded to true.",
    "Every factual answer must include at least one citation using an exact citation id from the allowed sources.",
    "Return only JSON that matches the response schema. Put the user-facing answer in the answer field.",
    `Current route: ${params.route || "unknown"}`,
    `Latest user question: ${latestQuestion}`,
    params.accountSummary ? `SAFE ACCOUNT CONTEXT\n${params.accountSummary}` : "SAFE ACCOUNT CONTEXT\nNo logged-in user context is available.",
    `APP KNOWLEDGE\n${formatKnowledgeContext(params.citations, params.snippets)}`,
    `CONVERSATION\n${conversation}`,
  ].join("\n\n");
}

function parseOpenAiOutputText(response: any) {
  if (typeof response?.output_text === "string") return response.output_text;

  const output = Array.isArray(response?.output) ? response.output : [];
  return output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .map((content: any) => content?.text || "")
    .join("");
}

async function readOpenAiStructuredAnswer(requestBody: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Me2U Guide is not connected to OpenAI yet.");
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || defaultOpenAiTimeoutMs);

  try {
    timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || "OpenAI request failed.");
    }

    const data = await response.json();
    return parseOpenAiOutputText(data);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function normalizeFallbackText(value: string) {
  return value
    .toLowerCase()
    .replace(/₦/g, " naira ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackTokens(value: string) {
  const stopwords = new Set([
    "about",
    "and",
    "can",
    "does",
    "for",
    "how",
    "into",
    "the",
    "what",
    "when",
    "where",
    "why",
    "work",
    "works",
    "with",
  ]);
  const tokens = normalizeFallbackText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !stopwords.has(token));
  const expanded = tokens.flatMap((token) => {
    const variants = [token];
    if (token.endsWith("s")) variants.push(token.slice(0, -1));
    if (!token.endsWith("s")) variants.push(`${token}s`);
    if (token.startsWith("withdraw")) variants.push("withdraw", "withdrawal", "withdrawals");
    if (token.startsWith("deposit")) variants.push("deposit", "deposits");
    if (token.startsWith("loan")) variants.push("loan", "loans");
    if (token.startsWith("refer")) variants.push("referral", "referrals", "reward", "rewards");
    if (token === "verify" || token === "verified" || token === "verification") variants.push("kyc");
    if (token === "kyc") variants.push("verify", "verified", "verification");
    if (token === "repay" || token === "repayment") variants.push("repay", "repayment", "repayments");
    return variants;
  });

  return new Set(expanded);
}

function primaryFallbackTerms(queryTokens: Set<string>) {
  const groups = [
    ["withdraw", "withdrawal", "withdrawals"],
    ["referral", "referrals", "reward", "rewards"],
    ["trust", "score"],
    ["kyc", "verify", "verified", "verification"],
    ["loan", "loans", "borrow", "repay", "repayment", "repayments"],
    ["wallet", "balance", "fund", "funding"],
    ["support", "complaint", "fraud", "dispute"],
  ];

  return groups.find((group) => group.some((token) => queryTokens.has(token))) || [];
}

function fallbackHeading(message: string) {
  const normalized = normalizeFallbackText(message);
  if (normalized.includes("withdraw")) return "For withdrawals:";
  if (normalized.includes("referral") || normalized.includes("reward")) return "For referrals:";
  if (normalized.includes("trust") || normalized.includes("score")) return "For trust score:";
  if (normalized.includes("kyc") || normalized.includes("verify")) return "For KYC:";
  if (normalized.includes("loan") || normalized.includes("borrow") || normalized.includes("repay")) return "For loans:";
  if (normalized.includes("wallet") || normalized.includes("balance") || normalized.includes("fund")) return "For wallet questions:";
  if (normalized.includes("support") || normalized.includes("complaint")) return "For support:";
  return "Here is the verified Me2U information I found:";
}

function isUsefulFallbackLine(line: string, citation: AssistantCitation) {
  const trimmed = line.trim();
  if (trimmed.length < 28) return false;
  if (trimmed === citation.title) return false;
  if (!/[.:;]/.test(trimmed)) return false;
  if (/^source\s+\d+/i.test(trimmed)) return false;
  if (/^rules for /i.test(trimmed)) return false;
  if (/^how Me2U collects/i.test(trimmed)) return false;
  if (/^how Me2U protects privacy/i.test(trimmed)) return false;
  if (/^Me2U provides a secure/i.test(trimmed)) return false;
  if (/^this Privacy Policy/i.test(trimmed)) return false;
  if (/^Me2U may use cookies/i.test(trimmed)) return false;
  if (/^route:/i.test(trimmed)) return false;
  if (/^content:/i.test(trimmed)) return false;
  return true;
}

function scoreFallbackLine(line: string, citation: AssistantCitation, queryTokens: Set<string>) {
  const lineTokens = fallbackTokens(line);
  const primaryTerms = primaryFallbackTerms(queryTokens);
  if (primaryTerms.length > 0 && !primaryTerms.some((token) => lineTokens.has(token))) return 0;

  let score = 0;
  let hasTopicMatch = false;
  for (const token of queryTokens) {
    if (lineTokens.has(token)) {
      score += 3;
      hasTopicMatch = true;
    }
    if (token.endsWith("s") && lineTokens.has(token.slice(0, -1))) {
      score += 2;
      hasTopicMatch = true;
    }
  }
  if (!hasTopicMatch) return 0;
  const citationTokens = fallbackTokens(`${citation.id} ${citation.title} ${citation.routeHref || ""}`);
  if (primaryTerms.some((token) => citationTokens.has(token))) score += 2;
  if (citation.sourceType === "rule") score += 4;
  if (citation.sourceType === "account") score += 5;
  return score;
}

function buildExtractiveFallbackAnswer(params: {
  latestUserMessage: string;
  citations: AssistantCitation[];
  snippets: string[];
}) {
  const queryTokens = fallbackTokens(params.latestUserMessage);
  const candidates = params.citations.flatMap((citation, sourceIndex) => {
    const snippet = params.snippets[sourceIndex] || "";
    return snippet
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => isUsefulFallbackLine(line, citation))
      .map((line, lineIndex) => ({
        line,
        sourceIndex,
        lineIndex,
        sourceType: citation.sourceType,
        score: scoreFallbackLine(line, citation, queryTokens),
      }));
  });

  const nonDocumentCandidates = candidates.filter((candidate) => candidate.sourceType !== "document");
  const candidatePool = nonDocumentCandidates.length > 0 ? nonDocumentCandidates : candidates;
  const rankedCandidates = candidatePool.some((candidate) => candidate.score > 0)
    ? candidatePool.filter((candidate) => candidate.score > 0)
    : candidatePool;

  const sortedCandidates = rankedCandidates
    .sort((left, right) => right.score - left.score || left.sourceIndex - right.sourceIndex || left.lineIndex - right.lineIndex)
    .filter((candidate, index, all) => all.findIndex((item) => item.line === candidate.line) === index);
  const sourceCounts = new Map<number, number>();
  const selected = sortedCandidates
    .filter((candidate) => {
      const currentCount = sourceCounts.get(candidate.sourceIndex) || 0;
      if (currentCount >= 3) return false;
      sourceCounts.set(candidate.sourceIndex, currentCount + 1);
      return true;
    })
    .slice(0, 4)
    .map((candidate) => candidate.line.replace(/\s+/g, " "));

  if (selected.length === 0) {
    return "I do not have enough verified Me2U information to answer that.";
  }

  return [
    fallbackHeading(params.latestUserMessage),
    ...selected.map((line) => `- ${line}`),
    "Open the cited page for the full rule before acting.",
  ].join("\n\n");
}

function summarizeOpenAiError(error: unknown) {
  if (!(error instanceof Error)) return "unknown error";
  try {
    const parsed = JSON.parse(error.message);
    return parsed?.error?.type || parsed?.error?.code || error.name || "request failed";
  } catch {
    return error.name === "AbortError" ? "timeout" : error.message.slice(0, 120);
  }
}

function conversationalFallbackAnswer(message: string): AssistantStructuredAnswer {
  const normalized = message.trim().toLowerCase();
  const isThanks = /^(thanks|thank you)\b/.test(normalized);
  const isWellbeing = /^(how are you|how far|what'?s up)\b/.test(normalized);
  const isIdentity = /^(who are you|what can you do|can you help|help|i need help)\b/.test(normalized);

  return {
    answer: isThanks
      ? "You are welcome. What would you like to do next?"
      : isWellbeing
        ? "I am here and ready to help. What is on your mind?"
        : isIdentity
          ? "I am Me2U Guide. I can explain how to start, KYC, wallet funding, withdrawals, referrals, loans, trust score, and account safety. I can also help you phrase a support request when something needs review."
          : "Hello. I am here with you. Ask me anything, or tell me what you want to figure out.",
    citations: [],
    suggestedActions: ["How can I start?", "Check my account", "Contact support"],
    confidence: "high",
    handoffNeeded: false,
  };
}

function gettingStartedFallbackAnswer(params: {
  route?: string;
  citations: AssistantCitation[];
}) {
  const onboardingCitation = params.citations.find((citation) => citation.id === "rule:onboarding");
  const globalReadinessCitation = params.citations.find((citation) => citation.id === "feature:global-readiness");
  const supportCitation = params.citations.find((citation) => citation.id === "rule:support-contact");
  const citations = [onboardingCitation, globalReadinessCitation, supportCitation]
    .filter((citation): citation is AssistantCitation => Boolean(citation))
    .slice(0, 3);

  if (citations.length === 0) {
    return makeRefusalAnswer("I can help you get started, but I could not load the verified onboarding steps right now. Please open Register or Support.", params.route);
  }

  return sanitizeAssistantAnswer(
    {
      answer: [
        "To start with Me2U:",
        "1. Create your account and verify your email.",
        "2. Complete the registration deposit shown in the app.",
        "3. Finish KYC so higher-risk features can unlock.",
        "4. Set up your wallet and security details.",
        "5. Build your trust score, then use features like loans, referrals, marketplace, and withdrawals based on your account status.",
        "",
        "If you are already logged in, open Dashboard first; it will show the next step for your account.",
      ].join("\n"),
      citations,
      suggestedActions: ["Open Dashboard", "Register", "Ask about KYC"],
      confidence: "high",
      handoffNeeded: false,
    },
    new Set(citations.map((citation) => citation.id)),
    "How can I start?",
    params.route,
  );
}

function localFallbackAnswer(params: {
  latestUserMessage: string;
  route?: string;
  citations: AssistantCitation[];
  snippets: string[];
  userId?: string;
}) {
  if (asksForSecret(params.latestUserMessage)) {
    return makeRefusalAnswer(
      "I cannot help reveal or recover OTPs, passwords, PINs, tokens, or private credentials. Use official recovery or support instead.",
      params.route,
    );
  }

  if (params.citations.length === 0) {
    return makeRefusalAnswer("I do not have enough verified Me2U information to answer that.", params.route);
  }

  const support = getSupportContactSummary();
  const handoffNeeded = needsSupportHandoff(params.latestUserMessage);
  const personalQuestion = /\b(my|me|account|status|balance|loan|kyc|referral|wallet|notification)\b/i.test(params.latestUserMessage);
  const accountIndex = params.citations.findIndex((citation) => citation.id === "account:summary");
  const orderedCitations =
    personalQuestion && accountIndex > -1
      ? [params.citations[accountIndex], ...params.citations.filter((_, index) => index !== accountIndex)]
      : params.citations;
  const orderedSnippets =
    personalQuestion && accountIndex > -1
      ? [params.snippets[accountIndex], ...params.snippets.filter((_, index) => index !== accountIndex)]
      : params.snippets;
  const summary = buildExtractiveFallbackAnswer({
    latestUserMessage: params.latestUserMessage,
    citations: orderedCitations,
    snippets: orderedSnippets,
  });

  return sanitizeAssistantAnswer(
    {
      answer: [
        summary || "Here is the verified Me2U information I found.",
        handoffNeeded
          ? `This looks like a support issue. Contact ${support.email} or ${support.phones.join(", ")} with the details.`
        : "",
      ].filter(Boolean).join("\n\n"),
      citations: orderedCitations.slice(0, 3),
      suggestedActions: handoffNeeded
        ? ["Create support request", "Open Support", "Do not share OTPs or PINs"]
        : ["Open the cited page", "Ask a follow-up", "Contact support if this affects your account"],
      confidence: "medium",
      handoffNeeded,
      supportRequest: handoffNeeded
        ? buildSupportRequest({
            topic: "Me2U Guide support handoff",
            summary: params.latestUserMessage,
            conversationExcerpt: params.latestUserMessage,
            userId: params.userId,
            route: params.route,
          })
        : undefined,
    },
    new Set(orderedCitations.map((citation) => citation.id)),
    params.latestUserMessage,
    params.route,
  );
}

async function buildAssistantAnswer(params: {
  messages: ChatMessage[];
  route?: string;
  citations: AssistantCitation[];
  snippets: string[];
  accountSummary?: string;
  userId?: string;
}) {
  const latestUserMessage = params.messages.at(-1)?.content || "";
  const allowedCitationIds = new Set(params.citations.map((citation) => citation.id));

  if (isConversationalMessage(latestUserMessage)) {
    return conversationalFallbackAnswer(latestUserMessage);
  }

  if (isGettingStartedMessage(latestUserMessage)) {
    return gettingStartedFallbackAnswer({
      route: params.route,
      citations: params.citations,
    });
  }

  if (asksForSecret(latestUserMessage)) {
    return localFallbackAnswer({
      latestUserMessage,
      route: params.route,
      citations: params.citations,
      snippets: params.snippets,
      userId: params.userId,
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return localFallbackAnswer({
      latestUserMessage,
      route: params.route,
      citations: params.citations,
      snippets: params.snippets,
      userId: params.userId,
    });
  }

  const prompt = buildPrompt(params);
  const model = process.env.OPENAI_MODEL?.trim() || defaultModel;

  try {
    const outputText = await readOpenAiStructuredAnswer({
      model,
      input: prompt,
      max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || defaultOpenAiMaxOutputTokens),
      text: {
        format: {
          type: "json_schema",
          name: "me2u_assistant_answer",
          strict: true,
          schema: responseSchema,
        },
      },
    });

    const parsed = JSON.parse(outputText || "{}");
    const sanitized = sanitizeAssistantAnswer(parsed, allowedCitationIds, latestUserMessage, params.route);
    if (
      sanitized.citations.length === 0 &&
      params.citations.length > 0 &&
      !asksForSecret(latestUserMessage) &&
      !isConversationalMessage(latestUserMessage)
    ) {
      return localFallbackAnswer({
        latestUserMessage,
        route: params.route,
        citations: params.citations,
        snippets: params.snippets,
        userId: params.userId,
      });
    }

    return sanitized;
  } catch (error) {
    console.warn(`Me2U Guide using local fallback after OpenAI error: ${summarizeOpenAiError(error)}`);
    return localFallbackAnswer({
      latestUserMessage,
      route: params.route,
      citations: params.citations,
      snippets: params.snippets,
      userId: params.userId,
    });
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const dailyLimit = Number(process.env.ASSISTANT_DAILY_LIMIT || 80);
    if (isRateLimited(`assistant-ip:${clientIp}`, dailyLimit, 24 * 60 * 60_000)) {
      return NextResponse.json({ error: "Me2U Guide is busy. Please wait and try again." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const messages = validateMessages(body.messages);
    const route = typeof body.route === "string" ? body.route.slice(0, 160) : undefined;
    const latestUserMessage = messages.filter((message) => message.role === "user").at(-1)?.content || "";

    if (!latestUserMessage.trim()) {
      return NextResponse.json({ error: "Ask Me2U Guide a question first." }, { status: 400 });
    }

    const maxSnippets = Number(process.env.ASSISTANT_MAX_CONTEXT_SNIPPETS || 6);
    const retrieved = retrieveAssistantKnowledge(latestUserMessage, maxSnippets);
    const knowledgeCitations = retrieved.map((result) => toCitation(result.item));
    const snippets = retrieved.map((result) => result.item.content.slice(0, 1800));

    const authHeader = request.headers.get("authorization");
    const accountContext = await getAssistantAccountContext(authHeader);
    const citations = accountContext ? [...knowledgeCitations, ...accountContext.citations] : knowledgeCitations;
    const accountSummary = accountContext?.summary;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const answer = await buildAssistantAnswer({
            messages,
            route,
            citations,
            snippets: accountSummary ? [...snippets, accountSummary] : snippets,
            accountSummary,
            userId: accountContext?.userId,
          });

          for (const chunk of chunkAnswer(answer.answer)) {
            controller.enqueue(sse("delta", { text: chunk }));
          }

          controller.enqueue(sse("metadata", {
            citations: answer.citations,
            suggestedActions: answer.suggestedActions,
            confidence: answer.confidence,
            handoffNeeded: answer.handoffNeeded,
            supportRequest: answer.supportRequest,
          }));
        } catch (error) {
          controller.enqueue(sse("error", {
            message: error instanceof Error ? error.message : "Me2U Guide is unavailable.",
          }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Me2U Guide is unavailable." },
      { status: 400 },
    );
  }
}
