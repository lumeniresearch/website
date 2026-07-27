const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});

const revealEls = document.querySelectorAll('[data-reveal]');

// Scroll-triggered reveals repeat every time an element crosses into or out
// of view, in either scroll direction — not a one-time, first-visit-only fade.
if (revealEls.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );

  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* HERO TYPING ANIMATION — types once on first load, then loops every 10s
   while the hero stays in view. Scrolling away and back does NOT replay the
   fade-in — the tagline/subtext/buttons only ever reveal once. The 10s loop
   only retypes "Hi, Lumeni" itself; the rest of the hero stays put. A
   generation token lets a fresh run cancel whatever pass was still in flight. */
let typedGeneration = 0;

function typeHeroLine(resetRest) {
  const el = document.getElementById('typed-line');
  const heroInner = document.querySelector('.hero-inner');
  if (!el || !heroInner) return;

  const fullText = el.dataset.typedText || el.textContent;
  const accentWord = el.dataset.typedAccent || '';
  const myGeneration = (typedGeneration += 1);

  if (resetRest) heroInner.classList.remove('is-typed');

  el.textContent = '';
  el.setAttribute('aria-label', fullText);

  const cursor = document.createElement('span');
  cursor.className = 'typed-cursor';
  el.appendChild(cursor);

  const plainWrap = document.createElement('span');
  el.insertBefore(plainWrap, cursor);

  const accentStart = accentWord ? fullText.indexOf(accentWord) : -1;
  let accentWrap = null;
  let i = 0;

  function step() {
    if (myGeneration !== typedGeneration) return; // superseded by a newer run
    if (i >= fullText.length) {
      cursor.remove();
      heroInner.classList.add('is-typed');
      return;
    }
    if (accentStart >= 0 && i === accentStart) {
      accentWrap = document.createElement('span');
      accentWrap.className = 'name-accent';
      el.insertBefore(accentWrap, cursor);
    }

    // Each letter fades/lifts in softly instead of popping in abruptly.
    const charSpan = document.createElement('span');
    charSpan.className = 'typed-char';
    charSpan.textContent = fullText[i];
    const target = (accentWrap && i >= accentStart) ? accentWrap : plainWrap;
    target.appendChild(charSpan);
    void charSpan.offsetWidth; // force layout so the transition below actually runs
    charSpan.classList.add('is-in');

    i += 1;
    setTimeout(step, 110);
  }

  step();
}

const heroSection = document.getElementById('home');
let heroTypeLoop = null;
let heroHasTypedOnce = false;

if (heroSection && 'IntersectionObserver' in window) {
  const heroObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!heroHasTypedOnce) {
            heroHasTypedOnce = true;
            typeHeroLine(true);
          }
          if (heroTypeLoop) clearInterval(heroTypeLoop);
          heroTypeLoop = setInterval(() => typeHeroLine(false), 10000);
        } else if (heroTypeLoop) {
          clearInterval(heroTypeLoop);
          heroTypeLoop = null;
        }
      });
    },
    { threshold: 0.4 }
  );
  heroObserver.observe(heroSection);
} else {
  typeHeroLine(true);
}

/* SAVINGS CARDS: animated hour bar + animated token count-down.
   These replay every time the card scrolls into view, either direction —
   not just the first time. A generation token on each element lets a
   fresh run cancel whatever animation was still in flight from last time. */
function animateValue(el, start, end, duration, formatter) {
  const token = (el._animToken = (el._animToken || 0) + 1);
  const startTime = ('performance' in window ? performance.now() : Date.now());
  function tick(now) {
    if (el._animToken !== token) return; // superseded by a newer run
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(start + (end - start) * eased);
    el.textContent = formatter(value);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* Vertical compare bars: "Without Lumeni" grows straight up to its (always
   100%) height. "With Lumeni" is the whole point of the chart, so instead
   of quietly growing in from zero it starts level with the "without" bar
   and visibly drops down to its real, tiny value a beat later. */
// Minimum visible sliver for a bar with a tiny fill (e.g. 0%), as a fraction
// of the track's own height — keeps a genuinely-zero "With Lumeni" value
// from disappearing entirely once height is driven by a scale factor.
const COMPARE_BAR_MIN_SCALE = 0.03;

function fillPercentToScale(fillStr) {
  const pct = parseFloat(fillStr) || 0;
  const fraction = pct / 100;
  // Square-root, not linear: real ratios here are extreme (5% vs 100%),
  // and a straight linear scale makes every "With Lumeni" bar collapse to
  // a sliver indistinguishable from a true 0%. Square-root keeps the
  // ordering honest (a bigger real fraction is always a taller bar) while
  // giving small-but-nonzero values (5,000/100,000, $5/$100) a height
  // that's actually visible next to the near-zero hours bar.
  return Math.max(Math.sqrt(fraction), COMPARE_BAR_MIN_SCALE);
}

function runCompareBars(card) {
  const before = card.querySelector('.card-compare-fill-v.before');
  const after = card.querySelector('.card-compare-fill-v.after');

  if (before) {
    const target = fillPercentToScale(before.style.getPropertyValue('--fill'));
    before.style.transform = `scaleY(${target})`;
  }

  if (after) {
    const target = fillPercentToScale(after.style.getPropertyValue('--fill'));
    const token = (after._shrinkToken = (after._shrinkToken || 0) + 1);
    after.style.transition = 'none';
    after.style.transform = 'scaleY(1)';
    void after.offsetHeight; // force reflow so the instant jump to full height commits
    after.style.transition = '';
    setTimeout(() => {
      if (after._shrinkToken !== token) return; // superseded by a reset/replay
      after.style.transform = `scaleY(${target})`;
    }, 550);
  }
}

function resetCompareBars(card) {
  card.querySelectorAll('.card-compare-fill-v').forEach((bar) => {
    bar._shrinkToken = (bar._shrinkToken || 0) + 1;
    bar.style.transform = 'scaleY(0)';
  });
}

/* The count/bar-wrap elements live outside the .savings-card box (in the
   shared .savings-col), as siblings rather than descendants, so lookups
   have to start from the whole column — not the card. */
function savingsScope(card) {
  return card.closest('.savings-col') || card;
}

function runHoursAnimation(card) {
  const scope = savingsScope(card);
  const numberEl = scope.querySelector('.hours-number');
  const target = parseInt(numberEl.dataset.countTo, 10);

  animateValue(numberEl, 0, target, 1300, (v) => String(v));
  runCompareBars(card);
}

function resetHoursAnimation(card) {
  const scope = savingsScope(card);
  const numberEl = scope.querySelector('.hours-number');

  numberEl._animToken = (numberEl._animToken || 0) + 1;
  numberEl.textContent = '0';
  resetCompareBars(card);
}

function runTokensAnimation(card) {
  const scope = savingsScope(card);
  const tokensEl = scope.querySelector('.tokens-count');
  const target = parseInt(tokensEl.dataset.countTo, 10);

  // Counts up from 0, same as the hours/money "saved" figures — this is
  // a savings total now, not a before/after count-down.
  animateValue(tokensEl, 0, target, 1300, (v) => v.toLocaleString());
  runCompareBars(card);
}

function resetTokensAnimation(card) {
  const scope = savingsScope(card);
  const tokensEl = scope.querySelector('.tokens-count');

  tokensEl._animToken = (tokensEl._animToken || 0) + 1;
  tokensEl.textContent = '0';
  resetCompareBars(card);
}

function runMoneyAnimation(card) {
  const scope = savingsScope(card);
  const numberEl = scope.querySelector('.money-number');
  const target = parseInt(numberEl.dataset.countTo, 10);

  animateValue(numberEl, 0, target, 1300, (v) => String(v));
  runCompareBars(card);
}

function resetMoneyAnimation(card) {
  const scope = savingsScope(card);
  const numberEl = scope.querySelector('.money-number');

  numberEl._animToken = (numberEl._animToken || 0) + 1;
  numberEl.textContent = '0';
  resetCompareBars(card);
}

const hoursCard = document.querySelector('.savings-card-hours');
const tokensCard = document.querySelector('.savings-card-tokens');
const moneyCard = document.querySelector('.savings-card-money');
let hoursLoop = null;
let tokensLoop = null;
let moneyLoop = null;

function replayHoursAnimation(card) {
  resetHoursAnimation(card);
  requestAnimationFrame(() => runHoursAnimation(card));
}

function replayTokensAnimation(card) {
  resetTokensAnimation(card);
  requestAnimationFrame(() => runTokensAnimation(card));
}

function replayMoneyAnimation(card) {
  resetMoneyAnimation(card);
  requestAnimationFrame(() => runMoneyAnimation(card));
}

if (hoursCard && tokensCard && moneyCard && 'IntersectionObserver' in window) {
  const chartObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const isHours = entry.target === hoursCard;
        const isTokens = entry.target === tokensCard;
        const isMoney = entry.target === moneyCard;
        if (entry.isIntersecting) {
          if (isHours) {
            runHoursAnimation(hoursCard);
            if (hoursLoop) clearInterval(hoursLoop);
            hoursLoop = setInterval(() => replayHoursAnimation(hoursCard), 5000);
          }
          if (isTokens) {
            runTokensAnimation(tokensCard);
            if (tokensLoop) clearInterval(tokensLoop);
            tokensLoop = setInterval(() => replayTokensAnimation(tokensCard), 5000);
          }
          if (isMoney) {
            runMoneyAnimation(moneyCard);
            if (moneyLoop) clearInterval(moneyLoop);
            moneyLoop = setInterval(() => replayMoneyAnimation(moneyCard), 5000);
          }
        } else {
          if (isHours) {
            resetHoursAnimation(hoursCard);
            if (hoursLoop) { clearInterval(hoursLoop); hoursLoop = null; }
          }
          if (isTokens) {
            resetTokensAnimation(tokensCard);
            if (tokensLoop) { clearInterval(tokensLoop); tokensLoop = null; }
          }
          if (isMoney) {
            resetMoneyAnimation(moneyCard);
            if (moneyLoop) { clearInterval(moneyLoop); moneyLoop = null; }
          }
        }
      });
    },
    { threshold: 0.4 }
  );
  chartObserver.observe(hoursCard);
  chartObserver.observe(tokensCard);
  chartObserver.observe(moneyCard);
} else {
  if (hoursCard) runHoursAnimation(hoursCard);
  if (tokensCard) runTokensAnimation(tokensCard);
  if (moneyCard) runMoneyAnimation(moneyCard);
}

/* PAPER TRIAGE DEMO — Like / Dislike / Maybe / Trash, by click or by
   dragging the card in the corresponding direction (up/down/left/right). */
(function initPaperDemo() {
  const card = document.getElementById('paper-card');
  const overlay = document.getElementById('paper-overlay');
  const titleEl = document.getElementById('paper-title');
  const pageEl = document.getElementById('paper-page');
  const actionsToggle = document.getElementById('paper-actions-toggle');
  const actionsDropdown = document.getElementById('paper-actions-dropdown');
  if (!card || !overlay || !titleEl || !pageEl) return;

  const fakePapers = [
    'GRAFT: Grafted Reference Audio for Fine-Tuned TTS',
    'Scaling Sparse Retrieval for Long-Context QA',
    'Chain-of-Thought Distillation for Small Language Models',
  ];
  let paperIndex = 0;

  const directions = {
    like: { x: 1, y: 0 },
    dislike: { x: -1, y: 0 },
    maybe: { x: 0, y: -1 },
    trash: { x: 0, y: 1 },
  };

  let isAnimatingOut = false;

  function nextPaper() {
    paperIndex = (paperIndex + 1) % fakePapers.length;
    titleEl.textContent = fakePapers[paperIndex];
    pageEl.textContent = (paperIndex + 1) + ' / ' + fakePapers.length;
  }

  function triggerAction(action) {
    if (isAnimatingOut) return;
    isAnimatingOut = true;

    // Clicking a button is as decisive as swiping — dismiss the hint
    // overlay immediately instead of leaving it sitting on top of the
    // card while it flies away.
    overlay.classList.add('is-dismissed');

    const dir = directions[action];
    card.style.transform = 'translate(' + (dir.x * 600) + 'px, ' + (dir.y * 500) + 'px) rotate(' + (dir.x * 20) + 'deg)';
    card.style.opacity = '0';

    setTimeout(() => {
      nextPaper();
      card.classList.add('is-dragging'); // reuse to disable transition for the reset jump
      card.style.transform = '';
      card.style.opacity = '1';
      overlay.classList.remove('is-dismissed');
      void card.offsetWidth; // force reflow so the jump applies before re-enabling transition
      card.classList.remove('is-dragging');
      isAnimatingOut = false;
    }, 800);
  }

  document.querySelectorAll('.paper-action').forEach((btn) => {
    btn.addEventListener('click', () => triggerAction(btn.dataset.action));
  });

  overlay.addEventListener('click', () => {
    overlay.classList.add('is-dismissed');
  });

  // Drag-to-swipe (mouse + touch)
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let curX = 0;
  let curY = 0;

  function pointerDown(e) {
    if (isAnimatingOut) return;
    // Without this, a fast mouse drag starts the browser's native
    // click-and-drag text selection, which visually "moves" nearby copy
    // (like the "Smart Discovery" heading) as the cursor sweeps past it.
    if (!e.touches) e.preventDefault();
    // Swiping is a decisive action in its own right — don't require the
    // overlay hint to be dismissed first. Starting a drag dismisses it.
    if (!overlay.classList.contains('is-dismissed')) {
      overlay.classList.add('is-dismissed');
    }
    dragging = true;
    card.classList.add('is-dragging');
    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
  }

  function pointerMove(e) {
    if (!dragging) return;
    const point = e.touches ? e.touches[0] : e;
    curX = point.clientX - startX;
    curY = point.clientY - startY;
    card.style.transform = 'translate(' + curX + 'px, ' + curY + 'px) rotate(' + (curX * 0.04) + 'deg)';
  }

  function pointerUp() {
    if (!dragging) return;
    dragging = false;
    card.classList.remove('is-dragging');

    const threshold = 90;
    const absX = Math.abs(curX);
    const absY = Math.abs(curY);

    if (absX < threshold && absY < threshold) {
      card.style.transform = '';
      curX = 0;
      curY = 0;
      return;
    }

    const action = absX > absY ? (curX > 0 ? 'like' : 'dislike') : (curY > 0 ? 'trash' : 'maybe');
    curX = 0;
    curY = 0;
    triggerAction(action);
  }

  card.addEventListener('mousedown', pointerDown);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);
  card.addEventListener('touchstart', pointerDown, { passive: true });
  window.addEventListener('touchmove', pointerMove, { passive: true });
  window.addEventListener('touchend', pointerUp);

  if (actionsToggle && actionsDropdown) {
    actionsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      actionsDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => actionsDropdown.classList.remove('open'));
    actionsDropdown.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => actionsDropdown.classList.remove('open'));
    });
  }
})();
