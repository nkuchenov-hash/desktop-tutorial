(() => {
'use strict';
function returnToHub(){ location.href='geoscope.html#app'; }
if (window.GEOSCOPE_RETURN_TO_APP) {
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-home],#confirmExit');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    returnToHub();
  }, true);
}
function autostart(){
  if (!window.GEOSCOPE_AUTOSTART) return;
  const button=document.getElementById('startBtn');
  if (!button || button.disabled) return;
  button.click();
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(autostart,0));
else setTimeout(autostart,0);
})();
