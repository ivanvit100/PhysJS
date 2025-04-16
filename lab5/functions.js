const experimentFunctions = {
    // Состояние эксперимента
    experimentState: {
        step: 1,
        waterFilled: false,
        corkInserted: false,
        initialWaterLevelSet: false,
        finalMeasurementsDone: false,
        calculationDone: false,
        
        initialAirColumnLength: 0, // начальная длина воздушного столба (l)
        finalAirColumnLength: 0,   // конечная длина воздушного столба (l+Δl)
        waterLevelDifference: 0,   // разность уровней воды (h)
        calculatedPressure: 0,     // вычисленное давление
        
        // Положения объектов
        funnelPosition: { top: 100, left: 300 },
        initialFunnelHeight: 0,
        finalFunnelHeight: 0,
        
        // Наличие воды
        waterInTube: false,
        waterInFunnel: false,
        waterInRubberTube: false,
        
        // Соединения между объектами
        rubberTubeConnectedToGlassTube: false,
        rubberTubeConnectedToFunnel: false,
        systemConnected: false,

        initialTubeWaterLevel: 0,  // начальный уровень воды в трубке при вставке пробки
        initialFunnelWaterLevel: 0  // начальный уровень воды в воронке при вставке пробки
    },
    
    // Инициализация эксперимента
    initExperiment() {
        this.setupPhysicsObjects();
        this.setupEventListeners();
        this.updateWaterLevels();
        this.updateInstructions();
    },
    
    // Настройка физических объектов
    setupPhysicsObjects() {
        // Инициализация объектов для физики
        this.initializePhysicsObject('#glass-tube', 'tube', true);
        this.initializePhysicsObject('#funnel', 'funnel', false);
        this.initializePhysicsObject('#rubber-tube', 'tube', false);
        this.initializePhysicsObject('#cork', 'cork', false);
        this.initializePhysicsObject('#ruler', 'ruler', false);
        this.initializePhysicsObject('#barometer', 'barometer', true);
        this.initializePhysicsObject('#water-container', 'container', true);
        
        // Настройка точек крепления
        this.setupAttachmentPoints();
    },
    
    // Инициализация физического объекта
    initializePhysicsObject(selector, type, isFixed) {
        const element = document.querySelector(selector);
        if (!element) return;
        
        if(!element.dataset.type && type) element.dataset.type = type;
        
        isFixed ?
            !element.classList.contains('phys-fixed') && element.classList.add('phys-fixed') :
            !element.classList.contains('phys') && element.classList.add('phys');
        
        // Добавляем phys-attachable ко всем объектам
        !element.classList.contains('phys-attachable') && element.classList.add('phys-attachable');
        
        !physjs.getObject(selector) && physjs.createObject(selector);
    },
    
    // Настройка точек крепления для объектов
    setupAttachmentPoints() {
        physjs.detachAll();
        
        // Точки крепления на стеклянной трубке
        physjs.addAttachmentPoint('#glass-tube', 'rubber-tube-attachment', 0, 85, ['tube']);
        physjs.addAttachmentPoint('#glass-tube', 'cork-attachment', 5, -5, ['cork']);
        
        // Точки крепления на воронке
        physjs.addAttachmentPoint('#funnel', 'rubber-tube-attachment', 0, 65, ['tube']);
        
        // Точки крепления на резиновой трубке
        // physjs.addAttachmentPoint('#rubber-tube', 'tube-end-1', 0, 0, ['tube']);
        // physjs.addAttachmentPoint('#rubber-tube', 'tube-end-2', 100, 0, ['funnel']);
    },
    
    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработка перемещения объектов
        physjs.onObjectMove((object) => {
            const id = object.element.id;
            
            if (id === 'funnel') {
                // Если воронка присоединена к трубке, ограничиваем движение только по вертикали
                if (this.experimentState.rubberTubeConnectedToGlassTube && 
                    this.experimentState.rubberTubeConnectedToFunnel) {
                    
                    // Сохраняем текущее положение по горизонтали
                    const currentLeft = parseInt(object.element.style.left);
                    
                    // Применяем ограничения по вертикали
                    this.limitFunnelMovement(object.element);
                    
                    // Возвращаем горизонтальное положение (запрещаем движение по горизонтали)
                    object.element.style.left = `${currentLeft}px`;
                    
                    // Обновляем положение резиновой трубки
                    this.updateRubberTubePosition();
                }
                
                this.experimentState.funnelPosition = {
                    top: parseInt(object.element.style.top || '100'),
                    left: parseInt(object.element.style.left || '300')
                };
                
                // Обновляем уровень воды при перемещении воронки
                if (this.experimentState.waterInFunnel) {
                    this.updateWaterLevels();
                    
                    // Проверка на шаг 2 - установка начального уровня
                    if (this.experimentState.step === 2 && !this.experimentState.initialWaterLevelSet) {
                        const tubeWaterLevel = this.calculateWaterLevelInTube();
                        
                        // Уровень воды должен быть примерно 50 см от верхнего конца трубки
                        if (tubeWaterLevel >= 45 && tubeWaterLevel <= 55) {
                            document.getElementById('ruler').style.display = 'block';
                            document.getElementById('current-instruction').textContent = 
                                "Используйте линейку, чтобы измерить длину воздушного столба в трубке";
                        }
                    }
                    
                    // Проверка на шаг 4 - опускание воронки на 50 см
                    if (this.experimentState.step === 4 && !this.experimentState.finalMeasurementsDone) {
                        const heightDifference = this.experimentState.funnelPosition.top - this.experimentState.initialFunnelHeight;
                        
                        // Если воронка опущена примерно на 50 см
                        if (heightDifference >= 45) {
                            document.getElementById('current-instruction').textContent = 
                                "Теперь используйте линейку, чтобы измерить новую длину воздушного столба и разность уровней воды";
                        }
                    }
                }
            }
            
            // Обработка перемещения линейки для измерений
            if (id === 'ruler') {
                this.checkRulerMeasurement();
            }
        });
        
        // Обработка прикрепления объектов - здесь исключаем обработку прикрепления пробки
        physjs.onAttachment((sourceObject, targetObject) => {
            const sourceId = sourceObject.element.id;
            const targetId = targetObject.element.id;
            
            // Соединение резиновой трубки со стеклянной
            if ((sourceId === 'rubber-tube' && targetId === 'glass-tube') || 
                (sourceId === 'glass-tube' && targetId === 'rubber-tube')) {
                this.experimentState.rubberTubeConnectedToGlassTube = true;
                
                // Обновляем положение резиновой трубки, если она соединена и с воронкой
                if (this.experimentState.rubberTubeConnectedToFunnel) {
                    this.updateRubberTubePosition();
                }
                
                // Проверка заполнения системы водой на шаге 1
                if (this.experimentState.step === 1 && this.experimentState.rubberTubeConnectedToFunnel) {
                    this.allowWaterFilling();
                }
            }
            
            // Соединение резиновой трубки с воронкой
            if ((sourceId === 'rubber-tube' && targetId === 'funnel') || 
                (sourceId === 'funnel' && targetId === 'rubber-tube')) {
                this.experimentState.rubberTubeConnectedToFunnel = true;
                
                // Обновляем положение резиновой трубки, если она соединена и со стеклянной трубкой
                if (this.experimentState.rubberTubeConnectedToGlassTube) {
                    this.updateRubberTubePosition();
                }
                
                // Проверка заполнения системы водой на шаге 1
                if (this.experimentState.step === 1 && this.experimentState.rubberTubeConnectedToGlassTube) {
                    this.allowWaterFilling();
                }
            }
            
            // Обработка прикрепления пробки удалена, т.к. она есть в script.js
        });
        
        // Обработка открепления объектов
        physjs.onDetachment((object) => {
            const id = object.element.id;
            
            if (id === 'rubber-tube') {
                // Проверяем, к чему была прикреплена резиновая трубка
                if (this.experimentState.rubberTubeConnectedToGlassTube) {
                    this.experimentState.rubberTubeConnectedToGlassTube = false;
                }
                
                if (this.experimentState.rubberTubeConnectedToFunnel) {
                    this.experimentState.rubberTubeConnectedToFunnel = false;
                }
                
                // Сбрасываем стиль трубки
                const rubberTube = document.getElementById('rubber-tube');
                rubberTube.classList.remove('connected');
                rubberTube.style.transform = 'rotate(0deg)';
                rubberTube.style.width = '150px';
                rubberTube.style.left = '450px';
                rubberTube.style.top = '350px';
                
                // Удаляем SVG путь для трубки
                const path = document.getElementById('rubber-tube-path');
                if (path) path.remove();
                
                // Возвращаем отображение DIV элемента трубки
                rubberTube.style.display = 'block';
                
                // Сбрасываем системный флаг соединения
                this.experimentState.systemConnected = false;
                
                // Сбрасываем состояние заполнения водой, если отсоединили трубку
                if (this.experimentState.waterFilled && this.experimentState.step < 3) {
                    this.resetWaterFilling();
                }
            }
            
            if (id === 'cork' && this.experimentState.corkInserted) {
                this.experimentState.corkInserted = false;
                console.log("Functions.js: Пробка отсоединена!");
                
                // Сбрасываем шаг, если вынули пробку после вставки
                if (this.experimentState.step > 3) {
                    this.resetToStep(3);
                    document.getElementById('current-instruction').textContent = 
                        "Вы вынули пробку. Вставьте пробку обратно, чтобы продолжить эксперимент";
                }
            }
        });
        
        // Обработчик для кнопки "Сбросить"
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetExperiment();
        });
        
        // Обработчик для кнопки "Назад"
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = '../index.html';
        });
        
        // Обработчик для расчета давления
        document.getElementById('calculate-btn').addEventListener('click', () => {
            this.calculatePressure();
        });
    },
    
    // Разрешить заполнение системы водой
    allowWaterFilling() {
        const waterContainer = document.getElementById('water-container');
        const funnel = document.getElementById('funnel');
        
        // Проверяем, что воронка находится рядом с сосудом с водой
        if (this.elementsOverlap(funnel, waterContainer, 50)) {
            this.experimentState.waterFilled = true;
            this.experimentState.waterInRubberTube = true;
            this.experimentState.waterInFunnel = true;
            this.experimentState.waterInTube = true;
            
            // Обновляем уровни воды
            this.updateWaterLevels();
            
            // Переходим к шагу 2
            this.advanceToStep(2);
            document.getElementById('current-instruction').textContent = 
                "Теперь установите воронку так, чтобы уровень воды в трубке был на 50 см от верхнего конца";
        } else {
            document.getElementById('current-instruction').textContent = 
                "Поднесите воронку к сосуду с водой, чтобы наполнить систему";
        }
    },
    
    // Сбросить заполнение водой
    resetWaterFilling() {
        this.experimentState.waterFilled = false;
        this.experimentState.waterInRubberTube = false;
        this.experimentState.waterInFunnel = false;
        this.experimentState.waterInTube = false;
        
        // Обновляем уровни воды
        this.updateWaterLevels();
        
        // Возвращаемся к шагу 1
        this.resetToStep(1);
        document.getElementById('current-instruction').textContent = 
            "Наполните систему водой, перемещая воронку к сосуду с водой";
    },
    
    // Обновление уровней воды с правильной механикой для закрытой и открытой системы
    updateWaterLevels() {
        const tubeWater = document.querySelector('#glass-tube .tube-water');
        const funnelWater = document.querySelector('#funnel .tube-water');
        const tubeAir = document.querySelector('#glass-tube .tube-air');
        const funnelAir = document.querySelector('#funnel .tube-air');
        
        // ВАЖНАЯ ДИАГНОСТИКА
        console.log("Обновление воды. corkInserted =", this.experimentState.corkInserted, 
                  "initialTubeWaterLevel =", this.experimentState.initialTubeWaterLevel,
                  "initialFunnelWaterLevel =", this.experimentState.initialFunnelWaterLevel);
        
        if (!this.experimentState.waterInTube) {
            tubeWater.style.height = '0%';
            tubeAir.style.height = '100%';
            funnelWater.style.height = '0%';
            funnelAir.style.height = '100%';
            return;
        }
        
        // Получаем положение сосудов
        const glassTube = document.getElementById('glass-tube');
        const funnel = document.getElementById('funnel');
        const tubeRect = glassTube.getBoundingClientRect();
        const funnelRect = funnel.getBoundingClientRect();
        
        // Высоты и позиции
        const tubeHeight = tubeRect.height;
        const funnelHeight = funnelRect.height;
        const tubeTop = tubeRect.top;
        const tubeBottom = tubeRect.bottom;
        const funnelTop = funnelRect.top;
        const funnelBottom = funnelRect.bottom;
        
        if (!this.experimentState.corkInserted) {
            // ОТКРЫТАЯ СИСТЕМА (СООБЩАЮЩИЕСЯ СОСУДЫ)
            
            // Фиксированное общее количество воды
            const totalWaterVolume = tubeHeight * 0.5 + funnelHeight * 0.5; // 50% от общей высоты
            
            // В сообщающихся сосудах уровень воды находится на одной АБСОЛЮТНОЙ высоте
            // Вычисляем абсолютную Y-координату уровня воды (от верха страницы)
            const absoluteWaterLevel = (tubeBottom + funnelBottom - totalWaterVolume) / 2;
            
            // Вычисляем % заполнения для трубки
            const tubeWaterHeightPx = tubeBottom - absoluteWaterLevel;
            const tubeWaterPercent = (tubeWaterHeightPx / tubeHeight) * 100;
            
            // Вычисляем % заполнения для воронки
            const funnelWaterHeightPx = funnelBottom - absoluteWaterLevel;
            const funnelWaterPercent = (funnelWaterHeightPx / funnelHeight) * 100;
            
            // Установка уровней воды с ограничениями
            tubeWater.style.height = `${Math.max(0, Math.min(100, tubeWaterPercent))}%`;
            tubeAir.style.height = `${Math.max(0, Math.min(100, 100 - tubeWaterPercent))}%`;
            funnelWater.style.height = `${Math.max(0, Math.min(100, funnelWaterPercent))}%`;
            funnelAir.style.height = `${Math.max(0, Math.min(100, 100 - funnelWaterPercent))}%`;
            
            // Сохраняем начальную длину воздушного столба
            if (this.experimentState.step === 2 && this.experimentState.initialWaterLevelSet) {
                this.experimentState.initialAirColumnLength = 100 - tubeWaterPercent;
            }
        } else {
            // ЗАКРЫТАЯ СИСТЕМА (ПРОБКА ВСТАВЛЕНА)
            
            // Начальная позиция воронки и разница высот
            const initialHeight = this.experimentState.initialFunnelHeight;
            const currentHeight = this.experimentState.funnelPosition.top;
            const heightDifference = currentHeight - initialHeight;
            
            // Переводим разницу высот из пикселей в см (примерно)
            // Предположим, что 1 пиксель = 0.37 см
            const heightDifferenceInCm = heightDifference * 0.37;
            
            // Коэффициент для изменения уровня воды: при изменении на 10см, уровень воды меняется на 2см
            // То есть, на каждый 1 см перемещения, уровень воды меняется на 0.2 см
            const waterChangeRatio = 0.2; 
            
            // Изменение уровня воды в см
            const waterLevelChangeInCm = heightDifferenceInCm * waterChangeRatio;
            
            // Преобразуем изменение в см в проценты от высоты сосуда
            // Предположим, что высота трубки примерно 100 см
            const tubeHeightInCm = 100;
            const funnelHeightInCm = 100;
            
            const waterLevelChangeInPercentTube = (waterLevelChangeInCm / tubeHeightInCm) * 100;
            const waterLevelChangeInPercentFunnel = (waterLevelChangeInCm / funnelHeightInCm) * 100;
            
            // Начальные уровни при вставке пробки
            const initialTubeWaterLevel = this.experimentState.initialTubeWaterLevel || 50;
            const initialFunnelWaterLevel = this.experimentState.initialFunnelWaterLevel || 50;
            
            // Новые уровни воды
            // При опускании воронки уровень воды в трубке падает (менее заполнено), в воронке растет (более заполнено)
            const tubeWaterPercent = initialTubeWaterLevel - waterLevelChangeInPercentTube;
            const funnelWaterPercent = initialFunnelWaterLevel + waterLevelChangeInPercentFunnel;
            
            // Устанавливаем уровни с ограничениями
            tubeWater.style.height = `${Math.max(10, Math.min(90, tubeWaterPercent))}%`;
            tubeAir.style.height = `${Math.max(10, Math.min(90, 100 - tubeWaterPercent))}%`;
            
            funnelWater.style.height = `${Math.max(10, Math.min(90, funnelWaterPercent))}%`;
            funnelAir.style.height = `${100 - Math.max(10, Math.min(90, funnelWaterPercent))}%`;
            
            console.log(`Закрытая система: Перемещение ${heightDifferenceInCm.toFixed(1)} см, Изменение воды ${waterLevelChangeInCm.toFixed(1)} см`);
            console.log(`Трубка ${tubeWaterPercent.toFixed(2)}%, Воронка ${funnelWaterPercent.toFixed(2)}%`);
            
            // Сохраняем конечную длину воздушного столба
            if (this.experimentState.step >= 4) {
                this.experimentState.finalAirColumnLength = 100 - tubeWaterPercent;
            }
        }
        
        // Делаем воду видимой
        funnelWater.style.display = 'block';
    },
    
    // Расчет уровня воды в трубке
    calculateWaterLevelInTube() {
        if (!this.experimentState.waterInTube) return 0;
        
        // Получаем положение и размеры трубки и воронки для реалистичного расчета
        const glassTube = document.getElementById('glass-tube');
        const funnel = document.getElementById('funnel');
        const tubeRect = glassTube.getBoundingClientRect();
        const funnelRect = funnel.getBoundingClientRect();
        
        if (!this.experimentState.corkInserted) {
            // СООБЩАЮЩИЕСЯ СОСУДЫ
            const tubeHeight = tubeRect.height;
            const funnelHeight = funnelRect.height;
            const tubeBottom = tubeRect.bottom;
            const funnelBottom = funnelRect.bottom;
            const tubeTop = tubeRect.top;
            
            // Общий объем воды в системе
            const totalWaterVolume = tubeHeight * 0.5 + funnelHeight * 0.5;
            
            // Абсолютный уровень воды
            const absoluteWaterLevel = (tubeBottom + funnelBottom - totalWaterVolume) / 2;
            
            // Воздушный столб в процентах
            const airHeight = absoluteWaterLevel - tubeTop;
            return (airHeight / tubeHeight) * 100;
        } else {
            // ЗАКРЫТАЯ СИСТЕМА - вода меняется медленно
            const initialHeight = this.experimentState.initialFunnelHeight;
            const currentHeight = this.experimentState.funnelPosition.top;
            const heightDifference = currentHeight - initialHeight;
            
            // Переводим пиксели в см
            const heightDifferenceInCm = heightDifference * 0.37;
            
            // Начальные значения при вставке пробки
            const initialAirColumnLength = this.experimentState.initialAirColumnLength;
            
            // Коэффициент медленного изменения
            const waterChangeRatio = 0.2;
            
            // Изменение уровня воды
            const waterLevelChange = heightDifferenceInCm * waterChangeRatio;
            
            // Новый уровень воздушного столба = начальный + изменение
            return initialAirColumnLength + waterLevelChange;
        }
    },
    
    // Ограничение перемещения воронки
    limitFunnelMovement(funnelElement) {
        if (!funnelElement) return;
        
        // Если шланг не подключен к обоим объектам - не ограничиваем
        if (!this.experimentState.rubberTubeConnectedToGlassTube || 
            !this.experimentState.rubberTubeConnectedToFunnel) {
            return;
        }
        
        // Получаем текущую позицию воронки
        const funnelTop = parseInt(funnelElement.style.top || '100');
        
        // Получаем позицию и размеры трубки
        const tube = document.getElementById('glass-tube');
        const tubeTop = parseInt(tube.style.top || '100');
        const tubeHeight = 400; // высота трубки
        
        // Получаем текущие уровни воды
        const tubeWater = document.querySelector('#glass-tube .tube-water');
        const funnelWater = document.querySelector('#funnel .tube-water');
        const tubeWaterHeight = parseFloat(tubeWater.style.height || '0'); // в процентах
        const funnelWaterHeight = parseFloat(funnelWater.style.height || '0'); // в процентах
        
        // Устанавливаем минимальную и максимальную высоту
        let minTop, maxTop;
        
        // Если пробка вставлена
        if (this.experimentState.corkInserted) {
            // Минимум - начальное положение (нельзя поднимать выше начального)
            minTop = this.experimentState.initialFunnelHeight;
            // Максимум - примерно на 50 см ниже
            maxTop = minTop + 135; // 135 пикселей примерно соответствуют 50 см
        } else {
            // Без пробки: минимум - верх трубки + запас для воды (чтобы не переливалась)
            let baseMinTop = tubeTop - 50;
            let baseMaxTop = tubeTop + tubeHeight - 50;
            
            // Если уровень воды в трубке близок к максимуму (более 90% заполнения)
            if (tubeWaterHeight > 90) {
                // Запрещаем опускать воронку ниже текущего положения
                baseMaxTop = funnelTop;
            }
            
            // Если уровень воды в воронке близок к минимуму (менее 10% заполнения)
            if (funnelWaterHeight < 10) {
                // Запрещаем поднимать воронку выше текущего положения
                baseMinTop = funnelTop;
            }
            
            minTop = baseMinTop;
            maxTop = baseMaxTop;
        }
        
        // Применяем ограничения
        if (funnelTop < minTop) {
            funnelElement.style.top = `${minTop}px`;
            
            // Обновляем позицию в состоянии
            this.experimentState.funnelPosition.top = minTop;
        } else if (funnelTop > maxTop) {
            funnelElement.style.top = `${maxTop}px`;
            
            // Обновляем позицию в состоянии
            this.experimentState.funnelPosition.top = maxTop;
        }
        
        // Обновляем уровни воды после ограничения
        this.updateWaterLevels();
    },
    
    // Обновление положения и формы резиновой трубки
    updateRubberTubePosition() {
        // Проверяем, соединена ли трубка с обоими объектами
        const isConnected = this.experimentState.rubberTubeConnectedToGlassTube && 
                            this.experimentState.rubberTubeConnectedToFunnel;

        // Получаем SVG контейнер
        const svgContainer = document.getElementById('svg-container');
        const rubberTube = document.getElementById('rubber-tube');

        // Обновляем видимость элементов
        if (!isConnected) {
            svgContainer.classList.remove('connected');
            rubberTube.style.display = 'block';
            return;
        }

        // Показываем SVG и скрываем обычный DIV
        svgContainer.classList.add('connected');
        rubberTube.style.display = 'none';

        // Получаем элементы для обновления
        const glassTube = document.getElementById('glass-tube');
        const funnel = document.getElementById('funnel');
        const path = document.getElementById('rubber-tube-path');
        const tubeConnector = document.getElementById('tube-connector');
        const funnelConnector = document.getElementById('funnel-connector');

        // Координаты и размеры стеклянной трубки
        const tubeRect = glassTube.getBoundingClientRect();
        const tubeX = tubeRect.left + tubeRect.width / 2;
        const tubeY = tubeRect.bottom - 5; // 5px от нижнего края
        const tubeWidth = tubeRect.width + 10; // Немного шире трубки

        // Координаты и размеры воронки
        const funnelRect = funnel.getBoundingClientRect();
        const funnelX = funnelRect.left + funnelRect.width / 2;
        const funnelY = funnelRect.bottom - 5; // 5px от нижнего края
        const funnelWidth = funnelRect.width + 10; // Немного шире воронки

        // Рассчитываем центральную точку для провисания
        const centerX = (tubeX + funnelX) / 2;
        const maxY = Math.max(tubeY, funnelY) + 80; // Добавляем провисание вниз

        // Обновляем путь трубки - начинаем чуть ниже, чтобы скрыть стык
        path.setAttribute('d', `M ${tubeX} ${tubeY + 5} Q ${centerX} ${maxY}, ${funnelX} ${funnelY + 5}`);

        // Обновляем положение и размер манжеты для трубки
        tubeConnector.setAttribute('x', tubeX - tubeWidth / 2);
        tubeConnector.setAttribute('y', tubeY - 15);
        tubeConnector.setAttribute('width', tubeWidth);
        tubeConnector.setAttribute('height', 25);

        // Обновляем положение и размер манжеты для воронки
        funnelConnector.setAttribute('x', funnelX - funnelWidth / 2);
        funnelConnector.setAttribute('y', funnelY - 15);
        funnelConnector.setAttribute('width', funnelWidth);
        funnelConnector.setAttribute('height', 25);
    },
    
    // Проверка измерения линейкой
    checkRulerMeasurement() {
        const ruler = document.getElementById('ruler');
        const glassTube = document.getElementById('glass-tube');
        
        // Проверяем, что линейка находится рядом со стеклянной трубкой
        if (this.elementsOverlap(ruler, glassTube, 20)) {
            // На шаге 2 - измерение начальной длины воздушного столба
            if (this.experimentState.step === 2 && !this.experimentState.initialWaterLevelSet) {
                const airColumnLength = this.calculateWaterLevelInTube();
                const lengthInCm = (airColumnLength / 100) * 100; // Преобразуем % в см (трубка 100 см)
                
                this.experimentState.initialAirColumnLength = lengthInCm;
                document.getElementById('length1').textContent = lengthInCm.toFixed(1);
                
                this.experimentState.initialWaterLevelSet = true;
                
                // Переходим к шагу 3
                this.advanceToStep(3);
                document.getElementById('current-instruction').textContent = 
                    "Теперь закройте отверстие трубки пробкой";
            }
            
            // На шаге 4 - измерение конечной длины воздушного столба и разности уровней
            if (this.experimentState.step === 4 && this.experimentState.corkInserted && 
                !this.experimentState.finalMeasurementsDone) {
                const heightDifference = this.experimentState.funnelPosition.top - this.experimentState.initialFunnelHeight;
                
                // Если воронка опущена достаточно (>= 45 пикселей)
                if (heightDifference >= 45) {
                    console.log("Воронка опущена на достаточное расстояние:", heightDifference, "пикселей");
                    
                    // Преобразуем пиксели в см (1 пиксель = 0.37 см)
                    const heightDifferenceInCm = heightDifference * 0.11;
                    
                    // Начальная высота воздушного столба из сохраненного значения
                    const initialAirColumnLength = this.experimentState.initialAirColumnLength;
                    
                    // Изменение уровня воды - 20% от перемещения воронки
                    const waterLevelChange = heightDifferenceInCm * 0.2;
                    
                    // Новая высота воздушного столба = начальная + изменение
                    const finalAirColumnLength = initialAirColumnLength + waterLevelChange;
                    
                    this.experimentState.finalAirColumnLength = finalAirColumnLength;
                    this.experimentState.waterLevelDifference = heightDifferenceInCm;
                    
                    document.getElementById('length2').textContent = finalAirColumnLength.toFixed(1);
                    document.getElementById('water-level-diff').textContent = heightDifferenceInCm.toFixed(1);
                    
                    this.experimentState.finalMeasurementsDone = true;
                    
                    // Переходим к шагу 5
                    this.advanceToStep(5);
                    document.getElementById('current-instruction').textContent = 
                        "Теперь выполните расчет атмосферного давления";
                    
                    // Показываем кнопку расчета
                    document.getElementById('calculate-btn').style.display = 'block';
                } else {
                    console.log("Воронка не опущена достаточно:", heightDifference, "пикселей");
                }
            }
        }
    },
    
    // Расчет атмосферного давления
    calculatePressure() {
        if (!this.experimentState.finalMeasurementsDone) return;
        
        // Параметры для расчета
        const l = this.experimentState.initialAirColumnLength / 100; // в метрах
        const lDelta = (this.experimentState.finalAirColumnLength - this.experimentState.initialAirColumnLength) / 100; // в метрах
        const h = this.experimentState.waterLevelDifference / 100; // в метрах
        
        // Расчет атмосферного давления по формуле: p = ρ*g*h*(l+Δl)/l
        const waterDensity = 1000; // кг/м³
        const g = 9.81; // м/с²
        
        // Давление в Паскалях
        const pressureInPa = waterDensity * g * h * (l + lDelta) / l;
        
        // Перевод в мм рт. ст. (1 мм рт. ст. = 133.3 Па)
        const pressureInMmHg = pressureInPa / 133.3;
        
        this.experimentState.calculatedPressure = pressureInMmHg;
        document.getElementById('pressure').textContent = pressureInMmHg.toFixed(2);
        
        // Получаем показания барометра
        const barometerReading = parseFloat(document.getElementById('barometer-display').textContent);
        
        // Вычисляем разницу между вычисленным и измеренным значениями
        const difference = Math.abs(pressureInMmHg - barometerReading);
        const percentDifference = (difference / barometerReading) * 100;
        
        // Переходим к шагу 6
        this.advanceToStep(6);
        
        // Показываем результат сравнения
        let resultMessage = "";
        if (percentDifference <= 5) {
            resultMessage = `Отлично! Ваше измерение (${pressureInMmHg.toFixed(2)} мм рт.ст.) ` +
                            `близко к показаниям барометра (${barometerReading} мм рт.ст.). ` +
                            `Разница составляет ${percentDifference.toFixed(1)}%.`;
            document.getElementById('current-instruction').textContent = resultMessage;
            document.getElementById('current-instruction').classList.add('success');
        } else {
            resultMessage = `Ваше измерение (${pressureInMmHg.toFixed(2)} мм рт.ст.) ` +
                            `отличается от показаний барометра (${barometerReading} мм рт.ст.). ` +
                            `Разница составляет ${percentDifference.toFixed(1)}%. ` +
                            `Проверьте правильность измерений и вычислений.`;
            document.getElementById('current-instruction').textContent = resultMessage;
            document.getElementById('current-instruction').classList.add('warning');
        }
        
        // Переход к финальному шагу
        this.advanceToStep(7);
        this.experimentState.calculationDone = true;
    },
    
    // Перейти к следующему шагу
    advanceToStep(step) {
        if (step <= this.experimentState.step) return;
        
        this.experimentState.step = step;
        
        // Обновляем UI
        const stepElements = document.querySelectorAll('#status-panel ol li');
        stepElements.forEach((el, index) => {
            el.classList.remove('active');
            if (index + 1 === step) {
                el.classList.add('active');
            } else if (index + 1 < step) {
                el.classList.add('completed');
            }
        });
    },
    
    // Сбросить до указанного шага
    resetToStep(step) {
        this.experimentState.step = step;
        
        // Обновляем UI
        const stepElements = document.querySelectorAll('#status-panel ol li');
        stepElements.forEach((el, index) => {
            el.classList.remove('active', 'completed');
            if (index + 1 === step) {
                el.classList.add('active');
            } else if (index + 1 < step) {
                el.classList.add('completed');
            }
        });
    },
    
    // Сбросить эксперимент
    resetExperiment() {
        location.reload();
    },
    
    // Обновление инструкций в зависимости от текущего шага
    updateInstructions() {
        const instructionElement = document.getElementById('current-instruction');
        
        switch(this.experimentState.step) {
            case 1:
                instructionElement.textContent = "Наполните систему водой, перемещая воронку к сосуду с водой";
                break;
            case 2:
                instructionElement.textContent = "Установите уровень воды в трубке на 50 см от верхнего конца";
                break;
            case 3:
                instructionElement.textContent = "Закройте отверстие трубки пробкой";
                break;
            case 4:
                instructionElement.textContent = "Опустите воронку примерно на 50 см ниже первоначального положения";
                break;
            case 5:
                instructionElement.textContent = "Выполните расчет атмосферного давления";
                break;
            case 6:
                instructionElement.textContent = "Сравните результаты с показаниями барометра";
                break;
            case 7:
                instructionElement.textContent = "Эксперимент завершен! Вы успешно измерили атмосферное давление.";
                break;
        }
    },
    
    // Проверка перекрытия элементов
    elementsOverlap(el1, el2, tolerance = 0) {
        if (!el1 || !el2) return false;
        
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();
        
        return !(rect1.right < rect2.left - tolerance || 
                rect1.left > rect2.right + tolerance || 
                rect1.bottom < rect2.top - tolerance || 
                rect1.top > rect2.bottom + tolerance);
    }
};

export default experimentFunctions;