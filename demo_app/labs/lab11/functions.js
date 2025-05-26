const experimentFunctions = {
    experimentState: {
        step: 1,
        oscilloscopePowered: false,
        beamConfigured: false,
        micConnected: false,
        tuningForkPositioned: false,
        tuningForkStruck: false,
        waveformStable: false,
        measurementTaken: false,
        beamAmplitude: 0,
        gainCoefficient: 0,
        voltageAmplitude: 0,
        
        brightness: 0,
        focus: 0,
        hPosition: 50,
        vPosition: 50,
        yGain: 0, 
        timebase: 0,
        amplificationValue: 0,
        timebaseValue: 0,
        
        signalVoltageAmplitude: 5,
        tuningForkFrequency: 440,
        
        lastRenderTime: 0,
        renderInterval: 20,
        waveformVisible: false,
        isDragging: false,
        draggedElement: null,
        knobBeingRotated: null,
        forkAnimationTimer: null
    },
    
    initializeExperiment() {
        physjs.setRotationKeysEnabled(false);
        this.setupEventHandlers();
        
        this.updateDisplay('gain-coefficient', this.experimentState.gainCoefficient.toFixed(2));
        this.updateDisplay('beam-amplitude', '-');
        this.updateDisplay('voltage-amplitude', '-');
        this.updateDisplay('tuning-fork-frequency', `${this.experimentState.tuningForkFrequency} Гц`);
        
        document.getElementById('voltage-calculator').style.display = 'none';
        
        const screen = document.querySelector('.screen');
        const beamDot = document.querySelector('.beam-dot');
        
        if (screen && beamDot) {
            beamDot.style.display = 'none';
            screen.classList.add('screen-off');
        }
        
        this.updateExperimentStep(1);
    },

    updateDisplay(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    },

    updateControlValue(control, value) {
        const state = this.experimentState;
        
        switch (control) {
            case 'brightness':
            case 'focus':
                state[control] = value;
                this.updateBeamAppearance();
                this.updateWaveformVisualProperties();
                break;
            case 'h-position':
            case 'v-position':
                state[control.replace('-', '')] = value;
                this.updateBeamPosition();
                break;
            case 'y-gain':
                state.yGain = value;
                state.amplificationValue = (value / 100) * 5;
                state.gainCoefficient = state.amplificationValue / 10;
                this.updateDisplay('gain-coefficient', state.gainCoefficient.toFixed(2));
                this.updateWaveformAmplitude();
                break;
            case 'timebase':
                state.timebase = value;
                state.timebaseValue = this.calculateOptimalTimebase(state.tuningForkFrequency, value);
                state.waveformStable = Math.abs(value - 60) < 20;
                this.updateWaveformStability();
                break;
        }
        this.updateOscilloscopeDisplay();
        this.checkBeamConfiguration();
        this.checkExperimentConditions();
    },

    calculateOptimalTimebase(frequency, controlValue) {
        const periodsToShow = 2.5;
        const period = 1000 / frequency;
        const optimalTimebase = (period * periodsToShow) / 10;
        const scaleFactor = 0.5 + (controlValue / 100) * 1.5;
        return optimalTimebase * scaleFactor;
    },

    getVisualProperties() {
        const state = this.experimentState;
        const brightnessValue = Math.max(0, Math.min(100, state.brightness));
        const alpha = brightnessValue / 100;
        const focusValue = Math.max(0, Math.min(100, state.focus));
        const focusBlur = Math.max(0, (100 - focusValue) / 20);
        const glowIntensity = 3 + (brightnessValue / 20);
        const strokeWidth = Math.max(1, 2 - (focusBlur / 2));
        
        return { alpha, focusBlur, glowIntensity, strokeWidth };
    },

    showWaveform() {
        const state = this.experimentState;
        const screen = document.querySelector('.screen');
        
        if (!screen || !state.oscilloscopePowered) return;
        
        this.toggleElement('.beam-dot', 'none');
        
        let waveform = document.querySelector('.waveform');
        waveform && waveform.remove();
        
        waveform = this.createElement('div', 'waveform', {
            position: 'absolute',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            zIndex: '5',
            pointerEvents: 'none',
            display: 'block'
        });
        
        screen.appendChild(waveform);
        
        const amplificationValue = state.amplificationValue || 0.01;
        const deflectionInDiv = state.signalVoltageAmplitude / amplificationValue;
        const pixelsPerDiv = screen.offsetHeight / 8;
        const deflectionInPixels = deflectionInDiv * pixelsPerDiv;
        
        state.beamAmplitude = deflectionInPixels * 0.26458;
        
        const svg = this.createSVG();
        const { alpha, focusBlur, glowIntensity, strokeWidth } = this.getVisualProperties();
        
        const path = this.createSVGPath(alpha, strokeWidth, glowIntensity, focusBlur);
        svg.appendChild(path);
        waveform.appendChild(svg);
        
        state.waveformStable = Math.abs(state.timebase - 60) < 20;
        
        if (!state.waveformStable) {
            this.addInstabilityEffects(svg, path, alpha, focusBlur, glowIntensity, strokeWidth, waveform);
        }
        
        this.toggleClass(screen, 'stable-waveform', state.waveformStable);
        state.waveformVisible = true;
        
        this.startWaveformAnimation(screen, svg, path, deflectionInPixels, pixelsPerDiv);
        this.checkExperimentConditions();
    },

    createElement(tag, className, styles) {
        const element = document.createElement(tag);
        element.className = className;
        Object.assign(element.style, styles);
        return element;
    },

    createSVG() {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        
        Object.assign(svg.style, {
            position: "absolute",
            left: "0",
            top: "0"
        });
        return svg;
    },

    createSVGPath(alpha, strokeWidth, glowIntensity, focusBlur) {
        const svgNS = "http://www.w3.org/2000/svg";
        const path = document.createElementNS(svgNS, "path");
        this.setSVGPathAttributes(path, alpha, strokeWidth, glowIntensity, focusBlur);
        return path;
    },

    setSVGPathAttributes(path, alpha, strokeWidth, glowIntensity, focusBlur) {
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", `rgba(0, 255, 0, ${alpha})`);
        path.setAttribute("stroke-width", strokeWidth);
        path.setAttribute("filter", `drop-shadow(0 0 ${glowIntensity}px rgba(0, 255, 0, ${alpha * 0.8})) blur(${focusBlur}px)`);
        path.style.opacity = alpha;
    },

    addInstabilityEffects(svg, path, alpha, focusBlur, glowIntensity, strokeWidth, waveform) {
        const state = this.experimentState;
        const stabilityBlur = Math.min(3, Math.abs(state.timebase - 60) / 10);
        const totalBlur = Math.max(focusBlur, stabilityBlur);
        
        path.setAttribute("filter", `drop-shadow(0 0 ${glowIntensity}px rgba(0, 255, 0, ${alpha * 0.8})) blur(${totalBlur}px)`);
        
        const pathClone = path.cloneNode(true);
        const offset = (state.timebase > 60) ? 5 : -5;
        pathClone.setAttribute("transform", `translate(${offset}, 0)`);
        pathClone.setAttribute("opacity", alpha * 0.5);
        svg.appendChild(pathClone);
        
        const jitterAmount = Math.min(5, Math.abs(state.timebase - 60) / 8);
        waveform.style.animation = `oscilloscope-jitter ${0.1}s infinite alternate`;
        
        this.addJitterStyle(jitterAmount);
    },

    addJitterStyle(jitterAmount) {
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
    },

    startWaveformAnimation(screen, svg, path, deflectionInPixels, pixelsPerDiv) {
        const state = this.experimentState;
        const points = 200;
        const centerY = screen.offsetHeight * (state.vPosition / 100);
        const displayFrequency = 0.25;
        const speed = 0.05 * (state.tuningForkFrequency / 440) / Math.max(0.1, state.timebaseValue / 5);
        
        let position = 0;
        const decayStart = 3000;
        const decayDuration = 10000;
        const minAmplitude = deflectionInPixels * 0.05;
        const startTime = Date.now();
        const spatialDecayFactor = 0.1 + (state.tuningForkFrequency / 1000) * 0.1;
        
        const animate = () => {
            if (!state.waveformVisible) {
                this.toggleElement('.beam-dot', state.oscilloscopePowered ? 'block' : 'none');
                return;
            }
            
            const tuningFork = document.getElementById('tuning-fork');
            const fork = tuningFork?.querySelector('.fork-tines');
            const forkStillVibrating = fork && (fork.classList.contains('vibrating') || fork.classList.contains('decay-vibration'));
            
            if (!forkStillVibrating) {
                this.stopWaveformAnimation();
                return;
            }
            
            const elapsed = Date.now() - startTime;
            let globalDecay = 1;
            
            if (elapsed > decayStart) {
                const decayProgress = Math.min(1, (elapsed - decayStart) / decayDuration);
                const frequencyDecayFactor = Math.min(1, state.tuningForkFrequency / 500);
                globalDecay = Math.max(0.05, 1 - decayProgress * frequencyDecayFactor);
                
                if (globalDecay * deflectionInPixels <= minAmplitude && state.yGain > 1) {
                    this.stopWaveformAnimation();
                    return;
                }
            }
            
            position += speed;
            this.updateWaveformPath(path, svg, position, points, screen, centerY, displayFrequency, 
                                  spatialDecayFactor, deflectionInPixels, pixelsPerDiv, globalDecay);
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    },

    stopWaveformAnimation() {
        const state = this.experimentState;
        const waveform = document.querySelector('.waveform');
        const screen = document.querySelector('.screen');
        
        if (!waveform || !screen) return;
        
        const svg = waveform.querySelector('svg');
        if (!svg) return;
        
        const path = svg.querySelector('path');
        if (!path) return;
        
        const centerY = screen.offsetHeight * (state.vPosition / 100);
        const flatLine = `M 0,${centerY} L ${screen.offsetWidth},${centerY}`;
        
        path.setAttribute("d", flatLine);
        
        const pathClone = svg.querySelector("path:nth-child(2)");
        pathClone && pathClone.setAttribute("d", flatLine);
        
        waveform.style.animation = 'none';
        
        setTimeout(() => {
            state.waveformVisible = false;
            this.toggleElement('.beam-dot', state.oscilloscopePowered ? 'block' : 'none');
        }, 1000);
    },

    endWaveformAnimation(path, svg, centerY, screenWidth) {
        const d = `M 0,${centerY} L ${screenWidth},${centerY}`;
        path.setAttribute("d", d);
        const pathClone = svg.querySelector("path:nth-child(2)");
        pathClone && pathClone.setAttribute("d", d);
        
        this.toggleElement('.beam-dot', this.experimentState.oscilloscopePowered ? 'block' : 'none');
        this.experimentState.waveformVisible = false;
    },

    updateWaveformPath(path, svg, position, points, screen, centerY, displayFrequency, 
                      spatialDecayFactor, deflectionInPixels, pixelsPerDiv, globalDecay) {
        const state = this.experimentState;
        const currentAmplificationValue = state.amplificationValue || 0.01;
        const currentAmplitude = (state.signalVoltageAmplitude / currentAmplificationValue) * pixelsPerDiv * globalDecay;
        
        let d;
        if (state.yGain <= 1) {
            d = `M 0,${centerY} L ${screen.offsetWidth},${centerY}`;
        } else {
            d = `M 0,${centerY} `;
            for (let i = 0; i <= points; i++) {
                const x = (i / points) * screen.offsetWidth;
                const phase = position + (i / points) * Math.PI * 2 * displayFrequency;
                const spatialDecay = Math.exp(-spatialDecayFactor * (i / points) * displayFrequency);
                const currentPointAmplitude = currentAmplitude * spatialDecay;
                const y = centerY + Math.sin(phase) * currentPointAmplitude;
                d += `L ${x},${y} `;
            }
        }
        
        path.setAttribute("d", d);
        const pathClone = svg.querySelector("path:nth-child(2)");
        pathClone && pathClone.setAttribute("d", d);
    },

    toggleElement(selector, display) {
        const element = document.querySelector(selector);
        if (element) element.style.display = display;
    },

    toggleClass(element, className, condition) {
        element.classList.toggle(className, condition);
    },

    updateOscilloscopeDisplay() {
        const screen = document.querySelector('.screen');
        if (!screen) return;
        
        screen.querySelectorAll('.oscilloscope-value').forEach(el => el.remove());
        
        let container = screen.querySelector('.oscilloscope-values');
        if (!container) {
            container = this.createElement('div', 'oscilloscope-values', {
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                color: 'rgba(0, 255, 0, 0.8)',
                fontFamily: 'monospace',
                fontSize: '12px',
                zIndex: '3',
                textAlign: 'right',
                pointerEvents: 'none'
            });
            screen.appendChild(container);
        }
        
        const state = this.experimentState;
        const values = [
            `Y: ${(state.amplificationValue || 1).toFixed(1)} В/дел`,
            `X: ${(state.timebaseValue || 1).toFixed(1)} мс/дел`,
            `f: ${state.tuningForkFrequency} Гц`
        ];
        
        values.forEach(text => {
            const div = this.createElement('div', 'oscilloscope-value', {
                marginBottom: '5px',
                textShadow: '0 0 2px rgba(0, 255, 0, 0.8)'
            });
            div.textContent = text;
            container.appendChild(div);
        });
        
        container.style.display = state.oscilloscopePowered ? 'block' : 'none';
    },

    takeMeasurement() {
        const state = this.experimentState;
        const ruler = document.getElementById('ruler');
        const screen = document.querySelector('.screen');
        
        if (!ruler || !screen || !this.elementsIntersect(ruler, screen) || 
            !state.waveformStable || !state.waveformVisible || state.yGain < 30) return;
        
        const beamAmplitudeMm = Math.round(state.beamAmplitude * 10) / 10;
        const voltageAmplitude = beamAmplitudeMm * state.amplificationValue / 10;
        
        state.beamAmplitude = beamAmplitudeMm;
        state.voltageAmplitude = Math.round(voltageAmplitude * 100) / 100;
        
        this.updateDisplay('beam-amplitude', state.beamAmplitude.toFixed(1));
        this.updateDisplay('voltage-amplitude', '?');
        this.updateDisplay('amplification-value', state.amplificationValue.toFixed(2) + " В/дел");
        this.updateDisplay('frequency-info', `Частота: ${state.tuningForkFrequency} Гц`);
        
        this.animateElement(ruler, 'reading-taken', 1000);
        
        state.measurementTaken = true;
        document.getElementById('voltage-calculator').style.display = 'block';
        this.checkExperimentConditions();
    },

    animateElement(element, className, duration) {
        element.classList.add(className);
        setTimeout(() => element.classList.remove(className), duration);
    },

    setupPhysicsObjects() {
        physjs.detachAll();
        ['#oscilloscope', '#microphone', '#tuning-fork', '#hammer', '#cable', '#ruler']
            .forEach(selector => {
                const element = document.querySelector(selector);
                element && physjs.createObject(selector, { type: selector.slice(1) });
            });
    },
    
    setupEventHandlers() {
        const oscilloscope = document.getElementById('oscilloscope');
        if (oscilloscope) {
            oscilloscope.removeEventListener('dblclick', oscilloscope._dblclickHandler);
            oscilloscope._dblclickHandler = (e) => {
                e.stopPropagation();
                const powerButton = document.getElementById('power-button');
                if (powerButton && this.isClickOnElement(e, powerButton)) {
                    this.toggleOscilloscope();
                }
            };
            oscilloscope.addEventListener('dblclick', oscilloscope._dblclickHandler);
        }
        
        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', () => this.resetDragState());
        
        document.querySelectorAll('.control-knob').forEach(control => {
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

    resetDragState() {
        const state = this.experimentState;
        state.isDragging = false;
        state.draggedElement = null;
        state.knobBeingRotated = null;
    },

    handleConnection(fromId, toId) {
        if ((fromId === 'mic-output' && toId === 'y-input') || 
            (fromId === 'y-input' && toId === 'mic-output')) {
            
            this.experimentState.micConnected = true;
            
            const micOutput = document.querySelector('#microphone .output-connector');
            micOutput && micOutput.classList.add('connected');
            
            this.checkExperimentConditions();
        }
    },

    handleDragMove(e) {
        const state = this.experimentState;
        const now = performance.now();
        
        if (now - state.lastRenderTime <= state.renderInterval || !state.isDragging || !state.draggedElement) return;
        
        state.lastRenderTime = now;
        
        if (state.draggedElement.id === 'tuning-fork' && state.step >= 3) {
            this.updateTuningForkPosition();
        }
        
        if (state.draggedElement.id === 'ruler' && state.step === 4) {
            this.updateRulerPosition();
        }
    },

    updateTuningForkPosition() {
        const state = this.experimentState;
        const microphone = document.getElementById('microphone');
        if (!microphone) return;
        
        const distance = this.calculateDistance(state.draggedElement, microphone);
        state.tuningForkPositioned = distance < 100;
        
        this.toggleClass(state.draggedElement, 'positioned', state.tuningForkPositioned);
        this.checkExperimentConditions();
    },

    updateRulerPosition() {
        const screen = document.querySelector('.screen');
        if (!screen) return;
        
        const isIntersecting = this.elementsIntersect(this.experimentState.draggedElement, screen);
        this.toggleClass(this.experimentState.draggedElement, 'measurement-ready', isIntersecting);
    },

    calculateDistance(elem1, elem2) {
        const rect1 = elem1.getBoundingClientRect();
        const rect2 = elem2.getBoundingClientRect();
        
        const centerX1 = rect1.left + rect1.width / 2;
        const centerY1 = rect1.top + rect1.height / 2;
        const centerX2 = rect2.left + rect2.width / 2;
        const centerY2 = rect2.top + rect2.height / 2;
        
        return Math.sqrt(Math.pow(centerX1 - centerX2, 2) + Math.pow(centerY1 - centerY2, 2));
    },

    startKnobRotation(knob) {
        this.experimentState.knobBeingRotated = knob;
        
        const moveHandler = (e) => {
            if (this.experimentState.knobBeingRotated !== knob) return;
            
            const rect = knob.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
            
            const rotation = Math.max(-135, Math.min(135, angle));
            const normalizedValue = (rotation + 135) / 270 * 100;
            
            knob.style.transform = `rotate(${rotation}deg)`;
            this.updateControlValue(knob.dataset.control, normalizedValue);
        };
        
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            this.experimentState.knobBeingRotated = null;
        };
        
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    },

    updateWaveformStability() {
        const state = this.experimentState;
        const waveform = document.querySelector('.waveform');
        const screen = document.querySelector('.screen');
        
        if (!waveform || !screen || !state.waveformVisible) return;
        
        this.toggleClass(screen, 'stable-waveform', state.waveformStable);
        
        const svg = waveform.querySelector('svg');
        const path = svg?.querySelector('path');
        if (!path) return;
        
        const { alpha, focusBlur, glowIntensity, strokeWidth } = this.getVisualProperties();
        const stabilityBlur = Math.min(3, Math.abs(state.timebase - 60) / 10);
        const totalBlur = Math.max(focusBlur, stabilityBlur);
        
        this.setSVGPathAttributes(path, alpha, strokeWidth, glowIntensity, totalBlur);
        
        let pathClone = svg.querySelector("path:nth-child(2)");
        if (state.waveformStable) {
            pathClone?.remove();
            waveform.style.animation = 'none';
        } else {
            if (!pathClone) {
                pathClone = path.cloneNode(true);
                svg.appendChild(pathClone);
            }
            this.updateInstabilityClone(pathClone, alpha, glowIntensity, totalBlur, strokeWidth, waveform);
        }
    },

    updateInstabilityClone(pathClone, alpha, glowIntensity, totalBlur, strokeWidth, waveform) {
        const state = this.experimentState;
        const offset = (state.timebase > 60) ? 5 : -5;
        
        pathClone.setAttribute("transform", `translate(${offset}, 0)`);
        pathClone.setAttribute("opacity", alpha * 0.5);
        this.setSVGPathAttributes(pathClone, alpha, strokeWidth, glowIntensity, totalBlur);
        
        const jitterAmount = Math.min(5, Math.abs(state.timebase - 60) / 8);
        waveform.style.animation = `oscilloscope-jitter ${0.1}s infinite alternate`;
        this.addJitterStyle(jitterAmount);
    },

    updateWaveformAmplitude() {
        const state = this.experimentState;
        if (!state.waveformVisible) return;
        
        const screen = document.querySelector('.screen');
        if (!screen) return;
        
        const amplificationValue = state.amplificationValue || 0.01;
        const deflectionInDiv = state.signalVoltageAmplitude / amplificationValue;
        const pixelsPerDiv = screen.offsetHeight / 8;
        const deflectionInPixels = deflectionInDiv * pixelsPerDiv;
        
        state.beamAmplitude = deflectionInPixels * 0.26458;
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
        
        const optimalValues = {
            'brightness': 100, 'focus': 100, 'y-gain': 100,
            'h-position': 50, 'v-position': 50, 'timebase': 60
        };
        
        const optimalValue = optimalValues[controlType];
        control.style.transform = `rotate(${-135 + optimalValue * 270 / 100}deg)`;
        
        this.updateControlValue(controlType, optimalValue);
        this.updateBeamPosition();
        this.updateOscilloscopeDisplay();
        this.checkExperimentConditions();
    },

    toggleOscilloscope() {
        const state = this.experimentState;
        const elements = {
            oscilloscope: document.getElementById('oscilloscope'),
            screen: document.querySelector('.screen'),
            beamDot: document.querySelector('.beam-dot'),
            powerIndicator: document.querySelector('.power-indicator')
        };
        
        if (!Object.values(elements).every(el => el)) return;
    
        state.oscilloscopePowered = !state.oscilloscopePowered;
        
        if (state.oscilloscopePowered) {
            this.powerOnOscilloscope(elements);
        } else {
            this.powerOffOscilloscope(elements);
        }
        
        this.checkExperimentConditions();
    },

    powerOnOscilloscope(elements) {
        const state = this.experimentState;
        
        elements.oscilloscope.classList.add('powered');
        elements.screen.classList.remove('screen-off');
        elements.screen.classList.add('screen-on');
        elements.powerIndicator.classList.add('on');
        
        if (!state.waveformVisible) {
            elements.beamDot.style.display = 'block';
        }
        
        this.setupScreenGrid(elements.screen);
        this.updateBeamPosition();
        this.updateBeamAppearance();
        this.updateOscilloscopeDisplay();
    },

    powerOffOscilloscope(elements) {
        const state = this.experimentState;
        
        elements.oscilloscope.classList.remove('powered');
        elements.screen.classList.remove('screen-on');
        elements.screen.classList.add('screen-off');
        elements.beamDot.style.display = 'none';
        elements.powerIndicator.classList.remove('on');
        
        const gridElement = elements.screen.querySelector('.screen-grid');
        if (gridElement) gridElement.style.opacity = '0';
        
        this.toggleElement('.waveform', 'none');
        
        Object.assign(state, {
            beamConfigured: false,
            waveformStable: false,
            waveformVisible: false
        });
    },

    setupScreenGrid(screen) {
        let gridElement = screen.querySelector('.screen-grid');
        if (!gridElement) {
            gridElement = this.createElement('div', 'screen-grid', {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                opacity: '1',
                zIndex: '1'
            });
            screen.appendChild(gridElement);
        } else {
            gridElement.style.opacity = '1';
        }
    },
    
    checkBeamConfiguration() {
        const state = this.experimentState;
        
        if (!state.oscilloscopePowered) return false;
        
        const brightnessFocusOk = state.brightness > 60 && state.focus > 60;
        const positionOk = Math.abs(state.hPosition - 50) < 20 && Math.abs(state.vPosition - 50) < 20;
        
        state.beamConfigured = brightnessFocusOk && positionOk;
        return state.beamConfigured;
    },
    
    updateBeamAppearance() {
        const state = this.experimentState;
        const beamDot = document.querySelector('.beam-dot');
        
        if (!beamDot || !state.oscilloscopePowered || state.waveformVisible) return;
        
        const { alpha, strokeWidth } = this.getVisualProperties();
        const dotSize = 10 - (Math.max(0, Math.min(100, state.focus)) / 100) * 8;
        const glow = 5 + (Math.max(0, Math.min(100, state.brightness)) / 20);
    
        Object.assign(beamDot.style, {
            opacity: alpha,
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            boxShadow: `0 0 ${glow}px rgba(0, 255, 0, ${alpha})`
        });
    
        this.updateWaveformVisualProperties();
    },
    
    updateBeamPosition() {
        const state = this.experimentState;
        if (!state.oscilloscopePowered) return;
        
        const beamDot = document.querySelector('.beam-dot');
        if (beamDot && !state.waveformVisible) {
            beamDot.style.left = `${state.hPosition}%`;
            beamDot.style.top = `${state.vPosition}%`;
        }
        
        const waveform = document.querySelector('.waveform');
        if (waveform && state.waveformVisible) {
            waveform.style.top = `${state.vPosition}%`;
        }
    },
    
    updateWaveformVisualProperties() {
        const state = this.experimentState;
        const waveform = document.querySelector('.waveform');
        
        if (!waveform || !state.waveformVisible || !state.oscilloscopePowered) return;
        
        const { alpha, focusBlur, glowIntensity, strokeWidth } = this.getVisualProperties();
        const svg = waveform.querySelector('svg');
        if (!svg) return;
        
        svg.querySelectorAll('path').forEach(path => {
            path.style.opacity = alpha;
            
            let filterEffects = `drop-shadow(0 0 ${glowIntensity}px rgba(0, 255, 0, ${alpha * 0.8}))`;
            
            if (!state.waveformStable) {
                const stabilityBlur = Math.min(3, Math.abs(state.timebase - 60) / 10);
                const totalBlur = Math.max(focusBlur, stabilityBlur);
                filterEffects = `drop-shadow(0 0 ${glowIntensity}px rgba(0, 255, 0, ${alpha * 0.8})) blur(${totalBlur}px)`;
            } else if (focusBlur > 0) {
                filterEffects += ` blur(${focusBlur}px)`;
            }
            
            path.setAttribute("filter", filterEffects);
            path.setAttribute("stroke-width", strokeWidth);
            path.setAttribute("stroke", `rgba(0, 255, 0, ${alpha})`);
        });
    },

    strikeTheTuningFork() {
        const state = this.experimentState;
        const tuningFork = document.getElementById('tuning-fork');
        const fork = tuningFork?.querySelector('.fork-tines');
        
        if (!fork) return;
        
        fork.classList.remove('vibrating', 'decay-vibration');
        void fork.offsetWidth;
        
        if (state.forkAnimationTimer) clearTimeout(state.forkAnimationTimer);
        
        fork.classList.add('vibrating');
        
        const vibrationDuration = Math.max(500, 4000 - (state.tuningForkFrequency - 440) * 2);
        const decayDuration = 8000 + (880 - state.tuningForkFrequency) * 5;
        
        state.forkAnimationTimer = setTimeout(() => fork.classList.add('decay-vibration'), vibrationDuration);
        
        this.animateForkDecay(fork, vibrationDuration, decayDuration);
        
        state.tuningForkStruck = true;
        
        if (state.micConnected && state.oscilloscopePowered) {
            this.showWaveform();
        }
        
        this.checkExperimentConditions();
    },

    animateForkDecay(fork, decayStart, decayDuration) {
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed > decayStart) {
                const decayProgress = Math.min(1, (elapsed - decayStart) / decayDuration);
                const newDuration = 0.8 + decayProgress * 2;
                const intensity = Math.max(0.05, 1 - decayProgress);
                
                fork.style.animationDuration = `${newDuration}s`;
                fork.style.animationPlayState = intensity < 0.1 ? 'paused' : 'running';
                
                if (decayProgress >= 1) {
                    fork.classList.remove('vibrating', 'decay-vibration');
                    fork.style.transform = 'translateX(-50%) rotate(0deg)';
                    fork.style.animationDuration = '';
                    
                    this.stopWaveformAnimation();
                    return;
                }
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    },

    checkVoltageCalculation() {
        const state = this.experimentState;
        const inputElement = document.getElementById('amplitude-input');
        const resultElement = document.getElementById('amplitude-result');
        const voltageDisplayElement = document.getElementById('voltage-amplitude');
        
        if (!inputElement || !resultElement) return;
        
        const userValue = parseFloat(inputElement.value);
        
        if (isNaN(userValue)) {
            this.showCalculationResult(resultElement, voltageDisplayElement, 
                'Пожалуйста, введите числовое значение', 'error-message', '?');
            return;
        }
        
        const errorMargin = state.voltageAmplitude * 0.05;
        const isCorrect = Math.abs(userValue - state.voltageAmplitude) <= errorMargin;
        
        if (isCorrect) {
            this.showCalculationResult(resultElement, voltageDisplayElement,
                'Правильно! Ваш расчет совпадает с измеренным значением.', 
                'success-message', state.voltageAmplitude.toFixed(2));
        } else {
            this.showCalculationResult(resultElement, voltageDisplayElement,
                'Неверно. Проверьте ваши расчеты и попробуйте снова.', 
                'error-message', '?');
        }
    },

    showCalculationResult(resultElement, voltageElement, message, className, voltageText) {
        resultElement.textContent = message;
        resultElement.className = className;
        voltageElement.textContent = voltageText;
    },

    checkExperimentConditions() {
        const state = this.experimentState;
        const currentStep = physjs.getCurrentStep();
        
        const conditions = {
            'step1': () => state.oscilloscopePowered && state.beamConfigured,
            'step2': () => state.oscilloscopePowered && state.micConnected,
            'step3': () => state.oscilloscopePowered && state.micConnected && state.tuningForkStruck && state.waveformStable,
            'step4': () => state.measurementTaken
        };
        
        const messages = {
            'step1': "Осциллограф настроен. Перейдите к шагу 2.",
            'step2': "Микрофон подключен. Перейдите к шагу 3.",
            'step3': "Звуковые колебания получены. Перейдите к шагу 4.",
            'step4': "Эксперимент завершен успешно!"
        };
        
        const condition = conditions[currentStep.id];
        if (condition && condition()) {
            this.showStatusMessage(messages[currentStep.id]);
            if (currentStep.id !== 'step4') {
                const nextStep = parseInt(currentStep.id.slice(-1)) + 1;
                physjs.goToStep(`step${nextStep}`);
                this.updateExperimentStep(nextStep);
            }
        }
    },
    
    updateExperimentStep(step) {
        this.experimentState.step = step;
        
        for (let i = 1; i <= 4; i++) {
            const stepElement = document.getElementById(`step${i}`);
            this.toggleClass(stepElement, 'active', i === step);
        }
        
        const instructions = {
            1: "Включите осциллограф двойным щелчком по кнопке питания и настройте луч с помощью ручек управления.",
            2: "Подключите микрофон к входу Y осциллографа и установите максимальное усиление.",
            3: "Поставьте камертон перед микрофоном и ударьте по нему молотком для получения звуковых колебаний.",
            4: "Измерьте амплитуду вертикального отклонения луча и рассчитайте напряжение на выходе микрофона."
        };
        
        this.updateInstructions(instructions[step]);
        physjs.goToStep(`step${step}`);
    },
    
    updateInstructions(text) {
        this.updateDisplay('current-instruction', text);
    },
    
    showStatusMessage(message) {
        this.updateDisplay('status-message', message);
    },
    
    resetExperiment() {
        window.location.reload();
    }
};

export default experimentFunctions;