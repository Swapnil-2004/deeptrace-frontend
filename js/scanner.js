/* ================================================================
   DeepTrace — scanner.js
   The forensic scanner experience during analysis.
   Controls:
   - Scan line sweeping over the image (ECG feel)
   - 3 progress bars filling at different speeds
   - Confidence number flipping like a slot machine
   - Rotating forensic status messages
   - Frame counter for video analysis
   - Optional sound toggle (sonar ping during scan)
   ================================================================ */

(function () {
  'use strict';

  /* ================================================================
     STATE
  ================================================================ */
  let isRunning       = false;
  let soundEnabled    = false;
  let animFrameId     = null;
  let statusInterval  = null;
  let slotInterval    = null;
  let barIntervals    = [];
  let audioCtx        = null;

  /* Bar progress values — each fills at different speed */
  let barValues = { boundary: 0, model: 0, signal: 0 };

  /* Expose stop function so upload.js can call it */
  window.DeepTraceScanner = { start, stop };


  /* ================================================================
     ELEMENTS
  ================================================================ */
  const scannerLine    = document.getElementById('scanner-line');
  const scannerStatus  = document.getElementById('scanner-status');
  const confNumber     = document.getElementById('conf-number');
  const frameCounter   = document.getElementById('frame-counter');
  const frameCurrent   = document.getElementById('frame-current');
  const frameTotal     = document.getElementById('frame-total');
  const soundToggle    = document.getElementById('sound-toggle');
  const soundOnIcon    = soundToggle ? soundToggle.querySelector('.sound-on')  : null;
  const soundOffIcon   = soundToggle ? soundToggle.querySelector('.sound-off') : null;

  const barBoundary    = document.getElementById('bar-boundary');
  const barModel       = document.getElementById('bar-model');
  const barSignal      = document.getElementById('bar-signal');
  const pctBoundary    = document.getElementById('pct-boundary');
  const pctModel       = document.getElementById('pct-model');
  const pctSignal      = document.getElementById('pct-signal');


  /* ================================================================
     FORENSIC STATUS MESSAGES
     These rotate during analysis — makes waiting feel informative.
  ================================================================ */
  const STATUS_MESSAGES = [
    'Initialising forensic scan...',
    'Detecting facial landmarks...',
    'Extracting boundary contour...',
    'Analysing hairline curvature...',
    'Examining jaw topology...',
    'Computing chromatic aberration...',
    'Measuring sensor noise residual...',
    'Running EfficientNet-B4...',
    'Running ViT boundary detector...',
    'Computing BTD signals...',
    'Analysing colour kurtosis...',
    'Checking high-frequency content...',
    'Examining facial symmetry...',
    'Running ELA analysis...',
    'Processing metadata...',
    'Computing ensemble score...',
    'Calculating confidence...',
    'Finalising forensic report...'
  ];

  let statusIndex = 0;


  /* ================================================================
     SOUND ENGINE
     Creates a soft sonar ping using Web Audio API.
     Only runs when user explicitly enables sound.
     No autoplay — respects browser policies.
  ================================================================ */
  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('DeepTrace: Web Audio not supported');
      audioCtx = null;
    }
  }

  function playSonarPing() {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type      = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) { /* ignore audio errors */ }
  }

  function playAlertTone() {
    if (!soundEnabled || !audioCtx) return;
    try {
      /* Two quick low pulses — alert feel */
      [0, 0.25].forEach(offset => {
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type      = 'sawtooth';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime + offset);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + offset + 0.2);
        osc.start(audioCtx.currentTime + offset);
        osc.stop(audioCtx.currentTime + offset + 0.2);
      });
    } catch (e) { /* ignore */ }
  }

  function playChime() {
    if (!soundEnabled || !audioCtx) return;
    try {
      /* Ascending pleasant chime — real/success feel */
      [523, 659, 784].forEach((freq, i) => {
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type      = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.3);
        osc.start(audioCtx.currentTime + i * 0.12);
        osc.stop(audioCtx.currentTime + i * 0.12 + 0.35);
      });
    } catch (e) { /* ignore */ }
  }

  /* Expose sound functions so reveal.js can use them */
  window.DeepTraceSound = { playAlertTone, playChime };


  /* ================================================================
     SOUND TOGGLE BUTTON
  ================================================================ */
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      /* Init audio context on first user interaction */
      initAudio();

      soundEnabled = !soundEnabled;
      soundToggle.setAttribute('aria-pressed', soundEnabled);

      if (soundOnIcon && soundOffIcon) {
        soundOnIcon.style.display  = soundEnabled ? 'block' : 'none';
        soundOffIcon.style.display = soundEnabled ? 'none'  : 'block';
      }

      /* If sound just enabled and scanner is running — start pinging */
      if (soundEnabled && isRunning) {
        startSonarLoop();
      }
    });
  }

  let sonarLoopId = null;

  function startSonarLoop() {
    if (sonarLoopId) return;
    playSonarPing();
    sonarLoopId = setInterval(() => {
      if (!isRunning || !soundEnabled) {
        clearInterval(sonarLoopId);
        sonarLoopId = null;
        return;
      }
      playSonarPing();
    }, 1800);
  }


  /* ================================================================
     PROGRESS BARS
     Each bar fills at a different speed and pattern.
     Boundary fills fastest (70-85%), model is slower,
     signal pulses up and down slightly — realistic feel.
  ================================================================ */
  function startProgressBars() {
    /* Clear any existing intervals */
    barIntervals.forEach(id => clearInterval(id));
    barIntervals = [];

    /* Reset values */
    barValues = { boundary: 0, model: 0, signal: 0 };
    updateBar('boundary', 0);
    updateBar('model', 0);
    updateBar('signal', 0);

    /* Boundary — fills to 85% quickly then stalls */
    barIntervals.push(setInterval(() => {
      if (!isRunning) return;
      const target = 85;
      if (barValues.boundary < target) {
        barValues.boundary = Math.min(
          target,
          barValues.boundary + (Math.random() * 3 + 1)
        );
        updateBar('boundary', Math.round(barValues.boundary));
      }
    }, 120));

    /* Model — slower, fills to 70% then stalls */
    barIntervals.push(setInterval(() => {
      if (!isRunning) return;
      const target = 70;
      if (barValues.model < target) {
        barValues.model = Math.min(
          target,
          barValues.model + (Math.random() * 2 + 0.5)
        );
        updateBar('model', Math.round(barValues.model));
      }
    }, 200));

    /* Signal — pulses slightly — most dynamic */
    barIntervals.push(setInterval(() => {
      if (!isRunning) return;
      const base   = 60;
      const jitter = Math.random() * 20 - 10;
      const val    = Math.max(30, Math.min(90, barValues.signal + jitter));
      barValues.signal = val;
      updateBar('signal', Math.round(val));
    }, 300));
  }

  function updateBar(name, pct) {
    const bar = name === 'boundary' ? barBoundary
              : name === 'model'    ? barModel
              : barSignal;
    const lbl = name === 'boundary' ? pctBoundary
              : name === 'model'    ? pctModel
              : pctSignal;
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent  = pct + '%';
  }

  /* Fill all bars to 100% at the end */
  function completeBars() {
    ['boundary', 'model', 'signal'].forEach(name => {
      updateBar(name, 100);
    });
  }


  /* ================================================================
     SLOT MACHINE — confidence number
     Rapidly flips through random numbers.
     Slows down and locks on real value when result arrives.
  ================================================================ */
  function startSlotMachine() {
    if (slotInterval) clearInterval(slotInterval);
    slotInterval = setInterval(() => {
      if (!isRunning) return;
      const rand = Math.floor(Math.random() * 100);
      if (confNumber) {
        confNumber.textContent = rand + '%';
        confNumber.style.animation = 'slotRoll 0.1s ease';
        setTimeout(() => {
          if (confNumber) confNumber.style.animation = '';
        }, 100);
      }
    }, 120);
  }

  /* Lock slot machine on real value with deceleration effect */
  function lockSlotMachine(realValue) {
    if (slotInterval) {
      clearInterval(slotInterval);
      slotInterval = null;
    }

    /* Deceleration — slow down before locking */
    const steps    = [80, 160, 260, 380, 500];
    const fakeVals = [
      Math.floor(Math.random() * 100),
      Math.floor(Math.random() * 100),
      Math.floor(Math.random() * 100),
      Math.floor(Math.random() * 100),
      realValue
    ];

    fakeVals.forEach((val, i) => {
      setTimeout(() => {
        if (confNumber) confNumber.textContent = val + '%';
      }, steps[i]);
    });

    /* Final lock with emphasis */
    setTimeout(() => {
      if (confNumber) {
        confNumber.textContent = realValue + '%';
        confNumber.style.color = '#ffffff';
        confNumber.style.transform = 'scale(1.1)';
        setTimeout(() => {
          if (confNumber) confNumber.style.transform = '';
        }, 300);
      }
    }, 600);
  }


  /* ================================================================
     STATUS MESSAGES — rotate during analysis
  ================================================================ */
  function startStatusMessages() {
    statusIndex = 0;
    if (scannerStatus) {
      scannerStatus.textContent = STATUS_MESSAGES[0];
    }

    statusInterval = setInterval(() => {
      if (!isRunning) return;
      statusIndex = (statusIndex + 1) % STATUS_MESSAGES.length;
      if (scannerStatus) {
        /* Fade out */
        scannerStatus.style.opacity = '0';
        setTimeout(() => {
          if (scannerStatus && isRunning) {
            scannerStatus.textContent = STATUS_MESSAGES[statusIndex];
            scannerStatus.style.opacity = '1';
          }
        }, 200);
      }
    }, 1600);
  }


  /* ================================================================
     VIDEO FRAME COUNTER
     Simulates frame counting during video analysis.
     Real frame count comes from API response.
  ================================================================ */
  let frameSimInterval = null;
  let currentFrameSim  = 0;

  function startFrameCounter(totalFrames) {
    if (!frameCounter || !frameCurrent || !frameTotal) return;
    frameCounter.hidden = false;
    frameTotal.textContent   = totalFrames || 30;
    frameCurrent.textContent = 0;
    currentFrameSim = 0;

    frameSimInterval = setInterval(() => {
      if (!isRunning) return;
      const max = parseInt(frameTotal.textContent);
      if (currentFrameSim < max - 2) {
        currentFrameSim += Math.floor(Math.random() * 2) + 1;
        currentFrameSim  = Math.min(currentFrameSim, max - 1);
        frameCurrent.textContent = currentFrameSim;
      }
    }, 800);
  }

  function completeFrameCounter() {
    if (frameSimInterval) {
      clearInterval(frameSimInterval);
      frameSimInterval = null;
    }
    if (frameCurrent && frameTotal) {
      frameCurrent.textContent = frameTotal.textContent;
    }
  }


  /* ================================================================
     START — called by upload.js when Analyse is clicked
  ================================================================ */
  function start(mediaType) {
    isRunning = true;

    /* Start all animations */
    startProgressBars();
    startSlotMachine();
    startStatusMessages();

    /* Sound — start pinging if enabled */
    if (soundEnabled) {
      startSonarLoop();
    }

    /* Frame counter for video */
    if (mediaType === 'video') {
      startFrameCounter(30);
    } else {
      if (frameCounter) frameCounter.hidden = true;
    }

    /* Status message transition */
    if (scannerStatus) {
      scannerStatus.style.transition = 'opacity 0.2s ease';
    }
  }


  /* ================================================================
     STOP — called when API returns result
     Fills all bars to 100%, locks slot machine, updates status.
  ================================================================ */
  function stop(realConfidence) {
    isRunning = false;

    /* Clear all intervals */
    barIntervals.forEach(id => clearInterval(id));
    barIntervals = [];
    if (statusInterval)  { clearInterval(statusInterval);  statusInterval  = null; }
    if (sonarLoopId)     { clearInterval(sonarLoopId);     sonarLoopId     = null; }
    if (frameSimInterval){ clearInterval(frameSimInterval); frameSimInterval= null; }

    /* Complete all visual elements */
    completeBars();
    completeFrameCounter();

    /* Update status */
    if (scannerStatus) {
      scannerStatus.style.opacity = '0';
      setTimeout(() => {
        if (scannerStatus) {
          scannerStatus.textContent = 'Analysis complete.';
          scannerStatus.style.opacity = '1';
        }
      }, 200);
    }

    /* Lock slot machine on real value */
    if (realConfidence !== undefined) {
      lockSlotMachine(Math.round(realConfidence));
    }
  }

})();
