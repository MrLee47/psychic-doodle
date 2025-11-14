/**
 * Chronicles of Heroes: Core Game and Combat Logic
 * Includes: Theme Switching, Character Selection, and Coin & Dice Clash Combat.
 */

// --- GLOBAL GAME STATE (Local Storage is used for persistence) ---
let gameState = {
    isGameStarted: false,
    currentView: 'menu', // menu, select, combat
    player: null,
    enemy: null,
    currentTheme: 'default',
    turn: 1,
};

// --- DOM REFERENCES ---
const body = document.body;
const menuScreen = document.getElementById('menu-screen');
const gameContainer = document.getElementById('game-container');
const charSelectScreen = document.getElementById('character-select-screen');

// Menu Buttons
const newGameBtn = document.getElementById('new-game-btn');
const loadGameBtn = document.getElementById('load-game-btn');
const openSettingsBtn = document.getElementById('open-settings-menu-btn');

// Settings Panel
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const themeOptionBtns = document.querySelectorAll('.theme-option-btn');

// Game UI
const dialogueText = document.getElementById('dialogue-text');
const actionButtonsDiv = document.getElementById('action-buttons');
const combatLog = document.getElementById('combat-log');
const passTurnBtn = document.getElementById('pass-turn-btn');

// Status Bar References (Dynamic)
const playerStatus = {
    name: document.getElementById('player-name'),
    hpBar: document.getElementById('player-hp-bar'),
    hpText: document.getElementById('player-hp-text'),
    statusText: document.getElementById('player-status-text'),
};

const enemyStatus = {
    name: document.getElementById('enemy-name'),
    hpBar: document.getElementById('enemy-hp-bar'),
    hpText: document.getElementById('enemy-hp-text'),
    statusText: document.getElementById('enemy-status-text'),
};


// --- GAME DATA (For simplicity, included directly in main.js) ---

const BASE_CLASH_VALUE = 5;

// Player Characters
const CHARACTERS = [
    // --- 1. Striker (Slow Start: Coin Scaler) ---
    {
        id: 'striker',
        name: 'Striker',
        description: 'Scales in power the longer a fight lasts.',
        baseStats: { maxHP: 110, defense: 2, level: 1, currentHP: 110, status: 'Alive', consecutive_rounds: 0, effects: [] },
        uniquePassive: { name: 'Slow Start', type: 'CoinScaler' },
        abilities: [
            { name: 'Dragon Strike', type: 'ATTACK', damageType: 'Force', baseAttack: 4, dice: 4, coins: 2, },
            { name: 'Heavy Blow', type: 'ATTACK', damageType: 'Force', baseAttack: 10, dice: 12, coins: 0, statusEffect: 'StunNext', cost: 10 }, // StunNext implemented as skip turn
        ]
    },

    // --- 2. Shuten-Maru (Chrono-Fist: Roll-Triggered Reversal) ---
    {
        id: 'shutenmaru',
        name: 'Shuten-Maru',
        description: 'A swift, ghostly fighter focused on survivability.',
        baseStats: { maxHP: 100, defense: 1, level: 1, currentHP: 100, status: 'Alive', lastDamageTaken: 0, effects: [] },
        uniquePassive: { name: 'Chrono-Fist', type: 'RollTrigger', abilityName: 'Ghost Fist', triggerValue: 8 },
        abilities: [
            { name: 'Ghost Fist', type: 'ATTACK', damageType: 'Psychic', baseAttack: 6, dice: 8, coins: 1, },
            { name: 'Phase', type: 'DEFENSE', effect: 'Negates the damage of the next incoming attack this turn (one use per combat).', defenseEffect: 'NegateNextHit', baseAttack: 0, dice: 0, coins: 0, cost: 5 }
        ]
    },

    // --- 3. Balter (Grapple: State Changer & Walk It Off: Healing) ---
    {
        id: 'balter',
        name: 'Balter',
        description: 'A wrestling powerhouse who controls the battlefield.',
        baseStats: { maxHP: 130, defense: 3, level: 1, currentHP: 130, status: 'Alive', isGrappling: false, grapple_die: 8, effects: [] },
        uniquePassive: { name: 'Walk It Off', type: 'PassActionHeal', healAmount: 10 },
        abilities: [
            { name: 'Haymaker', type: 'ATTACK', damageType: 'Physical', baseAttack: 7, dice: 10, coins: 1, },
            { name: 'Grapple', type: 'SPECIAL', effect: 'Rolls d10 vs. target\'s Grapple Die. Success applies Grappled status. Target auto-loses next clash.', statusApplied: 'Grappled', baseAttack: 0, dice: 10, coins: 0, targetGrappleDie: 8 },
            { name: 'Piledriver', type: 'ATTACK', damageType: 'Physical', baseAttack: 12, dice: 12, coins: 0, requiredTargetStatus: 'Grappled', removesTargetStatus: 'Grappled', isHidden: true }
        ]
    },

    // --- 4. Zectus Maximus (Cycle: Weapon Rotation & Homogenous: Conditional Coins) ---
    {
        id: 'zectus',
        name: 'Zectus Maximus',
        description: 'A versatile warrior whose damage type changes frequently.',
        baseStats: { maxHP: 105, defense: 2, level: 1, currentHP: 105, status: 'Alive', tri_sword_state: 'Scythe', effects: [] },
        uniquePassive: { name: 'Homogenous', type: 'ConditionalCoin', condition: { target_gender: 'Female' }, coinBonus: 2 },
        abilities: [
            { name: 'Cycle', type: 'SWITCH', effect: 'Cycles Tri-Sword: Scythe -> Trident -> Hammer. Deals 2 damage on activation.', baseAttack: 2, dice: 0, coins: 0, nextState: 'Trident' },
            { name: 'Tri-Sword: Scythe', type: 'ATTACK', damageType: 'Necrotic', baseAttack: 6, dice: 8, coins: 1, weaponState: 'Scythe', cost: 5 },
            { name: 'Tri-Sword: Trident', type: 'ATTACK', damageType: 'Physical', baseAttack: 7, dice: 10, coins: 1, weaponState: 'Trident', isHidden: true, cost: 5 },
            { name: 'Tri-Sword: Hammer', type: 'ATTACK', damageType: 'Force', baseAttack: 8, dice: 12, coins: 1, weaponState: 'Hammer', isHidden: true, cost: 5 }
        ]
    },
];

// Enemy Definition (The first opponent)
const ENEMY_GOBLIN = {
    id: 'goblin',
    name: 'Gravel-Claw Goblin',
    baseStats: { maxHP: 80, defense: 2, level: 1, currentHP: 80, status: 'Alive', effects: [], grapple_die: 6, gender: 'Male' },
    abilities: [
        { name: 'Gnaw Attack', type: 'ATTACK', damageType: 'Physical', baseAttack: 5, dice: 6, coins: 2, },
        { name: 'Defensive Crouch', type: 'DEFENSE', defenseEffect: 'DefensePlusTwo', baseAttack: 0, dice: 0, coins: 0, },
    ]
};


// --- UTILITY FUNCTIONS ---

// Generates a random number between 1 and max (inclusive)
const rollDie = (max) => Math.floor(Math.random() * max) + 1;

// Rolls the coins, returning the sum of 1s (0 or 1 per coin)
const rollCoins = (count) => {
    let sum = 0;
    for (let i = 0; i < count; i++) {
        sum += (Math.random() < 0.5 ? 0 : 1); // 50% chance for 1
    }
    return sum;
};

// Updates the HP bar and text for a given entity (player or enemy)
function updateHealthDisplay(entity, ui) {
    const maxHP = entity.baseStats.maxHP;
    const currentHP = entity.baseStats.currentHP;
    const percentage = Math.max(0, (currentHP / maxHP) * 100);

    ui.hpBar.style.width = `${percentage}%`;
    ui.hpText.textContent = `${currentHP}/${maxHP}`;
    ui.statusText.textContent = entity.baseStats.status;

    if (currentHP <= 0) {
        ui.hpBar.style.width = '0%';
        ui.statusText.textContent = 'Defeated';
    }
}

// Logs messages to the combat log area
function log(message, className = '') {
    const logDiv = document.createElement('p');
    logDiv.classList.add('log-entry', className);
    logDiv.textContent = `[T${gameState.turn}] ${message}`;
    combatLog.prepend(logDiv);
    // Clear old entries (keep max 50)
    while (combatLog.children.length > 50) {
        combatLog.removeChild(combatLog.lastChild);
    }
}


// --- THEME & SETTINGS LOGIC ---

function applyTheme(themeName) {
    body.classList.remove('default-theme', 'retro-theme', 'dark-theme', 'light-theme');
    const className = `${themeName}-theme`;
    body.classList.add(className);
    localStorage.setItem('gameTheme', themeName);
    gameState.currentTheme = themeName;
}

function toggleSettingsPanel() {
    settingsPanel.classList.toggle('open');
}

// --- VIEW MANAGEMENT ---

function setView(viewName) {
    gameState.currentView = viewName;
    menuScreen.classList.add('hidden');
    gameContainer.classList.add('hidden');
    charSelectScreen.classList.add('hidden');

    if (viewName === 'menu') {
        menuScreen.classList.remove('hidden');
    } else if (viewName === 'select') {
        charSelectScreen.classList.remove('hidden');
        renderCharacterSelection();
    } else if (viewName === 'combat') {
        gameContainer.classList.remove('hidden');
        renderCombatActions();
        updateCombatUI();
    }
}

// --- CHARACTER SELECTION LOGIC ---

function renderCharacterSelection() {
    const charList = document.getElementById('character-list');
    charList.innerHTML = '';
    let selectedCharId = null;

    CHARACTERS.forEach(char => {
        const card = document.createElement('div');
        card.classList.add('char-card');
        card.dataset.id = char.id;
        card.innerHTML = `
            <h4>${char.name}</h4>
            <p>${char.description}</p>
            <p><strong>HP:</strong> ${char.baseStats.maxHP} | <strong>DEF:</strong> ${char.baseStats.defense}</p>
            <p><strong>Passive:</strong> ${char.uniquePassive.name}</p>
        `;

        card.addEventListener('click', () => {
            document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedCharId = char.id;
            document.getElementById('start-combat-btn').classList.remove('hidden');
        });
        charList.appendChild(card);
    });

    document.getElementById('start-combat-btn').onclick = () => {
        if (selectedCharId) {
            startNewGame(selectedCharId);
        }
    };
}

// --- GAME STARTUP ---

function startNewGame(charId) {
    // 1. Initialize Player and Enemy
    const selectedCharData = CHARACTERS.find(c => c.id === charId);
    gameState.player = JSON.parse(JSON.stringify(selectedCharData)); // Deep copy for mutable stats
    gameState.enemy = JSON.parse(JSON.stringify(ENEMY_GOBLIN)); // Deep copy

    // 2. Reset Game State
    gameState.turn = 1;
    gameState.player.baseStats.currentHP = gameState.player.baseStats.maxHP;
    gameState.enemy.baseStats.currentHP = gameState.enemy.baseStats.maxHP;
    gameState.player.baseStats.consecutive_rounds = 0; // Reset Striker counter

    // 3. Clear UI
    combatLog.innerHTML = '';
    dialogueText.textContent = `A powerful champion, ${gameState.player.name}, steps forward!`;

    // 4. Start Combat
    setView('combat');
    log(`${gameState.enemy.name} challenges ${gameState.player.name}!`, 'log-special');
    updateCombatUI();
}

function updateCombatUI() {
    updateHealthDisplay(gameState.player, playerStatus);
    updateHealthDisplay(gameState.enemy, enemyStatus);

    playerStatus.name.textContent = gameState.player.name;
    enemyStatus.name.textContent = gameState.enemy.name;

    // Show Pass Turn button if Walk It Off is available
    passTurnBtn.classList.toggle('hidden', gameState.player.id !== 'balter');
}


// --- COMBAT CORE MECHANICS ---

// 1. Ability Execution
function executeAbility(ability, target) {
    log(`${gameState.player.name} uses ${ability.name}!`, 'log-special');

    if (ability.type === 'ATTACK' || ability.type === 'SPECIAL') {
        // Balter's Grapple logic
        if (ability.name === 'Grapple') {
            const playerRoll = rollDie(ability.dice);
            const targetGrappleDie = target.baseStats.grapple_die || 8;
            const enemyRoll = rollDie(targetGrappleDie);
            
            if (playerRoll > enemyRoll) {
                target.baseStats.effects.push('Grappled');
                log(`${gameState.player.name} successfully grapples ${target.name}!`, 'log-win');
            } else {
                log(`${gameState.player.name} fails to grapple ${target.name}.`, 'log-loss');
            }
        }
    }
    
    // Zectus Cycle logic (deals 2 damage on activation)
    if (ability.name === 'Cycle') {
        let currentWeapon = gameState.player.baseStats.tri_sword_state;
        const weapons = ['Scythe', 'Trident', 'Hammer'];
        let currentIndex = weapons.indexOf(currentWeapon);
        let nextIndex = (currentIndex + 1) % weapons.length;
        
        gameState.player.baseStats.tri_sword_state = weapons[nextIndex];
        
        // Apply activation damage to self
        const damage = ability.baseAttack;
        gameState.player.baseStats.currentHP = Math.max(0, gameState.player.baseStats.currentHP - damage);
        log(`Zectus cycles weapon to ${weapons[nextIndex]}. Takes ${damage} self-damage!`, 'log-loss');
    }

    // Advance turn to enemy action
    setTimeout(resolveTurn, 500, ability);
}

// 2. Turn Resolution (Player Ability vs. Enemy AI)
function resolveTurn(playerAbility) {
    if (gameState.enemy.baseStats.currentHP <= 0 || gameState.player.baseStats.currentHP <= 0) {
        checkGameOver();
        return;
    }

    // Simple Enemy AI: 50/50 attack or defend (if it has a defense skill)
    const enemyAbilities = gameState.enemy.abilities;
    const enemyAttack = enemyAbilities.find(a => a.type === 'ATTACK');
    const enemyDefense = enemyAbilities.find(a => a.type === 'DEFENSE');

    let enemyAbility;
    if (enemyDefense && Math.random() < 0.5) {
        enemyAbility = enemyDefense;
    } else {
        enemyAbility = enemyAttack;
    }

    log(`${gameState.enemy.name} prepares to use ${enemyAbility.name}!`, 'log-special');

    // Check for non-clash scenarios (Grapple/Defense/Special)
    if (playerAbility.type !== 'ATTACK' || enemyAbility.type !== 'ATTACK') {
        log(`No clash! Resolving actions sequentially.`, 'log-special');
        
        // Handle Defense abilities first
        if (playerAbility.type === 'DEFENSE') {
            log(`${gameState.player.name} is now protected.`, 'log-win');
        }
        if (enemyAbility.type === 'DEFENSE') {
            log(`${gameState.enemy.name} is now protected.`, 'log-win');
        }

        // Apply remaining actions
        if (playerAbility.type === 'ATTACK' && enemyAbility.type !== 'DEFENSE') {
            // Player attacks unguarded enemy
            applyDamage(playerAbility, gameState.player, gameState.enemy);
        } else if (enemyAbility.type === 'ATTACK' && playerAbility.type !== 'DEFENSE') {
            // Enemy attacks unguarded player
            applyDamage(enemyAbility, gameState.enemy, gameState.player);
        }

    } else {
        // CLASH! (Both attacks)
        handleClash(playerAbility, enemyAbility);
    }
    
    // Apply end-of-turn effects
    endTurnCleanup();
}

// 3. The Core Clash Logic
function handleClash(pAbility, eAbility) {
    // Striker's Slow Start Passive: Add coins based on consecutive rounds
    const playerCoins = pAbility.coins + (gameState.player.id === 'striker' ? gameState.player.baseStats.consecutive_rounds : 0);
    const enemyCoins = eAbility.coins;

    // Calculate Clash Values
    const playerRoll = rollDie(pAbility.dice);
    const playerCoinBonus = rollCoins(playerCoins);
    const playerClashValue = BASE_CLASH_VALUE + playerRoll + playerCoinBonus;

    const enemyRoll = rollDie(eAbility.dice);
    const enemyCoinBonus = rollCoins(enemyCoins);
    const enemyClashValue = BASE_CLASH_VALUE + enemyRoll + enemyCoinBonus;

    log(`Clash! P Roll: ${playerRoll}+${playerCoinBonus} = ${playerClashValue} | E Roll: ${enemyRoll}+${enemyCoinBonus} = ${enemyClashValue}`);

    let winner, loser, winnerAbility;

    // Balter Grapple Check: Grappled target auto-loses clash
    const isEnemyGrappled = gameState.enemy.baseStats.effects.includes('Grappled');
    
    if (isEnemyGrappled) {
        winner = gameState.player;
        loser = gameState.enemy;
        winnerAbility = pAbility;
        log(`${gameState.enemy.name} is Grappled and automatically loses the clash!`, 'log-loss');
    } else if (playerClashValue >= enemyClashValue) {
        winner = gameState.player;
        loser = gameState.enemy;
        winnerAbility = pAbility;
    } else {
        winner = gameState.enemy;
        loser = gameState.player;
        winnerAbility = eAbility;
    }

    log(`${winner.name} wins the clash!`, 'log-win');

    // Damage is applied by the winner's attack
    applyDamage(winnerAbility, winner, loser, winner.id === 'player' ? playerCoinBonus : enemyCoinBonus, winner.id === gameState.player.id ? playerRoll : enemyRoll);
}

// 4. Damage Application
function applyDamage(ability, attacker, target, coinBonus = rollCoins(ability.coins), diceRoll = rollDie(ability.dice)) {
    // 1. Calculate base damage
    let damage = ability.baseAttack + coinBonus;
    
    // 2. Apply target defense reduction
    let finalDamage = Math.max(0, damage - target.baseStats.defense);

    // 3. Apply unique ability effects before dealing damage
    if (target.id === 'shutenmaru' && target.baseStats.effects.includes('NegateNextHit')) {
        log(`${target.name} Phases, negating all incoming damage!`, 'log-win');
        target.baseStats.effects = target.baseStats.effects.filter(e => e !== 'NegateNextHit'); // Remove effect
        finalDamage = 0;
    }

    // 4. Update HP and log
    target.baseStats.currentHP = Math.max(0, target.baseStats.currentHP - finalDamage);
    log(`${attacker.name} hits for ${finalDamage} damage! (${ability.damageType})`, 'log-damage');
    
    // 5. Update last damage taken for Chrono-Fist
    if (target.id === 'shutenmaru') {
        target.baseStats.lastDamageTaken = finalDamage;
    }
    
    // 6. Apply Chrono-Fist (Shuten-Maru Passive Check)
    if (attacker.id === 'shutenmaru' && attacker.uniquePassive.type === 'RollTrigger' && diceRoll === attacker.uniquePassive.triggerValue) {
        const healAmount = attacker.baseStats.lastDamageTaken;
        attacker.baseStats.currentHP = Math.min(attacker.baseStats.maxHP, attacker.baseStats.currentHP + healAmount);
        log(`Chrono-Fist triggered! Shuten-Maru heals back ${healAmount} damage.`, 'log-win');
    }

    // 7. Apply Balter Piledriver cleanup
    if (ability.name === 'Piledriver' && ability.removesTargetStatus === 'Grappled') {
        target.baseStats.effects = target.baseStats.effects.filter(e => e !== 'Grappled');
        log(`${target.name} is released from the grapple.`, 'log-special');
        gameState.player.baseStats.isGrappling = false;
    }
}


// 5. End of Turn Cleanup & Setup for Next Turn
function endTurnCleanup() {
    // Striker: Increase consecutive rounds
    if (gameState.player.id === 'striker') {
        gameState.player.baseStats.consecutive_rounds++;
    }

    // Check for death
    checkGameOver();
    if (gameState.currentView !== 'combat') return;

    // Advance turn
    gameState.turn++;
    log(`--- Start of Turn ${gameState.turn} ---`, 'log-special');

    // Re-render UI
    updateCombatUI();
    renderCombatActions();
}

function checkGameOver() {
    if (gameState.player.baseStats.currentHP <= 0) {
        gameState.player.baseStats.status = 'Defeated';
        log(`${gameState.player.name} has been defeated. Game Over.`, 'log-loss');
        dialogueText.textContent = "You have been vanquished.";
        actionButtonsDiv.innerHTML = '<button onclick="location.reload()">Return to Menu</button>';
        passTurnBtn.classList.add('hidden');
        gameState.currentView = 'menu'; // Prevents further action
    } else if (gameState.enemy.baseStats.currentHP <= 0) {
        gameState.enemy.baseStats.status = 'Defeated';
        log(`${gameState.enemy.name} is vanquished! Victory!`, 'log-win');
        dialogueText.textContent = "You win! Adventure continues...";
        actionButtonsDiv.innerHTML = '<button onclick="location.reload()">Next Area (WIP)</button>';
        passTurnBtn.classList.add('hidden');
        gameState.currentView = 'menu'; 
    }
}


// 6. Action Rendering
function renderCombatActions() {
    actionButtonsDiv.innerHTML = '';
    const playerAbilities = gameState.player.abilities;
    const isGrappling = gameState.player.baseStats.isGrappling;

    playerAbilities.forEach(ability => {
        let isAvailable = true;
        let displayName = ability.name;

        // Balter's conditional abilities
        if (gameState.player.id === 'balter') {
            if (ability.name === 'Haymaker' && isGrappling) {
                isAvailable = false;
            } else if (ability.name === 'Piledriver' && !isGrappling) {
                isAvailable = false;
            } else if (ability.name === 'Piledriver') {
                displayName = 'Piledriver (FINISHER!)'; // Visual cue
            }
        }
        
        // Zectus's conditional abilities
        if (gameState.player.id === 'zectus' && ability.type === 'ATTACK') {
            // Only show the ability that matches the current Tri-Sword state
            if (ability.weaponState !== gameState.player.baseStats.tri_sword_state) {
                isAvailable = false;
            } else {
                displayName = `Tri-Sword: ${ability.weaponState}`;
            }
        }
        
        if (isAvailable && !ability.isHidden) {
            const btn = document.createElement('button');
            btn.classList.add('combat-btn');
            btn.textContent = displayName;
            btn.onclick = () => executeAbility(ability, gameState.enemy);
            actionButtonsDiv.appendChild(btn);
        }
    });

    // Balter's Walk It Off logic on Pass Turn
    if (gameState.player.id === 'balter') {
        passTurnBtn.onclick = () => {
            const heal = gameState.player.uniquePassive.healAmount;
            gameState.player.baseStats.currentHP = Math.min(gameState.player.baseStats.maxHP, gameState.player.baseStats.currentHP + heal);
            gameState.player.baseStats.effects = []; // Cures one status (all for now)
            log(`Balter activates Walk It Off. He heals ${heal} HP and clears status effects.`, 'log-win');
            
            // Advance turn immediately
            endTurnCleanup();
        };
    }
}


// --- INITIALIZATION ---

function init() {
    // 1. Load saved theme
    const savedTheme = localStorage.getItem('gameTheme') || 'default';
    applyTheme(savedTheme);

    // 2. Set initial view
    setView('menu'); 

    // 3. Attach listeners
    newGameBtn.addEventListener('click', () => setView('select'));
    // loadGameBtn.addEventListener('click', loadGame); // (WIP)

    // Settings listeners
    openSettingsBtn.addEventListener('click', toggleSettingsPanel);
    closeSettingsBtn.addEventListener('click', toggleSettingsPanel);
    themeOptionBtns.forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });
}

// Initialize the game when the window loads
window.onload = init;
