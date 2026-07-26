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

/* HERO TYPING ANIMATION (runs once, does not loop) */
function typeHeroLine() {
  const el = document.getElementById('typed-line');
  const heroInner = document.querySelector('.hero-inner');
  if (!el || !heroInner) return;

  const fullText = el.dataset.typedText || el.textContent;
  const accentWord = el.dataset.typedAccent || '';

  // A one-time character reveal is mild enough to run even under
  // prefers-reduced-motion (unlike the translateY/parallax effects
  // elsewhere on the page, which do respect that setting).
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

typeHeroLine();

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

function runHoursAnimation(card) {
  const fill = card.querySelector('.hours-bar-fill');
  const numberEl = card.querySelector('.hours-number');
  const target = parseInt(numberEl.dataset.countTo, 10);

  if (fill) fill.classList.add('is-filled');
  animateValue(numberEl, 0, target, 1300, (v) => String(v));
}

function resetHoursAnimation(card) {
  const fill = card.querySelector('.hours-bar-fill');
  const numberEl = card.querySelector('.hours-number');

  if (fill) fill.classList.remove('is-filled');
  numberEl._animToken = (numberEl._animToken || 0) + 1;
  numberEl.textContent = '0';
}

function runTokensAnimation(card) {
  const tokensEl = card.querySelector('.tokens-count');
  const from = parseInt(tokensEl.dataset.countFrom, 10);
  const to = parseInt(tokensEl.dataset.countTo, 10);
  const suffix = tokensEl.dataset.countSuffix || '';

  // Hold on the starting number first so the eventual drop reads as a
  // deliberate before/after jump, not just a number sliding around.
  const token = (tokensEl._animToken = (tokensEl._animToken || 0) + 1);
  tokensEl.textContent = from.toLocaleString() + suffix;

  setTimeout(() => {
    if (tokensEl._animToken !== token) return; // reset/re-triggered during the hold
    animateValue(tokensEl, from, to, 1100, (v) => v.toLocaleString());
  }, 750);
}

function resetTokensAnimation(card) {
  const tokensEl = card.querySelector('.tokens-count');
  const from = parseInt(tokensEl.dataset.countFrom, 10);
  const suffix = tokensEl.dataset.countSuffix || '';

  tokensEl._animToken = (tokensEl._animToken || 0) + 1;
  tokensEl.textContent = from.toLocaleString() + suffix;
}

const hoursCard = document.querySelector('.savings-card-hours');
const tokensCard = document.querySelector('.savings-card-tokens');

if (hoursCard && tokensCard && 'IntersectionObserver' in window) {
  const chartObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const isHours = entry.target === hoursCard;
        const isTokens = entry.target === tokensCard;
        if (entry.isIntersecting) {
          if (isHours) runHoursAnimation(hoursCard);
          if (isTokens) runTokensAnimation(tokensCard);
        } else {
          if (isHours) resetHoursAnimation(hoursCard);
          if (isTokens) resetTokensAnimation(tokensCard);
        }
      });
    },
    { threshold: 0.4 }
  );
  chartObserver.observe(hoursCard);
  chartObserver.observe(tokensCard);
} else {
  if (hoursCard) runHoursAnimation(hoursCard);
  if (tokensCard) runTokensAnimation(tokensCard);
}
