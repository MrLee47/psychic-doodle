// characters.js
// Character data (normalized)
const CHARACTERS = [
    {
        id: 'striker',
        name: 'Striker',
        description: 'Scales in power the longer the fight goes on.',
        baseStats: { maxHP: 110, defense: 1, currentHP: 110, consecutive_rounds: 0, effects: [], speed: 4, gender: 'Male' },
        uniquePassive: { name: 'Slow Start', type: 'CoinScaler' },
        abilities: [
            { name: 'Dragon Strike', type: 'ATTACK', damageType: 'Force', baseAttack: 4, dice: 4, coins: 2, description: 'A quick strike boosted by coin flips.' },
            { name: 'Heavy Blow', type: 'ATTACK', damageType: 'Force', baseAttack: 10, dice: 12, coins: 0, selfStagger: true, description: 'Powerful blow that staggers you next turn.' },
        ]
    },
    {
        id: 'shutenmaru',
        name: 'Shuten-Maru',
        description: 'A psycho demon who uses ethereal powers.',
        baseStats: { maxHP: 105, defense: 2, currentHP: 105, lastDamageTaken: 0, effects: [], speed: 3, gender: 'Female' },
        uniquePassive: { name: 'Chrono-Fist', type: 'RollTrigger', triggerValue: 8, abilityName: 'Ghost Fist' },
        abilities: [
            { name: 'Ghost Fist', type: 'ATTACK', damageType: 'Psychic', baseAttack: 6, dice: 8, coins: 1, description: 'A spectral punch that can rewind damage.' },
            { name: 'Phase', type: 'DEFENSE', defenseEffect: 'NegateNextHit', baseAttack: 0, dice: 0, coins: 0, description: 'Negate the next incoming hit this turn.' }
        ]
    },
    {
        id: 'balter',
        name: 'Balter',
        description: 'A muscular grappler who controls the battlefield.',
        baseStats: { maxHP: 130, defense: 3, currentHP: 130, isGrappling: false, grapple_die: 8, effects: [], speed: 1, gender: 'Male' },
        uniquePassive: { name: 'Walk It Off', type: 'PassActionHeal', healAmount: 10 },
        abilities: [
            { name: 'Haymaker', type: 'ATTACK', damageType: 'Physical', baseAttack: 7, dice: 10, coins: 1, description: 'A heavy punch with high damage.' },
            { name: 'Grapple', type: 'SPECIAL', description: "Attempt to grapple: success applies Grappled and forces next clash loss." , dice: 10 },
            { name: 'Piledriver', type: 'ATTACK', damageType: 'Physical', baseAttack: 12, dice: 12, coins: 0, description: 'Devastating follow-up only usable while Grappled.' }
        ]
    },
    {
        id: 'zectus',
        name: 'Zectus Maximus',
        description: 'A versatile warrior whose damage type changes frequently.',
        baseStats: { maxHP: 100, defense: 2, currentHP: 100, tri_sword_state: 'Scythe', effects: [], speed: 2, gender: 'Male' },
        uniquePassive: { name: 'Homogenous', type: 'ConditionalCoin', condition: { target_gender: 'Female' }, coinBonus: 2 },
        abilities: [
            { name: 'Tri-Sword Attack', type: 'ATTACK', isZectusMainAttack: true, coins: 1, description: 'Primary attack; damage depends on weapon state.' },
            { name: 'Cycle', type: 'SWITCH', baseAttack: 2, dice: 0, coins: 0, description: 'Cycle weapon: Scythe -> Trident -> Hammer.' },
            { name: 'Tri-Sword: Scythe', type: 'ATTACK', damageType: 'Blunt', baseAttack: 6, dice: 8, coins: 1, isHidden: true, description: 'Scythe form: balanced.' }
        ]
    }
];
