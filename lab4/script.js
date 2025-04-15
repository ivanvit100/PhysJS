import experimentFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', () => {
    window.experimentState = {
        step: 1,
        dynamometerMounted: false,
        troughMounted: false,
        ballAttached: false,
        springExtended: false,
        ballReleased: false,
        force: 2.0,
        deformation: 0.05,
        ballMass: 0.4,
        height: 1.2,
        distanceValues: [],
        distanceAvg: 0,
        distanceStdDev: 0,
        potentialEnergy: 0,
        kineticEnergy: 0,
        potentialEnergyError: 0,
        kineticEnergyError: 0,
        ballOnScale: false,
        ballWeighed: false
    };

    const experimentState = window.experimentState;

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
    
    // Инициализация физических объектов
    experimentFunctions.initializePhysicsObject('#left-stand', 'stand', true);
    experimentFunctions.initializePhysicsObject('#right-stand', 'stand', true);
    experimentFunctions.initializePhysicsObject('#dynamometer', 'dynamometer', false);
    experimentFunctions.initializePhysicsObject('#trough', 'trough', false);
    experimentFunctions.initializePhysicsObject('#ball', 'ball', false);
    experimentFunctions.initializePhysicsObject('#scale', 'scale', false);
    
    // Настройка шагов лабораторной работы и точек крепления
    experimentFunctions.setupLabSteps();
    experimentFunctions.setupAttachmentPoints();
    
    // Функция для проверки и перехода к шагу 3
    function checkAndAdvanceToStep3() {
        if (experimentState.dynamometerMounted && experimentState.troughMounted) {
            console.log("Оба устройства прикреплены! Переходим к шагу 3");
            experimentState.step = 3;
            physjs.goToStep('step3');

            elements.stepElements.forEach((el, index) => {
                el.classList.remove('active');
                if (index === 2) { // Индекс 2 соответствует шагу 3
                    el.classList.add('active');
                } else if (index < 2) { // Предыдущие шаги
                    el.classList.add('completed');
                }
            });

            elements.currentInstructionDisplay.textContent = 
                "Теперь прикрепите шар к динамометру с помощью нити.";
        }
    }
    
    // Обработка событий прикрепления объектов
    physjs.onAttachment((sourceObject, targetObject) => {
        const sourceId = sourceObject.element.id;
        const targetId = targetObject.element.id;
        
        // НОВАЯ ПРОВЕРКА: Запрещаем прикрепление шара на втором шаге
        if (experimentState.step === 2 && (sourceId === 'ball' || targetId === 'ball')) {
            // Отменяем прикрепление
            setTimeout(() => physjs.detachAll(), 10);
            
            // Показываем сообщение пользователю
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
        
        // Обработка прикрепления динамометра
        if ((targetId === 'dynamometer' && sourceId === 'left-stand')) {
            document.getElementById('dynamometer').classList.add('dynamometer-attached');
            experimentState.dynamometerMounted = true;
            
            // После прикрепления проверяем условие для перехода к шагу 3
            if (experimentState.troughMounted && experimentState.step === 2) {
                checkAndAdvanceToStep3();
            }
        }
        
        // Обработка прикрепления желоба
        if ((targetId === 'trough' && sourceId === 'right-stand')) {
            experimentState.troughMounted = true;
            
            // После прикрепления проверяем условие для перехода к шагу 3
            if (experimentState.dynamometerMounted && experimentState.step === 2) {
                checkAndAdvanceToStep3();
            }
        }
        
        // Обработка прикрепления шара
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
    
            // Обновляем положение нити
            experimentFunctions.updateStringPosition(elements.ball, elements.string, elements.springEnd, experimentState);

            // Позиционируем шар у правой границы динамометра с небольшой задержкой
            requestAnimationFrame(() => {
                const dynamoRect = elements.dynamometer.getBoundingClientRect();
                const ballRect = elements.ball.getBoundingClientRect();

                // Вычисляем позицию для шара у правого края динамометра
                const newLeft = dynamoRect.right - ballRect.width / 2;
                const newTop = dynamoRect.top + dynamoRect.height / 2;

                // Устанавливаем позицию шара
                elements.ball.style.left = `${newLeft - 15}px`;
                elements.ball.style.top = `${newTop - 15}px`;

                // Обновляем положение нити еще раз после изменения позиции шара
                experimentFunctions.updateStringPosition(elements.ball, elements.string, elements.springEnd, experimentState);
            });

            // Если мы на шаге 3, переходим к шагу 4
            if (experimentState.step === 3) {
                experimentFunctions.advanceToStep(elements.stepElements, experimentState, 4);
                elements.currentInstructionDisplay.textContent = "Отодвигайте шар вправо от желоба до тех пор, пока показания динамометра не станут равными 2H.";
                elements.stepElements[2].classList.add('completed');
            }
        }
        
        experimentFunctions.checkStepCompletion(experimentState, elements.stepElements);
    });
    
    // Обработка событий открепления объектов
    physjs.onDetachment((object) => {
        const id = object.element.id;
        
        if (id === 'dynamometer') {
            experimentState.dynamometerMounted = false;
        }
        
        if (id === 'trough') {
            experimentState.troughMounted = false;
        }
        
        if (id === 'ball') {
            experimentState.ballAttached = false;
        }
        
        experimentFunctions.updateStringPosition(elements.ball, elements.string, elements.springEnd, experimentState);
        experimentFunctions.checkStepCompletion(experimentState, elements.stepElements);
    });
    
    // Добавляем переменные для отслеживания перетаскивания шара на весы
    let isDraggingBall = false;
    let ballStartX = 0;
    let ballStartY = 0;
    let wasOnScale = false;
    
    // Обработчик начала перетаскивания шара
    elements.ball.addEventListener('mousedown', (e) => {
        wasOnScale = experimentState.ballOnScale;
        
        if (experimentState.ballAttached && experimentState.step === 4) {
            // На шаге 4 можно растягивать пружину
            if (e.button !== 0) return;
            
            isDraggingBall = true;
            document.addEventListener('mousemove', handleBallDrag);
            document.addEventListener('mouseup', handleBallRelease);
            
            e.preventDefault();
        } else {
            // Обычное перетаскивание в других случаях
            isDraggingBall = true;
            ballStartX = e.clientX;
            ballStartY = e.clientY;
            
            document.addEventListener('mousemove', handleFreeBallDrag);
            document.addEventListener('mouseup', handleFreeBallRelease);
            
            e.preventDefault();
        }
    });
    
    // Функция для перемещения свободного шара (для взвешивания)
    function handleFreeBallDrag(e) {
        if (!isDraggingBall) return;
        
        const ball = elements.ball;
        const ballRect = ball.getBoundingClientRect();
        
        // Определяем новые координаты
        const newLeft = e.clientX - ballRect.width/2;
        const newTop = e.clientY - ballRect.height/2;
        
        // Перемещаем шар
        ball.style.left = `${newLeft}px`;
        ball.style.top = `${newTop}px`;
        
        // Отслеживаем перемещение шара с весов
        if (wasOnScale && !experimentFunctions.elementsOverlap(ball, elements.scale, 20)) {
            experimentState.ballOnScale = false;
            elements.scaleDisplay.textContent = "0.0";
            wasOnScale = false;
        }
        
        // Проверяем, находится ли шар над весами для визуального эффекта
        if (experimentFunctions.elementsOverlap(ball, elements.scale, 20)) {
            elements.scale.classList.add('scale-highlight');
        } else {
            elements.scale.classList.remove('scale-highlight');
        }
    }
    
    // Обработчик отпускания свободного шара
    function handleFreeBallRelease() {
        if (!isDraggingBall) return;
        
        document.removeEventListener('mousemove', handleFreeBallDrag);
        document.removeEventListener('mouseup', handleFreeBallRelease);
        isDraggingBall = false;
        
        // Проверяем, находится ли шар над весами
        if (experimentFunctions.elementsOverlap(elements.ball, elements.scale, 20)) {
            experimentFunctions.placeOnScale(experimentState, elements);
            
            // Если мы на шаге 1, переходим к шагу 2 после взвешивания
            if (experimentState.step === 1) {
                experimentState.step = 2;
                physjs.goToStep('step2');
                
                // Обновляем визуальное состояние шагов
                const stepElements = document.querySelectorAll('#status-panel ol li');
                stepElements.forEach((el, index) => {
                    el.classList.remove('active');
                    if (index === 1) { // Индекс 1 = шаг 2
                        el.classList.add('active');
                    } else if (index < 1) { // Предыдущие шаги
                        el.classList.add('completed');
                    }
                });
                
                // Обновляем инструкцию
                document.getElementById('current-instruction').textContent = 
                    "Теперь прикрепите динамометр и желоб к штативам.";
            }
        }
        
        elements.scale.classList.remove('scale-highlight');
    }
    
    // Функция для перетаскивания шара с пружиной
    function handleBallDrag(e) {
        if (!isDraggingBall) return;
        experimentFunctions.dragBall(e, experimentState, elements);
    }
    
    // Отпускание шара с пружиной
    function handleBallRelease() {
        isDraggingBall = false;
        document.removeEventListener('mousemove', handleBallDrag);
        document.removeEventListener('mouseup', handleBallRelease);
        
        // Если сила достигла 2Н, отпускаем шар автоматически
        if (parseFloat(elements.forceValue.textContent) >= 1.95) {
            experimentFunctions.releaseBall(experimentState, elements);
            
            // Если мы на шаге 4, переходим к шагу 5
            if (experimentState.step === 4) {
                experimentState.step = 5;
                physjs.goToStep('step5');
                
                // Обновляем визуальное состояние шагов
                const stepElements = document.querySelectorAll('#status-panel ol li');
                stepElements.forEach((el, index) => {
                    el.classList.remove('active');
                    if (index === 4) {  // Индекс 4 = шаг 5
                        el.classList.add('active');
                    } else if (index < 4) { // Предыдущие шаги
                        el.classList.add('completed');
                    }
                });
                
                // Обновляем инструкцию
                document.getElementById('current-instruction').textContent = 
                    "Запишите место падения шара и проведите необходимые измерения.";
            }
        }
    }
    
    // Обработчик кнопки измерения массы шара
    document.getElementById('measure-ball-btn')?.addEventListener('click', () => {
        if (experimentState.ballOnScale) {
            experimentState.ballWeighed = true;
            experimentState.ballMass = 0.1; // 100г в кг
            elements.massDisplay.textContent = experimentState.ballMass.toFixed(1);
        }
    });
    
    // Обработчик кнопки сброса
    document.getElementById('reset-btn').addEventListener('click', () => {
        experimentFunctions.resetExperiment();
        experimentFunctions.setupAttachmentPoints();
        experimentFunctions.setupLabSteps();
    });
    
    // Обработчик кнопки Назад
    document.getElementById('back-btn').addEventListener('click', () => {
        experimentFunctions.goBack();
    });
    
    // Настройка всплывающих подсказок
    const tooltip = document.getElementById('tooltip');
    experimentFunctions.setupTooltips(tooltip);
    
    // Создаем форму для расчетов
    experimentFunctions.createCalculationForm();
});