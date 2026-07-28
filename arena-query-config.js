(() => {
'use strict';
const params = new URLSearchParams(location.search);
const allowedFormats = new Set(['classic','sprint','duel','endurance']);
const allowedPools = new Set(['smart','cities','capitals','famous','megacities','scenic']);
const allowedLanguages = new Set(['en','es','pt','fr','de','ru','zh','ja','ko','ar','hi','id','tr','it','pl']);
let cfg = {};
try { cfg = JSON.parse(localStorage.getItem('geoCfg') || '{}') || {}; } catch (_) {}
const format = params.get('format');
const pool = params.get('pool');
const difficulty = Number(params.get('difficulty'));
const lang = params.get('lang');
if (allowedFormats.has(format)) cfg.format = format;
if (allowedPools.has(pool)) cfg.pool = pool;
if ([1,2,3].includes(difficulty)) cfg.difficulty = difficulty;
if (allowedLanguages.has(lang)) cfg.lang = lang;
try { localStorage.setItem('geoCfg', JSON.stringify(cfg)); } catch (_) {}
window.GEOSCOPE_AUTOSTART = params.get('autostart') === '1';
window.GEOSCOPE_RETURN_TO_APP = params.get('return') === 'app';
if (window.GEOSCOPE_AUTOSTART) document.documentElement.classList.add('shell-game');
})();
