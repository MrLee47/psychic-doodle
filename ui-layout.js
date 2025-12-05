// ui-layout.js -- non-destructive DOM rearranger + tooltips + character panel
(function(){
  function safe(id){ try { return document.getElementById(id); } catch(e){ return null; } }

  function injectCSSIfMissing(href){
    if(!document.querySelector(`link[href="${href}"]`)){
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.appendChild(l);
    }
  }

  function createIfMissing(id, tag='div', attrs={}){
    let el = document.getElementById(id);
    if(!el){
      el = document.createElement(tag);
      el.id = id;
      Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
      document.body.appendChild(el);
    }
    return el;
  }

  function moveEnemyStatusAboveAnimation(){
    const enemyStatus = safe('enemy-status-card');
    const visuals = safe('visuals-panel');
    const animation = safe('animation-slot');
    if(enemyStatus && visuals && animation){
      // place enemyStatus at top of visuals (above animation slot)
      visuals.insertBefore(enemyStatus, animation);
      // make HP bars smaller by ensuring CSS rule applies (ui-layout.css already set)
      enemyStatus.classList.add('compact-status');
    }
  }

  function makeEventLogSidebar(){
    const logContainer = safe('log-scroll-container');
    if(!logContainer) return;
    // Add CSS class to style as sidebar; also apply a fixed position on wide screens
    logContainer.classList.add('event-log-sidebar');
    // set inline fallback style so it appears pinned on desktop without changing DOM structure
    const mq = window.matchMedia('(min-width: 1024px)');
    function applyPos(m){
      if(m.matches){
        Object.assign(logContainer.style, {
          position: 'fixed',
          right: '1rem',
          top: '4rem',
          width: getComputedStyle(document.documentElement).getPropertyValue('--compact-log-width') || '280px',
          height: `calc(100vh - 6rem)`,
          zIndex: 40
        });
      } else {
        logContainer.style.position = '';
        logContainer.style.right = '';
        logContainer.style.top = '';
        logContainer.style.width = '';
        logContainer.style.height = '';
        logContainer.style.zIndex = '';
      }
    }
    applyPos(mq);
    mq.addListener(applyPos);
  }

  function combineAreaAndDialogue(){
    const roomInfo = safe('room-info-card');
    const dialogue = safe('dialogue-text') && safe('dialogue-text').closest('.section-box') || safe('dialogue-text');
    if(!roomInfo || !dialogue) return;
    // create combined container
    let combined = document.getElementById('combined-area');
    if(!combined){
      combined = document.createElement('div');
      combined.id = 'combined-area';
      combined.classList.add('section-box');
      // Insert combined where roomInfo was
      roomInfo.parentNode.insertBefore(combined, roomInfo);
    }
    // move roomInfo and dialogue (the actual .section-box for dialogue) inside combined
    combined.appendChild(roomInfo);
    if(dialogue) combined.appendChild(dialogue);
  }

  function compactInventoryAndActions(){
    const inventory = safe('inventory-display');
    const actions = safe('action-buttons');
    if(!inventory || !actions) return;
    let wrapper = document.getElementById('inventory-attacks');
    if(!wrapper){
      wrapper = document.createElement('div');
      wrapper.id = 'inventory-attacks';
      // place wrapper after actions container's parent (the actions section-box)
      const actionsSection = actions.closest('.section-box') || actions.parentNode;
      actionsSection.parentNode.insertBefore(wrapper, actionsSection.nextSibling);
    }
    // move a compact copy of inventory and actions into wrapper
    // we'll actually move the inventory section (full) and create a compact actions box
    wrapper.appendChild(inventory);
    // Create a small actions container inside wrapper and move the action buttons there
    let compactActions = document.getElementById('compact-action-buttons');
    if(!compactActions){
      compactActions = document.createElement('div');
      compactActions.id = 'compact-action-buttons';
      compactActions.className = 'section-box p-2';
      wrapper.appendChild(compactActions);
    }
    // Move action buttons into compactActions (preserve pass-turn)
    compactActions.appendChild(actions.closest('.section-box') || actions.parentNode);
  }

  function buildAbilityCompactUI(){
    // Hide original ability-list (CSS already hides it). Create compact abilities UI from player's abilities.
    const abilityList = safe('ability-list');
    const abilityContainerId = 'abilities-compact';
    let abilitiesCompact = document.getElementById(abilityContainerId);
    if(!abilitiesCompact){
      abilitiesCompact = document.createElement('div');
      abilitiesCompact.id = abilityContainerId;
      abilitiesCompact.className = 'section-box p-2';
      // place it near inventory-attacks
      const wrapper = document.getElementById('inventory-attacks') || safe('inventory-display');
      if(wrapper) wrapper.appendChild(abilitiesCompact);
      else document.getElementById('game-container').appendChild(abilitiesCompact);
    }

    // populate from gameState.player when available (defer if not)
    function populate(){
      abilitiesCompact.innerHTML = '<h4 class="text-sm font-semibold mb-2">Abilities</h4>';
      const list = document.createElement('div');
      list.className = 'ability-compact-list';
      if(window.gameState && gameState.player && Array.isArray(gameState.player.abilities)){
        gameState.player.abilities.filter(a=>!a.isHidden).forEach(a=>{
          const b = document.createElement('button');
          b.className = 'action-btn ability-compact-btn';
          b.textContent = a.name;
          // store description if available
          if(a.description) b.dataset.description = a.description;
          else if(a.effect) b.dataset.description = a.effect;
          else b.dataset.description = '';
          // show tooltip on hover
          b.addEventListener('mouseenter', showAbilityTooltip);
          b.addEventListener('mouseleave', hideAbilityTooltip);
          // click executes ability (preserve existing executeAbility if present)
          b.addEventListener('click', () => {
            if(typeof executeAbility === 'function') executeAbility(a);
          });
          list.appendChild(b);
        });
      } else {
        list.innerHTML = '<div class="text-xs text-gray-500">Character not selected.</div>';
      }
      abilitiesCompact.appendChild(list);

      // add info button to open modal listing all abilities
      const info = document.createElement('button');
      info.id = 'ability-info-btn';
      info.className = 'action-btn mt-2';
      info.textContent = 'View Abilities';
      info.addEventListener('click', openAbilitiesModal);
      abilitiesCompact.appendChild(info);
    }

    // tooltip element
    let tooltip = document.getElementById('ability-tooltip');
    if(!tooltip){
      tooltip = document.createElement('div');
      tooltip.id = 'ability-tooltip';
      tooltip.className = 'ability-tooltip';
      document.body.appendChild(tooltip);
    }

    function showAbilityTooltip(e){
      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      tooltip.style.display = 'block';
      tooltip.innerHTML = btn.dataset.description || btn.title || btn.textContent || 'No description';
      // position to right of button if possible
      const left = rect.right + 10;
      const top = Math.max(8, rect.top);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
    function hideAbilityTooltip(){ tooltip.style.display = 'none'; }

    populate();

    // Provide a public function to refresh abilities when player changes
    window.refreshCompactAbilities = populate;
  }

  function openAbilitiesModal(){
    let modal = document.getElementById('abilities-modal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'abilities-modal';
      modal.className = 'section-box';
      Object.assign(modal.style, {position:'fixed', left:'50%', top:'50%', transform:'translate(-50%,-50%)', zIndex:9999, maxHeight:'80vh', overflowY:'auto', minWidth:'320px'});
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.className = 'action-btn';
      closeBtn.style.float = 'right';
      closeBtn.addEventListener('click', ()=> modal.remove());
      modal.appendChild(closeBtn);
      const title = document.createElement('h3');
      title.textContent = 'Abilities';
      modal.appendChild(title);
      const list = document.createElement('div');
      list.id = 'abilities-modal-list';
      list.style.marginTop = '12px';
      modal.appendChild(list);
      document.body.appendChild(modal);
    }

    // populate
    const list = document.getElementById('abilities-modal-list');
    list.innerHTML = '';
    if(window.gameState && gameState.player && Array.isArray(gameState.player.abilities)){
      gameState.player.abilities.filter(a=>!a.isHidden).forEach(a=>{
        const li = document.createElement('div');
        li.style.marginBottom = '8px';
        li.innerHTML = `<strong>${a.name}</strong> <div class="text-sm text-gray-700">${a.description || a.effect || 'No description available.'}</div>`;
        list.appendChild(li);
      });
    } else {
      list.innerHTML = '<div class="text-sm text-gray-500">No abilities available.</div>';
    }
  }

  function createCharacterPanel(){
    const playerCard = safe('player-status-card');
    if(!playerCard) return;
    if(document.getElementById('character-panel')) return; // already created

    const panel = document.createElement('div');
    panel.id = 'character-panel';
    // portrait wrapper
    const wrap = document.createElement('div');
    wrap.className = 'char-portrait-wrap';
    const portrait = document.createElement('div');
    portrait.id = 'character-portrait';
    // image element
    const img = document.createElement('img');
    img.id = 'character-portrait-img';
    img.alt = 'Portrait';
    img.style.display = 'none'; // hide until loaded
    portrait.appendChild(img);
    const fallback = document.createElement('div');
    fallback.id = 'character-portrait-fallback';
    fallback.style.fontSize = '32px';
    fallback.style.textAlign = 'center';
    fallback.style.width = '100%';
    fallback.style.height = '100%';
    fallback.textContent = '🛡️';
    portrait.appendChild(fallback);

    const overlay = document.createElement('div');
    overlay.className = 'char-damage-overlay';
    overlay.id = 'char-damage-overlay';
    portrait.appendChild(overlay);

    wrap.appendChild(portrait);
    panel.appendChild(wrap);

    // info button
    const infoBtn = document.createElement('button');
    infoBtn.id = 'character-info-btn';
    infoBtn.textContent = 'Info';
    infoBtn.className = 'action-btn';
    infoBtn.addEventListener('click', openAbilitiesModal);
    panel.appendChild(infoBtn);

    // insert panel at top of player-status-card
    playerCard.insertBefore(panel, playerCard.firstChild);

    // portrait update watcher
    function updatePortrait(){
      if(!(window.gameState && gameState.player && gameState.player.baseStats)) return;
      const p = gameState.player.baseStats;
      const pct = p.maxHP ? Math.max(0, Math.round((p.currentHP / p.maxHP) * 100)) : 100;
      // choose suffix
      let suffix = '_base.png';
      if(pct <= 10) suffix = '_10.png';
      else if(pct <= 25) suffix = '_25.png';
      else if(pct <= 50) suffix = '_50.png';
      // try load portrait from portraits/<id><suffix>
      const id = gameState.player.id || (gameState.player.name && gameState.player.name.toLowerCase());
      if(id){
        const src = `portraits/${id}${suffix}`;
        const imgEl = document.getElementById('character-portrait-img');
        if(imgEl && imgEl.getAttribute('data-src') !== src){
          imgEl.dataset.src = src;
          imgEl.src = src;
          imgEl.onload = () => { imgEl.style.display = 'block'; fallback.style.display = 'none'; };
          imgEl.onerror = () => { imgEl.style.display = 'none'; fallback.style.display = 'block'; };
        }
      }
      // overlay opacity by damage
      const overlayEl = document.getElementById('char-damage-overlay');
      if(overlayEl){
        const op = Math.min(0.75, Math.max(0, (100 - pct) / 100 * 0.8));
        overlayEl.style.opacity = op;
      }
    }

    // run update periodically (safe low-cost)
    setInterval(updatePortrait, 400);
    // also expose refresh
    window.refreshCharacterPortrait = updatePortrait;
  }

  // Initialization
  function init(){
    injectCSSIfMissing('ui-layout.css'); // css file already in repo
    // Delayed to allow original scripts to create elements
    document.addEventListener('DOMContentLoaded', () => {
      try{
        moveEnemyStatusAboveAnimation();
        makeEventLogSidebar();
        combineAreaAndDialogue();
        compactInventoryAndActions();
        buildAbilityCompactUI();
        createCharacterPanel();
        // Refresh ability compact UI when gameState changes (exposed handler can be called by game logic)
        if(typeof window.updateCombatUI === 'function'){
          const original = window.updateCombatUI;
          window.updateCombatUI = function(){
            try{ original(); } catch(e){ console.warn(e); }
            if(window.refreshCompactAbilities) window.refreshCompactAbilities();
            if(window.refreshCharacterPortrait) window.refreshCharacterPortrait();
          };
        }
      }catch(err){
        console.error('ui-layout init failed', err);
      }
    });
  }

  init();
})();
