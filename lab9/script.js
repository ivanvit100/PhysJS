import experimentFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', () => {
    physjs.init({ debug: true });
    
    const elements = ['#power-source', '#ammeter', '#voltmeter', '#copper-coil', '#thermometer'];
    elements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            selector !== '#thermometer' ?
                element.classList.add('phys', 'phys-attachable', 'phys-connectors') :
                element.classList.add('phys', 'phys-attachable');
            physjs.createObject(selector);
        }
    });
    
    document.querySelector('#power-source').dataset.wireColor = '#e74c3c';
    document.querySelector('#ammeter').dataset.wireColor = '#3498db';
    document.querySelector('#voltmeter').dataset.wireColor = '#2ecc71';
    document.querySelector('#copper-coil').dataset.wireColor = '#95a5a6';
    
    const step1 = physjs.createStep('step1', 'Соберите электрическую цепь', 
        ["#power-source", "#ammeter", "#voltmeter", "#copper-coil"], 
        ["*"]);
    const step2 = physjs.createStep('step2', 'Измерьте температуру меди', 
        ["#thermometer", "#copper-coil"], ["#thermometer", "#copper-coil"]);
    const step3 = physjs.createStep('step3', 'Включите источник питания');
    const step4 = physjs.createStep('step4', 'Определите сопротивление');
    const step5 = physjs.createStep('step5', 'Повторно измерьте температуру образца', 
        ["#thermometer"]);
    physjs.addStep(step1)
        .addStep(step2)
        .addStep(step3)
        .addStep(step4)
        .addStep(step5);
    physjs.goToStep('step1');
    
    physjs.onConnect((fromId, toId) => {
        experimentFunctions.checkCircuitConnections();
    });
    
    physjs.onDetachment((object) => {
        console.log('detached', object.element.id);
        if (object.element.id === 'thermometer' || object.element.id === 'copper-coil')
            if (experimentFunctions.experimentState.step == 2)
                setTimeout(() => experimentFunctions.forceSetStep(3), 100);
    });
    
    experimentFunctions.initializeExperiment();

    const tabsContent = intro.createTabContent([
      'status-panel',
      'theory-panel',
      'graph-panel',
      'metal-selector',
      'measurement-panel'
    ], 'tabs-container');
    
    const tabButtons = tabsContent.querySelectorAll('.info-content-buttons button');
    tabButtons[0].textContent = 'Порядок';
    tabButtons[1].textContent = 'Формулы';
    tabButtons[2].textContent = 'График';
    tabButtons[3].textContent = 'Металл';
    tabButtons[4].textContent = 'Результаты';
    
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