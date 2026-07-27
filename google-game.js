(function(){
'use strict';
const locations=[
{name:'Times Square',city:'New York',country:'United States',lat:40.7580,lng:-73.9855,h:75},
{name:'Eiffel Tower district',city:'Paris',country:'France',lat:48.8584,lng:2.2945,h:35},
{name:'Westminster',city:'London',country:'United Kingdom',lat:51.5007,lng:-0.1246,h:115},
{name:'Shibuya',city:'Tokyo',country:'Japan',lat:35.6595,lng:139.7005,h:20},
{name:'Sydney Harbour',city:'Sydney',country:'Australia',lat:-33.8568,lng:151.2153,h:110},
{name:'Colosseum district',city:'Rome',country:'Italy',lat:41.8902,lng:12.4922,h:220},
{name:'Sagrada Família',city:'Barcelona',country:'Spain',lat:41.4036,lng:2.1744,h:165},
{name:'Central Amsterdam',city:'Amsterdam',country:'Netherlands',lat:52.3702,lng:4.8952,h:80},
{name:'Brandenburg Gate',city:'Berlin',country:'Germany',lat:52.5163,lng:13.3777,h:90},
{name:'Golden Gate',city:'San Francisco',country:'United States',lat:37.8199,lng:-122.4783,h:260},
{name:'Marina Bay',city:'Singapore',country:'Singapore',lat:1.2834,lng:103.8607,h:40},
{name:'Downtown Dubai',city:'Dubai',country:'United Arab Emirates',lat:25.1972,lng:55.2744,h:25},
{name:'Central Cape Town',city:'Cape Town',country:'South Africa',lat:-33.9249,lng:18.4241,h:180},
{name:'Zócalo district',city:'Mexico City',country:'Mexico',lat:19.4326,lng:-99.1332,h:120},
{name:'Central Buenos Aires',city:'Buenos Aires',country:'Argentina',lat:-34.6037,lng:-58.3816,h:50},
{name:'Downtown Toronto',city:'Toronto',country:'Canada',lat:43.6532,lng:-79.3832,h:210},
{name:'Puerta del Sol',city:'Madrid',country:'Spain',lat:40.4168,lng:-3.7038,h:145},
{name:'Old Town Prague',city:'Prague',country:'Czechia',lat:50.0755,lng:14.4378,h:300},
{name:'Central Seoul',city:'Seoul',country:'South Korea',lat:37.5665,lng:126.9780,h:35},
{name:'Central Helsinki',city:'Helsinki',country:'Finland',lat:60.1699,lng:24.9384,h:90}
];
const modes={classic:{name:'World Classic',rounds:5,seconds:90,ranked:false},sprint:{name:'World Sprint',rounds:5,seconds:35,ranked:false},duel:{name:'League Duel',rounds:5,seconds:60,ranked:true},endurance:{name:'Endurance',rounds:10,seconds:120,ranked:false}};
const rivals=[{id:'nova',name:'Nova',flag:'NO',skill:.77},{id:'atlas',name:'Atlas',flag:'DE',skill:.70},{id:'mira',name:'Mira',flag:'JP',skill:.62},{id:'roam',name:'Roam',flag:'BR',skill:.55}];
const $=id=>document.getElementById(id);const screenIds=['home','game','result','final'];
let selectedMode='classic',match=[],roundIndex=0,guess=null,guessMap=null,resultMap=null,guessMarker=null,timerId=null,seconds=0,scores={you:0,nova:0,atlas:0,mira:0,roam:0},roundScores={},profile=loadProfile();
function show(id){screenIds.forEach(x=>$(x).classList.toggle('active',x===id))}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function key(){try{return localStorage.getItem('geoscopeGoogleEmbedKey')||''}catch(_){return''}}
function loadProfile(){try{return JSON.parse(localStorage.getItem('geoscopeProfile')||'null')||{xp:0,coins:0,wins:0}}catch(_){return{xp:0,coins:0,wins:0}}}
function saveProfile(){try{localStorage.setItem('geoscopeProfile',JSON.stringify(profile))}catch(_){}}
function leagueFor(xp){if(xp<1000)return{name:'Bronze III',short:'III',base:0,next:1000,c1:'#6f4e38',c2:'#bf8a5f'};if(xp<2500)return{name:'Silver II',short:'II',base:1000,next:2500,c1:'#68727b',c2:'#cbd1d5'};if(xp<5000)return{name:'Gold I',short:'I',base:2500,next:5000,c1:'#9a6812',c2:'#ffd66b'};if(xp<8000)return{name:'Platinum',short:'P',base:5000,next:8000,c1:'#2b7873',c2:'#75e1d5'};return{name:'Diamond',short:'D',base:8000,next:12000,c1:'#355e91',c2:'#8ac8ff'}}
function renderProfile(){const l=leagueFor(profile.xp),pct=Math.max(0,Math.min(100,(profile.xp-l.base)/(l.next-l.base)*100));$('leagueTop').textContent=l.name.toUpperCase();$('coinsTop').textContent=profile.coins.toLocaleString();$('leagueName').textContent=l.name;$('leagueBadge').textContent=l.short;$('leagueBadge').style.background=`linear-gradient(145deg,${l.c1},${l.c2})`;$('xpText').textContent=`${profile.xp.toLocaleString()} / ${l.next.toLocaleString()} XP`;$('xpFill').style.width=pct+'%'}
function participantData(){return[{id:'you',name:'You',flag:'YOU',skill:1},...rivals]}
function renderHomeRoster(){$('homeRoster').innerHTML=participantData().map((p,i)=>`<div class="player ${p.id==='you'?'you':''}"><div class="avatar">${p.flag}</div><div><b>${p.name}</b><small>${p.id==='you'?'CURRENT PLAYER':'AI RIVAL'}</small></div><strong>#${i+1}</strong></div>`).join('')}
function standings(){return participantData().map(p=>({...p,score:scores[p.id]||0})).sort((a,b)=>b.score-a.score)}
function renderMini(){const list=standings();$('miniBoard').innerHTML=list.map((p,i)=>`<div class="minirow ${p.id==='you'?'me':''}"><span>${i+1}</span><span>${p.name}</span><b>${p.score.toLocaleString()}</b></div>`).join('')}
function renderStandingList(target){$(target).innerHTML=standings().map((p,i)=>`<div class="standing ${p.id==='you'?'me':''}"><b>${i+1}</b><span>${p.name}${p.id==='you'?' · YOU':' · AI'}</span><strong>${p.score.toLocaleString()}</strong></div>`).join('')}
function setup(open){$('setup').classList.toggle('open',open);$('apiKey').value=key();$('keyError').textContent=''}
function mapUrl(loc){const q=new URLSearchParams({key:key(),location:`${loc.lat},${loc.lng}`,heading:String(loc.h||0),pitch:'0',fov:'90'});return'https://www.google.com/maps/embed/v1/streetview?'+q.toString()}
function startMatch(){if(!key()){setup(true);return}const mode=modes[selectedMode];match=shuffle(locations).slice(0,mode.rounds);roundIndex=0;guess=null;scores={you:0,nova:0,atlas:0,mira:0,roam:0};roundScores={};show('game');startRound()}
function startRound(){clearInterval(timerId);guess=null;roundScores={};$('submitGuess').disabled=true;$('coords').textContent='Click anywhere on the map';$('guessPanel').classList.remove('open');if(guessMarker){guessMarker.remove();guessMarker=null}if(guessMap){guessMap.setView([20,0],2,{animate:false})}const loc=match[roundIndex],mode=modes[selectedMode];$('roundLabel').textContent=`${mode.name.toUpperCase()} · ROUND ${roundIndex+1} / ${match.length}`;$('streetView').src=mapUrl(loc);seconds=mode.seconds;updateTimer();timerId=setInterval(()=>{seconds--;updateTimer();if(seconds<=0){clearInterval(timerId);if(!guess)guess={lat:0,lng:0};finishRound(true)}},1000);renderMini()}
function updateTimer(){const m=Math.floor(seconds/60),s=seconds%60;$('timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;$('timer').style.color=seconds<=10?'var(--red)':'var(--green)'}
function ensureGuessMap(){if(guessMap)return;if(!window.L){alert('The map library did not load. Refresh the page.');return}guessMap=L.map('guessMap',{worldCopyJump:true,minZoom:2}).setView([20,0],2);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(guessMap);guessMap.on('click',e=>{guess={lat:e.latlng.lat,lng:e.latlng.lng};if(guessMarker)guessMarker.remove();guessMarker=L.marker(e.latlng,{icon:pinIcon('guesspin')}).addTo(guessMap);$('coords').textContent=`${Math.abs(guess.lat).toFixed(2)}° ${guess.lat>=0?'N':'S'}, ${Math.abs(guess.lng).toFixed(2)}° ${guess.lng>=0?'E':'W'}`;$('submitGuess').disabled=false})}
function pinIcon(cls){return L.divIcon({className:cls,html:'<span class="pinshape"></span>',iconSize:[26,32],iconAnchor:[13,30]})}
function openMap(){ensureGuessMap();if(!guessMap)return;$('guessPanel').classList.add('open');setTimeout(()=>guessMap.invalidateSize(),240)}
function distance(a,b,c,d){const r=x=>x*Math.PI/180,R=6371,dy=r(c-a),dx=r(d-b),h=Math.sin(dy/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dx/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
function scoreFor(km){return Math.max(0,Math.round(5000*Math.exp(-km/1900)))}
function finishRound(timeout){if(!guess)return;clearInterval(timerId);const loc=match[roundIndex],km=distance(guess.lat,guess.lng,loc.lat,loc.lng),userScore=scoreFor(km);roundScores.you=userScore;scores.you+=userScore;rivals.forEach(p=>{const base=2100+p.skill*2300;const variance=(Math.random()-.5)*1900;const bonus=selectedMode==='duel'?250:0;const s=Math.max(150,Math.min(5000,Math.round(base+variance+bonus)));roundScores[p.id]=s;scores[p.id]+=s});$('roundScore').innerHTML=`${userScore.toLocaleString()} <span>/ 5,000</span>`;$('answerPlace').textContent=`${loc.city}, ${loc.country}`;$('answerDistance').textContent=`${Math.round(km).toLocaleString()} km away${timeout?' · time expired':''}`;$('resultTitle').textContent=userScore>4200?'Excellent read.':userScore>2800?'Strong guess.':userScore>1400?'You found the region.':'The world is difficult.';show('result');renderResultMap(loc);renderStandingList('roundStandings')}
function renderResultMap(loc){if(resultMap){resultMap.remove();resultMap=null}resultMap=L.map('resultMap',{zoomControl:true}).setView([20,0],2);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(resultMap);const a=L.latLng(loc.lat,loc.lng),g=L.latLng(guess.lat,guess.lng);L.marker(a,{icon:pinIcon('actualpin')}).addTo(resultMap);L.marker(g,{icon:pinIcon('guesspin')}).addTo(resultMap);L.polyline([a,g],{color:'#c8ff43',weight:3,dashArray:'8 10'}).addTo(resultMap);resultMap.fitBounds(L.latLngBounds(a,g).pad(.35),{maxZoom:7});setTimeout(()=>resultMap.invalidateSize(),100)}
function nextRound(){roundIndex++;if(roundIndex>=match.length){finishMatch();return}show('game');startRound()}
function finishMatch(){const board=standings(),rank=board.findIndex(p=>p.id==='you')+1,total=scores.you,xp=Math.round(total/55)+(6-rank)*40+(selectedMode==='duel'?120:0),coins=Math.round(total/300)+(6-rank)*8;profile.xp+=xp;profile.coins+=coins;if(rank===1)profile.wins++;saveProfile();$('finishPlace').textContent=`${rank}${rank===1?'ST':rank===2?'ND':rank===3?'RD':'TH'} PLACE`;$('totalScore').textContent=total.toLocaleString();$('xpReward').textContent='+'+xp.toLocaleString();$('coinReward').textContent='+'+coins.toLocaleString();$('badgeReward').textContent=rank===1?'★':'◆';renderStandingList('finalBoard');renderProfile();show('final')}
$('modes').addEventListener('click',e=>{const btn=e.target.closest('.mode');if(!btn)return;selectedMode=btn.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('active',x===btn))});
$('startBtn').addEventListener('click',startMatch);$('againBtn').addEventListener('click',startMatch);$('homeBtn').addEventListener('click',()=>show('home'));$('mapTrigger').addEventListener('click',openMap);$('closeMap').addEventListener('click',()=>$('guessPanel').classList.remove('open'));$('submitGuess').addEventListener('click',()=>finishRound(false));$('nextRound').addEventListener('click',nextRound);$('settingsBtn').addEventListener('click',()=>setup(true));
$('saveKey').addEventListener('click',()=>{const v=$('apiKey').value.trim();if(!/^AIza[0-9A-Za-z_-]{20,}$/.test(v)){$('keyError').textContent='This does not look like a Google Maps API key.';return}try{localStorage.setItem('geoscopeGoogleEmbedKey',v)}catch(_){$('keyError').textContent='The browser blocked local storage.';return}setup(false)});
$('keyHelp').addEventListener('click',()=>window.open('https://developers.google.com/maps/documentation/embed/get-api-key','_blank','noopener'));
renderProfile();renderHomeRoster();if(!key())setup(true);
})();
