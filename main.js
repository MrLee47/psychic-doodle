/* Chronicles of Heroes: Core Game and Combat Logic - cleaned and fixed version */

/* NOTE:
 - This file is the fixed main.js ready to paste into your repository at main.js.
 - If you'd like me to retry pushing, confirm and ensure I have permission to write to the repo.
*/

/* --- BASIC THEME HELPER (defensive) --- */
function applyTheme(theme) {
  document.body.className = '';
  if (theme) document.body.classList.add(`${theme}-theme`);
  try { localStorage.setItem('gameTheme', theme || 'default'); } catch (e) {}
}

/* --- GLOBAL GAME STATE --- */
let gameState = {
  isGameStarted: false,
  currentView: 'menu', // menu, select, dungeon, combat
  player: null,
  enemy: null,
  turn: 1,
  playerAction: null,
  enemyAction: null,
  dungeonState: {
    currentAreaId: null,
    currentRoomIndex: 0,
    roomsCleared: 0,
    roomsUntilBoss: 5,
    currentRoomType: null,
    inventory: [],
    unlockedAbilities: [],
  }
};

const BASE_CLASH_VALUE = 5;

/* --- DATA TEMPLATES (characters/enemies/areas) --- */
const ENEMY_TEMPLATES = {
  goblin: {
    id: 'goblin',
    name: 'Gravel-Claw Goblin',
    baseStats: { maxHP: 80, defense: 2, level: 1, currentHP: 80, status: 'Alive', effects: [], grapple_die: 6, gender: 'Male', speed: 2 },
    abilities: [
      { name: 'Gnaw Attack', type: 'ATTACK', damageType: 'Physical', baseAttack: 5, dice: 6, coins: 2 },
      { name: 'Defensive Crouch', type: 'DEFENSE', defenseEffect: 'DefensePlusTwo', baseAttack: 0, dice: 0, coins: 0 }
    ]
  },
  skeleton: {
    id: 'skeleton',
    name: 'Decaying Skeleton',
    baseStats: { maxHP: 60, defense: 1, level: 1, currentHP: 60, status: 'Alive', effects: [], grapple_die: 4, gender: 'Male', speed: 3 },
    abilities: [
      { name: 'Bone Bash', type: 'ATTACK', damageType: 'Blunt', baseAttack: 4, dice: 4, coins: 1 }
    ]
  }
};

const AREA_DATA = {
  erebos: {
    name: 'Erebos',
    totalRooms: 6,
    bossRoomIndex: 5,
    roomTypes: ['Combat'],
    enemyPool: ['goblin', 'skeleton'],
    bossId: 'goblin_king',
    roomDescriptions: {
      Combat: 'The air is thick with tension. A hideous creature blocks your path!',
      Empty: 'The room is silent and empty, offering a moment of quiet reflection.',
      Boss: 'The chamber opens into a vast cavern. The mighty Boss awaits!'
    }
  }
};

const CHARACTERS = [
  {
    id: 'striker',
    name: 'Striker',
    description: 'Scales in power the longer the fight goes on.',
    baseStats: { maxHP: 110, defense: 1, level: 1, currentHP: 110, status: 'Alive', consecutive_rounds: 0, effects: [], speed: 4, gender: 'Male' },
    uniquePassive: { name: 'Slow Start', type: 'CoinScaler' },
    abilities: [
      { name: 'Dragon Strike', type: 'ATTACK', damageType: 'Force', baseAttack: 4, dice: 4, coins: 2 },
      { name: 'Heavy Blow', type: 'ATTACK', damageType: 'Force', baseAttack: 10, dice: 12, coins: 0, selfStagger: true, cost: 10 }
    ]
  },
  {
    id: 'shutenmaru',
    name: 'Shuten-Maru',
    description: 'A psycho demon who uses ethereal powers.',
    baseStats: { maxHP: 105, defense: 2, level: 1, currentHP: 105, status: 'Alive', lastDamageTaken: 0, effects: [], speed: 3, gender: 'Female' },
    uniquePassive: { name: 'Chrono-Fist', type: 'RollTrigger', abilityName: 'Ghost Fist', triggerValue: 8 },
    abilities: [
      { name: 'Ghost Fist', type: 'ATTACK', damageType: 'Psychic', baseAttack: 6, dice: 8, coins: 1 },
      { name: 'Phase', type: 'DEFENSE', defenseEffect: 'NegateNextHit', baseAttack: 0, dice: 0, coins: 0, cost: 5 }
    ]
  },
  {
    id: 'balter',
    name: 'Balter',
    description: 'A muscular powerhouse who controls the battlefield.',
    baseStats: { maxHP: 130, defense: 3, level: 1, currentHP: 130, status: 'Alive', isGrappling: false, grapple_die: 8, effects: [], speed: 1, gender: 'Male' },
    uniquePassive: { name: 'The Old One-Two', type: 'ClashWinBonus', dice: 10 },
    abilities: [
      { name: 'Haymaker', type: 'ATTACK', damageType: 'Physical', baseAttack: 7, dice: 10, coins: 1 },
      { name: 'Grapple', type: 'SPECIAL', effect: 'Grapple', statusApplied: 'Grappled', baseAttack: 0, dice: 10, coins: 0, targetGrappleDie: 8 },
      { name: 'Piledriver', type: 'ATTACK', damageType: 'Physical', baseAttack: 12, dice: 12, coins: 0, requiredTargetStatus: 'Grappled', removesTargetStatus: 'Grappled' }
    ]
  },
  {
    id: 'zectus',
    name: 'Zectus Maximus',
    description: 'A versatile warrior whose damage type changes frequently.',
    baseStats: { maxHP: 100, defense: 2, level: 1, currentHP: 100, status: 'Alive', tri_sword_state: 'Scythe', effects: [], speed: 2, gender: 'Male' },
    uniquePassive: { name: 'Homogenous', type: 'ConditionalCoin', condition: { target_gender: 'Female' }, coinBonus: 2 },
    abilities: [
      { name: 'Tri-Sword Attack', type: 'ATTACK', damageType: 'Dynamic', baseAttack: 0, dice: 0, coins: 1, isZectusMainAttack: true },
      { name: 'Tri-Sword: Scythe', type: 'ATTACK', damageType: 'Blunt', baseAttack: 6, dice: 8, coins: 1, isHidden: true },
      { name: 'Tri-Sword: Trident', type: 'ATTACK', damageType: 'Pierce', baseAttack: 4, dice: 10, coins: 1, isHidden: true },
      { name: 'Tri-Sword: Hammer', type: 'ATTACK', damageType: 'Blunt', baseAttack: 8, dice: 6, coins: 1, isHidden: true },
      { name: 'Cycle', type: 'SWITCH', effect: 'Cycle', baseAttack: 2, dice: 0, coins: 0 }
    ]
  }
];

/* --- DOM REFERENCES (defensive) --- */
const menuScreen = document.getElementById('menu-screen');
const mainGameWrapper = document.getElementById('main-game-wrapper');
const gameContainer = document.getElementById('game-container');
const charSelectScreen = document.getElementById('character-select-screen');

const newGameBtn = document.getElementById('new-game-btn');
const openSettingsBtn = document.getElementById('open-settings-menu-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const themeOptionBtns = document.querySelectorAll('.theme-option-btn');

const dialogueText = document.getElementById('dialogue-text');
const actionButtonsDiv = document.getElementById('action-buttons');
const combatLog = document.getElementById('combat-log');
const logScrollContainer = document.getElementById('log-scroll-container');
const passTurnBtn = document.getElementById('pass-turn-btn');
const actionHeader = document.getElementById('action-header');
const visualContext = document.getElementById('visual-context');

const playerSpriteName = document.getElementById('player-sprite-name');
const enemySpriteName = document.getElementById('enemy-sprite-name');

const clashVisualizer = document.getElementById('clash-visualizer');
const clashDiceSlotId = 'clash-dice-slot';
const clashCoinSlotId = 'clash-coin-slot';

const areaDisplay = document.getElementById('area-display');
const roomProgressDisplay = document.getElementById('room-progress-display');
const inventoryList = document.getElementById('inventory-list');
const abilityList = document.getElementById('ability-list');

const enemyStatusCard = document.getElementById('enemy-status-card');

const playerStatus = {
  name: document.getElementById('player-name') || document.getElementById('player-name-alt'),
  hpBar: document.getElementById('player-hp-bar'),
  hpText: document.getElementById('player-hp-text'),
  statusText: document.getElementById('player-status-text')
};
const enemyStatus = {
  name: document.getElementById('enemy-name'),
  hpBar: document.getElementById('enemy-hp-bar'),
  hpText: document.getElementById('enemy-hp-text'),
  statusText: document.getElementById('enemy-status-text')
};

/* --- UTILITIES --- */
const rollDie = (max) => Math.floor(Math.random() * max) + 1;
const rollCoins = (count) => { let sum = 0; for (let i = 0; i < (count || 0); i++) sum += (Math.random() < 0.5 ? 0 : 1); return sum; };

function log(message, className = '') {
  if (!combatLog) return;
  const p = document.createElement('p');
  p.className = `log-entry ${className}`;
  p.textContent = `[T${gameState.turn}] ${message}`;
  combatLog.appendChild(p);
  while (combatLog.children.length > 200) combatLog.removeChild(combatLog.firstChild);
  if (logScrollContainer) logScrollContainer.scrollTop = logScrollContainer.scrollHeight;
}

function createEntityFromTemplate(template) {
  const commonBaseStats = { maxHP: 100, currentHP: 100, defense: 0, level: 1, status: 'Alive', speed: 0, consecutive_rounds: 0, isGrappling: false, grapple_die: 8, lastDamageTaken: 0, tri_sword_state: 'Scythe', effects: [], gender: 'Male' };
  const entity = JSON.parse(JSON.stringify(template));
  entity.baseStats = { ...commonBaseStats, ...entity.baseStats };
  entity.baseStats.currentHP = entity.baseStats.maxHP;
  return entity;
}

function updateHealthDisplay(entity, ui) {
  if (!entity || !ui || !ui.hpBar) return;
  const maxHP = entity.baseStats.maxHP || 1;
  const currentHP = entity.baseStats.currentHP || 0;
  const percentage = Math.max(0, (currentHP / maxHP) * 100);
  ui.hpBar.style.width = `${percentage}%`;
  if (ui.hpText) ui.hpText.textContent = `${currentHP}/${maxHP}`;
  if (ui.statusText) ui.statusText.textContent = entity.baseStats.status + (entity.baseStats.effects && entity.baseStats.effects.length ? ` (${entity.baseStats.effects.join(',')})` : '');
}

/* --- VIEW MANAGEMENT --- */
function setView(view) {
  gameState.currentView = view;
  if (menuScreen) menuScreen.classList.add('hidden');
  if (charSelectScreen) charSelectScreen.classList.add('hidden');
  if (mainGameWrapper) mainGameWrapper.classList.add('hidden');

  if (view === 'menu' && menuScreen) {
    menuScreen.classList.remove('hidden');
  } else if (view === 'select' && charSelectScreen) {
    charSelectScreen.classList.remove('hidden');
    renderCharacterSelection();
  } else if ((view === 'dungeon' || view === 'combat') && mainGameWrapper) {
    mainGameWrapper.classList.remove('hidden');
    if (view === 'combat') {
      enemyStatusCard && enemyStatusCard.classList.remove('hidden');
      actionHeader && (actionHeader.textContent = 'Combat Actions');
      renderCombatActions();
      updateCombatUI();
    } else {
      actionHeader && (actionHeader.textContent = 'Actions');
      DungeonManager.renderDungeonActions();
      updateCombatUI();
    }
  }
}

/* --- CHARACTER SELECTION --- */
function renderCharacterSelection() {
  const charList = document.getElementById('character-list');
  if (!charList) return;
  charList.innerHTML = '';
  let selectedCharId = null;

  CHARACTERS.forEach(char => {
    const card = document.createElement('div');
    card.className = 'char-card section-box p-4 rounded-lg space-y-1';
    card.dataset.id = char.id;
    card.tabIndex = 0;
    card.innerHTML = `<h4 class="text-xl font-bold text-accent-color">${char.name}</h4><p class="text-sm">${char.description}</p><p class="text-xs"><strong>HP:</strong> ${char.baseStats.maxHP} | <strong>DEF:</strong> ${char.baseStats.defense} | <strong>SPD:</strong> ${char.baseStats.speed}</p><p class="text-xs"><strong>Passive:</strong> ${char.uniquePassive.name}</p>`;

    card.addEventListener('click', () => {
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCharId = char.id;
      const startBtn = document.getElementById('start-combat-btn');
      if (startBtn) startBtn.classList.remove('hidden');
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });

    charList.appendChild(card);
  });

  const startBtn = document.getElementById('start-combat-btn');
  if (startBtn) startBtn.onclick = () => { if (selectedCharId) startNewGame(selectedCharId); };

  setTimeout(() => { const first = charList.querySelector('.char-card'); if (first) first.focus(); }, 50);
}

/* --- GAME STARTUP --- */
function startNewGame(charId) {
  const selectedCharData = CHARACTERS.find(c => c.id === charId);
  if (!selectedCharData) return;

  gameState.player = createEntityFromTemplate(selectedCharData);
  gameState.dungeonState = { currentAreaId: 'erebos', currentRoomIndex: 0, roomsCleared: 0, roomsUntilBoss: AREA_DATA['erebos'].totalRooms - 1, currentRoomType: null, inventory: [], unlockedAbilities: [] };
  gameState.turn = 1; gameState.playerAction = null; gameState.enemyAction = null; gameState.enemy = null;

  if (combatLog) combatLog.innerHTML = '';
  if (dialogueText) dialogueText.textContent = `Welcome, ${gameState.player.name}, to the ancient catacombs of Erebos!`;
  log(`Welcome, ${gameState.player.name}, to the ancient catacombs of Erebos!`, 'log-special');
  DungeonManager.nextRoom();
}

/* --- RENDER / UI UPDATE --- */
function updateCombatUI() {
  if (gameState.player) updateHealthDisplay(gameState.player, playerStatus);
  if (gameState.enemy) updateHealthDisplay(gameState.enemy, enemyStatus);
  if (playerStatus.name && gameState.player) playerStatus.name.textContent = gameState.player.name;
  if (playerSpriteName && gameState.player) playerSpriteName.textContent = gameState.player.name;

  if (gameState.enemy) {
    enemyStatusCard && enemyStatusCard.classList.remove('hidden');
    visualContext && (visualContext.textContent = `VS ${gameState.enemy.name} | Turn ${gameState.turn}`);
  } else {
    enemyStatusCard && enemyStatusCard.classList.add('hidden');
    visualContext && (visualContext.textContent = `In the dungeon: Room ${gameState.dungeonState.roomsCleared + 1}`);
  }

  const area = AREA_DATA[gameState.dungeonState.currentAreaId];
  if (area && areaDisplay) areaDisplay.textContent = `Area: ${area.name}`;
  if (roomProgressDisplay && area) roomProgressDisplay.textContent = `Room ${gameState.dungeonState.roomsCleared + 1}/${area.totalRooms}`;

  renderInventoryAndAbilities();

  passTurnBtn && passTurnBtn.classList.add('hidden');
  if (actionButtonsDiv) actionButtonsDiv.querySelectorAll('button').forEach(btn => btn.disabled = !!gameState.playerAction);
}

function renderInventoryAndAbilities() {
  if (!inventoryList || !abilityList) return;
  inventoryList.innerHTML = '';
  if (!gameState.dungeonState.inventory.length) inventoryList.innerHTML = '<li class="text-gray-600">No items found yet.</li>';
  else gameState.dungeonState.inventory.forEach(item => { const li = document.createElement('li'); li.innerHTML = `<strong>${item.name}</strong> (x${item.qty}): ${item.description}`; inventoryList.appendChild(li); });

  abilityList.innerHTML = '';
  if (!gameState.player || !gameState.player.abilities) return;
  const allAbilities = gameState.player.abilities.filter(a => !a.isHidden);
  allAbilities.forEach(ab => { const li = document.createElement('li'); li.textContent = `${ab.name} (${ab.type})`; abilityList.appendChild(li); });
  if (gameState.dungeonState.unlockedAbilities.length) gameState.dungeonState.unlockedAbilities.forEach(ab => { const li = document.createElement('li'); li.textContent = `⭐ ${ab.name} (NEW!)`; abilityList.appendChild(li); });
}

/* --- DUNGEON MANAGEMENT --- */
const DungeonManager = {
  getCurrentArea: () => AREA_DATA[gameState.dungeonState.currentAreaId],
  nextRoom: () => {
    const ds = gameState.dungeonState; const area = DungeonManager.getCurrentArea();
    if (!area) return;
    if (ds.roomsCleared >= area.totalRooms) { dialogueText.textContent = `You have cleared ${area.name}! Victory!`; actionButtonsDiv.innerHTML = '<button onclick="location.reload()" class="action-btn w-full">Start New Game</button>'; setView('dungeon'); return; }
    ds.roomsCleared++;
    if (ds.roomsCleared === area.bossRoomIndex) DungeonManager.generateBossRoom(area); else DungeonManager.generateRandomRoom(area);
  },
  generateRandomRoom: (area) => { const roomType = 'Combat'; gameState.dungeonState.currentRoomType = roomType; dialogueText.textContent = area.roomDescriptions[roomType]; log(`Entering Room ${gameState.dungeonState.roomsCleared}: ${roomType}`, 'log-special'); DungeonManager.startCombatEncounter(area); },
  startCombatEncounter: (area) => { const pool = area.enemyPool; const id = pool[Math.floor(Math.random() * pool.length)]; const template = ENEMY_TEMPLATES[id]; gameState.enemy = createEntityFromTemplate(template); log(`A wild ${gameState.enemy.name} appears!`, 'log-loss'); dialogueText.textContent = `${area.roomDescriptions['Combat']} The fight begins!`; setView('combat'); },
  generateBossRoom: (area) => { gameState.dungeonState.currentRoomType = 'Boss'; dialogueText.textContent = area.roomDescriptions['Boss']; log(`BOSS ROOM: ${area.bossId} awaits!`, 'log-loss'); const boss = JSON.parse(JSON.stringify(ENEMY_TEMPLATES['goblin'])); boss.name = 'The Goblin King'; boss.baseStats.maxHP = 150; boss.baseStats.currentHP = 150; boss.baseStats.defense = 4; gameState.enemy = createEntityFromTemplate(boss); setView('combat'); },
  renderDungeonActions: () => { if (!actionButtonsDiv) return; actionButtonsDiv.innerHTML = ''; const nextButton = document.createElement('button'); nextButton.textContent = 'Continue Deeper'; nextButton.className = 'action-btn w-full col-span-full'; nextButton.onclick = () => DungeonManager.nextRoom(); actionButtonsDiv.appendChild(nextButton); },
  onCombatWin: () => { gameState.enemy = null; log(`You take a moment to recover.`, 'log-special'); DungeonManager.nextRoom(); }
};

/* --- COMBAT CORE --- */
function executeAbility(ability) {
  if (gameState.playerAction) return;
  let resolved = ability;
  if (ability.isZectusMainAttack) resolved = getZectusCurrentAbility(gameState.player.baseStats.tri_sword_state) || ability;
  gameState.playerAction = resolved; log(`${gameState.player.name} chooses ${resolved.name}...`, 'log-special'); updateCombatUI(); selectEnemyAction(); resolveCombatRound();
}

function getZectusCurrentAbility(state) { const z = CHARACTERS.find(c => c.id === 'zectus'); if (!z) return null; return z.abilities.find(a => a.name === `Tri-Sword: ${state}`) || null; }

function selectEnemyAction() {
  if (!gameState.enemy) return;
  if ((gameState.enemy.baseStats.effects || []).includes('Stagger')) { gameState.enemyAction = { name: 'Staggered', type: 'NONE' }; log(`${gameState.enemy.name} is Staggered and cannot act!`, 'log-loss'); return; }
  const atk = gameState.enemy.abilities.find(a => a.type === 'ATTACK'); const def = gameState.enemy.abilities.find(a => a.type === 'DEFENSE');
  gameState.enemyAction = (def && Math.random() < 0.5) ? def : atk; log(`${gameState.enemy.name} prepares to use ${gameState.enemyAction.name}!`, 'log-special');
}

async function resolveCombatRound() {
  const playerAbility = gameState.playerAction; const enemyAbility = gameState.enemyAction;
  if (checkGameOver()) return;
  if ((gameState.player.baseStats.effects || []).includes('Stagger')) {
    log(`${gameState.player.name} is Staggered and skips their action!`, 'log-loss');
    if (!enemyAbility || enemyAbility.type !== 'ATTACK') { endTurnCleanup(); return; }
    log(`${gameState.enemy.name} attacks while ${gameState.player.name} is Staggered!`, 'log-win'); executeSingleAction(gameState.enemy, enemyAbility, gameState.player); if (checkGameOver()) return; endTurnCleanup(); return;
  }

  const pType = playerAbility ? playerAbility.type : 'NONE'; const eType = enemyAbility ? enemyAbility.type : 'NONE';
  const pSpeed = gameState.player.baseStats.speed || 0; const eSpeed = gameState.enemy.baseStats.speed || 0;
  log(`Player Speed: ${pSpeed}, Enemy Speed: ${eSpeed}.`, 'log-special');

  if (pType === 'ATTACK' && eType === 'ATTACK') {
    log(`Both attack! Initiating CLASH...`, 'log-special'); await handleClash(playerAbility, enemyAbility); if (checkGameOver()) return;
  } else {
    let first, second, firstAbility, secondAbility;
    if (pSpeed > eSpeed) { first = gameState.player; firstAbility = playerAbility; second = gameState.enemy; secondAbility = enemyAbility; }
    else if (eSpeed > pSpeed) { first = gameState.enemy; firstAbility = enemyAbility; second = gameState.player; secondAbility = playerAbility; }
    else { first = gameState.player; firstAbility = playerAbility; second = gameState.enemy; secondAbility = enemyAbility; log(`Speed tie! ${first.name} acts first.`, 'log-special'); }

    if (firstAbility) { log(`${first.name} (${firstAbility.name}) acts first.`, 'log-special'); executeSingleAction(first, firstAbility, (first === gameState.player ? gameState.enemy : gameState.player)); if (checkGameOver()) return; }
    if (second && second.baseStats.currentHP > 0 && secondAbility && secondAbility.type !== 'NONE') {
      if ((second.baseStats.effects || []).includes('Stagger')) { log(`${second.name} was Staggered and skips their action!`, 'log-loss'); }
      else { log(`${second.name} (${secondAbility.name}) acts second.`, 'log-special'); executeSingleAction(second, secondAbility, (second === gameState.player ? gameState.enemy : gameState.player)); }
    }
    if (checkGameOver()) return;
  }
  endTurnCleanup();
}

function executeSingleAction(attacker, ability, target) {
  if (!ability || !target || target.baseStats.currentHP <= 0) return;
  if (attacker.id === 'zectus' && ability.isZectusMainAttack) ability = getZectusCurrentAbility(attacker.baseStats.tri_sword_state) || ability;
  if (ability.type === 'DEFENSE') { if (ability.defenseEffect === 'NegateNextHit') (target.baseStats.effects = target.baseStats.effects || []).push('NegateNextHit'); log(`${attacker.name} successfully executes a defensive maneuver!`, 'log-win'); }
  else if (ability.type === 'SPECIAL') { if (ability.name === 'Grapple') { const aRoll = rollDie(ability.dice || 10); const tRoll = rollDie(target.baseStats.grapple_die || 8); log(`Grapple Roll: ${attacker.name} d${ability.dice || 10} -> **${aRoll}** | ${target.name} d${target.baseStats.grapple_die || 8} -> **${tRoll}**`, 'log-special'); if (aRoll > tRoll) { (target.baseStats.effects = target.baseStats.effects || []).push('Grappled'); log(`${attacker.name} successfully grapples ${target.name}!`, 'log-win'); } else { log(`${attacker.name} fails to grapple ${target.name}.`, 'log-loss'); } } }
  else if (ability.type === 'SWITCH') { const weapons = ['Scythe','Trident','Hammer']; let idx = weapons.indexOf(attacker.baseStats.tri_sword_state); attacker.baseStats.tri_sword_state = weapons[(idx+1)%3]; const damage = ability.baseAttack || 2; target.baseStats.currentHP = Math.max(0, target.baseStats.currentHP - damage); log(`${attacker.name} cycles weapon to ${attacker.baseStats.tri_sword_state}. Deals ${damage} damage to ${target.name}!`, 'log-win'); }
  else if (ability.type === 'ATTACK') { const diceRoll = rollDie(ability.dice || 1); const coinBonus = rollCoins(ability.coins || 0); log(`Attack Rolls: D${ability.dice || 1} -> **${diceRoll}** | Coins (${ability.coins || 0}) -> **${coinBonus}**`, 'log-damage'); applyDamage(ability, attacker, target, coinBonus, diceRoll); if (ability.statusEffect === 'Stagger') { (target.baseStats.effects = target.baseStats.effects || []).push('Stagger'); log(`${target.name} is Staggered and will skip their next turn!`, 'log-loss'); } }
  if (ability.selfStagger) { (attacker.baseStats.effects = attacker.baseStats.effects || []).push('Stagger'); log(`${attacker.name} used a powerful move and is now Staggered!`, 'log-loss'); }
}

async function handleClash(pAbility, eAbility) {
  try {
    if (!pAbility || !eAbility) { log(`CRITICAL: Missing Player or Enemy ability object in Clash.`, 'log-loss'); return; }
    let resolvedP = pAbility; if (gameState.player.id === 'zectus' && pAbility.isZectusMainAttack) resolvedP = getZectusCurrentAbility(gameState.player.baseStats.tri_sword_state) || pAbility;
    const pDice = (resolvedP.dice && resolvedP.dice > 0) ? resolvedP.dice : 1; const eDice = (eAbility.dice && eAbility.dice > 0) ? eAbility.dice : 1;
    const pCoins = (resolvedP.coins || 0) + ((gameState.player.id === 'striker' && gameState.player.baseStats.consecutive_rounds > 0) ? gameState.player.baseStats.consecutive_rounds : 0);
    const eCoins = (eAbility.coins || 0);
    const playerRoll = rollDie(pDice); const enemyRoll = rollDie(eDice); const playerCoinBonus = rollCoins(pCoins); const enemyCoinBonus = rollCoins(eCoins);
    log(`${gameState.player.name} Clash Rolls: D${pDice} -> **${playerRoll}** | Coins (${pCoins}) -> **${playerCoinBonus}**`, 'log-damage');
    log(`${gameState.enemy.name} Clash Rolls: D${eDice} -> **${enemyRoll}** | Coins (${eCoins}) -> **${enemyCoinBonus}**`, 'log-damage');
    await startClashVisuals(pDice, pCoins, eDice, eCoins, playerRoll, playerCoinBonus, enemyRoll, enemyCoinBonus);
    const playerClashValue = BASE_CLASH_VALUE + playerRoll + playerCoinBonus; const enemyClashValue = BASE_CLASH_VALUE + enemyRoll + enemyCoinBonus;
    let winner, loser, winnerAbility, winnerCoinBonus, winnerDiceRoll;
    const isEnemyGrappled = (gameState.enemy.baseStats.effects || []).includes('Grappled');
    if (isEnemyGrappled && resolvedP.name === 'Piledriver') { winner = gameState.player; loser = gameState.enemy; winnerAbility = resolvedP; winnerCoinBonus = playerCoinBonus; winnerDiceRoll = playerRoll; log(`${gameState.enemy.name} is Grappled and automatically loses the clash!`, 'log-loss'); }
    else if (playerClashValue >= enemyClashValue) { winner = gameState.player; loser = gameState.enemy; winnerAbility = resolvedP; winnerCoinBonus = playerCoinBonus; winnerDiceRoll = playerRoll; log(`${winner.name} wins the clash! (Clash: **${playerClashValue}** vs **${enemyClashValue}**)`, 'log-win'); }
    else { winner = gameState.enemy; loser = gameState.player; winnerAbility = eAbility; winnerCoinBonus = enemyCoinBonus; winnerDiceRoll = enemyRoll; log(`${winner.name} wins the clash! (Clash: **${enemyClashValue}** vs **${playerClashValue}**)`, 'log-loss'); }
    if (winnerAbility) applyDamage(winnerAbility, winner, loser, winnerCoinBonus, winnerDiceRoll);
    if (winner.id === 'balter' && winner.uniquePassive.type === 'ClashWinBonus' && loser.baseStats.currentHP > 0) { const bonus = rollDie(winner.uniquePassive.dice); log(`Passive Roll: d${winner.uniquePassive.dice} -> **${bonus}**`, 'log-damage'); loser.baseStats.currentHP = Math.max(0, loser.baseStats.currentHP - bonus); log(`Balter follows up with extra ${bonus} damage!`, 'log-win'); }
    if (winnerAbility && winnerAbility.statusEffect === 'Stagger') { (loser.baseStats.effects = loser.baseStats.effects || []).push('Stagger'); log(`${loser.name} is Staggered!`, 'log-loss'); }
    if (winnerAbility && winnerAbility.selfStagger) { (winner.baseStats.effects = winner.baseStats.effects || []).push('Stagger'); log(`${winner.name} is Staggered due to selfStagger!`, 'log-loss'); }
  } catch (err) { console.error(err); log('CRITICAL CLASH ERROR', 'log-loss'); }
}

function applyDamage(ability, attacker, target, coinBonus = 0, diceRoll = 0) {
  if (!target.baseStats.effects) target.baseStats.effects = [];
  let damage = (ability.baseAttack || 0) + (coinBonus || 0) + (diceRoll || 0);
  const defense = target.baseStats.defense || 0;
  const negateIndex = (target.baseStats.effects || []).indexOf('NegateNextHit');
  if (negateIndex !== -1) { log(`${target.name} Phases, negating all incoming damage!`, 'log-win'); target.baseStats.effects.splice(negateIndex, 1); damage = 0; }
  let finalDamage = Math.max(0, damage - defense);
  if (defense > 0) log(`[Calculation: ${ability.damageType}] Raw Power (${damage}) - ${defense} Defense = ${finalDamage}`, 'log-damage'); else log(`[Calculation: ${ability.damageType}] Raw Power (${damage})`, 'log-damage');
  target.baseStats.currentHP = Math.max(0, target.baseStats.currentHP - finalDamage);
  log(`${attacker.name} strikes with ${ability.name}! Dealt ${finalDamage} damage.`, 'log-damage');
  if (target.id === 'shutenmaru') target.baseStats.lastDamageTaken = finalDamage;
  if (attacker.id === 'shutenmaru' && attacker.uniquePassive.type === 'RollTrigger' && diceRoll === attacker.uniquePassive.triggerValue) { const heal = target.baseStats.lastDamageTaken || 0; attacker.baseStats.currentHP = Math.min(attacker.baseStats.maxHP, attacker.baseStats.currentHP + heal); log(`Chrono-Fist triggered! Shuten-Maru heals ${heal} HP.`, 'log-win'); }
  if (ability.name === 'Piledriver' && ability.removesTargetStatus === 'Grappled') { target.baseStats.effects = (target.baseStats.effects || []).filter(e => e !== 'Grappled'); log(`${target.name} released from the grapple.`, 'log-special'); }
}

function endTurnCleanup() {
  if (gameState.player && gameState.player.baseStats) gameState.player.baseStats.effects = (gameState.player.baseStats.effects || []).filter(e => e !== 'Stagger');
  if (gameState.enemy && gameState.enemy.baseStats) gameState.enemy.baseStats.effects = (gameState.enemy.baseStats.effects || []).filter(e => e !== 'Stagger');
  if (gameState.player && gameState.player.id === 'striker') gameState.player.baseStats.consecutive_rounds++;
  if (checkGameOver()) return;
  gameState.playerAction = null; gameState.enemyAction = null; gameState.turn++;
  log(`--- Start of Turn ${gameState.turn} ---`, 'log-special'); updateCombatUI(); renderCombatActions();
}

function checkGameOver() {
  updateCombatUI();
  if (gameState.player && gameState.player.baseStats.currentHP <= 0) { gameState.player.baseStats.status = 'Defeated'; log(`${gameState.player.name} has been defeated. Game Over.`, 'log-loss'); dialogueText.textContent = 'You have been vanquished.'; actionButtonsDiv.innerHTML = '<button onclick="location.reload()" class="action-btn w-full">Return to Menu</button>'; return true; }
  if (gameState.enemy && gameState.enemy.baseStats.currentHP <= 0) { gameState.enemy.baseStats.status = 'Defeated'; log(`${gameState.enemy.name} is vanquished!`, 'log-win'); dialogueText.textContent = 'The enemy is defeated. Proceeding deeper into the dungeon...'; if (gameState.player && gameState.player.id === 'striker') gameState.player.baseStats.consecutive_rounds = 0; DungeonManager.onCombatWin(); return true; }
  return false;
}

function renderCombatActions() {
  if (!actionButtonsDiv) return;
  actionButtonsDiv.innerHTML = '';
  if (gameState.currentView !== 'combat') return DungeonManager.renderDungeonActions();
  const playerAbilities = (gameState.player && gameState.player.abilities) ? gameState.player.abilities : [];
  const isEnemyGrappled = gameState.enemy && (gameState.enemy.baseStats.effects || []).includes('Grappled');
  const currentWeapon = gameState.player ? gameState.player.baseStats.tri_sword_state : '';
  const renderable = playerAbilities.filter(a => !a.isHidden);
  renderable.forEach(ab => {
    const btn = document.createElement('button'); btn.className = 'combat-btn'; let display = ab.name;
    if (ab.name === 'Piledriver') { btn.disabled = !isEnemyGrappled; if (isEnemyGrappled) btn.classList.add('combo-ready'); }
    if (gameState.player && gameState.player.id === 'zectus' && ab.isZectusMainAttack) { display = `Tri-Sword: ${currentWeapon}`; btn.classList.add('active-weapon-btn'); }
    if (gameState.playerAction) btn.disabled = true;
    btn.textContent = display; btn.onclick = () => executeAbility(ab); actionButtonsDiv.appendChild(btn);
    if (window.UIEnhancements) window.UIEnhancements.attachAbilityHoverHandlers(btn, ab);
  });
}

/* --- CLASH VISUALS --- */
function runSlotAnimation(elementId, maxVal, isCoin) {
  const el = document.getElementById(elementId); if (!el) return null;
  let interval; const start = performance.now(); const duration = 3000;
  interval = setInterval(() => { if (performance.now() - start < duration) { if (isCoin) el.textContent = Math.random() > 0.5 ? '🥇' : '🥈'; else el.textContent = rollDie(maxVal); } else clearInterval(interval); }, 50);
  return interval;
}

function startClashVisuals(pDiceMax, pCoins, eDiceMax, eCoins, pFinalRoll, pFinalCoin, eFinalRoll, eFinalCoin) {
  return new Promise(resolve => {
    if (!clashVisualizer) return resolve();
    clashVisualizer.classList.remove('hidden'); clashVisualizer.classList.add('flex');
    clashVisualizer.innerHTML = `<div class="text-4xl font-bold mb-8 text-accent-color animate-pulse">CLASH!</div><div class="flex justify-around w-full max-w-lg"><div class="text-center space-y-4 clash-card"><p class="text-xl font-semibold">${gameState.player.name}</p><div id="p-${clashDiceSlotId}" class="clash-dice-box dice-slot">?</div><p id="p-${clashCoinSlotId}"></p></div><div class="text-center space-y-4 clash-card"><p class="text-xl font-semibold">${gameState.enemy.name}</p><div id="e-${clashDiceSlotId}" class="clash-dice-box dice-slot">?</div><p id="e-${clashCoinSlotId}"></p></div></div><p class="mt-8 text-xl">Rolling...</p>`;
    const pDiceInterval = runSlotAnimation(`p-${clashDiceSlotId}`, pDiceMax, false);
    const eDiceInterval = runSlotAnimation(`e-${clashDiceSlotId}`, eDiceMax, false);
    const pCoinInterval = runSlotAnimation(`p-${clashCoinSlotId}`, pCoins, true);
    const eCoinInterval = runSlotAnimation(`e-${clashCoinSlotId}`, eCoins, true);
    setTimeout(() => {
      clearInterval(pDiceInterval); clearInterval(eDiceInterval); clearInterval(pCoinInterval); clearInterval(eCoinInterval);
      const pDiceEl = document.getElementById(`p-${clashDiceSlotId}`); const eDiceEl = document.getElementById(`e-${clashDiceSlotId}`);
      const pCoinEl = document.getElementById(`p-${clashCoinSlotId}`); const eCoinEl = document.getElementById(`e-${clashCoinSlotId}`);
      if (pDiceEl) pDiceEl.textContent = pFinalRoll; if (eDiceEl) eDiceEl.textContent = eFinalRoll;
      const coinEmoji = (count, result) => { if (count === 0) return '(No Coins)'; return Array(count).fill('🪙').map((c,i) => i < result ? '🥇' : '🥈').join(''); };
      if (pCoinEl) pCoinEl.innerHTML = coinEmoji(pCoins, pFinalCoin); if (eCoinEl) eCoinEl.innerHTML = coinEmoji(eCoins, eFinalCoin);
      const notice = clashVisualizer.querySelector('p.mt-8'); if (notice) notice.textContent = 'Results are in! (Closing in 1s)';
      setTimeout(() => { clashVisualizer.classList.add('hidden'); clashVisualizer.classList.remove('flex'); resolve(); }, 1000);
    }, 3000);
  });
}

/* --- INIT / HOOKS --- */
function init() {
  // Defensive: some environments load this script before the DOM, so top-level DOM refs were captured as null.
  // Ensure the main menu is visible immediately by re-querying and removing any 'hidden' state.
  try {
    const _menuScreen = document.getElementById('menu-screen');
    if (_menuScreen) _menuScreen.classList.remove('hidden');

    // If the body was hidden by a CSS helper, ensure it's visible.
    if (document.body && document.body.classList.contains('hidden')) document.body.classList.remove('hidden');
  } catch (e) {
    /* swallow any errors here to avoid breaking init */
  }

  applyTheme(localStorage.getItem('gameTheme') || 'default');
  setView('menu');
  newGameBtn && newGameBtn.addEventListener('click', () => setView('select'));
  openSettingsBtn && openSettingsBtn.addEventListener('click', () => settingsPanel && settingsPanel.classList.toggle('open'));
  closeSettingsBtn && closeSettingsBtn.addEventListener('click', () => settingsPanel && settingsPanel.classList.toggle('open'));
  themeOptionBtns && themeOptionBtns.forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
}
window.addEventListener('load', init);
