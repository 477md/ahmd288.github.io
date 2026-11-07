(() => {
  const video = document.getElementById('rickVideo');
  const readyIndicator = document.getElementById('readyIndicator');
  const readyText = document.getElementById('readyText');
  const escapeButton = document.getElementById('escapeButton');
  const triggerSelector = 'button, [role="button"], input[type="button"], input[type="submit"]';
  let videoReady = false;
  let triggered = false;
  let revealTimer = null;
  let revealed = false;

  const setReady = () => {
    videoReady = true;
    readyIndicator.classList.remove('error');
    readyIndicator.classList.add('ready');
    readyText.textContent = 'Experience ready';
  };

  video.addEventListener('canplay', setReady, { once: true });
  video.addEventListener('canplaythrough', setReady, { once: true });
  video.addEventListener('error', () => {
    readyIndicator.classList.add('error');
    readyText.textContent = 'Video file missing';
  });

  // Request the local video immediately. Browser caching and preload policies still apply.
  video.load();

  function revealAtVisibility() {
    if (revealed) return;
    revealed = true;
    video.muted = false;
    video.volume = 1;
    if (video.paused) {
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          video.controls = true;
          readyText.textContent = 'Tap play to start audio';
        });
      }
    }
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
        revealAtVisibility();
        observer.disconnect();
        break;
      }
    }
  }, { threshold: [0.15] });

  // The "Leave" button stays locked (gray, with a countdown) for 18s after the reveal appears.
  const ESCAPE_LOCK_MS = 18000;
  let escapeLockTimer = null;

  function unlockEscape() {
    if (escapeLockTimer !== null) window.clearInterval(escapeLockTimer);
    escapeLockTimer = null;
    escapeButton.disabled = false;
    delete escapeButton.dataset.locked;
    delete escapeButton.dataset.wait;
  }

  function lockEscape() {
    if (escapeLockTimer !== null) window.clearInterval(escapeLockTimer);
    const end = Date.now() + ESCAPE_LOCK_MS;
    escapeButton.disabled = true;
    escapeButton.dataset.locked = 'true';
    const update = () => {
      const left = end - Date.now();
      if (left <= 0) {
        unlockEscape();
        return;
      }
      escapeButton.dataset.wait = String(Math.ceil(left / 1000));
    };
    update();
    escapeLockTimer = window.setInterval(update, 250);
  }

  function startPrank({ destination = null } = {}) {
    if (triggered) return;
    triggered = true;
    readyIndicator.style.display = 'none';
    document.body.classList.add('prank-pending');

    // Prime playback during the trusted click. It starts muted; audio is enabled
    // when the video becomes visible after the three-second delay.
    video.muted = true;
    video.currentTime = 0;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});

    if (destination) {
      destination.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    revealTimer = window.setTimeout(() => {
      document.body.classList.remove('prank-pending');
      document.body.classList.add('prank-revealed');
      observer.observe(video);
      lockEscape();
    }, 3000);
  }

  // Internal section links scroll as usual, then reveal exactly three seconds
  // after the click. Other links keep their normal browser behavior.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('a, ' + triggerSelector) : null;
    if (!target || target === escapeButton || target.closest('#reveal')) return;
    if (triggered) {
      if (target.matches('a[href^="#"]')) event.preventDefault();
      return;
    }

    if (target.matches('a[href^="#"]')) {
      const id = target.getAttribute('href').slice(1);
      const destination = id ? document.getElementById(id) : document.getElementById('top');
      if (!destination) return;
      event.preventDefault();
      startPrank({ destination });
      return;
    }

    if (target.matches(triggerSelector)) {
      event.preventDefault();
      startPrank();
    }
  }, true);

  escapeButton.addEventListener('click', () => {
    if (escapeButton.dataset.locked === 'true') return;
    if (revealTimer !== null) window.clearTimeout(revealTimer);
    video.pause();
    video.currentTime = 0;
    video.muted = true;
    video.controls = false;
    observer.disconnect();
    document.body.classList.remove('prank-pending', 'prank-revealed');
    readyIndicator.style.display = 'flex';
    readyText.textContent = videoReady ? 'Experience ready' : 'Preparing experience…';
    triggered = false;
    revealed = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
})();
