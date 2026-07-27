(function () {
  'use strict';

  var config = window.GEOSCOPE_CONFIG || {};
  var apiKey = String(config.googleMapsApiKey || '').trim();

  if (apiKey) {
    try {
      localStorage.setItem('geoscopeGoogleEmbedKey', apiKey);
    } catch (_) {}
  }

  function hiddenElement(id, tagName) {
    var element = document.getElementById(id);
    if (element) return element;
    element = document.createElement(tagName || 'div');
    element.id = id;
    element.hidden = true;
    document.body.appendChild(element);
    return element;
  }

  hiddenElement('settingsBtn', 'button');
  hiddenElement('setup', 'div');
  hiddenElement('apiKey', 'input');
  hiddenElement('keyError', 'div');
  hiddenElement('saveKey', 'button');
  hiddenElement('keyHelp', 'button');

  if (!apiKey) {
    var start = document.getElementById('startBtn');
    var notice = document.getElementById('ownerConfigNotice');
    if (start) {
      start.disabled = true;
      start.querySelector('span').textContent = 'STREET VIEW CONFIGURATION PENDING';
    }
    if (notice) notice.hidden = false;
  }
})();
