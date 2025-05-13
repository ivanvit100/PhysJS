import experimentFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', function() {
    try {
        function safeGetElementById(id) {
            const element = document.getElementById(id);
            !element && console.warn(`Элемент с ID '${id}' не найден!`);
            return element;
        }
        
        window.sphere = safeGetElementById('glass-sphere');
        window.hose = safeGetElementById('hose');
        window.clamp = safeGetElementById('clamp');
        window.pump = safeGetElementById('pump');
        window.pumpHandle = safeGetElementById('pump-handle');
        window.scale = safeGetElementById('scale');
        window.scalePlate = safeGetElementById('scale-plate');
        window.scaleDisplay = safeGetElementById('scale-display');
        window.waterContainer = safeGetElementById('water-container');
        window.cylinder = safeGetElementById('cylinder');
        window.cylinderWater = safeGetElementById('cylinder-water');
        window.tooltip = safeGetElementById('tooltip');

        window.mass1Display = safeGetElementById('mass1');
        window.mass2Display = safeGetElementById('mass2');
        window.volumeDisplay = safeGetElementById('volume');
        window.densityDisplay = safeGetElementById('density');
        window.currentInstructionDisplay = safeGetElementById('current-instruction');

        window.stepElements = [];
        for (let i = 1; i <= 8; i++) {
            const stepElement = safeGetElementById(`step${i}`);
            stepElement && window.stepElements.push(stepElement);
        }

        if (!window.sphere || !window.hose || !window.pump || !window.scale || 
            !window.waterContainer || !window.cylinder) {
            throw new Error("Один или несколько критических элементов не найдены!");
        }

        const backBtn = document.getElementById('back-btn');
        const resetBtn = safeGetElementById('reset-btn');
        
        resetBtn && resetBtn.addEventListener('click', () => experimentFunctions.resetExperiment());
        backBtn && backBtn.addEventListener('click', () => experimentFunctions.goBack());
        
        const experimentArea = safeGetElementById('experiment-area');
        if (experimentArea) {
            experimentArea.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
            });
        }

        initializeExperiment();

    } catch (error) {
        console.error("Ошибка инициализации эксперимента:", error);
    }
});

function initializeExperiment() {
    physjs.init({ debug: true });
    
    const draggableElements = [
        '#glass-sphere', '#hose', '#clamp', '#pump', '#thermometer'
    ];
    
    draggableElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('phys');
            physjs.createObject(selector);
        }
    });
    
    ['#scale', '#water-container', '#cylinder'].forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('phys-fixed');
            physjs.createObject(selector);
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key.toLowerCase() === 'q' || e.key.toLowerCase() === 'e') {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    }, true);

    window.pumpHandle.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.preventDefault();
    });

    experimentFunctions.resetExperiment();
    experimentFunctions.createDensityCalculator();
    experimentFunctions.setupTooltips();
    experimentFunctions.setupLabSteps();
    experimentFunctions.setupAttachmentPoints();
    experimentFunctions.setupScaleInteraction();
    experimentFunctions.setupWaterContainerInteraction();
    experimentFunctions.setupCylinderInteraction();
    experimentFunctions.initExperiment();

    const tabsContent = intro.createTabContent([
      'status-panel',
      'measurement-panel'
    ], 'tabs-container');
      
    const tabButtons = tabsContent.querySelectorAll('.info-content-buttons button');
    tabButtons[0].textContent = 'Порядок';
    tabButtons[1].textContent = 'Результаты';
    
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
    
    setTimeout(() => {
        physjs.goToStep('step1');
    }, 100);
}