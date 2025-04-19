const experimentFunctions = {
    experimentState: {
        step: 1,
        waterFilled: false,
        corkInserted: false,
        initialWaterLevelSet: false,
        finalMeasurementsDone: false,
        calculationDone: false,
        
        initialAirColumnLength: 0,
        finalAirColumnLength: 0,
        waterLevelDifference: 0,
        calculatedPressure: 0,
        
        funnelPosition: { top: 100, left: 300 },
        initialFunnelHeight: 0,
        finalFunnelHeight: 0,
        
        waterInTube: false,
        waterInFunnel: false,
        waterInRubberTube: false,
        
        rubberTubeConnectedToGlassTube: false,
        rubberTubeConnectedToFunnel: false,
        systemConnected: false,

        initialTubeWaterLevel: 0,
        initialFunnelWaterLevel: 0,
        initialAirVolume: 0,
        initialBarometerReading: 0,
        currentBarometerReading: 0
    },
    
    setupPhysicsObjects() {
        this.initializePhysicsObject('#glass-tube', 'tube', true);
        this.initializePhysicsObject('#funnel', 'funnel', false);
        this.initializePhysicsObject('#rubber-tube', 'tube', false);
        this.initializePhysicsObject('#cork', 'cork', false);
        this.initializePhysicsObject('#ruler', 'ruler', false);
        this.initializePhysicsObject('#barometer', 'barometer', true);
        this.initializePhysicsObject('#water-container', 'container', true);
        
        this.setupAttachmentPoints();
    },
    
    initializePhysicsObject(selector, type, isFixed) {
        const element = document.querySelector(selector);
        if (!element) return;
        
        if(!element.dataset.type && type) element.dataset.type = type;
        
        isFixed ?
            !element.classList.contains('phys-fixed') && element.classList.add('phys-fixed') :
            !element.classList.contains('phys') && element.classList.add('phys');
        
        !element.classList.contains('phys-attachable') && element.classList.add('phys-attachable');
        !physjs.getObject(selector) && physjs.createObject(selector);
        physjs.disableRotation();
    },
    
    setupAttachmentPoints() {
        physjs.detachAll();
        
        physjs.addAttachmentPoint('#glass-tube', 'rubber-tube-attachment', 0, 385, ['tube']);
        physjs.addAttachmentPoint('#glass-tube', 'cork-attachment', 5, -5, ['cork']);
        physjs.addAttachmentPoint('#funnel', 'rubber-tube-attachment', -105, 385, ['tube']);
    },
    
    resetWaterFilling() {
        this.experimentState.waterFilled = false;
        this.experimentState.waterInRubberTube = false;
        this.experimentState.waterInFunnel = false;
        this.experimentState.waterInTube = false;
        
        this.updateWaterLevels();
        this.resetToStep(1);
        document.getElementById('current-instruction').textContent = 
            "Наполните систему водой, перемещая воронку к сосуду с водой";
    },
    
    updateWaterLevels() {
        const tubeWater = document.querySelector('#glass-tube .tube-water');
        const funnelWater = document.querySelector('#funnel .tube-water');
        const tubeAir = document.querySelector('#glass-tube .tube-air');
        const funnelAir = document.querySelector('#funnel .tube-air');
        
        if (!this.experimentState.waterInTube) {
            tubeWater.style.height = '0%';
            tubeAir.style.height = '100%';
            funnelWater.style.height = '0%';
            funnelAir.style.height = '100%';
            return;
        }
        
        const glassTube = document.getElementById('glass-tube');
        const funnel = document.getElementById('funnel');
        const tubeRect = glassTube.getBoundingClientRect();
        const funnelRect = funnel.getBoundingClientRect();
        
        const tubeHeight = tubeRect.height;
        const funnelHeight = funnelRect.height;
        const tubeBottom = tubeRect.bottom;
        const funnelBottom = funnelRect.bottom;
        
        if (!this.experimentState.corkInserted) {
            const totalWaterVolume = tubeHeight * 0.5 + funnelHeight * 0.5;
            const absoluteWaterLevel = (tubeBottom + funnelBottom - totalWaterVolume) / 2;
            const tubeWaterHeightPx = tubeBottom - absoluteWaterLevel;
            const tubeWaterPercent = (tubeWaterHeightPx / tubeHeight) * 100;
            const funnelWaterHeightPx = funnelBottom - absoluteWaterLevel;
            const funnelWaterPercent = (funnelWaterHeightPx / funnelHeight) * 100;
            
            tubeWater.style.height = `${Math.max(0, Math.min(100, tubeWaterPercent))}%`;
            tubeAir.style.height = `${Math.max(0, Math.min(100, 100 - tubeWaterPercent))}%`;
            funnelWater.style.height = `${Math.max(0, Math.min(100, funnelWaterPercent))}%`;
            funnelAir.style.height = `${Math.max(0, Math.min(100, 100 - funnelWaterPercent))}%`;
            
            if (this.experimentState.step === 2 && this.experimentState.initialWaterLevelSet) this.experimentState.initialAirColumnLength = 100 - tubeWaterPercent;
        } else {
            const initialHeight = this.experimentState.initialFunnelHeight;
            const currentHeight = this.experimentState.funnelPosition.top;
            const heightDifference = currentHeight - initialHeight;
            const heightDifferenceInCm = heightDifference * 0.11;
            const waterChangeRatio = .105782; 
            const waterLevelChangeInCm = heightDifferenceInCm * waterChangeRatio;
            const tubeHeightInCm = 100;
            const funnelHeightInCm = 100;
            const waterLevelChangeInPercentTube = (waterLevelChangeInCm / tubeHeightInCm) * 100;
            const waterLevelChangeInPercentFunnel = (waterLevelChangeInCm / funnelHeightInCm) * 100;
            const initialTubeWaterLevel = this.experimentState.initialTubeWaterLevel || 50;
            const initialFunnelWaterLevel = this.experimentState.initialFunnelWaterLevel || 50;
            const tubeWaterPercent = initialTubeWaterLevel - waterLevelChangeInPercentTube;
            const funnelWaterPercent = initialFunnelWaterLevel + waterLevelChangeInPercentFunnel;
            
            tubeWater.style.height = `${Math.max(10, Math.min(90, tubeWaterPercent))}%`;
            tubeAir.style.height = `${Math.max(10, Math.min(90, 100 - tubeWaterPercent))}%`;
            funnelWater.style.height = `${Math.max(10, Math.min(90, funnelWaterPercent))}%`;
            funnelAir.style.height = `${100 - Math.max(10, Math.min(90, funnelWaterPercent))}%`;
            
            if (this.experimentState.step >= 4) this.experimentState.finalAirColumnLength = 100 - tubeWaterPercent;
        }
        funnelWater.style.display = 'block';
    },
    
    calculateWaterLevelInTube() {
        if (!this.experimentState.waterInTube) return 0;
        
        const glassTube = document.getElementById('glass-tube');
        const funnel = document.getElementById('funnel');
        const tubeRect = glassTube.getBoundingClientRect();
        const funnelRect = funnel.getBoundingClientRect();
        
        if (!this.experimentState.corkInserted) {
            const tubeHeight = tubeRect.height;
            const funnelHeight = funnelRect.height;
            const tubeBottom = tubeRect.bottom;
            const funnelBottom = funnelRect.bottom;
            const tubeTop = tubeRect.top;
            const totalWaterVolume = tubeHeight * 0.5 + funnelHeight * 0.5;
            const absoluteWaterLevel = (tubeBottom + funnelBottom - totalWaterVolume) / 2;
            const airHeight = absoluteWaterLevel - tubeTop;
            return (airHeight / tubeHeight) * 100;
        } else {
            const initialHeight = this.experimentState.initialFunnelHeight;
            const currentHeight = this.experimentState.funnelPosition.top;
            const heightDifference = currentHeight - initialHeight;
            const heightDifferenceInCm = heightDifference * 0.11;
            const initialAirColumnLength = this.experimentState.initialAirColumnLength;
            const waterChangeRatio = .105782;
            const waterLevelChange = heightDifferenceInCm * waterChangeRatio;
            return initialAirColumnLength + waterLevelChange;
        }
    },
    
    limitFunnelMovement(funnelElement) {
        if (!funnelElement) return;
        
        if (!this.experimentState.rubberTubeConnectedToGlassTube || 
            !this.experimentState.rubberTubeConnectedToFunnel) {
            return;
        }
        
        const funnelTop = parseInt(funnelElement.style.top || '100');
        const tube = document.getElementById('glass-tube');
        const tubeTop = parseInt(tube.style.top || '100');
        const tubeHeight = 400;
        const tubeWater = document.querySelector('#glass-tube .tube-water');
        const funnelWater = document.querySelector('#funnel .tube-water');
        const tubeWaterHeight = parseFloat(tubeWater.style.height || '0');
        const funnelWaterHeight = parseFloat(funnelWater.style.height || '0');
        
        let minTop, maxTop;
        
        if (this.experimentState.corkInserted) {
            minTop = this.experimentState.initialFunnelHeight;
            maxTop = minTop + 135;
        } else {
            let baseMinTop = tubeTop - 50;
            let baseMaxTop = tubeTop + tubeHeight - 50;

            if (tubeWaterHeight > 90) baseMaxTop = funnelTop;
            if (funnelWaterHeight < 10) baseMinTop = funnelTop;
            
            minTop = baseMinTop;
            maxTop = baseMaxTop;
        }
        
        if (funnelTop < minTop) {
            funnelElement.style.top = `${minTop}px`;
            this.experimentState.funnelPosition.top = minTop;
        } else if (funnelTop > maxTop) {
            funnelElement.style.top = `${maxTop}px`;
            this.experimentState.funnelPosition.top = maxTop;
        }
        
        this.updateWaterLevels();
    },
    
    updateRubberTubePosition() {
        const isConnected = this.experimentState.rubberTubeConnectedToGlassTube && 
                            this.experimentState.rubberTubeConnectedToFunnel;

        const svgContainer = document.getElementById('svg-container');
        const rubberTube = document.getElementById('rubber-tube');

        if (!isConnected) {
            svgContainer.classList.remove('connected');
            rubberTube.style.display = 'block';
            return;
        }

        svgContainer.classList.add('connected');
        rubberTube.style.display = 'none';

        const glassTube = document.getElementById('glass-tube');
        const funnel = document.getElementById('funnel');
        const path = document.getElementById('rubber-tube-path');
        const tubeConnector = document.getElementById('tube-connector');
        const funnelConnector = document.getElementById('funnel-connector');

        const tubeRect = glassTube.getBoundingClientRect();
        const tubeX = tubeRect.left + tubeRect.width / 2;
        const tubeY = tubeRect.bottom - 5;
        const tubeWidth = tubeRect.width + 10;

        const funnelRect = funnel.getBoundingClientRect();
        const funnelX = funnelRect.left + funnelRect.width / 2;
        const funnelY = funnelRect.bottom - 5;
        const funnelWidth = funnelRect.width + 10;

        const centerX = (tubeX + funnelX) / 2;
        const maxY = Math.max(tubeY, funnelY) + 80;

        path.setAttribute('d', `M ${tubeX} ${tubeY + 5} Q ${centerX} ${maxY}, ${funnelX} ${funnelY + 5}`);

        tubeConnector.setAttribute('x', tubeX - tubeWidth / 2);
        tubeConnector.setAttribute('y', tubeY - 15);
        tubeConnector.setAttribute('width', tubeWidth);
        tubeConnector.setAttribute('height', 25);

        funnelConnector.setAttribute('x', funnelX - funnelWidth / 2);
        funnelConnector.setAttribute('y', funnelY - 15);
        funnelConnector.setAttribute('width', funnelWidth);
        funnelConnector.setAttribute('height', 25);
    },
    
    advanceToStep(step) {
        if (step <= this.experimentState.step) return;
        
        this.experimentState.step = step;
        
        const stepElements = document.querySelectorAll('#status-panel ol li');
        stepElements.forEach((el, index) => {
            el.classList.remove('active');
            index + 1 === step && el.classList.add('active');
            index + 1 < step && el.classList.add('completed');
        });
    },
    
    resetToStep(step) {
        this.experimentState.step = step;
        
        const stepElements = document.querySelectorAll('#status-panel ol li');
        stepElements.forEach((el, index) => {
            el.classList.remove('active', 'completed');
            index + 1 === step && el.classList.add('active');
            index + 1 < step && el.classList.add('completed');
        });
    },
    
    elementsOverlap(el1, el2, tolerance = 0) {
        if (!el1 || !el2) return false;
        
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();
        
        return !(rect1.right < rect2.left - tolerance || 
                rect1.left > rect2.right + tolerance || 
                rect1.bottom < rect2.top - tolerance || 
                rect1.top > rect2.bottom + tolerance);
    },

    isAttachmentAllowedForStep(sourceId, targetId, step) {
        if ((sourceId === 'rubber-tube' || targetId === 'rubber-tube') && step !== 1) return false;
        if ((sourceId === 'cork' || targetId === 'cork') && step !== 3) return false;
        
        if ((sourceId === 'rubber-tube' && targetId === 'funnel') || 
            (sourceId === 'funnel' && targetId === 'rubber-tube'))
            if (!this.experimentState.rubberTubeConnectedToGlassTube)
                return false;
        
        return true;
    },
    
    isDetachmentAllowedForStep(elementId, step) {
        if (elementId === 'rubber-tube' && step !== 1) return false;
        if (elementId === 'cork' && step < 6) return false;
        return true;
    },
    
    showAttachmentHint(sourceId, targetId, step, elements) {
        const originalInstructionText = elements.currentInstruction.textContent;
        
        if ((sourceId === 'rubber-tube' || targetId === 'rubber-tube') && step !== 1)
            elements.currentInstruction.textContent = 
                "На этом этапе нельзя изменять подключение трубок. Следуйте инструкциям текущего шага.";
        else if ((sourceId === 'rubber-tube' && targetId === 'funnel') || 
             (sourceId === 'funnel' && targetId === 'rubber-tube'))
            if (!this.experimentState.rubberTubeConnectedToGlassTube)
                elements.currentInstruction.textContent = 
                    "Сначала прикрепите резиновую трубку к стеклянной трубке, а затем к воронке.";
        else if ((sourceId === 'cork' || targetId === 'cork') && step !== 3) {
            if (step < 3)
                elements.currentInstruction.textContent = 
                    "Сначала наполните систему водой и установите правильный уровень воды в трубке.";
            else
                elements.currentInstruction.textContent = 
                    "Пробка уже установлена. Продолжайте следовать текущей инструкции.";
        }
        
        elements.currentInstruction.classList.add('warning');
        setTimeout(() => {
            elements.currentInstruction.classList.remove('warning');
            elements.currentInstruction.textContent = originalInstructionText;
        }, 3000);
    },
    
    showDetachmentHint(elementId, step, elements) {
        const originalInstructionText = elements.currentInstruction.textContent;
        
        if (elementId === 'rubber-tube' && step !== 1)
            elements.currentInstruction.textContent = 
                "На этом этапе нельзя отсоединять трубки. Следуйте инструкциям текущего шага.";
        
        if (elementId === 'cork' && step < 6)
            elements.currentInstruction.textContent = 
                "Пробка должна оставаться на месте до конца эксперимента.";
        
        elements.currentInstruction.classList.add('warning');
        setTimeout(() => {
            elements.currentInstruction.classList.remove('warning');
            elements.currentInstruction.textContent = originalInstructionText;
        }, 3000);
    },
    
    applyFunnelConstraints(elements, funnelConstrainedMode, funnelBasePosition, isDraggingFunnel) {
        if (this.experimentState.rubberTubeConnectedToGlassTube && 
            this.experimentState.rubberTubeConnectedToFunnel) {
            
            if (!isDraggingFunnel) {
                elements.funnel.style.left = `${funnelBasePosition.left}px`;
            }
            
            return true;
        } else {
            return false;
        }
    },
    
    checkRulerMeasurement(elements) {
        const ruler = elements.ruler;
        const glassTube = elements.glassTube;
        
        if (this.elementsOverlap(ruler, glassTube, 20)) {
            if (this.experimentState.step === 2 && !this.experimentState.initialWaterLevelSet) {
                const airColumnLength = this.calculateWaterLevelInTube(elements);
                const lengthInCm = (airColumnLength / 100) * 100;
                
                if (lengthInCm >= 49 && lengthInCm <= 51) {
                    this.experimentState.initialAirColumnLength = lengthInCm;
                    elements.lengthDisplay1.textContent = lengthInCm.toFixed(1);
                    this.experimentState.initialWaterLevelSet = true;
                    
                    this.advanceToStep(3, elements);
                    elements.currentInstruction.textContent = 
                        "Теперь закройте отверстие трубки пробкой";
                } else {
                    const originalInstructionText = elements.currentInstruction.textContent;
                    elements.currentInstruction.textContent = 
                        `Уровень воды в трубке должен быть примерно 50 см от верхнего конца (текущий: ${lengthInCm.toFixed(1)} см)`;
                    elements.currentInstruction.classList.add('warning');
                    
                    setTimeout(() => {
                        elements.currentInstruction.classList.remove('warning');
                        elements.currentInstruction.textContent = originalInstructionText;
                    }, 3000);
                }
            }
            
            if (this.experimentState.step === 5 && !this.experimentState.finalMeasurementsDone) {
                const airColumnLength = this.calculateWaterLevelInTube(elements);
                const lengthInCm = (airColumnLength / 100) * 100;
                
                this.experimentState.finalAirColumnLength = lengthInCm;
                elements.lengthDisplay2.textContent = lengthInCm.toFixed(1);
                
                this.experimentState.finalMeasurementsDone = true;
                
                this.advanceToStep(6, elements);
                
                elements.currentInstruction.textContent = 
                    "Теперь выполните расчет атмосферного давления и введите ответ";
                
                if (elements.answerForm) {
                    elements.answerForm.style.display = "block";
                    
                    if (elements.userPressureInput) {
                        elements.userPressureInput.value = "";
                        elements.userPressureInput.focus();
                    }
                } else {
                    const calculateBtn = document.getElementById('calculate-btn');
                    if (calculateBtn) calculateBtn.style.display = 'block';
                }
            }
        }
    },
    
    calculatePressure(elements) {
        if (!this.experimentState.finalMeasurementsDone) return;
        
        let userPressure = 0;
        
        if (elements.userPressureInput) {
            userPressure = parseFloat(elements.userPressureInput.value);
            
            if (isNaN(userPressure) || userPressure <= 0) {
                if (elements.answerFeedback) {
                    elements.answerFeedback.textContent = "Пожалуйста, введите корректное положительное значение давления.";
                    elements.answerFeedback.className = "feedback error";
                }
                return;
            }
        }
        
        const l1 = this.experimentState.initialAirColumnLength;
        const l2 = this.experimentState.finalAirColumnLength;
        const h = this.experimentState.waterLevelDifference;
        
        if (l1 <= 0 || l2 <= 0 || h <= 0) return;
    
        const volumeChange = l2 - l1;
        if (volumeChange <= 0) {
            if (elements.answerFeedback) {
                elements.answerFeedback.textContent = "Ошибка в измерениях: воздушный столб должен уменьшиться при опускании воронки.";
                elements.answerFeedback.className = "feedback error";
            }
            return;
        }
        
        const waterDensity = 1000;
        const g = 9.81;
        const h_meters = h / 100;
        const calculatedPressure = (waterDensity * g * h_meters * l2) / volumeChange / 133.3;
        
        if (!elements.userPressureInput) userPressure = calculatedPressure;
        
        this.experimentState.calculatedPressure = calculatedPressure;
        elements.pressureDisplay.textContent = calculatedPressure.toFixed(2);
        
        const barometerReading = parseFloat(elements.barometerDisplay.textContent);
        const userDifference = Math.abs(userPressure - calculatedPressure);
        const userPercentDifference = (userDifference / calculatedPressure) * 100;
        
        let resultMessage = "";
        let feedbackClass = "";
        
        if (userDifference < 50 && userPercentDifference <= 5) {
            resultMessage = `Отлично! Ваш ответ (${userPressure.toFixed(2)} мм рт.ст.) ` +
                            `близок к расчетному значению (${calculatedPressure.toFixed(2)} мм рт.ст.). ` +
                            `Показания барометра: ${barometerReading} мм рт.ст.`;
            feedbackClass = "success";
        } else if (userDifference < 100 && userPercentDifference <= 10) {
            resultMessage = `Хорошо! Ваш ответ (${userPressure.toFixed(2)} мм рт.ст.) ` +
                            `имеет допустимую погрешность от расчетного значения (${calculatedPressure.toFixed(2)} мм рт.ст.). ` +
                            `Показания барометра: ${barometerReading} мм рт.ст.`;
            feedbackClass = "success";
        } else {
            resultMessage = `Ваш ответ (${userPressure.toFixed(2)} мм рт.ст.) ` +
                            `значительно отличается от расчетного значения (${calculatedPressure.toFixed(2)} мм рт.ст.). ` +
                            `Проверьте правильность вычислений по формуле: P_атм = (ρgh × l₂) / (l₂ - l₁)`;
            feedbackClass = "error";
        }
        
        if (elements.answerFeedback) {
            elements.answerFeedback.textContent = resultMessage;
            elements.answerFeedback.className = `feedback ${feedbackClass}`;
        }
        
        elements.currentInstruction.textContent = resultMessage;
        feedbackClass === "success" ?
            elements.currentInstruction.classList.add('success') : 
            elements.currentInstruction.classList.add('warning');
        
        if (elements.userPressureInput) {
            elements.userPressureInput.disabled = true;
            elements.userPressureInput.classList.add(feedbackClass === "success" ? "input-valid" : "input-invalid");
        }
        
        if (elements.submitButton) elements.submitButton.disabled = true;
        
        this.experimentState.calculationDone = true;
    },
    
    updateBarometerReadingBasedOnWaterLevel(elements) {
        if (!this.experimentState.corkInserted) return;
        
        const airHeight = 100 - parseFloat(elements.tubeWater.style.height || '0');
        const volumeRatio = this.experimentState.initialAirVolume / airHeight;
        const newBarometerReading = Math.round(this.experimentState.initialBarometerReading * volumeRatio);

        this.experimentState.currentBarometerReading = newBarometerReading;
        elements.barometerDisplay.textContent = newBarometerReading.toFixed(0);
        this.updateBarometerNeedle(newBarometerReading);
    },
    
    checkFullConnection(elements) {
        if (this.experimentState.rubberTubeConnectedToGlassTube && 
            this.experimentState.rubberTubeConnectedToFunnel && 
            !this.experimentState.systemConnected) {
            
            this.experimentState.systemConnected = true;
            
            if (this.experimentState.step === 1) {
                this.experimentState.waterFilled = true;
                this.experimentState.waterInRubberTube = true;
                this.experimentState.waterInFunnel = true;
                this.experimentState.waterInTube = true;
                
                this.updateWaterLevels(elements);
                
                this.advanceToStep(2, elements);
                elements.currentInstruction.textContent = 
                    "Теперь установите воронку так, чтобы уровень воды в трубке был на 50 см от верхнего конца";
            }   
            return true;
        }
        return false;
    },
    
    updateBarometerNeedle(value) {
        const minValue = 600;
        const maxValue = 900;
        const lowPressureAngle = 140;
        const highPressureAngle = 220;
        const percentage = (value - minValue) / (maxValue - minValue);
        const angle = lowPressureAngle + percentage * (highPressureAngle - lowPressureAngle);
        const needle = document.querySelector('.barometer-needle');
        
        if(needle) needle.style.transform = `translate(0, -50%) rotate(${angle}deg)`;
    },
    
    setupTooltips() {
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip';
        tooltip.className = 'tooltip';
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
};

export default experimentFunctions;