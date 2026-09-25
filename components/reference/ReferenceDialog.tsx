"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export default function ReferenceDialog({
  title,
  onClose,
  children,
  id,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  id?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      id={id}
      className="design-dialog"
      aria-labelledby="reference-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        ref.current?.close();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          ref.current?.close();
          onClose();
        }
      }}
    >
      <div className="design-dialog-content">
        <header>
          <h2 id="reference-dialog-title">{title}</h2>
          <button
            type="button"
            onClick={() => {
              ref.current?.close();
              onClose();
            }}
            aria-label={`Close ${title}`}
            className="design-icon-button design-dialog-close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
