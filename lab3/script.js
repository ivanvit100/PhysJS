import experimentFunctions from './functions.js';

let experimentState = {
    step: 1,
    h: 15.0,
    v0: 15.0,
    s: 0,          
    alpha_deg: 0,  
    alpha_rad: 0,  
    l_calc: 0,     
    l_exp: 0,      
    v0_calculated: false,
    animation_in_progress: false,
    g: 9.81,       
    horizontalShotDone: false, 
    lastClickTime: 0           
};

let pistol, projectile, floorArea, tooltip;
let heightDisplay, rangeSDisplay, v0Display, alphaDisplay, rangeLExpDisplay, rangeLCalcDisplay;
let currentInstructionDisplay;
let angleDisplay;
let stepElements = [];

document.addEventListener('DOMContentLoaded', function() {
    pistol = document.getElementById('pistol');
    projectile = document.getElementById('projectile');
    floorArea = document.getElementById('floor-area');
    tooltip = document.getElementById('tooltip');
    
    angleDisplay = document.createElement('div');
    angleDisplay.id = 'angle-display';
    angleDisplay.className = 'angle-display';
    angleDisplay.innerHTML = '0°';
    document.getElementById('experiment-area').appendChild(angleDisplay);
    
    heightDisplay = document.getElementById('height-val');
    rangeSDisplay = document.getElementById('range-s-val');
    v0Display = document.getElementById('v0-val');
    alphaDisplay = document.getElementById('alpha-val');
    rangeLExpDisplay = document.getElementById('range-l-exp-val');
    rangeLCalcDisplay = document.getElementById('range-l-calc-val');
    currentInstructionDisplay = document.getElementById('current-instruction');

    pistol.addEventListener('click', handlePistolClick);
    
    const resetBtn = document.getElementById('reset-btn');
    const backBtn = document.getElementById('back-btn');
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            experimentFunctions.resetExperiment(experimentState, {
                pistol, projectile, heightDisplay, rangeSDisplay, v0Display,
                alphaDisplay, rangeLExpDisplay, rangeLCalcDisplay, 
                currentInstructionDisplay, stepElements, floorArea, angleDisplay
            });
        });
    }
    
    backBtn && backBtn.addEventListener('click', experimentFunctions.goBack);

    for (let i = 1; i <= 5; i++)
        stepElements.push(document.getElementById(`step${i}`));

    experimentFunctions.initExperiment(experimentState, {
        pistol, projectile, floorArea, tooltip, heightDisplay, alphaDisplay, angleDisplay
    });

    window.experimentState = experimentState;

    const tabsContent = intro.createTabContent([
      'status-panel',
      'results-panel',
      'measurement-panel'
    ], 'tabs-container');
      
    const tabButtons = tabsContent.querySelectorAll('.info-content-buttons button');
    tabButtons[0].textContent = 'Порядок';
    tabButtons[1].textContent = 'Таблица';
    tabButtons[2].textContent = 'Результаты';
    
    intro.init([
      {
        title: 'Информация',
        description: 'Здесь вы можете ознакомиться с порядком выполнения лабораторной работы, теоретической моделью, и результатами эксперимента.',
        element: '#tabs-container'
      },
      {
        title: 'Рабочая область',
        description: 'В этой области расположено оборудование, которое используется для проведения лабораторной работы.',
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
});

function handlePistolClick() {
    const currentTime = new Date().getTime();
    const timeSinceLastClick = currentTime - experimentState.lastClickTime;
    
    if (timeSinceLastClick < 800 && timeSinceLastClick > 50)
        if (!experimentState.animation_in_progress)
            performShot();
    
    experimentState.lastClickTime = currentTime;
}

function performShot() {
    if (!experimentState.horizontalShotDone && experimentState.alpha_deg !== 0) {
        experimentFunctions.updateInstructions("Сначала произведите горизонтальный выстрел для определения начальной скорости!");
        return;
    }
    
    experimentFunctions.fire(
        experimentState, 
        projectile, 
        pistol, 
        floorArea, 
        rangeSDisplay, 
        v0Display,
        rangeLExpDisplay, 
        rangeLCalcDisplay, 
        angleDisplay
    );
}

export { experimentState };