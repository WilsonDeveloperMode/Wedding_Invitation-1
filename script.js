const revealElements = document.querySelectorAll('.reveal');
const parallaxElements = document.querySelectorAll('.parallax');
const hero = document.querySelector('.hero');
const rsvpForm = document.getElementById('rsvpForm');
const rsvpNote = document.getElementById('rsvpNote');
const inviteesBlock = document.getElementById('inviteesBlock');
const inviteesFields = document.getElementById('inviteesFields');
const inviteesNote = document.getElementById('inviteesNote');
const attendingCountSelect = document.getElementById('attendingCount');
const bgMusic = document.getElementById('bgMusic');
const videoOpener = document.getElementById('videoOpener');
const openerVideo = document.getElementById('openerVideo');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function clampInviteeCount(value) {
  const count = Number(value);
  if (Number.isFinite(count) === false) return 1;
  return Math.min(4, Math.max(1, Math.round(count)));
}

function getInviteeLimitFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const candidate =
    params.get('invitees') ||
    params.get('maxInvitees') ||
    params.get('guests') ||
    params.get('partySize');
  return clampInviteeCount(candidate || 1);
}

function getGuestNameFromUrl(index) {
  const params = new URLSearchParams(window.location.search);
  const candidates = [
    'guest' + index,
    'name' + index,
    index === 1 ? 'guest' : '',
    index === 1 ? 'name' : ''
  ].filter(Boolean);

  for (const key of candidates) {
    const value = (params.get(key) || '').trim();
    if (value !== '') return value;
  }

  return '';
}

function createInviteeField(index, value) {
  const wrapper = document.createElement('label');
  const displayIndex = 'Guest ' + index;
  wrapper.innerHTML =
    displayIndex +
    '<input type="text" name="guest' +
    index +
    '" data-guest-field="true" autocomplete="name" />';
  const input = wrapper.querySelector('input');
  if (input) {
    input.required = false;
    input.value = value;
  }
  return wrapper;
}

function setupInviteeFields() {
  if (
    rsvpForm === null ||
    inviteesBlock === null ||
    inviteesFields === null ||
    inviteesNote === null ||
    attendingCountSelect === null
  ) {
    return { inviteeLimit: 1, getSelectedCount: () => 1 };
  }

  const inviteeLimit = getInviteeLimitFromUrl();
  const attendanceInput = rsvpForm.querySelector('select[name="attendance"]');
  const primaryNameInput = rsvpForm.querySelector('input[name="name"]');
  const guestsInput = rsvpForm.querySelector('input[name="guests"]');
  const prefillByIndex = {};

  for (let i = 2; i <= inviteeLimit; i += 1) {
    prefillByIndex[i] = getGuestNameFromUrl(i);
  }

  if (inviteeLimit === 1) {
    inviteesBlock.hidden = true;
    if (guestsInput) guestsInput.value = '1';
    return { inviteeLimit, getSelectedCount: () => 1 };
  }

  inviteesNote.textContent = 'This invitation allows up to ' + inviteeLimit + ' guests.';
  attendingCountSelect.innerHTML = '';

  for (let i = 1; i <= inviteeLimit; i += 1) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = String(i);
    attendingCountSelect.appendChild(option);
  }
  attendingCountSelect.value = '1';

  const getSelectedCount = () => {
    const selected = Number(attendingCountSelect.value);
    if (Number.isFinite(selected) === false) return 1;
    return Math.max(1, Math.min(inviteeLimit, Math.round(selected)));
  };

  const renderGuestFields = () => {
    const previousValues = {};
    const existingInputs = inviteesFields.querySelectorAll('input[data-guest-field="true"]');
    existingInputs.forEach((input) => {
      previousValues[input.name] = input.value;
    });

    inviteesFields.innerHTML = '';
    const selectedCount = getSelectedCount();

    for (let i = 2; i <= selectedCount; i += 1) {
      const fieldName = 'guest' + i;
      const fromPrevious = (previousValues[fieldName] || '').trim();
      const fallback = (prefillByIndex[i] || '').trim();
      const field = createInviteeField(i, fromPrevious || fallback);
      const input = field.querySelector('input');
      if (input) input.required = true;
      inviteesFields.appendChild(field);
    }
  };

  const updateInviteesState = () => {
    const isComing = attendanceInput && attendanceInput.value === 'yes';
    const hasPrimaryName = primaryNameInput && primaryNameInput.value.trim() !== '';

    if (isComing === false || hasPrimaryName === false) {
      inviteesBlock.hidden = true;
      attendingCountSelect.disabled = true;
      const fields = inviteesFields.querySelectorAll('input[data-guest-field="true"]');
      fields.forEach((input) => {
        input.disabled = true;
        input.required = false;
      });
      if (guestsInput) guestsInput.value = '0';
      return;
    }

    inviteesBlock.hidden = false;
    attendingCountSelect.disabled = false;
    renderGuestFields();

    const fields = inviteesFields.querySelectorAll('input[data-guest-field="true"]');
    fields.forEach((input) => {
      input.disabled = false;
      input.required = true;
    });

    if (guestsInput) guestsInput.value = String(getSelectedCount());
  };

  if (attendanceInput) {
    attendanceInput.addEventListener('change', updateInviteesState);
  }
  if (primaryNameInput) {
    primaryNameInput.addEventListener('input', updateInviteesState);
  }
  attendingCountSelect.addEventListener('change', updateInviteesState);

  inviteesBlock.hidden = true;
  attendingCountSelect.disabled = true;
  if (guestsInput) guestsInput.value = '0';

  return { inviteeLimit, getSelectedCount };
}

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
  const webhookUrl = (rsvpForm.dataset.webhookUrl || '').trim();
  const guestsInput = rsvpForm.querySelector('input[name="guests"]');
  const attendanceInput = rsvpForm.querySelector('select[name="attendance"]');
  const dietaryInput = rsvpForm.querySelector('input[name="dietary"]');
  const dietaryLabel = dietaryInput ? dietaryInput.closest('label') : null;
  const { inviteeLimit, getSelectedCount } = setupInviteeFields();
  let isSubmitting = false;

  const updateDietaryState = () => {
    if (!attendanceInput || !dietaryInput || !dietaryLabel) return;
    const isDeclining = attendanceInput.value === 'no';
    dietaryInput.disabled = isDeclining;
    dietaryInput.required = false;
    if (isDeclining) {
      dietaryInput.value = '';
    }
    dietaryLabel.hidden = isDeclining;
  };

  if (attendanceInput) {
    attendanceInput.addEventListener('change', updateDietaryState);
    updateDietaryState();
  }

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
    const dietary = (data.get('dietary') || '').toString().trim();
    const message = (data.get('message') || '').toString().trim();

    const selectedCount = attendance === 'yes' ? getSelectedCount() : 0;

    const guestsCount = attendance === 'yes' ? selectedCount : 0;
    if (guestsInput) guestsInput.value = String(guestsCount);

    const normalizedGuestNames = [name];
    for (let i = 2; i <= 4; i += 1) {
      const fieldValue = (data.get('guest' + i) || '').toString().trim();
      normalizedGuestNames.push(fieldValue);
    }

    const payload = {
      submittedAt: new Date().toISOString(),
      name,
      attendance,
      guests: guestsCount,
      inviteeLimit,
      guest1: normalizedGuestNames[0] || '',
      guest2: normalizedGuestNames[1] || '',
      guest3: normalizedGuestNames[2] || '',
      guest4: normalizedGuestNames[3] || '',
      dietary,
      message
    };

    try {
      if (webhookUrl === '') {
        throw new Error('Missing RSVP webhook URL.');
      }

      isSubmitting = true;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      }

      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });

      if (attendance === 'yes') {
        rsvpNote.textContent = 'Thank you, ' + name + '. We look forward to celebrating with you in Sydney.';
      } else {
        rsvpNote.textContent = 'Thank you, ' + name + '. We truly appreciate your response and kind wishes.';
      }

      rsvpForm.reset();
      if (guestsInput) guestsInput.value = '0';
      if (attendingCountSelect) attendingCountSelect.value = '1';
      if (attendanceInput) {
        attendanceInput.dispatchEvent(new Event('change'));
      }
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

function setupMusicPlayer() {
  if (bgMusic === null) return;
}

function setupVideoOpener() {
  if (videoOpener === null) return;

  const openerInstruction = videoOpener.querySelector('.video-opener-instruction');
  document.body.classList.add('opener-locked');

  if (openerVideo) {
    openerVideo.muted = true;
    openerVideo.defaultMuted = true;
    openerVideo.volume = 0;
    openerVideo.playsInline = true;
  }

  let hasStarted = false;
  let isTransitioning = false;
  let hasNearEndTransitionTriggered = false;

  const finishTransition = async () => {
    if (videoOpener.classList.contains('is-hidden') || isTransitioning) return;
    isTransitioning = true;
    videoOpener.classList.add('is-transitioning');
    videoOpener.setAttribute('aria-hidden', 'true');

    window.setTimeout(() => {
      videoOpener.classList.add('is-hidden');
      document.body.classList.remove('opener-locked');
    }, 900);

    if (bgMusic) {
      window.setTimeout(async () => {
        try {
          await bgMusic.play();
        } catch (_error) {
          // Ignore if browser still blocks playback.
        }
      }, 540);
    }
  };

  const startOpeningVideo = async () => {
    if (hasStarted) return;
    hasStarted = true;
    videoOpener.classList.add('is-playing');

    if (openerVideo === null) {
      await finishTransition();
      return;
    }

    try {
      openerVideo.currentTime = 0;
      await openerVideo.play();
    } catch (_error) {
      await finishTransition();
    }
  };

  const onTap = async () => {
    if (videoOpener.classList.contains('is-hidden')) return;
    if (hasStarted === false) {
      await startOpeningVideo();
    }
  };

  if (openerVideo) {
    const triggerNearEndTransition = () => {
      if (hasNearEndTransitionTriggered) return;
      if (Number.isFinite(openerVideo.duration) === false || openerVideo.duration <= 0) return;
      const remaining = openerVideo.duration - openerVideo.currentTime;
      if (remaining > 0.85) return;
      hasNearEndTransitionTriggered = true;
      finishTransition();
    };

    openerVideo.addEventListener('timeupdate', triggerNearEndTransition);
    openerVideo.addEventListener('ended', finishTransition);
  }

  videoOpener.addEventListener('click', onTap);
  videoOpener.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onTap();
  });

  if (prefersReducedMotion) {
    videoOpener.classList.add('is-hidden');
    window.setTimeout(() => {
      document.body.classList.remove('opener-locked');
    }, 0);
  }
}

setupReveal();
setupParallax();
setupHeroScrollMotion();
setupRsvp();
setupMusicPlayer();
setupVideoOpener();
