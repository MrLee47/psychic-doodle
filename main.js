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
            { name: 'Heavy Blow', type: 'ATTACK', damageType: 'Force', baseAttack: 10, dice: 12, coins: 0, statusEffect: 'StunNext', cost: 10 }, 
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
            { name: 'Tri-Sword: Scythe', type: 'ATTACK', damageType: 'Necrotic', baseAttack: 6, dice: 8, coins: 1, weaponState: 'Scythe' },
            { name: 'Tri-Sword: Trident', type: 'ATTACK', damageType: 'Physical', baseAttack: 7, dice: 10, coins: 1, weaponState: 'Trident' },
            { name: 'Tri-Sword: Hammer', type: 'ATTACK', damageType: 'Force', baseAttack: 8, dice: 12, coins: 1, weaponState: 'Hammer' }
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

const rollCoins = (count) => {
    let sum = 0;
    // Ensure count is a non-negative integer
    const finalCount = Math.max(0, parseInt(count, 10) || 0); 
    
    for (let i = 0; i < finalCount; i++) {
        sum += (Math.random() < 0.5 ? 0 : 1); // 50% chance for 1
    }
    return sum;
};

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
    // 1. Initialize Player and Enemy
    const selectedCharData = CHARACTERS.find(c => c.id === charId);
    gameState.player = JSON.parse(JSON.stringify(selectedCharData)); 
    gameState.enemy = JSON.parse(JSON.stringify(ENEMY_GOBLIN)); 

    // 2. Reset Game State
    gameState.turn = 1;
    gameState.player.baseStats.currentHP = gameState.player.baseStats.maxHP;
    gameState.enemy.baseStats.currentHP = gameState.enemy.baseStats.maxHP;
    gameState.player.baseStats.consecutive_rounds = 0; 
    gameState.playerAction = null;
    gameState.enemyAction = null;


    // 3. Clear UI
    combatLog.innerHTML = '';
    dialogueText.textContent = `A powerful champion, ${gameState.player.name}, steps forward!`;

    // 4. Start Combat
    setView('combat');
    log(`${gameState.enemy.name} challenges ${gameState.player.name}!`, 'log-special');
    updateCombatUI();
    
    // Ensure Balter's old "Pass Turn" button is always hidden
    passTurnBtn.classList.add('hidden'); 
}

function updateCombatUI() {
    updateHealthDisplay(gameState.player, playerStatus);
    updateHealthDisplay(gameState.enemy, enemyStatus);

    playerStatus.name.textContent = gameState.player.name;
    enemyStatus.name.textContent = gameState.enemy.name;

    // Ensure Balter's old "Pass Turn" button is always hidden
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

    // Balter's Piledriver requires Grappled status on the enemy
    if (gameState.player.id === 'balter' && ability.name === 'Piledriver' && !gameState.enemy.baseStats.effects.includes('Grappled')) {
        log("Piledriver requires the enemy to be Grappled!", 'log-loss');
        return;
    }
    
    // Zectus's Tri-Sword attacks can only be used if they match the current state
    if (gameState.player.id === 'zectus' && ability.type === 'ATTACK' && ability.weaponState !== gameState.player.baseStats.tri_sword_state) {
        log(`The ${ability.weaponState} is not Zectus's active weapon state! Cycle first.`, 'log-loss');
        return;
    }


    gameState.playerAction = ability;
    log(`${gameState.player.name} chooses ${ability.name}...`, 'log-special');
    
    // Disable buttons until round resolves
    updateCombatUI();

    // Enemy selects its action immediately after the player
    selectEnemyAction();
    
    // Wait for a short moment for effect and then resolve the turn
    setTimeout(resolveCombatRound, 500);
}

/**
 * Enemy AI selects its action.
 */
function selectEnemyAction() {
    const enemyAbilities = gameState.enemy.abilities;
    const enemyAttack = enemyAbilities.find(a => a.type === 'ATTACK');
    const enemyDefense = enemyAbilities.find(a => a.type === 'DEFENSE');

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
        
        // This log confirms if control returned gracefully after the clash function
        log(`DEBUG: Clash finished. Resuming combat flow...`, 'log-debug'); 
        
        // CRITICAL FIX: Check for game over immediately after clash damage is applied
        if (checkGameOver()) return; 
    
    // Case 2: Mixed Actions -> Speed determines priority
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

        log(`${first.name} (${firstAbility.name}) acts first.`, 'log-special');

        // Resolve First Action
        executeSingleAction(first, firstAbility, second);
        if (checkGameOver()) return;
        
        // Resolve Second Action
        log(`${second.name} (${secondAbility.name}) acts second.`, 'log-special');
        executeSingleAction(second, secondAbility, first);
        
        // CRITICAL FIX: Check for game over after the second action resolves
        if (checkGameOver()) return; 
    }
    
    // 3. Cleanup and Next Turn Setup
    setTimeout(endTurnCleanup, 1000);
}

/**
 * Resolves a single action (Defense, Special, or Attack) outside of a clash.
 */
function executeSingleAction(attacker, ability, target) {
    if (target.baseStats.currentHP <= 0) return; // Target is already defeated by the first action
    if (!ability) return; // Safety check

    if (ability.type === 'DEFENSE') {
        if (ability.defenseEffect === 'NegateNextHit') {
            target.baseStats.effects.push('NegateNextHit');
        } else {
             // Add other defense buffs (e.g., temporary defense boost)
        }
        log(`${attacker.name} successfully executes a defensive maneuver!`, 'log-win');
        
    } else if (ability.type === 'SPECIAL') {
        // Balter's Grapple logic
        if (ability.name === 'Grapple') {
            const attackerRoll = rollDie(ability.dice || 10); // Use 10 as default dice
            const targetGrappleDie = target.baseStats.grapple_die || 8;
            const targetRoll = rollDie(targetGrappleDie);
            
            if (attackerRoll > targetRoll) {
                target.baseStats.effects.push('Grappled');
                log(`${attacker.name} successfully grapples ${target.name}! ${target.name} auto-loses the next clash.`, 'log-win');
                attacker.baseStats.isGrappling = true;
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
    }
}


/**
 * 3. The Core Clash Logic (When both characters attack)
 */
function handleClash(pAbility, eAbility) {
    try {
        // CRITICAL CHECK 1: Ensure both abilities are defined before attempting to access properties
        if (!pAbility || !eAbility) {
            log(`CRITICAL: Missing Player(${!!pAbility}) or Enemy(${!!eAbility}) ability object in Clash.`, 'log-loss');
            return; 
        }

        // CRITICAL CHECK 2: Logs the actual names of the abilities used
        log(`DEBUG ABILITY NAMES: P(${pAbility.name}) vs E(${eAbility.name})`, 'log-debug');
        
        // 1. Determine final coin count (Using safe fallbacks)
        const basePlayerCoins = typeof pAbility.coins === 'number' ? pAbility.coins : 0;
        const baseEnemyCoins = typeof eAbility.coins === 'number' ? eAbility.coins : 0;
        
        // Striker Passive (safely calculate bonus)
        const strikerBonus = (gameState.player.id === 'striker' && gameState.player.baseStats.consecutive_rounds > 0) 
            ? gameState.player.baseStats.consecutive_rounds 
            : 0;

        const pCoins = basePlayerCoins + strikerBonus;
        const eCoins = baseEnemyCoins;

        // Safely determine dice values (Using safe fallbacks, dice MUST be > 0 for rollDie)
        const pDice = typeof pAbility.dice === 'number' && pAbility.dice > 0 ? pAbility.dice : 1;
        const eDice = typeof eAbility.dice === 'number' && eAbility.dice > 0 ? eAbility.dice : 1;

        // Final sanity check log before rolls
        log(`DEBUG CLASH PARAMS: PCoins(${pCoins}) ECoins(${eCoins}) PDice(${pDice}) EDice(${eDice})`, 'log-debug'); 

        // 2. Calculate Clash Values
        const playerRoll = rollDie(pDice);
        const playerCoinBonus = rollCoins(pCoins);
        const playerClashValue = BASE_CLASH_VALUE + playerRoll + playerCoinBonus;

        const enemyRoll = rollDie(eDice);
        const enemyCoinBonus = rollCoins(eCoins);
        const enemyClashValue = BASE_CLASH_VALUE + enemyRoll + enemyCoinBonus;

        // This log confirms the calculation succeeded
        log(`Clash! P Roll: ${playerRoll} (+${playerCoinBonus} coins) = ${playerClashValue} | E Roll: ${enemyRoll} (+${enemyCoinBonus} coins) = ${enemyClashValue}`);

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
        const coinBonus = winner.id === gameState.player.id ? playerCoinBonus : enemyCoinBonus;
        const diceRoll = winner.id === gameState.player.id ? playerRoll : enemyRoll;

        // Check winner ability before applying damage (safety)
        if (winnerAbility) {
            applyDamage(winnerAbility, winner, loser, coinBonus, diceRoll);
        } else {
            log(`Clash finished but winner ability was undefined. No damage applied.`, 'log-loss');
        }

        
        // --- Balter's "The Old One, Two" Passive ---
        if (winner.id === 'balter' && winner.uniquePassive.type === 'ClashWinBonus' && loser.baseStats.currentHP > 0) {
            const bonusDamageRoll = rollDie(winner.uniquePassive.dice);
            // Apply loser's defense to the bonus hit
            const bonusDamage = Math.max(0, bonusDamageRoll - loser.baseStats.defense); 
            loser.baseStats.currentHP = Math.max(0, loser.baseStats.currentHP - bonusDamage);
            log(`Balter follows up with "The Old One, Two" for an extra ${bonusDamage} damage! (d${winner.uniquePassive.dice} roll: ${bonusDamageRoll})`, 'log-win');
        }
    } catch (error) {
        // This should now definitely catch any error if it occurs after the log in resolveCombatRound
        log(`CRITICAL CLASH ERROR: Clash resolution failed. Check console for details.`, 'log-loss');
        console.error("Clash resolution failed:", error);
    }
}

/**
 * 4. Damage Application (called by Clash or Single Action)
 */
function applyDamage(ability, attacker, target, coinBonus = rollCoins(ability.coins), diceRoll = rollDie(ability.dice)) {
    // 1. Calculate base damage
    let damage = (ability.baseAttack || 0) + (coinBonus || 0); // Safety check baseAttack/coinBonus
    
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
        const healAmount = attacker.baseStats.lastDamageTaken;
        attacker.baseStats.currentHP = Math.min(attacker.baseStats.maxHP, attacker.baseStats.currentHP + healAmount);
        log(`Chrono-Fist triggered! Shuten-Maru heals back ${healAmount} damage.`, 'log-win');
    }

    // 7. Apply Balter Piledriver cleanup
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
    // Striker: Increase consecutive rounds
    if (gameState.player.id === 'striker') {
        gameState.player.baseStats.consecutive_rounds++;
    }

    // Check for death (redundant check, but safer)
    if (checkGameOver()) return;

    // Reset actions for the next turn
    gameState.playerAction = null;
    gameState.enemyAction = null;
    gameState.turn++;
    
    log(`--- Start of Turn ${gameState.turn} ---`, 'log-special');

    // Re-render UI
    updateCombatUI();
    renderCombatActions();
}

/**
 * Checks for a winner/loser and displays the game over screen.
 */
function checkGameOver() {
    // CRITICAL FIX: Update the UI one last time to reflect the defeat status
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
    const isGrappling = gameState.enemy.baseStats.effects.includes('Grappled'); // Check enemy status for Grappled
    const currentWeapon = gameState.player.baseStats.tri_sword_state; 

    playerAbilities.forEach(ability => {
        let isAvailable = true;
        let displayName = ability.name;
        let isZectusAttack = false;

        // Balter's conditional abilities
        if (gameState.player.id === 'balter') {
            const isPiledriver = ability.name === 'Piledriver';
            
            // Piledriver is hidden if not grappling
            if (isPiledriver && !isGrappling) {
                isAvailable = false;
            } else if (isPiledriver) {
                displayName = 'Piledriver (FINISHER!)'; 
            }
        }
        
        // Zectus's abilities
        if (gameState.player.id === 'zectus' && ability.type === 'ATTACK') {
            isZectusAttack = true;
            displayName = `Tri-Sword: ${ability.weaponState}`;
        }
        
        // Hide abilities only if they have isHidden AND aren't overridden above (like Piledriver)
        if (ability.isHidden && !isZectusAttack && ability.name !== 'Piledriver') {
            isAvailable = false;
        }

        
        if (isAvailable) {
            const btn = document.createElement('button');
            btn.classList.add('combat-btn');
            btn.textContent = displayName;
            
            // Highlight Zectus's current weapon
            if (isZectusAttack && ability.weaponState === currentWeapon) {
                btn.classList.add('active-weapon-btn'); 
                // Set a strong contrasting style for the active weapon
                btn.style.borderColor = 'var(--hp-color)';
                btn.style.borderWidth = '3px';
                btn.style.boxShadow = '0 0 10px var(--hp-color)';
            }
            
            btn.onclick = () => executeAbility(ability);
            actionButtonsDiv.appendChild(btn);
        }
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
