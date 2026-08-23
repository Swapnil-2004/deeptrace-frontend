/* ================================================================
   DeepTrace — main.js
   Page initialisation, scroll effects, mobile menu,
   scroll indicator, pipeline animation, section reveals.
   Runs first — sets up everything before other JS files load.
   ================================================================ */

(function () {
  'use strict';

  /* ================================================================
     ELEMENTS
  ================================================================ */
  const navbar          = document.getElementById('navbar');
  const scrollIndicator = document.getElementById('scroll-indicator');
  const heroSection     = document.getElementById('hero');
  const mobileBtn       = document.getElementById('nav-mobile-btn');
  const mobileMenu      = document.getElementById('nav-mobile-menu');
  const pipelineSteps   = document.querySelectorAll('.pipeline-step');
  const pipelineArrows  = document.querySelectorAll('.pipeline-arrow');
  const revealEls       = document.querySelectorAll('.reveal');
  const navLinks        = document.querySelectorAll('.nav-links a, .nav-mobile-menu a');


  /* ================================================================
     NAVBAR — scroll effect
     Adds .scrolled class when user scrolls down 40px.
     Makes background more opaque and border brighter.
  ================================================================ */
  function handleNavbarScroll() {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }


  /* ================================================================
     SCROLL INDICATOR — hide when hero is scrolled past
  ================================================================ */
  function handleScrollIndicator() {
    if (!scrollIndicator || !heroSection) return;
    const heroBottom = heroSection.getBoundingClientRect().bottom;
    if (heroBottom < 100) {
      scrollIndicator.classList.add('hidden');
    } else {
      scrollIndicator.classList.remove('hidden');
    }
  }


  /* ================================================================
     MOBILE MENU — hamburger toggle
  ================================================================ */
  function toggleMobileMenu() {
    const isOpen = mobileBtn.classList.toggle('open');
    mobileBtn.setAttribute('aria-expanded', isOpen);
    mobileMenu.hidden = !isOpen;
  }

  function closeMobileMenu() {
    mobileBtn.classList.remove('open');
    mobileBtn.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
  }

  if (mobileBtn) {
    mobileBtn.addEventListener('click', toggleMobileMenu);
  }

  /* Close mobile menu when any nav link is clicked */
  navLinks.forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  /* Close mobile menu when clicking outside */
  document.addEventListener('click', (e) => {
    if (mobileMenu && !mobileMenu.hidden) {
      if (!navbar.contains(e.target)) {
        closeMobileMenu();
      }
    }
  });


  /* ================================================================
     INTERSECTION OBSERVER — Section reveals + Pipeline animation
     Watches elements and adds .visible class when they scroll
     into view. CSS animations then trigger on .visible.
  ================================================================ */

  /* General reveal observer */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          /* Unobserve after revealing — no need to watch again */
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  revealEls.forEach(el => revealObserver.observe(el));

  /* Pipeline steps observer — animates each step in sequence */
  const pipelineObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          /* Stagger each step with delay */
          pipelineSteps.forEach((step, i) => {
            setTimeout(() => {
              step.classList.add('visible');
            }, i * 130);
          });
          /* Arrows appear slightly after their preceding step */
          pipelineArrows.forEach((arrow, i) => {
            setTimeout(() => {
              arrow.classList.add('visible');
            }, i * 130 + 80);
          });
          pipelineObserver.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );

  /* Observe the pipeline section */
  const pipelineSection = document.getElementById('pipeline');
  if (pipelineSection) {
    pipelineObserver.observe(pipelineSection);
  }


  /* ================================================================
     HOW-STEPS reveal — stagger the 3 cards
  ================================================================ */
  const howSteps = document.querySelectorAll('.how-step');
  const howObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          howSteps.forEach((step, i) => {
            setTimeout(() => {
              step.style.opacity    = '1';
              step.style.transform  = 'translateY(0)';
            }, i * 120);
          });
          howObserver.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );

  /* Set initial state for how-steps */
  howSteps.forEach(step => {
    step.style.opacity   = '0';
    step.style.transform = 'translateY(20px)';
    step.style.transition= 'opacity 0.5s ease, transform 0.5s ease';
  });

  const howSection = document.getElementById('how-it-works');
  if (howSection) howObserver.observe(howSection);


  /* ================================================================
     PIPELINE CARDS reveal — stagger the 3 cards
  ================================================================ */
  const pipelineCards = document.querySelectorAll('.pipeline-card');
  const cardsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          pipelineCards.forEach((card, i) => {
            setTimeout(() => {
              card.style.opacity   = '1';
              card.style.transform = 'translateY(0)';
            }, i * 120);
          });
          cardsObserver.disconnect();
        }
      });
    },
    { threshold: 0.15 }
  );

  pipelineCards.forEach(card => {
    card.style.opacity   = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition= 'opacity 0.5s ease, transform 0.5s ease';
  });

  if (pipelineSection) cardsObserver.observe(pipelineSection);


  /* ================================================================
     SMOOTH SCROLL — for navbar links
     Offsets scroll position to account for fixed navbar height.
  ================================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navbarH = navbar ? navbar.offsetHeight : 64;
      const targetY = target.getBoundingClientRect().top
                      + window.pageYOffset
                      - navbarH;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });


  /* ================================================================
     SCROLL EVENT — combines all scroll handlers
     Using passive: true for better performance.
  ================================================================ */
  function onScroll() {
    handleNavbarScroll();
    handleScrollIndicator();
  }

  window.addEventListener('scroll', onScroll, { passive: true });


  /* ================================================================
     EXPERT PANEL TOGGLE — result section
     Expands/collapses the detailed forensic signals panel.
  ================================================================ */
  const expertToggle = document.getElementById('expert-toggle');
  const expertPanel  = document.getElementById('expert-panel');

  if (expertToggle && expertPanel) {
    expertToggle.addEventListener('click', () => {
      const isOpen = expertToggle.getAttribute('aria-expanded') === 'true';
      expertToggle.setAttribute('aria-expanded', !isOpen);
      expertPanel.hidden = isOpen;
    });
  }


  /* ================================================================
     ANALYSE ANOTHER — reset to idle state
     Called when user clicks "Analyse Another File" in result panel.
  ================================================================ */
  const analyseAnotherBtn = document.getElementById('analyse-another-btn');
  if (analyseAnotherBtn) {
    analyseAnotherBtn.addEventListener('click', () => {
      /* Show idle state, hide result state */
      showState('idle');

      /* Reset upload */
      if (window.DeepTraceUpload && window.DeepTraceUpload.reset) {
        window.DeepTraceUpload.reset();
      }

      /* Remove reveal effects */
      if (window.DeepTraceReveal && window.DeepTraceReveal.reset) {
        window.DeepTraceReveal.reset();
      }

      /* ── Reset expert panel completely ── */
      const expertToggle = document.getElementById('expert-toggle');
      const expertPanel  = document.getElementById('expert-panel');
      if (expertToggle) expertToggle.setAttribute('aria-expanded', 'false');
      if (expertPanel)  expertPanel.hidden = true;

      /* Clear signal cards */
      const signalCards = document.getElementById('signal-cards');
      if (signalCards) signalCards.innerHTML = '';

      /* Clear BTD flags */
      const btdFlags = document.getElementById('btd-flags');
      if (btdFlags) btdFlags.innerHTML = '';

      /* Clear processing time */
      const procTime = document.getElementById('processing-time');
      if (procTime) procTime.textContent = '';

      /* Clear frame chart if exists */
      const frameChart = document.getElementById('frame-chart-wrap');
      if (frameChart) frameChart.remove();

      /* Clear temporal section if exists */
      const tempSection = document.getElementById('temporal-result-section');
      if (tempSection) tempSection.remove();

      /* Clear result images */
      const origImg   = document.getElementById('result-original');
      const heatmapImg= document.getElementById('result-heatmap');
      if (origImg)    origImg.src    = '';
      if (heatmapImg) heatmapImg.src = '';

      /* Clear verdict */
      const verdictWord = document.getElementById('verdict-word');
      const verdictPct  = document.getElementById('verdict-pct');
      const verdictEl   = document.getElementById('result-verdict');
      if (verdictWord) verdictWord.textContent = '—';
      if (verdictPct)  verdictPct.textContent  = '—';
      if (verdictEl) {
        verdictEl.classList.remove('verdict--fake', 'verdict--real');
      }

      /* Clear plain text */
      const plainEl = document.getElementById('result-plain');
      if (plainEl) plainEl.textContent = '';

      /* Clear filename */
      const filenameEl = document.getElementById('result-filename');
      if (filenameEl) filenameEl.textContent = '';

      /* Scroll back to upload panel */
      const uploadPanel = document.getElementById('upload-panel');
      if (uploadPanel) {
        const navbarH = navbar ? navbar.offsetHeight : 64;
        const targetY = uploadPanel.getBoundingClientRect().top
                        + window.pageYOffset - navbarH - 20;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    });
  }


  /* ================================================================
     STATE MANAGER — controls which tool panel state is visible
     States: 'idle' | 'scanner' | 'result'
     Used by upload.js, scanner.js, reveal.js, result.js
  ================================================================ */
  function showState(state) {
    const stateIdle    = document.getElementById('state-idle');
    const stateScanner = document.getElementById('state-scanner');
    const stateResult  = document.getElementById('state-result');

    if (!stateIdle || !stateScanner || !stateResult) return;

    stateIdle.hidden    = (state !== 'idle');
    stateScanner.hidden = (state !== 'scanner');
    stateResult.hidden  = (state !== 'result');
  }

  /* Expose showState globally so other JS files can use it */
  window.DeepTraceState = { showState };


  /* ================================================================
     HEATMAP TOOLTIP — keyboard accessibility
     The tooltip trigger already works on hover via CSS.
     This adds keyboard support.
  ================================================================ */
  const tooltipTriggers = document.querySelectorAll('.heatmap-tooltip-trigger');
  tooltipTriggers.forEach(trigger => {
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') trigger.blur();
    });
  });


  /* ================================================================
     INIT — run on page load
  ================================================================ */
  function init() {
    /* Set initial navbar state */
    handleNavbarScroll();
    /* Set initial scroll indicator state */
    handleScrollIndicator();
    /* Ensure idle state is shown on load */
    showState('idle');
  }

  /* Run init when DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
