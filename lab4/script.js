import experimentFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', () => {
    window.experimentState = {
        step: 1,
        dynamometerMounted: false,
        troughMounted: false,
        ballAttached: false,
        springExtended: false,
        ballReleased: false,
        distanceValues: [],
        distanceAvg: 0,
        distanceStdDev: 0,
        potentialEnergy: 0,
        kineticEnergy: 0,
        potentialEnergyError: 0,
        kineticEnergyError: 0,
        ballOnScale: false,
        ballWeighed: false,
        ballLeft: 0,
        deformation: 0.15,
        force: 2.0,
        
        // CONFIG
        springStiffness: 50,
        ballMass: .4,
        height: 1.2,
    };

    const experimentState = window.experimentState;

    document.getElementById('spring-stiffness').textContent = experimentState.springStiffness.toString();

    const elements = {
        dynamometer: document.getElementById('dynamometer'),
        leftStand: document.getElementById('left-stand'),
        rightStand: document.getElementById('right-stand'),
        trough: document.getElementById('trough'),
        ball: document.getElementById('ball'),
        string: document.getElementById('string'),
        spring: document.getElementById('spring'),
        springEnd: document.getElementById('spring-end'),
        pointer: document.getElementById('pointer'),
        scale: document.getElementById('scale'),
        scaleDisplay: document.getElementById('scale-display'),
        floorArea: document.getElementById('floor-area'),
        measuringRuler: document.getElementById('measuring-ruler'),
        forceValue: document.getElementById('force-value'),
        deformationDisplay: document.getElementById('deformation'),
        massDisplay: document.getElementById('mass'),
        distanceAvgDisplay: document.getElementById('distance-avg'),
        stepElements: [
            document.getElementById('step1'),
            document.getElementById('step2'),
            document.getElementById('step3'),
            document.getElementById('step4'),
            document.getElementById('step5'),
            document.getElementById('step6')
        ],
        currentInstructionDisplay: document.getElementById('current-instruction'),
        dataCollectionPanel: document.getElementById('data-collection-panel'),
        resultsBody: document.getElementById('results-body'),
        energyResults: document.getElementById('energy-results')
    };
    
    experimentFunctions.initializePhysicsObject('#left-stand', 'stand', true);
    experimentFunctions.initializePhysicsObject('#right-stand', 'stand', true);
    experimentFunctions.initializePhysicsObject('#dynamometer', 'dynamometer', false);
    experimentFunctions.initializePhysicsObject('#trough', 'trough', false);
    experimentFunctions.initializePhysicsObject('#ball', 'ball', false);
    experimentFunctions.initializePhysicsObject('#scale', 'scale', false);
    
    experimentFunctions.setupLabSteps();
    experimentFunctions.setupAttachmentPoints();
    
    function checkAndAdvanceToStep3() {
        if (experimentState.dynamometerMounted && experimentState.troughMounted) {
            console.log("Оба устройства прикреплены! Переходим к шагу 3");
            experimentState.step = 3;
            physjs.goToStep('step3');

            elements.stepElements.forEach((el, index) => {
                el.classList.remove('active');
                if (index === 2)
                    el.classList.add('active');
                else if (index < 2)
                    el.classList.add('completed');
            });

            elements.currentInstructionDisplay.textContent = 
                "Теперь прикрепите шар к динамометру с помощью нити.";
        }
    }
    
    physjs.onAttachment((sourceObject, targetObject) => {
        const sourceId = sourceObject.element.id;
        const targetId = targetObject.element.id;
        
        if (experimentState.step === 2 && (sourceId === 'ball' || targetId === 'ball')) {
            setTimeout(() => physjs.detachAll(), 10);
            
            const instruction = document.getElementById('current-instruction');
            const originalText = instruction.textContent;
            instruction.textContent = "Сначала прикрепите динамометр и желоб к штативам!";
            instruction.style.color = 'red';
            
            setTimeout(() => {
                instruction.textContent = originalText;
                instruction.style.color = '';
            }, 2000);
            
            return;
        }
        
        if ((targetId === 'dynamometer' && sourceId === 'left-stand')) {
            document.getElementById('dynamometer').classList.add('dynamometer-attached');
            experimentState.dynamometerMounted = true;
            
            experimentState.troughMounted && experimentState.step === 2 && checkAndAdvanceToStep3();
        }
        
        if ((targetId === 'trough' && sourceId === 'right-stand')) {
            experimentState.troughMounted = true;
            experimentState.dynamometerMounted && experimentState.step === 2 && checkAndAdvanceToStep3();
        }
        
        if ((targetId === 'ball' || sourceId === 'ball')) {
            if (!experimentState.ballWeighed) {
                setTimeout(() => physjs.detachAll(), 10);
                
                const instruction = document.getElementById('current-instruction');
                const originalText = instruction.textContent;
                
                instruction.textContent = "Сначала необходимо измерить массу шара на весах!";
                instruction.style.color = 'red';
                
                setTimeout(() => {
                    instruction.textContent = originalText;
                    instruction.style.color = '';
                }, 2000);
                
                return;
            }
            
            experimentState.ballAttached = true;
            experimentFunctions.updateStringPosition(elements.ball, elements.string, elements.springEnd, experimentState);

            requestAnimationFrame(() => {
                const dynamoRect = elements.dynamometer.getBoundingClientRect();
                const ballRect = elements.ball.getBoundingClientRect();
                const newLeft = dynamoRect.right - ballRect.width / 2;
                const newTop = dynamoRect.top + dynamoRect.height / 2;

                elements.ball.style.left = `${newLeft - 15}px`;
                elements.ball.style.top = `${newTop - 15}px`;

                experimentFunctions.updateStringPosition(elements.ball, elements.string, elements.springEnd, experimentState);
            });

            if (experimentState.step === 3) {
                experimentFunctions.advanceToStep(elements.stepElements, experimentState, 4);
                elements.currentInstructionDisplay.textContent = "Отодвигайте шар вправо от желоба до тех пор, пока показания динамометра не станут равными 2H.";
                elements.stepElements[2].classList.add('completed');
            }
        }
        
        experimentFunctions.checkStepCompletion(experimentState, elements.stepElements);
    });
    
    physjs.onDetachment((object) => {
        const id = object.element.id;
        
        if (id === 'dynamometer') experimentState.dynamometerMounted = false;
        if (id === 'trough') experimentState.troughMounted = false;
        if (id === 'ball') experimentState.ballAttached = false;
        
        experimentFunctions.updateStringPosition(elements.ball, elements.string, elements.springEnd, experimentState);
        experimentFunctions.checkStepCompletion(experimentState, elements.stepElements);
    });
    
    let isDraggingBall = false;
    let ballStartX = 0;
    let ballStartY = 0;
    let wasOnScale = false;
    
    elements.ball.addEventListener('mousedown', (e) => {
        wasOnScale = experimentState.ballOnScale;
        
        if (experimentState.ballAttached && experimentState.step === 4) {
            if (e.button !== 0) return;
            
            isDraggingBall = true;
            document.addEventListener('mousemove', handleBallDrag);
            document.addEventListener('mouseup', handleBallRelease);
            
            e.preventDefault();
        } else {
            isDraggingBall = true;
            ballStartX = e.clientX;
            ballStartY = e.clientY;
            
            document.addEventListener('mousemove', handleFreeBallDrag);
            document.addEventListener('mouseup', handleFreeBallRelease);
            
            e.preventDefault();
        }
    });
    
    function handleFreeBallDrag(e) {
        if (!isDraggingBall) return;
        
        const ball = elements.ball;
        const ballRect = ball.getBoundingClientRect();
        const newLeft = e.clientX - ballRect.width/2;
        const newTop = e.clientY - ballRect.height/2;
        
        ball.style.left = `${newLeft}px`;
        ball.style.top = `${newTop}px`;
        
        if (wasOnScale && !experimentFunctions.elementsOverlap(ball, elements.scale, 20)) {
            experimentState.ballOnScale = false;
            elements.scaleDisplay.textContent = "0.0";
            wasOnScale = false;
        }
        
        experimentFunctions.elementsOverlap(ball, elements.scale, 20) ?
            elements.scale.classList.add('scale-highlight') :
            elements.scale.classList.remove('scale-highlight');
    }
    
    function handleFreeBallRelease() {
        if (!isDraggingBall) return;
        
        document.removeEventListener('mousemove', handleFreeBallDrag);
        document.removeEventListener('mouseup', handleFreeBallRelease);
        isDraggingBall = false;
        
        if (experimentFunctions.elementsOverlap(elements.ball, elements.scale, 20)) {
            experimentFunctions.placeOnScale(experimentState, elements);
            
            if (experimentState.step === 1) {
                experimentState.step = 2;
                physjs.goToStep('step2');
                
                const stepElements = document.querySelectorAll('#status-panel ol li');
                stepElements.forEach((el, index) => {
                    el.classList.remove('active');
                    if (index === 1) el.classList.add('active');
                    else if (index < 1) el.classList.add('completed');
                });
                
                document.getElementById('current-instruction').textContent = 
                    "Теперь прикрепите динамометр и желоб к штативам.";
            }
        }
        elements.scale.classList.remove('scale-highlight');
    }
    
    function handleBallDrag(e) {
        if (!isDraggingBall) return;
        experimentFunctions.dragBall(e, experimentState, elements);
    }
    
    function handleBallRelease() {
        isDraggingBall = false;
        document.removeEventListener('mousemove', handleBallDrag);
        document.removeEventListener('mouseup', handleBallRelease);
        
        if (parseFloat(elements.forceValue.textContent) >= 1.95) {
            experimentFunctions.releaseBall(experimentState, elements);
            
            if (experimentState.step === 4) {
                experimentState.step = 5;
                physjs.goToStep('step5');
                
                const stepElements = document.querySelectorAll('#status-panel ol li');
                stepElements.forEach((el, index) => {
                    el.classList.remove('active');
                    if (index === 4) el.classList.add('active');
                    else if (index < 4) el.classList.add('completed');
                });
                
                document.getElementById('current-instruction').textContent = 
                    "Запишите место падения шара и проведите необходимые измерения.";
            }
        }
    }
    
    document.getElementById('measure-ball-btn')?.addEventListener('click', () => {
        if (experimentState.ballOnScale) {
            experimentState.ballWeighed = true;
            experimentState.ballMass = 0.1;
            elements.massDisplay.textContent = experimentState.ballMass.toFixed(1);
        }
    });
    
    document.getElementById('reset-btn').addEventListener('click', () => {
        experimentFunctions.resetExperiment();
        experimentFunctions.setupAttachmentPoints();
        experimentFunctions.setupLabSteps();
    });
    
    document.getElementById('back-btn').addEventListener('click', () => {
        experimentFunctions.goBack();
    });
    
    const tooltip = document.getElementById('tooltip');
    experimentFunctions.setupTooltips(tooltip);
    
    experimentFunctions.createCalculationForm();

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
});