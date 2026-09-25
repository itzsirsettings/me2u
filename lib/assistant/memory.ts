/**
 * Me2U Guide session memory (project-brain phase B foundation).
 *
 * Session-only and derived from the messages already sent in this
 * conversation: no cross-user learning, no persistence, and no secrets.
 * The summary is injected into the assistant prompt so follow-up answers
 * stay consistent across the conversation.
 */

export type AssistantMemoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantMemory = {
  topics: string[];
  preferences: string[];
  unresolved: string[];
  lastRoute?: string;
};

const maxTopics = 5;
const maxPreferences = 3;
const maxUnresolved = 3;

const topicMatchers: Array<{ topic: string; pattern: RegExp }> = [
  { topic: "withdrawals", pattern: /withdraw|cash out/i },
  { topic: "kyc", pattern: /\bkyc\b|verif|identity|nin|bvn|passport/i },
  { topic: "loans", pattern: /loan|borrow|repay|interest/i },
  { topic: "trust score", pattern: /trust score|credit level|tier/i },
  { topic: "referrals", pattern: /refer|invite|reward|leaderboard|challenge/i },
  { topic: "savings", pattern: /sav(e|ings)|goal/i },
  { topic: "circles", pattern: /circle|group lending|community/i },
  { topic: "marketplace", pattern: /marketplace|listing|offer/i },
  { topic: "bills", pattern: /bill|airtime|data|utility|electricity/i },
  { topic: "wallet", pattern: /wallet|fund|balance|deposit/i },
  { topic: "security", pattern: /secur|pin|freeze|fraud|scam|dispute/i },
  { topic: "support", pattern: /support|contact|help|complaint/i },
];

const preferenceMatchers: RegExp[] = [
  /i prefer (.+?)(?:\.|$)/i,
  /my language is (.+?)(?:\.|$)/i,
  /always (.+?)(?:\.|$)/i,
  /do not (.+?)(?:\.|$)/i,
  /don't (.+?)(?:\.|$)/i,
];

const unresolvedMatcher =
  /fraud|scam|dispute|failed|missing|stolen|unauthorized|not credited|wrong transfer|withdrawal issue|repayment conflict/i;

function pushUnique(target: string[], value: string, limit: number) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return;
  if (target.some((entry) => entry.toLowerCase() === cleaned.toLowerCase())) return;
  if (target.length >= limit) target.shift();
  target.push(cleaned);
}

export function extractSessionMemory(
  messages: AssistantMemoryMessage[] | undefined | null,
  route?: string,
): AssistantMemory {
  const memory: AssistantMemory = { topics: [], preferences: [], unresolved: [] };
  if (route) memory.lastRoute = route.slice(0, 160);

  for (const message of messages || []) {
    if (!message || message.role !== "user" || typeof message.content !== "string") continue;
    const content = message.content.slice(0, 1200);

    for (const { topic, pattern } of topicMatchers) {
      if (pattern.test(content)) pushUnique(memory.topics, topic, maxTopics);
    }

    for (const pattern of preferenceMatchers) {
      const match = pattern.exec(content);
      if (match?.[1]) pushUnique(memory.preferences, match[1], maxPreferences);
    }

    if (unresolvedMatcher.test(content)) {
      pushUnique(memory.unresolved, content.slice(0, 160), maxUnresolved);
    }
  }

  return memory;
}

export function formatMemorySummary(memory: AssistantMemory | null | undefined): string {
  if (!memory) return "";
  const lines: string[] = [];
  if (memory.topics.length > 0) {
    lines.push(`Known topics this session: ${memory.topics.join(", ")}.`);
  }
  if (memory.preferences.length > 0) {
    lines.push(`User preferences: ${memory.preferences.join("; ")}.`);
  }
  if (memory.unresolved.length > 0) {
    lines.push(`Unresolved issues: ${memory.unresolved.join(" | ")}.`);
  }
  if (memory.lastRoute) lines.push(`Current app route: ${memory.lastRoute}.`);
  return lines.join("\n");
}
