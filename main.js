/* -------------------------------------------------------
   Chronicles of Heroes: Modular Game & Combat Core
   -------------------------------------------------------
   Features:
   - Theme Switching
   - Character Selection
   - Coin & Dice Clash Combat
   - Modular, reusable functions for abilities, clash, and damage
------------------------------------------------------- */

// ----------------- GLOBAL STATE -----------------
const gameState = {
    isGameStarted: false,
    currentView: 'menu',
    player: null,
    enemy: null,
    currentTheme: 'default',
    turn: 1,
    playerAction: null,
    enemyAction: null,
};

// ----------------- DOM REFS -----------------
const $ = (id) => document.getElementById(id);
const body = document.body;
const menuScreen = $('menu-screen');
const gameContainer = $('game-container');
const charSelectScreen = $('character-select-screen');

const newGameBtn = $('new-game-btn');
const loadGameBtn = $('load-game-btn');
const openSettingsBtn = $('open-settings-menu-btn');
const settingsPanel = $('settings-panel');
const closeSettingsBtn = $('close-settings-btn');
const themeOptionBtns = document.querySelectorAll('.theme-option-btn');

const dialogueText = $('dialogue-text');
const actionButtonsDiv = $('action-buttons');
const combatLog = $('combat-log');
const passTurnBtn = $('pass-turn-btn');

const playerStatus = {
    name: $('player-name'),
    hpBar: $('player-hp-bar'),
    hpText: $('player-hp-text'),
    statusText: $('player-status-text'),
};

const enemyStatus = {
    name: $('enemy-name'),
    hpBar: $('enemy-hp-bar'),
    hpText: $('enemy-hp-text'),
    statusText: $('enemy-status-text'),
};

// ----------------- UTILITY -----------------
const rollDie = (max) => Math.floor(Math.random() * max) + 1;
const rollCoins = (count) => [...Array(count)].reduce((sum) => sum + (Math.random() < 0.5 ? 0 : 1), 0);

const log = (msg, className = '') => {
    const p = document.createElement('p');
    p.className = `log-entry ${className}`;
    p.textContent = `[T${gameState.turn}] ${msg}`;
    combatLog.prepend(p);
    while (combatLog.children.length > 50) combatLog.removeChild(combatLog.lastChild);
};

const applyTheme = (theme) => {
    body.className = '';
    body.classList.add(`${theme}-theme`);
    localStorage.setItem('gameTheme', theme);
    gameState.currentTheme = theme;
};

// ----------------- VIEW -----------------
const setView = (view) => {
    ['menu', 'select', 'combat'].forEach(v => $(v + '-screen').classList.add('hidden'));
    gameState.currentView = view;
    if (view === 'menu') menuScreen.classList.remove('hidden');
    else if (view === 'select') { charSelectScreen.classList.remove('hidden'); renderCharacterSelection(); }
    else if (view === 'combat') { gameContainer.classList.remove('hidden'); updateCombatUI(); renderCombatActions(); }
};

// ----------------- CHARACTER SELECTION -----------------
const renderCharacterSelection = () => {
    const charList = $('character-list');
    charList.innerHTML = '';
    let selectedCharId = null;

    CHARACTERS.forEach(char => {
        const card = document.createElement('div');
        card.className = 'char-card';
        card.dataset.id = char.id;
        card.innerHTML = `
            <h4>${char.name}</h4>
            <p>${char.description}</p>
            <p><strong>HP:</strong>${char.baseStats.maxHP} <strong>DEF:</strong>${char.baseStats.defense} <strong>SPD:</strong>${char.baseStats.speed}</p>
            <p><strong>Passive:</strong>${char.uniquePassive.name}</p>
        `;
        card.addEventListener('click', () => {
            document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedCharId = char.id;
            $('start-combat-btn').classList.remove('hidden');
        });
        charList.appendChild(card);
    });

    $('start-combat-btn').onclick = () => { if (selectedCharId) startNewGame(selectedCharId); };
};

// ----------------- GAME START -----------------
const startNewGame = (charId) => {
    const selectedChar = CHARACTERS.find(c => c.id === charId);
    const commonBaseStats = { maxHP: 100, currentHP: 100, defense: 0, level: 1, status: 'Alive', speed: 0, consecutive_rounds: 0, effects: [], isGrappling: false, grapple_die: 8, lastDamageTaken: 0, tri_sword_state: 'Scythe', gender: 'Male' };

    gameState.player = { ...JSON.parse(JSON.stringify(selectedChar)), baseStats: { ...commonBaseStats, ...selectedChar.baseStats, currentHP: selectedChar.baseStats.maxHP } };
    gameState.enemy = { ...JSON.parse(JSON.stringify(ENEMY_GOBLIN)), baseStats: { ...commonBaseStats, ...ENEMY_GOBLIN.baseStats, currentHP: ENEMY_GOBLIN.baseStats.maxHP } };

    gameState.turn = 1;
    gameState.playerAction = null;
    gameState.enemyAction = null;

    combatLog.innerHTML = '';
    dialogueText.textContent = `A powerful champion, ${gameState.player.name}, steps forward!`;
    setView('combat');
    log(`${gameState.enemy.name} challenges ${gameState.player.name}!`, 'log-special');
};

// ----------------- COMBAT -----------------
const updateHealthDisplay = (entity, ui) => {
    const { maxHP, currentHP, status, effects } = entity.baseStats;
    const pct = Math.max(0, (currentHP / maxHP) * 100);
    ui.hpBar.style.width = `${pct}%`;
    ui.hpText.textContent = `${currentHP}/${maxHP}`;
    ui.statusText.textContent = status + (effects.length ? ` (${effects.join(', ')})` : '');
    if (currentHP <= 0) ui.statusText.textContent = 'Defeated';
};

const updateCombatUI = () => {
    updateHealthDisplay(gameState.player, playerStatus);
    updateHealthDisplay(gameState.enemy, enemyStatus);
    playerStatus.name.textContent = gameState.player.name;
    enemyStatus.name.textContent = gameState.enemy.name;
    passTurnBtn.classList.add('hidden');
    actionButtonsDiv.querySelectorAll('button').forEach(b => b.disabled = !!gameState.playerAction);
};

// Resolves a single ability
const executeSingleAction = (attacker, ability, target) => {
    if (!ability || target.baseStats.currentHP <= 0) return;

    if (ability.type === 'DEFENSE') {
        if (ability.defenseEffect === 'NegateNextHit') target.baseStats.effects.push('NegateNextHit');
        log(`${attacker.name} executes a defensive maneuver!`, 'log-win');

    } else if (ability.type === 'SPECIAL' && ability.name === 'Grapple') {
        const roll = rollDie(ability.dice), targetRoll = rollDie(target.baseStats.grapple_die);
        if (roll > targetRoll) { target.baseStats.effects.push('Grappled'); log(`${attacker.name} grapples ${target.name}!`, 'log-win'); }
        else log(`${attacker.name} fails to grapple ${target.name}.`, 'log-loss');

    } else if (ability.type === 'SWITCH') {
        const weapons = ['Scythe','Trident','Hammer'];
        let idx = weapons.indexOf(attacker.baseStats.tri_sword_state);
        attacker.baseStats.tri_sword_state = weapons[(idx+1)%3];
        const dmg = ability.baseAttack || 2;
        target.baseStats.currentHP = Math.max(0,target.baseStats.currentHP - dmg);
        log(`${attacker.name} cycles weapon to ${attacker.baseStats.tri_sword_state} and deals ${dmg} dmg!`, 'log-win');

    } else if (ability.type === 'ATTACK') {
        let coins = rollCoins(ability.coins);
        let dice = rollDie(ability.dice);
        applyDamage(ability, attacker, target, coins, dice);
        if (ability.statusEffect === 'Stagger') { target.baseStats.effects.push('Stagger'); log(`${target.name} is Staggered!`, 'log-loss'); }
    }
};

// Apply damage (called by Clash or single action)
const applyDamage = (ability, attacker, target, coinBonus = rollCoins(ability.coins), diceRoll = rollDie(ability.dice)) => {
    if (!target.baseStats.effects) target.baseStats.effects = [];
    let dmg = Math.max(0, (ability.baseAttack||0) + coinBonus - target.baseStats.defense);
    if (target.baseStats.effects.includes('NegateNextHit')) { log(`${target.name} Phases!`, 'log-win'); dmg=0; target.baseStats.effects = target.baseStats.effects.filter(e=>e!=='NegateNextHit'); }
    target.baseStats.currentHP = Math.max(0, target.baseStats.currentHP - dmg);
    log(`${attacker.name} hits for ${dmg} (${ability.damageType})`, 'log-damage');

    if (target.id==='shutenmaru') target.baseStats.lastDamageTaken=dmg;
    if (attacker.id==='shutenmaru' && attacker.uniquePassive.type==='RollTrigger' && diceRoll===attacker.uniquePassive.triggerValue){
        let heal=target.baseStats.lastDamageTaken;
        attacker.baseStats.currentHP=Math.min(attacker.baseStats.maxHP, attacker.baseStats.currentHP+heal);
        log(`Chrono-Fist heals ${heal} HP!`, 'log-win');
    }

    if (ability.name==='Piledriver') { target.baseStats.effects = target.baseStats.effects.filter(e=>'Grappled'); attacker.baseStats.isGrappling=false; log(`${target.name} released from Grapple`,'log-special'); }
};

// ----------------- INITIALIZATION -----------------
const init = () => {
    applyTheme(localStorage.getItem('gameTheme')||'default');
    setView('menu');
    newGameBtn.onclick = () => setView('select');
    openSettingsBtn.onclick = closeSettingsBtn.onclick = () => settingsPanel.classList.toggle('open');
    themeOptionBtns.forEach(btn => btn.onclick = () => applyTheme(btn.dataset.theme));
};
window.onload = init;
