(()=>{'use strict';
const v='20260728-2';
const css=['geoscope-v2-a.css','geoscope-v2-b.css','geoscope-v2-c.css','geoscope-v2-d.css','geoscope-v2-e.css'];
const templates=['geoscope-template-1.js','geoscope-template-2.js','geoscope-template-3.js','geoscope-template-4.js','geoscope-template-5.js'];
const locales=['en','es','pt','fr','de','ru','zh','ja','ko','ar','hi','id','tr','it','pl'].map(x=>`locale-${x}.js`);
function script(src,optional=false){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`${src}?v=${v}`;s.onload=resolve;s.onerror=optional?resolve:()=>reject(new Error(`Failed to load ${src}`));document.head.appendChild(s)})}
async function start(){
  css.forEach(file=>{const l=document.createElement('link');l.rel='stylesheet';l.href=`${file}?v=${v}`;document.head.appendChild(l)});
  window.__GS_TEMPLATE=[];
  for(const file of templates)await script(file);
  document.body.innerHTML=window.__GS_TEMPLATE.join('');
  delete window.__GS_TEMPLATE;
  const g=document.createElement('script');g.src='https://accounts.google.com/gsi/client';g.async=true;g.defer=true;document.head.appendChild(g);
  await script('auth-config.js',true);
  await script('geoscope-locales-core.js');
  for(const file of locales)await script(file);
  await script('geoscope-locales-final.js');
  await script('geoscope-v2.js');
  await script('geoscope-static-i18n.js');
}
start().catch(error=>{console.error(error);document.body.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;background:#070a0c;color:#f4f7f3;font:18px system-ui"><div><h1>GeoScope</h1><p>The interface could not load. Refresh the page.</p></div></main>`});
})();
