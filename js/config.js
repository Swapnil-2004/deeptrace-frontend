/* ================================================================
   DeepTrace — config.js
   THE ONLY FILE YOU CHANGE TO SWITCH ENVIRONMENTS.

   Step 1 — Local development (backend on your laptop):
     API_BASE_URL : 'http://localhost:8000'

   Step 2 — Production (Render-hosted backend):
     API_BASE_URL : 'https://deeptrace-backend-5nsv.onrender.com'

   MOCK_MODE in api.js must be set to false when using real backend.
   ================================================================ */

window.DEEPTRACE_CONFIG = {
  API_BASE_URL : 'https://deeptrace-backend-5nsv.onrender.com',
  TIMEOUT_MS   : 180000   /* 3 minutes — Render free-tier CPU is slow, plus cold start */
};
