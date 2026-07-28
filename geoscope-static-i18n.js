(()=>{'use strict';
function language(){try{return JSON.parse(localStorage.getItem('geoCfg')||'{}').lang||'en'}catch{return'en'}}
function apply(){const i18n=window.GeoScopeI18n;if(!i18n)return;const lang=language();const rank=document.querySelector('.currency b');if(rank)rank.textContent=i18n.t(lang,'common.bronze3').toUpperCase();const coordinate=document.querySelector('.coordinate-float');if(coordinate)coordinate.innerHTML=`${i18n.t(lang,'common.round').toUpperCase()} 04 · 00:32<br>2,840 km · ${i18n.t(lang,'arena.distanceTo')}`}
setTimeout(apply,0);document.addEventListener('change',event=>{if(event.target.matches('#landingLanguage,#appLanguage'))setTimeout(apply,0)});new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});
})();
