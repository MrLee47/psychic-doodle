// --- Element References ---
const menuScreen = document.getElementById('menu-screen');
const gameContainer = document.getElementById('game-container');
const newGameBtn = document.getElementById('new-game-btn');
const loadGameBtn = document.getElementById('load-game-btn');
const dialogueText = document.getElementById('dialogue-text');

// Status Bar Elements
const healthBarFill = document.getElementById('health-bar-fill');
const healthValueSpan = document.getElementById('health-value');
const currentStatusSpan = document.getElementById('current-status');

// Settings Modal Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const themeOptionButtons = document.querySelectorAll('.theme-option-btn');

// --- Global Game State ---
let gameState = {
    isGameStarted: false,
    maxHP: 100,
    currentHP: 100,
    status: "Alive",
    currentArea: "The Humble Beginning",
    characterID: null,
    inventory: []
};

// --- Theme Logic ---

const THEME_KEY = 'gameTheme';
const DEFAULT_THEME = 'default';

function applyTheme(themeName) {
    // Ensure the theme name is valid, otherwise use default
    const effectiveTheme = ['default', 'retro', 'dark', 'light'].includes(themeName) ? themeName : DEFAULT_THEME;
    
    // Clear existing theme classes and add the new one
    document.body.className = `theme-${effectiveTheme}`;

    // Save the preference
    localStorage.setItem(THEME_KEY, effectiveTheme);
    console.log(`Theme set to: ${effectiveTheme}`);
}

// Function to handle theme button clicks
function handleThemeSelection(event) {
    const selectedTheme = event.target.dataset.theme;
    applyTheme(selectedTheme);
}

// --- Status UI Management ---

function updateStatusUI() {
    // 1. Calculate percentage for Health Bar
    const percent = (gameState.currentHP / gameState.maxHP) * 100;
    
    // 2. Update Health Bar Fill
    healthBarFill.style.width = `${Math.max(0, percent)}%`; // Ensure width is not negative

    // 3. Update Health Value Text
    healthValueSpan.textContent = `${gameState.currentHP}/${gameState.maxHP}`;

    // 4. Update Status Text
    currentStatusSpan.textContent = gameState.status;
}

// --- Modal Logic ---

function openSettingsModal() {
    settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
    settingsModal.classList.add('hidden');
}


// --- Core Game Flow Functions ---

function startGame(isNewGame = true) {
    // Hide the menu and show the game
    menuScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    gameState.isGameStarted = true;

    if (isNewGame) {
        // Reset state for new game
        gameState.currentHP = gameState.maxHP;
        gameState.status = "Alive";
        dialogueText.textContent = "A new journey begins. You are at full health.";
    } else {
        // Loaded game logic
        dialogueText.textContent = `Welcome back! Loaded ${gameState.currentArea}.`;
    }
    
    // Always update UI on game start/load
    updateStatusUI();
    console.log("Game started/loaded successfully.");
}

function saveGame() {
    try {
        const stateString = JSON.stringify(gameState);
        localStorage.setItem('rogueVN_saveData', stateString);
        console.log("Game saved!");
        // In a real app, you'd show a "Game Saved!" message here.
        return true;
    } catch (e) {
        console.error("Could not save game:", e);
        return false;
    }
}

function loadGame() {
    const savedData = localStorage.getItem('rogueVN_saveData');
    
    if (savedData) {
        try {
            gameState = JSON.parse(savedData);
            console.log("Game loaded!");
            startGame(false); 
        } catch (e) {
            console.error("Error parsing saved data:", e);
            // NOTE: Use console.error instead of alert for better UX in an iframe
            console.error("Corrupt save file. Starting new game.");
            startGame(true);
        }
    } else {
        console.log("No saved game found. Please start a New Game.");
    }
}


// --- Initialization and Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme from Local Storage
    const savedTheme = localStorage.getItem(THEME_KEY);
    applyTheme(savedTheme || DEFAULT_THEME);
    
    // 2. Menu Button Listeners
    newGameBtn.addEventListener('click', () => startGame(true));
    loadGameBtn.addEventListener('click', loadGame);

    // 3. Settings Modal Listeners
    settingsBtn.addEventListener('click', openSettingsModal);
    closeModalBtn.addEventListener('click', closeSettingsModal);
    
    themeOptionButtons.forEach(button => {
        button.addEventListener('click', handleThemeSelection);
    });

    // 4. Initial Save Check (optional feature)
    if (!localStorage.getItem('rogueVN_saveData')) {
        loadGameBtn.disabled = true;
        loadGameBtn.textContent = "No Save Found";
    }

    // Example of manipulating health for testing:
    // setTimeout(() => {
    //     gameState.currentHP = 75;
    //     gameState.status = "Wounded";
    //     updateStatusUI();
    // }, 5000);
});
