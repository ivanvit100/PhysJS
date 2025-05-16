import experimentFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', () => {
    physjs.init({ debug: true });

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
        title: 'Инструкция',
        description: 'Здесь показывается, что нужно сделать на текущем шаге эксперимента.',
        element: '#steps-vis'
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
    
    const objects = [
        '#light-source', 
        '#slide-frame', 
        '#diffraction-grating', 
        '#lens', 
        '#screen',
        '#ruler'
    ];
    
    objects.forEach(selector => {
        const element = document.querySelector(selector);
        element && physjs.createObject(selector);
    });
    
    const step1 = physjs.createStep('step1', 'Установите диапозитивную рамку со щелью', 
        ['#light-source', '#slide-frame'], []);
    const step2 = physjs.createStep('step2', 'Расположите оптические элементы', [], []);
    const step3 = physjs.createStep('step3', 'Отрегулируйте положение экрана', [], []);
    const step4 = physjs.createStep('step4', 'Измерьте расстояние до красного края спектра', [], []);
    const step5 = physjs.createStep('step5', 'Измерьте расстояние до синего края спектра', [], []);
    
    physjs.addStep(step1)
        .addStep(step2)
        .addStep(step3)
        .addStep(step4)
        .addStep(step5);
    
    physjs.addAttachmentPoint('#light-source', 'frame-attachment', 145, 15, ['slide-frame']);
    
    physjs.goToStep('step1');
    
    physjs.onAttachment((sourceObj, targetObj) => {
        experimentFunctions.handleAttachment(sourceObj, targetObj);
    });
    
    document.getElementById('light-source').addEventListener('dblclick', (e) => {
        e.stopPropagation();
        experimentFunctions.toggleLight();
    });
    
    document.querySelectorAll('.phys').forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const tooltip = document.getElementById('tooltip');
            if (tooltip && element.dataset.name) {
                tooltip.textContent = element.dataset.name;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY + 10) + 'px';
            }
        });
        
        element.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('tooltip');
            if (tooltip) tooltip.style.display = 'none';
        });
    });
    
    document.getElementById('check-wavelength').addEventListener('click', () => {
        experimentFunctions.checkWavelengthCalculation();
    });
    document.getElementById('screen').addEventListener('mouseup', () => {
        experimentFunctions.checkScreenPosition();
    });
    document.getElementById('reset-btn').addEventListener('click', () => {
        experimentFunctions.resetExperiment();
    });
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '../index.html';
    });
    
    experimentFunctions.initializeExperiment();
});