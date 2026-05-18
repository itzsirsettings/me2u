const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const header = $('[data-header]');
const progress = $('[data-progress]');
const nav = $('[data-nav]');
const navToggle = $('[data-nav-toggle]');
const dropdown = $('[data-dropdown]');
const dropdownButton = $('[data-dropdown-button]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function updateChrome() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  header?.classList.toggle('scrolled', scrollTop > 8);
  if (progress) progress.style.width = `${Math.min(100, (scrollTop / max) * 100)}%`;
}
updateChrome();
window.addEventListener('scroll', updateChrome, { passive: true });

function closeNavigation() {
  nav?.classList.remove('open');
  navToggle?.setAttribute('aria-expanded', 'false');
  dropdown?.classList.remove('open');
  dropdownButton?.setAttribute('aria-expanded', 'false');
}

navToggle?.addEventListener('click', () => {
  if (!nav) return;
  const open = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});

dropdownButton?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  const open = dropdown.classList.toggle('open');
  dropdownButton.setAttribute('aria-expanded', String(open));
});

document.addEventListener('click', (event) => {
  if (!dropdown?.contains(event.target)) {
    dropdown?.classList.remove('open');
    dropdownButton?.setAttribute('aria-expanded', 'false');
  }
});

$$('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => {
    const target = $(link.getAttribute('href'));
    if (target) closeNavigation();
  });
});

const categoryData = {
  solar: {
    title: 'Solar Panels, Inverters & Batteries',
    text: 'With Me2U, renewable energy becomes easier to access through flexible payment options.',
  },
  gadgets: {
    title: 'Electronics, Phones & Gadgets',
    text: 'Buy gadgets, devices, accessories, and household electronics while spreading the cost.',
  },
  cars: {
    title: 'Own your dream car',
    text: 'Support car purchases with a smoother path to pay outright or in instalments.',
  },
  furniture: {
    title: 'Furniture & Household Equipment',
    text: 'Upgrade homes and workspaces with a flexible checkout experience for larger purchases.',
  },
};

$$('[data-category]').forEach((button) => {
  button.addEventListener('click', () => {
    const data = categoryData[button.dataset.category];
    if (!data) return;
    $$('[data-category]').forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    const title = $('[data-category-title]');
    const text = $('[data-category-text]');
    const panel = $('[data-category-panel]');
    if (panel && !prefersReducedMotion) {
      panel.animate([
        { opacity: 0.65, transform: 'translateY(8px) scale(.99)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    if (title) title.textContent = data.title;
    if (text) text.textContent = data.text;
  });
});

const businessData = {
  webpage: {
    title: 'Get a free online webpage',
    text: 'Create a customised webpage for your business so customers can browse products and make online purchases.',
  },
  shop: {
    title: 'Get a free shop on Me2U',
    text: 'List products inside the app and give customers a simple path to discover and buy from your business.',
  },
  instalment: {
    title: 'Offer pay in instalments',
    text: 'Let customers split larger purchases online or in-store with a more flexible checkout experience.',
  },
  integration: {
    title: 'Integrate Me2U to your app or website',
    text: 'Add Me2U payment and instalment flows to existing websites, apps, and merchant channels.',
  },
};

$$('[data-business-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    const data = businessData[button.dataset.businessTab];
    const panel = $('[data-business-panel]');
    if (!data || !panel) return;
    $$('[data-business-tab]').forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    if (!prefersReducedMotion) {
      panel.animate([
        { opacity: 0.5, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    panel.querySelector('h3').textContent = data.title;
    panel.querySelector('p').textContent = data.text;
  });
});

const modalMap = [
  ['[data-open-download]', '[data-download-modal]'],
  ['[data-open-demo]', '[data-demo-modal]'],
  ['[data-open-cookie]', '[data-cookie-modal]'],
];

const policyContent = {
  privacy: {
    title: 'Privacy policy',
    copy: 'Add the approved privacy policy here before production. This static build does not collect logins, payments, credentials, or customer form data.',
  },
  terms: {
    title: 'Terms & conditions',
    copy: 'Add approved terms and product conditions here before production. Keep store links, payment details, and eligibility language aligned with the live product.',
  },
  isms: {
    title: 'ISMS policy',
    copy: 'Add the approved information security management policy here before production release.',
  },
  security: {
    title: 'Security center',
    copy: 'Add approved security guidance, support routes, and reporting instructions here before production release.',
  },
};

function openModal(modal) {
  if (!modal) return;
  if (typeof modal.showModal === 'function') modal.showModal();
  else modal.setAttribute('open', '');
  document.body.classList.add('modal-open');
}

function closeModal(modal) {
  if (!modal) return;
  if (typeof modal.close === 'function') modal.close();
  else modal.removeAttribute('open');
  if (!$$('dialog[open]').length) document.body.classList.remove('modal-open');
}

modalMap.forEach(([triggerSelector, modalSelector]) => {
  $$(triggerSelector).forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      closeNavigation();
      openModal($(modalSelector));
    });
  });
});

$$('[data-open-policy]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    closeNavigation();
    const modal = $('[data-policy-modal]');
    const content = policyContent[trigger.dataset.policy] || policyContent.privacy;
    const title = $('[data-policy-title]', modal);
    const copy = $('[data-policy-copy]', modal);
    if (title) title.textContent = content.title;
    if (copy) copy.textContent = content.copy;
    openModal(modal);
  });
});

$$('[data-close-modal]').forEach((button) => {
  button.addEventListener('click', () => closeModal(button.closest('dialog')));
});

$$('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeModal(dialog);
  });
  dialog.addEventListener('close', () => {
    if (!$$('dialog[open]').length) document.body.classList.remove('modal-open');
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeNavigation();
});

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.13, rootMargin: '0px 0px -42px 0px' });

$$('.reveal').forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 5, 4) * 70}ms`;
  revealObserver.observe(element);
});

const counterObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const element = entry.target;
    const target = Number(element.dataset.count || 0);
    const prefix = element.dataset.prefix || '';
    const duration = prefersReducedMotion ? 0 : 1200;
    const startTime = performance.now();

    function tick(now) {
      const progress = duration ? Math.min(1, (now - startTime) / duration) : 1;
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      element.textContent = `${prefix}${value.toLocaleString('en-NG')}`;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    observer.unobserve(element);
  });
}, { threshold: 0.55 });

$$('[data-count]').forEach((element) => counterObserver.observe(element));

if (!prefersReducedMotion) {
  window.addEventListener('pointermove', (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    $$('[data-parallax]').forEach((element) => {
      const depth = Number(element.dataset.parallax || 0);
      element.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`;
    });
  }, { passive: true });

  $$('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-2px)`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });

  $$('.magnetic').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${x * .08}px, ${y * .18}px)`;
    });
    button.addEventListener('pointerleave', () => {
      button.style.transform = '';
    });
  });
}

const marquee = $('[data-marquee]');
if (marquee) {
  marquee.innerHTML += marquee.innerHTML;
}

$$('[data-accordion] .accordion-item button').forEach((button) => {
  button.addEventListener('click', () => {
    const item = button.closest('.accordion-item');
    const open = !item.classList.contains('open');
    $$('.accordion-item', item.parentElement).forEach((entry) => {
      entry.classList.remove('open');
      entry.querySelector('button')?.setAttribute('aria-expanded', 'false');
    });
    item.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
  });
});
