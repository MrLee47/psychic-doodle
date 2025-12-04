// --- NEW/UPDATED DOM REFERENCES ---
const logScrollContainer = document.getElementById('log-scroll-container');
const combatLog = document.getElementById('combat-log');

const abilitiesMini = document.getElementById('abilities-mini');
const abilityTooltip = document.getElementById('ability-tooltip');
const charInfoBtn = document.getElementById('char-info-btn');
const charInfoModal = document.getElementById('char-info-modal');
const charInfoClose = document.getElementById('char-info-close');
const charInfoContent = document.getElementById('char-info-content');
const playerPortrait = document.getElementById('player-portrait');
const roomDesc = document.getElementById('room-desc');

// --- UPDATE updateHealthDisplay to change portrait emoji based on HP% ---
function updateHealthDisplay(entity, ui) {
    const maxHP = entity.baseStats.maxHP;
    const currentHP = entity.baseStats.currentHP;
    const percentage = Math.max(0, (currentHP / maxHP) * 100);

    ui.hpBar.style.width = `${percentage}%`;
    ui.hpText.textContent = `${currentHP}/${maxHP}`;

    const effects = entity.baseStats.effects;
    let statusDisplay = entity.baseStats.status;
    if (effects.length > 0) statusDisplay += ` (${effects.join(', ')})`;

    ui.statusText.textContent = statusDisplay;
    if (currentHP <= 0) {
        ui.hpBar.style.width = '0%';
        ui.statusText.textContent = 'Defeated';
    }

    // If updating player portrait:
    if (ui === playerStatus) {
        // Simple emoji states; replace with images if you add assets
        let emoji = '🛡️';
        if (percentage <= 33) emoji = '💀';
        else if (percentage <= 66) emoji = '😟';
        else emoji = '🙂';
        playerPortrait.innerText = emoji;
    }
}

// --- Abilities rendering + hover tooltip integration ---
function renderInventoryAndAbilities() {
    // Inventory unchanged
    inventoryList.innerHTML = '';
    if (!gameState.dungeonState || gameState.dungeonState.inventory.length === 0) {
        inventoryList.innerHTML = '<li class="text-gray-600">No items found yet.</li>';
    } else {
        gameState.dungeonState.inventory.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${item.name}</strong> (x${item.qty}): ${item.description}`;
            inventoryList.appendChild(li);
        });
    }

    // Abilities: render tiny chips that show tooltip on hover
    abilitiesMini.innerHTML = '';
    const allAbilities = gameState.player.abilities.filter(a => !a.isHidden);
    allAbilities.forEach(a => {
        const chip = document.createElement('div');
        chip.className = 'ability-chip';
        chip.tabIndex = 0;
        chip.textContent = a.name;
        chip.dataset.desc = a.description || (a.effect ? a.effect : (a.damageType ? `${a.damageType} attack` : ''));
        chip.addEventListener('mouseenter', (e) => {
            abilityTooltip.innerText = chip.dataset.desc;
            abilityTooltip.style.display = 'block';
            abilityTooltip.setAttribute('aria-hidden', 'false');
            // position tooltip near chip
            const r = chip.getBoundingClientRect();
            abilityTooltip.style.left = `${r.right + 8}px`;
            abilityTooltip.style.top = `${r.top}px`;
        });
        chip.addEventListener('mouseleave', () => {
            abilityTooltip.style.display = 'none';
            abilityTooltip.setAttribute('aria-hidden', 'true');
        });
        chip.addEventListener('focus', (e) => { chip.dispatchEvent(new Event('mouseenter')); });
        chip.addEventListener('blur', (e) => { chip.dispatchEvent(new Event('mouseleave')); });

        // Also clicking the chip can select/use the ability if desired (optional)
        abilitiesMini.appendChild(chip);
    });

    // Fill character info modal content for the Info button
    if (gameState.player) {
        charInfoContent.innerHTML = '';
        const header = document.createElement('p');
        header.className = 'font-bold';
        header.textContent = `${gameState.player.name}'s Abilities:`;
        charInfoContent.appendChild(header);

        gameState.player.abilities.forEach(a => {
            const abDiv = document.createElement('div');
            abDiv.className = 'p-1 border-b';
            abDiv.innerHTML = `<strong>${a.name}</strong> <div class="text-sm mt-1">${a.description || a.effect || 'No description'}</div>`;
            charInfoContent.appendChild(abDiv);
        });
    }
}

// --- Character Info modal handlers ---
charInfoBtn && charInfoBtn.addEventListener('click', () => {
    if (!gameState.player) return;
    charInfoModal.style.display = 'flex';
    charInfoModal.setAttribute('aria-hidden', 'false');
});

charInfoClose && charInfoClose.addEventListener('click', () => {
    charInfoModal.style.display = 'none';
    charInfoModal.setAttribute('aria-hidden', 'true');
});

// Close modal with Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && charInfoModal && charInfoModal.style.display === 'flex') {
        charInfoModal.style.display = 'none';
        charInfoModal.setAttribute('aria-hidden', 'true');
    }
});

// Update room description when moving or entering rooms
function updateCombatUI() {
    // ... keep existing updates at top (hp bars etc.)
    if (gameState.enemy) {
        updateHealthDisplay(gameState.enemy, enemyStatus);
        enemyStatus.name.textContent = gameState.enemy.name;
        enemySpriteName.textContent = gameState.enemy.name;
        enemyStatusCard.classList.remove('hidden');
        visualContext.textContent = `VS ${gameState.enemy.name} | Turn ${gameState.turn}`;
        enemySprite.classList.remove('hidden');
    } else {
        enemyStatusCard.classList.add('hidden');
        visualContext.textContent = `In the dungeon: Room ${gameState.dungeonState.roomsCleared + 1}`;
        enemySprite.classList.add('hidden');
    }

    const area = AREA_DATA[gameState.dungeonState.currentAreaId];
    areaDisplay.textContent = `Area: ${area.name}`;
    roomProgressDisplay.textContent = `Room ${gameState.dungeonState.roomsCleared + 1}/${area.totalRooms}`;
    // Show the short description combined in the room header
    roomDesc.textContent = area.roomDescriptions[gameState.dungeonState.currentRoomType] || '';

    renderInventoryAndAbilities();

    // Disable action buttons if an action has been chosen
    const buttons = actionButtonsDiv.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = gameState.playerAction !== null && gameState.currentView === 'combat');
}
