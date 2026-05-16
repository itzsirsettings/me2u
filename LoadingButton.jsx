import { useState, useEffect, useRef } from "react";

/**
 * LoadingButton
 *
 * Props:
 *   label        string   — idle button text
 *   loadingText  string   — first loading message
 *   successText  string   — success state text
 *   onClick      async fn — your auth call (must return a promise)
 *   variant      "solid" | "outline"  (default: "solid")
 *   icon         ReactNode — optional icon shown in idle state
 */

const STYLES = {
  base: {
    position: "relative",
    height: "50px",
    padding: "0 36px",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "15px",
    fontWeight: 600,
    letterSpacing: "0.02em",
    overflow: "hidden",
    transition: "transform 0.15s cubic-bezier(.4,0,.2,1), box-shadow 0.2s, background 0.3s",
    minWidth: "220px",
  },
  solid: {
    background: "#0f0f0f",
    color: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.08)",
  },
  solidSuccess: {
    background: "#1a6b3a",
    color: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.08)",
  },
  outline: {
    background: "transparent",
    color: "#0f0f0f",
    border: "1.5px solid rgba(0,0,0,0.2)",
    boxShadow: "none",
  },
  outlineSuccess: {
    background: "#f0faf4",
    color: "#1a6b3a",
    border: "1.5px solid #1a6b3a",
    boxShadow: "none",
  },
};

const PHASE_MESSAGES = [
  null,
  "Almost there…",
  "Finishing up…",
];

function ArcSpinner({ color = "#fff" }) {
  return (
    <div style={{ width: 20, height: 20, flexShrink: 0 }}>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        style={{ animation: "lb-spin 1s linear infinite" }}
      >
        <circle cx="10" cy="10" r="8" strokeWidth="2.5" stroke={color === "#fff" ? "rgba(255,255,255,.2)" : "rgba(0,0,0,.15)"} />
        <circle
          cx="10" cy="10" r="8"
          strokeWidth="2.5"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray="48"
          strokeDashoffset="14"
          transform="rotate(-90 10 10)"
        />
      </svg>
    </div>
  );
}

function CheckCircle({ color = "rgba(255,255,255,.2)", iconColor = "#fff" }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: "50%",
      background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M2.5 6.5L5.5 9.5L10.5 3.5" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function SlotContent({ visible, children }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      transition: "opacity 0.22s, transform 0.22s cubic-bezier(.4,0,.2,1)",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(6px)",
      pointerEvents: visible ? "auto" : "none",
    }}>
      {children}
    </div>
  );
}

export default function LoadingButton({
  label = "Complete Registration",
  loadingText = "Setting up your account",
  successText = "Account created!",
  onClick,
  variant = "solid",
  icon = null,
  disabled = false,
}) {
  const [state, setState] = useState("idle"); // idle | loading | success
  const [barWidth, setBarWidth] = useState(0);
  const [currentMsg, setCurrentMsg] = useState(loadingText);
  const tickRef = useRef(null);
  const isOutline = variant === "outline";

  const spinnerColor = isOutline ? "#0f0f0f" : "#fff";
  const checkBg = isOutline ? "rgba(26,107,58,.15)" : "rgba(255,255,255,.18)";
  const checkIcon = isOutline ? "#1a6b3a" : "#fff";

  const btnStyle = {
    ...STYLES.base,
    ...(isOutline
      ? state === "success" ? STYLES.outlineSuccess : STYLES.outline
      : state === "success" ? STYLES.solidSuccess : STYLES.solid),
    ...(state !== "idle" || disabled ? { cursor: "not-allowed", opacity: 0.65 } : {}),
  };

  async function handleClick() {
    if (state !== "idle" || disabled) return;
    setState("loading");
    setCurrentMsg(loadingText);
    setBarWidth(0);

    let w = 0;
    let phase = 0;
    tickRef.current = setInterval(() => {
      w = Math.min(w + Math.random() * 4 + 1.5, 88);
      setBarWidth(w);
      if (w > 35 && phase === 0) { phase = 1; setCurrentMsg(PHASE_MESSAGES[1]); }
      if (w > 68 && phase === 1) { phase = 2; setCurrentMsg(PHASE_MESSAGES[2]); }
    }, 220);

    try {
      if (onClick) await onClick();

      clearInterval(tickRef.current);
      setBarWidth(100);

      setTimeout(() => {
        setState("success");
        setTimeout(() => {
          setState("idle");
          setBarWidth(0);
        }, 2200);
      }, 350);
    } catch {
      clearInterval(tickRef.current);
      setState("idle");
      setBarWidth(0);
    }
  }

  useEffect(() => () => clearInterval(tickRef.current), []);

  const barColor = isOutline ? "rgba(26,107,58,.45)" : "rgba(255,255,255,.45)";

  return (
    <>
      <style>{`
        @keyframes lb-spin { to { transform: rotate(360deg); } }
        .lb-root:hover:not(:disabled) {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 8px rgba(0,0,0,.14), 0 12px 28px rgba(0,0,0,.1) !important;
        }
        .lb-root:active:not(:disabled) { transform: scale(.985) !important; }
      `}</style>

      <button
        type="button"
        className="lb-root"
        style={btnStyle}
        disabled={state !== "idle" || disabled}
        onClick={handleClick}
        aria-live="polite"
        aria-label={state === "loading" ? currentMsg : state === "success" ? successText : label}
      >
        {/* Idle */}
        <SlotContent visible={state === "idle"}>
          <span>{label}</span>
          {icon}
        </SlotContent>

        {/* Loading */}
        <SlotContent visible={state === "loading"}>
          <ArcSpinner color={spinnerColor} />
          <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.92 }}>{currentMsg}</span>
        </SlotContent>

        {/* Success */}
        <SlotContent visible={state === "success"}>
          <CheckCircle color={checkBg} iconColor={checkIcon} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{successText}</span>
        </SlotContent>

        {/* Progress bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0,
          height: "2.5px",
          background: barColor,
          width: `${barWidth}%`,
          borderRadius: "0 2px 2px 0",
          transition: barWidth === 0 ? "none" : barWidth === 100 ? "width .35s ease" : "width .4s cubic-bezier(.4,0,.2,1)",
          opacity: state === "success" ? 0 : 1,
        }} />
      </button>
    </>
  );
}
