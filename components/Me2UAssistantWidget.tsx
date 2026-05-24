"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, LifeBuoy, Loader2, Send, ShieldCheck, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: AssistantCitation[];
  suggestedActions?: string[];
  confidence?: "low" | "medium" | "high";
  handoffNeeded?: boolean;
  supportRequest?: SupportRequest;
};

type AssistantCitation = {
  id: string;
  title: string;
  sourceType: string;
  routeHref?: string;
};

type SupportRequest = {
  topic: string;
  summary: string;
  conversationExcerpt: string;
  userId?: string;
  route?: string;
  createdAt: string;
};

const quickPrompts = [
  "Why can't I withdraw yet?",
  "How do I improve my trust score?",
  "What does KYC unlock?",
  "Explain my active loan status.",
  "How do referral rewards work?",
];

const navBackedRoutes = ["/dashboard", "/marketplace", "/wallet", "/profile"];

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseSseFrames(buffer: string) {
  const frames = buffer.split("\n\n");
  return {
    completeFrames: frames.slice(0, -1),
    rest: frames.at(-1) || "",
  };
}

function parseFrame(frame: string) {
  const event = frame.split("\n").find((line) => line.startsWith("event: "))?.slice(7);
  const data = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
  if (!event || !data) return null;
  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return null;
  }
}

function sourceLabel(citation: AssistantCitation) {
  if (citation.sourceType === "account") return "Your account";
  if (citation.sourceType === "support") return "Support";
  if (citation.sourceType === "policy") return "Policy";
  if (citation.sourceType === "rule") return "App rule";
  return "Me2U";
}

function mailtoSupport(request?: SupportRequest) {
  const subject = encodeURIComponent(request?.topic || "Me2U Guide support request");
  const body = encodeURIComponent([
    request?.summary || "I need help with my Me2U account.",
    request?.route ? `Route: ${request.route}` : "",
    request?.conversationExcerpt ? `Conversation: ${request.conversationExcerpt}` : "",
    request?.createdAt ? `Created: ${request.createdAt}` : "",
  ].filter(Boolean).join("\n\n"));

  return `mailto:menenityhub@gmail.com?subject=${subject}&body=${body}`;
}

export default function Me2UAssistantWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "I am Me2U Guide. Type any question in your own words, or pick a suggestion to start.",
      citations: [{ id: "rule:read-only-assistant", title: "Me2U Guide safety boundary", sourceType: "rule", routeHref: "/support" }],
      suggestedActions: quickPrompts.slice(0, 3),
    },
  ]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const hasBottomNav = navBackedRoutes.some((route) => pathname === route || (route !== "/dashboard" && pathname.startsWith(route)));
  const launcherBottom = hasBottomNav
    ? "bottom-[calc(6.35rem+env(safe-area-inset-bottom))] md:bottom-6"
    : "bottom-[calc(1rem+env(safe-area-inset-bottom))] md:bottom-6";

  const visibleMessages = useMemo(() => messages.slice(-12), [messages]);

  async function getAccessToken() {
    if (!hasSupabaseConfig()) return null;
    const {
      data: { session },
    } = await getSupabaseBrowserClient().auth.getSession();
    return session?.access_token || null;
  }

  async function sendMessage(content: string) {
    const question = content.trim();
    if (!question || isSending) return;

    const userMessage: AssistantMessage = { id: newId(), role: "user", content: question };
    const assistantId = newId();
    const nextMessages = [...messages, userMessage];

    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          route: pathname,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Me2U Guide is unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseFrames(buffer);
        buffer = parsed.rest;

        for (const frame of parsed.completeFrames) {
          const event = parseFrame(frame);
          if (!event) continue;

          if (event.event === "delta") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: `${message.content}${event.data.text || ""}` }
                  : message,
              ),
            );
          } else if (event.event === "metadata") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      citations: event.data.citations || [],
                      suggestedActions: event.data.suggestedActions || [],
                      confidence: event.data.confidence,
                      handoffNeeded: Boolean(event.data.handoffNeeded),
                      supportRequest: event.data.supportRequest,
                    }
                  : message,
              ),
            );
          } else if (event.event === "error") {
            throw new Error(event.data.message || "Me2U Guide is unavailable.");
          }
        }
      }

      if (buffer.trim()) {
        const event = parseFrame(buffer);
        if (event?.event === "error") {
          throw new Error(event.data.message || "Me2U Guide is unavailable.");
        }
      }
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Me2U Guide is unavailable.";
      setError(message);
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? { ...item, content: "I could not complete that request. Please try again or contact support." }
            : item,
        ),
      );
    } finally {
      setIsSending(false);
      window.setTimeout(() => {
        panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open Me2U Guide"
        onClick={() => setIsOpen(true)}
        className={`fixed right-4 z-[70] grid h-[4.15rem] w-[4.15rem] place-items-center rounded-[28px] border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-[0_18px_45px_rgba(8,19,32,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(34,197,94,0.22)] md:right-6 ${launcherBottom}`}
      >
        <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-green text-[10px] font-black text-navy ring-4 ring-[var(--color-bg-card)]">
          AI
        </span>
        <span className="relative grid h-12 w-12 place-items-center rounded-[20px] bg-[linear-gradient(135deg,var(--green),var(--lime))] text-navy">
          <span className="absolute inset-[5px] rounded-[16px] border border-navy/25" />
          <ShieldCheck className="absolute h-8 w-8 opacity-35" aria-hidden="true" />
          <span className="relative text-lg font-black leading-none">M</span>
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-[var(--color-scrim)] md:bg-transparent"
              onClick={() => setIsOpen(false)}
            />
            <motion.aside
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-[90] mx-auto flex max-h-[78svh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[0_-24px_70px_rgba(8,19,32,0.30)] md:bottom-6 md:right-6 md:left-auto md:max-h-[min(720px,calc(100vh-3rem))] md:w-[380px] md:rounded-[24px]"
              role="dialog"
              aria-label="Me2U Guide chat"
            >
              <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-[16px] bg-green text-navy">
                    <ShieldCheck size={21} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-black text-[var(--color-text-primary)]">Me2U Guide</h2>
                    <p className="truncate text-xs font-semibold text-[var(--color-text-secondary)]">Ask in your own words</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close Me2U Guide"
                  onClick={() => setIsOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-hover-soft)] hover:text-[var(--color-text-primary)]"
                >
                  <X size={20} />
                </button>
              </header>

              <div ref={panelRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
                {visibleMessages.map((message) => (
                  <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[86%]" : "mr-auto max-w-[92%]"}>
                    <div
                      className={`rounded-[20px] px-4 py-3 text-sm leading-6 ${
                        message.role === "user"
                          ? "bg-green text-navy"
                          : "border border-[var(--color-border)] bg-[var(--mobile-surface-muted)] text-[var(--color-text-primary)]"
                      }`}
                    >
                      {message.content || (
                        <span className="inline-flex items-center gap-2 text-[var(--color-text-secondary)]">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          Checking verified Me2U sources
                        </span>
                      )}
                    </div>

                    {message.role === "assistant" && Boolean(message.citations?.length) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {message.citations?.map((citation) => (
                          <a
                            key={citation.id}
                            href={citation.routeHref || "/support"}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2.5 py-1 text-[10px] font-black text-[var(--color-text-secondary)] transition hover:border-green/40 hover:text-green"
                          >
                            {sourceLabel(citation)}
                            <ArrowUpRight size={11} aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    )}

                    {message.role === "assistant" && message.handoffNeeded && (
                      <a
                        href={mailtoSupport(message.supportRequest)}
                        className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-full bg-navy px-4 text-xs font-black text-snow transition hover:bg-slate"
                      >
                        <LifeBuoy size={15} aria-hidden="true" />
                        Create support request
                      </a>
                    )}
                  </div>
                ))}

                {messages.length === 1 && (
                  <div className="grid gap-2">
                    <p className="px-1 text-[11px] font-black uppercase tracking-normal text-[var(--color-text-secondary)]">
                      Optional examples
                    </p>
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendMessage(prompt)}
                        className="min-h-11 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-left text-sm font-bold text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-soft)]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <p className="mx-3 mb-2 rounded-[14px] bg-[var(--color-negative-bg)] px-3 py-2 text-xs font-bold text-[var(--color-negative-text)]">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="border-t border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <p className="mb-2 px-1 text-xs font-bold text-[var(--color-text-secondary)]">
                  Ask anything or pick a suggestion
                </p>
                <div className="flex items-end gap-2 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    rows={1}
                    maxLength={800}
                    placeholder="Type your own question..."
                    className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-semibold text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)]"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !input.trim()}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green text-navy transition hover:bg-lime disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Send message"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={17} />}
                  </button>
                </div>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
