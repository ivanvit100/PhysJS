const experimentFunctions = {
    experimentState: {
        step: 1,
        oscilloscopePowered: false,
        beamConfigured: false,
        micConnected: false,
        maxGainSet: false,
        tuningForkPositioned: false,
        tuningForkStruck: false,
        waveformStable: false,
        measurementTaken: false,
        beamAmplitude: 0,
        gainCoefficient: 0.1,
        voltageAmplitude: 0,
        correctVoltageAmplitude: 0.35,
        
        brightness: 0,
        focus: 0,
        hPosition: 50,
        vPosition: 50,
        yGain: 0, 
        timebase: 0,
        amplificationValue: 0,
        timebaseValue: 0,
        
        wireId: null,
        
        lastRenderTime: 0,
        renderInterval: 20,
        waveformVisible: false,
        waveformAmplitude: 0,
        waveformFrequency: 440,
        waveformDecay: 0,
        tuningForkSound: null,
        
        isDragging: false,
        draggedElement: null
    },
    
    initializeExperiment() {
        physjs.setRotationKeysEnabled(false);
        this.setupEventHandlers();
        
        document.getElementById('gain-coefficient').textContent = this.experimentState.gainCoefficient.toFixed(2);
        document.getElementById('beam-amplitude').textContent = '-';
        document.getElementById('voltage-amplitude').textContent = '-';
        document.getElementById('voltage-calculator').style.display = 'none';
        
        const screen = document.querySelector('.screen');
        const beamDot = document.querySelector('.beam-dot');
        const waveform = document.querySelector('.waveform');
        
        if (screen && beamDot && waveform) {
            beamDot.style.display = 'none';
            waveform.style.display = 'none';
            screen.classList.add('screen-off');
        }
        
        this.updateExperimentStep(1);
        this.updateInstructions("Включите осциллограф двойным щелчком по кнопке питания и настройте луч с помощью ручек управления.");
    },
    
    setupPhysicsObjects() {
        physjs.detachAll();
        
        const objects = [
            { selector: '#oscilloscope', type: 'oscilloscope' },
            { selector: '#microphone', type: 'microphone' },
            { selector: '#tuning-fork', type: 'tuning-fork' },
            { selector: '#hammer', type: 'hammer' },
            { selector: '#cable', type: 'cable' },
            { selector: '#ruler', type: 'ruler' }
        ];
        
        objects.forEach(obj => {
            const element = document.querySelector(obj.selector);
            element && physjs.createObject(obj.selector, { type: obj.type });
        });
    },
    
    setupEventHandlers() {
        const state = this.experimentState;
        
        // Обработчик для молотка
        const hammer = document.getElementById('hammer');
        if (hammer) {
            // Удаляем старые обработчики
            hammer.removeEventListener('dblclick', hammer._dblclickHandler);
            hammer.removeEventListener('mousedown', hammer._mousedownHandler);
            
            // Добавляем новый обработчик двойного клика
            hammer._dblclickHandler = (e) => {
                e.stopPropagation();
                
                const tuningFork = document.getElementById('tuning-fork');
                if (!tuningFork) return;
                
                // Проверяем расстояние между молотком и камертоном
                const hammerRect = hammer.getBoundingClientRect();
                const forkRect = tuningFork.getBoundingClientRect();
                
                // Используем расстояние между верхней частью молотка и верхней частью камертона
                const hammerTop = hammerRect.top;
                const forkTop = forkRect.top;
                const verticalDistance = Math.abs(hammerTop - forkTop);
                
                const hammerLeft = hammerRect.left + hammerRect.width/2;
                const forkLeft = forkRect.left + forkRect.width/2;
                const horizontalDistance = Math.abs(hammerLeft - forkLeft);
                
                // Проверяем, находится ли молоток достаточно близко к камертону
                const isClose = verticalDistance < 100 && horizontalDistance < 100;
                
                if (isClose && state.step >= 3 && state.tuningForkPositioned) {
                    // Вызываем функцию удара по камертону
                    this.strikeTheTuningFork();
                }
            };
            
            // Добавляем обработчик перетаскивания
            hammer._mousedownHandler = (e) => {
                e.stopPropagation();
                state.isDragging = true;
                state.draggedElement = hammer;
            };
            
            hammer.addEventListener('dblclick', hammer._dblclickHandler);
            hammer.addEventListener('mousedown', hammer._mousedownHandler);
        }
        
        // Обработчик для линейки
        const ruler = document.getElementById('ruler');
        if (ruler) {
            // Удаляем старые обработчики
            ruler.removeEventListener('dblclick', ruler._dblclickHandler);
            ruler.removeEventListener('mousedown', ruler._mousedownHandler);
            
            // Добавляем новый обработчик двойного клика
            ruler._dblclickHandler = (e) => {
                e.stopPropagation();
                
                const screen = document.querySelector('.screen');
                if (!screen) return;
                
                // Проверяем пересечение линейки и экрана
                const rulerRect = ruler.getBoundingClientRect();
                const screenRect = screen.getBoundingClientRect();
                
                // Проверяем пересечение прямоугольников
                const isIntersecting = !(
                    rulerRect.right < screenRect.left ||
                    rulerRect.left > screenRect.right ||
                    rulerRect.bottom < screenRect.top ||
                    rulerRect.top > screenRect.bottom
                );
                
                if (isIntersecting && state.step === 4 && state.waveformStable) {
                    // Вызываем функцию измерения
                    this.takeMeasurement();
                }
            };
            
            // Добавляем обработчик перетаскивания
            ruler._mousedownHandler = (e) => {
                e.stopPropagation();
                state.isDragging = true;
                state.draggedElement = ruler;
            };
            
            ruler.addEventListener('dblclick', ruler._dblclickHandler);
            ruler.addEventListener('mousedown', ruler._mousedownHandler);
        }
        
        // Обработчик для осциллографа
        const oscilloscope = document.getElementById('oscilloscope');
        if (oscilloscope) {
            // Удаляем старый обработчик
            oscilloscope.removeEventListener('dblclick', oscilloscope._dblclickHandler);
            
            // Добавляем новый обработчик двойного клика
            oscilloscope._dblclickHandler = (e) => {
                e.stopPropagation();
                const powerButton = document.getElementById('power-button');
                
                // Проверяем, был ли клик по кнопке питания
                if (powerButton) {
                    const rect = powerButton.getBoundingClientRect();
                    const isClickOnButton = (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                    );
                    
                    if (isClickOnButton) {
                        this.toggleOscilloscope();
                    }
                }
            };
            
            oscilloscope.addEventListener('dblclick', oscilloscope._dblclickHandler);
        }
        
        // Общие обработчики
        document.addEventListener('mousemove', (e) => {
            this.handleDragMove(e);
        });
        
        document.addEventListener('mouseup', () => {
            state.isDragging = false;
            state.draggedElement = null;
            state.knobBeingRotated = null;
        });
        
        // Обработчики для ручек управления
        const controls = document.querySelectorAll('.control-knob');
        controls.forEach(control => {
            control.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startKnobRotation(control);
            });
            
            control.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.handleControlInteraction(control);
            });
        });
        
        document.getElementById('check-amplitude').addEventListener('click', () => {
            this.checkVoltageCalculation();
        });
    },
    
    handleConnection(fromId, toId) {
        const state = this.experimentState;
        
        if ((fromId === 'mic-output' && toId === 'y-input') || 
            (fromId === 'y-input' && toId === 'mic-output')) {
            
            state.micConnected = true;
            
            if (state.yGain > 90) 
                state.maxGainSet = true;
            
            const wires = physjs.getAllWires();
            if (wires && wires.length > 0)
                state.wireId = wires[wires.length - 1];
            
            const micOutput = document.querySelector('#microphone .output-connector');
            micOutput && micOutput.classList.add('connected');
            
            this.checkExperimentConditions();
        }
    },

    // Обновляем функцию проверки для dragMove
    handleDragMove(e) {
        const now = performance.now();
        const state = this.experimentState;
        
        if (now - state.lastRenderTime > state.renderInterval && state.isDragging) {
            state.lastRenderTime = now;
            
            if (state.draggedElement) {
                // Камертон рядом с микрофоном
                if (state.draggedElement.id === 'tuning-fork' && state.step >= 3) {
                    const microphone = document.getElementById('microphone');
                    if (microphone) {
                        const forkRect = state.draggedElement.getBoundingClientRect();
                        const micRect = microphone.getBoundingClientRect();
                        
                        // Расстояние между центрами
                        const distance = Math.sqrt(
                            Math.pow((forkRect.left + forkRect.width/2) - (micRect.left + micRect.width/2), 2) +
                            Math.pow((forkRect.top + forkRect.height/2) - (micRect.top + micRect.height/2), 2)
                        );
                        
                        state.tuningForkPositioned = distance < 100;
                        
                        // Визуальная обратная связь
                        if (state.tuningForkPositioned) {
                            state.draggedElement.classList.add('positioned');
                        } else {
                            state.draggedElement.classList.remove('positioned');
                        }
                        
                        this.checkExperimentConditions();
                    }
                }
                
                // Линейка над экраном
                if (state.draggedElement.id === 'ruler' && state.step === 4) {
                    const screen = document.querySelector('.screen');
                    if (screen) {
                        const rulerRect = state.draggedElement.getBoundingClientRect();
                        const screenRect = screen.getBoundingClientRect();
                        
                        // Проверяем пересечение
                        const isIntersecting = !(
                            rulerRect.right < screenRect.left ||
                            rulerRect.left > screenRect.right ||
                            rulerRect.bottom < screenRect.top ||
                            rulerRect.top > screenRect.bottom
                        );
                        
                        if (isIntersecting) {
                            state.draggedElement.classList.add('measurement-ready');
                        } else {
                            state.draggedElement.classList.remove('measurement-ready');
                        }
                    }
                }
                
                // Молоток рядом с камертоном
                if (state.draggedElement.id === 'hammer' && state.step >= 3) {
                    const tuningFork = document.getElementById('tuning-fork');
                    if (tuningFork) {
                        const hammerRect = state.draggedElement.getBoundingClientRect();
                        const forkRect = tuningFork.getBoundingClientRect();
                        
                        // Расстояние между центрами
                        const distance = Math.sqrt(
                            Math.pow((hammerRect.left + hammerRect.width/2) - (forkRect.left + forkRect.width/2), 2) +
                            Math.pow((hammerRect.top + hammerRect.height/2) - (forkRect.top + forkRect.height/2), 2)
                        );
                        
                        if (distance < 100) {
                            state.draggedElement.classList.add('hammer-ready');
                        } else {
                            state.draggedElement.classList.remove('hammer-ready');
                        }
                    }
                }
            }
        }
    },
    
    updateRulerPosition(e) {
        const ruler = document.getElementById('ruler');
        const screen = document.querySelector('.screen');
        const waveform = document.querySelector('.waveform');
        
        if (ruler && screen && waveform) {
            const rulerRect = ruler.getBoundingClientRect();
            const screenRect = screen.getBoundingClientRect();
            
            const overlapWithScreen = !(
                rulerRect.right < screenRect.left ||
                rulerRect.left > screenRect.right ||
                rulerRect.bottom < screenRect.top ||
                rulerRect.top > screenRect.bottom
            );
            
            overlapWithScreen ?
                ruler.classList.add('measurement-ready') :
                ruler.classList.remove('measurement-ready');
        }
    },
    
    startKnobRotation(knob) {
        this.experimentState.knobBeingRotated = knob;
        
        const moveHandler = (e) => {
            if (this.experimentState.knobBeingRotated === knob) {
                const knobRect = knob.getBoundingClientRect();
                const knobCenterX = knobRect.left + knobRect.width / 2;
                const knobCenterY = knobRect.top + knobRect.height / 2;        
                const angle = Math.atan2(e.clientY - knobCenterY, e.clientX - knobCenterX) * 180 / Math.PI;
                
                let rotation = Math.max(-135, Math.min(135, angle));
                const normalizedValue = (rotation + 135) / 270 * 100;
                
                knob.style.transform = `rotate(${rotation}deg)`;
                this.updateControlValue(knob.dataset.control, normalizedValue);
            }
        };
        
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            this.experimentState.knobBeingRotated = null;
        };
        
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    },
    
    updateControlValue(control, value) {
        const state = this.experimentState;
        
        switch (control) {
            case 'brightness':
                state.brightness = value;
                this.updateBeamAppearance();
                break;
            case 'focus':
                state.focus = value;
                this.updateBeamAppearance();
                break;
            case 'h-position':
                state.hPosition = value;
                this.updateBeamPosition();
                break;
            case 'v-position':
                state.vPosition = value;
                this.updateBeamPosition();
                break;
            case 'y-gain':
                state.yGain = value;
                state.amplificationValue = (value / 100) * 5;
                this.updateWaveformAppearance();
                break;
            case 'timebase':
                state.timebase = value;
                state.timebaseValue = 1 + (value / 100) * 9;
                state.waveformStable = Math.abs(value - 60) < 20;
                this.updateWaveformAppearance();
                break;
        }
        this.updateOscilloscopeDisplay();
        this.checkBeamConfiguration();
        this.checkExperimentConditions();
    },
    
    handleElementInteraction(element) {
        const state = this.experimentState;
        
        switch (element.id) {
            case 'oscilloscope':
                const powerButton = document.getElementById('power-button');
                if (powerButton && this.isClickOnElement(event, powerButton)) {
                    this.toggleOscilloscope();
                }
                break;
                
            case 'hammer':
                // Проверяем, пересекается ли молоток с камертоном
                const hammer = document.getElementById('hammer');
                const tuningFork = document.getElementById('tuning-fork');
                
                // Строгая проверка пересечений с порогом
                if (hammer && tuningFork) {
                    const rect1 = hammer.getBoundingClientRect();
                    const rect2 = tuningFork.getBoundingClientRect();
                    
                    // Центр молотка
                    const hammerCenterX = rect1.left + rect1.width / 2;
                    const hammerCenterY = rect1.top + rect1.height / 2;
                    
                    // Центр камертона
                    const forkCenterX = rect2.left + rect2.width / 2;
                    const forkCenterY = rect2.top + rect2.height / 2;
                    
                    // Вычисляем расстояние между центрами
                    const distance = Math.sqrt(
                        Math.pow(hammerCenterX - forkCenterX, 2) + 
                        Math.pow(hammerCenterY - forkCenterY, 2)
                    );
                    
                    // Если центры достаточно близко, считаем что есть пересечение
                    const thresholdDistance = (rect1.width + rect2.width) / 4;
                    const isIntersecting = distance < thresholdDistance;
                    
                    if (isIntersecting && state.step >= 3 && state.tuningForkPositioned) {
                        this.strikeTheTuningFork();
                        return; // Важно: прерываем выполнение после срабатывания
                    }
                }
                break;
                
            case 'ruler':
                // Проверяем, пересекается ли линейка с экраном
                const ruler = document.getElementById('ruler');
                const screen = document.querySelector('.screen');
                
                if (ruler && screen) {
                    const isIntersecting = this.elementsIntersect(ruler, screen);
                    
                    if (isIntersecting && state.step === 4 && state.waveformStable) {
                        this.takeMeasurement();
                    }
                }
                break;
        }
    },

    elementsIntersect(elem1, elem2) {
        if (!elem1 || !elem2) return false;
        
        const rect1 = elem1.getBoundingClientRect();
        const rect2 = elem2.getBoundingClientRect();
        return !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
        );
    },

    isClickOnElement(event, element) {
        const rect = element.getBoundingClientRect();
        return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
        );
    },
    
    handleControlInteraction(control) {
        const state = this.experimentState;
        const controlType = control.dataset.control;
        
        if (controlType === 'power') {
            this.toggleOscilloscope();
            return;
        } 
        
        if (!state.oscilloscopePowered) return;
        
        let optimalValue = 0;
        
        switch (controlType) {
            case 'brightness':
            case 'focus':
                optimalValue = 100;
                break;
            case 'h-position':
            case 'v-position':
                optimalValue = 50;
                break;
            case 'y-gain':
                optimalValue = 100;
                break;
            case 'timebase':
                optimalValue = 60;
                break;
        }
        
        control.style.transform = `rotate(${-135 + optimalValue * 270 / 100}deg)`;
        
        switch (controlType) {
            case 'brightness':
                state.brightness = optimalValue;
                break;
            case 'focus':
                state.focus = optimalValue;
                break;
            case 'h-position':
                state.hPosition = optimalValue;
                break;
            case 'v-position':
                state.vPosition = optimalValue;
                break;
            case 'y-gain':
                state.yGain = optimalValue;
                state.amplificationValue = (optimalValue / 100) * 5;
                break;
            case 'timebase':
                state.timebase = optimalValue;
                state.timebaseValue = 1 + (optimalValue / 100) * 9;
                state.waveformStable = true;
                break;
        }
        
        this.checkBeamConfiguration();
        this.updateBeamPosition();
        this.updateBeamAppearance();
        this.updateWaveformAppearance();
        this.updateOscilloscopeDisplay();
        this.checkExperimentConditions();
    },

    toggleOscilloscope() {
        const state = this.experimentState;
        const oscilloscope = document.getElementById('oscilloscope');
        const screen = document.querySelector('.screen');
        const beamDot = document.querySelector('.beam-dot');
        const powerIndicator = document.querySelector('.power-indicator');
        
        if (!oscilloscope || !screen || !beamDot || !powerIndicator) return;
    
        state.oscilloscopePowered = !state.oscilloscopePowered;
        
        if (state.oscilloscopePowered) {
            oscilloscope.classList.add('powered');
            screen.classList.remove('screen-off');
            screen.classList.add('screen-on');
            beamDot.style.display = 'block';
            powerIndicator.classList.add('on');
            
            if (!screen.querySelector('.screen-grid')) {
                const gridElement = document.createElement('div');
                gridElement.className = 'screen-grid';
                gridElement.style.position = 'absolute';
                gridElement.style.top = '0';
                gridElement.style.left = '0';
                gridElement.style.width = '100%';
                gridElement.style.height = '100%';
                gridElement.style.opacity = '1';
                gridElement.style.zIndex = '1';
                screen.appendChild(gridElement);
            } else {
                const gridElement = screen.querySelector('.screen-grid');
                gridElement.style.opacity = '1';
            }
            this.updateBeamPosition();
            this.updateBeamAppearance();
            this.updateOscilloscopeDisplay();
        } else {
            oscilloscope.classList.remove('powered');
            screen.classList.remove('screen-on');
            screen.classList.add('screen-off');
            beamDot.style.display = 'none';
            
            const gridElement = screen.querySelector('.screen-grid');
            if (gridElement)
                gridElement.style.opacity = '0';
            
            const waveform = document.querySelector('.waveform');
            if (waveform)
                waveform.style.display = 'none';
            
            powerIndicator.classList.remove('on');
            
            state.beamConfigured = false;
            state.waveformStable = false;
            state.waveformVisible = false;
        }
        
        this.checkExperimentConditions();
    },
    
    checkBeamConfiguration() {
        const state = this.experimentState;
        
        if (!state.oscilloscopePowered) return false;
        
        const brightnessFocusOk = state.brightness > 60 && state.focus > 60;
        const positionOk = 
            Math.abs(state.hPosition - 50) < 20 && 
            Math.abs(state.vPosition - 50) < 20;
        
        state.beamConfigured = brightnessFocusOk && positionOk;
        
        return state.beamConfigured;
    },
    
    updateBeamPosition() {
        const state = this.experimentState;
        const beamDot = document.querySelector('.beam-dot');
        const waveform = document.querySelector('.waveform');
        
        if (!beamDot || !state.oscilloscopePowered) return;
        
        beamDot.style.left = `${state.hPosition}%`;
        beamDot.style.top = `${state.vPosition}%`;
        
        if (waveform && state.waveformVisible)
            waveform.style.top = `${state.vPosition}%`;
    },
    
    updateBeamAppearance() {
        const state = this.experimentState;
        const beamDot = document.querySelector('.beam-dot');
        
        if (!beamDot || !state.oscilloscopePowered) return;
        
        const brightnessValue = Math.max(0, Math.min(100, state.brightness));
        const alpha = brightnessValue / 100;
        const focusValue = Math.max(0, Math.min(100, state.focus));
        const dotSize = 10 - (focusValue / 100) * 8;

        beamDot.style.opacity = alpha;
        beamDot.style.width = `${dotSize}px`;
        beamDot.style.height = `${dotSize}px`;
        beamDot.style.boxShadow = `0 0 ${5 + (brightnessValue / 20)}px rgba(0, 255, 0, ${alpha})`;
    },
    
    strikeTheTuningFork() {
        const state = this.experimentState;
        const tuningFork = document.getElementById('tuning-fork');
        const fork = tuningFork.querySelector('.fork-tines');
        
        if (!tuningFork || !fork) return;
        
        // Удаляем предыдущую анимацию
        fork.classList.remove('vibrating');
        fork.classList.remove('decay-vibration');
        void fork.offsetWidth; // Сброс анимации
        
        // Очищаем предыдущие таймеры, если они существуют
        if (state.forkAnimationTimer) {
            clearTimeout(state.forkAnimationTimer);
        }
        
        // Добавляем базовую анимацию вибрации
        fork.classList.add('vibrating');
        
        // Через 3 секунды, добавляем класс затухания
        state.forkAnimationTimer = setTimeout(() => {
            fork.classList.add('decay-vibration');
        }, 3000);
        
        // Планируем постепенное замедление анимации
        const decayStart = 3000;
        const decayDuration = 10000;
        const startTime = Date.now();
        let animationFrameId = null;
        
        function updateForkAnimation() {
            const now = Date.now();
            const elapsed = now - startTime;
            
            if (elapsed > decayStart) {
                const decayProgress = Math.min(1, (elapsed - decayStart) / decayDuration);
                
                // Постепенно увеличиваем длительность анимации
                const newDuration = 0.8 + decayProgress * 2; // от 0.8s до 2.8s
                fork.style.animationDuration = `${newDuration}s`;
                
                // Постепенно уменьшаем интенсивность колебаний
                const intensity = Math.max(0.05, 1 - decayProgress);
                fork.style.animationPlayState = intensity < 0.1 ? 'paused' : 'running';
                
                if (decayProgress >= 1) {
                    // Останавливаем анимацию, когда затухание завершено
                    fork.classList.remove('vibrating');
                    fork.classList.remove('decay-vibration');
                    fork.style.transform = 'transformX(-50%) rotate(0deg)'; // Возвращаем в исходное положение
                    fork.style.animationDuration = '';
                    
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                    }
                    return;
                }
            }
            
            animationFrameId = requestAnimationFrame(updateForkAnimation);
        }
        
        animationFrameId = requestAnimationFrame(updateForkAnimation);
        
        state.tuningForkStruck = true;
        
        // Показываем осциллограмму, если микрофон подключен и осциллограф включен
        if (state.micConnected && state.oscilloscopePowered) {
            this.showWaveform();
        }
        
        // Устанавливаем таймер для полной остановки через 13 секунд
        setTimeout(() => {
            if (fork.classList.contains('vibrating')) {
                fork.classList.remove('vibrating');
                fork.classList.remove('decay-vibration');
                fork.style.transform = 'translateX(-50%) rotate(0deg)';
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
            }
        }, decayStart + decayDuration);
        
        this.checkExperimentConditions();
    },
    
    showWaveform() {
        const state = this.experimentState;
        const screen = document.querySelector('.screen');
        
        if (!screen || !state.oscilloscopePowered) return;
        
        // Удаляем старую осциллограмму
        let waveform = document.querySelector('.waveform');
        if (waveform) {
            waveform.remove();
        }
        
        // Создаем новый элемент для осциллограммы
        waveform = document.createElement('div');
        waveform.className = 'waveform';
        waveform.style.position = 'absolute';
        waveform.style.left = '0';
        waveform.style.top = '0';
        waveform.style.width = '100%';
        waveform.style.height = '100%';
        waveform.style.zIndex = '5';
        waveform.style.pointerEvents = 'none';
        waveform.style.display = 'block';
        
        screen.appendChild(waveform);
        
        // Рассчитываем параметры осциллограммы
        const yGainFactor = state.yGain / 100;
        const yAmplitude = 30 * yGainFactor;
        state.waveformAmplitude = yAmplitude;
        state.beamAmplitude = yAmplitude / 100 * screen.offsetHeight;
        
        // Создаем SVG для отрисовки осциллограммы
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.position = "absolute";
        svg.style.left = "0";
        svg.style.top = "0";
        
        // Создаем линию осциллограммы
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "rgb(0, 255, 0)");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("filter", "drop-shadow(0 0 3px rgba(0, 255, 0, 0.8))");
        svg.appendChild(path);
        
        waveform.appendChild(svg);
        
        // Определяем стабильность осциллограммы
        state.waveformStable = Math.abs(state.timebase - 60) < 20;
        
        // Настраиваем скорость анимации и параметры отображения
        const timebaseFactor = state.timebase / 100;
        
        // Если осциллограмма не стабильна, добавляем эффекты размытия и двоения
        if (!state.waveformStable) {
            const blurAmount = Math.min(3, Math.abs(state.timebase - 60) / 10);
            path.setAttribute("filter", `drop-shadow(0 0 3px rgba(0, 255, 0, 0.8)) blur(${blurAmount}px)`);
            
            // Добавляем эффект двоения
            const pathClone = path.cloneNode(true);
            const offset = (state.timebase > 60) ? 5 : -5;
            pathClone.setAttribute("transform", `translate(${offset}, 0)`);
            pathClone.setAttribute("opacity", "0.5");
            svg.appendChild(pathClone);
            
            // Добавляем эффект дрожания
            const jitterAmount = Math.min(5, Math.abs(state.timebase - 60) / 8);
            waveform.style.animation = `oscilloscope-jitter ${0.1}s infinite alternate`;
            
            // Добавляем стиль для анимации дрожания
            let jitterStyle = document.getElementById('jitter-style');
            if (!jitterStyle) {
                jitterStyle = document.createElement('style');
                jitterStyle.id = 'jitter-style';
                document.head.appendChild(jitterStyle);
            }
            jitterStyle.textContent = `
                @keyframes oscilloscope-jitter {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(${jitterAmount}px); }
                }
            `;
        }
        
        // Обновляем класс экрана в зависимости от стабильности
        if (state.waveformStable) {
            screen.classList.add('stable-waveform');
        } else {
            screen.classList.remove('stable-waveform');
        }
        
        // Активируем отображение осциллограммы
        state.waveformVisible = true;
        
        // Параметры для создания синусоиды
        const points = 200;
        const screenHeight = screen.offsetHeight;
        const amplitude = (yAmplitude / 100) * screenHeight / 4;
        const frequency = 4;
        const centerY = screenHeight * (state.vPosition / 100);
        const speed = 0.05 * (1 - timebaseFactor * 0.5);
        
        // Начальные параметры затухания и позиции
        state.initialAmplitude = amplitude;
        state.currentAmplitude = amplitude;
        let position = 0;
        
        // Параметры затухания
        const decayStart = 3000; // начало затухания (мс)
        const decayDuration = 10000; // длительность затухания (мс)
        const minAmplitude = amplitude * 0.05; // минимальная амплитуда (5% от начальной)
        let startTime = Date.now();
        let animationId = null;
        
        // Функция анимации осциллограммы
        function animate() {
            if (!state.waveformVisible) {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
                return;
            }
            
            const now = Date.now();
            const elapsed = now - startTime;
            
            // Расчет текущей амплитуды с затуханием
            if (elapsed > decayStart) {
                const decayProgress = Math.min(1, (elapsed - decayStart) / decayDuration);
                state.currentAmplitude = state.initialAmplitude * Math.max(0.05, 1 - decayProgress);
                
                // Проверяем, достигла ли амплитуда минимального значения
                if (state.currentAmplitude <= minAmplitude) {
                    // Создаем финальную прямую линию (горизонтальную)
                    let d = `M 0,${centerY} L ${screen.offsetWidth},${centerY}`;
                    path.setAttribute("d", d);
                    
                    // Обновляем клон пути, если он есть
                    const pathClone = svg.querySelector("path:nth-child(2)");
                    if (pathClone) {
                        pathClone.setAttribute("d", d);
                    }
                    
                    // Останавливаем анимацию
                    if (animationId) {
                        cancelAnimationFrame(animationId);
                    }
                    
                    // Удаляем дрожание, если есть
                    waveform.style.animation = 'none';
                    return;
                }
            }
            
            position += speed;
            
            // Создаем путь синусоиды
            let d = `M 0,${centerY} `;
            
            for (let i = 0; i <= points; i++) {
                const x = (i / points) * screen.offsetWidth;
                const phase = position + (i / points) * Math.PI * 2 * frequency;
                const y = centerY + Math.sin(phase) * state.currentAmplitude;
                d += `L ${x},${y} `;
            }
            
            // Обновляем путь осциллограммы
            path.setAttribute("d", d);
            
            // Обновляем клон пути, если он есть
            const pathClone = svg.querySelector("path:nth-child(2)");
            if (pathClone) {
                pathClone.setAttribute("d", d);
            }
            
            // Продолжаем анимацию
            animationId = requestAnimationFrame(animate);
        }
        
        // Запускаем анимацию
        animationId = requestAnimationFrame(animate);
        
        this.checkExperimentConditions();
    },
    
    updateWaveformAppearance() {
        const state = this.experimentState;
        state.waveformVisible && state.tuningForkStruck && this.showWaveform();
    },
    
    takeMeasurement() {
        const state = this.experimentState;
        const ruler = document.getElementById('ruler');
        const screen = document.querySelector('.screen');
        
        if (!ruler || !screen || !state.waveformStable) return;
        
        const beamAmplitudePx = state.beamAmplitude;
        const pxToMm = 0.26458;
        const beamAmplitudeMm = Math.round(beamAmplitudePx * pxToMm * 10) / 10;
        const voltageAmplitude = beamAmplitudeMm * state.gainCoefficient;
        
        state.beamAmplitude = beamAmplitudeMm;
        state.voltageAmplitude = Math.round(voltageAmplitude * 100) / 100;
        
        document.getElementById('beam-amplitude').textContent = state.beamAmplitude.toFixed(1);
        document.getElementById('voltage-amplitude').textContent = state.voltageAmplitude.toFixed(2);
        
        ruler.classList.add('reading-taken');
        setTimeout(() => {
            ruler.classList.remove('reading-taken');
        }, 1000);
        
        state.measurementTaken = true;
        
        document.getElementById('voltage-calculator').style.display = 'block';
        this.checkExperimentConditions();
    },
    
    checkVoltageCalculation() {
        const state = this.experimentState;
        const inputElement = document.getElementById('amplitude-input');
        const resultElement = document.getElementById('amplitude-result');
        
        if (!inputElement || !resultElement) return;
        
        const userValue = parseFloat(inputElement.value);
        
        if (isNaN(userValue)) {
            resultElement.textContent = 'Пожалуйста, введите числовое значение';
            resultElement.className = 'error-message';
            return;
        }
        
        const errorMargin = state.voltageAmplitude * 0.05;
        const isCorrect = Math.abs(userValue - state.voltageAmplitude) <= errorMargin;
        
        if (isCorrect) {
            resultElement.textContent = 'Правильно! Ваш расчет совпадает с измеренным значением.';
            resultElement.className = 'success-message';
            
            if (state.step === 4) {
                setTimeout(() => {
                    alert('Поздравляем! Вы успешно выполнили лабораторную работу.');
                }, 1000);
            }
        } else {
            resultElement.textContent = 'Неверно. Проверьте ваши расчеты и попробуйте снова.';
            resultElement.className = 'error-message';
        }
    },

    updateOscilloscopeDisplay() {
        const screen = document.querySelector('.screen');
        if (!screen) return;
        
        const oldValues = screen.querySelectorAll('.oscilloscope-value');
        oldValues.forEach(el => el.remove());
        
        let valuesContainer = screen.querySelector('.oscilloscope-values');
        if (!valuesContainer) {
            valuesContainer = document.createElement('div');
            valuesContainer.className = 'oscilloscope-values';
            valuesContainer.style.position = 'absolute';
            valuesContainer.style.bottom = '10px';
            valuesContainer.style.right = '10px';
            valuesContainer.style.color = 'rgba(0, 255, 0, 0.8)';
            valuesContainer.style.fontFamily = 'monospace';
            valuesContainer.style.fontSize = '12px';
            valuesContainer.style.zIndex = '3';
            valuesContainer.style.textAlign = 'right';
            valuesContainer.style.pointerEvents = 'none';
            screen.appendChild(valuesContainer);
        }
        
        const state = this.experimentState;
        const amplification = state.amplificationValue || 1;
        const timebase = state.timebaseValue || 1;
        
        const ampValue = document.createElement('div');
        ampValue.className = 'oscilloscope-value';
        ampValue.textContent = `Y: ${amplification.toFixed(1)} В/дел`;
        ampValue.style.marginBottom = '5px';
        ampValue.style.textShadow = '0 0 2px rgba(0, 255, 0, 0.8)';
        valuesContainer.appendChild(ampValue);
        
        const timeValue = document.createElement('div');
        timeValue.className = 'oscilloscope-value';
        timeValue.textContent = `X: ${timebase.toFixed(1)} мс/дел`;
        timeValue.style.textShadow = '0 0 2px rgba(0, 255, 0, 0.8)';
        valuesContainer.appendChild(timeValue);
        
        valuesContainer.style.display = state.oscilloscopePowered ? 'block' : 'none';
    },
    
    checkExperimentConditions() {
        const state = this.experimentState;
        const currentStep = physjs.getCurrentStep();
        
        switch (currentStep.id) {
            case 'step1':
                if (state.oscilloscopePowered && state.beamConfigured) {
                    this.showStatusMessage("Осциллограф настроен. Перейдите к шагу 2.");
                    physjs.goToStep('step2');
                }
                break;
                
            case 'step2':
                if (state.oscilloscopePowered && state.micConnected) {
                    this.showStatusMessage("Микрофон подключен. Перейдите к шагу 3.");
                    physjs.goToStep('step3');
                    this.updateExperimentStep(3);
                }
                break;
                
            case 'step3':
                if (state.oscilloscopePowered && state.micConnected && 
                    state.tuningForkStruck && state.waveformStable) {
                    this.showStatusMessage("Звуковые колебания получены. Перейдите к шагу 4.");
                    physjs.goToStep('step4');
                    this.updateExperimentStep(4);
                }
                break;
                
            case 'step4':
                if (state.measurementTaken) {
                    this.showStatusMessage("Эксперимент завершен успешно!");
                }
                break;
        }
    },
    
    updateExperimentStep(step) {
        const state = this.experimentState;
        state.step = step;
        
        for (let i = 1; i <= 4; i++) {
            const stepElement = document.getElementById(`step${i}`);
            if (stepElement) {
                i === step ?
                    stepElement.classList.add('active') :
                    stepElement.classList.remove('active');
            }
        }
        
        let instructionText = '';
        
        switch (step) {
            case 1:
                instructionText = "Включите осциллограф двойным щелчком по кнопке питания и настройте луч с помощью ручек управления.";
                break;
            case 2:
                instructionText = "Подключите микрофон к входу Y осциллографа и установите максимальное усиление.";
                break;
            case 3:
                instructionText = "Поставьте камертон перед микрофоном и ударьте по нему молотком для получения звуковых колебаний.";
                break;
            case 4:
                instructionText = "Измерьте амплитуду вертикального отклонения луча и рассчитайте напряжение на выходе микрофона.";
                break;
        }
        
        this.updateInstructions(instructionText);
        physjs.goToStep(`step${step}`);
    },
    
    updateInstructions(text) {
        const instructionElement = document.getElementById('current-instruction');
        if (instructionElement) instructionElement.textContent = text;
    },
    
    showStatusMessage(message) {
        const statusElement = document.getElementById('status-message');
        if (statusElement) statusElement.textContent = message;
    },
    
    resetExperiment() {
        window.location.reload();
    }
};

export default experimentFunctions;