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
  
  const tabsContent = intro.createTabContent([
    'measurement-panel',
    'chart-panel',
    'results-panel'
  ], 'tabs-container');
  
  const tabButtons = tabsContent.querySelectorAll('.info-content-buttons button');
  tabButtons[0].textContent = 'Теория';
  tabButtons[1].textContent = 'График';
  tabButtons[2].textContent = 'Результаты';
  
  intro.init([
    {
      title: 'Информация',
      description: 'Здесь вы можете ознакомиться с теоретической моделью, графиком распада и результатами эксперимента.',
      element: '#tabs-container'
    },
    {
      title: 'Рабочая область',
      description: 'В этой области расположены монеты, которые моделируют радиоактивные ядра. Двойной клик запускает бросок монет.',
      element: '#experiment-area'
    },
    {
      title: 'Подсказки',
      description: 'Здесь вы можете ознакомиться с краткими подсказками по управлению в эксперименте.',
      element: '#help-text'
    },
    {
      title: 'Панель управления',
      description: 'Здесь расположены кнопки управления экспериментом. Кнопка "Сбросить" начинает эксперимент заново.',
      element: '.buttons-container'
    }
  ]);
  
  document.getElementById('guide-btn').addEventListener('click', () => {
    intro.start();
  });

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