// --- Element References ---
const menuScreen = document.getElementById('menu-screen');
const gameContainer = document.getElementById('game-container');
const newGameBtn = document.getElementById('new-game-btn');
const loadGameBtn = document.getElementById('load-game-btn');
const dialogueText = document.getElementById('dialogue-text');

// --- Global Game State (The data we save) ---
let gameState = {
    // Default initial state
    isGameStarted: false,
    playerHP: 100,
    currentArea: "The Humble Beginning",
    characterID: null,
    inventory: []
};

// --- Core Functions ---

function startGame(isNewGame = true) {
    // 1. Hide the menu and show the game
    menuScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    gameState.isGameStarted = true;

    if (isNewGame) {
        // Reset or initialize new game data
        // For now, we'll just show a message. Later: character selection/creation.
        dialogueText.textContent = "A new journey begins. Which path will you choose?";
    } else {
        // Load was successful (handled in loadGame)
        dialogueText.textContent = `Welcome back! Loaded ${gameState.currentArea}.`;
    }

    console.log("Game started/loaded successfully.");
}

function saveGame() {
    try {
        // Convert the JavaScript object to a JSON string
        const stateString = JSON.stringify(gameState);
        // Store it in the browser's Local Storage
        localStorage.setItem('rogueVN_saveData', stateString);
        console.log("Game saved!");
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
            // Convert the JSON string back into a JavaScript object
            gameState = JSON.parse(savedData);
            console.log("Game loaded!");
            
            // Start the game with the loaded data
            startGame(false); 
        } catch (e) {
            console.error("Error parsing saved data:", e);
            alert("Corrupt save file. Starting new game.");
            startGame(true);
        }
    } else {
        alert("No saved game found. Please start a New Game.");
    }
}

// --- Event Listeners ---

newGameBtn.addEventListener('click', () => {
    // In a real game, you might ask "Are you sure? This will overwrite save data."
    startGame(true); 
    // Example: save the initial state immediately
    // saveGame(); 
});

loadGameBtn.addEventListener('click', loadGame);

// --- Initial Check (Optional) ---
// If you want the "Load Game" button to be visually disabled if no save exists.
function checkSaveData() {
    if (!localStorage.getItem('rogueVN_saveData')) {
        loadGameBtn.disabled = true;
        loadGameBtn.textContent = "No Save Found";
    }
}

// checkSaveData(); // Uncomment this line if you want to run the initial check

// For testing purposes: a temporary save button in the console once the game starts
// window.save = saveGame; 
// Now you can call save() in the browser's console to test saving.
