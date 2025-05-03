const experimentFunctions = {
    experimentState: {
        step: 1,
        iceReady: false,
        waterInCylinder: false,
        waterInCalorimeter: false,
        measurementDone: false,
        calculationDone: false,
        thermometerInCalorimeter: false,
        
        initialWaterTemp: 50,
        roomTemp: 20,
        currentTemp: 50,
        visualTemp: 50,
        initialVolume: 150,
        finalVolume: 0,
        meltedIceCount: 0,
        
        SPECIFIC_HEAT: 4200
    },
    
    setupPhysicsObjects() {
        physjs.detachAll();
    
        const objects = [
            { selector: '#ice-container', type: 'ice-container' },
            { selector: '#cylinder', type: 'cylinder' },
            { selector: '#calorimeter', type: 'calorimeter' },
            { selector: '#thermometer', type: 'thermometer' },
        ];
    
        objects.forEach(obj => {
            const element = document.querySelector(obj.selector);
            if (!element) return;
            if (!physjs.getObject(obj.selector)) physjs.createObject(obj.selector);
        });
    
        for (let i = 1; i <= 6; i++) {
            const selector = `#ice${i}`;
            const element = document.querySelector(selector);
            if (!element) continue;
            if (!physjs.getObject(selector)) physjs.createObject(selector);
        }
    
        physjs.addAttachmentPoint('#calorimeter', 'thermometer-attachment', 50, -110, ['thermometer']);
    },
    
    forceSetStep(stepNumber) {
        stepNumber = Number(stepNumber);
    
        const currentStep = this.experimentState.step;
        if (stepNumber === currentStep) return;
        if (stepNumber < currentStep && currentStep > 1) return;
        
        this.experimentState.step = stepNumber;
        
        const instructions = [
            "Дважды кликните на форму для льда чтобы создать новые кубики.",
            "Налейте в измерительный цилиндр теплую воду (150 мл) и измерьте её температуру.",
            "Перелейте теплую воду во внутренний стакан калориметра и прикрепите к нему термометр.",
            "Добавляйте кусочки льда в калориметр пока вода не остынет до комнатной температуры.",
            "Перелейте воду из калориметра в измерительный цилиндр."
        ];
    
        const instructionElement = document.getElementById('current-instruction');
        if (instructionElement && stepNumber <= instructions.length)
            instructionElement.textContent = instructions[stepNumber - 1];
        
        const stepList = document.querySelectorAll('#status-panel ol li');
        if (stepList && stepList.length > 0) {
            stepList.forEach((li, index) => {
                li.classList.remove('active', 'completed');
                if (index + 1 === stepNumber) li.classList.add('active');
                if (index + 1 < stepNumber) li.classList.add('completed');
            });
        }
    
        switch(stepNumber) {
            case 2:
                this.experimentState.iceReady = true;
                break;
                
            case 3:
                this.experimentState.waterInCylinder = true;
                break;
                
            case 4:
                this.experimentState.waterInCylinder = false;
                this.experimentState.waterInCalorimeter = true;
                this.experimentState.thermometerInCalorimeter = false;
                break;
        }
        
        if (!this._isInStepChangeHandler) {
            this._isInStepChangeHandler = true;
            physjs.goToStep(`step${stepNumber}`);
            this._isInStepChangeHandler = false;
        }        
    },
    
    updateWaterLevel(selector, height) {
        const waterLevel = document.querySelector(selector);
        if (!waterLevel) return;
        
        waterLevel.style.height = height <= 0 ? '0' : `${height}px`;
    },
    
    updateThermometer(temperature) {
        const thermometerMercury = document.querySelector('.thermometer-mercury');
        const mercuryHeight = temperature * 1.95;
        if (thermometerMercury) thermometerMercury.style.height = `${mercuryHeight}px`;
    },
    
    addIceToCalorimeter(iceElement) {
        const isAttached = physjs.isAttached('#thermometer', '#calorimeter');
        if (!isAttached) return false;

        if (!this.experimentState.waterInCalorimeter || this.experimentState.step !== 4) return false;
        
        iceElement.classList.add('melting');
        this.experimentState.meltedIceCount++;
        
        const visualTempDrop = (this.experimentState.initialWaterTemp - this.experimentState.roomTemp) / 5;
        const tempDrop = (this.experimentState.initialWaterTemp - this.experimentState.roomTemp) / 4;
        this.experimentState.currentTemp -= tempDrop;
        this.experimentState.visualTemp -= visualTempDrop;
        
        if (this.experimentState.currentTemp < this.experimentState.roomTemp)
            this.experimentState.currentTemp = this.experimentState.roomTemp;

        const waterInCalorimeter = document.querySelector('#calorimeter-inner .water-in-calorimeter');
        if (waterInCalorimeter) {
            const currentHeight = parseInt(waterInCalorimeter.style.height) || 95;
            const newHeight = currentHeight + 8;
            waterInCalorimeter.style.height = `${newHeight}px`;
        }
        
        this.updateThermometer(this.experimentState.visualTemp);
        
        setTimeout(() => {
            iceElement.style.opacity = '0';
            setTimeout(() => {
                iceElement.remove();
                
                if (this.experimentState.currentTemp <= this.experimentState.roomTemp) {
                    setTimeout(() => {
                        this.forceSetStep(5);
                    }, 1000);
                }
            }, 500);
        }, 1500);
        
        return true;
    },
    
    createSpecificHeatCalculator() {
        if (document.getElementById('specific-heat-input-container')) return;
        
        const resultsTable = document.querySelector('.results-table') || document.getElementById('results');
        const specificHeatInputContainer = document.createElement('div');
        specificHeatInputContainer.id = 'specific-heat-input-container';
        specificHeatInputContainer.classList.add('density-calculator');
        specificHeatInputContainer.style.display = 'block';

        specificHeatInputContainer.innerHTML = `
            <h3>Расчет удельной теплоты плавления льда</h3>
            <div class="input-group">
                <label for="specific-heat-input">Введите рассчитанную удельную теплоту плавления льда (кДж/кг):</label>
                <input type="text" id="specific-heat-input" placeholder="Пример: 330">
                <button id="check-specific-heat-btn" class="btn btn-primary">Проверить</button>
            </div>
            <div id="specific-heat-result" class="feedback"></div>
        `;

        if (resultsTable && resultsTable.parentNode) {
            resultsTable.parentNode.insertBefore(specificHeatInputContainer, resultsTable.nextSibling);
        } else {
            const experimentArea = document.getElementById('experiment-area');
            experimentArea ? experimentArea.appendChild(specificHeatInputContainer) : document.body.appendChild(specificHeatInputContainer);
        }

        const checkSpecificHeatBtn = document.getElementById('check-specific-heat-btn');
        checkSpecificHeatBtn && checkSpecificHeatBtn.addEventListener('click', () => this.checkSpecificHeatCalculation());
    },

    checkSpecificHeatCalculation() {
        const specificHeatInput = document.getElementById('specific-heat-input');
        const specificHeatResult = document.getElementById('specific-heat-result');

        if (!specificHeatInput || !specificHeatResult) return;

        const userAnswer = parseFloat(specificHeatInput.value);
        const correctAnswer = 330;
        const tolerance = 10;

        if (isNaN(userAnswer)) {
            specificHeatResult.innerHTML = 'Пожалуйста, введите числовое значение.';
            specificHeatResult.className = 'feedback error';
            return;
        }

        const percentDiff = Math.abs((userAnswer - correctAnswer) / correctAnswer * 100);
        console.log(correctAnswer);

        if (percentDiff <= tolerance) {
            specificHeatResult.innerHTML = `Правильно! Удельная теплота плавления льда: ${userAnswer.toFixed(1)} кДж/кг`;
            specificHeatResult.className = 'feedback success';

            document.getElementById('specific-heat').textContent = userAnswer.toFixed(1);

            this.experimentState.calculationDone = true;
            this.forceSetStep(6);

            specificHeatInput.disabled = true;
            document.getElementById('check-specific-heat-btn').disabled = true;
        } else {
            specificHeatResult.innerHTML = 'Неправильно. Проверьте ваши расчеты и попробуйте снова.';
            specificHeatResult.className = 'feedback error';
        }
    },

    measureFinalVolume() {
        if (this.experimentState.step !== 5) return;

        this.experimentState.finalVolume = this.experimentState.initialVolume + 56;
        this.updateWaterLevel('#calorimeter-inner .water-in-calorimeter', 0);

        setTimeout(() => {
            this.updateWaterLevel('#cylinder .water-level', 186);
            document.getElementById('final-volume').textContent = this.experimentState.finalVolume.toFixed(1);
            const deltaVolume = this.experimentState.finalVolume - this.experimentState.initialVolume;
            document.getElementById('volume-change').textContent = deltaVolume.toFixed(1);
            document.getElementById('ice-mass').textContent = deltaVolume.toFixed(1);

            this.experimentState.measurementDone = true;
            this.createSpecificHeatCalculator();
        }, 1000);
    },
    
    resetExperiment() {
        window.location.reload();
    },
        
    backToMainPage() {
        window.location.href = '../index.html';
    },
    
    initializeExperiment() {
        this.setupPhysicsObjects();
        
        document.getElementById('room-temp').textContent = this.experimentState.roomTemp.toFixed(1);

        physjs.onAttachment((source, target) => {
            if ((source.element.id === 'thermometer' && target.element.id === 'calorimeter') ||
                (source.element.id === 'calorimeter' && target.element.id === 'thermometer'))
                this.experimentState.step == 4 && this.updateThermometer(this.experimentState.currentTemp);
        });
        
        const calorimeter = document.getElementById('calorimeter');
        if (calorimeter) {
            calorimeter.addEventListener('dblclick', (event) => {
                if (this.experimentState.step == 5 && !this.experimentState.measurementDone) {
                    this.measureFinalVolume();
                    event.stopPropagation();
                }
            });
        }
        
        const step1 = physjs.createStep('step1', 'Подготовка льда');
        const step2 = physjs.createStep('step2', 'Наполнение цилиндра водой и измерение температуры', 
            ['#cylinder', '#thermometer']);
        const step3 = physjs.createStep('step3', 'Перемещение воды в калориметр');
        const step4 = physjs.createStep('step4', 'Добавление льда в калориметр', 
            ['#calorimeter', '#thermometer']);
        const step5 = physjs.createStep('step5', 'Измерение конечного объема воды');
        
        physjs.addStep(step1)
              .addStep(step2)
              .addStep(step3)
              .addStep(step4)
              .addStep(step5)
        
        this._isInStepChangeHandler = false;
        physjs.goToStep('step1');
    },
    
    checkIntersection(rect1, rect2) {
        return !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
        );
    },

    showIceCubes() {
        const iceCubes = document.querySelectorAll('.ice-cube');
        const iceCells = document.querySelectorAll('.ice-cell');
        const iceContainer = document.getElementById('ice-container');
    
        if (!iceCubes.length || !iceCells.length || !iceContainer) return;
    
        const containerObj = physjs.getObject('#ice-container');
        if (!containerObj) return;
    
        const containerPos = containerObj.getPosition();
        const containerRect = iceContainer.getBoundingClientRect();
        const cellWidth = containerRect.width / 3;
        const cellHeight = containerRect.height / 2;
        
        const cellPositions = [
            { x: 0, y: 0 },
            { x: cellWidth - 3, y: 0 },
            { x: cellWidth * 2 - 6, y: 0 },

            { x: 0, y: cellHeight - 5},
            { x: cellWidth - 3, y: cellHeight - 5},
            { x: cellWidth * 2 - 6, y: cellHeight- 5 }
        ];
    
        iceCubes.forEach((cube, index) => {
            if (index < cellPositions.length) {
                cube.style.display = 'block';
                
                const cellPos = cellPositions[index];
                const cubeX = containerPos.x + cellPos.x;
                const cubeY = containerPos.y + cellPos.y;
                
                const cubeObj = physjs.getObject(`#ice${index+1}`);
                cubeObj && cubeObj.setPosition(cubeX, cubeY);
            }
        });

        document.getElementById('ice-container').classList.remove('selected');
    },
    
    checkThermometerPosition() {
        const state = this.experimentState;
        const thermometer = document.getElementById('thermometer');
        if (!thermometer) return;
        
        const thermRect = thermometer.getBoundingClientRect();
        
        if (state.step == 2 && state.waterInCylinder) {
            const waterInCylinder = document.querySelector('#cylinder .water-level');
            if (waterInCylinder) {
                const waterRect = waterInCylinder.getBoundingClientRect();
                
                if (this.checkIntersection(thermRect, waterRect)) {
                    this.updateThermometer(state.initialWaterTemp);
                    document.getElementById('initial-temp').textContent = this.experimentState.initialWaterTemp.toFixed(1);
                    
                    setTimeout(() => {
                        this.forceSetStep(3);
                    }, 1500);
                }
            }
        } else if (state.step == 4) {
            const calorimeter = document.getElementById('calorimeter');
            if (calorimeter) {
                const calorimeterRect = calorimeter.getBoundingClientRect();
                const isAttached = physjs.isAttached('#thermometer', '#calorimeter');
                
                if (!isAttached && this.checkIntersection(thermRect, calorimeterRect)) {
                    const thermometerObj = physjs.getObject('#thermometer');
                    const calorimeterObj = physjs.getObject('#calorimeter');
                    
                    if (thermometerObj && calorimeterObj) {
                        calorimeterObj.attach(thermometerObj);
                        this.updateThermometer(state.currentTemp);
                    }
                } else if (!isAttached) {
                    this.updateThermometer(state.currentTemp);
                    
                    if (state.currentTemp <= state.roomTemp && state.meltedIceCount > 0) {
                        setTimeout(() => {
                            this.forceSetStep(5);
                        }, 1500);
                    }
                }
            }
        }
    },
    
    setupIceCubeDragging() {
        const iceCubes = document.querySelectorAll('.ice-cube');
        
        iceCubes.forEach((cube, index) => {
            cube.style.cursor = 'move';
            cube.setAttribute('data-ice-id', `ice-${index}`);
            
            cube.addEventListener('mouseup', () => {
                if (this.experimentState.step === 4) {
                    const calorimeter = document.getElementById('calorimeter');
                    if (calorimeter) {
                        const cubeRect = cube.getBoundingClientRect();
                        const calorimeterRect = calorimeter.getBoundingClientRect();
                        
                        if (this.checkIntersection(cubeRect, calorimeterRect)) {
                            const isAttached = physjs.isAttached('#thermometer', '#calorimeter');
                            if (!isAttached) return;
                            
                            this.addIceToCalorimeter(cube);
                        }
                    }
                }
            });
        });
    }
};

export default experimentFunctions;