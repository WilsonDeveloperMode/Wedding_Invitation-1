const revealElements = document.querySelectorAll('.reveal');
const parallaxElements = document.querySelectorAll('.parallax');
const hero = document.querySelector('.hero');
const rsvpForm = document.getElementById('rsvpForm');
const rsvpNote = document.getElementById('rsvpNote');
const inviteesBlock = document.getElementById('inviteesBlock');
const inviteesFields = document.getElementById('inviteesFields');
const inviteesNote = document.getElementById('inviteesNote');
const guestCountMinus = document.getElementById('guestCountMinus');
const guestCountPlus = document.getElementById('guestCountPlus');
const guestCountValue = document.getElementById('guestCountValue');
const bgMusic = document.getElementById('bgMusic');
const videoOpener = document.getElementById('videoOpener');
const openerVideo = document.getElementById('openerVideo');
const invitationShell = document.querySelector('.invitation-shell');
const galleryCarousel = document.getElementById('galleryCarousel');
const galleryTrack = document.getElementById('galleryTrack');
const galleryViewport = document.getElementById('galleryViewport');
const galleryPrev = document.getElementById('galleryPrev');
const galleryNext = document.getElementById('galleryNext');
const galleryDots = document.getElementById('galleryDots');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const userAgent = navigator.userAgent || '';
const isIOSDevice =
  /iP(hone|ad|od)/.test(userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafariBrowser =
  /Safari/.test(userAgent) && /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent) === false;
const useIosSafariAudioFallback = isIOSDevice && isSafariBrowser;
const desktopShellMediaQuery = window.matchMedia('(min-width: 1100px)');

function getScrollContainer() {
  if (desktopShellMediaQuery.matches && invitationShell) {
    return invitationShell;
  }
  return window;
}

function getScrollTop() {
  const scrollContainer = getScrollContainer();
  if (scrollContainer === window) return window.scrollY || window.pageYOffset || 0;
  return scrollContainer.scrollTop;
}

function getViewportHeight() {
  const scrollContainer = getScrollContainer();
  if (scrollContainer === window) {
    return window.innerHeight || document.documentElement.clientHeight || 1;
  }
  return scrollContainer.clientHeight || 1;
}

function getObserverRoot() {
  const scrollContainer = getScrollContainer();
  return scrollContainer === window ? null : scrollContainer;
}

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

function createInviteeField(index, values) {
  const name = (values.name || '').trim();
  const dietry = (values.dietry || '').trim();
  const isPrimary = index === 1;
  const wrapper = document.createElement('div');
  wrapper.className = 'invitee-card';
  wrapper.innerHTML =
    '<p class="invitee-card-title">Person ' +
    index +
    '</p>' +
    '<label>Full Name<input type="text" name="guest' +
    index +
    '" data-guest-field="true" autocomplete="name"' +
    (isPrimary ? ' readonly' : ' required') +
    ' /></label>' +
    '<label>Dietry Requirements<input type="text" name="guest' +
    index +
    'Dietry" data-guest-dietry-field="true" placeholder="Optional: vegetarian, allergies, etc." /></label>';
  const nameInput = wrapper.querySelector('input[name="guest' + index + '"]');
  const dietryInput = wrapper.querySelector('input[name="guest' + index + 'Dietry"]');
  if (nameInput) nameInput.value = name;
  if (dietryInput) dietryInput.value = dietry;
  return wrapper;
}

function setupInviteeFields() {
  if (
    rsvpForm === null ||
    inviteesBlock === null ||
    inviteesFields === null ||
    inviteesNote === null ||
    guestCountMinus === null ||
    guestCountPlus === null ||
    guestCountValue === null
  ) {
    return { inviteeLimit: 1, getSelectedCount: () => 1, setSelectedCount: () => {} };
  }

  const inviteeLimit = getInviteeLimitFromUrl();
  const attendanceInput = rsvpForm.querySelector('select[name="attendance"]');
  const primaryNameInput = rsvpForm.querySelector('input[name="name"]');
  const guestsInput = rsvpForm.querySelector('input[name="guests"]');
  const prefillByIndex = {};
  let selectedCount = 1;

  for (let i = 1; i <= inviteeLimit; i += 1) {
    prefillByIndex[i] = {
      name: getGuestNameFromUrl(i),
      dietry: ''
    };
  }

  inviteesNote.textContent =
    inviteeLimit === 1
      ? 'This invitation allows 1 guest.'
      : 'This invitation allows up to ' + inviteeLimit + ' guests.';
  guestCountValue.textContent = '1';

  const getSelectedCount = () => {
    return selectedCount;
  };

  const setSelectedCount = (nextCount) => {
    selectedCount = Math.max(1, Math.min(inviteeLimit, Math.round(Number(nextCount) || 1)));
    guestCountValue.textContent = String(selectedCount);
    guestCountMinus.disabled = selectedCount <= 1;
    guestCountPlus.disabled = selectedCount >= inviteeLimit;
  };

  const renderGuestFields = () => {
    const previousByIndex = {};
    const existingNames = inviteesFields.querySelectorAll('input[data-guest-field="true"]');
    const existingDietry = inviteesFields.querySelectorAll('input[data-guest-dietry-field="true"]');

    existingNames.forEach((input) => {
      const matched = input.name.match(/^guest(\d+)$/);
      if (!matched) return;
      const index = Number(matched[1]);
      previousByIndex[index] = previousByIndex[index] || { name: '', dietry: '' };
      previousByIndex[index].name = input.value;
    });

    existingDietry.forEach((input) => {
      const matched = input.name.match(/^guest(\d+)Dietry$/);
      if (!matched) return;
      const index = Number(matched[1]);
      previousByIndex[index] = previousByIndex[index] || { name: '', dietry: '' };
      previousByIndex[index].dietry = input.value;
    });

    inviteesFields.innerHTML = '';
    const selectedCount = getSelectedCount();

    for (let i = 1; i <= selectedCount; i += 1) {
      const fromPrevious = previousByIndex[i] || { name: '', dietry: '' };
      const fallback = prefillByIndex[i] || { name: '', dietry: '' };
      const resolvedName =
        i === 1
          ? ((primaryNameInput && primaryNameInput.value.trim()) || fallback.name || '')
          : (fromPrevious.name || fallback.name || '');
      inviteesFields.appendChild(
        createInviteeField(i, {
          name: resolvedName,
          dietry: fromPrevious.dietry || fallback.dietry || ''
        })
      );
    }
  };

  const updateInviteesState = () => {
    const isComing = attendanceInput && attendanceInput.value === 'yes';
    const hasPrimaryName = primaryNameInput && primaryNameInput.value.trim() !== '';

    if (isComing === false || hasPrimaryName === false) {
      inviteesBlock.hidden = true;
      guestCountMinus.disabled = true;
      guestCountPlus.disabled = true;
      const fields = inviteesFields.querySelectorAll('input[data-guest-field="true"]');
      fields.forEach((input) => {
        input.disabled = true;
        input.required = false;
      });
      const dietryFields = inviteesFields.querySelectorAll('input[data-guest-dietry-field="true"]');
      dietryFields.forEach((input) => {
        input.disabled = true;
      });
      if (guestsInput) guestsInput.value = '0';
      return;
    }

    inviteesBlock.hidden = false;
    setSelectedCount(getSelectedCount());
    renderGuestFields();

    const fields = inviteesFields.querySelectorAll('input[data-guest-field="true"]');
    fields.forEach((input) => {
      const isPrimaryGuest = input.name === 'guest1';
      input.disabled = false;
      input.required = isPrimaryGuest === false;
    });
    const dietryFields = inviteesFields.querySelectorAll('input[data-guest-dietry-field="true"]');
    dietryFields.forEach((input) => {
      input.disabled = false;
    });

    if (guestsInput) guestsInput.value = String(getSelectedCount());
  };

  if (attendanceInput) {
    attendanceInput.addEventListener('change', updateInviteesState);
  }
  if (primaryNameInput) {
    primaryNameInput.addEventListener('input', updateInviteesState);
  }
  guestCountMinus.addEventListener('click', () => {
    if (guestCountMinus.disabled) return;
    setSelectedCount(getSelectedCount() - 1);
    updateInviteesState();
  });
  guestCountPlus.addEventListener('click', () => {
    if (guestCountPlus.disabled) return;
    setSelectedCount(getSelectedCount() + 1);
    updateInviteesState();
  });

  inviteesBlock.hidden = true;
  setSelectedCount(1);
  guestCountMinus.disabled = true;
  guestCountPlus.disabled = true;
  if (guestsInput) guestsInput.value = '0';

  return { inviteeLimit, getSelectedCount, setSelectedCount };
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
      root: getObserverRoot(),
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
    const viewportH = getViewportHeight();

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
  if (invitationShell) {
    invitationShell.addEventListener('scroll', onScroll, { passive: true });
  }
  window.addEventListener('resize', onScroll);
  updateParallax();
}

function setupHeroScrollMotion() {
  if (hero === null || prefersReducedMotion) return;

  let ticking = false;

  const updateHero = () => {
    ticking = false;
    const heroHeight = Math.max(hero.offsetHeight, 1);
    const progress = Math.min(1, Math.max(0, getScrollTop() / heroHeight));

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
  if (invitationShell) {
    invitationShell.addEventListener('scroll', onScroll, { passive: true });
  }
  window.addEventListener('resize', onScroll);
  updateHero();
}

function setupRsvp() {
  if (rsvpForm === null || rsvpNote === null) return;
  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  const submitUrl = ((rsvpForm.dataset.webhookUrl || '/api/rsvp').trim() || '/api/rsvp');
  const directGoogleWebhookUrl = (rsvpForm.dataset.googleWebhookUrl || '').trim();
  const guestsInput = rsvpForm.querySelector('input[name="guests"]');
  const attendanceInput = rsvpForm.querySelector('select[name="attendance"]');
  const { inviteeLimit, getSelectedCount, setSelectedCount } = setupInviteeFields();
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
    const message = (data.get('message') || '').toString().trim();

    const selectedCount = attendance === 'yes' ? getSelectedCount() : 0;

    const guestsCount = attendance === 'yes' ? selectedCount : 0;
    if (guestsInput) guestsInput.value = String(guestsCount);

    const normalizedGuestNames = [];
    const normalizedGuestDietry = [];
    for (let i = 1; i <= 4; i += 1) {
      if (attendance !== 'yes' || i > guestsCount) {
        normalizedGuestNames.push('');
        normalizedGuestDietry.push('');
        continue;
      }

      const fieldValue = (data.get('guest' + i) || '').toString().trim();
      normalizedGuestNames.push(i === 1 ? name || fieldValue : fieldValue);
      const dietryValue = (data.get('guest' + i + 'Dietry') || '').toString().trim();
      normalizedGuestDietry.push(dietryValue);
    }

    const dietarySummary = normalizedGuestDietry
      .map((value, index) => {
        if (!value) return '';
        return 'Person ' + (index + 1) + ': ' + value;
      })
      .filter(Boolean)
      .join(' | ');

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
      guest1Dietry: normalizedGuestDietry[0] || '',
      guest2Dietry: normalizedGuestDietry[1] || '',
      guest3Dietry: normalizedGuestDietry[2] || '',
      guest4Dietry: normalizedGuestDietry[3] || '',
      // Compatibility aliases for handlers using Dietary spelling
      guest1Dietary: normalizedGuestDietry[0] || '',
      guest2Dietary: normalizedGuestDietry[1] || '',
      guest3Dietary: normalizedGuestDietry[2] || '',
      guest4Dietary: normalizedGuestDietry[3] || '',
      dietary: dietarySummary,
      message
    };

    try {
      if (submitUrl === '') {
        throw new Error('Missing RSVP webhook URL.');
      }

      isSubmitting = true;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      }

      const submitCandidates = [submitUrl];
      if (submitUrl === '/api/rsvp') {
        submitCandidates.push('/.netlify/functions/rsvp');
      }

      let response = null;
      let lastSubmitError = null;

      for (const endpoint of submitCandidates) {
        try {
          const candidateResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          // Retry next endpoint only for hard endpoint issues.
          if (candidateResponse.status === 404 || candidateResponse.status === 405) {
            response = candidateResponse;
            continue;
          }

          response = candidateResponse;
          lastSubmitError = null;
          break;
        } catch (error) {
          lastSubmitError = error;
        }
      }

      if (response === null) {
        // Final fallback for static hosting (e.g. Netlify) when API/function endpoint is unavailable.
        if (directGoogleWebhookUrl) {
          await fetch(directGoogleWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
          });
          response = {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, cloudEnabled: true, viaDirectWebhook: true })
          };
        } else {
          throw lastSubmitError || new Error('Could not reach RSVP endpoint.');
        }
      }

      let responseData = null;
      try {
        responseData = await response.json();
      } catch (_error) {
        responseData = null;
      }

      if (!response.ok) {
        const errorMessage =
          (responseData && responseData.error) ||
          'Sorry, we could not save your RSVP right now. Please try again.';
        const shouldFallbackToDirectWebhook =
          !!directGoogleWebhookUrl &&
          /missing\s+google_sheets_webhook_url|missing webhook|webhook/i.test(errorMessage);

        if (shouldFallbackToDirectWebhook) {
          await fetch(directGoogleWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
          });

          response = {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, cloudEnabled: true, viaDirectWebhook: true })
          };
          responseData = await response.json();
        } else {
          throw new Error(errorMessage);
        }
      }

      if (responseData && responseData.cloudEnabled === false) {
        rsvpNote.textContent =
          'Your RSVP was saved, but Google Sheets sync is not enabled on the server yet.';
      } else if (attendance === 'yes') {
        rsvpNote.textContent =
          'Thank you, ' + name + '. We look forward to celebrating with you in Sydney.';
      } else {
        rsvpNote.textContent = 'Thank you, ' + name + '. We truly appreciate your response and kind wishes.';
      }

      rsvpForm.reset();
      if (guestsInput) guestsInput.value = '0';
      setSelectedCount(1);
      if (attendanceInput) {
        attendanceInput.dispatchEvent(new Event('change'));
      }
    } catch (error) {
      rsvpNote.textContent =
        (error && error.message) || 'Sorry, we could not save your RSVP right now. Please try again.';
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
  let shouldResumeOnReturn = false;
  let resumePrompt = null;

  const ensureResumePrompt = () => {
    if (useIosSafariAudioFallback === false) return null;
    if (resumePrompt) return resumePrompt;

    resumePrompt = document.createElement('button');
    resumePrompt.type = 'button';
    resumePrompt.textContent = 'Tap to resume music';
    resumePrompt.setAttribute('aria-live', 'polite');
    resumePrompt.style.position = 'fixed';
    resumePrompt.style.left = '50%';
    resumePrompt.style.bottom = '16px';
    resumePrompt.style.transform = 'translateX(-50%)';
    resumePrompt.style.padding = '12px 16px';
    resumePrompt.style.border = 'none';
    resumePrompt.style.borderRadius = '999px';
    resumePrompt.style.background = 'rgba(30, 30, 30, 0.92)';
    resumePrompt.style.color = '#fff';
    resumePrompt.style.fontSize = '14px';
    resumePrompt.style.lineHeight = '1';
    resumePrompt.style.zIndex = '2000';
    resumePrompt.style.cursor = 'pointer';
    resumePrompt.style.display = 'none';

    resumePrompt.addEventListener('click', async () => {
      try {
        await bgMusic.play();
      } catch (_error) {
        // Keep prompt visible if browser still blocks playback.
      }
    });

    document.body.appendChild(resumePrompt);
    return resumePrompt;
  };

  const showResumePrompt = () => {
    const prompt = ensureResumePrompt();
    if (!prompt) return;
    prompt.style.display = 'block';
  };

  const hideResumePrompt = () => {
    if (!resumePrompt) return;
    resumePrompt.style.display = 'none';
  };

  const pauseMusicForBackground = () => {
    if (bgMusic.paused) return;
    shouldResumeOnReturn = true;
    hideResumePrompt();
    bgMusic.pause();
  };

  const resumeMusicOnReturn = async () => {
    if (!shouldResumeOnReturn || document.hidden) return;
    try {
      await bgMusic.play();
      shouldResumeOnReturn = false;
      hideResumePrompt();
    } catch (_error) {
      // iOS Safari often blocks this; show a one-tap resume prompt.
      showResumePrompt();
    }
  };

  bgMusic.addEventListener('play', () => {
    shouldResumeOnReturn = false;
    hideResumePrompt();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseMusicForBackground();
      return;
    }
    resumeMusicOnReturn();
  });

  window.addEventListener('blur', pauseMusicForBackground);
  window.addEventListener('pagehide', pauseMusicForBackground);
  window.addEventListener('focus', resumeMusicOnReturn);
  window.addEventListener('pageshow', resumeMusicOnReturn);
}

function setupAutoGrowMessage() {
  if (rsvpForm === null) return;
  const messageField = rsvpForm.querySelector('textarea[name="message"]');
  if (messageField === null) return;

  const resizeMessageField = () => {
    messageField.style.height = 'auto';
    messageField.style.height = messageField.scrollHeight + 'px';
  };

  messageField.addEventListener('input', resizeMessageField);
  resizeMessageField();
}

function setupGalleryCarousel() {
  if (
    galleryCarousel === null ||
    galleryTrack === null ||
    galleryViewport === null ||
    galleryPrev === null ||
    galleryNext === null ||
    galleryDots === null
  ) {
    return;
  }

  const slides = Array.from(galleryTrack.querySelectorAll('.gallery-slide'));
  if (slides.length === 0) return;

  let currentIndex = 0;
  let startX = 0;
  let deltaX = 0;
  const swipeThreshold = 48;

  const dots = slides.map((_slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'gallery-dot';
    dot.setAttribute('aria-label', 'Go to photo ' + (index + 1));
    dot.addEventListener('click', () => {
      goToSlide(index);
    });
    galleryDots.appendChild(dot);
    return dot;
  });

  const updateCarousel = () => {
    galleryTrack.style.transform = 'translate3d(' + (-currentIndex * 100) + '%,0,0)';
    dots.forEach((dot, index) => {
      const isActive = index === currentIndex;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };

  const goToSlide = (index) => {
    currentIndex = (index + slides.length) % slides.length;
    updateCarousel();
  };

  galleryPrev.addEventListener('click', () => {
    goToSlide(currentIndex - 1);
  });

  galleryNext.addEventListener('click', () => {
    goToSlide(currentIndex + 1);
  });

  galleryViewport.addEventListener(
    'touchstart',
    (event) => {
      startX = event.touches[0].clientX;
      deltaX = 0;
    },
    { passive: true }
  );

  galleryViewport.addEventListener(
    'touchmove',
    (event) => {
      deltaX = event.touches[0].clientX - startX;
    },
    { passive: true }
  );

  galleryViewport.addEventListener('touchend', () => {
    if (Math.abs(deltaX) < swipeThreshold) return;
    if (deltaX < 0) {
      goToSlide(currentIndex + 1);
    } else {
      goToSlide(currentIndex - 1);
    }
  });

  galleryCarousel.setAttribute('tabindex', '0');
  galleryCarousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToSlide(currentIndex + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToSlide(currentIndex - 1);
    }
  });

  updateCarousel();
}

function setupVideoOpener() {
  if (videoOpener === null) return;

  const openerInstruction = videoOpener.querySelector('.video-opener-instruction');

  let hasStarted = false;
  let isTransitioning = false;
  let hasNearEndTransitionTriggered = false;

  const forceUnlock = () => {
    videoOpener.classList.add('is-hidden');
    videoOpener.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('opener-locked');
  };

  const resetToBeginning = () => {
    // Always restart from the invitation opener state when page is opened/restored.
    hasStarted = false;
    isTransitioning = false;
    hasNearEndTransitionTriggered = false;

    videoOpener.classList.remove('is-playing', 'is-transitioning', 'is-hidden');
    videoOpener.setAttribute('aria-hidden', 'false');
    document.body.classList.add('opener-locked');

    if (history.scrollRestoration) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    if (invitationShell) {
      invitationShell.scrollTop = 0;
    }

    if (openerVideo) {
      openerVideo.pause();
      openerVideo.currentTime = 0;
      openerVideo.muted = true;
      openerVideo.defaultMuted = true;
      openerVideo.volume = 0;
      openerVideo.playsInline = true;
    }

    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }
  };

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

    if (openerVideo === null || prefersReducedMotion) {
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

  resetToBeginning();
  window.addEventListener('pageshow', (event) => {
    // Safari fires pageshow on initial load too; only reset when page is restored from bfcache.
    if (!event.persisted) return;
    resetToBeginning();
  });
}

function setupPhotoRoll() {
  const photoRoll = document.querySelector('.gallery-scroll');
  const prevButton = document.querySelector('.gallery-arrow-prev');
  const nextButton = document.querySelector('.gallery-arrow-next');
  if (photoRoll === null) return;
  const galleryRoll = photoRoll.closest('.gallery-roll');

  const cards = Array.from(photoRoll.querySelectorAll('.gallery-card'));
  const totalCards = cards.length;
  if (totalCards === 0) return;

  let activeIndex = Math.floor(totalCards / 2);
  let motionTimer = null;
  let isAnimating = false;
  let isDragging = false;
  let didDragNavigate = false;
  let dragResetTimer = null;
  let autoAdvanceTimer = null;
  let resumeAutoTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchDeltaX = 0;
  let touchDeltaY = 0;
  let touchLastX = 0;
  let touchLastTime = 0;
  let touchVelocityX = 0;
  let dragVisualX = 0;
  let dragVisualFrame = null;
  let lastDragNavigateTime = 0;
  let dragDirectionLocked = false;
  let isHorizontalDrag = false;
  let queuedDirection = 0;
  const swipeThreshold = 42;
  const flickVelocityThreshold = 0.45;
  const minDragNavigateInterval = 120;
  const autoAdvanceDelay = 4000;
  let motionDuration = 900;
  const dragInfluence = 0.34;
  const dragSnapDuration = 340;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const parseDurationToMs = (value) => {
    if (typeof value !== 'string') return 0;
    const raw = value.trim();
    if (raw.endsWith('ms')) {
      return Number.parseFloat(raw.slice(0, -2)) || 0;
    }
    if (raw.endsWith('s')) {
      return (Number.parseFloat(raw.slice(0, -1)) || 0) * 1000;
    }
    return Number.parseFloat(raw) || 0;
  };

  const refreshMotionDuration = () => {
    const styles = window.getComputedStyle(photoRoll);
    const configured = parseDurationToMs(styles.getPropertyValue('--gallery-transition-duration'));
    motionDuration = clamp(Math.round(configured || 900), 260, 1500);
  };

  const renderDragVisual = () => {
    dragVisualFrame = null;
    photoRoll.style.transform = 'translate3d(' + dragVisualX.toFixed(2) + 'px, 0, 0)';
  };

  const setDragVisual = (targetX) => {
    // Light low-pass filter to reduce jitter from noisy touch deltas on mobile.
    dragVisualX = (dragVisualX * 0.68) + (targetX * 0.32);
    if (dragVisualFrame !== null) return;
    dragVisualFrame = window.requestAnimationFrame(renderDragVisual);
  };

  const resetDragVisual = () => {
    dragVisualX = 0;
    if (dragVisualFrame !== null) {
      window.cancelAnimationFrame(dragVisualFrame);
      dragVisualFrame = null;
    }
    photoRoll.style.transform = 'translate3d(0, 0, 0)';
  };

  const normalizeIndex = (index) => {
    return ((index % totalCards) + totalCards) % totalCards;
  };

  const getRenderedContentWidth = (card, scale) => {
    if (card === null) return 0;
    const image = card.querySelector('img');
    const cardWidth = card.clientWidth;
    const cardHeight = card.clientHeight;
    if (image === null || cardWidth <= 0 || cardHeight <= 0) return cardWidth * scale;

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (naturalWidth <= 0 || naturalHeight <= 0) return cardWidth * scale;

    const fitScale = Math.min(cardWidth / naturalWidth, cardHeight / naturalHeight);
    const containedWidth = naturalWidth * fitScale;
    return containedWidth * scale;
  };

  const updateVisibleGapSpacing = () => {
    const centerCard = photoRoll.querySelector('.gallery-card[data-position="center"]');
    const leftCard = photoRoll.querySelector('.gallery-card[data-position="left"]');
    const rightCard = photoRoll.querySelector('.gallery-card[data-position="right"]');
    if (centerCard === null || leftCard === null || rightCard === null) return;

    const styles = window.getComputedStyle(photoRoll);
    const sideScale = parseFloat(styles.getPropertyValue('--gallery-side-scale')) || 0.6;
    const gap = parseFloat(styles.getPropertyValue('--gallery-gap')) || 24;

    const centerWidth = getRenderedContentWidth(centerCard, 1);
    const leftWidth = getRenderedContentWidth(leftCard, sideScale);
    const rightWidth = getRenderedContentWidth(rightCard, sideScale);

    const leftShift = (centerWidth * 0.5) + (leftWidth * 0.5) + gap;
    const rightShift = (centerWidth * 0.5) + (rightWidth * 0.5) + gap;

    photoRoll.style.setProperty('--gallery-left-shift', '-' + leftShift.toFixed(2) + 'px');
    photoRoll.style.setProperty('--gallery-right-shift', rightShift.toFixed(2) + 'px');
  };

  const updatePositions = () => {
    cards.forEach((card, index) => {
      const forwardDistance = (index - activeIndex + totalCards) % totalCards;
      const backwardDistance = (activeIndex - index + totalCards) % totalCards;

      let position = 'hidden-right';
      if (forwardDistance === 0) {
        position = 'center';
      } else if (forwardDistance === 1) {
        position = 'right';
      } else if (forwardDistance === totalCards - 1) {
        position = 'left';
      } else if (backwardDistance < forwardDistance) {
        position = 'hidden-left';
      }

      card.setAttribute('data-position', position);
    });
    updateVisibleGapSpacing();
  };

  const queueOrRunNavigation = (direction) => {
    if (direction !== 1 && direction !== -1) return false;
    if (isAnimating) {
      queuedDirection = direction;
      return false;
    }

    isAnimating = true;
    activeIndex = normalizeIndex(activeIndex + direction);
    updatePositions();
    window.clearTimeout(motionTimer);
    motionTimer = window.setTimeout(() => {
      isAnimating = false;
      if (queuedDirection === 0) return;
      const nextDirection = queuedDirection;
      queuedDirection = 0;
      queueOrRunNavigation(nextDirection);
    }, motionDuration);
    return true;
  };

  const goToNext = () => {
    queueOrRunNavigation(1);
  };

  const goToPrevious = () => {
    queueOrRunNavigation(-1);
  };

  const stopAutoAdvance = () => {
    if (autoAdvanceTimer !== null) {
      window.clearInterval(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
    if (resumeAutoTimer !== null) {
      window.clearTimeout(resumeAutoTimer);
      resumeAutoTimer = null;
    }
  };

  const startAutoAdvance = () => {
    if (document.hidden || autoAdvanceTimer !== null) return;
    autoAdvanceTimer = window.setInterval(() => {
      goToNext();
    }, autoAdvanceDelay);
  };

  const restartAutoAdvanceWithDelay = () => {
    stopAutoAdvance();
    startAutoAdvance();
  };

  const onTouchStart = (event) => {
    if (event.touches.length !== 1) return;
    stopAutoAdvance();
    isDragging = true;
    didDragNavigate = false;
    dragDirectionLocked = false;
    isHorizontalDrag = false;
    queuedDirection = 0;
    window.clearTimeout(dragResetTimer);
    photoRoll.style.transition = 'none';
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchDeltaX = 0;
    touchDeltaY = 0;
    touchLastX = touchStartX;
    touchLastTime = performance.now();
    touchVelocityX = 0;
    dragVisualX = 0;
    lastDragNavigateTime = 0;
  };

  const onTouchMove = (event) => {
    if (event.touches.length !== 1 || isDragging === false) return;
    const currentX = event.touches[0].clientX;
    const currentY = event.touches[0].clientY;
    const now = performance.now();

    touchDeltaX = currentX - touchStartX;
    touchDeltaY = currentY - touchStartY;

    if (dragDirectionLocked === false) {
      if (Math.abs(touchDeltaX) > 8 || Math.abs(touchDeltaY) > 8) {
        dragDirectionLocked = true;
        isHorizontalDrag = Math.abs(touchDeltaX) >= Math.abs(touchDeltaY);
      }
    }

    if (isHorizontalDrag === false) return;

    const deltaTime = Math.max(8, now - touchLastTime);
    touchVelocityX = (currentX - touchLastX) / deltaTime;
    touchLastX = currentX;
    touchLastTime = now;

    if (isAnimating) {
      setDragVisual(0);
      return;
    }

    setDragVisual(touchDeltaX * dragInfluence);

    // Allow continuous swipe progression while finger is still down.
    const canNavigateNow = (now - lastDragNavigateTime) >= minDragNavigateInterval;
    if (touchDeltaX <= -swipeThreshold && canNavigateNow) {
      queueOrRunNavigation(1);
      lastDragNavigateTime = now;
      didDragNavigate = true;
      restartAutoAdvanceWithDelay();
      touchStartX = currentX;
      touchDeltaX = 0;
      touchVelocityX = 0;
      resetDragVisual();
      return;
    }

    if (touchDeltaX >= swipeThreshold && canNavigateNow) {
      queueOrRunNavigation(-1);
      lastDragNavigateTime = now;
      didDragNavigate = true;
      restartAutoAdvanceWithDelay();
      touchStartX = currentX;
      touchDeltaX = 0;
      touchVelocityX = 0;
      resetDragVisual();
    }
  };

  const onTouchEnd = () => {
    if (isDragging === false) return;
    isDragging = false;
    photoRoll.style.transition = 'transform ' + dragSnapDuration + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
    resetDragVisual();
    window.clearTimeout(dragResetTimer);
    dragResetTimer = window.setTimeout(() => {
      photoRoll.style.transition = '';
    }, dragSnapDuration + 20);

    // Always resume autoplay after any touch interaction, even if it was just
    // a hold/scroll and not a swipe navigation.
    restartAutoAdvanceWithDelay();

    if (didDragNavigate) return;

    const shouldSwipeByDistance = Math.abs(touchDeltaX) >= swipeThreshold;
    const shouldSwipeByVelocity = Math.abs(touchVelocityX) >= flickVelocityThreshold;
    if (!shouldSwipeByDistance && !shouldSwipeByVelocity) return;

    const direction = shouldSwipeByDistance
      ? (touchDeltaX < 0 ? 1 : -1)
      : (touchVelocityX < 0 ? 1 : -1);

    if (direction === 1) {
      queueOrRunNavigation(1);
    } else {
      queueOrRunNavigation(-1);
    }
  };

  if (prevButton !== null) {
    prevButton.addEventListener('click', () => {
      goToPrevious();
      restartAutoAdvanceWithDelay();
    });
  }
  if (nextButton !== null) {
    nextButton.addEventListener('click', () => {
      goToNext();
      restartAutoAdvanceWithDelay();
    });
  }
  photoRoll.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPrevious();
      restartAutoAdvanceWithDelay();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToNext();
      restartAutoAdvanceWithDelay();
    }
  });
  photoRoll.addEventListener('touchstart', onTouchStart, { passive: true });
  photoRoll.addEventListener('touchmove', onTouchMove, { passive: true });
  photoRoll.addEventListener('touchend', onTouchEnd);
  photoRoll.addEventListener('touchcancel', onTouchEnd);

  photoRoll.addEventListener('mouseenter', stopAutoAdvance);
  photoRoll.addEventListener('mouseleave', startAutoAdvance);
  photoRoll.addEventListener('focusin', stopAutoAdvance);
  photoRoll.addEventListener('focusout', startAutoAdvance);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoAdvance();
      return;
    }
    startAutoAdvance();
  });

  window.addEventListener('resize', () => {
    refreshMotionDuration();
    updateVisibleGapSpacing();
  });
  cards.forEach((card) => {
    const image = card.querySelector('img');
    if (image === null) return;
    if (image.complete) return;
    image.addEventListener('load', updateVisibleGapSpacing, { once: true });
  });

  const updateEntryProgress = () => {
    if (galleryRoll === null || prefersReducedMotion) {
      photoRoll.style.setProperty('--entry-progress', '1');
      return;
    }

    const rect = galleryRoll.getBoundingClientRect();
    const vh = getViewportHeight();
    const start = vh * 0.9;
    const end = vh * 0.3;
    const raw = (start - rect.top) / (start - end);
    const progress = Math.min(1, Math.max(0, raw));
    photoRoll.style.setProperty('--entry-progress', progress.toFixed(3));
  };

  let entryTicking = false;
  const requestEntryProgress = () => {
    if (entryTicking) return;
    entryTicking = true;
    window.requestAnimationFrame(() => {
      updateEntryProgress();
      entryTicking = false;
    });
  };

  refreshMotionDuration();
  updatePositions();
  updateEntryProgress();
  window.addEventListener('scroll', requestEntryProgress, { passive: true });
  if (invitationShell) {
    invitationShell.addEventListener('scroll', requestEntryProgress, { passive: true });
  }
  window.addEventListener('resize', requestEntryProgress);
  if (galleryRoll !== null && 'IntersectionObserver' in window) {
    const autoPlayObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAutoAdvance();
          } else {
            stopAutoAdvance();
          }
        });
      },
      { root: getObserverRoot(), threshold: 0.2 }
    );
    autoPlayObserver.observe(galleryRoll);
  }
  startAutoAdvance();
}

setupReveal();
setupParallax();
setupHeroScrollMotion();
setupGalleryCarousel();
setupPhotoRoll();
setupAutoGrowMessage();
setupRsvp();
setupMusicPlayer();
setupVideoOpener();
