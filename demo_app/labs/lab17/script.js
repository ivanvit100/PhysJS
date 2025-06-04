class InteractiveGasExperiment {
    constructor() {
        this.T1_celsius = 85;
        this.T2_celsius = 15;
        this.tubeLength = 0.18;
        this.pressure = 101325;
        
        this.rho = 1000;
        this.g = 9.81;
        
        this.currentStep = 1;
        this.measurements = {};
        this.tubeInHot = false;
        this.tubeInCold = false;
        this.tubeCorked = false;
        this.corkRemoved = false;
        this.thermometerInWater = false;
        this.currentTemperature = 20;
        this.deltaL = 0;
        this.tubeInUpperPosition = false;
        this.tubeInLowerPosition = false;
        
        this.initializeDragAndDrop();
        this.calculateDeltaL();
        this.updateInstructions();
        this.initCorkDoubleClick();
        this.updateThermometerReading(20);
        this.initThermometerHover();
        this.initRulerDrag();
    }

    initThermometerHover() {
        const thermometer = document.getElementById('thermometer');
        const hotContainer = document.getElementById('hotContainer');
        const coldContainer = document.getElementById('coldContainer');
        
        document.addEventListener('mousemove', (e) => {
            if (!thermometer) return;
            
            const thermRect = thermometer.getBoundingClientRect();
            const hotRect = hotContainer.getBoundingClientRect();
            const coldRect = coldContainer.getBoundingClientRect();
            
            if (this.isColliding(thermRect, hotRect)) {
                this.updateThermometerReading(this.T1_celsius);
                !document.querySelector('.thermometer-zone') && this.addThermometerZone(hotContainer, 'hot');
                this.thermometerInWater = true;
            } else if (this.isColliding(thermRect, coldRect)) {
                this.updateThermometerReading(this.T2_celsius);
                !document.querySelector('.thermometer-zone') && this.addThermometerZone(coldContainer, 'cold');
                this.thermometerInWater = true;
            } else {
                this.updateThermometerReading(20);
                document.querySelectorAll('.thermometer-zone').forEach(zone => zone.remove());
                this.thermometerInWater = false;
            }
        });
    }
    
    initRulerDrag() {
        const ruler = document.getElementById('ruler');
        const tube = document.getElementById('dragTube');
        
        this.setupDragAndDrop(ruler, (ruler, e) => {
            return true;
        }, (ruler) => {
            const rulerRect = ruler.getBoundingClientRect();
            const tubeRect = tube.getBoundingClientRect();
            
            this.removeLengthDisplay();
            
            if (this.isColliding(rulerRect, tubeRect) && (this.currentStep === 7 || this.currentStep === 2))
                this.displayTubeLength(tube, ruler);
        }, (ruler) => {
            const rulerRect = ruler.getBoundingClientRect();
            const tubeRect = tube.getBoundingClientRect();
            
            !this.isColliding(rulerRect, tubeRect) && this.removeLengthDisplay();
        });
    }
    
    calculateDeltaL() {
        const T1_K = this.T1_celsius + 273.15;
        const T2_K = this.T2_celsius + 273.15;
        const compressionRatio = T2_K / T1_K;
        this.deltaL = this.tubeLength * (1 - compressionRatio) * 0.6;
        this.deltaL = Math.max(0.01, Math.min(0.15, this.deltaL));
    }
    
    initCorkDoubleClick() {
        document.addEventListener('dblclick', (e) => {
            if (this.currentStep === 5 && this.tubeInCold && this.tubeCorked) {
                const cork = document.querySelector('.cork-body');
                if (cork && cork.contains(e.target)) {
                    this.removeCorkFromTube();
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        });
    }
    
    initializeDragAndDrop() {
        this.initTubeDrag();
        this.initCorkDrag();
        this.initThermometerDrag();
    }
    
    initTubeDrag() {
        const tube = document.getElementById('dragTube');
        const hotZone = document.getElementById('hotZone');
        const coldZone = document.getElementById('coldZone');
        
        this.setupDragAndDrop(tube, (tube, e) => {
            if (this.currentStep === 1 || this.currentStep === 4 || this.currentStep === 6) return true;
            return false;
        }, (tube) => {
            const tubeRect = tube.getBoundingClientRect();
            const hotRect = hotZone.getBoundingClientRect();
            const coldRect = coldZone.getBoundingClientRect();
            
            hotZone.classList.remove('highlight');
            coldZone.classList.remove('highlight');
            
            if (this.isColliding(tubeRect, hotRect) && this.currentStep === 1) {
                hotZone.classList.add('highlight');
            } else if (this.isColliding(tubeRect, coldRect) && this.currentStep === 4) {
                coldZone.classList.add('highlight');
            } else if (this.isColliding(tubeRect, coldRect) && this.currentStep === 6 && this.tubeInUpperPosition) {
                coldZone.classList.add('highlight');
            }
        }, (tube) => {
            const tubeRect = tube.getBoundingClientRect();
            const hotRect = hotZone.getBoundingClientRect();
            const coldRect = coldZone.getBoundingClientRect();
            
            if (this.currentStep === 1 && this.isColliding(tubeRect, hotRect))
                this.placeTubeInHot(tube);
            else if (this.currentStep === 4 && this.isColliding(tubeRect, coldRect) && this.tubeCorked)
                this.placeTubeInColdUpper(tube);
            else if (this.currentStep === 6 && this.isColliding(tubeRect, coldRect) && this.tubeInUpperPosition)
                this.placeTubeInColdLower(tube);
            else if (!tube.classList.contains('tube-in-container'))
                this.resetTubePosition(tube);
            
            hotZone.classList.remove('highlight');
            coldZone.classList.remove('highlight');
        });
    }
    
        displayTubeLength(tube, ruler) {
        this.removeLengthDisplay();
        
        const lengthDisplay = document.createElement('div');
        lengthDisplay.id = 'tube-length-display';
        lengthDisplay.className = 'measurement-display';
        
        const tubeLengthCm = (this.tubeLength * 100).toFixed(1);
        
        if (this.currentStep === 7 && this.corkRemoved && !this.tubeInLowerPosition) {
            lengthDisplay.innerHTML = `
                <div>Длина трубки: ${tubeLengthCm} см</div>
                <div>Высота столба воды: 12.0 см</div>
                <div>Длина столба воздуха l₁: 6.0 см</div>
            `;
            lengthDisplay.style.width = '280px';
        } else if (this.currentStep === 7 && this.tubeInLowerPosition) {
            lengthDisplay.innerHTML = `
                <div>Уровни воды равны</div>
                <div>Длина трубки: ${tubeLengthCm} см</div>
                <div>Длина столба воздуха l₂: 4.5 см</div>
            `;
            lengthDisplay.style.width = '250px';
        } else {
            lengthDisplay.textContent = `Длина: ${tubeLengthCm} см`;
        }
        
        lengthDisplay.style.position = 'absolute';
        lengthDisplay.style.backgroundColor = 'rgba(52, 152, 219, 0.9)';
        lengthDisplay.style.color = 'white';
        lengthDisplay.style.padding = '4px 8px';
        lengthDisplay.style.borderRadius = '4px';
        lengthDisplay.style.fontSize = '14px';
        lengthDisplay.style.fontWeight = 'bold';
        lengthDisplay.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        lengthDisplay.style.zIndex = '100';
        
        const rulerRect = ruler.getBoundingClientRect();
        const experimentRect = document.querySelector('.experiment-area').getBoundingClientRect();
        const topPosition = rulerRect.top - experimentRect.top - 30;
        const leftPosition = rulerRect.left - experimentRect.left + (rulerRect.width / 2) - 30;
        
        lengthDisplay.style.top = topPosition + 'px';
        lengthDisplay.style.left = leftPosition + 'px';
        
        document.querySelector('.experiment-area').appendChild(lengthDisplay);
    }
    
    removeLengthDisplay() {
        const lengthDisplay = document.getElementById('tube-length-display');
        lengthDisplay && lengthDisplay.remove();
    }
    
    initCorkDrag() {
        const cork = document.getElementById('dragCork');
        const tube = document.getElementById('dragTube');
        
        this.setupDragAndDrop(cork, (cork, e) => {
            return this.currentStep === 3 && this.tubeInHot && !this.tubeCorked;
        }, (cork) => {
            if (this.currentStep === 3) {
                const corkRect = cork.getBoundingClientRect();
                const tubeRect = tube.getBoundingClientRect();
                
                const corkZone = document.querySelector('.cork-zone');
                if (corkZone) corkZone.remove();
                
                this.isNearTubeEnd(corkRect, tubeRect) && this.addCorkZoneToTube(tube);
            }
        }, (cork) => {
            if (this.currentStep === 3) {
                const corkRect = cork.getBoundingClientRect();
                const tubeRect = tube.getBoundingClientRect();
                
                if (this.isNearTubeEnd(corkRect, tubeRect)) {
                    this.attachCorkToTube(cork, tube);
                } else {
                    cork.style.left = '150px';
                    cork.style.top = '150px';
                }
                
                const corkZone = document.querySelector('.cork-zone');
                corkZone && corkZone.remove();
            }
        });
    }
    
    initThermometerDrag() {
        const thermometer = document.getElementById('thermometer');
        const hotContainer = document.getElementById('hotContainer');
        const coldContainer = document.getElementById('coldContainer');
        
        this.setupDragAndDrop(thermometer, (therm, e) => {
            return this.currentStep === 2;
        }, (thermometer) => {
            const thermRect = thermometer.getBoundingClientRect();
            const hotRect = hotContainer.getBoundingClientRect();
            const coldRect = coldContainer.getBoundingClientRect();
            
            document.querySelectorAll('.thermometer-zone').forEach(zone => zone.remove());
            
            if (this.isColliding(thermRect, hotRect) && this.currentStep === 2) {
                this.addThermometerZone(hotContainer, 'hot');
                this.updateThermometerReading(this.T1_celsius);
                this.thermometerInWater = true;
            } else {
                this.updateThermometerReading(20);
                this.thermometerInWater = false;
            }
        }, (thermometer) => {
            document.querySelectorAll('.thermometer-zone').forEach(zone => zone.remove());
        });
    }
    
    addThermometerZone(container, type) {
        const zone = document.createElement('div');
        zone.className = 'thermometer-zone highlight';
        container.appendChild(zone);
    }
    
    updateThermometerReading(temperature) {
        this.currentTemperature = temperature;
        const mercury = document.querySelector('.thermometer-tube .thermometer-mercury');
        
        if (mercury) {
            const fillPercent = Math.max(5, Math.min(95, (temperature / 100) * 90 + 5)) + 5 + '%';
            mercury.style.height = fillPercent;
        }
    }
    
        setupDragAndDrop(element, canDragCheck, onDragMove, onDrop) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        let startX = 0;
        let startY = 0;
        
        element.addEventListener('mousedown', (e) => {
            if (!canDragCheck(element, e)) return;
            
            isDragging = true;
            element.classList.add('dragging');
            
            if (element.id === 'ruler') {
                startX = e.clientX;
                startY = e.clientY;
                const currentLeft = parseInt(window.getComputedStyle(element).left) || 0;
                const currentTop = parseInt(window.getComputedStyle(element).top) || 0;
                offsetX = currentLeft;
                offsetY = currentTop;
            } else {
                const elementRect = element.getBoundingClientRect();
                offsetX = e.clientX - elementRect.left;
                offsetY = e.clientY - elementRect.top;
            }
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const experimentArea = document.querySelector('.experiment-area');
            
            if (element.id === 'ruler') {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                const newX = offsetX + deltaX;
                const newY = offsetY + deltaY;
                
                element.style.left = newX + 'px';
                element.style.top = newY + 'px';
            } else {
                const experimentRect = experimentArea.getBoundingClientRect();
                const newX = e.clientX - experimentRect.left - offsetX;
                const newY = e.clientY - experimentRect.top - offsetY;
                const maxX = experimentRect.width - element.offsetWidth;
                const maxY = experimentRect.height - element.offsetHeight;
                const boundedX = Math.max(0, Math.min(newX, maxX));
                const boundedY = Math.max(0, Math.min(newY, maxY));
                
                element.style.left = boundedX + 'px';
                element.style.top = boundedY + 'px';
            }
            
            if (onDragMove) onDragMove(element);
        });
        
        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            
            isDragging = false;
            element.classList.remove('dragging');
            
            if (onDrop) onDrop(element);
        });
    }
    
    isColliding(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }
    
    isNearTubeEnd(corkRect, tubeRect) {
        const distance = Math.sqrt(
            Math.pow(corkRect.left + corkRect.width/2 - (tubeRect.left + tubeRect.width/2), 2) +
            Math.pow(corkRect.top + corkRect.height/2 - (tubeRect.top + 20), 2)
        );
        return distance < 50;
    }
    
    addCorkZoneToTube(tube) {
        const corkZone = document.createElement('div');
        corkZone.className = 'cork-zone highlight';
        tube.appendChild(corkZone);
    }
    
    attachCorkToTube(cork, tube) {
        cork.style.display = 'none';
        
        const attachedCork = document.createElement('div');
        attachedCork.className = 'cork-on-tube';
        attachedCork.id = 'attachedCork';
        
        const corkBody = document.createElement('div');
        corkBody.className = 'cork-body';
        attachedCork.appendChild(corkBody);
        
        attachedCork.style.position = 'absolute';
        attachedCork.style.bottom = '0px';
        attachedCork.style.left = '2px';
        attachedCork.style.width = '36px';
        attachedCork.style.height = '30px';
        attachedCork.style.zIndex = '10';
        
        const openEnd = tube.querySelector('.open-end');
        openEnd.appendChild(attachedCork);
        
        this.tubeCorked = true;
        this.nextStep();
    }
    
    resetTubePosition(tube) {
        if (!tube.classList.contains('tube-in-container')) {
            tube.style.left = '80px';
            tube.style.top = '120px';
        }
    }
    
    placeTubeInHot(tube) {
        const hotContainer = document.getElementById('hotContainer');
        const experimentArea = document.querySelector('.experiment-area');
        const containerRect = hotContainer.getBoundingClientRect();
        const experimentRect = experimentArea.getBoundingClientRect();
        const relativeX = containerRect.left - experimentRect.left + 63;
        const relativeY = containerRect.top - experimentRect.top - 10;
        
        tube.style.left = relativeX + 'px';
        tube.style.top = relativeY + 'px';
        tube.classList.add('tube-in-container', 'tube-in-hot');
        this.tubeInHot = true;
        this.nextStep();
    }
    
    placeTubeInColdUpper(tube) {
        const coldContainer = document.getElementById('coldContainer');
        const experimentArea = document.querySelector('.experiment-area');
        const containerRect = coldContainer.getBoundingClientRect();
        const experimentRect = experimentArea.getBoundingClientRect();
        const relativeX = containerRect.left - experimentRect.left + 63;
        const relativeY = containerRect.top - experimentRect.top - 40;
        
        tube.style.left = relativeX + 'px';
        tube.style.top = relativeY + 'px';
        tube.classList.remove('tube-in-hot');
        tube.classList.add('tube-in-cold', 'tube-in-upper');
        tube.style.transform = 'rotate(180deg)';
        this.simulateWaterEntryUpper();
        this.tubeInCold = true;
        this.tubeInUpperPosition = true;
        this.nextStep();
    }

    placeTubeInColdLower(tube) {
        const coldContainer = document.getElementById('coldContainer');
        const experimentArea = document.querySelector('.experiment-area');
        const containerRect = coldContainer.getBoundingClientRect();
        const experimentRect = experimentArea.getBoundingClientRect();
        const relativeX = containerRect.left - experimentRect.left + 63;
        const relativeY = containerRect.top - experimentRect.top - 10;
        
        tube.style.left = relativeX + 'px';
        tube.style.top = relativeY + 'px';
        tube.classList.remove('tube-in-upper');
        tube.classList.add('tube-in-lower');
        this.simulateWaterLevelEqualization();
        this.tubeInLowerPosition = true;
        this.nextStep();
    }
    
    simulateWaterEntryUpper() {
        setTimeout(() => {
            const attachedCork = document.getElementById('attachedCork');
            if (attachedCork) {
                attachedCork.classList.add('cork-ready-to-remove');
            }
        }, 1000);
    }

    simulateWaterLevelEqualization() {
        const airSpace = document.getElementById('airSpace');
        const waterInTube = document.querySelector('.water-in-tube');
        
        if (waterInTube && airSpace) {
            waterInTube.style.height = '135px';
            waterInTube.style.bottom = '0px';
            airSpace.style.height = '160px';
            airSpace.style.bottom = '20px';
            airSpace.style.top = 'auto';
        }
    }
    
    removeCorkFromTube() {
        const tube = document.getElementById('dragTube');
        const attachedCork = document.getElementById('attachedCork');
    
        attachedCork && attachedCork.remove();
        this.corkRemoved = true;
        
        const resultDiv = document.getElementById('corkRemovalResult');
        resultDiv.className = 'validation-result correct';
        resultDiv.textContent = 'Пробка успешно извлечена! Вода поступила в трубку.';
        
        setTimeout(() => {
            document.getElementById('corkRemovalStep').style.display = 'none';
            this.nextStep();
        }, 1500);
    
        const airSpace = document.getElementById('airSpace');
        const newHeight = 60;
        const waterHeight = 120;
    
        const existingWater = document.querySelector('.water-in-tube');
        existingWater && existingWater.remove();
    
        tube.classList.remove('tube-ready-to-uncork');
        tube.classList.add('tube-movable');
        
        airSpace.style.height = newHeight + 'px';
        airSpace.style.top = 'auto';
        airSpace.style.bottom = waterHeight + 'px';
        airSpace.style.transform = 'rotate(180deg)';
        airSpace.style.borderRadius = '0';
        
        const waterInTube = document.createElement('div');
        waterInTube.className = 'water-in-tube';
        waterInTube.style.position = 'absolute';
        waterInTube.style.top = 'auto'; 
        waterInTube.style.bottom = '0';
        waterInTube.style.left = '2px';
        waterInTube.style.right = '2px';
        waterInTube.style.height = waterHeight + 'px';
        waterInTube.style.background = 'linear-gradient(to bottom, #7fdbda, #4ecdc4)';
        waterInTube.style.borderRadius = '0 0 8px 8px';
        waterInTube.style.transition = 'height 0.5s ease';
        waterInTube.style.zIndex = '5';
        
        document.querySelector('.tube-body').appendChild(waterInTube);
    }
    
    nextStep() {
        document.getElementById(`step-${this.currentStep}`).classList.add('completed');
        document.getElementById(`step-${this.currentStep}`).classList.remove('active');
        
        this.currentStep++;
        
        if (this.currentStep <= 7) {
            document.getElementById(`step-${this.currentStep}`).classList.add('active');
            this.updateInstructions();
        }

        switch (this.currentStep) {
            case 2:
                document.getElementById('measurementPanel').style.display = 'block';
                document.getElementById('tempMeasurement').style.display = 'block';
                break;
            case 3:
                document.getElementById('dragCork').style.display = 'block';
                break;
            case 5:
                document.getElementById('corkRemovalStep').style.display = 'block';
                break;
            case 7:
                document.getElementById('measurementPanel').style.display = 'block';
                document.getElementById('ratioCalc').style.display = 'block';
                break;
        }
    }
    
    updateInstructions() {
        const text = document.getElementById('current-instruction');
        
        const baseInstructions = [
            "Перетащите стеклянную трубку к сосуду с горячей водой запаянным концом вниз",
            "Опустите термометр в горячую воду для измерения температуры",
            "Перетащите пробку к открытому концу трубки, чтобы заткнуть её",
            "Перенесите закрытую трубку в сосуд с холодной водой открытым концом вниз (верхнее положение)",
            "Сделайте двойной клик по пробке, чтобы вынуть её из трубки под водой",
            "Перетащите трубку вниз, чтобы уровни воды в трубке и сосуде сравнялись",
            "Вычислите отношения l₁/l₂ и T₁/T₂ для проверки закона Бойля-Мариотта"
        ];

        if (this.currentStep === 2) {
            const tempPanel = document.getElementById('tempMeasurement');
            if (tempPanel && tempPanel.style.display !== 'none') {
                text.textContent = "Опустите термометр в горячую воду и измерьте температуру T₁";
                return;
            }
        } else if (this.currentStep === 7) {
            const ratioPanel = document.getElementById('ratioCalc');
            if (ratioPanel && ratioPanel.style.display !== 'none') {
                text.textContent = "Вычислите отношения l₁/l₂ и T₁/T₂";
                return;
            }
        } else if (this.currentStep === 5) {
            const corkPanel = document.getElementById('corkRemovalStep');
            if (corkPanel && corkPanel.style.display !== 'none') {
                text.textContent = "Сделайте двойной клик по пробке, чтобы вынуть её из трубки под водой";
                return;
            }
        }
        
        if (baseInstructions[this.currentStep - 1]) {
            text.textContent = baseInstructions[this.currentStep - 1];
        }
    }
}

function validateTemperature(tempNum) {
    const experiment = window.gasExperiment;
    const userInput = parseFloat(document.getElementById('userT1').value);
    const expected = experiment.T1_celsius;
    const tolerance = 2;
    const resultDiv = document.getElementById('t1Result');
    
    if (Math.abs(userInput - expected) <= tolerance) {
        resultDiv.className = 'validation-result correct';
        resultDiv.textContent = 'Правильно! Температура измерена верно.';
        experiment.measurements.T1 = userInput;
        
        setTimeout(() => {
            document.getElementById('tempMeasurement').style.display = 'none';
            document.getElementById('measurementPanel').style.display = 'none';
            experiment.nextStep();
        }, 1500);
    } else {
        resultDiv.className = 'validation-result incorrect';
        resultDiv.textContent = `Неверно. Проверьте показания термометра.`;
    }
}

function validateRatios() {
    const experiment = window.gasExperiment;
    const userLengthRatio = parseFloat(document.getElementById('userLengthRatio').value);
    const userTempRatio = parseFloat(document.getElementById('userTempRatio').value);
    
    const T1_K = experiment.T1_celsius;
    const T2_K = experiment.T2_celsius;
    
    const l1 = 18.0;
    const l2 = 4.5; 
    
    const expectedLengthRatio = l1 / l2;
    const expectedTempRatio = T1_K / T2_K;
    
    const tolerance = 0.05;
    const resultDiv = document.getElementById('ratioResult');
    
    const lengthCorrect = Math.abs(userLengthRatio - expectedLengthRatio) <= tolerance;
    const tempCorrect = Math.abs(userTempRatio - expectedTempRatio) <= tolerance;
    
    if (lengthCorrect && tempCorrect) {
        resultDiv.className = 'validation-result correct';
        resultDiv.textContent = `Отлично! Отношения вычислены правильно. l₁/l₂ ≈ ${expectedLengthRatio.toFixed(3)}, T₁/T₂ ≈ ${expectedTempRatio.toFixed(2)}`;
        
        setTimeout(() => {
            document.getElementById('measurementPanel').style.display = 'none';
            document.getElementById('ratioCalc').style.display = 'none';
            document.getElementById('current-instruction').textContent = 
                'Эксперимент завершен! Закон Бойля-Мариотта подтвержден экспериментально.';
        }, 1500);
    } else {
        resultDiv.className = 'validation-result incorrect';
        let message = 'Ошибки в вычислениях. ';
        if (!lengthCorrect) message += `Проверьте отношение длин l₁/l₂ (ожидается ${expectedLengthRatio.toFixed(3)}). `;
        if (!tempCorrect) message += `Проверьте отношение температур T₁/T₂ (ожидается ${expectedTempRatio.toFixed(2)}).`;
        resultDiv.textContent = message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gasExperiment = new InteractiveGasExperiment();

    const tabsContent = intro.createTabContent([
      'status-panel',
      'theory-panel',
    ], 'tabs-container');
      
    const tabButtons = tabsContent.querySelectorAll('.info-content-buttons button');
    tabButtons[0].textContent = 'Порядок';
    tabButtons[1].textContent = 'Формулы';
    
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
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = window.location.origin;
    });
    document.getElementById('reset-btn').addEventListener('click', () => {
        window.location.reload();
    });

    window.validateTemperature = validateTemperature;
    window.validateRatios = validateRatios;
});