(() => {
'use strict';
const $ = id => document.getElementById(id);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const LANGS = {en:'English',es:'Español',pt:'Português',fr:'Français',de:'Deutsch',ru:'Русский',zh:'中文',ja:'日本語',ko:'한국어',ar:'العربية',hi:'हिन्दी',id:'Bahasa Indonesia',tr:'Türkçe',it:'Italiano',pl:'Polski'};
const VIEW_TITLES = {hub:'Home',play:'Play',competitive:'Competitive',social:'Social',profile:'Profile'};
const FORMAT_LABELS = {classic:'Classic',sprint:'Sprint',duel:'Duel',endurance:'Endurance'};
const POOL_LABELS = {smart:'Smart Random',cities:'Cities Only',capitals:'Capitals',famous:'Famous Places',megacities:'Megacities',scenic:'Scenic Roads'};
const DIFFICULTY_LABELS = {1:'Easy',2:'Medium',3:'Hard'};
const IMAGE_BY_POOL = {
 smart:'https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=900&q=84',
 cities:'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=84',
 capitals:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=84',
 famous:'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=84',
 megacities:'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=84',
 scenic:'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=84'
};
let user = readJson('geoShellUser', null);
let cfg = Object.assign({format:'classic', pool:'smart', difficulty:1, lang:languageDefault()}, readJson('geoCfg', {}));
let profile = Object.assign({matches:0,wins:0,totalScore:0,best:0,rounds:0,countryHits:0,totalKm:0,totalTime:0,history:[],choices:{},coins:248}, readJson('geoProProfile', {}));
let googleReady = false;
function languageDefault(){const code=(navigator.language||'en').slice(0,2);return LANGS[code]?code:'en'}
function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}}
function initials(name){return String(name||'GeoScope Player').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'GP'}
function showToast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove('show'),2600)}
function openAuth(){const auth=$('auth');auth.classList.add('active');auth.setAttribute('aria-hidden','false');$('playerName').value=user?.name||'';setTimeout(()=>$('playerName').focus(),120)}
function closeAuth(){const auth=$('auth');auth.classList.remove('active');auth.setAttribute('aria-hidden','true')}
function showLanding(){location.hash='';$('landing').classList.remove('hidden');$('app').classList.remove('active');closeAuth();window.scrollTo({top:0,behavior:'smooth'})}
function enterApp(view='hub'){
 if(!user){openAuth();return}
 $('landing').classList.add('hidden');$('app').classList.add('active');closeAuth();location.hash='app';hydrateUser();renderProfileData();showView(view);window.scrollTo(0,0)
}
function showView(view){
 $$('.app-view').forEach(el=>el.classList.toggle('active',el.id===`view-${view}`));
 $$('.nav-btn[data-app-view]').forEach(el=>el.classList.toggle('active',el.dataset.appView===view));
 $('viewTitle').textContent=VIEW_TITLES[view]||'GeoScope';
 if(view==='profile')renderProfileData();
 window.scrollTo({top:0,behavior:'smooth'})
}
function hydrateUser(){
 const name=user?.name||'GeoScope Player', mark=initials(name);
 ['sideName','leaderName','profileName'].forEach(id=>{if($(id))$(id).textContent=name});
 ['sideAvatar','leaderAvatar','profileAvatar'].forEach(id=>{if($(id))$(id).textContent=mark});
 $('welcomeName').textContent=`Ready, ${name.split(' ')[0]}?`;
 $('coinValue').textContent=Number(profile.coins||248).toLocaleString();
}
function completeLocalLogin(){
 const name=$('playerName').value.trim()||'GeoScope Player';
 user={name,provider:'local',createdAt:new Date().toISOString()};writeJson('geoShellUser',user);enterApp('hub');showToast(`Welcome, ${name}`)
}
function decodeJwt(token){
 try{const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(decodeURIComponent(atob(part).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')))}catch{return null}
}
function handleGoogleCredential(response){
 const data=decodeJwt(response.credential);if(!data){showToast('Google sign-in response could not be read.');return}
 user={name:data.name||data.given_name||'GeoScope Player',email:data.email||'',picture:data.picture||'',provider:'google',createdAt:new Date().toISOString()};writeJson('geoShellUser',user);enterApp('hub');showToast('Signed in with Google')
}
function configureGoogle(){
 const clientId=String(window.GEOSCOPE_AUTH_CONFIG?.googleClientId||'').trim();
 if(!clientId||!window.google?.accounts?.id)return false;
 try{
   google.accounts.id.initialize({client_id:clientId,callback:handleGoogleCredential,auto_select:false,cancel_on_tap_outside:true});
   const host=$('googleButtonHost');host.innerHTML='';google.accounts.id.renderButton(host,{theme:'outline',size:'large',width:420,text:'continue_with',shape:'rectangular'});googleReady=true;return true;
 }catch(error){console.error(error);return false}
}
function openOauthNotice(){$('oauthModal').classList.add('open')}
function signOut(){localStorage.removeItem('geoShellUser');user=null;showLanding();showToast('Signed out')}
function profileNumbers(){
 const rounds=Number(profile.rounds||0),matches=Number(profile.matches||0);
 return {
  matches,wins:Number(profile.wins||0),best:Number(profile.best||0),avgScore:matches?Math.round(Number(profile.totalScore||0)/matches):0,
  country:rounds?Math.round(Number(profile.countryHits||0)/rounds*100):0,
  avgKm:rounds?Math.round(Number(profile.totalKm||0)/rounds):0,
  avgTime:rounds?Math.round(Number(profile.totalTime||0)/rounds):0,rounds
 }
}
function renderProfileData(){
 const n=profileNumbers();
 const stats=[['Matches',n.matches],['Wins',n.wins],['Best score',n.best.toLocaleString()],['Average score',n.avgScore.toLocaleString()],['Country accuracy',`${n.country}%`],['Average distance',`${n.avgKm.toLocaleString()} km`],['Average time',`${n.avgTime}s`],['Rounds',n.rounds]];
 $('profileStats').innerHTML=stats.map(([label,value])=>`<article class="stat-card surface"><b>${value}</b><span>${label}</span></article>`).join('');
 const history=Array.isArray(profile.history)?profile.history.slice(0,6):[];
 $('profileHistory').innerHTML=history.length?history.map(item=>`<div class="history-row"><div><b>${escapeHtml(FORMAT_LABELS[item.format]||item.format||'Match')} · ${escapeHtml(POOL_LABELS[item.pool]||item.pool||'World')}</b><small>${new Date(item.date||Date.now()).toLocaleDateString(cfg.lang)} · ${item.rounds||0} rounds · ${item.win?'WIN':'COMPLETE'}</small></div><strong>${Number(item.score||0).toLocaleString()}</strong></div>`).join(''):'<div class="history-row"><div><b>No completed matches yet</b><small>Your first result will appear here.</small></div><strong>—</strong></div>';
 const prefs=Object.entries(profile.choices||{}).sort((a,b)=>b[1]-a[1]).slice(0,5);
 $('profilePreferences').innerHTML=prefs.length?prefs.map(([key,count])=>`<div class="history-row"><div><b>${escapeHtml(FORMAT_LABELS[key]||POOL_LABELS[key]||key)}</b><small>Selected ${count} times</small></div><strong>${count}</strong></div>`).join(''):`<div class="history-row"><div><b>${FORMAT_LABELS[cfg.format]}</b><small>Current preferred format</small></div><strong>${POOL_LABELS[cfg.pool]}</strong></div>`;
 const heat=$('activityHeatmap');heat.innerHTML='';for(let i=0;i<84;i++){const cell=document.createElement('i');cell.title=`Activity day ${i+1}`;heat.appendChild(cell)}
}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
function updateSetup(){
 const format=FORMAT_LABELS[cfg.format],pool=POOL_LABELS[cfg.pool],difficulty=DIFFICULTY_LABELS[cfg.difficulty];
 $('summaryFormat').textContent=format;$('summaryPool').textContent=pool;$('summaryDifficulty').textContent=difficulty;$('launchTitle').textContent=`${format} · ${pool}`;$('launchPreview').style.backgroundImage=`url('${IMAGE_BY_POOL[cfg.pool]}')`;
 $$('#formatChoices [data-format]').forEach(x=>x.classList.toggle('active',x.dataset.format===cfg.format));
 $$('#poolChoices [data-pool]').forEach(x=>x.classList.toggle('active',x.dataset.pool===cfg.pool));
 $$('#difficultyChoices [data-difficulty]').forEach(x=>x.classList.toggle('active',Number(x.dataset.difficulty)===Number(cfg.difficulty)));
 writeJson('geoCfg',cfg)
}
function launchGame(overrides={}){
 cfg=Object.assign(cfg,overrides);writeJson('geoCfg',cfg);
 const params=new URLSearchParams({autostart:'1',return:'app',format:cfg.format,pool:cfg.pool,difficulty:String(cfg.difficulty),lang:cfg.lang});
 location.href=`arena-pro.html?${params.toString()}`
}
function setupLanguageSelects(){
 ['appLanguage'].forEach(id=>{const select=$(id);select.innerHTML='';Object.entries(LANGS).forEach(([code,label])=>select.add(new Option(label,code)));select.value=LANGS[cfg.lang]?cfg.lang:'en';select.onchange=e=>{cfg.lang=e.target.value;writeJson('geoCfg',cfg);document.documentElement.lang=cfg.lang;document.documentElement.dir=cfg.lang==='ar'?'rtl':'ltr';showToast(`Language: ${LANGS[cfg.lang]}`)}})
}
function bindEvents(){
 $$('[data-open-auth]').forEach(el=>el.addEventListener('click',openAuth));
 $$('[data-enter-app]').forEach(el=>el.addEventListener('click',()=>enterApp('hub')));
 $$('[data-scroll-top]').forEach(el=>el.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'})));
 $('authClose').onclick=closeAuth;$('guestLogin').onclick=completeLocalLogin;$('playerName').addEventListener('keydown',e=>{if(e.key==='Enter')completeLocalLogin()});
 $('googleFallback').onclick=()=>googleReady?google.accounts.id.prompt():openOauthNotice();
 $$('[data-close-modal]').forEach(el=>el.onclick=()=>el.closest('.modal').classList.remove('open'));
 $('oauthGuest').onclick=()=>{$('oauthModal').classList.remove('open');$('playerName').focus()};
 $$('[data-app-view]').forEach(el=>el.addEventListener('click',()=>showView(el.dataset.appView)));
 $('backToLanding').onclick=showLanding;$('signOut').onclick=signOut;
 $('formatChoices').onclick=e=>{const b=e.target.closest('[data-format]');if(!b)return;cfg.format=b.dataset.format;updateSetup()};
 $('poolChoices').onclick=e=>{const b=e.target.closest('[data-pool]');if(!b)return;cfg.pool=b.dataset.pool;updateSetup()};
 $('difficultyChoices').onclick=e=>{const b=e.target.closest('[data-difficulty]');if(!b)return;cfg.difficulty=Number(b.dataset.difficulty);updateSetup()};
 $('launchGame').onclick=()=>launchGame();
 $$('[data-quick-duel]').forEach(el=>el.onclick=()=>launchGame({format:'duel',pool:'smart',difficulty:2}));
 $$('[data-launch-daily]').forEach(el=>el.onclick=()=>launchGame({format:'classic',pool:'smart',difficulty:2}));
 $$('[data-demo-action]').forEach(el=>el.onclick=()=>showToast('This social action requires the multiplayer backend.'));
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAuth();$('oauthModal').classList.remove('open')}})
}
function setupMotion(){
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
 $$('.reveal').forEach(el=>observer.observe(el));
 $$('.feature-card,.mode-showcase,.dash-card').forEach(card=>{
   card.addEventListener('pointermove',e=>{if(window.innerWidth<900)return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${y*-3}deg) rotateY(${x*4}deg) translateY(-5px)`});
   card.addEventListener('pointerleave',()=>card.style.transform='')
 });
 let raf=0;window.addEventListener('pointermove',e=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const orbit=document.querySelector('.map-orbit');if(orbit&&window.innerWidth>900)orbit.style.margin=`${(e.clientY/window.innerHeight-.5)*10}px 0 0 ${(e.clientX/window.innerWidth-.5)*10}px`})})
}
function restoreRoute(){
 if(location.hash==='#app'){if(user)enterApp('hub');else openAuth()}
}
function init(){
 bindEvents();setupMotion();setupLanguageSelects();updateSetup();renderProfileData();
 if(user)hydrateUser();
 const googlePoll=setInterval(()=>{if(configureGoogle()||document.readyState==='complete'){clearInterval(googlePoll)}},250);setTimeout(()=>clearInterval(googlePoll),5000);
 restoreRoute();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
