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
            description: 'В этой области расположено оборудование для измерения звуковых колебаний с помощью осциллографа.',
            element: '#experiment-area'
        },
        {
            title: 'Осциллограф',
            description: 'Основной измерительный прибор. Нажатие на кнопку питания включает его, а ручки управления позволяют настроить параметры отображения сигнала.',
            element: '#oscilloscope'
        },
        {
            title: 'Микрофон и камертон',
            description: 'Используйте микрофон для приема звуковых колебаний от камертона. Подключите микрофон к осциллографу двойным щелчком по разъемам.',
            element: '#microphone'
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
        '#oscilloscope', 
        '#microphone', 
        '#tuning-fork', 
        '#hammer',
        '#ruler'
    ];
    
    objects.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            if (selector === '#oscilloscope' || selector === '#microphone') {
                element.classList.add('phys', 'phys-attachable', 'phys-connectors');
                element.dataset.wireColor = '#3498db';
            }
            physjs.createObject(selector);
        }
    });
    
    const step1 = physjs.createStep('step1', 'Включение и настройка осциллографа', [], []);
    const step2 = physjs.createStep('step2', 'Подключение микрофона к осциллографу', 
        ['#oscilloscope', '#microphone'], ["*"]);
    const step3 = physjs.createStep('step3', 'Возбуждение звуковых колебаний', 
        ['#oscilloscope', '#microphone', '#tuning-fork', '#hammer'], []);
    const step4 = physjs.createStep('step4', 'Измерение амплитуды и расчет напряжения', 
        ['#oscilloscope', '#ruler'], []);
    
    physjs.addStep(step1)
          .addStep(step2)
          .addStep(step3)
          .addStep(step4);

    physjs.addConnectionPoint('#microphone', 'mic-output', 50, 76);
    physjs.addConnectionPoint('#oscilloscope', 'y-input', 84, 87);
    
    physjs.onConnect((fromId, toId) => {
        experimentFunctions.handleConnection(fromId, toId);
    });

    function handleObjectDetachment(object) {
        console.log('Отсоединение объекта:', object.id);
        if (object.id === '#microphone' || object.id === '#oscilloscope') {
            const wires = physjs.getAllWires();
            console.log('Все провода:', wires);
            
            if (wires && wires.length > 0) {
                const connectionPoints = [];
                if (object.id === '#microphone') {
                    connectionPoints.push('mic-output');
                } else if (object.id === '#oscilloscope') {
                    connectionPoints.push('y-input');
                }
                
                wires.forEach(wireId => {
                    const wireInfo = physjs.getWireInfo(wireId);
                    console.log('Информация о проводе:', wireInfo);
                    
                    if (wireInfo) {
                        if (connectionPoints.includes(wireInfo.from) || connectionPoints.includes(wireInfo.to)) {
                            console.log('Удаление провода:', wireId);
                            physjs.removeWire(wireId);
                            
                            if (experimentFunctions.handleWireRemoval) {
                                experimentFunctions.handleWireRemoval(wireId);
                            }
                        }
                    }
                });
            }
        }
    }

    physjs.onDetachment((object) => {
        handleObjectDetachment(object);
    });
    
    physjs.goToStep('step1');
    
    document.getElementById('power-button').addEventListener('click', (e) => {
        e.stopPropagation();
        experimentFunctions.toggleOscilloscope();
    });

    document.querySelectorAll('.control-knob').forEach(knob => {
        knob.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            experimentFunctions.startKnobRotation(knob);
        });
        knob.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            experimentFunctions.handleControlInteraction(knob);
        });
    });

    document.getElementById('hammer').addEventListener('dblclick', (e) => {
        e.stopPropagation();
        experimentFunctions.strikeTheTuningFork();
    });

    document.getElementById('ruler').addEventListener('dblclick', (e) => {
        e.stopPropagation();
        experimentFunctions.takeMeasurement();
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

    document.getElementById('check-amplitude').addEventListener('click', () => {
        experimentFunctions.checkVoltageCalculation();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        experimentFunctions.resetExperiment();
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = window.location.origin;
    });

    experimentFunctions.initializeExperiment();

    document.addEventListener('mousemove', (e) => {
        experimentFunctions.experimentState.isDragging && experimentFunctions.handleDragMove(e);
    });
});