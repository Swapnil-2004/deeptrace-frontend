/* ================================================================
   DeepTrace — api.js
   All communication with the DeepTrace backend.
   Handles:
   - Image analysis API call
   - Video analysis API call
   - Health check
   - Timeout handling (videos take longer)
   - Proper error messages for all failure types
   - Mock mode for testing without backend
   ================================================================ */

(function () {
  'use strict';

  /* ================================================================
     CONFIG — imported from config.js
  ================================================================ */
  const BASE_URL = window.DEEPTRACE_CONFIG?.API_BASE_URL || 'http://localhost:8000';
  const TIMEOUT_MS = window.DEEPTRACE_CONFIG?.TIMEOUT_MS || 120000;

  /* ================================================================
     MOCK MODE
     Set MOCK_MODE = true to test the full UI without a backend.
     Returns realistic fake data so you can see all states working.
     Set to false when real backend is ready.
  ================================================================ */
  // const MOCK_MODE = true;
  const MOCK_MODE = false;

  /* ================================================================
     FETCH WITH TIMEOUT
     Browser fetch() has no built-in timeout.
     This wraps it with an AbortController timeout.
  ================================================================ */
  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(
          'Analysis timed out. Please try a smaller file or check your connection.'
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }


  /* ================================================================
     ERROR HANDLER
     Converts technical errors into user-friendly messages.
  ================================================================ */
  function handleError(err, type) {
    console.error('DeepTrace API error:', err);

    if (err.message.includes('timed out')) {
      throw new Error(err.message);
    }
    if (err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError') ||
      err.message.includes('net::')) {
      throw new Error(
        'Cannot connect to DeepTrace server. ' +
        'Please make sure the backend is running.'
      );
    }
    if (err.message.includes('413')) {
      const maxSize = type === 'image' ? '10MB' : '50MB';
      throw new Error(`File too large. Maximum size is ${maxSize}.`);
    }
    if (err.message.includes('400')) {
      throw new Error('Invalid file. Please upload a supported format.');
    }
    if (err.message.includes('500')) {
      throw new Error('Server error during analysis. Please try again.');
    }

    throw new Error(err.message || 'Analysis failed. Please try again.');
  }


  /* ================================================================
     MOCK DATA — realistic fake responses for UI testing
  ================================================================ */
  function getMockImageResponse(isFake) {
    /* Randomly decide fake or real if not specified */
    if (isFake === undefined) isFake = Math.random() > 0.4;

    return {
      prediction: isFake ? 'Fake' : 'Real',
      confidence: isFake
        ? Math.round(75 + Math.random() * 20)
        : Math.round(70 + Math.random() * 25),
      final_score: isFake
        ? 0.75 + Math.random() * 0.20
        : 0.10 + Math.random() * 0.30,
      face_found: true,
      /* Simple gradient heatmap placeholder */
      heatmap_base64: generateMockHeatmap(),
      signals: {
        effnet_score: isFake ? 0.812 : 0.182,
        effnet_label: isFake ? 'Fake' : 'Real',
        vit_score: isFake ? 0.791 : 0.143,
        vit_label: isFake ? 'Fake' : 'Real',
        btd_score: isFake ? 0.681 : 0.112,
        btd_flags: isFake ? [
          'Near-perfect face oval shape — AI faces fit a smooth polynomial curve',
          'Missing chromatic aberration — real camera lenses always produce colour fringing',
          'Very low sensor noise (0.998) — impossible in real photographic capture',
          'Boundary gradient mismatch at hairline — abrupt edge inconsistent with real hair'
        ] : [
          'Natural facial asymmetry detected — consistent with real face',
          'Chromatic aberration present — consistent with real lens optics'
        ],
        meta_score: isFake ? 0.200 : 0.050,
        meta_flags: isFake
          ? ['No EXIF camera data found', 'PNG generation chunk detected']
          : ['EXIF data present — Canon EOS R6']
      },
      processing_time_ms: Math.round(800 + Math.random() * 1200)
    };
  }

  function getMockVideoResponse() {
    const isFake = Math.random() > 0.4;
    const frames = Array.from({ length: 30 }, () =>
      isFake
        ? 0.55 + Math.random() * 0.35
        : 0.10 + Math.random() * 0.25
    );

    return {
      prediction: isFake ? 'Fake' : 'Real',
      confidence: isFake
        ? Math.round(78 + Math.random() * 18)
        : Math.round(72 + Math.random() * 22),
      final_score: isFake ? 0.78 + Math.random() * 0.18 : 0.12 + Math.random() * 0.28,
      video_info: {
        fps: 30,
        total_frames: 450,
        frames_analysed: 30,
        duration_sec: 15.0
      },
      per_frame_scores: frames,
      temporal_btd: {
        score: isFake ? 0.74 : 0.11,
        boundary_too_stable: isFake,
        flow_mismatch_detected: isFake,
        flags: isFake ? [
          'Boundary curvature unnaturally stable across frames',
          'Face boundary motion does not match surrounding optical flow'
        ] : []
      },
      flow_score: isFake ? 0.31 : 0.82,
      consistency_score: isFake ? 0.18 : 0.89,
      fake_frame_ratio: isFake ? 0.87 : 0.07,
      all_flags: isFake ? [
        'Temporal BTD: boundary too stable',
        'Flow mismatch detected'
      ] : [],
      heatmap_base64: generateMockHeatmap(),
      signals: {
        effnet_score: isFake ? 0.791 : 0.162,
        effnet_label: isFake ? 'Fake' : 'Real',
        vit_score: isFake ? 0.743 : 0.131,
        vit_label: isFake ? 'Fake' : 'Real',
        btd_score: isFake ? 0.712 : 0.092,
        btd_flags: isFake ? [
          'Boundary curvature unnaturally stable — AI generation loop detected',
          'Optical flow mismatch at facial boundary'
        ] : [],
        meta_score: 0.100,
        meta_flags: []
      },
      processing_time_ms: Math.round(3000 + Math.random() * 5000)
    };
  }

  /* Generate a simple canvas-based heatmap placeholder */
  function generateMockHeatmap() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');

      /* Dark background */
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, 224, 224);

      /* Face oval */
      ctx.beginPath();
      ctx.ellipse(112, 112, 70, 90, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
      ctx.fill();

      /* Hotspot at hairline — top of face */
      const topGrad = ctx.createRadialGradient(112, 40, 0, 112, 40, 50);
      topGrad.addColorStop(0, 'rgba(255, 68, 68, 0.9)');
      topGrad.addColorStop(0.5, 'rgba(255, 140, 0, 0.5)');
      topGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = topGrad;
      ctx.fillRect(62, 0, 100, 80);

      /* Hotspot at jaw — bottom of face */
      const jawGrad = ctx.createRadialGradient(112, 185, 0, 112, 185, 45);
      jawGrad.addColorStop(0, 'rgba(255, 68, 68, 0.8)');
      jawGrad.addColorStop(0.6, 'rgba(255, 140, 0, 0.4)');
      jawGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = jawGrad;
      ctx.fillRect(72, 155, 80, 60);

      /* Mild hotspot on left ear boundary */
      const earGrad = ctx.createRadialGradient(45, 112, 0, 45, 112, 30);
      earGrad.addColorStop(0, 'rgba(255, 200, 0, 0.6)');
      earGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = earGrad;
      ctx.fillRect(20, 85, 55, 55);

      return canvas.toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }


  /* ================================================================
     SIMULATE DELAY — makes mock feel realistic
  ================================================================ */
  function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  /* ================================================================
     ANALYSE IMAGE — main public function
  ================================================================ */
  async function analyseImage(file) {
    /* MOCK MODE — return fake data after delay */
    if (MOCK_MODE) {
      await simulateDelay(3000 + Math.random() * 2000);
      return getMockImageResponse();
    }

    /* REAL MODE — call backend */
    const formData = new FormData();
    formData.append('file', file);

    let response;
    try {
      response = await fetchWithTimeout(
        BASE_URL + '/analyse/image',
        { method: 'POST', body: formData },
        TIMEOUT_MS
      );
    } catch (err) {
      handleError(err, 'image');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      handleError(
        new Error(errData.error || 'Server error ' + response.status),
        'image'
      );
    }

    return response.json();
  }


  /* ================================================================
     ANALYSE VIDEO — main public function
  ================================================================ */
  async function analyseVideo(file) {
    /* MOCK MODE */
    if (MOCK_MODE) {
      await simulateDelay(6000 + Math.random() * 4000);
      return getMockVideoResponse();
    }

    /* REAL MODE */
    const formData = new FormData();
    formData.append('file', file);

    let response;
    try {
      response = await fetchWithTimeout(
        BASE_URL + '/analyse/video',
        { method: 'POST', body: formData },
        TIMEOUT_MS
      );
    } catch (err) {
      handleError(err, 'video');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      handleError(
        new Error(errData.error || 'Server error ' + response.status),
        'video'
      );
    }

    return response.json();
  }


  /* ================================================================
     HEALTH CHECK — ping backend to see if it is alive
  ================================================================ */
  async function checkHealth() {
    if (MOCK_MODE) return { status: 'ok', gpu: true, models_loaded: true };

    try {
      const response = await fetchWithTimeout(
        BASE_URL + '/health',
        { method: 'GET' },
        5000
      );
      if (!response.ok) return { status: 'error' };
      return response.json();
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }


  /* ================================================================
     EXPOSE GLOBALLY
  ================================================================ */
  window.DeepTraceAPI = {
    analyseImage,
    analyseVideo,
    checkHealth,
    isMockMode: () => MOCK_MODE
  };

})();
