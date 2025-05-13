import experimentFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', () => {
    experimentFunctions.initializeExperiment();

    const tabsContent = intro.createTabContent([
      'status-panel',
      'theory-panel',
      'measurement-panel'
    ], 'tabs-container');
      
    const tabButtons = tabsContent.querySelectorAll('.info-content-buttons button');
    tabButtons[0].textContent = 'Порядок';
    tabButtons[1].textContent = 'Формулы';
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
    
    document.getElementById('back-btn').addEventListener('click', experimentFunctions.backToMainPage);
    document.getElementById('reset-btn').addEventListener('click', experimentFunctions.resetExperiment.bind(experimentFunctions));
    
    const cylinder = document.getElementById('cylinder');
    if (cylinder) {
        cylinder.ondblclick = function(event) {
            if (experimentFunctions.experimentState.step === 1) {
                experimentFunctions.fillCylinder();
                event.stopPropagation();
                event.preventDefault();
            }
        };
    }
    
    physjs.onAttachment((sourceObj, targetObj) => {
        if ((sourceObj.element.id === 'heater' && targetObj.element.id === 'cylinder' ||
            sourceObj.element.id === 'cylinder' && targetObj.element.id === 'heater') && 
            experimentFunctions.experimentState.step == 2) {
            
            experimentFunctions.experimentState.heaterInWater = true;
            
            const heaterControl = document.getElementById('heater-control');
            if (heaterControl) heaterControl.style.display = 'flex';
            
            setTimeout(() => experimentFunctions.forceSetStep(3), 100);
        }
    });
    
    const createTooltip = (element, text) => {
        if (element) {
            element.addEventListener('mouseover', (e) => {
                const tooltip = document.getElementById('tooltip');
                if (tooltip) {
                    tooltip.textContent = text;
                    tooltip.style.left = `${e.clientX + 10}px`;
                    tooltip.style.top = `${e.clientY + 10}px`;
                    tooltip.style.display = 'block';
                }
            });
            
            element.addEventListener('mouseout', () => {
                const tooltip = document.getElementById('tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
        }
    };
    
    createTooltip(cylinder, "Цилиндрический сосуд с водой. Двойной клик для наполнения водой.");
    createTooltip(thermometer, "Термометр для измерения температуры воды.");
    createTooltip(heater, "Кипятильник. Опустите его в воду.");
    
    setTimeout(() => {
        experimentFunctions.forceSetStep(1);
    }, 100);
});