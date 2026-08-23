/* ================================================================
   DeepTrace — reveal.js
   The dramatic result reveal experience.
   Controls:
   - FAKE reveal: red slam + screen vignette + alert tone
   - REAL reveal: green stamp + confetti + particle burst + chime
   - Smooth transition from scanner to result state
   - Passing data to result.js for display
   ================================================================ */

(function () {
  'use strict';

  /* ================================================================
     STATE
  ================================================================ */
  let confettiAnimId  = null;
  let vignetteEl      = null;
  let confettiCanvas  = null;
  let confettiCtx     = null;
  let confettiPieces  = [];

  /* Expose show and reset */
  window.DeepTraceReveal = { show, reset };


  /* ================================================================
     MAIN SHOW FUNCTION
     Called by upload.js after API returns result.
     data    = full API response JSON
     file    = the uploaded File object
     type    = 'image' or 'video'
  ================================================================ */
  function show(data, file, type) {
    const isFake = data.prediction === 'Fake' ||
                   data.prediction === 'FAKE' ||
                   data.final_score >= 0.50;

    const confidence = Math.round(data.confidence || (data.final_score * 100));

    /* Stop scanner — pass real confidence for slot machine lock */
    if (window.DeepTraceScanner && window.DeepTraceScanner.stop) {
      window.DeepTraceScanner.stop(confidence);
    }

    /* Brief pause — let slot machine finish locking */
    setTimeout(() => {
      if (isFake) {
        revealFake(data, file, type, confidence);
      } else {
        revealReal(data, file, type, confidence);
      }
    }, 700);
  }


  /* ================================================================
     FAKE REVEAL
     Red slam + screen flash + alert tone
  ================================================================ */
  function revealFake(data, file, type, confidence) {

    /* 1. Play alert tone */
    if (window.DeepTraceSound && window.DeepTraceSound.playAlertTone) {
      window.DeepTraceSound.playAlertTone();
    }

    /* 2. Screen vignette — red edges */
    showVignette();

    /* 3. Switch to result state */
    window.DeepTraceState.showState('result');

    /* 4. Set panel classes */
    const resultPanel = document.getElementById('state-result');
    if (resultPanel) {
      resultPanel.classList.remove('state--real');
      resultPanel.classList.add('state--fake');
    }

    /* 5. Activate result vignette inside panel */
    const panelVignette = document.getElementById('result-vignette');
    if (panelVignette) {
      setTimeout(() => panelVignette.classList.add('active'), 100);
    }

    /* 6. Render result content */
    renderResult(data, file, type, confidence, true);

    /* 7. Scroll to result */
    scrollToResult();
  }


  /* ================================================================
     REAL REVEAL
     Green stamp + confetti rain + chime
  ================================================================ */
  function revealReal(data, file, type, confidence) {

    /* 1. Play chime */
    if (window.DeepTraceSound && window.DeepTraceSound.playChime) {
      window.DeepTraceSound.playChime();
    }

    /* 2. Switch to result state */
    window.DeepTraceState.showState('result');

    /* 3. Set panel classes */
    const resultPanel = document.getElementById('state-result');
    if (resultPanel) {
      resultPanel.classList.remove('state--fake');
      resultPanel.classList.add('state--real');
    }

    /* 4. Render result content */
    renderResult(data, file, type, confidence, false);

    /* 5. Start confetti after short delay */
    setTimeout(() => startConfetti(), 400);

    /* 6. Particle burst from verdict badge */
    setTimeout(() => particleBurst(), 300);

    /* 7. Scroll to result */
    scrollToResult();
  }


  /* ================================================================
     RENDER RESULT CONTENT
     Fills all result elements with data from API response.
  ================================================================ */
  function renderResult(data, file, type, confidence, isFake) {

    /* Report header */
    const filenameEl = document.getElementById('result-filename');
    if (filenameEl) {
      filenameEl.textContent = file.name + ' · analysed just now';
    }

    /* Verdict panel */
    const verdictEl = document.getElementById('result-verdict');
    if (verdictEl) {
      verdictEl.classList.remove('verdict--fake', 'verdict--real');
      verdictEl.classList.add(isFake ? 'verdict--fake' : 'verdict--real');
    }

    /* Verdict icon */
    const iconEl = document.getElementById('verdict-icon');
    if (iconEl) {
      iconEl.textContent = isFake ? '⚠' : '✓';
    }

    /* Verdict word */
    const wordEl = document.getElementById('verdict-word');
    if (wordEl) {
      wordEl.textContent = isFake ? 'FAKE' : 'REAL';
    }

    /* Confidence percentage */
    const pctEl = document.getElementById('verdict-pct');
    if (pctEl) {
      pctEl.textContent = confidence + '% confident';
    }

    /* Confidence bar — animate after short delay */
    const barFill = document.getElementById('verdict-bar-fill');
    if (barFill) {
      barFill.style.width = '0%';
      setTimeout(() => {
        barFill.classList.add('animate');
        barFill.style.width = confidence + '%';
      }, 300);
    }

    /* Original image */
    const origEl = document.getElementById('result-original');
    if (origEl) {
      const previewImg = document.getElementById('preview-img');
      const previewVid = document.getElementById('preview-video');
      if (type === 'image' && previewImg) {
        origEl.src = previewImg.src;
        origEl.alt = 'Original uploaded image';
      } else if (type === 'video' && previewVid) {
        /* For video show first frame via canvas */
        try {
          const canvas = document.createElement('canvas');
          canvas.width  = previewVid.videoWidth  || 320;
          canvas.height = previewVid.videoHeight || 240;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(previewVid, 0, 0);
          origEl.src = canvas.toDataURL('image/jpeg');
        } catch (e) {
          origEl.src = '';
        }
        origEl.alt = 'Video frame';
      }
    }

    /* Heatmap */
    const heatmapEl = document.getElementById('result-heatmap');
    if (heatmapEl) {
      if (data.heatmap_base64) {
        heatmapEl.src = data.heatmap_base64;
        heatmapEl.alt = 'Grad-CAM heatmap analysis';
      } else {
        /* No heatmap — show placeholder */
        heatmapEl.alt = 'Heatmap not available';
        heatmapEl.style.opacity = '0.3';
      }
    }

    /* Plain English sentence */
    const plainEl = document.getElementById('result-plain');
    if (plainEl) {
      if (isFake) {
        plainEl.textContent = data.plain_text ||
          'AI manipulation detected at the facial boundary — ' +
          'the hairline and jaw regions show unnatural edge patterns ' +
          'inconsistent with real photographic capture.';
      } else {
        plainEl.textContent = data.plain_text ||
          'No signs of AI manipulation detected. Boundary regions, ' +
          'sensor noise patterns and metadata all appear consistent ' +
          'with a real, unaltered photograph.';
      }
    }

    /* Pass data to result.js for detailed signal rendering */
    if (window.DeepTraceResult && window.DeepTraceResult.renderSignals) {
      window.DeepTraceResult.renderSignals(data, isFake, type);
    }
  }


  /* ================================================================
     SCREEN VIGNETTE — red edges flash for FAKE
  ================================================================ */
  function showVignette() {
    /* Remove existing */
    if (vignetteEl) vignetteEl.remove();

    vignetteEl = document.createElement('div');
    vignetteEl.className = 'screen-vignette';
    document.body.appendChild(vignetteEl);

    /* Trigger animation */
    requestAnimationFrame(() => {
      vignetteEl.classList.add('active');
    });

    /* Auto-remove after animation */
    setTimeout(() => {
      if (vignetteEl) {
        vignetteEl.style.opacity = '0';
        vignetteEl.style.transition = 'opacity 1s ease';
        setTimeout(() => {
          if (vignetteEl && vignetteEl.parentElement) {
            vignetteEl.remove();
            vignetteEl = null;
          }
        }, 1000);
      }
    }, 2000);
  }


  /* ================================================================
     CONFETTI — elegant rain for REAL result
  ================================================================ */
  const CONFETTI_COLORS = [
    '#00d4ff', /* cyan — brand color */
    '#00ff88', /* green — real/success */
    '#ffffff', /* white */
    '#00aacc', /* cyan dim */
    '#00cc66', /* green dim */
    '#aaffee', /* light teal */
  ];

  function createConfettiPiece() {
    return {
      x      : Math.random() * window.innerWidth,
      y      : -10,
      size   : Math.random() * 6 + 3,
      color  : CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      speed  : Math.random() * 2 + 1,
      drift  : Math.random() * 2 - 1,
      rotation: Math.random() * 360,
      rotSpeed: Math.random() * 4 - 2,
      opacity: Math.random() * 0.5 + 0.5,
      shape  : Math.random() > 0.5 ? 'rect' : 'circle'
    };
  }

  function startConfetti() {
    /* Create canvas overlay */
    if (confettiCanvas) confettiCanvas.remove();
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'confetti-canvas active';
    confettiCanvas.width     = window.innerWidth;
    confettiCanvas.height    = window.innerHeight;
    document.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext('2d');

    /* Create initial pieces */
    confettiPieces = [];
    for (let i = 0; i < 80; i++) {
      const piece = createConfettiPiece();
      /* Stagger starting positions vertically */
      piece.y = Math.random() * -window.innerHeight;
      confettiPieces.push(piece);
    }

    animateConfetti();

    /* Stop after 4 seconds — elegant not overwhelming */
    setTimeout(() => stopConfetti(), 4000);
  }

  function animateConfetti() {
    if (!confettiCtx || !confettiCanvas) return;

    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiPieces.forEach((p, i) => {
      /* Update position */
      p.y        += p.speed;
      p.x        += p.drift;
      p.rotation += p.rotSpeed;

      /* Remove pieces that fall off screen */
      if (p.y > confettiCanvas.height + 20) {
        confettiPieces[i] = createConfettiPiece();
        return;
      }

      /* Draw */
      confettiCtx.save();
      confettiCtx.globalAlpha = p.opacity;
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;

      if (p.shape === 'rect') {
        confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        confettiCtx.beginPath();
        confettiCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        confettiCtx.fill();
      }

      confettiCtx.restore();
    });

    confettiAnimId = requestAnimationFrame(animateConfetti);
  }

  function stopConfetti() {
    if (confettiAnimId) {
      cancelAnimationFrame(confettiAnimId);
      confettiAnimId = null;
    }
    if (confettiCanvas) {
      confettiCanvas.style.opacity    = '0';
      confettiCanvas.style.transition = 'opacity 1s ease';
      setTimeout(() => {
        if (confettiCanvas && confettiCanvas.parentElement) {
          confettiCanvas.remove();
          confettiCanvas = null;
          confettiCtx    = null;
        }
      }, 1000);
    }
  }


  /* ================================================================
     PARTICLE BURST — green dots burst from verdict badge on REAL
  ================================================================ */
  function particleBurst() {
    const verdictEl = document.getElementById('result-verdict');
    if (!verdictEl) return;

    const rect    = verdictEl.getBoundingClientRect();
    const centerX = rect.left + rect.width  / 2;
    const centerY = rect.top  + rect.height / 2;
    const count   = 12;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--color-real);
        pointer-events: none;
        z-index: 200;
        transform: translate(-50%, -50%);
      `;
      document.body.appendChild(particle);

      /* Random direction */
      const angle    = (i / count) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      const tx       = Math.cos(angle) * distance;
      const ty       = Math.sin(angle) * distance;

      /* Animate */
      particle.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`,
          opacity: 0 }
      ], {
        duration: 600,
        easing  : 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill    : 'forwards'
      }).onfinish = () => particle.remove();
    }
  }


  /* ================================================================
     SCROLL TO RESULT
  ================================================================ */
  function scrollToResult() {
    setTimeout(() => {
      const uploadPanel = document.getElementById('upload-panel');
      if (!uploadPanel) return;
      const navbar  = document.getElementById('navbar');
      const navbarH = navbar ? navbar.offsetHeight : 64;
      const targetY = uploadPanel.getBoundingClientRect().top
                      + window.pageYOffset - navbarH - 20;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }, 200);
  }


  /* ================================================================
     RESET — called by main.js "Analyse Another" button
  ================================================================ */
  function reset() {
    /* Stop confetti */
    stopConfetti();

    /* Remove vignette */
    if (vignetteEl) {
      vignetteEl.remove();
      vignetteEl = null;
    }

    /* Clean up result panel */
    const resultPanel = document.getElementById('state-result');
    if (resultPanel) {
      resultPanel.classList.remove('state--fake', 'state--real');
    }

    const panelVignette = document.getElementById('result-vignette');
    if (panelVignette) panelVignette.classList.remove('active');

    /* Reset confidence number colour */
    const confNumber = document.getElementById('conf-number');
    if (confNumber) {
      confNumber.style.color     = '';
      confNumber.style.transform = '';
      confNumber.textContent     = '—';
    }

    /* Reset verdict bar */
    const barFill = document.getElementById('verdict-bar-fill');
    if (barFill) {
      barFill.style.width = '0%';
      barFill.classList.remove('animate');
    }
  }

})();
