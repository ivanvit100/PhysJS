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
        
        this.initializeDragAndDrop();
        this.calculateDeltaL();
        this.updateInstructions();
        this.initCorkDoubleClick();
        this.updateThermometerReading(20);
    }
    
    calculateDeltaL() {
        const T1_K = this.T1_celsius + 273.15;
        const T2_K = this.T2_celsius + 273.15;
        const compressionRatio = T2_K / T1_K;
        this.deltaL = this.tubeLength * (1 - compressionRatio) * 0.6;
        this.deltaL = Math.max(0.01, Math.min(0.15, this.deltaL));
    }
    
    initCorkDoubleClick() {
        const cork = document.getElementById('dragCork');
        
        cork.addEventListener('dblclick', (e) => {
            if (this.currentStep === 5 && this.tubeInCold && this.tubeCorked) {
                this.removeCorkFromTube();
                e.preventDefault();
                e.stopPropagation();
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
            if (this.currentStep === 1 || this.currentStep === 4) return true;
            if (this.currentStep === 6 && this.corkRemoved) return true;
            return false;
        }, (tube) => {
            const tubeRect = tube.getBoundingClientRect();
            const hotRect = hotZone.getBoundingClientRect();
            const coldRect = coldZone.getBoundingClientRect();
            
            hotZone.classList.remove('highlight');
            coldZone.classList.remove('highlight');
            
            if (this.isColliding(tubeRect, hotRect) && this.currentStep === 1) {
                hotZone.classList.add('highlight');
            }
            
            if (this.isColliding(tubeRect, coldRect) && this.currentStep === 4) {
                coldZone.classList.add('highlight');
            }
        }, (tube) => {
            const tubeRect = tube.getBoundingClientRect();
            const hotRect = hotZone.getBoundingClientRect();
            const coldRect = coldZone.getBoundingClientRect();
            
            if (this.currentStep === 1 && this.isColliding(tubeRect, hotRect)) {
                this.placeTubeInHot(tube);
            } else if (this.currentStep === 4 && this.isColliding(tubeRect, coldRect) && this.tubeCorked) {
                this.placeTubeInCold(tube);
            } else {
                this.resetTubePosition(tube);
            }
            
            hotZone.classList.remove('highlight');
            coldZone.classList.remove('highlight');
        });
    }
    
    initCorkDrag() {
        const cork = document.getElementById('dragCork');
        const tube = document.getElementById('dragTube');
        
        this.setupDragAndDrop(cork, (cork, e) => {
            return this.currentStep === 3 && this.tubeInHot;
        }, (cork) => {
            if (this.currentStep === 3) {
                const corkRect = cork.getBoundingClientRect();
                const tubeRect = tube.getBoundingClientRect();
                
                const corkZone = document.querySelector('.cork-zone');
                if (corkZone) corkZone.remove();
                
                if (this.isNearTubeEnd(corkRect, tubeRect)) {
                    this.addCorkZoneToTube(tube);
                }
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
                if (corkZone) corkZone.remove();
            }
        });
    }
    
    initThermometerDrag() {
        const thermometer = document.getElementById('dragThermometer');
        const hotContainer = document.getElementById('hotContainer');
        const coldContainer = document.getElementById('coldContainer');
        
        this.setupDragAndDrop(thermometer, (therm, e) => {
            return this.currentStep === 2 || this.currentStep === 6;
        }, (thermometer) => {
            const thermRect = thermometer.getBoundingClientRect();
            const hotRect = hotContainer.getBoundingClientRect();
            const coldRect = coldContainer.getBoundingClientRect();
            
            document.querySelectorAll('.thermometer-zone').forEach(zone => zone.remove());
            
            if (this.isColliding(thermRect, hotRect) && this.currentStep === 2) {
                this.addThermometerZone(hotContainer, 'hot');
                this.updateThermometerReading(this.T1_celsius);
            } else if (this.isColliding(thermRect, coldRect) && this.currentStep === 6) {
                this.addThermometerZone(coldContainer, 'cold');
                this.updateThermometerReading(this.T2_celsius);
            } else {
                this.updateThermometerReading(20);
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
        const mercuryFill = document.getElementById('mercuryFill');
        
        const fillPercent = Math.max(0, Math.min(100, (temperature / 100) * 100)) * 0.8 + 0.2;
        mercuryFill.style.height = fillPercent + '%';
    }
    
    setupDragAndDrop(element, canDragCheck, onDragMove, onDrop) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        element.addEventListener('mousedown', (e) => {
            if (!canDragCheck(element, e)) return;
            
            isDragging = true;
            element.classList.add('dragging');
            
            const elementRect = element.getBoundingClientRect();
            offsetX = e.clientX - elementRect.left;
            offsetY = e.clientY - elementRect.top;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const containerRect = element.offsetParent.getBoundingClientRect();
            const newX = e.clientX - containerRect.left - offsetX;
            const newY = e.clientY - containerRect.top - offsetY;
            
            const maxX = containerRect.width - element.offsetWidth;
            const maxY = containerRect.height - element.offsetHeight;
            
            const boundedX = Math.max(0, Math.min(newX, maxX));
            const boundedY = Math.max(0, Math.min(newY, maxY));
            
            element.style.left = boundedX + 'px';
            element.style.top = boundedY + 'px';
            
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
        cork.classList.add('cork-on-tube');
        tube.appendChild(cork);
        
        this.tubeCorked = true;
        this.nextStep();
    }
    
    resetTubePosition(tube) {
        if (!tube.classList.contains('tube-in-container')) {
            tube.style.left = '50px';
            tube.style.top = '50px';
        }
    }
    
    placeTubeInHot(tube) {
        const hotContainer = document.getElementById('hotContainer');
        const experimentArea = document.querySelector('.experiment-area');
        
        const containerRect = hotContainer.getBoundingClientRect();
        const experimentRect = experimentArea.getBoundingClientRect();
        
        const relativeX = containerRect.left - experimentRect.left + 20;
        const relativeY = containerRect.top - experimentRect.top + 30;
        
        tube.style.left = relativeX + 'px';
        tube.style.top = relativeY + 'px';
        tube.classList.add('tube-in-container', 'tube-in-hot');
        
        this.tubeInHot = true;
        this.nextStep();
    }
    
    placeTubeInCold(tube) {
        const coldContainer = document.getElementById('coldContainer');
        const experimentArea = document.querySelector('.experiment-area');
        
        const containerRect = coldContainer.getBoundingClientRect();
        const experimentRect = experimentArea.getBoundingClientRect();
        
        const relativeX = containerRect.left - experimentRect.left + 20;
        const relativeY = containerRect.top - experimentRect.top + 30;
        
        tube.style.left = relativeX + 'px';
        tube.style.top = relativeY + 'px';
        tube.classList.remove('tube-in-hot');
        tube.classList.add('tube-in-cold');
        tube.style.transform = 'rotate(180deg)';
        
        this.simulateWaterEntry();
        this.tubeInCold = true;
        this.nextStep();
    }
    
    simulateWaterEntry() {
        setTimeout(() => {
            const cork = document.getElementById('dragCork');

            setTimeout(() => {
                if (cork) {
                    cork.classList.add('cork-ready-to-remove');
                }
            }, 1000);
        }, 500);
    }
    
    removeCorkFromTube() {
        const cork = document.getElementById('dragCork');
        const tube = document.getElementById('dragTube');

        cork.remove();
        
        tube.classList.remove('tube-ready-to-uncork');
        tube.classList.add('tube-movable');
        tube.style.transform = 'rotate(0deg)';
        
        this.corkRemoved = true;
        
        const resultDiv = document.getElementById('corkRemovalResult');
        resultDiv.className = 'validation-result correct';
        resultDiv.textContent = 'Пробка успешно извлечена! Вода поступила в трубку.';
        
        setTimeout(() => {
            document.getElementById('corkRemovalStep').style.display = 'none';
            this.nextStep();
        }, 1500);

        const airSpace = document.getElementById('airSpace');
        const newHeight = 180 * (1 - this.deltaL / this.tubeLength);

        airSpace.style.height = newHeight + 'px';
            
        const existingWater = document.querySelector('.water-in-tube');
        if (existingWater) {
            existingWater.remove();
        }

        const waterInTube = document.createElement('div');
        waterInTube.className = 'water-in-tube';
        waterInTube.style.position = 'absolute';
        waterInTube.style.bottom = '5px';
        waterInTube.style.left = '2px';
        waterInTube.style.right = '2px';
        waterInTube.style.height = (180 - newHeight) + 'px';
        waterInTube.style.background = 'linear-gradient(to top, #4ecdc4, #7fdbda)';
        waterInTube.style.borderRadius = '0 0 8px 8px';
        waterInTube.style.transition = 'height 0.5s ease';
        
        document.querySelector('.tube-body').appendChild(waterInTube);
    }
    
    nextStep() {
        document.getElementById(`step-${this.currentStep}`).classList.add('completed');
        document.getElementById(`step-${this.currentStep}`).classList.remove('active');
        
        this.currentStep++;
        
        if (this.currentStep <= 6) {
            document.getElementById(`step-${this.currentStep}`).classList.add('active');
            this.updateInstructions();
        }
        
        if (this.currentStep === 2) {
            document.getElementById('measurementPanel').style.display = 'block';
            document.getElementById('tempMeasurement').style.display = 'block';
        } else if (this.currentStep === 3) {
            document.getElementById('dragCork').style.display = 'block';
        } else if (this.currentStep === 5) {
            document.getElementById('corkRemovalStep').style.display = 'block';
        } else if (this.currentStep === 6) {
            document.getElementById('tubeLengthMeasurement').style.display = 'block';
        }
    }
    
    updateInstructions() {
        const title = document.getElementById('instruction-title');
        const text = document.getElementById('instruction-text');
        
        const instructions = {
            1: {
                title: "Шаг 1: Нагревание трубки",
                text: "Перетащите стеклянную трубку к сосуду с горячей водой запаянным концом вниз"
            },
            2: {
                title: "Шаг 2: Измерение температуры T₁",
                text: "Опустите термометр в горячую воду для измерения температуры"
            },
            3: {
                title: "Шаг 3: Закрытие трубки пробкой",
                text: "Перетащите пробку к открытому концу трубки, чтобы заткнуть её"
            },
            4: {
                title: "Шаг 4: Перенос в холодную воду",
                text: "Перенесите закрытую трубку в сосуд с холодной водой открытым концом вниз"
            },
            5: {
                title: "Шаг 5: Извлечение пробки",
                text: "Сделайте двойной клик по пробке, чтобы вынуть её под водой"
            },
            6: {
                title: "Шаг 6: Измерения и вычисления",
                text: "Измерьте длину трубки (перетащите к линейке), температуру холодной воды и высоту столба воды"
            }
        };
        
        if (instructions[this.currentStep]) {
            title.textContent = instructions[this.currentStep].title;
            text.textContent = instructions[this.currentStep].text;
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
            experiment.nextStep();
        }, 1500);
    } else {
        resultDiv.className = 'validation-result incorrect';
        resultDiv.textContent = `Неверно. Проверьте показания термометра.`;
    }
}

function validateTubeLength() {
    const experiment = window.gasExperiment;
    const userInput = parseFloat(document.getElementById('userLength').value);
    const expected = experiment.tubeLength * 100;
    const tolerance = 1;
    
    const resultDiv = document.getElementById('lengthResult');
    
    if (Math.abs(userInput - expected) <= tolerance) {
        resultDiv.className = 'validation-result correct';
        resultDiv.textContent = 'Правильно! Длина измерена верно.';
        experiment.measurements.length = userInput / 100;
        
        setTimeout(() => {
            document.getElementById('tubeLengthMeasurement').style.display = 'none';
            document.getElementById('coldTempMeasurement').style.display = 'block';
        }, 1500);
    } else {
        resultDiv.className = 'validation-result incorrect';
        resultDiv.textContent = `Неверно. Измерьте длину трубки при помощи линейки.`;
    }
}

function validateColdMeasurements() {
    const experiment = window.gasExperiment;
    const userT2 = parseFloat(document.getElementById('userT2').value);
    const userDeltaL = parseFloat(document.getElementById('userDeltaL').value);
    
    const expectedT2 = experiment.T2_celsius;
    const expectedDeltaL = experiment.deltaL * 100;
    
    const tempTolerance = 2;
    const lengthTolerance = 0.5;
    
    const resultDiv = document.getElementById('coldResult');
    
    const tempCorrect = Math.abs(userT2 - expectedT2) <= tempTolerance;
    const lengthCorrect = Math.abs(userDeltaL - expectedDeltaL) <= lengthTolerance;
    
    if (tempCorrect && lengthCorrect) {
        resultDiv.className = 'validation-result correct';
        resultDiv.textContent = 'Правильно! Все измерения выполнены верно.';
        experiment.measurements.T2 = userT2;
        experiment.measurements.deltaL = userDeltaL / 100;
        
        setTimeout(() => {
            document.getElementById('coldTempMeasurement').style.display = 'none';
            document.getElementById('pressureCalc').style.display = 'block';
        }, 1500);
    } else {
        resultDiv.className = 'validation-result incorrect';
        let message = 'Ошибки в измерениях: ';
        if (!tempCorrect) message += `Проверьте температуру термометром. `;
        if (!lengthCorrect) message += `Проверьте измерение высоты столба воды.`;
        resultDiv.textContent = message;
    }
}

function validatePressure() {
    const experiment = window.gasExperiment;
    const userP2 = parseFloat(document.getElementById('userP2').value);
    
    const expectedP2 = experiment.pressure + experiment.rho * experiment.g * experiment.measurements.deltaL;
    const tolerance = 50;
    
    const resultDiv = document.getElementById('p2Result');

    console.log(expectedP2);
    
    if (Math.abs(userP2 - expectedP2) <= tolerance) {
        resultDiv.className = 'validation-result correct';
        resultDiv.textContent = 'Правильно! Давление вычислено верно.';
        experiment.measurements.p2 = userP2;
        
        setTimeout(() => {
            document.getElementById('pressureCalc').style.display = 'none';
            document.getElementById('ratioCalc').style.display = 'block';
        }, 1500);
    } else {
        resultDiv.className = 'validation-result incorrect';
        resultDiv.textContent = `Неверно. Проверьте вычисления по формуле p₂ = p₁ + ρgh`;
    }
}

function validateRatios() {
    const experiment = window.gasExperiment;
    const userC1 = parseFloat(document.getElementById('userC1').value);
    const userC2 = parseFloat(document.getElementById('userC2').value);
    
    const T1_K = experiment.measurements.T1 + 273.15;
    const T2_K = experiment.measurements.T2 + 273.15;
    const l = experiment.measurements.length;
    const deltaL = experiment.measurements.deltaL;
    const p1 = experiment.pressure;
    const p2 = experiment.measurements.p2;
    
    const expectedC1 = (p1 * l) / T1_K;
    const expectedC2 = (p2 * (l - deltaL)) / T2_K;
    
    const tolerance = 1;
    
    const resultDiv = document.getElementById('ratioResult');
    
    const c1Correct = Math.abs(userC1 - expectedC1) <= tolerance;
    const c2Correct = Math.abs(userC2 - expectedC2) <= tolerance;

    console.log(expectedC1, expectedC2);
    
    if (c1Correct && c2Correct) {
        resultDiv.className = 'validation-result correct';
        resultDiv.textContent = 'Отлично! Все вычисления выполнены правильно.';
        
        addToResultsTable(experiment, userC1, userC2);
        
        setTimeout(() => {
            document.getElementById('resultsTable').style.display = 'block';
        }, 1500);
    } else {
        resultDiv.className = 'validation-result incorrect';
        let message = 'Ошибки в вычислениях. Проверьте формулы и подставленные значения.';
        resultDiv.textContent = message;
    }
}

function addToResultsTable(experiment, c1, c2) {
    const tbody = document.getElementById('resultsBody');
    const row = document.createElement('tr');
    
    const T1_K = experiment.measurements.T1 + 273.15;
    const T2_K = experiment.measurements.T2 + 273.15;
    
    row.innerHTML = `
        <td>1</td>
        <td>${T1_K.toFixed(2)}</td>
        <td>${experiment.measurements.length.toFixed(3)}</td>
        <td>${T2_K.toFixed(2)}</td>
        <td>${experiment.measurements.deltaL.toFixed(4)}</td>
        <td>${experiment.pressure}</td>
        <td>${experiment.measurements.p2.toFixed(0)}</td>
        <td>${c1.toFixed(4)}</td>
        <td>${c2.toFixed(4)}</td>
    `;
    
    tbody.appendChild(row);
}

document.addEventListener('DOMContentLoaded', () => {
    window.gasExperiment = new InteractiveGasExperiment();
});