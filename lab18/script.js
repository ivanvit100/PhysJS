import experimentFunctions from "./functions.js";

const experimentState = {
  INITIAL_COINS: 128,
  remainingCoins: 128,
  currentTrial: [],
  trials: [],
  isShaking: false,
  lastClickTime: 0
};

const elements = {
  coinBoxElement: document.getElementById('coin-box'),
  resetButton: document.getElementById('reset-button'),
  backButton: document.getElementById('back-btn'),
  resultsTableBody: document.getElementById('results-table-body'),
  toast: document.getElementById('toast'),
  toastContent: document.getElementById('toast-content'),
  canvas: document.getElementById('decay-chart'),
  ctx: document.getElementById('decay-chart').getContext('2d')
};

document.addEventListener('DOMContentLoaded', () => {
  experimentFunctions.initializeExperiment(experimentState, elements);
  
  elements.coinBoxElement.addEventListener('click', (event) => {
    experimentFunctions.handleCoinBoxClick(event, experimentState, elements);
  });
  
  elements.resetButton.addEventListener('click', () => {
    experimentFunctions.resetExperiment(experimentState, elements);
  });
  
  elements.backButton.addEventListener('click', () => {
    experimentFunctions.backToMainPage();
  });
  
  window.addEventListener('resize', () => {
    experimentFunctions.drawChart(experimentState, elements);
  });
});