(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const E = {
    screens: [...document.querySelectorAll('.screen')],
    home: $('home-screen'),
    game: $('game-screen'),
    round: $('round-screen'),
    final: $('final-screen'),
    start: $('start-game'),
    open: $('open-map'),
    close: $('close-map'),
    panel: $('guess-panel'),
    submit: $('submit-guess'),
    hint: $('guess-hint'),
    view: $('street-view'),
    roundLabel: $('round-label'),
    resultRound: $('result-round-label'),
    progress: $('progress-fill'),
    timer: $('timer'),
    time: $('timer-value'),
    next: $('next-round'),
    distance: $('distance-value'),
    score: $('round-score'),
    ring: $('score-ring-value'),
    actual: $('actual-location'),
    provider: $('actual-country'),
    total: $('final-score'),
    breakdown: $('round-breakdown'),
    again: $('play-again'),
    share: $('share-score'),
    shareStatus: $('share-status'),
    settings: $('settings-dialog'),
    openSettings: $('open-settings-home'),
    apiKey: $('api-key'),
    prefer: $('prefer-streetview'),
    saveSettings: $('save-settings'),
    clearSettings: $('clear-settings'),
    zin: $('zoom-in-view'),
    zout: $('zoom-out-view'),
    reset: $('reset-view')
  };

  let S = fresh();
  let guessMap;
  let resultMap;
  let guessMarker;
  let timerId;
  let scale = 1;
  let navigatorBar;
  let googlePromise;
  let panorama;

  function fresh() {
    return {
      round: 0,
      rounds: [],
      guess: null,
      scores: [],
      seconds: 90,
      submitted: false,
      photo: 0
    };
  }

  function shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
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

  async function loadRounds(count) {
    const response = await fetch(`generated/rounds.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Street dataset HTTP ${response.status}`);

    const payload = await response.json();
    const available = Array.isArray(payload?.rounds) ? payload.rounds : [];
    const valid = available.filter(round =>
      Array.isArray(round?.photos) &&
      round.photos.length >= 3 &&
      round.photos.every(photo => Number.isFinite(Number(photo.lat)) && Number.isFinite(Number(photo.lng)) && photo.url)
    );

    if (valid.length < count) throw new Error(`Only ${valid.length} valid street rounds are available`);

    return shuffle(valid).slice(0, count).map(round => ({
      ...round,
      start: Math.max(0, Math.min(round.photos.length - 1, Number(round.start) || 0))
    }));
  }

  async function begin() {
    stopTimer();
    S = fresh();
    setStartLabel('LOADING REAL STREET IMAGERY…', true);

    try {
      S.rounds = await loadRounds(5);
      setStartLabel('START EXPLORING');
      showScreen(E.game);
      startRound();
    } catch (error) {
      console.error(error);
      setStartLabel('TRY AGAIN');
      alert('The street imagery package is not available yet. Refresh the page after the current deployment finishes.');
    }
  }

  function currentPhoto() {
    return S.rounds[S.round].photos[S.photo];
  }

  function startRound() {
    S.guess = null;
    S.submitted = false;
    S.seconds = 90;
    S.photo = S.rounds[S.round].start;
    scale = 1;

    E.view.style.transform = 'scale(1)';
    E.roundLabel.textContent = `ROUND ${S.round + 1} / ${S.rounds.length}`;
    E.progress.style.width = `${((S.round + 1) / S.rounds.length) * 100}%`;
    E.submit.disabled = true;
    E.hint.textContent = 'Tap anywhere on the map';

    closeMap();
    resetGuess();
    showPhoto();
    startTimer();
    makeNavigator();
    updateNavigator();
  }

  function showPhoto() {
    const photo = currentPhoto();
    const config = settings();

    panorama = null;
    E.view.innerHTML = '';
    E.view.style.backgroundImage = 'none';

    if (config.useGoogle && config.key) {
      loadGoogle(config.key)
        .then(() => {
          const service = new google.maps.StreetViewService();
          service.getPanorama(
            { location: { lat: photo.lat, lng: photo.lng }, radius: 250 },
            (data, status) => {
              if (status === google.maps.StreetViewStatus.OK) {
                panorama = new google.maps.StreetViewPanorama(E.view, {
                  pano: data.location.pano,
                  pov: { heading: photo.heading, pitch: 0 },
                  zoom: 0,
                  addressControl: false,
                  fullscreenControl: false,
                  showRoadLabels: false
                });
              } else {
                showKartaViewPhoto(photo);
              }
            }
          );
        })
        .catch(() => showKartaViewPhoto(photo));
    } else {
      showKartaViewPhoto(photo);
    }
  }

  function showKartaViewPhoto(photo) {
    const safeUrl = String(photo.url).replaceAll('"', '%22');
    E.view.style.backgroundImage = `url("${safeUrl}")`;
    E.view.setAttribute('aria-label', 'Real street-level imagery from KartaView');
  }

  function loadGoogle(key) {
    if (window.google?.maps) return Promise.resolve();
    if (googlePromise) return googlePromise;

    googlePromise = new Promise((resolve, reject) => {
      const callback = `geoscopeMaps${Date.now()}`;
      const script = document.createElement('script');
      window[callback] = () => {
        delete window[callback];
        resolve();
      };
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${callback}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return googlePromise;
  }

  function makeNavigator() {
    if (navigatorBar) return;

    navigatorBar = document.createElement('div');
    navigatorBar.style.cssText = 'position:absolute;left:50%;bottom:28px;z-index:12;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:8px 12px;background:rgba(8,10,12,.82);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(14px);font:700 10px/1 system-ui;letter-spacing:.12em';
    navigatorBar.innerHTML = '<button data-direction="-1" aria-label="Previous street image">←</button><span></span><button data-direction="1" aria-label="Next street image">→</button>';

    navigatorBar.querySelectorAll('button').forEach(button => {
      button.style.cssText = 'width:38px;height:38px;border:1px solid rgba(255,255,255,.18);background:#111;color:#c6ff3d;font-size:20px;cursor:pointer';
      button.addEventListener('click', () => move(Number(button.dataset.direction)));
    });

    E.game.appendChild(navigatorBar);
  }

  function updateNavigator() {
    const photos = S.rounds[S.round].photos;
    navigatorBar.hidden = photos.length < 2;
    navigatorBar.querySelector('span').textContent = `MOVE ALONG STREET · ${S.photo + 1}/${photos.length}`;
  }

  function move(direction) {
    const photos = S.rounds[S.round].photos;
    const nextPhoto = S.photo + direction;
    if (nextPhoto < 0 || nextPhoto >= photos.length) return;

    S.photo = nextPhoto;
    scale = 1;
    E.view.style.transform = 'scale(1)';
    showPhoto();
    updateNavigator();
  }

  function startTimer() {
    stopTimer();
    updateTime();
    timerId = setInterval(() => {
      S.seconds -= 1;
      updateTime();
      if (S.seconds <= 0) {
        stopTimer();
        S.guess ??= { lat: 0, lng: 0 };
        submitGuess(true);
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function updateTime() {
    const minutes = Math.floor(S.seconds / 60);
    const seconds = S.seconds % 60;
    E.time.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    E.timer.classList.toggle('is-low', S.seconds <= 15);
  }

  function ensureMap() {
    if (guessMap) return;

    guessMap = L.map('guess-map', { worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(guessMap);

    guessMap.on('click', event => {
      S.guess = { lat: event.latlng.lat, lng: event.latlng.lng };
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
    return L.divIcon({
      className,
      html: '<span class="pin-shape"></span>',
      iconSize: [26, 32],
      iconAnchor: [13, 30]
    });
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

  function submitGuess(timeout = false) {
    if (S.submitted || !S.guess) return;

    S.submitted = true;
    stopTimer();

    const photo = currentPhoto();
    const distance = calculateDistance(S.guess.lat, S.guess.lng, photo.lat, photo.lng);
    const score = Math.max(0, Math.round(5000 * Math.exp(-distance / 1900)));
    S.scores.push(score);

    renderResult(photo, distance, score, timeout);
    showScreen(E.round);
  }

  function calculateDistance(lat1, lng1, lat2, lng2) {
    const radians = value => (value * Math.PI) / 180;
    const radius = 6371;
    const latitudeDelta = radians(lat2 - lat1);
    const longitudeDelta = radians(lng2 - lng1);
    const haversine = Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  function renderResult(photo, distance, score, timeout) {
    const round = S.rounds[S.round];
    E.resultRound.textContent = `ROUND ${S.round + 1} / ${S.rounds.length}`;
    E.distance.textContent = distance < 1 ? `${Math.round(distance * 1000)} m` : `${Math.round(distance).toLocaleString()} km`;
    E.score.textContent = score.toLocaleString();
    E.actual.textContent = round.area || `${photo.lat.toFixed(4)}, ${photo.lng.toFixed(4)}`;
    E.provider.textContent = `Real KartaView imagery${timeout ? ' · Time expired' : ''}`;
    E.next.querySelector('span').textContent = S.round === S.rounds.length - 1 ? 'SEE FINAL SCORE' : 'NEXT ROUND';
    E.ring.style.strokeDashoffset = String(421 - (score / 5000) * 421);

    resultMap?.remove();
    resultMap = L.map('result-map', { zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(resultMap);

    const actual = L.latLng(photo.lat, photo.lng);
    const guessed = L.latLng(S.guess.lat, S.guess.lng);
    L.marker(actual, { icon: pin('actual-pin') }).addTo(resultMap);
    L.marker(guessed, { icon: pin('custom-pin') }).addTo(resultMap);
    L.polyline([actual, guessed], { color: '#c6ff3d', weight: 3, dashArray: '8 10' }).addTo(resultMap);
    resultMap.fitBounds(L.latLngBounds(actual, guessed).pad(0.35), { maxZoom: 7 });
    setTimeout(() => resultMap.invalidateSize(), 80);
  }

  function nextRound() {
    if (S.round === S.rounds.length - 1) {
      renderFinal();
      showScreen(E.final);
    } else {
      S.round += 1;
      showScreen(E.game);
      startRound();
    }
  }

  function renderFinal() {
    const total = S.scores.reduce((sum, score) => sum + score, 0);
    E.total.textContent = total.toLocaleString();
    E.breakdown.innerHTML = S.scores
      .map((score, index) => `<div class="round-score-chip"><span>ROUND ${index + 1}</span><strong>${score.toLocaleString()}</strong></div>`)
      .join('');
  }

  function shareResult() {
    const total = S.scores.reduce((sum, score) => sum + score, 0);
    const result = `GeoScope ${total.toLocaleString()}/25,000\n${S.scores.map(score => score >= 4500 ? '🟩' : score >= 3000 ? '🟨' : score >= 1500 ? '🟧' : '🟥').join('')}`;
    navigator.clipboard?.writeText(result)
      .then(() => { E.shareStatus.textContent = 'Result copied.'; })
      .catch(() => { E.shareStatus.textContent = result; });
  }

  function settings() {
    try {
      return {
        key: localStorage.getItem('geoscope.googleMapsKey') || '',
        useGoogle: localStorage.getItem('geoscope.preferStreetView') === 'true'
      };
    } catch {
      return { key: '', useGoogle: false };
    }
  }

  function openSettings() {
    const current = settings();
    E.apiKey.value = current.key;
    E.prefer.checked = current.useGoogle;
    E.settings.showModal();
  }

  function saveSettings() {
    try {
      localStorage.setItem('geoscope.googleMapsKey', E.apiKey.value.trim());
      localStorage.setItem('geoscope.preferStreetView', String(E.prefer.checked));
    } catch {}
    E.settings.close();
  }

  function clearSettings() {
    E.apiKey.value = '';
    E.prefer.checked = false;
    try {
      localStorage.removeItem('geoscope.googleMapsKey');
      localStorage.removeItem('geoscope.preferStreetView');
    } catch {}
  }

  function goHome(event) {
    event.preventDefault();
    stopTimer();
    closeMap();
    showScreen(E.home);
  }

  function zoom(direction) {
    if (panorama) {
      panorama.setZoom(Math.max(0, Math.min(5, (panorama.getZoom() || 0) + direction)));
    } else {
      scale = Math.max(1, Math.min(2, scale + 0.15 * direction));
      E.view.style.transform = `scale(${scale})`;
    }
  }

  function resetView() {
    if (panorama) {
      panorama.setPov({ heading: currentPhoto().heading, pitch: 0 });
      panorama.setZoom(0);
    } else {
      scale = 1;
      E.view.style.transform = 'scale(1)';
    }
  }

  E.start.addEventListener('click', begin);
  E.again.addEventListener('click', begin);
  E.open.addEventListener('click', openMap);
  E.close.addEventListener('click', closeMap);
  E.submit.addEventListener('click', () => submitGuess());
  E.next.addEventListener('click', nextRound);
  E.share.addEventListener('click', shareResult);
  E.openSettings.addEventListener('click', openSettings);
  E.saveSettings.addEventListener('click', saveSettings);
  E.clearSettings.addEventListener('click', clearSettings);
  E.zin.addEventListener('click', () => zoom(1));
  E.zout.addEventListener('click', () => zoom(-1));
  E.reset.addEventListener('click', resetView);
  document.querySelectorAll('a.brand').forEach(link => link.addEventListener('click', goHome));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMap();
    if (E.game.classList.contains('is-active') && event.key === 'ArrowLeft') move(-1);
    if (E.game.classList.contains('is-active') && event.key === 'ArrowRight') move(1);
  });
})();
