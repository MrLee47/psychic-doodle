// updated makeEventLogSidebar()
function makeEventLogSidebar(){
  const logContainer = safe('log-scroll-container');
  if(!logContainer) return;

  // Ensure the CSS class is present
  logContainer.classList.add('event-log-sidebar');

  const mq = window.matchMedia('(min-width: 1024px)');
  function applyPos(m){
    const wrapper = document.getElementById('main-game-wrapper');
    if(m.matches){
      // center vertically using top: 50% + translateY(-50%) (CSS already handles this for .event-log-sidebar)
      Object.assign(logContainer.style, {
        position: 'fixed',
        right: '1rem',
        top: '50%',
        transform: 'translateY(-50%)',
        width: getComputedStyle(document.documentElement).getPropertyValue('--compact-log-width') || '260px',
        maxHeight: '80vh',
        zIndex: 40,
        overflowY: 'auto',
      });
      // Give main content a right margin to avoid overlap
      if(wrapper) wrapper.classList.add('sidebar-offset');
    } else {
      // revert to normal flow on small screens
      logContainer.style.position = '';
      logContainer.style.right = '';
      logContainer.style.top = '';
      logContainer.style.transform = '';
      logContainer.style.width = '';
      logContainer.style.maxHeight = '';
      logContainer.style.zIndex = '';
      logContainer.style.overflowY = '';
      if(wrapper) wrapper.classList.remove('sidebar-offset');
    }
  }
  applyPos(mq);
  // prefer addEventListener if supported
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', applyPos);
  else mq.addListener(applyPos);
}
