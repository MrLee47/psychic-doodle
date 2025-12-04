// main.js
// Core: UI wiring, rendering, and light glue to existing combat systems.
// Assumes characters.js provided CHARACTERS.

const qs = id => document.getElementById(id);

// UI refs
const menuScreen = qs('menu-screen');
const charSelectScreen = qs('character-select-screen');
const mainGameWrapper = qs('main-game-wrapper');

const newGameBtn = qs('new-game-btn');
const openSettingsMenuBtn = qs('open-settings-menu-btn');
const settingsPanel = qs('settings-panel');
const closeSettingsBtn = qs('close-settings-btn');
const themeOptionBtns = document.querySelectorAll('.theme-option-btn');

const dialogueText = qs('dialogue-text');
const actionButtonsDiv = qs('action-buttons');
const combatLog = qs('combat-log');
const logColumn = qs('log-column');

const playerHPBar = qs('player-hp-bar');
const playerHPText = qs('player-hp-text');
const playerNameEl = qs('player-name');
const playerPortrait = qs('player-portrait');
const playerInfoBtn = qs('player-info-btn');

const enemyHPBar = qs('enemy-hp-bar');
const enemyHPText = qs('enemy-hp-text');
const enemyNameEl = qs('enemy-name');

const abilityButtonsRow = qs('ability-buttons-row');
const inventoryDisplayCompact = qs('inventory-display-compact');
const inventoryList = qs('inventory-list');

const characterList = qs('character-list');
const startCombatBtn = qs('start-combat-btn');

const abilityInfoList = qs('ability-info-list');
const charInfoModal = qs('character-info-modal');
const closeCharInfoBtn = qs('close-character-info');

const areaDisplay = qs('area-display');
const areaDesc = qs('area-desc');
const roomProgressDisplay = qs('room-progress-display');

const passTurnBtn = qs('pass-turn-btn');

const clashVisualizer = qs('clash-visualizer');

// minimal helpers
const rollDie = max => Math.floor(Math.random()*max) + 1;
const rollCoins = count => { let s=0; for(let i=0;i<count;i++) s += (Math.random()<0.5?0:1); return s; };

let gameState = {
    currentView: 'menu',
    player: null,
    enemy: null,
    turn: 1,
    dungeonState: { currentAreaId:'erebos', roomsCleared:0, inventory:[], unlockedAbilities:[] }
};

// ENEMY templates for quick start (kept small)
const ENEMY_TEMPLATES = {
    goblin: { id:'goblin', name:'Gravel-Claw Goblin', baseStats:{ maxHP:80, currentHP:80, defense:2, effects:[], speed:2 }, abilities:[ { name:'Gnaw Attack', type:'ATTACK', baseAttack:5, dice:6, coins:2, description:'Nibble on you.' } ] },
    skeleton: { id:'skeleton', name:'Decaying Skeleton', baseStats:{ maxHP:60, currentHP:60, defense:1, effects:[], speed:3 }, abilities:[ { name:'Bone Bash', type:'ATTACK', baseAttack:4, dice:4, coins:1, description:'A brittle strike.' } ] }
};

// --- Logging (auto-scroll to bottom if already at bottom) ---
function log(message, cls='') {
    const atBottom = combatLog.scrollHeight - combatLog.clientHeight <= combatLog.scrollTop + 2;
    const p = document.createElement('div');
    p.className = `log-entry ${cls}`;
    p.textContent = `[T${gameState.turn}] ${message}`;
    combatLog.appendChild(p);
    while (combatLog.children.length > 120) combatLog.removeChild(combatLog.firstChild);
    if (atBottom) combatLog.scrollTop = combatLog.scrollHeight;
}

// --- Portrait update (staged images: 0..3) ---
function updatePortrait() {
    if (!gameState.player) return;
    const hp = gameState.player.baseStats.currentHP;
    const max = gameState.player.baseStats.maxHP;
    const ratio = hp / Math.max(1,max);
    let stage = 0;
    if (ratio < 0.25) stage = 3;
    else if (ratio < 0.5) stage = 2;
    else if (ratio < 0.75) stage = 1;
    // image files should be at img/player_stage_0..3.png
    playerPortrait.src = `img/player_stage_${stage}.png`;
}

// --- Update health UI for both ---
function updateHealthDisplay(entity, type='player') {
    if (!entity) return;
    const max = entity.baseStats.maxHP;
    const cur = entity.baseStats.currentHP;
    const pct = Math.max(0, Math.floor((cur / max) * 100));
    if (type === 'player') {
        playerHPBar.style.width = `${pct}%`;
        playerHPText.textContent = `${cur}/${max}`;
    } else {
        enemyHPBar.style.width = `${pct}%`;
        enemyHPText.textContent = `${cur}/${max}`;
    }
    updatePortrait();
}

// --- Render inventory compact ---
function renderInventory() {
    inventoryDisplayCompact.innerHTML = '';
    inventoryList.innerHTML = '';
    const inv = gameState.dungeonState.inventory || [];
    if (!inv.length) {
        inventoryList.innerHTML = '<li class="text-gray-600">No items found yet.</li>';
    } else {
        inv.forEach(it => {
            const node = document.createElement('div');
            node.className = 'inventory-item';
            node.textContent = `${it.name} x${it.qty || 1}`;
            inventoryDisplayCompact.appendChild(node);
            const li = document.createElement('li');
            li.innerHTML = `<strong>${it.name}</strong>: ${it.description || ''} (x${it.qty||1})`;
            inventoryList.appendChild(li);
        });
    }
}

// --- Character selection screen ---
function renderCharacterSelection() {
    characterList.innerHTML = '';
    let selectedId = null;
    CHARACTERS.forEach(ch => {
        const card = document.createElement('div');
        card.className = 'char-card section-box';
        card.dataset.id = ch.id;
        card.innerHTML = `<h4>${ch.name}</h4><p class="text-sm">${ch.description}</p>
            <p class="text-xs"><strong>HP:</strong> ${ch.baseStats.maxHP} | <strong>DEF:</strong> ${ch.baseStats.defense || 0} | <strong>SPD:</strong> ${ch.baseStats.speed || 0}</p>
            <p class="text-xs"><strong>Passive:</strong> ${ch.uniquePassive?.name || '—'}</p>`;
        card.addEventListener('click', () => {
            document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected'));
            card.classList.add('selected');
            selectedId = ch.id;
            startCombatBtn.classList.remove('hidden');
        });
        characterList.appendChild(card);
    });
    startCombatBtn.onclick = () => {
        if (selectedId) startNewGame(selectedId);
    };
}

// Create deep clone and normalize baseStats
function createEntityFromTemplate(template) {
    const copy = JSON.parse(JSON.stringify(template));
    copy.baseStats = Object.assign({
        maxHP:100, currentHP:100, defense:0, level:1, effects:[], speed:0, gender:'Male'
    }, copy.baseStats || {});
    // ensure currentHP exists
    copy.baseStats.currentHP = copy.baseStats.currentHP || copy.baseStats.maxHP;
    return copy;
}

// --- Start new game (initializes player & first enemy for demo) ---
function startNewGame(charId) {
    const template = CHARACTERS.find(c=>c.id===charId);
    if (!template) return;
    gameState.player = createEntityFromTemplate(template);
    // pick a random enemy for the first encounter
    const enemyTemplate = ENEMY_TEMPLATES['goblin'];
    gameState.enemy = createEntityFromTemplate(enemyTemplate);
    // update UI
    playerNameEl.textContent = gameState.player.name;
    enemyNameEl.textContent = gameState.enemy.name;
    areaDesc.textContent = "The air is thick with tension. A hideous creature blocks your path!";
    renderInventory();
    updateHealthDisplay(gameState.player,'player');
    updateHealthDisplay(gameState.enemy,'enemy');
    renderAbilityButtons();
    log(`Welcome, ${gameState.player.name}. A ${gameState.enemy.name} appears!`, 'log-special');
    setView('combat');
}

// --- view switching ---
function setView(viewName) {
    gameState.currentView = viewName;
    menuScreen.style.display = viewName==='menu' ? 'block':'none';
    charSelectScreen.style.display = viewName==='select' ? 'block':'none';
    mainGameWrapper.style.display = viewName==='combat' || viewName==='dungeon' ? 'block':'none';
}

// --- Render ability buttons (hover shows description via data-description) ---
function renderAbilityButtons() {
    abilityButtonsRow.innerHTML = '';
    if (!gameState.player) return;
    const abilities = gameState.player.abilities.filter(a => !a.isHidden);
    abilities.forEach(ability => {
        const btn = document.createElement('button');
        btn.className = 'ability-btn';
        btn.textContent = ability.name;
        btn.setAttribute('data-description', ability.description || 'No description available.');
        btn.onclick = () => {
            // choose and execute
            log(`${gameState.player.name} chooses ${ability.name}...`, 'log-special');
            executePlayerAbility(ability);
        };
        abilityButtonsRow.appendChild(btn);
    });
    // disable if playerAction pending (not implemented here)
}

// --- Show character info modal (list abilities with desc) ---
function openCharacterInfo() {
    abilityInfoList.innerHTML = '';
    if (!gameState.player) return;
    gameState.player.abilities.forEach(a => {
        const row = document.createElement('div');
        row.style.marginBottom = '8px';
        row.innerHTML = `<strong>${a.name}</strong><div style="font-size:0.9rem;color:var(--text-color);">${a.description||'—'}</div>`;
        abilityInfoList.appendChild(row);
    });
    charInfoModal.classList.remove('hidden');
}
closeCharInfoBtn.onclick = () => charInfoModal.classList.add('hidden');
playerInfoBtn.onclick = () => openCharacterInfo();

// --- Basic ability execution (keeps your original mechanics; simplified) ---
function executePlayerAbility(ability) {
    if (!gameState.enemy) return;
    // For the purposes of UI, show simple attack resolution for ATTACK types, else simple messages.
    if (ability.type === 'ATTACK') {
        const dice = ability.dice || 1;
        const droll = rollDie(dice);
        const coins = rollCoins(ability.coins || 0);
        const damage = Math.max(0, (ability.baseAttack || 0) + coins - (gameState.enemy.baseStats.defense || 0));
        gameState.enemy.baseStats.currentHP = Math.max(0, gameState.enemy.baseStats.currentHP - damage);
        log(`${gameState.player.name} rolls D${dice}:${droll} + Coins:${coins} => deals ${damage} ${ability.damageType || ''}`, 'log-damage');
        updateHealthDisplay(gameState.enemy,'enemy');
        if (gameState.enemy.baseStats.currentHP <= 0) {
            log(`${gameState.enemy.name} falls!`, 'log-win');
            setTimeout(()=> {
                // skip to next room (simple)
                log('You take a breath and continue deeper...', 'log-special');
                // For now, spawn a fresh enemy for demo
                const newEnemy = ENEMY_TEMPLATES['skeleton'];
                gameState.enemy = createEntityFromTemplate(newEnemy);
                enemyNameEl.textContent = gameState.enemy.name;
                updateHealthDisplay(gameState.enemy,'enemy');
                renderAbilityButtons();
            }, 900);
        }
    } else if (ability.type === 'DEFENSE') {
        // grant negate effect
        gameState.player.baseStats.effects = gameState.player.baseStats.effects || [];
        if (ability.defenseEffect === 'NegateNextHit') {
            gameState.player.baseStats.effects.push('NegateNextHit');
            log(`${gameState.player.name} phases and will negate the next hit.`, 'log-special');
        }
    } else if (ability.type === 'SWITCH') {
        // handle zectus cycle as small example
        gameState.player.baseStats.tri_sword_state = (gameState.player.baseStats.tri_sword_state === 'Scythe') ? 'Trident' : (gameState.player.baseStats.tri_sword_state === 'Trident' ? 'Hammer' : 'Scythe');
        log(`${gameState.player.name} cycles weapon to ${gameState.player.baseStats.tri_sword_state}.`, 'log-special');
    } else if (ability.type === 'SPECIAL') {
        // Grapple example
        if (ability.name === 'Grapple') {
            const atkRoll = rollDie(ability.dice || 10);
            const tgtRoll = rollDie(gameState.enemy.baseStats.grapple_die || 8);
            log(`Grapple: ${atkRoll} vs ${tgtRoll}`, 'log-special');
            if (atkRoll > tgtRoll) {
                gameState.enemy.baseStats.effects = gameState.enemy.baseStats.effects || [];
                gameState.enemy.baseStats.effects.push('Grappled');
                log(`${gameState.enemy.name} is Grappled and will auto-lose next clash.`, 'log-win');
            } else log('Grapple failed.', 'log-loss');
        }
    }
    // post action cleanup
    updateHealthDisplay(gameState.player,'player');
    renderInventory();
}

// --- initial wiring & UI boot ---
function init() {
    // menu
    newGameBtn.onclick = () => { setView('select'); renderCharacterSelection(); };
    openSettingsMenuBtn.onclick = () => settingsPanel.classList.toggle('open');
    closeSettingsBtn && (closeSettingsBtn.onclick = () => settingsPanel.classList.remove('open'));
    themeOptionBtns.forEach(b => b.onclick = () => document.body.className = b.dataset.theme + '-theme');

    // char info close
    closeCharInfoBtn && (closeCharInfoBtn.onclick = () => charInfoModal.classList.add('hidden'));

    // start in menu
    setView('menu');
}

window.onload = init;
