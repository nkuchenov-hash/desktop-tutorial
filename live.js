(() => {
  'use strict';

  const COMMONS = name => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(name)}?width=4096`;
  const PANORAMAS = [
    {
      city: 'Reykjavík', country: 'Iceland', lat: 64.145723, lng: -21.932260, heading: 150,
      image: COMMONS('Rainbow Street Reykjavik Iceland 360 degree panorama 2026-02-08 07-52-13 1.jpg'),
      source: 'https://commons.wikimedia.org/wiki/File:Rainbow_Street_Reykjavik_Iceland_360_degree_panorama_2026-02-08_07-52-13_1.jpg'
    },
    {
      city: 'Winslow', country: 'United States', lat: 35.023288, lng: -110.698036, heading: 85,
      image: COMMONS('360 degree panorama of a corner in Winslow Arizona 2026-04-06 15-57-05 1.jpg'),
      source: 'https://commons.wikimedia.org/wiki/File:360_degree_panorama_of_a_corner_in_Winslow_Arizona_2026-04-06_15-57-05_1.jpg'
    },
    {
      city: 'Valletta', country: 'Malta', lat: 35.899375, lng: 14.508402, heading: 210,
      image: COMMONS('Malta - Valletta - South Street - 360° Panorama 01.jpg'),
      source: 'https://commons.wikimedia.org/wiki/File:Malta_-_Valletta_-_South_Street_-_360%C2%B0_Panorama_01.jpg'
    },
    {
      city: 'London', country: 'United Kingdom', lat: 51.528295, lng: -0.053879, heading: 20,
      image: COMMONS('Urban street 01 – Panorama (Andreas Mischok via Poly Haven).jpg'),
      source: 'https://commons.wikimedia.org/wiki/File:Urban_street_01_%E2%80%93_Panorama_(Andreas_Mischok_via_Poly_Haven).jpg'
    },
    {
      city: 'Nagpur', country: 'India', lat: 21.135669, lng: 79.108581, heading: 120,
      image: COMMONS('360 degree Panorama Near Reshimbag Ground, Nagpur - panoramio.jpg'),
      source: 'https://commons.wikimedia.org/wiki/File:360_degree_Panorama_Near_Reshimbag_Ground,_Nagpur_-_panoramio.jpg'
    },
    {
      city: 'San Diego County', country: 'United States', lat: 32.990515, lng: -117.135615, heading: 224,
      image: COMMONS('San Diego Panorama DSC 2541-DSC 2552 unwrapped.jpg'),
      source: 'https://commons.wikimedia.org/wiki/File:San_Diego_Panorama_DSC_2541-DSC_2552_unwrapped.jpg'
    },
    {
      city: 'Oatman', country: 'United States', lat: 35.025940, lng: -114.383136, heading: 170,
      image: COMMONS('360 degree panorama Main St Oatman AZ 2026-04-05 15-42-24 1.jpg'),
      source: 'https://commons.wikimedia.org/wiki/File:360_degree_panorama_Main_St_Oatman_AZ_2026-04-05_15-42-24_1.jpg'
    },
    {
      city: 'Busan', country: 'South Korea', lat: 35.101273, lng: 129.032118, heading: 250,
      image: COMMONS('Busan Tower 360 Degree Panorama 001.jpg'),
      source: 'https://commons.wikimedia.org/wiki/File:Busan_Tower_360_Degree_Panorama_001.jpg'
    }
  ];

  const $ = id => document.getElementById(id);
  const E = {
    screens: [...document.querySelectorAll('.screen')],
    home: $('home-screen'), game: $('game-screen'), round: $('round-screen'), final: $('final-screen'),
    start: $('start-game'), open: $('open-map'), close: $('close-map'), panel: $('guess-panel'),
    submit: $('submit-guess'), hint: $('guess-hint'), view: $('street-view'), roundLabel: $('round-label'),
    resultRound: $('result-round-label'), progress: $('progress-fill'), timer: $('timer'), time: $('timer-value'),
    next: $('next-round'), distance: $('distance-value'), score: $('round-score'), ring: $('score-ring-value'),
    actual: $('actual-location'), provider: $('actual-country'), total: $('final-score'), breakdown: $('round-breakdown'),
    again: $('play-again'), share: $('share-score'), shareStatus: $('share-status'), settings: $('settings-dialog'),
    openSettings: $('open-settings-home'), apiKey: $('api-key'), prefer: $('prefer-streetview'),
    saveSettings: $('save-settings'), clearSettings: $('clear-settings'), zin: $('zoom-in-view'),
    zout: $('zoom-out-view'), reset: $('reset-view')
  };

  let state = freshState();
  let guessMap;
  let resultMap;
  let guessMarker;
  let timerId;
  let viewerControls;
  let googlePromise;
  let googlePanorama;
  let pan = 50;
  let zoom = 1;
  let dragging = false;
  let dragX = 0;

  function freshState() {
    return { round: 0, rounds: [], guess: null, scores: [], seconds: 90, submitted: false };
  }

  function shuffle(values) {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function showScreen(target) {
    E.screens.forEach(screen => screen.classList.toggle('is-active', screen === target));
    setTimeout(() => {
      if (target === E.game && guessMap) guessMap.invalidateSize();
      if (target === E.round && resultMap) resultMap.invalidateSize();
    }, 60);
  }

  function setStartLabel(text, disabled = false) {
    E.start.querySelector('span').textContent = text;
    E.start.disabled = disabled;
  }

  function imageLoads(url) {
    return new Promise(resolve => {
      const image = new Image();
      const timer = setTimeout(() => resolve(false), 12000);
      image.onload = () => { clearTimeout(timer); resolve(true); };
      image.onerror = () => { clearTimeout(timer); resolve(false); };
      image.referrerPolicy = 'no-referrer';
      image.src = url;
    });
  }

  async function chooseRounds(count) {
    const candidates = shuffle(PANORAMAS);
    const ready = [];
    for (const panorama of candidates) {
      if (ready.length >= count) break;
      if (await imageLoads(panorama.image)) ready.push(panorama);
    }
    if (ready.length < count) throw new Error(`Only ${ready.length} panorama images loaded`);
    return ready;
  }

  async function begin() {
    stopTimer();
    state = freshState();
    setStartLabel('LOADING 360° PANORAMAS…', true);
    try {
      state.rounds = await chooseRounds(5);
      setStartLabel('START EXPLORING');
      showScreen(E.game);
      startRound();
    } catch (error) {
      console.error(error);
      setStartLabel('TRY AGAIN');
      alert('The panorama images could not be loaded. Check your connection and try again.');
    }
  }

  function currentRound() {
    return state.rounds[state.round];
  }

  function startRound() {
    state.guess = null;
    state.submitted = false;
    state.seconds = 90;
    pan = Math.round(((currentRound().heading || 0) / 360) * 100);
    zoom = 1;
    E.roundLabel.textContent = `ROUND ${state.round + 1} / ${state.rounds.length}`;
    E.progress.style.width = `${((state.round + 1) / state.rounds.length) * 100}%`;
    E.submit.disabled = true;
    E.hint.textContent = 'Tap anywhere on the map';
    closeMap();
    resetGuess();
    showPanorama();
    startTimer();
    makeViewerControls();
    updateViewerControls();
  }

  function applyPanoramaView() {
    E.view.style.backgroundSize = `auto ${Math.round(zoom * 100)}%`;
    E.view.style.backgroundPosition = `${pan}% 50%`;
  }

  function showFallbackPanorama(round) {
    googlePanorama = null;
    E.view.innerHTML = '';
    E.view.style.backgroundImage = `url("${String(round.image).replaceAll('"', '%22')}")`;
    E.view.style.backgroundRepeat = 'repeat-x';
    E.view.style.touchAction = 'none';
    E.view.style.cursor = 'grab';
    E.view.setAttribute('aria-label', `Interactive 360 degree panorama near ${round.city}`);
    applyPanoramaView();
  }

  function showPanorama() {
    const round = currentRound();
    const config = readSettings();
    E.view.innerHTML = '';
    E.view.style.backgroundImage = 'none';

    if (config.useGoogle && config.key) {
      loadGoogle(config.key).then(() => {
        const service = new google.maps.StreetViewService();
        service.getPanorama({ location: { lat: round.lat, lng: round.lng }, radius: 500 }, (data, status) => {
          if (status === google.maps.StreetViewStatus.OK) {
            googlePanorama = new google.maps.StreetViewPanorama(E.view, {
              pano: data.location.pano,
              pov: { heading: round.heading || 0, pitch: 0 },
              zoom: 0,
              addressControl: false,
              fullscreenControl: false,
              showRoadLabels: false
            });
            updateViewerControls();
          } else {
            showFallbackPanorama(round);
          }
        });
      }).catch(() => showFallbackPanorama(round));
    } else {
      showFallbackPanorama(round);
    }
  }

  function loadGoogle(key) {
    if (window.google?.maps) return Promise.resolve();
    if (googlePromise) return googlePromise;
    googlePromise = new Promise((resolve, reject) => {
      const callback = `geoscopeMaps${Date.now()}`;
      const script = document.createElement('script');
      window[callback] = () => { delete window[callback]; resolve(); };
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${callback}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return googlePromise;
  }

  function makeViewerControls() {
    if (viewerControls) return;
    viewerControls = document.createElement('div');
    viewerControls.style.cssText = 'position:absolute;left:50%;bottom:28px;z-index:12;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:8px 12px;background:rgba(8,10,12,.84);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(14px);font:700 10px/1 system-ui;letter-spacing:.12em;white-space:nowrap';
    viewerControls.innerHTML = '<button data-turn="-1" aria-label="Look left">←</button><span>DRAG TO LOOK AROUND · 360°</span><button data-turn="1" aria-label="Look right">→</button>';
    viewerControls.querySelectorAll('button').forEach(button => {
      button.style.cssText = 'width:38px;height:38px;border:1px solid rgba(255,255,255,.18);background:#111;color:#c6ff3d;font-size:20px;cursor:pointer';
      button.addEventListener('click', () => rotate(Number(button.dataset.turn) * 7));
    });
    E.game.appendChild(viewerControls);

    E.view.addEventListener('pointerdown', event => {
      if (googlePanorama) return;
      dragging = true;
      dragX = event.clientX;
      E.view.setPointerCapture(event.pointerId);
      E.view.style.cursor = 'grabbing';
    });
    E.view.addEventListener('pointermove', event => {
      if (!dragging || googlePanorama) return;
      const delta = event.clientX - dragX;
      dragX = event.clientX;
      pan = ((pan - (delta / Math.max(320, E.view.clientWidth)) * 55) % 100 + 100) % 100;
      applyPanoramaView();
    });
    const stopDrag = event => {
      if (!dragging) return;
      dragging = false;
      E.view.style.cursor = 'grab';
      try { E.view.releasePointerCapture(event.pointerId); } catch (_) {}
    };
    E.view.addEventListener('pointerup', stopDrag);
    E.view.addEventListener('pointercancel', stopDrag);
  }

  function updateViewerControls() {
    if (!viewerControls) return;
    viewerControls.querySelector('span').textContent = googlePanorama ? 'GOOGLE STREET VIEW · DRAG TO EXPLORE' : 'REAL 360° PANORAMA · DRAG TO LOOK AROUND';
  }

  function rotate(amount) {
    if (googlePanorama) {
      const pov = googlePanorama.getPov();
      googlePanorama.setPov({ ...pov, heading: pov.heading + amount * 3.6 });
      return;
    }
    pan = ((pan + amount) % 100 + 100) % 100;
    applyPanoramaView();
  }

  function startTimer() {
    stopTimer();
    updateTime();
    timerId = setInterval(() => {
      state.seconds -= 1;
      updateTime();
      if (state.seconds <= 0) {
        stopTimer();
        state.guess ??= { lat: 0, lng: 0 };
        submitGuess(true);
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function updateTime() {
    const minutes = Math.floor(state.seconds / 60);
    const seconds = state.seconds % 60;
    E.time.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    E.timer.classList.toggle('is-low', state.seconds <= 15);
  }

  function ensureMap() {
    if (guessMap) return;
    guessMap = L.map('guess-map', { worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(guessMap);
    guessMap.on('click', event => {
      state.guess = { lat: event.latlng.lat, lng: event.latlng.lng };
      guessMarker?.remove();
      guessMarker = L.marker(event.latlng, { icon: pin('custom-pin') }).addTo(guessMap);
      E.submit.disabled = false;
      E.hint.textContent = `${Math.abs(event.latlng.lat).toFixed(2)}° ${event.latlng.lat >= 0 ? 'N' : 'S'}, ${Math.abs(event.latlng.lng).toFixed(2)}° ${event.latlng.lng >= 0 ? 'E' : 'W'}`;
    });
  }

  function resetGuess() {
    if (!guessMap) return;
    guessMap.setView([20, 0], 2, { animate: false });
    guessMarker?.remove();
    guessMarker = null;
  }

  function pin(className) {
    return L.divIcon({ className, html: '<span class="pin-shape"></span>', iconSize: [26, 32], iconAnchor: [13, 30] });
  }

  function openMap() {
    ensureMap();
    E.panel.classList.add('is-open');
    E.panel.setAttribute('aria-hidden', 'false');
    setTimeout(() => guessMap.invalidateSize(), 220);
  }

  function closeMap() {
    E.panel.classList.remove('is-open');
    E.panel.setAttribute('aria-hidden', 'true');
  }

  function calculateDistance(lat1, lng1, lat2, lng2) {
    const rad = value => (value * Math.PI) / 180;
    const radius = 6371;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function submitGuess(timeout = false) {
    if (state.submitted || !state.guess) return;
    state.submitted = true;
    stopTimer();
    const round = currentRound();
    const distance = calculateDistance(state.guess.lat, state.guess.lng, round.lat, round.lng);
    const score = Math.max(0, Math.round(5000 * Math.exp(-distance / 1900)));
    state.scores.push(score);
    renderResult(round, distance, score, timeout);
    showScreen(E.round);
  }

  function renderResult(round, distance, score, timeout) {
    E.resultRound.textContent = `ROUND ${state.round + 1} / ${state.rounds.length}`;
    E.distance.textContent = distance < 1 ? `${Math.round(distance * 1000)} m` : `${Math.round(distance).toLocaleString()} km`;
    E.score.textContent = score.toLocaleString();
    E.actual.textContent = round.city;
    E.provider.innerHTML = `${round.country}${timeout ? ' · Time expired' : ''} · <a href="${round.source}" target="_blank" rel="noopener">panorama source</a>`;
    E.next.querySelector('span').textContent = state.round === state.rounds.length - 1 ? 'SEE FINAL SCORE' : 'NEXT ROUND';
    E.ring.style.strokeDashoffset = String(421 - (score / 5000) * 421);

    resultMap?.remove();
    resultMap = L.map('result-map', { zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(resultMap);
    const actual = L.latLng(round.lat, round.lng);
    const guess = L.latLng(state.guess.lat, state.guess.lng);
    L.marker(actual, { icon: pin('actual-pin') }).addTo(resultMap).bindTooltip('Actual location');
    L.marker(guess, { icon: pin('custom-pin') }).addTo(resultMap).bindTooltip('Your guess');
    L.polyline([actual, guess], { color: '#c6ff3d', weight: 3, dashArray: '8 10' }).addTo(resultMap);
    resultMap.fitBounds(L.latLngBounds(actual, guess).pad(0.35), { maxZoom: 7 });
    setTimeout(() => resultMap.invalidateSize(), 80);
  }

  function nextRound() {
    if (state.round === state.rounds.length - 1) {
      renderFinal();
      showScreen(E.final);
      return;
    }
    state.round += 1;
    showScreen(E.game);
    startRound();
  }

  function renderFinal() {
    const total = state.scores.reduce((sum, score) => sum + score, 0);
    E.total.textContent = total.toLocaleString();
    E.breakdown.innerHTML = state.scores.map((score, index) => `<div class="round-score-chip"><span>ROUND ${index + 1}</span><strong>${score.toLocaleString()}</strong></div>`).join('');
    E.shareStatus.textContent = '';
  }

  function shareResult() {
    const total = state.scores.reduce((sum, score) => sum + score, 0);
    const blocks = state.scores.map(score => score >= 4500 ? '🟩' : score >= 3000 ? '🟨' : score >= 1500 ? '🟧' : '🟥').join('');
    const text = `GeoScope ${total.toLocaleString()}/25,000\n${blocks}`;
    navigator.clipboard?.writeText(text).then(() => { E.shareStatus.textContent = 'Result copied.'; }).catch(() => { E.shareStatus.textContent = text; });
  }

  function readSettings() {
    try {
      return {
        key: localStorage.getItem('geoscope.googleMapsKey') || '',
        useGoogle: localStorage.getItem('geoscope.preferStreetView') === 'true'
      };
    } catch (_) {
      return { key: '', useGoogle: false };
    }
  }

  function openSettings() {
    const config = readSettings();
    E.apiKey.value = config.key;
    E.prefer.checked = config.useGoogle;
    E.settings.showModal();
  }

  function saveSettings() {
    try {
      localStorage.setItem('geoscope.googleMapsKey', E.apiKey.value.trim());
      localStorage.setItem('geoscope.preferStreetView', String(E.prefer.checked));
    } catch (_) {}
    E.settings.close();
  }

  function clearSettings() {
    E.apiKey.value = '';
    E.prefer.checked = false;
    try {
      localStorage.removeItem('geoscope.googleMapsKey');
      localStorage.removeItem('geoscope.preferStreetView');
    } catch (_) {}
  }

  function goHome(event) {
    event.preventDefault();
    stopTimer();
    closeMap();
    showScreen(E.home);
  }

  function changeZoom(direction) {
    if (googlePanorama) {
      googlePanorama.setZoom(Math.max(0, Math.min(5, (googlePanorama.getZoom() || 0) + direction));
      return;
    }
    zoom = Math.max(1, Math.min(2.25, zoom + direction * 0.15));
    applyPanoramaView();
  }

  function resetView() {
    const round = currentRound();
    if (googlePanorama) {
      googlePanorama.setPov({ heading: round.heading || 0, pitch: 0 });
      googlePanorama.setZoom(0);
      return;
    }
    pan = Math.round(((round.heading || 0) / 360) * 100);
    zoom = 1;
    applyPanoramaView();
  }

  E.start.addEventListener('click', begin);
  E.again.addEventListener('click', begin);
  E.open.addEventListener('click', openMap);
  E.close.addEventListener('click', closeMap);
  E.submit.addEventListener('click', () => submitGuess(false));
  E.next.addEventListener('click', nextRound);
  E.share.addEventListener('click', shareResult);
  E.openSettings.addEventListener('click', openSettings);
  E.saveSettings.addEventListener('click', saveSettings);
  E.clearSettings.addEventListener('click', clearSettings);
  E.zin.addEventListener('click', () => changeZoom(1));
  E.zout.addEventListener('click', () => changeZoom(-1));
  E.reset.addEventListener('click', resetView);
  document.querySelectorAll('a.brand').forEach(link => link.addEventListener('click', goHome));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMap();
    if (E.game.classList.contains('is-active') && event.key === 'ArrowLeft') rotate(-7);
    if (E.game.classList.contains('is-active') && event.key === 'ArrowRight') rotate(7);
  });
})();
