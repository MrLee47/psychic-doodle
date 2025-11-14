/**
 * Chronicles of Heroes: Core Game and Combat Logic
 * Includes: Theme Switching, Character Selection, and Coin & Dice Clash Combat.
 * * UPDATES:
 * - Implemented 'Stagger' status (skip next turn) for Striker's Heavy Blow.
 * - Refactored Balter's Grapple/Piledriver buttons to dynamically switch.
 * - Refactored Zectus's Tri-Sword attacks into a single dynamic button.
 */

// --- GLOBAL GAME STATE (Local Storage is used for persistence) ---
let gameState = {
    isGameStarted: false,
    currentView: 'menu', // menu, select, combat
    player: null,
    enemy: null,
    currentTheme: 'default',
    turn: 1,
    // Stores the player's chosen ability for the current turn
    playerAction: null, 
    // Stores the enemy's chosen ability for the current turn
    enemyAction: null,
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
    // --- 1. Striker (Speed 4: Fastest) ---
    {
        id: 'striker',
        name: 'Striker',
        description: 'Scales in power the longer a fight lasts.',
        baseStats: { maxHP: 110, defense: 2, level: 1, currentHP: 110, status: 'Alive', consecutive_rounds: 0, effects: [], speed: 4 }, 
        uniquePassive: { name: 'Slow Start', type: 'CoinScaler' },
        abilities: [
            { name: 'Dragon Strike', type: 'ATTACK', damageType: 'Force', baseAttack: 4, dice: 4, coins: 2, },
            // Added statusEffect: 'Stagger'
            { name: 'Heavy Blow', type: 'ATTACK', damageType: 'Force', baseAttack: 10, dice: 12, coins: 0, statusEffect: 'Stagger', cost: 10 }, 
        ]
    },

    // --- 2. Shuten-Maru (Speed 3) ---
    {
        id: 'shutenmaru',
        name: 'Shuten-Maru',
        description: 'A swift, ghostly fighter focused on survivability.',
        baseStats: { maxHP: 100, defense: 1, level: 1, currentHP: 100, status: 'Alive', lastDamageTaken: 0, effects: [], speed: 3 }, 
        uniquePassive: { name: 'Chrono-Fist', type: 'RollTrigger', abilityName: 'Ghost Fist', triggerValue: 8 },
        abilities: [
            { name: 'Ghost Fist', type: 'ATTACK', damageType: 'Psychic', baseAttack: 6, dice: 8, coins: 1, },
            { name: 'Phase', type: 'DEFENSE', effect: 'Negates the damage of the next incoming attack this turn (one use per combat).', defenseEffect: 'NegateNextHit', baseAttack: 0, dice: 0, coins: 0, cost: 5 }
        ]
    },

    // --- 3. Balter (Speed 1: Slowest) ---
    {
        id: 'balter',
        name: 'Balter',
        description: 'A wrestling powerhouse who controls the battlefield.',
        baseStats: { maxHP: 130, defense: 3, level: 1, currentHP: 130, status: 'Alive', isGrappling: false, grapple_die: 8, effects: [], speed: 1 },
        uniquePassive: { name: 'The Old One, Two', type: 'ClashWinBonus', dice: 4 }, 
        abilities: [
            { name: 'Haymaker', type: 'ATTACK', damageType: 'Physical', baseAttack: 7, dice: 10, coins: 1, },
            // Only keeping Grapple and Piledriver definitions for utility, but only Grapple is rendered initially.
            { name: 'Grapple', type: 'SPECIAL', effect: 'Rolls d10 vs. target\'s Grapple Die. Success applies Grappled status. Target auto-loses next clash.', statusApplied: 'Grappled', baseAttack: 0, dice: 10, coins: 0, targetGrappleDie: 8 },
            { name: 'Piledriver', type: 'ATTACK', damageType: 'Physical', baseAttack: 12, dice: 12, coins: 0, requiredTargetStatus: 'Grappled', removesTargetStatus: 'Grappled', isHidden: true }
        ]
    },

    // --- 4. Zectus Maximus (Speed 2) ---
    {
        id: 'zectus',
        name: 'Zectus Maximus',
        description: 'A versatile warrior whose damage type changes frequently.',
        baseStats: { maxHP: 105, defense: 2, level: 1, currentHP: 105, status: 'Alive', tri_sword_state: 'Scythe', effects: [], speed: 2 }, 
        uniquePassive: { name: 'Homogenous', type: 'ConditionalCoin', condition: { target_gender: 'Female' }, coinBonus: 2 },
        abilities: [
            { name: 'Cycle', type: 'SWITCH', effect: 'Cycles Tri-Sword: Scythe -> Trident -> Hammer. Deals 2 damage to target on activation.', baseAttack: 2, dice: 0, coins: 0, nextState: 'Trident' },
            // Consolidated Tri-Sword attacks into one definition for render logic
            { name: 'Tri-Sword Attack', type: 'ATTACK', damageType: 'Dynamic', baseAttack: 0, dice: 0, coins: 1, isZectusMainAttack: true }
        ]
    },
];

// Enemy Definition (The first opponent)
const ENEMY_GOBLIN = {
    id: 'goblin',
    name: 'Gravel-Claw Goblin',
    baseStats: { maxHP: 80, defense: 2, level: 1, currentHP: 80, status: 'Alive', effects: [], grapple_die: 6, gender: 'Male', speed: 2 },
    abilities: [
        { name: 'Gnaw Attack', type: 'ATTACK', damageType: 'Physical', baseAttack: 5, dice: 6, coins: 2, },
        { name: 'Defensive Crouch', type: 'DEFENSE', defenseEffect: 'DefensePlusTwo', baseAttack: 0, dice: 0, coins: 0, },
    ]
};


// --- UTILITY FUNCTIONS ---

const rollDie = (max) => Math.floor(Math.random() * max) + 1;

/**
 * Rolls a specified number of coins (50/50 chance for 1 point per coin).
 */
const rollCoins = (count) => {
    let sum = 0;
    for (let i = 0; i < count; i++) {
        sum += (Math.random() < 0.5 ? 0 : 1);
    }
    return sum;
};

function updateHealthDisplay(entity, ui) {
    const maxHP = entity.baseStats.maxHP;
    const currentHP = entity.baseStats.currentHP;
    const percentage = Math.max(0, (currentHP / maxHP) * 100);

    ui.hpBar.style.width = `${percentage}%`;
    ui.hpText.textContent = `${currentHP}/${maxHP}`;
    
    // Display status effects if present
    const effects = entity.baseStats.effects;
    let statusDisplay = entity.baseStats.status;

    if (effects.length > 0) {
        statusDisplay += ` (${effects.join(', ')})`;
    }
    
    ui.statusText.textContent = statusDisplay;

    if (currentHP <= 0) {
        ui.hpBar.style.width = '0%';
        ui.statusText.textContent = 'Defeated';
    }
}

function log(message, className = '') {
    const logDiv = document.createElement('p');
    logDiv.classList.add('log-entry', className);
    logDiv.textContent = `[T${gameState.turn}] ${message}`;
    combatLog.prepend(logDiv);
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
            <p><strong>HP:</strong> ${char.baseStats.maxHP} | <strong>DEF:</strong> ${char.baseStats.defense} | <strong>SPD:</strong> ${char.baseStats.speed}</p>
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
    const selectedCharData = CHARACTERS.find(c => c.id === charId);
    
    // Define a base template with all possible unique/dynamic stats
    const commonBaseStats = {
        maxHP: 100, currentHP: 100, defense: 0, level: 1, status: 'Alive', speed: 0, 
        consecutive_rounds: 0, 
        isGrappling: false, 
        grapple_die: 8, 
        lastDamageTaken: 0, // Used by Shuten-Maru
        tri_sword_state: 'Scythe', // Used by Zectus Maximus
        effects: [], 
        gender: 'Male', // Used by Zectus Maximus
    };

    // 1. Initialize Player: Deep copy and merge character data with full base stats
    gameState.player = JSON.parse(JSON.stringify(selectedCharData)); 
    gameState.player.baseStats = { 
        ...commonBaseStats, 
        ...gameState.player.baseStats,
        // Ensure HP values are preserved from the original data
        currentHP: gameState.player.baseStats.maxHP
    };

    // 2. Initialize Enemy: Deep copy and merge enemy data with full base stats
    gameState.enemy = JSON.parse(JSON.stringify(ENEMY_GOBLIN));
    gameState.enemy.baseStats = { 
        ...commonBaseStats, 
        ...gameState.enemy.baseStats,
        // Ensure HP values are preserved from the original data
        currentHP: gameState.enemy.baseStats.maxHP
    };

    // 3. Reset Game State
    gameState.turn = 1;
    gameState.playerAction = null;
    gameState.enemyAction = null;


    // 4. Clear UI
    combatLog.innerHTML = '';
    dialogueText.textContent = `A powerful champion, ${gameState.player.name}, steps forward!`;

    // 5. Start Combat
    setView('combat');
    log(`${gameState.enemy.name} challenges ${gameState.player.name}!`, 'log-special');
    updateCombatUI();
    
    passTurnBtn.classList.add('hidden'); 
}

function updateCombatUI() {
    updateHealthDisplay(gameState.player, playerStatus);
    updateHealthDisplay(gameState.enemy, enemyStatus);

    playerStatus.name.textContent = gameState.player.name;
    enemyStatus.name.textContent = gameState.enemy.name;

    passTurnBtn.classList.add('hidden'); 

    // Disable action buttons if an action has been chosen
    const buttons = actionButtonsDiv.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = gameState.playerAction !== null);
}


// --- COMBAT CORE MECHANICS ---

/**
 * 1. Player selects an action. This stores the action and triggers the Enemy AI.
 */
function executeAbility(ability) {
    if (gameState.playerAction) return; 

    // ZECTUS DYNAMIC ATTACK RESOLUTION
    // If the player clicked the dynamic 'Tri-Sword Attack' button, find the correct stats.
    let resolvedAbility = ability;
    if (ability.isZectusMainAttack) {
        resolvedAbility = getZectusCurrentAbility(gameState.player.baseStats.tri_sword_state);
        // If the current state isn't a valid attack (shouldn't happen), use the Cycle ability
        if (!resolvedAbility) {
            resolvedAbility = gameState.player.abilities.find(a => a.name === 'Cycle');
        }
    }
    
    gameState.playerAction = resolvedAbility;
    log(`${gameState.player.name} chooses ${resolvedAbility.name}...`, 'log-special');
    
    // Disable buttons until round resolves
    updateCombatUI();

    // Enemy selects its action immediately after the player
    selectEnemyAction();
    
    // Wait for a short moment for effect and then resolve the turn
    setTimeout(resolveCombatRound, 500);
}

/**
 * Helper function for Zectus: gets the actual ability stats based on weapon state
 */
function getZectusCurrentAbility(state) {
    const allZectusAbilities = CHARACTERS.find(c => c.id === 'zectus').abilities;
    if (state === 'Scythe') return allZectusAbilities.find(a => a.name === 'Tri-Sword: Scythe');
    if (state === 'Trident') return allZectusAbilities.find(a => a.name === 'Tri-Sword: Trident');
    if (state === 'Hammer') return allZectusAbilities.find(a => a.name === 'Tri-Sword: Hammer');
    return null; 
}


/**
 * Enemy AI selects its action.
 */
function selectEnemyAction() {
    const enemyAbilities = gameState.enemy.abilities;
    const enemyAttack = enemyAbilities.find(a => a.type === 'ATTACK');
    const enemyDefense = enemyAbilities.find(a => a.type === 'DEFENSE');

    // Stagger Check: If enemy is Staggered, they auto-select 'NONE' (skip turn)
    if (gameState.enemy.baseStats.effects.includes('Stagger')) {
        gameState.enemyAction = { name: 'Staggered', type: 'NONE' };
        log(`${gameState.enemy.name} is Staggered and cannot act!`, 'log-loss');
        return;
    }

    let chosenAbility;
    if (enemyDefense && Math.random() < 0.5) {
        chosenAbility = enemyDefense;
    } else {
        chosenAbility = enemyAttack;
    }
    
    gameState.enemyAction = chosenAbility;
    log(`${gameState.enemy.name} prepares to use ${chosenAbility.name}!`, 'log-special');
}


/**
 * 2. Main Turn Resolution: Determines action order and resolves conflict.
 */
function resolveCombatRound() {
    const playerAbility = gameState.playerAction;
    const enemyAbility = gameState.enemyAction;

    if (checkGameOver()) return;

    // Check Player Stagger: If player is Staggered, they skip this action entirely
    if (gameState.player.baseStats.effects.includes('Stagger')) {
        log(`${gameState.player.name} is Staggered and skips their action!`, 'log-loss');
        // Player action is effectively cancelled, but we still need to check the enemy
        // If enemy also attacked, it's a null clash. If enemy defended/special, their action proceeds.
        
        // If enemy didn't attack or was also staggered, go to cleanup
        if (enemyAbility.type !== 'ATTACK' || enemyAbility.type === 'NONE') {
            log(`...continuing to cleanup.`, 'log-special');
            setTimeout(endTurnCleanup, 1000);
            return;
        } 
        
        // If enemy attacked while player was Staggered, enemy attacks unopposed
        log(`${gameState.enemy.name} attacks while ${gameState.player.name} is Staggered!`, 'log-win');
        executeSingleAction(gameState.enemy, enemyAbility, gameState.player);
        if (checkGameOver()) return;
        setTimeout(endTurnCleanup, 1000);
        return;
    }


    // Safely check types and speeds
    const pType = playerAbility ? playerAbility.type : 'NONE';
    const eType = enemyAbility ? enemyAbility.type : 'NONE';
    const pSpeed = gameState.player.baseStats.speed || 0;
    const eSpeed = gameState.enemy.baseStats.speed || 0;
    
    log(`Player Speed: ${pSpeed}, Enemy Speed: ${eSpeed}.`, 'log-special');

    // Case 1: Both ATTACK -> CLASH
    if (pType === 'ATTACK' && eType === 'ATTACK') {
        log(`Both attack! Initiating CLASH...`, 'log-special');
        handleClash(playerAbility, enemyAbility);
        
        if (checkGameOver()) return; 
    
    // Case 2: Mixed Actions or Non-Attack vs Attack -> Speed determines priority
    } else {
        let first, second;
        let firstAbility, secondAbility;

        // Determine who goes first based on speed
        if (pSpeed > eSpeed) {
            first = gameState.player;
            firstAbility = playerAbility;
            second = gameState.enemy;
            secondAbility = enemyAbility;
        } else if (eSpeed > pSpeed) {
            first = gameState.enemy;
            firstAbility = enemyAbility;
            second = gameState.player;
            secondAbility = playerAbility; 
        } else {
            // Speed Tie: Default to Player acting first 
            first = gameState.player;
            firstAbility = playerAbility;
            second = gameState.enemy;
            secondAbility = enemyAbility;
            log(`Speed tie! ${first.name} acts first.`, 'log-special');
        }

        // --- Resolve First Action ---
        log(`${first.name} (${firstAbility.name}) acts first.`, 'log-special');
        executeSingleAction(first, firstAbility, second);
        if (checkGameOver()) return;
        
        // --- Resolve Second Action ---
        // Only run second action if the target is still alive and the action type is not NONE (Staggered)
        if (second.baseStats.currentHP > 0 && secondAbility.type !== 'NONE') {
            log(`${second.name} (${secondAbility.name}) acts second.`, 'log-special');
            executeSingleAction(second, secondAbility, first);
        } else if (secondAbility.type === 'NONE') {
            log(`${second.name} skips their turn.`, 'log-loss');
        }
        
        if (checkGameOver()) return; 
    }
    
    // 3. Cleanup and Next Turn Setup
    setTimeout(endTurnCleanup, 1000);
}

/**
 * Resolves a single action (Defense, Special, or Attack) outside of a clash.
 */
function executeSingleAction(attacker, ability, target) {
    if (target.baseStats.currentHP <= 0) return; 
    if (!ability) return; 

    if (ability.type === 'DEFENSE') {
        if (ability.defenseEffect === 'NegateNextHit') {
            if (!Array.isArray(target.baseStats.effects)) { target.baseStats.effects = []; }
            target.baseStats.effects.push('NegateNextHit');
        }
        log(`${attacker.name} successfully executes a defensive maneuver!`, 'log-win');
        
    } else if (ability.type === 'SPECIAL') {
        // Balter's Grapple logic
        if (ability.name === 'Grapple') {
            const attackerRoll = rollDie(ability.dice || 10); 
            const targetGrappleDie = target.baseStats.grapple_die || 8;
            const targetRoll = rollDie(targetGrappleDie);
            
            if (attackerRoll > targetRoll) {
                if (!Array.isArray(target.baseStats.effects)) { target.baseStats.effects = []; }
                target.baseStats.effects.push('Grappled');
                log(`${attacker.name} successfully grapples ${target.name}! ${target.name} auto-loses the next clash.`, 'log-win');
            } else {
                log(`${attacker.name} fails to grapple ${target.name}.`, 'log-loss');
            }
        }
        
    } else if (ability.type === 'SWITCH') {
        // Zectus Cycle logic: deals 2 damage to TARGET on activation
        let currentWeapon = attacker.baseStats.tri_sword_state;
        const weapons = ['Scythe', 'Trident', 'Hammer'];
        let currentIndex = weapons.indexOf(currentWeapon);
        let nextIndex = (currentIndex + 1) % weapons.length;
        
        attacker.baseStats.tri_sword_state = weapons[nextIndex];
        
        // Damage is applied to the target
        const damage = ability.baseAttack || 2; 
        target.baseStats.currentHP = Math.max(0, target.baseStats.currentHP - damage); 
        log(`${attacker.name} cycles weapon to ${weapons[nextIndex]}. Deals ${damage} damage to ${target.name}!`, 'log-win');

    } else if (ability.type === 'ATTACK') {
        // If the attacker is faster and attacks, apply damage normally
        applyDamage(ability, attacker, target);
        
        // Apply Stagger if the attack has that status effect
        if (ability.statusEffect === 'Stagger') {
            if (!Array.isArray(target.baseStats.effects)) { target.baseStats.effects = []; }
            target.baseStats.effects.push('Stagger');
            log(`${target.name} is **Staggered** and will skip their next turn!`, 'log-loss');
        }
    }
}


/**
 * 3. The Core Clash Logic (When both characters attack)
 */
function handleClash(pAbility, eAbility) {
    try {
        if (!pAbility || !eAbility) {
            log(`CRITICAL: Missing Player or Enemy ability object in Clash.`, 'log-loss');
            return; 
        }

        if (!Array.isArray(gameState.enemy.baseStats.effects)) { gameState.enemy.baseStats.effects = []; }
        if (!Array.isArray(gameState.player.baseStats.effects)) { gameState.player.baseStats.effects = []; }

        // --- 1. SETUP ---
        log(`DEBUG ABILITY NAMES: P(${pAbility.name}) vs E(${eAbility.name})`, 'log-debug');

        // Balter Piledriver (Grapple removal happens in applyDamage)
        const isPiledriver = pAbility.name === 'Piledriver';
        
        // ZECTUS ATTACK: If Zectus, get dynamic stats
        if (pAbility.isZectusMainAttack) {
            pAbility = getZectusCurrentAbility(gameState.player.baseStats.tri_sword_state);
        }


        // 2. Determine final coin counts
        const basePlayerCoins = (typeof pAbility.coins === 'number') ? pAbility.coins : 0;
        const baseEnemyCoins = (typeof eAbility.coins === 'number') ? eAbility.coins : 0;
        const pDice = (typeof pAbility.dice === 'number' && pAbility.dice > 0) ? pAbility.dice : 1;
        const eDice = (typeof eAbility.dice === 'number' && eAbility.dice > 0) ? eAbility.dice : 1;
        
        // Striker Passive: Coin Bonus
        const strikerBonus = (gameState.player.id === 'striker' && gameState.player.baseStats.consecutive_rounds > 0) 
            ? gameState.player.baseStats.consecutive_rounds 
            : 0;

        const pCoins = basePlayerCoins + strikerBonus;
        const eCoins = baseEnemyCoins;

        log(`DEBUG CLASH PARAMS: PCoins(${pCoins}) ECoins(${eCoins}) PDice(${pDice}) EDice(${eDice})`, 'log-debug'); 

        // --- 3. ROLL ---
        const playerRoll = rollDie(pDice);
        const enemyRoll = rollDie(eDice);
        const playerCoinBonus = rollCoins(pCoins); 
        const enemyCoinBonus = rollCoins(eCoins); 

        log(`DEBUG PLAYER ROLL: D${pDice} = ${playerRoll} | Coin Bonus(${pCoins}) = ${playerCoinBonus}`, 'log-debug');
        log(`DEBUG ENEMY ROLL: D${eDice} = ${enemyRoll} | Coin Bonus(${eCoins}) = ${enemyCoinBonus}`, 'log-debug');

        // 4. Calculate clash values
        const playerClashValue = BASE_CLASH_VALUE + playerRoll + playerCoinBonus;
        const enemyClashValue = BASE_CLASH_VALUE + enemyRoll + enemyCoinBonus;
        
        log(`DEBUG CLASH VALUES: P(${playerClashValue}) vs E(${enemyClashValue})`, 'log-debug'); 
        
        let winner, loser, winnerAbility, winnerCoinBonus, winnerDiceRoll;

        // --- 5. DETERMINE WINNER ---
        const isEnemyGrappled = gameState.enemy.baseStats.effects.includes('Grappled');

        if (isEnemyGrappled && !isPiledriver) { 
            // Grapple only auto-loses if the player didn't use Piledriver (which removes Grappled)
            winner = gameState.player;
            loser = gameState.enemy;
            winnerAbility = pAbility;
            winnerCoinBonus = playerCoinBonus;
            winnerDiceRoll = playerRoll;
            log(`${gameState.enemy.name} is Grappled and automatically loses the clash!`, 'log-loss');
        } else if (playerClashValue >= enemyClashValue) {
            winner = gameState.player;
            loser = gameState.enemy;
            winnerAbility = pAbility;
            winnerCoinBonus = playerCoinBonus;
            winnerDiceRoll = playerRoll;
        } else {
            winner = gameState.enemy;
            loser = gameState.player;
            winnerAbility = eAbility;
            winnerCoinBonus = enemyCoinBonus; 
            winnerDiceRoll = enemyRoll;       
        }

        log(`${winner.name} wins the clash!`, 'log-win');

        // --- 6. APPLY DAMAGE ---
        if (winnerAbility && typeof winnerAbility === 'object') {
            applyDamage(winnerAbility, winner, loser, winnerCoinBonus, winnerDiceRoll); 
        } else {
            log(`Clash finished but winner ability was undefined or invalid. No damage applied.`, 'log-loss');
        }

        // 7. Balter's "The Old One, Two" Passive
        if (winner.id === 'balter' && winner.uniquePassive.type === 'ClashWinBonus' && loser.baseStats.currentHP > 0) {
            const bonusDamageRoll = rollDie(winner.uniquePassive.dice);
            const bonusDamage = Math.max(0, bonusDamageRoll - loser.baseStats.defense); 
            loser.baseStats.currentHP = Math.max(0, loser.baseStats.currentHP - bonusDamage);
            log(`Balter follows up with "The Old One, Two" for an extra ${bonusDamage} damage! (d${winner.uniquePassive.dice} roll: ${bonusDamageRoll})`, 'log-win');
        }
        
        // 8. Apply Stagger if the winning attack has that status effect
        if (winnerAbility.statusEffect === 'Stagger') {
            if (!Array.isArray(loser.baseStats.effects)) { loser.baseStats.effects = []; }
            loser.baseStats.effects.push('Stagger');
            log(`${loser.name} is **Staggered** and will skip their next turn!`, 'log-loss');
        }


        log(`DEBUG: Clash resolved successfully.`, 'log-debug');
        
    } catch (error) {
        log(`CRITICAL CLASH ERROR: Clash resolution failed. Check console for details.`, 'log-loss');
        console.error("Clash resolution failed:", error);
    }
}

/**
 * 4. Damage Application (called by Clash or Single Action)
 */
function applyDamage(ability, attacker, target, coinBonus = rollCoins(ability.coins), diceRoll = rollDie(ability.dice)) {
    if (!Array.isArray(target.baseStats.effects)) { target.baseStats.effects = []; }

    // 1. Calculate base damage
    let damage = (ability.baseAttack || 0) + (coinBonus || 0); 
    
    // 2. Apply target defense reduction
    let finalDamage = Math.max(0, damage - target.baseStats.defense);

    // 3. Apply Shuten-Maru Phase effect
    const negateIndex = target.baseStats.effects.indexOf('NegateNextHit');
    if (negateIndex !== -1) {
        log(`${target.name} Phases, negating all incoming damage!`, 'log-win');
        target.baseStats.effects.splice(negateIndex, 1); // Remove effect
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
        const healAmount = target.baseStats.lastDamageTaken; 
        attacker.baseStats.currentHP = Math.min(attacker.baseStats.maxHP, attacker.baseStats.currentHP + healAmount);
        log(`Chrono-Fist triggered! Shuten-Maru heals back ${healAmount} damage.`, 'log-win');
    }

    // 7. Apply Balter Piledriver cleanup (MUST be applied after damage if it was a Piledriver attack)
    if (ability.name === 'Piledriver' && ability.removesTargetStatus === 'Grappled') {
        target.baseStats.effects = target.baseStats.effects.filter(e => e !== 'Grappled');
        log(`${target.name} is released from the grapple.`, 'log-special');
        attacker.baseStats.isGrappling = false;
    }
}


/**
 * 5. End of Turn Cleanup & Setup for Next Turn
 */
function endTurnCleanup() {
    // 1. Clear Stagger effect for both player and enemy
    gameState.player.baseStats.effects = gameState.player.baseStats.effects.filter(e => e !== 'Stagger');
    gameState.enemy.baseStats.effects = gameState.enemy.baseStats.effects.filter(e => e !== 'Stagger');
    
    // 2. Striker: Increase consecutive rounds
    if (gameState.player.id === 'striker') {
        gameState.player.baseStats.consecutive_rounds++;
    }

    if (checkGameOver()) return;

    // 3. Reset actions for the next turn
    gameState.playerAction = null;
    gameState.enemyAction = null;
    gameState.turn++;
    
    log(`--- Start of Turn ${gameState.turn} ---`, 'log-special');

    // 4. Re-render UI
    updateCombatUI();
    renderCombatActions();
}

/**
 * Checks for a winner/loser and displays the game over screen.
 */
function checkGameOver() {
    updateCombatUI(); 
    
    if (gameState.player.baseStats.currentHP <= 0) {
        gameState.player.baseStats.status = 'Defeated';
        log(`${gameState.player.name} has been defeated. Game Over.`, 'log-loss');
        dialogueText.textContent = "You have been vanquished.";
        actionButtonsDiv.innerHTML = '<button onclick="location.reload()">Return to Menu</button>';
        return true;
    } else if (gameState.enemy.baseStats.currentHP <= 0) {
        gameState.enemy.baseStats.status = 'Defeated';
        log(`${gameState.enemy.name} is vanquished! Victory!`, 'log-win');
        dialogueText.textContent = "You win! Adventure continues...";
        actionButtonsDiv.innerHTML = '<button onclick="location.reload()">Next Area (WIP)</button>';
        return true;
    }
    return false;
}


/**
 * 6. Action Rendering (dynamically creates buttons)
 */
function renderCombatActions() {
    actionButtonsDiv.innerHTML = '';
    const playerAbilities = gameState.player.abilities;
    const isEnemyGrappled = gameState.enemy.baseStats.effects.includes('Grappled'); 
    const currentWeapon = gameState.player.baseStats.tri_sword_state; 
    
    // Filter out hidden abilities (Balter's Piledriver definition, Zectus's 3 Tri-Sword definitions)
    const renderableAbilities = playerAbilities.filter(ability => {
        // Balter's Grapple/Piledriver logic
        if (gameState.player.id === 'balter') {
            const isGrapple = ability.name === 'Grapple';
            const isPiledriver = ability.name === 'Piledriver';
            
            // Only render Grapple if enemy is NOT grappled, or Piledriver if enemy IS grappled.
            if (isGrapple && isEnemyGrappled) return false;
            if (isPiledriver && !isEnemyGrappled) return false;
            if (isPiledriver || isGrapple) return true;
        }

        // Zectus's Tri-Sword logic: only show the combined attack button
        if (gameState.player.id === 'zectus') {
             if (ability.isZectusMainAttack || ability.name === 'Cycle') return true;
             // Hide the individual Tri-Sword definitions
             if (ability.name.startsWith('Tri-Sword:')) return false;
        }

        return !ability.isHidden;
    });

    renderableAbilities.forEach(ability => {
        const btn = document.createElement('button');
        btn.classList.add('combat-btn');
        let displayName = ability.name;

        // Balter's dynamic button label
        if (gameState.player.id === 'balter' && ability.name === 'Piledriver') {
            displayName = 'Piledriver (FINISHER!)'; 
        }
        
        // Zectus's dynamic button label and active state
        if (gameState.player.id === 'zectus' && ability.isZectusMainAttack) {
            displayName = `Tri-Sword: ${currentWeapon}`;
            
            // Highlight the current attack button
            btn.classList.add('active-weapon-btn'); 
            btn.style.borderColor = 'var(--hp-color)';
            btn.style.borderWidth = '3px';
            btn.style.boxShadow = '0 0 10px var(--hp-color)';
        }

        btn.textContent = displayName;
        btn.onclick = () => executeAbility(ability);
        actionButtonsDiv.appendChild(btn);
    });
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

    // Settings listeners
    openSettingsBtn.addEventListener('click', toggleSettingsPanel);
    closeSettingsBtn.addEventListener('click', toggleSettingsPanel);
    themeOptionBtns.forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });
}

// Initialize the game when the window loads
window.onload = init;
