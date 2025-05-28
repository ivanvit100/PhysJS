import experimentFunctions from './functions.js';

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('guide-btn').addEventListener('click', () => {
        intro.start();
    });
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = window.location.origin;
    });
    document.getElementById('reset-btn').addEventListener('click', experimentFunctions.resetMeasurements);
    document.getElementById('check-measurements').addEventListener('click', experimentFunctions.checkMeasurements);
    document.getElementById('toggle-caliper').addEventListener('click', experimentFunctions.toggleRuler);
    document.getElementById('toggle-lens-type').addEventListener('click', experimentFunctions.toggleBothLenses);

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

    experimentFunctions.init();
});