(function () {
  const abilitiesTooltip = document.getElementById('ability-tooltip');
  const abilitiesModal = document.getElementById('abilities-modal');
  const abilitiesListEl = document.getElementById('abilities-list');
  const abilitiesInfoBtn = document.getElementById('abilities-info-btn');
  const closeAbilitiesModalBtn = document.getElementById('close-abilities-modal');
  const playerPortraitImg = document.getElementById('player-portrait-img');
  const playerPortrait = document.getElementById('player-portrait');
  const logScrollContainer = document.getElementById('log-scroll-container');

  function showAbilityTooltip(targetEl, htmlContent) {
    if (!abilitiesTooltip || !targetEl) return;
    abilitiesTooltip.innerHTML = htmlContent;
    abilitiesTooltip.classList.remove('hidden');
    abilitiesTooltip.setAttribute('aria-hidden', 'false');

    const rect = targetEl.getBoundingClientRect();
    const tooltipRect = abilitiesTooltip.getBoundingClientRect();
    let top = rect.top - tooltipRect.height - 8;
    if (top < 8) top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
    abilitiesTooltip.style.top = `${top}px`;
    abilitiesTooltip.style.left = `${left}px`;
  }

  function hideAbilityTooltip() {
    if (!abilitiesTooltip) return;
    abilitiesTooltip.classList.add('hidden');
    abilitiesTooltip.setAttribute('aria-hidden', 'true');
  }

  function openAbilitiesModal() {
    if (!abilitiesListEl || !window.gameState || !gameState.player) return;
    abilitiesListEl.innerHTML = '';
    const allAbilities = gameState.player.abilities || [];
    allAbilities.forEach(ab => {
      const container = document.createElement('div');
      container.className = 'ability-entry';
      const desc = ab.description || `${ab.type || ''} ${ab.baseAttack ? `— base ${ab.baseAttack}` : ''}`;
      container.innerHTML = `<strong>${ab.name}</strong><div class="ability-desc" style="margin-top:6px">${desc}</div>`;
      abilitiesListEl.appendChild(container);
    });
    abilitiesModal.classList.remove('hidden');
    abilitiesModal.setAttribute('aria-hidden', 'false');
  }

  function closeAbilitiesModal() {
    if (!abilitiesModal) return;
    abilitiesModal.classList.add('hidden');
    abilitiesModal.setAttribute('aria-hidden', 'true');
  }

  if (abilitiesInfoBtn) abilitiesInfoBtn.addEventListener('click', openAbilitiesModal);
  if (closeAbilitiesModalBtn) closeAbilitiesModalBtn.addEventListener('click', closeAbilitiesModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (abilitiesModal && !abilitiesModal.classList.contains('hidden')) closeAbilitiesModal();
      hideAbilityTooltip();
    }
  });

  function attachAbilityHoverHandlers(buttonEl, ability) {
    if (!buttonEl) return;
    const html = `<strong>${ability.name}</strong><div style="font-size:0.9rem;margin-top:6px">${ability.description || ability.type || ''}</div>`;
    buttonEl.addEventListener('mouseenter', () => showAbilityTooltip(buttonEl, html));
    buttonEl.addEventListener('mouseleave', hideAbilityTooltip);
    buttonEl.addEventListener('focus', () => showAbilityTooltip(buttonEl, html));
    buttonEl.addEventListener('blur', hideAbilityTooltip);
  }

  function updatePortraitBasedOnHP(entity) {
    if (!playerPortraitImg || !playerPortrait || !entity) return;
    const hp = entity.baseStats.currentHP;
    const max = entity.baseStats.maxHP || 1;
    const pct = Math.max(0, Math.min(1, hp / max));

    playerPortrait.classList.remove('portrait-damaged-1','portrait-damaged-2','portrait-dead');
    if (pct <= 0) {
      playerPortrait.classList.add('portrait-dead');
      playerPortraitImg.alt = `${entity.name} (defeated)`;
    } else if (pct < 0.35) {
      playerPortrait.classList.add('portrait-damaged-2');
    } else if (pct < 0.7) {
      playerPortrait.classList.add('portrait-damaged-1');
    }

    if (entity.portrait) {
      playerPortraitImg.src = entity.portrait;
      playerPortraitImg.style.display = 'block';
      playerPortrait.innerText = '';
    } else {
      playerPortraitImg.style.display = 'none';
      const emoji = (entity.id === 'striker') ? '🥷' : '🛡️';
      playerPortrait.innerText = emoji;
    }
  }

  window.UIEnhancements = {
    attachAbilityHoverHandlers,
    updatePortraitBasedOnHP,
    openAbilitiesModal,
    closeAbilitiesModal
  };

  if (typeof window.updateCombatUI === 'function') {
    const original = window.updateCombatUI;
    window.updateCombatUI = function () {
      original();
      if (window.gameState && gameState.player) {
        updatePortraitBasedOnHP(gameState.player);
      }
      if (logScrollContainer) {
        const atBottom = logScrollContainer.scrollHeight - logScrollContainer.clientHeight <= logScrollContainer.scrollTop + 1;
        if (atBottom) logScrollContainer.scrollTop = logScrollContainer.scrollHeight;
      }
    };
  }

})();