const experimentFunctions = {
    experimentState: {
        step: 1,
        waterInCylinder: false,
        heaterInWater: false,
        heaterOn: false,
        boiling: false,
        experimentComplete: false,
        
        initialTemperature: 20,
        finalTemperature: 100,
        initialWaterLevel: 150,
        finalWaterLevel: 0,
        heatingTime: 0,
        boilingTime: 0,
        heaterPower: 500,
        
        timer: null,
        startTime: 0,
        elapsedTime: 0
    },
    
    setupPhysicsObjects() {
        physjs.detachAll();
        const objects = [
            { selector: '#cylinder', type: 'cylinder' },
            { selector: '#heater', type: 'heater' },
            { selector: '#thermometer', type: 'thermometer' }
        ];
    
        objects.forEach(obj => {
            const element = document.querySelector(obj.selector);
            if (!element) return;
            element.dataset.type = obj.type;
            element.classList.add('phys', 'phys-draggable', 'phys-attachable');
            if (!physjs.getObject(obj.selector)) physjs.createObject(obj.selector);
        });
        physjs.addAttachmentPoint('#cylinder', 'thermometer-attachment', 24, -130, ['thermometer']);
        physjs.addAttachmentPoint('#cylinder', 'heater-attachment', -48, 60, ['heater']);
    },
    
    forceSetStep(stepNumber) {
        stepNumber = Number(stepNumber);
        const currentStep = this.experimentState.step;
        if (stepNumber === currentStep || (stepNumber < currentStep && currentStep > 1)) return;
        
        const wasHeaterOn = this.experimentState.heaterOn;
        this.experimentState.step = stepNumber;
        
        const instructions = [
            "Для начала эксперимента дважды кликните по цилиндру, чтобы налить воду.",
            "Перетащите кипятильник в цилиндр с водой.",
            "Нажмите кнопку 'Включить кипятильник' и дождитесь закипания воды (t₂ = 100°C).",
            "Дайте воде покипеть некоторое время, затем нажмите 'Выключить кипятильник'.",
            "Дождитесь установления уровня воды и запишите конечный уровень h₂.",
            "Рассчитайте удельную теплоту парообразования воды по формуле L = c·h₁·(t₂-t₁)/(h₁-h₂) · τ₂/τ₁"
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
            case 2:
                this.experimentState.waterInCylinder = true;
                document.getElementById('initial-level').textContent = this.experimentState.initialWaterLevel.toFixed(1);
                document.getElementById('initial-temp').textContent = this.experimentState.initialTemperature.toFixed(1);
                break;
                
            case 3:
                this.experimentState.heaterInWater = true;
                document.getElementById('heater-control').style.display = 'flex';
                break;
                
            case 4:
                this.experimentState.boiling = true;
                document.getElementById('final-temp').textContent = this.experimentState.finalTemperature.toFixed(1);
                document.getElementById('heating-time').textContent = this.experimentState.heatingTime.toFixed(1);
                
                if (!wasHeaterOn) {
                    document.getElementById('heater-toggle').textContent = 'Включить кипятильник';
                    document.getElementById('heater-toggle').classList.replace('btn-warning', 'btn-danger');
                }
                break;
            
            case 5:
                this.experimentState.heaterOn = false;
                this.experimentState.boiling = false;
                this.deactivateBoilingEffects();
                document.getElementById('boiling-time').textContent = this.experimentState.boilingTime.toFixed(1);
                this.calculateFinalWaterLevel();
                this.createVaporizationCalculator();
                break;
        }
        
        if (!this._isInStepChangeHandler) {
            this._isInStepChangeHandler = true;
            physjs.goToStep(`step${stepNumber}`);
            this._isInStepChangeHandler = false;
        }
    },
    
    fillCylinder() {
        if (this.experimentState.step !== 1) return;
        
        const waterLevel = document.querySelector('.water-level');
        if (waterLevel) {
            waterLevel.style.height = '180px';
            
            const thermometerObj = physjs.getObject('#thermometer');
            const cylinderObj = physjs.getObject('#cylinder');
            
            if (thermometerObj && cylinderObj) {
                const isAttached = physjs.isAttached('#thermometer', '#cylinder');
                !isAttached && cylinderObj.attach(thermometerObj);
            }
            
            this.updateThermometer(this.experimentState.initialTemperature);
            setTimeout(() => this.forceSetStep(2), 1000);
        }
    },
    
    updateThermometer(temperature) {
        const thermometerMercury = document.querySelector('.thermometer-mercury');
        if (thermometerMercury) {
            thermometerMercury.style.height = `${3 + (temperature / 100) * 96}%`;
        }
    },
    
    toggleHeater() {
        const state = this.experimentState;
        const heaterToggleBtn = document.getElementById('heater-toggle');
        
        state.heaterOn = !state.heaterOn;
        
        const heaterIndicator = document.querySelector('.heater-indicator');
        if (heaterIndicator) {
            heaterIndicator.classList[state.heaterOn ? 'add' : 'remove']('active');
        }
        
        if (state.heaterOn) {
            if (state.step == 3) {
                state.startTime = Date.now();
                state.lastSavedTemp = undefined;
                state.timer = setInterval(() => this.updateTimer(), 500);
                this.animateHeating();
            } else if (state.step == 4) {
                state.startTime = Date.now();
                state.elapsedTime = 0;
                state.timer = setInterval(() => this.updateTimer(true), 500);
                this.activateBoilingEffects();
            }
        } else {
            clearInterval(state.timer);
            this.stopHeatingAnimation();
            
            if (state.step == 4) {
                state.boilingTime = state.elapsedTime;
                setTimeout(() => this.forceSetStep(5), 1000);
            }
        }
        
        if (heaterToggleBtn) {
            heaterToggleBtn.textContent = state.heaterOn ? 'Выключить кипятильник' : 'Включить кипятильник';
            heaterToggleBtn.classList.replace(
                state.heaterOn ? 'btn-danger' : 'btn-warning',
                state.heaterOn ? 'btn-warning' : 'btn-danger'
            );
        }
    },
    
    updateTimer(isBoiling = false) {
        const state = this.experimentState;
        state.elapsedTime = (Date.now() - state.startTime) / 1000;
        
        const timerValue = document.getElementById('timer-value');
        if (timerValue) {
            const minutes = Math.floor(state.elapsedTime / 60);
            const seconds = Math.floor(state.elapsedTime % 60);
            timerValue.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        if (!isBoiling) {
            const HEAT_TIME = 30;
            const progress = Math.min(state.elapsedTime / HEAT_TIME, 1);
            const currentTemperature = state.initialTemperature + progress * (state.finalTemperature - state.initialTemperature);
            state.lastSavedTemp = currentTemperature;
            this.updateThermometer(currentTemperature);
            
            if (state.elapsedTime >= HEAT_TIME && !state.boiling) {
                state.heatingTime = HEAT_TIME;
                state.boiling = true;
                this.updateThermometer(state.finalTemperature);
                
                const waterLevel = document.querySelector('.water-level');
                const savedBackground = waterLevel ? waterLevel.style.background : null;
                const wasHeaterOn = state.heaterOn;

                clearInterval(state.timer);
                this.forceSetStep(4);
                
                if (wasHeaterOn) {
                    setTimeout(() => {
                        const waterLevelAfter = document.querySelector('.water-level');
                        if (waterLevelAfter && savedBackground)
                            waterLevelAfter.style.background = savedBackground;
                        
                        this.updateThermometer(state.finalTemperature);
                        
                        state.startTime = Date.now();
                        state.elapsedTime = 0;
                        state.heaterOn = true;
                        
                        const heaterToggleBtn = document.getElementById('heater-toggle');
                        if (heaterToggleBtn) {
                            heaterToggleBtn.textContent = 'Выключить кипятильник';
                            heaterToggleBtn.classList.replace('btn-danger', 'btn-warning');
                        }
                        
                        const heaterIndicator = document.querySelector('.heater-indicator');
                        if (heaterIndicator) heaterIndicator.classList.add('active');
                        
                        this.activateBoilingEffects();  
                        state.timer = setInterval(() => this.updateTimer(true), 500);
                    }, 50);
                }
            }
        } else {
            this.updateThermometer(state.finalTemperature);
            
            if (state.heaterOn && state.elapsedTime >= 40) {
                state.boilingTime = state.elapsedTime;
                clearInterval(state.timer);
                state.timer = null;
                state.heaterOn = false;
                
                const heaterToggleBtn = document.getElementById('heater-toggle');
                if (heaterToggleBtn) {
                    heaterToggleBtn.textContent = 'Включить кипятильник';
                    heaterToggleBtn.classList.replace('btn-warning', 'btn-danger');
                }
                
                const heaterIndicator = document.querySelector('.heater-indicator');
                if (heaterIndicator) heaterIndicator.classList.remove('active');
                
                this.stopHeatingAnimation();
                this.deactivateBoilingEffects();
                
                setTimeout(() => this.forceSetStep(5), 1000);
            }
        }
        
        if (state.boiling && state.heaterOn) {
            this.updateEvaporation();
        }
    },
    
    updateEvaporation() {
        const waterLevel = document.querySelector('.water-level');
        if (!waterLevel) return;
        
        const currentHeight = parseFloat(waterLevel.style.height);
        const newHeight = currentHeight - 0.0005;
        
        if (newHeight > 0) {
            waterLevel.style.height = `${newHeight}px`;
        }
    },
    
    activateBoilingEffects() {
        const waterLevel = document.querySelector('.water-level');
        if (waterLevel) waterLevel.classList.add('boiling');
        
        const steamParticles = document.querySelector('.steam-particles');
        if (steamParticles) {
            steamParticles.classList.add('active');
            this.updateSteamPosition(waterLevel, steamParticles);
        }
        this.startEvaporation();
    },

    updateSteamPosition(waterLevel, steamParticles) {
        if (!waterLevel || !steamParticles) return;
        
        const waterHeight = parseFloat(waterLevel.style.height) || 0;
        const cylinderHeight = waterLevel.parentElement.clientHeight;
        steamParticles.style.bottom = `${cylinderHeight - waterHeight}px`;
        steamParticles.style.position = 'absolute';
    },
    
    animateHeating() {
        const waterLevel = document.querySelector('.water-level');
        if (!waterLevel) return;
        
        let bubbleContainer = waterLevel.querySelector('.heating-bubbles') || 
            Object.assign(document.createElement('div'), {
                className: 'heating-bubbles',
                style: 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;pointer-events:none;'
            });
        
        let surfaceContainer = waterLevel.querySelector('.water-surface') || 
            Object.assign(document.createElement('div'), {
                className: 'water-surface',
                style: 'position:absolute;top:0;left:0;width:100%;height:15px;overflow:hidden;pointer-events:none;'
            });
        
        if (!waterLevel.contains(bubbleContainer)) waterLevel.appendChild(bubbleContainer);
        if (!waterLevel.contains(surfaceContainer)) waterLevel.appendChild(surfaceContainer);
        
        const createBubble = () => {
            if (!this.experimentState.heaterOn) return;
            
            const currentTemp = this.experimentState.lastSavedTemp || this.experimentState.initialTemperature;
            const intensity = Math.max(0.1, (currentTemp - this.experimentState.initialTemperature) / 
                (this.experimentState.finalTemperature - this.experimentState.initialTemperature));
            
            const bubble = Object.assign(document.createElement('div'), {
                className: 'heating-bubble',
                style: `
                    position:absolute;
                    width:${2 + Math.random() * 6 * intensity}px;
                    height:${2 + Math.random() * 6 * intensity}px;
                    left:${10 + Math.random() * 80}%;
                    bottom:0;
                    background-color:rgba(255,255,255,0.5);
                    border-radius:50%;
                    opacity:0.8;
                `
            });
            
            bubbleContainer.appendChild(bubble);
            
            bubble.animate([
                { bottom: '0', opacity: 0.8 },
                { bottom: '100%', opacity: 0 }
            ], {
                duration: (3 + Math.random() * 2) * 1000,
                easing: 'ease-out',
                fill: 'forwards'
            }).onfinish = () => bubbleContainer.contains(bubble) && bubbleContainer.removeChild(bubble);
            
            const bubblesPerBatch = Math.floor(1 + intensity * 4);
            for (let i = 1; i < bubblesPerBatch; i++) {
                setTimeout(() => {
                    if (bubbleContainer.isConnected) {
                        const extraBubble = bubble.cloneNode();
                        extraBubble.style.left = `${10 + Math.random() * 80}%`;
                        bubbleContainer.appendChild(extraBubble);
                        
                        extraBubble.animate([
                            { bottom: '0', opacity: 0.8 },
                            { bottom: '100%', opacity: 0 }
                        ], {
                            duration: (3 + Math.random() * 2) * 1000,
                            easing: 'ease-out',
                            fill: 'forwards'
                        }).onfinish = () => bubbleContainer.contains(extraBubble) && bubbleContainer.removeChild(extraBubble);
                    }
                }, i * 100);
            }
            
            if (intensity > 0.8) this.animateSurface(surfaceContainer, intensity);
            
            if (this.experimentState.heaterOn) {
                this.experimentState.bubbleTimeout = setTimeout(createBubble, Math.max(100, 1000 - 800 * intensity));
            }
        };
        
        createBubble();
        
        waterLevel.style.transition = 'background 2s ease-in-out';
        
        const updateGradient = () => {
            if (!this.experimentState.heaterOn) return;
            
            const currentTemp = this.experimentState.lastSavedTemp || this.experimentState.initialTemperature;
            const intensity = Math.max(0.1, (currentTemp - this.experimentState.initialTemperature) / 
                (this.experimentState.finalTemperature - this.experimentState.initialTemperature));
            
            waterLevel.style.background = `
                linear-gradient(
                    to bottom, 
                    rgba(52, 152, 219, 0.${Math.floor(3+intensity*5)}) 0%,
                    rgba(41, 128, 185, 0.${Math.floor(5+intensity*4)}) ${50-intensity*20}%,
                    rgba(41, 128, 185, 0.${Math.floor(6+intensity*3)}) 100%
                )
            `;
            
            if (this.experimentState.heaterOn) {
                this.experimentState.gradientTimeout = setTimeout(updateGradient, 500);
            }
        };
        
        updateGradient();
    },
    
    animateSurface(surfaceContainer, intensity) {
        if (!surfaceContainer || !this.experimentState.heaterOn) return;
        
        const wave = Object.assign(document.createElement('div'), {
            className: 'surface-wave',
            style: `
                position:absolute;
                width:${10 + Math.random() * 20}px;
                height:${5 + Math.random() * 5 * intensity}px;
                background-color:rgba(255,255,255,0.5);
                border-radius:50%;
                top:0;
                left:${Math.random() * 100}%;
            `
        });
        
        surfaceContainer.appendChild(wave);
        
        wave.animate([
            { opacity: 0.7, width: wave.style.width, height: wave.style.height },
            { opacity: 0, width: `${parseInt(wave.style.width) * 1.5}px`, height: `${parseInt(wave.style.height) * 0.6}px` }
        ], {
            duration: 800,
            easing: 'ease-out',
            fill: 'forwards'
        }).onfinish = () => surfaceContainer.removeChild(wave);
        
        if (intensity > 0.9 && this.experimentState.heaterOn) {
            for (let i = 0; i < Math.floor(Math.random() * 3); i++) {
                const splash = Object.assign(document.createElement('div'), {
                    className: 'water-splash',
                    style: `
                        position:absolute;
                        width:3px;
                        height:3px;
                        background-color:rgba(255,255,255,0.6);
                        border-radius:50%;
                        top:5px;
                        left:${10 + Math.random() * 80}%;
                    `
                });
                
                surfaceContainer.appendChild(splash);
                
                const height = 5 + Math.random() * 15;
                splash.animate([
                    { transform: 'translateY(0)', opacity: 0.7 },
                    { transform: `translateY(-${height}px)`, opacity: 0 }
                ], {
                    duration: 600,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    fill: 'forwards'
                }).onfinish = () => surfaceContainer.removeChild(splash);
            }
        }
        
        if (this.experimentState.heaterOn) {
            setTimeout(() => this.animateSurface(surfaceContainer, intensity), 
                Math.max(50, 500 - intensity * 400));
        }
    },
    
    stopHeatingAnimation() {
        clearTimeout(this.experimentState.bubbleTimeout);
        clearTimeout(this.experimentState.gradientTimeout);
        
        const waterLevel = document.querySelector('.water-level');
        if (!waterLevel) return;
        
        ['heating-bubbles', 'water-surface'].forEach(className => {
            const container = waterLevel.querySelector(`.${className}`);
            if (container) {
                container.style.transition = 'opacity 1s';
                container.style.opacity = '0';
                setTimeout(() => container.parentNode === waterLevel && waterLevel.removeChild(container), 1000);
            }
        });
    },
    
    deactivateBoilingEffects() {
        const waterLevel = document.querySelector('.water-level');
        if (waterLevel) waterLevel.classList.remove('boiling');
        
        const steamParticles = document.querySelector('.steam-particles');
        if (steamParticles) steamParticles.classList.remove('active');
        
        clearInterval(this.experimentState.evaporationInterval);
    },
    
    startEvaporation() {
        const waterLevel = document.querySelector('.water-level');
        if (!waterLevel) return;
        
        const initialHeight = parseFloat(waterLevel.style.height);
        const finalHeight = initialHeight * 0.8;
        
        this.experimentState.evaporationInterval = setInterval(() => {
            const currentHeight = parseFloat(waterLevel.style.height);
            if (currentHeight > finalHeight) {
                waterLevel.style.height = `${currentHeight - 0.1}px`;
                
                const steamParticles = document.querySelector('.steam-particles');
                if (steamParticles && steamParticles.classList.contains('active')) {
                    this.updateSteamPosition(waterLevel, steamParticles);
                }
            }
            else clearInterval(this.experimentState.evaporationInterval);
        }, 100);
    },
    
    calculateFinalWaterLevel() {
        const state = this.experimentState;
        const actualBoilingTime = state.boilingTime;
        const dropRatePerSecond = 0.743;
        const waterLevelDrop = actualBoilingTime * dropRatePerSecond;
        
        state.finalWaterLevel = Math.max(state.initialWaterLevel - waterLevelDrop, 100);
        
        document.getElementById('final-level').textContent = state.finalWaterLevel.toFixed(1);
    },
    
    createVaporizationCalculator() {
        if (document.getElementById('vaporization-calculator')) return;
        
        const calculatorContainer = document.createElement('div');
        calculatorContainer.id = 'vaporization-calculator';
        calculatorContainer.classList.add('calculator-panel');
        
        calculatorContainer.innerHTML = `
            <div class="calculator-header">
                <h3>Расчет удельной теплоты парообразования</h3>
            </div>
            <div class="calculator-content">
                <div class="input-group">
                    <label for="vaporization-input">Введите рассчитанную удельную теплоту парообразования воды (кДж/кг):</label>
                    <input type="text" id="vaporization-input" placeholder="Пример: 2260">
                    <button id="check-vaporization-btn" class="btn btn-primary">Проверить</button>
                </div>
                <div id="vaporization-result" class="feedback"></div>
                <div class="calculation-hint info-box info-box-primary">
                    <p>Используйте формулу: L = c·h₁·(t₂-t₁)/(h₁-h₂) · τ₂/τ₁</p>
                </div>
            </div>
        `;
        document.body.appendChild(calculatorContainer);
        document.getElementById('check-vaporization-btn').addEventListener('click', () => this.checkVaporizationCalculation());
    },
    
    calculateExpectedResult() {
        const state = this.experimentState;
        const c = 4200;
        const h1 = state.initialWaterLevel;
        const h2 = state.finalWaterLevel;
        const t2 = state.finalTemperature;
        const t1 = state.initialTemperature;
        const time1 = state.heatingTime;
        const time2 = state.boilingTime;
        
        let L = (c * h1 * (t2 - t1) / (h1 - h2)) * (time2 / time1);
        return (!isFinite(L) || isNaN(L) || h1 <= h2) ? 2260000 : L;
    },
    
    checkVaporizationCalculation() {
        const input = document.getElementById('vaporization-input');
        const resultDiv = document.getElementById('vaporization-result');
        
        if (!input || !resultDiv) return;
        
        const userAnswer = parseFloat(input.value);
        const expectedValue = this.calculateExpectedResult() / 1000;
        
        if (isNaN(userAnswer)) {
            resultDiv.innerHTML = 'Пожалуйста, введите числовое значение.';
            resultDiv.className = 'feedback error';
            return;
        }
        
        const percentDiff = Math.abs((userAnswer - expectedValue) / expectedValue * 100);
        
        if (percentDiff <= 10) {
            resultDiv.innerHTML = `Правильно! Удельная теплота парообразования воды: ${userAnswer.toFixed(0)} кДж/кг`;
            resultDiv.className = 'feedback success';
            
            document.getElementById('vaporization-heat').textContent = userAnswer.toFixed(0);
            
            input.disabled = true;
            document.getElementById('check-vaporization-btn').disabled = true;
            this.experimentState.experimentComplete = true;
        } else {
            resultDiv.innerHTML = 'Неправильно. Проверьте ваши расчеты и попробуйте снова.';
            resultDiv.className = 'feedback error';
        }
    },
    
    checkIntersection(rect1, rect2) {
        return !(rect1.right < rect2.left || rect1.left > rect2.right || 
                rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    },
    
    checkThermometerPosition() {
        const thermometer = document.getElementById('thermometer');
        const cylinder = document.getElementById('cylinder');
        
        if (!thermometer || !cylinder) return;
        
        if (this.checkIntersection(thermometer.getBoundingClientRect(), cylinder.getBoundingClientRect()) && 
            this.experimentState.step === 1) {
            this.updateThermometer(this.experimentState.initialTemperature);
        }
    },
    
    checkHeaterPosition() {
        const heater = document.getElementById('heater');
        const cylinder = document.getElementById('cylinder');
        const waterLevel = document.querySelector('.water-level');
        
        if (!heater || !cylinder || !waterLevel) return;
        
        const heaterRect = heater.getBoundingClientRect();
        const waterRect = waterLevel.getBoundingClientRect();
        const cylinderRect = cylinder.getBoundingClientRect();
        
        if (this.checkIntersection(heaterRect, waterRect) && this.experimentState.step === 2 && 
            !physjs.isAttached(heater, cylinder)) {
            
            const heaterObj = physjs.getObject('#heater');
            const cylinderObj = physjs.getObject('#cylinder');
            
            if (heaterObj && cylinderObj) {
                heaterObj.setPosition(
                    cylinderRect.left + cylinderRect.width/2 - heaterRect.width/2,
                    waterRect.top + 20
                );
                cylinderObj.attach(heaterObj);
                this.experimentState.heaterInWater = true;
                setTimeout(() => this.forceSetStep(3), 500);
            }
        }
    },
    
    initializeExperiment() {
        this.setupPhysicsObjects();

        const steamParticles = document.querySelector('.steam-particles');
        if (steamParticles) {
            Object.assign(steamParticles.style, {
                position: 'absolute',
                width: '100%',
                height: '30px',
                top: '0',
                left: '0',
                pointerEvents: 'none',
                zIndex: '10'
            });
        }
        
        document.getElementById('heater-toggle')?.addEventListener('click', () => this.toggleHeater());
        document.getElementById('heater-control').style.display = 'none';
        
        document.getElementById('thermometer')?.addEventListener('dragend', () => this.checkThermometerPosition());
        document.getElementById('heater')?.addEventListener('dragend', () => this.checkHeaterPosition());
        document.getElementById('cylinder')?.addEventListener('dblclick', () => this.fillCylinder());
        
        const step1 = physjs.createStep('step1', 'Налейте воду в цилиндр и измерьте температуру', ['#cylinder', '#thermometer']);
        const step2 = physjs.createStep('step2', 'Соедините цилиндр с кипятильником', ['#heater', '#cylinder']);
        const step3 = physjs.createStep('step3', 'Включите кипятильник');
        const step4 = physjs.createStep('step4', 'Дайте воде покипеть');
        const step5 = physjs.createStep('step5', 'Расчет удельной теплоты парообразования');
        
        physjs.addStep(step1)
            .addStep(step2)
            .addStep(step3)
            .addStep(step4)
            .addStep(step5); 
        
        this._isInStepChangeHandler = false;
        physjs.goToStep('step1');
    },
    
    resetExperiment() { window.location.reload(); },
    
    backToMainPage() { window.location.href = '../index.html'; }
};

export default experimentFunctions;