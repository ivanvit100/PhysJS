import experimentFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация параметров эксперимента
    const experimentState = experimentFunctions.experimentState;

    // Сохраняем состояние в глобальном объекте для доступа из functions.js
    window.experimentState = experimentState;

    // Получаем ссылки на элементы с учетом новой структуры воронки
    const elements = {
        glassTube: document.getElementById('glass-tube'),
        funnel: document.getElementById('funnel'),
        rubberTube: document.getElementById('rubber-tube'),
        cork: document.getElementById('cork'),
        ruler: document.getElementById('ruler'),
        barometer: document.getElementById('barometer'),
        waterContainer: document.getElementById('water-container'),
        tubeWater: document.querySelector('#glass-tube .tube-water'),
        tubeAir: document.querySelector('#glass-tube .tube-air'),
        funnelWater: document.querySelector('#funnel .tube-water'),
        funnelAir: document.querySelector('#funnel .tube-air'),
        currentInstruction: document.getElementById('current-instruction'),
        resetBtn: document.getElementById('reset-btn'),
        backBtn: document.getElementById('back-btn'),
        lengthDisplay1: document.getElementById('length1'),
        lengthDisplay2: document.getElementById('length2'),
        waterLevelDiffDisplay: document.getElementById('water-level-diff'),
        pressureDisplay: document.getElementById('pressure'),
        barometerDisplay: document.getElementById('barometer-display'),
        stepElements: document.querySelectorAll('#status-panel ol li')
    };
    
    // Начальная инициализация
    experimentFunctions.setupPhysicsObjects();
    experimentFunctions.setupAttachmentPoints();
    
    // Настройка отображения воды в начальном состоянии
    elements.tubeWater.style.height = '0%';
    elements.funnelWater.style.height = '0%';
    elements.tubeAir.style.height = '100%';
    elements.funnelAir.style.height = '100%';
    
    // Устанавливаем случайное показание барометра около нормального атмосферного давления
    const randomBarometerReading = Math.floor(750 + Math.random() * 20);
    elements.barometerDisplay.textContent = randomBarometerReading;
    
    // Обработчики событий
    elements.resetBtn.addEventListener('click', () => {
        window.location.reload();
    });
    
    elements.backBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });
    
    // Создание SVG контейнера для резиновой трубки
    const svgContainer = document.createElement('div');
    svgContainer.id = 'svg-container';
    svgContainer.innerHTML = `<svg width="100%" height="100%" style="position:absolute; top:0; left:0; pointer-events:none; z-index:10;"></svg>`;
    document.body.appendChild(svgContainer);
    
    // Обработчик для перемещения объектов
    document.addEventListener('mousemove', (e) => {
        if (elements.funnel.classList.contains('being-dragged')) {
            // Если системы соединены и находимся на шаге 2 или выше, разрешаем только вертикальное движение
            if (experimentState.rubberTubeConnectedToGlassTube && 
                experimentState.rubberTubeConnectedToFunnel) {
                // Только вертикальное движение
                const newTop = e.clientY - elements.funnel.offsetHeight / 2;
                elements.funnel.style.top = `${newTop}px`;
                
                // Ограничиваем движение в зависимости от уровня воды
                if (experimentState.corkInserted) {
                    // ИЗМЕНЕННЫЙ КОД: Разрешаем опускать воронку на 50 см ниже начального положения
                    const initialHeight = experimentState.initialFunnelHeight;
                    const minTop = initialHeight;
                    const maxTop = initialHeight + 135; // 135 пикселей = ~50 см
                    
                    if (newTop < minTop) {
                        elements.funnel.style.top = `${minTop}px`;
                    } else if (newTop > maxTop) {
                        elements.funnel.style.top = `${maxTop}px`;
                    }
                    
                    // Обновляем позицию в состоянии
                    experimentState.funnelPosition.top = parseInt(elements.funnel.style.top);
                } else {
                    experimentFunctions.limitFunnelMovement(elements.funnel);
                }
                
                // Обновляем положение резиновой трубки
                experimentFunctions.updateRubberTubePosition();
            } else {
                // Обычное перемещение
                const newLeft = e.clientX - elements.funnel.offsetWidth / 2;
                const newTop = e.clientY - elements.funnel.offsetHeight / 2;
                
                elements.funnel.style.left = `${newLeft}px`;
                elements.funnel.style.top = `${newTop}px`;
            }
        }
        
        if (elements.ruler.classList.contains('being-dragged')) {
            const newLeft = e.clientX - elements.ruler.offsetWidth / 2;
            const newTop = e.clientY - elements.ruler.offsetHeight / 2;
            
            elements.ruler.style.left = `${newLeft}px`;
            elements.ruler.style.top = `${newTop}px`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        // Когда отпускаем мышь, проверяем, была ли воронка перемещена
        if (elements.funnel.classList.contains('being-dragged')) {
            elements.funnel.classList.remove('being-dragged');
            
            // Обновляем состояние после перемещения воронки
            experimentState.funnelPosition = {
                top: parseInt(elements.funnel.style.top || '100'),
                left: parseInt(elements.funnel.style.left || '300')
            };
            
            if (experimentState.waterInFunnel) {
                experimentFunctions.updateWaterLevels();
                
                // Проверка установки начального уровня
                if (experimentState.step === 2 && !experimentState.initialWaterLevelSet) {
                    const tubeWaterLevel = experimentFunctions.calculateWaterLevelInTube();
                    
                    if (tubeWaterLevel >= 45 && tubeWaterLevel <= 55) {
                        elements.ruler.style.display = 'block';
                        elements.currentInstruction.textContent = 
                            "Используйте линейку, чтобы измерить длину воздушного столба в трубке";
                    }
                }
                
                // ИСПРАВЛЕННЫЙ КОД: Проверка опускания воронки на 50 см
                if (experimentState.step === 4 && experimentState.corkInserted && 
                    !experimentState.finalMeasurementsDone) {
                    const heightDifference = experimentState.funnelPosition.top - experimentState.initialFunnelHeight;
                    console.log("Разница высот:", heightDifference, "пикселей");
                    
                    // Если воронка опущена примерно на 50 см (или любое значение больше 45 пикселей)
                    if (heightDifference >= 45) {
                        // Преобразуем пиксели в см (1 пиксель = 0.37 см)
                        const heightDifferenceInCm = heightDifference * 0.11;
                        
                        // Начальная высота воздушного столба из сохраненного значения
                        const initialAirColumnLength = experimentState.initialAirColumnLength;
                        
                        // Изменение уровня воды - 20% от перемещения воронки
                        const waterLevelChange = heightDifferenceInCm * 0.2;
                        
                        // Новая высота воздушного столба = начальная + изменение
                        const finalAirColumnLength = initialAirColumnLength + waterLevelChange;
                        
                        experimentState.finalAirColumnLength = finalAirColumnLength;
                        experimentState.waterLevelDifference = heightDifferenceInCm;
                        
                        elements.lengthDisplay2.textContent = finalAirColumnLength.toFixed(1);
                        elements.waterLevelDiffDisplay.textContent = heightDifferenceInCm.toFixed(1);
                        
                        experimentState.finalMeasurementsDone = true;
                        
                        // Переходим к шагу 5
                        experimentFunctions.advanceToStep(5);
                        elements.currentInstruction.textContent = 
                            "Теперь выполните расчет атмосферного давления";
                        
                        // Показываем кнопку расчета
                        document.getElementById('calculate-btn').style.display = 'block';
                    }
                }
                
                // Проверка, близко ли воронка к сосуду с водой на шаге 1
                if (experimentState.step === 1 && 
                    experimentState.rubberTubeConnectedToGlassTube && 
                    experimentState.rubberTubeConnectedToFunnel) {
                    
                    if (experimentFunctions.elementsOverlap(elements.funnel, elements.waterContainer, 50)) {
                        experimentState.waterFilled = true;
                        experimentState.waterInRubberTube = true;
                        experimentState.waterInFunnel = true;
                        experimentState.waterInTube = true;
                        
                        experimentFunctions.updateWaterLevels();
                        
                        experimentFunctions.advanceToStep(2);
                        elements.currentInstruction.textContent = 
                            "Теперь установите воронку так, чтобы уровень воды в трубке был на 50 см от верхнего конца";
                    }
                }
            }
        }
        
        // Когда отпускаем мышь, проверяем, была ли линейка перемещена
        if (elements.ruler.classList.contains('being-dragged')) {
            elements.ruler.classList.remove('being-dragged');
            experimentFunctions.checkRulerMeasurement();
        }
    });
    
    // Добавляем слушателей событий для перетаскиваемых объектов
    elements.funnel.addEventListener('mousedown', (e) => {
        elements.funnel.classList.add('being-dragged');
    });
    
    elements.ruler.addEventListener('mousedown', (e) => {
        elements.ruler.classList.add('being-dragged');
    });
    
    // Обработчики прикрепления объектов
    physjs.onAttachment((sourceObject, targetObject) => {
        const sourceId = sourceObject.element.id;
        const targetId = targetObject.element.id;
        
        console.log(`Прикрепление: ${sourceId} к ${targetId}`);
        
        // Соединение резиновой трубки со стеклянной трубкой
        if ((sourceId === 'rubber-tube' && targetId === 'glass-tube') || 
            (sourceId === 'glass-tube' && targetId === 'rubber-tube')) {
            experimentState.rubberTubeConnectedToGlassTube = true;
            console.log("Трубка подключена к стеклянной трубке");
            
            // Если воронка тоже подключена, обновляем трубку
            if (experimentState.rubberTubeConnectedToFunnel) {
                experimentFunctions.updateRubberTubePosition();
            }
            
            // Проверка полного соединения
            checkFullConnection();
        }
        
        // Соединение резиновой трубки с воронкой
        if ((sourceId === 'rubber-tube' && targetId === 'funnel') || 
            (sourceId === 'funnel' && targetId === 'rubber-tube')) {
            experimentState.rubberTubeConnectedToFunnel = true;
            console.log("Трубка подключена к воронке");
            
            // Если стекл. трубка тоже подключена, обновляем трубку
            if (experimentState.rubberTubeConnectedToGlassTube) {
                experimentFunctions.updateRubberTubePosition();
            }
            
            // Проверка полного соединения
            checkFullConnection();
        }
        
        // Вставка пробки - исправленная обработка
        if ((sourceId === 'cork' && targetId === 'glass-tube') || 
            (sourceId === 'glass-tube' && targetId === 'cork')) {
            console.log("Script.js: Пробка обнаружена!");
            
            // Явно устанавливаем флаг в experimentState
            experimentState.corkInserted = true;

            // Визуальные изменения пробки
            elements.cork.style.transform = 'translateY(-5px)';
            
            // Сохраняем начальные значения
            experimentState.initialFunnelHeight = experimentState.funnelPosition.top;
            experimentState.initialTubeWaterLevel = parseFloat(elements.tubeWater.style.height || '50');
            experimentState.initialFunnelWaterLevel = parseFloat(elements.funnelWater.style.height || '50');
            
            console.log("Сохраненные начальные значения:", 
                       "initialFunnelHeight =", experimentState.initialFunnelHeight,
                       "initialTubeWaterLevel =", experimentState.initialTubeWaterLevel,
                       "initialFunnelWaterLevel =", experimentState.initialFunnelWaterLevel);
            
            // Обновляем отображение воды
            experimentFunctions.updateWaterLevels();
            
            // Переходим к шагу 4, только если текущий шаг - 3
            if (experimentState.step === 3) {
                experimentFunctions.advanceToStep(4);
                elements.currentInstruction.textContent = 
                    "Теперь опустите воронку примерно на 50 см ниже первоначального положения";
            }
        }
    });
    
    // Функция проверки полного соединения системы
    function checkFullConnection() {
        if (experimentState.rubberTubeConnectedToGlassTube && 
            experimentState.rubberTubeConnectedToFunnel && 
            !experimentState.systemConnected) {
            
            console.log("Система полностью соединена!");
            experimentState.systemConnected = true;
            
            // Автоматически переходим к шагу с водой
            if (experimentState.step === 1) {
                console.log("Переходим к шагу 2 - наполнение водой");
                
                // Заполняем систему водой автоматически
                experimentState.waterFilled = true;
                experimentState.waterInRubberTube = true;
                experimentState.waterInFunnel = true;
                experimentState.waterInTube = true;
                
                experimentFunctions.updateWaterLevels();
                
                experimentFunctions.advanceToStep(2);
                elements.currentInstruction.textContent = 
                    "Теперь установите воронку так, чтобы уровень воды в трубке был на 50 см от верхнего конца";
            }
        }
    }
    
    // Обработчики открепления объектов
    physjs.onDetachment((object) => {
        const id = object.element.id;
        
        if (id === 'rubber-tube') {
            if (experimentState.rubberTubeConnectedToGlassTube) {
                experimentState.rubberTubeConnectedToGlassTube = false;
                console.log("Трубка отключена от стеклянной трубки");
            }
            
            if (experimentState.rubberTubeConnectedToFunnel) {
                experimentState.rubberTubeConnectedToFunnel = false;
                console.log("Трубка отключена от воронки");
            }
            
            // Сбрасываем состояние полного соединения
            experimentState.systemConnected = false;
            
            // Сбрасываем стиль трубки
            elements.rubberTube.classList.remove('connected');
            elements.rubberTube.style.transform = 'rotate(0deg)';
            elements.rubberTube.style.width = '150px';
            elements.rubberTube.style.left = '450px';
            elements.rubberTube.style.top = '350px';
            
            // Удаляем SVG путь для трубки
            const path = document.getElementById('rubber-tube-path');
            if (path) path.remove();
            
            // Возвращаем отображение DIV элемента трубки
            elements.rubberTube.style.display = 'block';
            
            if (experimentState.waterFilled && experimentState.step < 3) {
                experimentFunctions.resetWaterFilling();
            }
        }
        
        if (id === 'cork' && experimentState.corkInserted) {
            experimentState.corkInserted = false;
            console.log("Пробка отсоединена!");
            
            if (experimentState.step > 3) {
                experimentFunctions.resetToStep(3);
                elements.currentInstruction.textContent = 
                    "Вы вынули пробку. Вставьте пробку обратно, чтобы продолжить эксперимент";
            }
        }
    });
    
    // Настройка всплывающих подсказок
    setupTooltips();

    // Инициализация инструкции для первого шага
    elements.currentInstruction.textContent = 
        "Соедините резиновую трубку со стеклянной трубкой и воронкой";

    // Вспомогательная функция для всплывающих подсказок
    function setupTooltips() {
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip';
        document.body.appendChild(tooltip);
        
        const physElements = document.querySelectorAll('.phys, .phys-fixed, .phys-attachable');
        physElements.forEach(el => {
            el.addEventListener('mouseenter', function(e) {
                const name = this.getAttribute('data-name');
                if (name) {
                    tooltip.textContent = name;
                    tooltip.style.opacity = 1;
                    tooltip.style.left = (e.clientX + 10) + 'px';
                    tooltip.style.top = (e.clientY + 10) + 'px';
                }
            });
            
            el.addEventListener('mousemove', function(e) {
                if (tooltip.style.opacity === '1') {
                    tooltip.style.left = (e.clientX + 10) + 'px';
                    tooltip.style.top = (e.clientY + 10) + 'px';
                }
            });
            
            el.addEventListener('mouseleave', function() {
                tooltip.style.opacity = 0;
            });
        });
    }
});