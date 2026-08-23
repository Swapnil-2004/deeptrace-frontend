/* ================================================================
   DeepTrace — result.js
   Renders the detailed forensic analysis result.
   Handles:
   - Signal cards (EfficientNet, ViT, BTD, Metadata)
   - BTD flags list
   - Video frame score chart
   - Temporal BTD details
   - Processing time
   - Expert panel content
   ================================================================ */

(function () {
  'use strict';

  /* Expose renderSignals so reveal.js can call it */
  window.DeepTraceResult = { renderSignals };


  /* ================================================================
     MAIN RENDER FUNCTION
     Called by reveal.js after result panel is shown.
  ================================================================ */
  function renderSignals(data, isFake, type) {
    renderSignalCards(data, isFake);
    renderBTDFlags(data);
    renderProcessingTime(data);

    if (type === 'video') {
      renderVideoExtras(data);
    }
  }


  /* ================================================================
     SIGNAL CARDS
     4 cards: EfficientNet, ViT, BTD, Metadata
  ================================================================ */
  function renderSignalCards(data, isFake) {
    const container = document.getElementById('signal-cards');
    if (!container) return;

    const signals = data.signals || {};

    const cards = [
      {
        name  : 'EfficientNet-B4',
        score : signals.effnet_score,
        label : signals.effnet_label || (signals.effnet_score >= 0.5 ? 'Fake' : 'Real'),
        desc  : 'Deepfake specialist model'
      },
      {
        name  : 'ViT Detector',
        score : signals.vit_score,
        label : signals.vit_label || (signals.vit_score >= 0.5 ? 'Fake' : 'Real'),
        desc  : 'AI image specialist model'
      },
      {
        name  : 'BTD Forensics',
        score : signals.btd_score,
        label : signals.btd_score >= 0.5 ? 'Fake' : 'Real',
        desc  : 'Boundary-Topology Detector'
      },
      {
        name  : 'Metadata',
        score : signals.meta_score,
        label : signals.meta_score >= 0.3 ? 'Suspicious' : 'Clean',
        desc  : 'EXIF & file analysis'
      }
    ];

    container.innerHTML = '';

    cards.forEach((card, i) => {
      const scoreVal  = card.score !== undefined ? card.score : 0;
      const scorePct  = Math.round(scoreVal * 100);
      const isFakeCard= card.label === 'Fake' || card.label === 'Suspicious';

      /* Determine bar colour */
      let fillClass = 'fill--real';
      if (card.label === 'Fake')      fillClass = 'fill--fake';
      if (card.label === 'Suspicious')fillClass = 'fill--warn';

      const el = document.createElement('div');
      el.className = 'signal-card' + (isFakeCard ? ' card--fake' : '');
      el.innerHTML = `
        <div class="signal-card-name">${card.name}</div>
        <div class="signal-card-score">${scoreVal.toFixed(3)}</div>
        <div class="signal-card-tag ${isFakeCard ? 'tag--fake' : 'tag--real'}">
          ${card.label}
        </div>
        <div class="signal-bar-wrap">
          <div class="signal-bar-fill ${fillClass}"
               style="width:0%"
               data-target="${scorePct}">
          </div>
        </div>
        <div class="signal-card-desc" style="
          font-size:0.65rem;
          color:var(--text-faint);
          font-family:var(--font-mono);
          margin-top:2px;">
          ${card.desc}
        </div>
      `;

      container.appendChild(el);

      /* Animate bar fill with stagger */
      setTimeout(() => {
        const bar = el.querySelector('.signal-bar-fill');
        if (bar) bar.style.width = scorePct + '%';
      }, 200 + i * 120);
    });
  }


  /* ================================================================
     BTD FLAGS LIST
     Human-readable list of forensic signals that fired.
  ================================================================ */
  function renderBTDFlags(data) {
    const container = document.getElementById('btd-flags');
    if (!container) return;

    const signals  = data.signals || {};
    const btdFlags = signals.btd_flags  || [];
    const metaFlags= signals.meta_flags || [];
    const allFlags = [...btdFlags, ...metaFlags];

    container.innerHTML = '';

    if (allFlags.length === 0) {
      const li = document.createElement('li');
      li.style.cssText = `
        font-size:0.8rem;
        color:var(--color-real);
        padding:var(--sp-2) var(--sp-3);
        background:var(--color-real-bg);
        border-radius:var(--radius-sm);
        border-left:2px solid var(--color-real);
      `;
      li.textContent = 'No forensic anomalies detected — all signals within normal range.';
      container.appendChild(li);
      return;
    }

    allFlags.forEach((flag, i) => {
      const li = document.createElement('li');
      li.style.opacity   = '0';
      li.style.transform = 'translateX(-8px)';
      li.style.transition= `opacity 0.3s ease ${i * 80}ms,
                             transform 0.3s ease ${i * 80}ms`;
      li.textContent = flag;
      container.appendChild(li);

      /* Trigger animation */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          li.style.opacity   = '1';
          li.style.transform = 'translateX(0)';
        });
      });
    });
  }


  /* ================================================================
     PROCESSING TIME
  ================================================================ */
  function renderProcessingTime(data) {
    const el = document.getElementById('processing-time');
    if (!el) return;

    const ms = data.processing_time_ms;
    if (!ms) { el.textContent = ''; return; }

    const seconds = (ms / 1000).toFixed(1);
    el.textContent = `Processed in ${seconds}s`;
  }


  /* ================================================================
     VIDEO EXTRAS — frame chart + temporal BTD details
  ================================================================ */
  function renderVideoExtras(data) {
    renderFrameChart(data.per_frame_scores || []);
    renderTemporalBTD(data.temporal_btd || {});
  }


  /* ================================================================
     FRAME SCORE CHART
     Simple canvas line chart showing per-frame scores.
     Red zone above 0.5 threshold.
  ================================================================ */
  function renderFrameChart(scores) {
    /* Find or create frame chart section */
    let chartSection = document.getElementById('frame-chart-wrap');
    if (!chartSection) {
      chartSection = document.createElement('div');
      chartSection.id        = 'frame-chart-wrap';
      chartSection.className = 'frame-chart-section';
      chartSection.innerHTML = `
        <div class="frame-chart-label">Per-Frame Fake Score</div>
        <canvas id="frame-chart-canvas" height="80"></canvas>
      `;
      /* Insert before expert toggle */
      const expertToggle = document.getElementById('expert-toggle');
      if (expertToggle && expertToggle.parentElement) {
        expertToggle.parentElement.insertBefore(chartSection, expertToggle);
      }
    }

    const canvas = document.getElementById('frame-chart-canvas');
    if (!canvas || scores.length === 0) return;

    const ctx    = canvas.getContext('2d');
    const W      = canvas.offsetWidth || 300;
    const H      = 80;
    canvas.width = W;

    ctx.clearRect(0, 0, W, H);

    const padding = { top: 8, bottom: 20, left: 8, right: 8 };
    const chartW  = W - padding.left - padding.right;
    const chartH  = H - padding.top  - padding.bottom;

    /* Red danger zone above 0.5 */
    const thresholdY = padding.top + chartH * (1 - 0.5);
    ctx.fillStyle    = 'rgba(255,68,68,0.06)';
    ctx.fillRect(padding.left, padding.top, chartW, thresholdY - padding.top);

    /* Threshold line */
    ctx.strokeStyle = 'rgba(255,68,68,0.25)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, thresholdY);
    ctx.lineTo(padding.left + chartW, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    /* Score line */
    ctx.strokeStyle = 'var(--accent)';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();

    scores.forEach((score, i) => {
      const x = padding.left + (i / (scores.length - 1)) * chartW;
      const y = padding.top  + chartH * (1 - Math.min(1, Math.max(0, score)));
      if (i === 0) ctx.moveTo(x, y);
      else         ctx.lineTo(x, y);
    });
    ctx.stroke();

    /* Dots on high-score frames */
    scores.forEach((score, i) => {
      if (score >= 0.5) {
        const x = padding.left + (i / (scores.length - 1)) * chartW;
        const y = padding.top  + chartH * (1 - Math.min(1, Math.max(0, score)));
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'var(--color-fake)';
        ctx.fill();
      }
    });

    /* X axis labels */
    ctx.fillStyle  = 'var(--text-faint)';
    ctx.font       = '9px JetBrains Mono, monospace';
    ctx.textAlign  = 'center';
    ctx.fillText('Frame 1', padding.left, H - 4);
    ctx.fillText('Frame ' + scores.length,
                 padding.left + chartW, H - 4);

    /* Threshold label */
    ctx.textAlign  = 'right';
    ctx.fillStyle  = 'rgba(255,68,68,0.5)';
    ctx.fillText('0.5', padding.left + chartW, thresholdY - 3);
  }


  /* ================================================================
     TEMPORAL BTD DETAILS
     Shows temporal score and flags in expert panel.
  ================================================================ */
  function renderTemporalBTD(temporal) {
    /* Find or create temporal section inside expert panel */
    let tempSection = document.getElementById('temporal-result-section');
    if (!tempSection) {
      tempSection = document.createElement('div');
      tempSection.id        = 'temporal-result-section';
      tempSection.className = 'temporal-result';
      tempSection.innerHTML = `
        <div class="temporal-result-label">Temporal BTD Score</div>
        <div class="temporal-result-value" id="temporal-score-val">—</div>
        <div class="temporal-flags" id="temporal-flags-list"></div>
      `;
      const expertPanel = document.getElementById('expert-panel');
      if (expertPanel) expertPanel.appendChild(tempSection);
    }

    const scoreEl = document.getElementById('temporal-score-val');
    const flagsEl = document.getElementById('temporal-flags-list');

    if (scoreEl) {
      const score = temporal.score !== undefined
                    ? (temporal.score * 100).toFixed(1) + '%'
                    : '—';
      scoreEl.textContent = score;
    }

    if (flagsEl && temporal.flags && temporal.flags.length > 0) {
      flagsEl.innerHTML = '';
      temporal.flags.forEach(flag => {
        const el = document.createElement('div');
        el.className   = 'temporal-flag';
        el.textContent = flag;
        flagsEl.appendChild(el);
      });
    }
  }

})();
