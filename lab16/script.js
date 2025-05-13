import experimentFunctions from './functions.js';

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
    
    const elements = [
        '#power-source', 
        '#ammeter', 
        '#voltmeter', 
        '#switch',
        '#rheostat'
    ];
    
    elements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('phys', 'phys-connectors');
            physjs.createObject(selector);
        }
    });
    
    document.querySelector('#power-source').dataset.wireColor = '#e74c3c';
    document.querySelector('#ammeter').dataset.wireColor = '#3498db';
    document.querySelector('#voltmeter').dataset.wireColor = '#2ecc71';
    document.querySelector('#switch').dataset.wireColor = '#95a5a6';
    document.querySelector('#rheostat').dataset.wireColor = '#f39c12';
    
    const step1 = physjs.createStep('step1', 'Соберите электрическую схему', 
        ['#power-source', '#ammeter', '#voltmeter', '#switch', '#rheostat'], ['*']);
    const step2 = physjs.createStep('step2', 'Измерьте ЭДС источника тока', ['#switch'], []);
    const step3 = physjs.createStep('step3', 'Снимите показания при замкнутом ключе', ['#switch'], []);
    const step4 = physjs.createStep('step4', 'Вычислите внутреннее сопротивление', [], []);
    const step5 = physjs.createStep('step5', 'Вычислите погрешности измерения ЭДС', [], []);
    
    physjs.addStep(step1)
        .addStep(step2)
        .addStep(step3)
        .addStep(step4)
        .addStep(step5);
    
    physjs.goToStep('step1');
        
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
    
    experimentFunctions.initializeExperiment();
});