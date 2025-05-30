import experimetFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', () => {
    physjs.init({ debug: false });

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
            description: 'В этой области вы можете перемещать зеркало, человека и выполнять измерения с помощью измерительной ленты.',
            element: '#room'
        },
        {
            title: 'Зеркало',
            description: 'Плоское зеркало, которое можно перемещать по полу. Используется для отражения вида потолка.',
            element: '#mirror'
        },
        {
            title: 'Человек',
            description: 'Наблюдатель, чей рост и положение важны для эксперимента. Вы можете перемещать его по комнате.',
            element: '#person'
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
    
    const step1 = physjs.createStep('step1', 'Расположение зеркала', ['#mirror'], []);
    const step2 = physjs.createStep('step2', 'Измерение высоты h', ['#person', '.measuring-tape'], []);
    const step3 = physjs.createStep('step3', 'Измерение расстояния l₁', ['#mirror', '.measuring-tape'], []);
    const step4 = physjs.createStep('step4', 'Измерение расстояния l₂', ['#person', '#mirror', '.measuring-tape'], []);
    const step5 = physjs.createStep('step5', 'Расчет высоты H', [], []);
    
    physjs.addStep(step1)
          .addStep(step2)
          .addStep(step3)
          .addStep(step4)
          .addStep(step5);

    physjs.goToStep('step1');
    
    document.getElementById('reset-btn').addEventListener('click', () => {
        experimetFunctions.resetExperiment();
    });
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = window.location.origin;
    });

    experimetFunctions.initializeExperiment();
});