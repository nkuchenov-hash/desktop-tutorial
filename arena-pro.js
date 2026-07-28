(()=>{'use strict';
const v='20260728-2';
const locales=['en','es','pt','fr','de','ru','zh','ja','ko','ar','hi','id','tr','it','pl'].map(x=>`locale-${x}.js`);
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`${src}?v=${v}`;s.onload=resolve;s.onerror=()=>reject(new Error(`Failed to load ${src}`));document.head.appendChild(s)})}
async function start(){
  const css=document.createElement('link');css.rel='stylesheet';css.href=`arena-v5.css?v=${v}`;document.head.appendChild(css);
  document.body.innerHTML='<section style="position:fixed;inset:0;display:grid;place-items:center;background:#070a0d;color:#f4f7f3;font:18px system-ui">Preparing Street View…</section>';
  window.__GS_ARENA_TEMPLATE=[];
  await script('arena-template-1.js');await script('arena-template-2.js');
  document.body.innerHTML=window.__GS_ARENA_TEMPLATE.join('');delete window.__GS_ARENA_TEMPLATE;
  await script('geoscope-locales-core.js');for(const file of locales)await script(file);await script('geoscope-locales-final.js');await script('arena-v5.js');
}
start().catch(error=>{console.error(error);document.body.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;background:#070a0d;color:#f4f7f3;font:18px system-ui"><div><h1>GeoScope</h1><p>The match interface could not load.</p><a style="color:#caff46" href="geoscope.html#app">Return to game hub</a></div></main>'});
})();
