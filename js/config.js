/* ================================================================
   DeepTrace — config.js
   THE ONLY FILE YOU CHANGE TO SWITCH ENVIRONMENTS.

   Step 1 — Local development (backend on your laptop):
     API_BASE_URL : 'https://ridden-june-scored.ngrok-free.dev'

   Step 2 — HuggingFace hosted (after Week 3 deploy):
     API_BASE_URL : 'https://ridden-june-scored.ngrok-free.dev'

   MOCK_MODE in api.js must be set to false when using real backend.
   ================================================================ */

window.DEEPTRACE_CONFIG = {
  API_BASE_URL : 'https://ridden-june-scored.ngrok-free.dev',
  TIMEOUT_MS   : 120000   /* 2 minutes — videos take longer */
};
