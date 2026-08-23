/* ================================================================
   DeepTrace — upload.js
   Handles everything in the upload section:
   - Tab switching (Image / Video)
   - Drag and drop file selection
   - Click to browse
   - File type and size validation
   - Preview display (using FileReader — works in Live Server)
   - Remove file button
   - Activating the Analyse button
   - Triggering the scanner via scanner.js
   ================================================================ */

(function () {
  'use strict';

  /* ================================================================
     CONFIG
  ================================================================ */
  const MAX_IMAGE_MB    = 10;
  const MAX_VIDEO_MB    = 50;
  const ACCEPTED_IMAGE  = ['.jpg', '.jpeg', '.png', '.webp'];
  const ACCEPTED_VIDEO  = ['.mp4', '.avi', '.mov', '.mkv'];


  /* ================================================================
     STATE
  ================================================================ */
  let currentTab  = 'image';
  let imageFile   = null;
  let videoFile   = null;

  /* Expose current file so scanner.js and api.js can access it */
  window.DeepTraceUpload = {
    getCurrentFile : () => currentTab === 'image' ? imageFile : videoFile,
    getCurrentTab  : () => currentTab,
    reset          : resetAll
  };


  /* ================================================================
     ELEMENTS
  ================================================================ */
  const btnImage        = document.getElementById('btn-image');
  const btnVideo        = document.getElementById('btn-video');
  const tabImage        = document.getElementById('tab-image');
  const tabVideo        = document.getElementById('tab-video');

  const dzImage         = document.getElementById('drop-zone-image');
  const dzVideo         = document.getElementById('drop-zone-video');

  const inputImage      = document.getElementById('file-input-image');
  const inputVideo      = document.getElementById('file-input-video');

  const idleImage       = document.getElementById('dz-idle-image');
  const idleVideo       = document.getElementById('dz-idle-video');

  const previewImage    = document.getElementById('dz-preview-image');
  const previewVideo    = document.getElementById('dz-preview-video');

  const previewImg      = document.getElementById('preview-img');
  const previewVid      = document.getElementById('preview-video');

  const filenameImage   = document.getElementById('dz-filename-image');
  const filenameVideo   = document.getElementById('dz-filename-video');

  const removeImageBtn  = document.getElementById('remove-image');
  const removeVideoBtn  = document.getElementById('remove-video');

  const analyseBtn      = document.getElementById('analyse-btn');


  /* ================================================================
     TAB SWITCHING
  ================================================================ */
  function switchTab(tab) {
    currentTab = tab;

    if (tab === 'image') {
      btnImage.classList.add('tab-btn--active');
      btnImage.setAttribute('aria-selected', 'true');
      btnVideo.classList.remove('tab-btn--active');
      btnVideo.setAttribute('aria-selected', 'false');
      tabImage.hidden = false;
      tabVideo.hidden = true;
    } else {
      btnVideo.classList.add('tab-btn--active');
      btnVideo.setAttribute('aria-selected', 'true');
      btnImage.classList.remove('tab-btn--active');
      btnImage.setAttribute('aria-selected', 'false');
      tabVideo.hidden = false;
      tabImage.hidden = true;
    }

    /* Update analyse button state based on current tab */
    updateAnalyseBtn();
  }

  btnImage.addEventListener('click', () => switchTab('image'));
  btnVideo.addEventListener('click', () => switchTab('video'));


  /* ================================================================
     FILE VALIDATION
     Returns { valid: true } or { valid: false, message: '...' }
  ================================================================ */
  function validateFile(file, type) {
    const accepted = type === 'image' ? ACCEPTED_IMAGE : ACCEPTED_VIDEO;
    const maxMB    = type === 'image' ? MAX_IMAGE_MB  : MAX_VIDEO_MB;
    const maxBytes = maxMB * 1024 * 1024;

    /* Check extension */
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!accepted.includes(ext)) {
      return {
        valid  : false,
        message: `Invalid file type. Accepted: ${accepted.join(', ')}`
      };
    }

    /* Check size */
    if (file.size > maxBytes) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return {
        valid  : false,
        message: `File too large (${sizeMB}MB). Maximum is ${maxMB}MB.`
      };
    }

    return { valid: true };
  }


  /* ================================================================
     SHOW ERROR
     Shakes drop zone red, shows message below it temporarily.
  ================================================================ */
  function showError(dz, message) {
    dz.classList.add('error');

    /* Remove existing error */
    const existing = dz.parentElement.querySelector('.upload-error');
    if (existing) existing.remove();

    const err = document.createElement('div');
    err.className = 'upload-error';
    err.innerHTML = `<span>⚠</span> ${message}`;
    dz.parentElement.insertBefore(err, dz.nextSibling);

    setTimeout(() => {
      dz.classList.remove('error');
      if (err.parentElement) err.remove();
    }, 3500);
  }


  /* ================================================================
     FORMAT FILE SIZE
  ================================================================ */
  function formatSize(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + 'MB';
  }


  /* ================================================================
     UPDATE ANALYSE BUTTON
     Enables only when a file is selected for current tab.
  ================================================================ */
  function updateAnalyseBtn() {
    const hasFile = currentTab === 'image' ? !!imageFile : !!videoFile;
    analyseBtn.disabled = !hasFile;
  }


  /* ================================================================
     HANDLE IMAGE FILE
     Shows preview, enables analyse button.
  ================================================================ */
  function handleImageFile(file) {
    imageFile = file;

    /* Use FileReader — works reliably in all environments */
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
    };
    reader.readAsDataURL(file);

    filenameImage.textContent = file.name + ' · ' + formatSize(file.size);
    idleImage.hidden    = true;
    previewImage.hidden = false;
    updateAnalyseBtn();
  }


  /* ================================================================
     HANDLE VIDEO FILE
  ================================================================ */
  function handleVideoFile(file) {
    videoFile = file;

    const url = URL.createObjectURL(file);
    previewVid.src = url;
    previewVid.load();

    filenameVideo.textContent = file.name + ' · ' + formatSize(file.size);
    idleVideo.hidden    = true;
    previewVideo.hidden = false;
    updateAnalyseBtn();
  }


  /* ================================================================
     PROCESS FILE
     Entry point for both drag-drop and click-to-browse.
  ================================================================ */
  function processFile(file, type) {
    const dz     = type === 'image' ? dzImage : dzVideo;
    const result = validateFile(file, type);

    if (!result.valid) {
      showError(dz, result.message);
      return;
    }

    if (type === 'image') {
      handleImageFile(file);
    } else {
      handleVideoFile(file);
    }
  }


  /* ================================================================
     CLICK TO BROWSE
  ================================================================ */
  dzImage.addEventListener('click', (e) => {
    /* Don't trigger if clicking remove button */
    if (e.target.closest('.dz-remove')) return;
    if (!imageFile) inputImage.click();
  });

  dzVideo.addEventListener('click', (e) => {
    if (e.target.closest('.dz-remove')) return;
    if (!videoFile) inputVideo.click();
  });

  /* Keyboard accessibility */
  dzImage.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !imageFile) {
      e.preventDefault();
      inputImage.click();
    }
  });
  dzVideo.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !videoFile) {
      e.preventDefault();
      inputVideo.click();
    }
  });

  /* File input change */
  inputImage.addEventListener('change', () => {
    if (inputImage.files[0]) {
      processFile(inputImage.files[0], 'image');
      inputImage.value = ''; /* Reset so same file can be re-selected */
    }
  });
  inputVideo.addEventListener('change', () => {
    if (inputVideo.files[0]) {
      processFile(inputVideo.files[0], 'video');
      inputVideo.value = '';
    }
  });


  /* ================================================================
     DRAG AND DROP
  ================================================================ */
  function setupDragDrop(dz, type) {

    dz.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dz.classList.add('drag-over');
    });

    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      dz.classList.add('drag-over');
    });

    dz.addEventListener('dragleave', (e) => {
      if (!dz.contains(e.relatedTarget)) {
        dz.classList.remove('drag-over');
      }
    });

    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dz.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) processFile(file, type);
    });
  }

  setupDragDrop(dzImage, 'image');
  setupDragDrop(dzVideo, 'video');


  /* ================================================================
     REMOVE FILE
  ================================================================ */
  function clearImage() {
    imageFile             = null;
    previewImg.src        = '';
    filenameImage.textContent = '';
    previewImage.hidden   = true;
    idleImage.hidden      = false;
    const err = dzImage.parentElement.querySelector('.upload-error');
    if (err) err.remove();
    dzImage.classList.remove('error');
    updateAnalyseBtn();
  }

  function clearVideo() {
    videoFile             = null;
    previewVid.src        = '';
    filenameVideo.textContent = '';
    previewVideo.hidden   = true;
    idleVideo.hidden      = false;
    const err = dzVideo.parentElement.querySelector('.upload-error');
    if (err) err.remove();
    dzVideo.classList.remove('error');
    updateAnalyseBtn();
  }

  removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearImage();
  });

  removeVideoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearVideo();
  });


  /* ================================================================
     ANALYSE BUTTON CLICK
     Switches to scanner state and starts analysis.
  ================================================================ */
  analyseBtn.addEventListener('click', async () => {
    const file = currentTab === 'image' ? imageFile : videoFile;
    if (!file) return;

    /* Switch to scanner state */
    window.DeepTraceState.showState('scanner');

    /* Set preview in scanner panel */
    const scannerImg   = document.getElementById('scanner-img');
    const scannerVideo = document.getElementById('scanner-video');
    const frameCounter = document.getElementById('frame-counter');

    if (currentTab === 'image' && scannerImg) {
      scannerImg.src              = previewImg.src;
      scannerImg.style.display    = 'block';
      scannerVideo.style.display  = 'none';
      if (frameCounter) frameCounter.hidden = true;
    } else if (currentTab === 'video' && scannerVideo) {
      scannerVideo.src            = previewVid.src;
      scannerVideo.style.display  = 'block';
      scannerImg.style.display    = 'none';
      if (frameCounter) frameCounter.hidden = false;
    }

    /* Start scanner animation */
    if (window.DeepTraceScanner && window.DeepTraceScanner.start) {
      window.DeepTraceScanner.start(currentTab);
    }

    /* Call the API */
    try {
      let result;
      if (currentTab === 'image') {
        result = await window.DeepTraceAPI.analyseImage(file);
      } else {
        result = await window.DeepTraceAPI.analyseVideo(file);
      }

      /* Stop scanner */
      if (window.DeepTraceScanner && window.DeepTraceScanner.stop) {
        window.DeepTraceScanner.stop();
      }

      /* Trigger reveal and show result */
      if (window.DeepTraceReveal && window.DeepTraceReveal.show) {
        window.DeepTraceReveal.show(result, file, currentTab);
      }

    } catch (err) {
      /* Stop scanner on error */
      if (window.DeepTraceScanner && window.DeepTraceScanner.stop) {
        window.DeepTraceScanner.stop();
      }

      /* Go back to idle state */
      window.DeepTraceState.showState('idle');

      /* Show error on drop zone */
      const dz = currentTab === 'image' ? dzImage : dzVideo;
      showError(dz, err.message || 'Analysis failed. Please try again.');
    }
  });


  /* ================================================================
     RESET ALL — called by main.js "Analyse Another" button
  ================================================================ */
  function resetAll() {
    clearImage();
    clearVideo();
    switchTab('image');
  }

})();
