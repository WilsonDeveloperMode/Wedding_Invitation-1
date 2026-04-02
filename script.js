const revealElements = document.querySelectorAll('.reveal');
const parallaxElements = document.querySelectorAll('.parallax');
const hero = document.querySelector('.hero');
const rsvpForm = document.getElementById('rsvpForm');
const rsvpNote = document.getElementById('rsvpNote');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setupReveal() {
  if (('IntersectionObserver' in window) === false) {
    revealElements.forEach((el) => el.classList.add('show'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting === false) return;
        entry.target.classList.add('show');
        obs.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -8% 0px'
    }
  );

  revealElements.forEach((el) => observer.observe(el));
}

function setupParallax() {
  if (prefersReducedMotion || parallaxElements.length === 0) return;

  let ticking = false;

  const updateParallax = () => {
    ticking = false;
    const viewportH = window.innerHeight;

    parallaxElements.forEach((el) => {
      const speed = Number(el.dataset.speed || 0.05);
      const rect = el.getBoundingClientRect();
      const centerOffset = rect.top + rect.height / 2 - viewportH / 2;
      const translateY = centerOffset * -speed;
      el.style.transform = 'translate3d(0,' + translateY + 'px,0)';
    });
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateParallax);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateParallax();
}

function setupHeroScrollMotion() {
  if (hero === null || prefersReducedMotion) return;

  let ticking = false;

  const updateHero = () => {
    ticking = false;
    const heroHeight = Math.max(hero.offsetHeight, 1);
    const progress = Math.min(1, Math.max(0, window.scrollY / heroHeight));

    hero.style.setProperty('--hero-shift', (progress * 68).toFixed(2) + 'px');
    hero.style.setProperty('--hero-scale', (1 + progress * 0.08).toFixed(3));
    hero.style.setProperty('--hero-content-shift', (progress * 34).toFixed(2) + 'px');
    hero.style.setProperty('--hero-content-opacity', (1 - progress * 1.14).toFixed(3));
    hero.style.setProperty('--hero-overlay-opacity', (1 - progress * 0.2).toFixed(3));
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateHero);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateHero();
}

function setupRsvp() {
  if (rsvpForm === null || rsvpNote === null) return;
  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  let isSubmitting = false;

  rsvpForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (rsvpForm.checkValidity() === false) {
      rsvpNote.textContent = 'Please complete the required fields before submitting.';
      return;
    }

    const data = new FormData(rsvpForm);
    const name = (data.get('name') || '').toString().trim();
    const attendance = (data.get('attendance') || '').toString().trim();
    const guests = (data.get('guests') || '1').toString().trim();
    const dietary = (data.get('dietary') || '').toString().trim();
    const message = (data.get('message') || '').toString().trim();

    try {
      isSubmitting = true;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      }

      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          attendance,
          guests,
          dietary,
          message
        })
      });

      if (response.ok === false) {
        throw new Error('Failed to submit RSVP');
      }

      if (attendance === 'yes') {
        rsvpNote.textContent = 'Thank you, ' + name + '. We look forward to celebrating with you in Sydney.';
      } else {
        rsvpNote.textContent = 'Thank you, ' + name + '. We truly appreciate your response and kind wishes.';
      }

      rsvpForm.reset();
    } catch (_error) {
      rsvpNote.textContent = 'Sorry, we could not save your RSVP right now. Please try again.';
    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send RSVP';
      }
    }
  });
}

setupReveal();
setupParallax();
setupHeroScrollMotion();
setupRsvp();
