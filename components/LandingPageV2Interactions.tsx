"use client";

import { useEffect } from "react";

const registerPath = "/register";
const loginPath = "/login";

type CopyBlock = {
  title: string;
  text: string;
};

export default function LandingPageV2Interactions() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-landing-v2-root]");
    if (!root) return;

    const $ = <T extends Element = HTMLElement>(selector: string, searchRoot: ParentNode = root) =>
      searchRoot.querySelector<T>(selector);
    const $$ = <T extends Element = HTMLElement>(selector: string, searchRoot: ParentNode = root) =>
      Array.from(searchRoot.querySelectorAll<T>(selector));
    const cleanup: Array<() => void> = [];
    const add = (
      target: EventTarget | null | undefined,
      type: string,
      listener: EventListener,
      options?: AddEventListenerOptions,
    ) => {
      if (!target) return;
      target.addEventListener(type, listener, options);
      cleanup.push(() => target.removeEventListener(type, listener, options));
    };

    const header = $("[data-header]");
    const progress = $<HTMLElement>("[data-progress]");
    const nav = $("[data-nav]");
    const navToggle = $("[data-nav-toggle]");
    const dropdown = $("[data-dropdown]");
    const dropdownButton = $("[data-dropdown-button]");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const updateChrome = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      header?.classList.toggle("scrolled", scrollTop > 8);
      if (progress) progress.style.width = `${Math.min(100, (scrollTop / max) * 100)}%`;
    };

    const closeNavigation = () => {
      nav?.classList.remove("open");
      navToggle?.setAttribute("aria-expanded", "false");
      dropdown?.classList.remove("open");
      dropdownButton?.setAttribute("aria-expanded", "false");
    };

    const goTo = (path: string) => {
      window.location.assign(path);
    };

    updateChrome();
    add(window, "scroll", updateChrome, { passive: true });

    add(navToggle, "click", () => {
      if (!nav || !navToggle) return;
      const open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });

    add(dropdownButton, "click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!dropdown || !dropdownButton) return;
      const open = dropdown.classList.toggle("open");
      dropdownButton.setAttribute("aria-expanded", String(open));
    });

    add(document, "click", (event) => {
      if (!dropdown?.contains(event.target as Node)) {
        dropdown?.classList.remove("open");
        dropdownButton?.setAttribute("aria-expanded", "false");
      }
    });

    $$<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
      add(link, "click", () => {
        const target = $(link.getAttribute("href") || "");
        if (target) closeNavigation();
      });
    });

    $$("[data-open-register]").forEach((trigger) => {
      add(trigger, "click", (event) => {
        event.preventDefault();
        closeNavigation();
        goTo(registerPath);
      });
    });

    $$("[data-open-login]").forEach((trigger) => {
      add(trigger, "click", (event) => {
        event.preventDefault();
        closeNavigation();
        goTo(loginPath);
      });
    });

    const categoryData: Record<string, CopyBlock> = {
      solar: {
        title: "Direct loan",
        text: "0% interest loan from ₦5,000 after your registration deposit and KYC are complete.",
      },
      gadgets: {
        title: "Borrow request",
        text: "Create a marketplace request with a clear amount and 1 to 14 day duration so verified peers can fund it.",
      },
      cars: {
        title: "Lending offer",
        text: "Publish an interest-free lending offer and match with borrowers inside the shared marketplace.",
      },
      furniture: {
        title: "Repayment",
        text: "Repay active loans from your wallet before making another request.",
      },
    };

    $$<HTMLElement>("[data-category]").forEach((button) => {
      add(button, "click", () => {
        const data = categoryData[button.dataset.category || ""];
        if (!data) return;

        $$<HTMLElement>("[data-category]").forEach((tab) => {
          const active = tab === button;
          tab.classList.toggle("is-active", active);
          tab.setAttribute("aria-selected", String(active));
        });

        const title = $("[data-category-title]");
        const text = $("[data-category-text]");
        const panel = $<HTMLElement>("[data-category-panel]");
        if (panel && !prefersReducedMotion) {
          panel.animate(
            [
              { opacity: 0.65, transform: "translateY(8px) scale(.99)" },
              { opacity: 1, transform: "translateY(0) scale(1)" },
            ],
            { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" },
          );
        }
        if (title) title.textContent = data.title;
        if (text) text.textContent = data.text;
      });
    });

    const businessData: Record<string, CopyBlock> = {
      webpage: {
        title: "Create a borrow request",
        text: "Post the amount you need, keep the interest rate at 0%, and set a duration from 1 to 14 days.",
      },
      shop: {
        title: "Publish a lending offer",
        text: "Make funds available to verified peers and keep the listing visible in the shared marketplace.",
      },
      instalment: {
        title: "Fund a peer loan",
        text: "Accept a borrow request when your wallet balance can cover the requested amount.",
      },
      integration: {
        title: "Accept a lending offer",
        text: "Borrowers can accept available offers and then manage repayment from the loans screen.",
      },
    };

    $$<HTMLElement>("[data-business-tab]").forEach((button) => {
      add(button, "click", () => {
        const data = businessData[button.dataset.businessTab || ""];
        const panel = $<HTMLElement>("[data-business-panel]");
        if (!data || !panel) return;

        $$<HTMLElement>("[data-business-tab]").forEach((tab) => {
          const active = tab === button;
          tab.classList.toggle("is-active", active);
          tab.setAttribute("aria-selected", String(active));
        });

        if (!prefersReducedMotion) {
          panel.animate(
            [
              { opacity: 0.5, transform: "translateY(10px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" },
          );
        }
        const heading = panel.querySelector("h3");
        const copy = panel.querySelector("p");
        if (heading) heading.textContent = data.title;
        if (copy) copy.textContent = data.text;
      });
    });

    const modalMap: Array<[string, string]> = [
      ["[data-open-demo]", "[data-demo-modal]"],
      ["[data-open-cookie]", "[data-cookie-modal]"],
    ];

    const policyContent: Record<string, CopyBlock> = {
      privacy: {
        title: "Privacy policy",
        text: "Add the approved privacy policy for account creation, KYC documents, wallet records, and loan activity before production launch.",
      },
      terms: {
        title: "Terms & conditions",
        text: "Add approved terms for registration deposits, welcome bonuses, peer lending, loans, withdrawals, and repayments.",
      },
      isms: {
        title: "ISMS policy",
        text: "Add approved information security guidance for private uploads, payment proof handling, and account protection.",
      },
      security: {
        title: "Security center",
        text: "Me2U protects withdrawals and loans through confirmed deposits, KYC checks, and admin-reviewed payment proof.",
      },
    };

    const openModal = (modal: HTMLDialogElement | null) => {
      if (!modal) return;
      if (typeof modal.showModal === "function" && !modal.open) modal.showModal();
      else modal.setAttribute("open", "");
      document.body.classList.add("modal-open");
    };

    const closeModal = (modal: HTMLDialogElement | null) => {
      if (!modal) return;
      if (typeof modal.close === "function" && modal.open) modal.close();
      else modal.removeAttribute("open");
      if (!$$<HTMLDialogElement>("dialog[open]").length) document.body.classList.remove("modal-open");
    };

    modalMap.forEach(([triggerSelector, modalSelector]) => {
      $$(triggerSelector).forEach((trigger) => {
        add(trigger, "click", (event) => {
          event.preventDefault();
          closeNavigation();
          openModal($<HTMLDialogElement>(modalSelector));
        });
      });
    });

    $$<HTMLElement>("[data-open-policy]").forEach((trigger) => {
      add(trigger, "click", (event) => {
        event.preventDefault();
        closeNavigation();
        const modal = $<HTMLDialogElement>("[data-policy-modal]");
        const content = policyContent[trigger.dataset.policy || "privacy"] || policyContent.privacy;
        const title = $("[data-policy-title]", modal || root);
        const copy = $("[data-policy-copy]", modal || root);
        if (title) title.textContent = content.title;
        if (copy) copy.textContent = content.text;
        openModal(modal);
      });
    });

    $$<HTMLElement>("[data-close-modal]").forEach((button) => {
      add(button, "click", () => closeModal(button.closest("dialog")));
    });

    $$<HTMLDialogElement>("dialog").forEach((dialog) => {
      add(dialog, "click", (event) => {
        if (event.target === dialog) closeModal(dialog);
      });
      add(dialog, "close", () => {
        if (!$$<HTMLDialogElement>("dialog[open]").length) document.body.classList.remove("modal-open");
      });
    });

    add(document, "keydown", (event) => {
      if ((event as KeyboardEvent).key === "Escape") closeNavigation();
    });

    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.13, rootMargin: "0px 0px -42px 0px" },
      );
      $$<HTMLElement>(".reveal").forEach((element, index) => {
        element.style.transitionDelay = `${Math.min(index % 5, 4) * 70}ms`;
        revealObserver.observe(element);
      });
      cleanup.push(() => revealObserver.disconnect());

      const counterObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const element = entry.target as HTMLElement;
            const target = Number(element.dataset.count || 0);
            const prefix = element.dataset.prefix || "";
            const duration = prefersReducedMotion ? 0 : 1200;
            const startTime = performance.now();

            const tick = (now: number) => {
              const progressValue = duration ? Math.min(1, (now - startTime) / duration) : 1;
              const eased = 1 - Math.pow(1 - progressValue, 3);
              const value = Math.round(target * eased);
              element.textContent = `${prefix}${value.toLocaleString("en-NG")}`;
              if (progressValue < 1) requestAnimationFrame(tick);
            };

            requestAnimationFrame(tick);
            observer.unobserve(element);
          });
        },
        { threshold: 0.55 },
      );
      $$<HTMLElement>("[data-count]").forEach((element) => counterObserver.observe(element));
      cleanup.push(() => counterObserver.disconnect());
    } else {
      $$<HTMLElement>(".reveal").forEach((element) => element.classList.add("visible"));
      $$<HTMLElement>("[data-count]").forEach((element) => {
        const target = Number(element.dataset.count || 0);
        const prefix = element.dataset.prefix || "";
        element.textContent = `${prefix}${target.toLocaleString("en-NG")}`;
      });
    }

    if (!prefersReducedMotion) {
      add(
        window,
        "pointermove",
        (event) => {
          const pointerEvent = event as PointerEvent;
          const x = (pointerEvent.clientX / window.innerWidth - 0.5) * 2;
          const y = (pointerEvent.clientY / window.innerHeight - 0.5) * 2;
          $$<HTMLElement>("[data-parallax]").forEach((element) => {
            const depth = Number(element.dataset.parallax || 0);
            element.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`;
          });
        },
        { passive: true },
      );

      $$<HTMLElement>("[data-tilt]").forEach((card) => {
        add(card, "pointermove", (event) => {
          const pointerEvent = event as PointerEvent;
          const rect = card.getBoundingClientRect();
          const x = (pointerEvent.clientX - rect.left) / rect.width - 0.5;
          const y = (pointerEvent.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-2px)`;
        });
        add(card, "pointerleave", () => {
          card.style.transform = "";
        });
      });

      $$<HTMLElement>(".magnetic").forEach((button) => {
        add(button, "pointermove", (event) => {
          const pointerEvent = event as PointerEvent;
          const rect = button.getBoundingClientRect();
          const x = pointerEvent.clientX - rect.left - rect.width / 2;
          const y = pointerEvent.clientY - rect.top - rect.height / 2;
          button.style.transform = `translate(${x * 0.08}px, ${y * 0.18}px)`;
        });
        add(button, "pointerleave", () => {
          button.style.transform = "";
        });
      });
    }

    const marquee = $<HTMLElement>("[data-marquee]");
    if (marquee && marquee.dataset.marqueeHydrated !== "true") {
      marquee.innerHTML += marquee.innerHTML;
      marquee.dataset.marqueeHydrated = "true";
    }

    $$<HTMLButtonElement>("[data-accordion] .accordion-item button").forEach((button) => {
      add(button, "click", () => {
        const item = button.closest<HTMLElement>(".accordion-item");
        const parent = item?.parentElement;
        if (!item || !parent) return;

        const open = !item.classList.contains("open");
        $$<HTMLElement>(".accordion-item", parent).forEach((entry) => {
          entry.classList.remove("open");
          entry.querySelector("button")?.setAttribute("aria-expanded", "false");
        });
        item.classList.toggle("open", open);
        button.setAttribute("aria-expanded", String(open));
      });
    });

    cleanup.push(() => document.body.classList.remove("modal-open"));

    return () => {
      cleanup.forEach((dispose) => dispose());
    };
  }, []);

  return null;
}
