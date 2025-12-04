/**
 * Character data for the Coin & Dice Clash system.
 * * Ability Properties:
 * - baseAttack: Flat damage added to the coin flip bonus for damage calculation.
 * - dice: The size of the die used for the Clash Roll (e.g., 6 for d6).
 * - coins: The base number of coin flips added to the Clash Roll.
 * - damageType: Force, Psychic, Physical, Necrotic (used for resistances/vulnerabilities).
 * * Combat Formulas (Logic implemented in main.js):
 * - Clash Value = Base Roll (5) + Dice Result + Sum of Coin Flips
 * - Damage Taken (if attack wins clash) = Base Attack + Sum of Coin Flips - Target Defense
 */

export const Characters = [
    // --- 1. Striker (Slow Start: Coin Scaler) ---
    {
        id: 'striker',
        name: 'Striker',
        description: 'A damage specialist who scales in power the longer a fight lasts.',
        baseStats: {
            maxHP: 110,
            defense: 2,
            level: 1,
            // Unique state tracking:
            consecutive_rounds: 0, 
        },
        uniquePassive: { 
            name: 'Slow Start', 
            effect: 'Each consecutive combat round, gains +1 Coin to all attacks.',
            type: 'CoinScaler'
        },
        abilities: [
            {
                name: 'Dragon Strike',
                type: 'ATTACK',
                damageType: 'Force',
                baseAttack: 4, 
                dice: 4, 
                coins: 2, 
            },
            {
                name: 'Heavy Blow',
                type: 'ATTACK',
                damageType: 'Force',
                baseAttack: 10, 
                dice: 12,
                coins: 0,
                statusEffect: 'EndTurnNext', // Prevents action next turn
            }
        ]
    },

    // --- 2. Shuten-Maru (Chrono-Fist: Roll-Triggered Reversal) ---
    {
        id: 'shutenmaru',
        name: 'Shuten-Maru',
        description: 'A swift, ghostly fighter focused on survivability and counter-play.',
        baseStats: {
            maxHP: 100,
            defense: 1,
            level: 1,
        },
        uniquePassive: { 
            name: 'Chrono-Fist', 
            effect: 'If Ghost Fist\'s dice roll is an 8, undo the last instance of damage taken.',
            type: 'RollTrigger',
            abilityName: 'Ghost Fist',
            triggerValue: 8
        },
        abilities: [
            {
                name: 'Ghost Fist',
                type: 'ATTACK',
                damageType: 'Psychic',
                baseAttack: 6, 
                dice: 8, 
                coins: 1, 
            },
            {
                name: 'Phase',
                type: 'DEFENSE',
                effect: 'Negates the damage of the next incoming attack this turn (one use per combat).',
                defenseEffect: 'NegateNextHit',
                baseAttack: 0, 
                dice: 0, 
                coins: 0,
            }
        ]
    },

    // --- 3. Balter (Grapple: State Changer & Walk It Off: Healing) ---
    {
        id: 'balter',
        name: 'Balter',
        description: 'A wrestling powerhouse who controls the battlefield through grappling.',
        baseStats: {
            maxHP: 130,
            defense: 3,
            level: 1,
            // Unique state tracking:
            isGrappled: false, // Tracks if Balter is currently grappling a target
            grapple_die: 8, // The die size Balter uses for defense against Grapple
        },
        uniquePassive: { 
            name: 'Walk It Off', 
            effect: 'If Balter passes his turn, he gains 10 HP and cures 1 Status Condition.',
            type: 'PassActionHeal',
            healAmount: 10,
        },
        abilities: [
            {
                name: 'Haymaker',
                type: 'ATTACK',
                damageType: 'Physical',
                baseAttack: 7, 
                dice: 10, 
                coins: 1, 
                conditionalAbility: 'Piledriver', // Points to the next ability
            },
            {
                name: 'Grapple',
                type: 'SPECIAL',
                effect: 'Rolls d10 vs. target\'s Grapple Die. Success applies Grappled status. Target auto-loses next clash.',
                statusApplied: 'Grappled', 
                baseAttack: 0, 
                dice: 10,
                coins: 0,
            },
            {
                name: 'Piledriver',
                type: 'ATTACK',
                damageType: 'Physical',
                baseAttack: 12, 
                dice: 12,
                coins: 0,
                requiredTargetStatus: 'Grappled', 
                removesTargetStatus: 'Grappled', // Releases target after damage
                isHidden: true, // Only shown when target is grappled
            }
        ]
    },

    // --- 4. Zectus Maximus (Cycle: Weapon Rotation & Homogenous: Conditional Coins) ---
    {
        id: 'zectus',
        name: 'Zectus Maximus',
        description: 'A versatile warrior whose damage type changes frequently.',
        baseStats: {
            maxHP: 105,
            defense: 2,
            level: 1,
            // Unique state tracking:
            tri_sword_state: 'Scythe', // Tracks current weapon form
        },
        uniquePassive: { 
            name: 'Homogenous', 
            effect: 'Adds +2 Coins to Clashes against female opponents.',
            type: 'ConditionalCoin',
            condition: { target_gender: 'Female' },
            coinBonus: 2,
        },
        abilities: [
            {
                name: 'Cycle',
                type: 'SWITCH',
                effect: 'Cycles Tri-Sword: Scythe -> Trident -> Hammer. Deals 2 damage on activation.',
                baseAttack: 2, // Activation damage
                dice: 0,
                coins: 0,
            },
            {
                name: 'Tri-Sword: Scythe',
                type: 'ATTACK',
                damageType: 'Necrotic',
                baseAttack: 6, 
                dice: 8,
                coins: 1,
                weaponState: 'Scythe',
            },
            {
                name: 'Tri-Sword: Trident',
                type: 'ATTACK',
                damageType: 'Physical',
                baseAttack: 7, 
                dice: 10,
                coins: 1,
                weaponState: 'Trident',
                isHidden: true,
            },
            {
                name: 'Tri-Sword: Hammer',
                type: 'ATTACK',
                damageType: 'Force',
                baseAttack: 8, 
                dice: 12,
                coins: 1,
                weaponState: 'Hammer',
                isHidden: true,
            }
        ]
    },
];
