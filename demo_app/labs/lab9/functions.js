const experimentFunctions = {
    experimentState: {
        step: 1,
        circuitAssembled: false,
        powerOn: false,
        isHeating: false,
        experimentComplete: false,
        
        initialTemperature: 20,
        finalTemperature: 90,
        initialVoltage: 0,
        initialCurrent: 0,
        initialResistance: 0,
        finalVoltage: 0,
        finalCurrent: 0,
        finalResistance: 0,
        tempCoefficient: 0,
        
        requiredCurrentMin: 30,
        requiredCurrentMax: 40,
        
        currentTemperature: 20,
        targetTemperatureReached: false,
        heatingInterval: null,
        
        currentVoltage: 5.0,
        voltageStep: 0.5,
        
        resistanceCalculated: false,
        wrongAttempts: 0,
        
        thermometerAttached: false,
        graphPoints: [],
        
        metals: [
            { id: 'copper', name: 'Медь', alpha: 0.0043, color: '#b8733355' },
            { id: 'aluminum', name: 'Алюминий', alpha: 0.0039, color: '#a8a8a855' },
            { id: 'iron', name: 'Железо', alpha: 0.0065, color: '#71797E55' },
            { id: 'gold', name: 'Золото', alpha: 0.004, color: '#FFD70055' },
            { id: 'tungsten', name: 'Вольфрам', alpha: 0.0041, color: '#36454F55' }
        ],
        selectedMetalIndex: 0,
        
        get currentMetal() {
            return this.metals[this.selectedMetalIndex];
        },
        
        graph: null
    },
    
    setupPhysicsObjects() {
        physjs.detachAll();
        
        const objects = [
            { selector: '#power-source', type: 'power-source' },
            { selector: '#ammeter', type: 'ammeter' },
            { selector: '#voltmeter', type: 'voltmeter' },
            { selector: '#copper-coil', type: 'coil' },
            { selector: '#thermometer', type: 'thermometer' }
        ];
        
        objects.forEach(obj => {
            const element = document.querySelector(obj.selector);
            if (!element) return;
            
            element.classList.add('phys', 'phys-draggable', 'phys-attachable');
            if (!physjs.getObject(obj.selector)) physjs.createObject(obj.selector);
            
            if (obj.type !== 'thermometer') {
                element.classList.add('phys-connectors');
                
                if (obj.type === 'power-source') element.dataset.wireColor = '#e74c3c';
                else if (obj.type === 'voltmeter') element.dataset.wireColor = '#2ecc71';
                else if (obj.type === 'ammeter') element.dataset.wireColor = '#3498db';
                else element.dataset.wireColor = '#95a5a6';
            }
        });
        
        physjs.addConnectionPoint('#power-source', 'power-positive', 80, 85);
        physjs.addConnectionPoint('#power-source', 'power-negative', 20, 85);
        
        physjs.addConnectionPoint('#ammeter', 'ammeter-input', 15, 92);
        physjs.addConnectionPoint('#ammeter', 'ammeter-output', 85, 92);
        
        physjs.addConnectionPoint('#voltmeter', 'voltmeter-positive', 15, 92);
        physjs.addConnectionPoint('#voltmeter', 'voltmeter-negative', 85, 92);
        
        physjs.addConnectionPoint('#copper-coil', 'coil-left', 25, 20);
        physjs.addConnectionPoint('#copper-coil', 'coil-right', 25, 80);
        physjs.addConnectionPoint('#copper-coil', 'coil-top', 75, 20);
        physjs.addConnectionPoint('#copper-coil', 'coil-bottom', 75, 80);
        
        physjs.addAttachmentPoint('#thermometer', 'thermometer-attachment', -20, 175, ['coil']);
    },
    
    createMetalSelector() {
        const panel = document.createElement('div');
        panel.id = 'metal-selector';
        panel.className = 'ui-panel';

        
        const header = document.createElement('div');
        header.className = 'panel-header';
        const title = document.createElement('h3');
        title.textContent = 'Выбор материала';
        header.appendChild(title);
        panel.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'panel-content';
        const formGroup = document.createElement('div');
        formGroup.className = 'input-group';
        const label = document.createElement('label');
        label.textContent = 'Выберите материал катушки:';
        label.setAttribute('for', 'metal-select');
        
        const select = document.createElement('select');
        select.id = 'metal-select';
        select.style.width = '100%';
        
        this.experimentState.metals.forEach((metal, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = metal.name;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            this.setSelectedMetal(parseInt(e.target.value));
        });
        
        formGroup.appendChild(label);
        formGroup.appendChild(select);
        content.appendChild(formGroup);
        panel.appendChild(content);
        
        document.body.appendChild(panel);
    },
    
    setSelectedMetal(index) {
        if (index >= 0 && index < this.experimentState.metals.length) {
            this.experimentState.selectedMetalIndex = index;
            this.updateCoilColor();
        }
    },
    
    updateCoilColor() {
        const coil = document.getElementById('copper-coil');
        const coilWindings = document.querySelector('.coil-windings');
        
        if (coil && coilWindings) {
            const metal = this.experimentState.currentMetal;
            coil.style.backgroundColor = metal.color;
            
            let gradient;
            switch(metal.id) {
                case 'copper':
                    gradient = `repeating-linear-gradient(90deg, #d35400, #e67e22 2px, #d35400 4px)`;
                    break;
                case 'aluminum':
                    gradient = `repeating-linear-gradient(90deg, #7f8c8d, #bdc3c7 2px, #7f8c8d 4px)`;
                    break;
                case 'iron':
                    gradient = `repeating-linear-gradient(90deg, #5d6d7e, #7f8c8d 2px, #5d6d7e 4px)`;
                    break;
                case 'gold':
                    gradient = `repeating-linear-gradient(90deg, #d4af37, #ffd700 2px, #d4af37 4px)`;
                    break;
                case 'tungsten':
                    gradient = `repeating-linear-gradient(90deg, #2c3e50, #34495e 2px, #2c3e50 4px)`;
                    break;
                default:
                    gradient = `repeating-linear-gradient(90deg, #d35400, #e67e22 2px, #d35400 4px)`;
            }
            
            coilWindings.style.background = gradient;
        }
    },
    
    initializeExperiment() {
        this.setupPhysicsObjects();
        
        document.getElementById('power-toggle')?.remove();
        document.getElementById('heat-toggle')?.addEventListener('click', () => this.toggleHeating());
        
        const voltageSlider = document.getElementById('voltage-slider');
        if (voltageSlider) voltageSlider.style.display = 'none';

        const tempValueElement = document.getElementById('temp-value');
        if (tempValueElement) tempValueElement.parentElement.style.display = 'none';
        
        this.createResistanceInputForm();
        this.createAlphaInputForm();
        this.createMetalSelector();
        
        document.getElementById('reset-btn')?.addEventListener('click', () => this.resetExperiment());
        document.getElementById('back-btn')?.addEventListener('click', () => this.backToMainPage());
        
        const powerSource = document.getElementById('power-source');
        if (powerSource) {
            powerSource.addEventListener('dblclick', (e) => {
                if (this.experimentState.step === 3) {
                    this.togglePower();
                    e.stopPropagation();
                }
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'q' || e.key.toLowerCase() === 'e') {
                e.stopPropagation();
                e.preventDefault();
                
                if (this.experimentState.step === 3 && this.experimentState.powerOn) {
                    if (e.key.toLowerCase() === 'q')
                        this.adjustVoltage(-this.experimentState.voltageStep);
                    else if (e.key.toLowerCase() === 'e')
                        this.adjustVoltage(this.experimentState.voltageStep);
                }
                
                return false;
            }
        }, true);
        
        physjs.onAttachment((source, target) => {
            if ((source.element.id === 'copper-coil' && target.element.id === 'thermometer') ||
                (source.element.id === 'thermometer' && target.element.id === 'copper-coil')) {
                
                this.experimentState.thermometerAttached = true;
                
                if (this.experimentState.step === 2) {
                    document.getElementById('initial-temp').textContent = this.experimentState.currentTemperature.toFixed(1);
                    document.getElementById('current-instruction').textContent = "Открепите термометр от образца.";
                } else if (this.experimentState.step === 5) {
                    document.getElementById('current-instruction').textContent = "Теперь нагрейте катушку.";
                }
            }
        });
        
        physjs.onDetachment((object) => {
            if (object.element.id === 'thermometer') {
                this.experimentState.thermometerAttached = false;
                
                if (this.experimentState.step === 2) {
                    setTimeout(() => this.forceSetStep(3), 100);
                } else if (this.experimentState.step === 5) {
                    this.experimentState.isHeating && this.toggleHeating();
                    document.getElementById('current-instruction').textContent = "Прикрепите термометр к катушке для измерения температуры.";
                }
            }
        });
        
        physjs.onConnect((fromId, toId) => {
            this.checkCircuitConnections();
        });
        
        this.updateUI();
        document.getElementById('temp-control').style.display = 'none';
        
        this._isInStepChangeHandler = false;
        physjs.goToStep('step1');
        
        this.setupGraph();
        this.updateCoilColor();
    },
    
    createResistanceInputForm() {
        if (!document.getElementById('resistance-input-panel')) {
            const panel = document.createElement('div');
            panel.id = 'resistance-input-panel';
            panel.style.position = 'absolute';
            panel.style.top = '50%';
            panel.style.left = '50%';
            panel.style.transform = 'translate(-50%, -50%)';
            panel.style.padding = '20px';
            panel.style.backgroundColor = '#f8f9fa';
            panel.style.border = '1px solid #dee2e6';
            panel.style.borderRadius = '5px';
            panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
            panel.style.zIndex = '1000';
            panel.style.display = 'none';
            panel.style.textAlign = 'center';
            
            panel.innerHTML = `
                <h4>Вычисление сопротивления</h4>
                <p>Вычислите сопротивление по закону Ома: R = U / I</p>
                <div style="margin: 15px 0;">
                    <label for="resistance-input">R = </label>
                    <input type="number" id="resistance-input" step="0.1" min="0" style="width: 80px;">
                    <span> Ом</span>
                </div>
                <button id="submit-resistance" class="btn btn-primary">Проверить</button>
                <p id="resistance-feedback" style="margin-top: 10px; color: red;"></p>
            `;
            
            document.body.appendChild(panel);
            
            document.getElementById('submit-resistance').addEventListener('click', () => {
                this.checkResistance();
            });
            
            document.getElementById('resistance-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.checkResistance();
                }
            });
        }
    },
    
    createAlphaInputForm() {
        if (!document.getElementById('alpha-input-panel')) {
            const panel = document.createElement('div');
            panel.id = 'alpha-input-panel';
            panel.style.position = 'absolute';
            panel.style.top = '50%';
            panel.style.left = '50%';
            panel.style.transform = 'translate(-50%, -50%)';
            panel.style.padding = '20px';
            panel.style.backgroundColor = '#f8f9fa';
            panel.style.border = '1px solid #dee2e6';
            panel.style.borderRadius = '5px';
            panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
            panel.style.zIndex = '1000';
            panel.style.display = 'none';
            panel.style.textAlign = 'center';
            
            panel.innerHTML = `
                <h4>Температурный коэффициент сопротивления</h4>
                <p>Определите температурный коэффициент сопротивления <span id="metal-name-in-form">меди</span>:</p>
                <div style="margin: 15px 0;">
                    <label for="alpha-input">α = </label>
                    <input type="number" id="alpha-input" step="0.0001" min="0" max="0.01" style="width: 80px;">
                    <span> K⁻¹</span>
                </div>
                <button id="submit-alpha" class="btn btn-primary">Проверить</button>
                <p id="alpha-feedback" style="margin-top: 10px; color: red;"></p>
            `;
            
            document.body.appendChild(panel);
            document.getElementById('submit-alpha').addEventListener('click', () => {
                this.checkAlpha();
            });
            
            document.getElementById('alpha-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.checkAlpha();
                }
            });
        }
    },
    
    checkAlpha() {
        const inputField = document.getElementById('alpha-input');
        const userValue = parseFloat(inputField.value);
        const feedbackElement = document.getElementById('alpha-feedback');
        
        if (isNaN(userValue)) {
            feedbackElement.textContent = 'Пожалуйста, введите числовое значение';
            return;
        }
        
        const correctAlpha = this.experimentState.currentMetal.alpha;
        const tolerance = correctAlpha * 0.05;
        
        if (Math.abs(userValue - correctAlpha) <= tolerance) {
            this.experimentState.tempCoefficient = correctAlpha;
            const formattedAlpha = (correctAlpha * 1000).toFixed(3) + '·10⁻³';
            document.getElementById('temp-coefficient').textContent = formattedAlpha;
            document.getElementById('alpha-input-panel').style.display = 'none';
            document.getElementById('current-instruction').textContent = 
                `Правильно! Эксперимент успешно завершен. Температурный коэффициент ${this.experimentState.currentMetal.name} равен ${formattedAlpha} K⁻¹`;
            this.experimentState.experimentComplete = true;
        } else {
            this.experimentState.wrongAttempts++;
            
            if (this.experimentState.wrongAttempts >= 3)
                feedbackElement.textContent = `Неверно. Правильный ответ: ${correctAlpha.toFixed(4)} K⁻¹`;
            else
                feedbackElement.textContent = 'Неверное значение. Проверьте расчеты и попробуйте еще раз.';
            
            document.getElementById('current-instruction').textContent = `Для вычисления температурного коэффициента используйте формулу: α = (R₂ - R₁) / (R₁ · (t₂ - t₁))`;
        }
    },
    
    checkResistance() {
        const inputField = document.getElementById('resistance-input');
        const userValue = parseFloat(inputField.value);
        const feedbackElement = document.getElementById('resistance-feedback');
        
        if (isNaN(userValue)) {
            feedbackElement.textContent = 'Пожалуйста, введите числовое значение';
            return;
        }
        
        const voltage = this.experimentState.initialVoltage;
        const currentInA = this.experimentState.initialCurrent / 1000;
        const correctResistance = voltage / currentInA;
        
        const tolerance = correctResistance * 0.05;
        
        if (Math.abs(userValue - correctResistance) <= tolerance) {
            this.experimentState.initialResistance = correctResistance;
            document.getElementById('initial-resistance').textContent = correctResistance.toFixed(1);
            document.getElementById('resistance-input-panel').style.display = 'none';
            
            this.experimentState.resistanceCalculated = true;
            document.getElementById('current-instruction').textContent = "Ответ верный! Теперь прикрепите термометр к катушке для нагревания.";
            
            this.experimentState.graphPoints = [{
                temperature: this.experimentState.currentTemperature,
                resistance: correctResistance
            }];
            
            this.updateGraphWithPoints();
            
            setTimeout(() => this.forceSetStep(5), 1000);
        } else {
            this.experimentState.wrongAttempts++;
            
            if (this.experimentState.wrongAttempts >= 3)
                feedbackElement.textContent = `Неверно. Правильный ответ: ${correctResistance.toFixed(1)} Ом`;
            else
                feedbackElement.textContent = 'Неверное значение. Проверьте расчеты и попробуйте еще раз.';
            
            document.getElementById('current-instruction').textContent = `Вычислите сопротивление по закону Ома: R = U / I (U=${voltage.toFixed(1)} В, I=${this.experimentState.initialCurrent.toFixed(1)} мА)`;
        }
    },
    
    forceSetStep(stepNumber) {
        stepNumber = Number(stepNumber);
        const currentStep = this.experimentState.step;
        
        if (stepNumber === currentStep || (stepNumber < currentStep && currentStep > 1)) return;
        
        this.experimentState.step = stepNumber;
        
        const instructions = [
            "Соберите электрическую цепь, соединив элементы согласно схеме.",
            "Поместите термометр на катушку, чтобы измерить начальную температуру.",
            "Включите источник питания двойным щелчком и установите ток в 40 мА (клавиши Q/E).",
            "Вычислите сопротивление по закону Ома: R = U / I",
            "Прикрепите термометр к катушке и нагрейте её для измерения изменения сопротивления.",
            "Вычислите температурный коэффициент сопротивления материала."
        ];
        
        const instructionElement = document.getElementById('current-instruction');
        if (instructionElement && stepNumber <= instructions.length) {
            instructionElement.textContent = instructions[stepNumber - 1];
        }
        
        document.querySelectorAll('#status-panel ol li').forEach((li, index) => {
            li.classList.remove('active', 'completed');
            if (index + 1 === stepNumber) li.classList.add('active');
            if (index + 1 < stepNumber) li.classList.add('completed');
        });
        
        switch(stepNumber) {
            case 1:
                document.getElementById('temp-control').style.display = 'none';
                break;
            case 2:
                document.getElementById('temp-control').style.display = 'none';
                this.experimentState.circuitAssembled = true;

                const metalSelector = document.getElementById('metal-selector');
                metalSelector && metalSelector.remove();
                break;
            case 3:
                document.getElementById('temp-control').style.display = 'none';
                break;
            case 4:
                break;
            case 5:
                document.getElementById('temp-control').style.display = 'flex';
                break;
            case 6:
                document.getElementById('temp-control').style.display = 'none';
                
                const metalNameInForm = document.getElementById('metal-name-in-form');
                if (metalNameInForm)
                    metalNameInForm.textContent = this.experimentState.currentMetal.name.toLowerCase();
                
                document.getElementById('alpha-input-panel').style.display = 'block';
                break;
        }
        
        if (!this._isInStepChangeHandler) {
            this._isInStepChangeHandler = true;
            physjs.goToStep(`step${stepNumber}`);
            this._isInStepChangeHandler = false;
        }
        
        this.updateUI();
    },
    
    togglePower() {
        const state = this.experimentState;
        state.powerOn = !state.powerOn;
        
        const powerSource = document.getElementById('power-source');
        const powerIndicator = document.querySelector('.power-indicator');
        
        if (powerSource) {
            if (state.powerOn) {
                powerSource.classList.add('power-on');
                powerSource.style.boxShadow = '0 0 15px rgba(231, 76, 60, 0.7)';
                powerSource.style.transition = 'box-shadow 0.3s ease';
            } else {
                powerSource.classList.remove('power-on');
                powerSource.style.boxShadow = 'none';
            }
        }
        
        if (powerIndicator) {
            powerIndicator.classList.toggle('active', state.powerOn);
        }
        
        const powerStateDisplay = document.getElementById('power-state');
        if (powerStateDisplay) {
            powerStateDisplay.textContent = state.powerOn ? 'Включено' : 'Выключено';
            powerStateDisplay.style.color = state.powerOn ? '#e74c3c' : '#7f8c8d';
        }
        
        if (state.powerOn) {
            this.updateVoltage(state.currentVoltage);
            
            if (state.step === 3 && this.isCurrentInRange()) {
                this.recordInitialMeasurements();
                
                const resistancePanel = document.getElementById('resistance-input-panel');
                if (resistancePanel) {
                    resistancePanel.style.display = 'block';
                    this.forceSetStep(4);
                }
            }
        } else {
            document.getElementById('voltage-value').textContent = '0.0 В';
            document.getElementById('current-value').textContent = '0.0 мА';
            
            this.updateMeterNeedle('#voltmeter .meter-needle', 0);
            this.updateMeterNeedle('#ammeter .meter-needle', 0);
            
            document.getElementById('voltage-display').textContent = '0.0 В';
            
            const resistancePanel = document.getElementById('resistance-input-panel');
            if (resistancePanel) {
                resistancePanel.style.display = 'none';
            }
        }
    },
    
    adjustVoltage(delta) {
        const state = this.experimentState;
        state.currentVoltage = Math.max(0, Math.min(10, state.currentVoltage + delta));
        this.updateVoltage(state.currentVoltage);
    },
    
    updateVoltage(value) {
        if (!this.experimentState.powerOn) return;
        
        const voltage = parseFloat(value);
        this.experimentState.currentVoltage = voltage;
        
        document.getElementById('voltage-display').textContent = `${voltage.toFixed(1)} В`;
        
        let resistance;
        if (this.experimentState.currentTemperature <= this.experimentState.initialTemperature) {
            resistance = 100;
        } else {
            const tempChange = this.experimentState.currentTemperature - this.experimentState.initialTemperature;
            resistance = 100 * (1 + this.experimentState.currentMetal.alpha * tempChange);
        }
        
        const current = (voltage / resistance) * 1000;
        
        document.getElementById('voltage-value').textContent = `${voltage.toFixed(1)} В`;
        document.getElementById('current-value').textContent = `${current.toFixed(1)} мА`;
        
        this.updateMeterNeedle('#voltmeter .meter-needle', voltage / 10);
        this.updateMeterNeedle('#ammeter .meter-needle', current / 100);
        
        if (this.experimentState.step === 3 && this.isCurrentInRange() && !this.experimentState.resistanceCalculated) {
            const resistancePanel = document.getElementById('resistance-input-panel');
            if (resistancePanel && resistancePanel.style.display === 'none') {
                this.recordInitialMeasurements();
                resistancePanel.style.display = 'block';
                this.forceSetStep(4);
            }
        }
    },
    
    updateMeterNeedle(selector, fraction) {
        const needle = document.querySelector(selector);
        if (needle) {
            const angle = -45 + (fraction * 90);
            needle.style.transform = `rotate(${angle}deg)`;
        }
    },
    
    toggleHeating() {
        const state = this.experimentState;
        
        if (!state.thermometerAttached && !state.isHeating) {
            document.getElementById('current-instruction').textContent = 
                "Прикрепите термометр к катушке для измерения температуры.";
            return;
        }
        
        state.isHeating = !state.isHeating;
        
        const heatingButton = document.getElementById('heat-toggle');
        
        if (heatingButton) {
            heatingButton.textContent = state.isHeating ? 'Остановить нагрев' : 'Нагреть катушку';
            heatingButton.classList.replace(
                state.isHeating ? 'btn-danger' : 'btn-warning',
                state.isHeating ? 'btn-warning' : 'btn-danger'
            );
        }
        
        if (state.isHeating) {
            this.startHeating();
            document.getElementById('current-instruction').textContent = 
                "Нагрев... Наблюдайте за изменением температуры и сопротивления на графике.";
        } else {
            this.stopHeating();
            
            if (state.targetTemperatureReached && state.step === 5 && state.powerOn) {
                this.recordFinalMeasurements();
                setTimeout(() => this.forceSetStep(6), 1000);
            }
        }
    },
    
    startHeating() {
        if (this.experimentState.heatingInterval) {
            clearInterval(this.experimentState.heatingInterval);
        }
        
        this.experimentState.heatingInterval = setInterval(() => {
            if (this.experimentState.currentTemperature < this.experimentState.finalTemperature) {
                this.experimentState.currentTemperature += 0.5;
                
                this.updateThermometer(this.experimentState.currentTemperature);
                
                if (this.experimentState.powerOn) {
                    const voltage = this.experimentState.currentVoltage;
                    const tempChange = this.experimentState.currentTemperature - this.experimentState.initialTemperature;
                    const newResistance = this.experimentState.initialResistance * 
                        (1 + this.experimentState.currentMetal.alpha * tempChange);
                    
                    this.experimentState.graphPoints.push({
                        temperature: this.experimentState.currentTemperature,
                        resistance: newResistance
                    });
                    
                    this.updateGraphWithPoints();
                    
                    this.updateVoltage(voltage);
                }
                
                if (this.experimentState.currentTemperature >= this.experimentState.finalTemperature) {
                    this.experimentState.targetTemperatureReached = true;
                    
                    this.stopHeating();
                    
                    if (this.experimentState.powerOn) {
                        this.recordFinalMeasurements();
                        setTimeout(() => this.forceSetStep(6), 1000);
                    }
                }
            }
        }, 100);
    },
    
    stopHeating() {
        if (this.experimentState.heatingInterval) {
            clearInterval(this.experimentState.heatingInterval);
            this.experimentState.heatingInterval = null;
        }
        
        const heatingButton = document.getElementById('heat-toggle');
        if (heatingButton) {
            heatingButton.textContent = 'Нагреть катушку';
            heatingButton.classList.replace('btn-warning', 'btn-danger');
        }
        
        this.experimentState.isHeating = false;
        
        if (this.experimentState.targetTemperatureReached) {
            document.getElementById('current-instruction').textContent = 
                "Нагрев завершен. Анализируйте полученную зависимость сопротивления от температуры.";
        }
    },
    
    updateThermometer(temperature) {
        const minTemp = 0;
        const maxTemp = 100;
        const normalizedTemp = Math.max(minTemp, Math.min(temperature, maxTemp));
        const heightPercent = 3 + ((normalizedTemp - minTemp) / (maxTemp - minTemp)) * 96;
        
        const thermometerMercury = document.querySelector('.thermometer-mercury');
        if (thermometerMercury) {
            thermometerMercury.style.height = `calc(${heightPercent}% + 8px)`;
        }
        
        const thermometerElement = document.getElementById('thermometer');
        if (thermometerElement) {
            let tempDisplay = thermometerElement.querySelector('.temp-display');
            
            if (!tempDisplay) {
                tempDisplay = document.createElement('div');
                tempDisplay.className = 'temp-display';
                tempDisplay.style.position = 'absolute';
                tempDisplay.style.bottom = '-25px';
                tempDisplay.style.left = '50%';
                tempDisplay.style.transform = 'translateX(-50%)';
                tempDisplay.style.fontWeight = 'bold';
                tempDisplay.style.textAlign = 'center';
                tempDisplay.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                tempDisplay.style.padding = '2px 5px';
                tempDisplay.style.borderRadius = '3px';
                tempDisplay.style.fontSize = '12px';
                tempDisplay.style.color = '#e74c3c';
                thermometerElement.appendChild(tempDisplay);
            }
            
            tempDisplay.textContent = `${temperature.toFixed(1)}°C`;
        }
    },
    
    isCurrentInRange() {
        const currentValue = parseFloat(document.getElementById('current-value').textContent);
        return currentValue >= this.experimentState.requiredCurrentMin && 
               currentValue <= this.experimentState.requiredCurrentMax;
    },
    
    recordInitialMeasurements() {
        const voltage = parseFloat(document.getElementById('voltage-value').textContent);
        const current = parseFloat(document.getElementById('current-value').textContent);
        
        this.experimentState.initialVoltage = voltage;
        this.experimentState.initialCurrent = current;
        
        document.getElementById('initial-voltage').textContent = voltage.toFixed(1);
        document.getElementById('initial-current').textContent = current.toFixed(1);
    },
    
    recordFinalMeasurements() {
        const voltage = parseFloat(document.getElementById('voltage-value').textContent);
        const current = parseFloat(document.getElementById('current-value').textContent);
        
        this.experimentState.finalVoltage = voltage;
        this.experimentState.finalCurrent = current;
        this.experimentState.finalTemperature = this.experimentState.currentTemperature;
        
        document.getElementById('final-voltage').textContent = voltage.toFixed(1);
        document.getElementById('final-current').textContent = current.toFixed(1);
        document.getElementById('final-temp').textContent = this.experimentState.finalTemperature.toFixed(1);
        
        const currentInA = current / 1000;
        if (currentInA > 0) {
            const resistance = voltage / currentInA;
            this.experimentState.finalResistance = resistance;
            document.getElementById('final-resistance').textContent = resistance.toFixed(1);
        }
    },
    
    calculateTempCoefficient() {
        document.getElementById('alpha-input-panel').style.display = 'block';
    },
    
    setupGraph() {
        const canvas = document.getElementById('resistance-graph');
        if (!canvas || !canvas.getContext) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.moveTo(50, 30);
        ctx.lineTo(50, canvas.height - 30);
        ctx.lineTo(canvas.width - 30, canvas.height - 30);
        ctx.stroke();
        
        ctx.font = '12px Arial';
        ctx.fillText('R, Ом', 20, 20);
        ctx.fillText('t, °C', canvas.width - 20, canvas.height - 10);
        
        for (let t = 20; t <= 100; t += 20) {
            const x = 50 + (t - 20) * (canvas.width - 80) / 80;
            ctx.beginPath();
            ctx.moveTo(x, canvas.height - 30);
            ctx.lineTo(x, canvas.height - 25);
            ctx.stroke();
            ctx.fillText(t.toString(), x - 5, canvas.height - 10);
        }
        
        const maxR = 200;
        for (let r = 0; r <= maxR; r += 50) {
            const y = (canvas.height - 30) - r * (canvas.height - 60) / maxR;
            ctx.beginPath();
            ctx.moveTo(45, y);
            ctx.lineTo(50, y);
            ctx.stroke();
            ctx.fillText(r.toString(), 30, y + 5);
        }
    },
    
    updateGraphWithPoints() {
        const canvas = document.getElementById('resistance-graph');
        if (!canvas || !canvas.getContext) return;
        
        const ctx = canvas.getContext('2d');
        const points = this.experimentState.graphPoints;
        
        if (points.length < 1) return;
        
        ctx.clearRect(51, 0, canvas.width - 51, canvas.height - 31);
        
        const maxR = 200;
        
        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        
        let isFirst = true;
        
        points.forEach((point, index) => {
            const x = 50 + (point.temperature - 20) * (canvas.width - 80) / 80;
            const y = (canvas.height - 30) - point.resistance * (canvas.height - 60) / maxR;
            
            if (isFirst) {
                ctx.moveTo(x, y);
                isFirst = false;
            } else {
                ctx.lineTo(x, y);
            }
            
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        
        isFirst = true;
        points.forEach((point) => {
            const x = 50 + (point.temperature - 20) * (canvas.width - 80) / 80;
            const y = (canvas.height - 30) - point.resistance * (canvas.height - 60) / maxR;
            
            if (isFirst) {
                ctx.moveTo(x, y);
                isFirst = false;
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    },
    
    checkCircuitConnections() {
        const state = this.experimentState;
        
        const powerPoints = ['power-positive', 'power-negative'];
        const ammeterPoints = ['ammeter-input', 'ammeter-output'];
        const voltmeterPoints = ['voltmeter-positive', 'voltmeter-negative'];
        const coilPoints = ['coil-left', 'coil-right', 'coil-top', 'coil-bottom'];
        
        let voltmeterToCoilConnections = 0;
        for (const vPoint of voltmeterPoints)
            for (const cPoint of coilPoints)
                if (physjs.areConnected(vPoint, cPoint))
                    voltmeterToCoilConnections++;
        
        let ammeterToCoilConnected = false;
        for (const aPoint of ammeterPoints) {
            for (const cPoint of coilPoints) {
                if (physjs.areConnected(aPoint, cPoint)) {
                    ammeterToCoilConnected = true;
                    break;
                }
            }
            if (ammeterToCoilConnected) break;
        }
        
        let coilToPowerConnected = false;
        for (const pPoint of powerPoints) {
            for (const cPoint of coilPoints) {
                if (physjs.areConnected(pPoint, cPoint)) {
                    coilToPowerConnected = true;
                    break;
                }
            }
            if (coilToPowerConnected) break;
        }
        
        let ammeterToPowerConnected = false;
        for (const aPoint of ammeterPoints) {
            for (const pPoint of powerPoints) {
                if (physjs.areConnected(aPoint, pPoint)) {
                    ammeterToPowerConnected = true;
                    break;
                }
            }
            if (ammeterToPowerConnected) break;
        }
        
        const allConnected = 
            voltmeterToCoilConnections >= 2 &&
            ammeterToCoilConnected &&
            coilToPowerConnected &&
            ammeterToPowerConnected;
        
        if (allConnected && state.step === 1) {
            setTimeout(() => this.forceSetStep(2), 1000);
        }
    },
    
    updateUI() {
        this.updateThermometer(this.experimentState.currentTemperature);
    },
    
    resetExperiment() {
        window.location.reload();
    },
    
    backToMainPage() {
        window.location.href = window.location.origin;
    }
};

export default experimentFunctions;