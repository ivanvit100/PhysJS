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
    
    document.getElementById('back-btn').addEventListener('click', experimentFunctions.backToMainPage);
    document.getElementById('reset-btn').addEventListener('click', experimentFunctions.resetExperiment);
    
    const iceContainer = document.getElementById('ice-container');
    if (iceContainer) {
        iceContainer.ondblclick = function(event) {
            if (experimentFunctions.experimentState.step == 1) {
                experimentFunctions.showIceCubes();
                experimentFunctions.forceSetStep(2);

                event.stopPropagation();
                event.preventDefault();
            }
        };
    }
    
    const calorimeter = document.getElementById('calorimeter');
    if (calorimeter) {
        calorimeter.ondblclick = function(event) {
            if (experimentFunctions.experimentState.step === 3) {
                experimentFunctions.updateWaterLevel('#cylinder .water-level', 0);
                
                setTimeout(() => {
                    experimentFunctions.updateWaterLevel('#calorimeter-inner .water-in-calorimeter', 95);
                }, 500);
                
                experimentFunctions.experimentState.waterInCylinder = false;
                experimentFunctions.experimentState.waterInCalorimeter = true;
                
                setTimeout(() => {
                    experimentFunctions.forceSetStep(4);
                }, 1500);
                
                event.stopPropagation();
                event.preventDefault();
            } else if (experimentFunctions.experimentState.step == 5 && !experimentFunctions.experimentState.measurementDone) {
                experimentFunctions.measureFinalVolume();
                event.stopPropagation();
            }
        };
    }

    const cylinder = document.getElementById('cylinder');
    if (cylinder) {
        cylinder.ondblclick = function(event) {
            if (experimentFunctions.experimentState.step === 2 && !experimentFunctions.experimentState.waterInCylinder) {
                experimentFunctions.updateWaterLevel('#cylinder .water-level', experimentFunctions.experimentState.initialVolume * 0.8);
                
                experimentFunctions.experimentState.waterInCylinder = true;
                document.getElementById('initial-volume').textContent = experimentFunctions.experimentState.initialVolume.toFixed(1);
                
                setTimeout(() => experimentFunctions.checkThermometerPosition(), 500);
            }
            else if (experimentFunctions.experimentState.step == 3) {
                experimentFunctions.updateWaterLevel('#cylinder .water-level', 0);
                
                setTimeout(() => {
                    experimentFunctions.updateWaterLevel('#calorimeter-inner .water-in-calorimeter', 95);
                }, 500);
                
                experimentFunctions.experimentState.waterInCylinder = false;
                experimentFunctions.experimentState.waterInCalorimeter = true;
                
                setTimeout(() => {
                    experimentFunctions.forceSetStep(4);
                }, 1500);
            } else if (experimentFunctions.experimentState.step === 5 && !experimentFunctions.experimentState.measurementDone) {
                experimentFunctions.measureFinalVolume();
                experimentFunctions.forceSetStep(6);
            }
            
            event.stopPropagation();
            event.preventDefault();
        };
    }
    
    const thermometer = document.getElementById('thermometer');
    if (thermometer) {
        thermometer.addEventListener('dragend', () => experimentFunctions.checkThermometerPosition());
        thermometer.addEventListener('mouseup', () => experimentFunctions.checkThermometerPosition());
    }
    
    experimentFunctions.setupIceCubeDragging();
    
    setTimeout(() => {
        experimentFunctions.forceSetStep(1);
    }, 100);
});