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

// Settings Panel Elements
// NOTE: settingsBtn is now on the menu screen
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closePanelBtn = document.getElementById('close-panel-btn');
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
    const validThemes = ['default', 'retro', 'dark', 'light'];
    const effectiveTheme = validThemes.includes(themeName) ? themeName : DEFAULT_THEME;
    
    // Set the theme class on the body
    document.body.className = `theme-${effectiveTheme}`;

    // Save the preference
    localStorage.setItem(THEME_KEY, effectiveTheme);
    console.log(`Theme set to: ${effectiveTheme}`);
}

// Function to handle theme button clicks
function handleThemeSelection(event) {
    const selectedTheme = event.target.dataset.theme;
    applyTheme(selectedTheme);
    // Panel will close when 'Close' is clicked, not immediately on theme change
}

// --- Status UI Management ---

function updateStatusUI() {
    // 1. Calculate percentage for Health Bar
    const percent = (gameState.currentHP / gameState.maxHP) * 100;
    
    // 2. Update Health Bar Fill. Max(0) prevents negative width.
    healthBarFill.style.width = `${Math.max(0, percent)}%`; 

    // 3. Update Health Value Text
    healthValueSpan.textContent = `${gameState.currentHP}/${gameState.maxHP}`;

    // 4. Update Status Text
    currentStatusSpan.textContent = gameState.status;
}

// --- Panel Logic ---

function openSettingsPanel() {
    // Show the panel
    settingsPanel.classList.remove('hidden');
    // Hide the game container/menu to prevent interference with other UI
    if (gameState.isGameStarted) {
        // You might want to pause the game here if it were a real-time game
    }
}

function closeSettingsPanel() {
    settingsPanel.classList.add('hidden');
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

function loadGame() {
    const savedData = localStorage.getItem('rogueVN_saveData');
    
    if (savedData) {
        try {
            gameState = JSON.parse(savedData);
            console.log("Game loaded!");
            startGame(false); 
        } catch (e) {
            console.error("Error parsing saved data. Starting new game.", e);
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

    // 3. Settings Panel Listeners
    settingsBtn.addEventListener('click', openSettingsPanel); // Button is now on menu screen
    closePanelBtn.addEventListener('click', closeSettingsPanel);
    
    themeOptionButtons.forEach(button => {
        button.addEventListener('click', handleThemeSelection);
    });

    // 4. Initial Save Check (optional feature)
    if (!localStorage.getItem('rogueVN_saveData')) {
        loadGameBtn.disabled = true;
        loadGameBtn.textContent = "No Save Found";
    }
});
