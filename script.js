/* =================== Seamless Step Carousel (carousel-loop.js) ===================
   - moves one card at a time with smooth transition
   - after each transition, moves first child to the end and resets transform
   - pauses on hover / focus / touch
   - recalculates on resize
   - include with: <script src="carousel-loop.js" defer></script>
*/
document.addEventListener('DOMContentLoaded', () => {
  const track = document.querySelector('.testimonials-track');
  const viewport = document.querySelector('.testimonials-viewport') || (track && track.parentElement);
  if (!track) return;

  // Configuration
  const TRANSITION_MS = 600;   // animation duration in ms (matches CSS expectation)
  const PAUSE_MS = 2400;       // time to wait between steps (visible pause)
  let autoTimer = null;
  let isAnimating = false;

  // Safe helpers
  const getGap = () => {
    const cs = getComputedStyle(track);
    // prefer gap property; fall back to CSS var or default 20
    const g = cs.gap || cs.getPropertyValue('gap') || '';
    if (g) return parseFloat(g) || 0;
    const varGap = getComputedStyle(document.documentElement).getPropertyValue('--card-gap') || '20';
    return parseFloat(varGap) || 20;
  };

  const getStepWidth = () => {
    const first = track.querySelector('.testimonial-card');
    if (!first) return 0;
    const rect = first.getBoundingClientRect();
    return Math.round(rect.width + getGap());
  };

  // Perform one step to the left by exactly one card width
  function stepOnce() {
    if (isAnimating) return;
    const shift = getStepWidth();
    if (!shift) return;
    isAnimating = true;

    // enable transition for the step
    track.style.transition = `transform ${TRANSITION_MS}ms ease`;
    track.style.transform = `translateX(-${shift}px)`;
  }

  // After transition ends: move first child to end and reset transform without animation
  function onTransitionEnd(e) {
    if (e.propertyName !== 'transform') return;
    // detach transition to perform DOM move without visible jump
    track.style.transition = 'none';

    // Move first element to the end (this changes visual ordering)
    const first = track.firstElementChild;
    if (first) track.appendChild(first);

    // Reset transform to 0 (now content is shifted logically but visually same)
    track.style.transform = 'translateX(0)';

    // Force reflow to ensure subsequent transitions work
    // eslint-disable-next-line no-unused-expressions
    track.offsetWidth;

    isAnimating = false;
  }

  // Auto-start/stop helpers
  function startAuto() {
    stopAuto();
    // schedule repeating steps: wait (PAUSE_MS) then run step (which takes TRANSITION_MS)
    autoTimer = setInterval(() => {
      stepOnce();
    }, PAUSE_MS + TRANSITION_MS);
  }
  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // Pause/resume on user interaction
  function addInteractionPauses(node) {
    if (!node) return;
    node.addEventListener('mouseenter', stopAuto, { passive: true });
    node.addEventListener('mouseleave', startAuto, { passive: true });
    node.addEventListener('focusin', stopAuto, { passive: true });
    node.addEventListener('focusout', startAuto, { passive: true });
    node.addEventListener('touchstart', stopAuto, { passive: true });
    node.addEventListener('touchend', startAuto, { passive: true });
  }

  // Recalculate on resize — ensure no animation glitch by temporarily stopping
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    stopAuto();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // reset transform & transition to stable baseline
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';
      // force reflow
      void track.offsetWidth;
      // restart auto
      startAuto();
    }, 140);
  });

  // Attach events
  track.addEventListener('transitionend', onTransitionEnd);
  addInteractionPauses(viewport);
  // Also pause when any card receives focus to improve accessibility:
  track.addEventListener('focusin', stopAuto);
  track.addEventListener('focusout', startAuto);

  // Initialize: ensure transform baseline & start
  track.style.transform = 'translateX(0)';
  // small initial delay so layout stabilizes on page load
  setTimeout(() => startAuto(), 300);
});





/* =================== apply-modal.js
   - include <script src="apply-modal.js" defer></script>
   - When user clicks an .apply-btn:
     * show centered modal overlay (fade + blur/dim background)
     * modal shows the "3–5 deals required" message and brand info
     * OK will redirect to the button's data-redirect (or card data-redirect)
     * Cancel closes the modal
*/

document.addEventListener("DOMContentLoaded", () => {
  // Create overlay + modal once and append to body
  const overlay = document.createElement("div");
  overlay.className = "apply-overlay";
  overlay.innerHTML = `
    <div class="apply-modal" role="dialog" aria-modal="true" aria-hidden="true">
      <h3 class="modal-title">Confirm Application</h3>
      <div class="modal-body">
        <p>
          Steps to Get Your PR:<br>
          1. Complete a Simple Questionnaire<br>
          2. Enter Your Basic Details And Apply<br>
          3. Complete 4–5 Simple Deals (Required)
        </p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-cancel">Cancel</button>
        <button type="button" class="btn-ok">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const modal = overlay.querySelector(".apply-modal");
  const btnOk = overlay.querySelector(".btn-ok");
  const btnCancel = overlay.querySelector(".btn-cancel");
  const modalTitle = overlay.querySelector(".modal-title");

  // Helper to find redirect URL for a given button
  function findRedirectForButton(btn) {
    if (!btn) return null;
    // 1) data-redirect on the button
    if (btn.dataset && btn.dataset.redirect && btn.dataset.redirect.trim() !== "") {
        return btn.dataset.redirect;
    }
    // 2) parent card dataset redirect
    const card = btn.closest(".application-card");
    if (card && card.dataset && card.dataset.redirect) return card.dataset.redirect;
    // 3) a child anchor with class apply-link inside card (if present)
    if (card) {
      const anchor = card.querySelector("a.apply-link, a.apply-submit");
      if (anchor && anchor.href) return anchor.href;
    }
    // fallback: null
    return null;
  }

  // Helper to open modal with brand name & redirect action
  function openModal({ brandLabel = "", redirect = null } = {}) {
    // set title
    modalTitle.textContent = brandLabel ? `Apply to ${brandLabel}` : "Confirm Application";
    // store redirect on OK button
    btnOk.dataset.redirect = redirect || "";
    // make visible
    overlay.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    // focus the OK button for keyboard users
    btnOk.focus();
  }

  function closeModal() {
    overlay.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    // remove stored redirect
    delete btnOk.dataset.redirect;
  }

  // Attach event listeners to all current and future apply buttons using delegation
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".apply-btn");
    if (!btn) return;
    e.preventDefault();

    // find brand label from nearest h3
    const card = btn.closest(".application-card");
    const brandLabel = card ? (card.querySelector("h3")?.textContent?.trim() || "") : "";
    const redirect = findRedirectForButton(btn);

    // open modal (redirect only happens if user confirms)
    openModal({ brandLabel, redirect });
  });

  // OK -> redirect or close
  btnOk.addEventListener("click", () => {
    const url = btnOk.dataset.redirect || "";
    closeModal();
    if (url) {
      // small delay so fade-out finishes cleanly
      setTimeout(() => {
        window.location.href = url;
      }, 180);
    }
  });

  // Cancel closes modal
  btnCancel.addEventListener("click", closeModal);

  // Click outside modal content should close
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeModal();
  });

  // Close on Escape
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && overlay.classList.contains("show")) {
      closeModal();
    }
  });
});



/* =================== FAQ =================== */
/**
 * FAQ accordion
 * - smooth open/close using explicit maxHeight (measured)
 * - only one item open at a time
 * - keyboard accessible (Enter / Space)
 * - debounced resize handling
 */

document.addEventListener('DOMContentLoaded', () => {
  const faqList = document.querySelector('.faq-list');
  if (!faqList) return;

  // helper: find closest faq-item from node
  const findItem = (node) => node && node.closest('.faq-item');

  // close a specific item
  function closeItem(item) {
    if (!item) return;
    const btn = item.querySelector('.faq-question-btn');
    const panel = item.querySelector('.faq-panel');
    if (!panel) return;

    // set max-height to current scrollHeight first to enable smooth transition to 0
    const inner = panel.querySelector('.faq-panel-inner');
    if (inner) {
      panel.style.maxHeight = inner.scrollHeight + 'px';
      // force reflow
      void panel.offsetHeight;
    }

    // then set to 0
    requestAnimationFrame(() => {
      panel.style.maxHeight = '0px';
      item.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
    });
  }

  // open a specific item (and close others)
  function openItem(item) {
    if (!item) return;

    // close any other open item first
    const open = faqList.querySelector('.faq-item.open');
    if (open && open !== item) {
      closeItem(open);
    }

    const btn = item.querySelector('.faq-question-btn');
    const panel = item.querySelector('.faq-panel');
    if (!panel) return;

    const inner = panel.querySelector('.faq-panel-inner');
    const height = inner ? inner.scrollHeight : panel.scrollHeight;

    // apply
    item.classList.add('open');
    panel.style.maxHeight = height + 'px';
    panel.setAttribute('aria-hidden', 'false');
    if (btn) btn.setAttribute('aria-expanded', 'true');

    // ensure a11y focus and smooth experience
    panel.focus && panel.focus();
  }

  // toggle handler (delegation)
  faqList.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.faq-question-btn');
    if (!btn) return;
    ev.preventDefault();
    const item = findItem(btn);
    if (!item) return;

    const isOpen = item.classList.contains('open');
    if (isOpen) {
      closeItem(item);
    } else {
      openItem(item);
      // ensure the opened item is visible
      setTimeout(() => {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 260);
    }
  });

  // keyboard support (Enter / Space on the button)
  faqList.addEventListener('keydown', (ev) => {
    const btn = ev.target.closest('.faq-question-btn');
    if (!btn) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      btn.click();
    }
  });

  // recompute max-heights of open panels on resize (debounced)
  let rTimer = null;
  window.addEventListener('resize', () => {
    if (rTimer) clearTimeout(rTimer);
    rTimer = setTimeout(() => {
      const open = faqList.querySelector('.faq-item.open');
      if (open) {
        const panel = open.querySelector('.faq-panel');
        const inner = panel && panel.querySelector('.faq-panel-inner');
        if (panel && inner) {
          panel.style.maxHeight = inner.scrollHeight + 'px';
        }
      }
    }, 120);
  });
});


// =========== SCROLL REVEAL ANN ============

document.addEventListener('DOMContentLoaded', () => {
  const CONFIG = [
    {
      containerSelector: '.applications-section',
      itemSelector: '.application-card',
      childSelectors: ['.app-left img', '.app-right h3', '.app-right ul', '.app-right .apply-btn']
    },
    {
      containerSelector: '.values-section',
      itemSelector: '.value-card',
      childSelectors: ['h3', 'p']
    },
    {
      containerSelector: '.faq-section',
      itemSelector: '.faq-item',
      childSelectors: ['.faq-question-btn', '.faq-panel-inner']
    }
  ];

  // How long (ms) between each child's reveal inside a card
  const STAGGER_MS = 90;

  // Map items -> their child elements (for quick lookup in observer)
  const itemChildrenMap = new Map();

  // Collect all target items
  const allItems = [];

  CONFIG.forEach(cfg => {
    const container = document.querySelector(cfg.containerSelector);
    if (!container) return;
    const items = Array.from(container.querySelectorAll(cfg.itemSelector));
    items.forEach(item => {
      const children = [];
      cfg.childSelectors.forEach(sel => {
        const nodes = Array.from(item.querySelectorAll(sel || '*'));
        nodes.forEach(n => {
          if (n && !children.includes(n)) children.push(n);
        });
      });

      // if no children found, still include item (safety)
      if (children.length === 0) {
        children.push(item);
      }

      // mark children with a class to enable CSS base rules (adds graceful fallback)
      children.forEach(ch => {
        ch.classList.add('reveal-child');
        ch.style.transitionDelay = '';
      });

      itemChildrenMap.set(item, children);
      allItems.push(item);
    });
  });

  if (allItems.length === 0) return; // nothing to do

  // IntersectionObserver options
  const IO_OPTS = {
    root: null,
    rootMargin: '0px 0px -8% 0px', // start reveal slightly before fully in view
    threshold: 0.12
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const target = entry.target;
      if (!entry.isIntersecting) return;
      // reveal and unobserve
      revealItem(target);
      observer.unobserve(target);
    });
  }, IO_OPTS);

  // Observe each item
  allItems.forEach(it => observer.observe(it));

  // Reveal logic: stagger each child inside the item
  function revealItem(item) {
    const children = itemChildrenMap.get(item) || [item];
    if (!children.length) return;

    children.forEach((ch, i) => {
      const delayMs = i * STAGGER_MS;
      ch.style.transitionDelay = `${delayMs}ms`;
      ch.offsetWidth;
      ch.classList.add('is-visible');
    });

  }

  let rTimer = null;
  window.addEventListener('resize', () => {
    if (rTimer) clearTimeout(rTimer);
    rTimer = setTimeout(() => {

      itemChildrenMap.forEach((children, item) => {
        if (!item.classList.contains('revealed')) {
          children.forEach(ch => {
            if (!ch.classList.contains('is-visible')) ch.style.transitionDelay = '';
          });
        }
      });
    }, 140);
  }, { passive: true });
});

