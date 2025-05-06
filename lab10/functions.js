const experimentFunctions = {
    experimentState: {
        step: 1,
        frameInstalled: false,
        lightOn: false,
        opticsAligned: false,
        screenAdjusted: false,
        redMeasured: false,
        blueMeasured: false,
        screenDistance: 0,
        gratingConstant: 0.01,
        redEdgeDistance: 0,
        blueEdgeDistance: 0,
        redWavelength: 0,
        blueWavelength: 0,
        correctRedWavelength: 650,
        correctBlueWavelength: 450,
        spectrumVisible: false,
        spectrumQuality: 0,
        beamOffsetY: 50,
        beamPassesThroughGrating: false,
        beamPassesThroughLens: false,
        currentOpticalSetup: 'none',
        allElementsInPath: false,
        optimumFocusDistance: 500,
        focusTolerancePercent: 15,
        isDragging: false,
        draggedElement: null,
        lastRenderTime: 0,
        renderInterval: 20,
        rulerBlockingBeam: false
    },
    
    initializeExperiment() {
        physjs.setRotationKeysEnabled(false);
        this.setupEventHandlers();
        
        document.getElementById('grating-constant').textContent = this.experimentState.gratingConstant.toFixed(2);
        document.getElementById('screen-distance').textContent = '-';
        document.getElementById('red-edge-distance').textContent = '-';
        document.getElementById('blue-edge-distance').textContent = '-';
        document.getElementById('red-wavelength').textContent = '-';
        document.getElementById('blue-wavelength').textContent = '-';
        document.getElementById('wavelength-calculator').style.display = 'none';
        
        const sourceElement = document.getElementById('light-source');
        const frameElement = document.getElementById('slide-frame');
        const gratingElement = document.getElementById('diffraction-grating');
        const lensElement = document.getElementById('lens');
        const screenElement = document.getElementById('screen');
        const rulerElement = document.getElementById('ruler');
        
        if (sourceElement) sourceElement.style.left = '100px', sourceElement.style.top = '200px';
        if (frameElement) frameElement.style.left = '250px', frameElement.style.top = '200px';
        if (gratingElement) gratingElement.style.left = '400px', gratingElement.style.top = '200px';
        if (lensElement) lensElement.style.left = '550px', lensElement.style.top = '200px';
        if (screenElement) screenElement.style.left = '750px', screenElement.style.top = '200px';
        if (rulerElement) rulerElement.style.left = '100px', rulerElement.style.top = '350px';
        
        this.updateExperimentStep(1);
        this.updateInstructions("Установите диапозитивную рамку со щелью в окно источника света и включите его.");
    },
    
    setupPhysicsObjects() {
        physjs.detachAll();
        
        const objects = [
            { selector: '#light-source', type: 'light-source' },
            { selector: '#slide-frame', type: 'slide-frame' },
            { selector: '#diffraction-grating', type: 'diffraction-grating' },
            { selector: '#lens', type: 'lens' },
            { selector: '#screen', type: 'screen' },
            { selector: '#ruler', type: 'ruler' }
        ];
        
        objects.forEach(obj => {
            const element = document.querySelector(obj.selector);
            if (!element) return;
            !physjs.getObject(obj.selector) && physjs.createObject(obj.selector);
        });
    },
    
    setupEventHandlers() {
        const opticalElements = ['#light-source', '#slide-frame', '#diffraction-grating', '#lens', '#screen', '#ruler'];
        
        opticalElements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener('mousedown', () => {
                    this.experimentState.isDragging = true;
                    this.experimentState.draggedElement = element.id;
                    document.addEventListener('mousemove', this.handleDragMove);
                });
                
                element.addEventListener('mouseup', () => {
                    if (this.experimentState.isDragging) {
                        this.experimentState.isDragging = false;
                        this.experimentState.draggedElement = null;
                        document.removeEventListener('mousemove', this.handleDragMove);
                        this.checkExperimentConditions();
                    }
                });
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.experimentState.isDragging) {
                this.experimentState.isDragging = false;
                this.experimentState.draggedElement = null;
                document.removeEventListener('mousemove', this.handleDragMove);
                this.checkExperimentConditions();
            }
        });
        
        document.getElementById('check-wavelength').addEventListener('click', () => {
            this.checkWavelengthCalculation();
        });
    },
    
    handleDragMove: function(e) {
        const now = performance.now();
        const state = experimentFunctions.experimentState;
        
        if (now - state.lastRenderTime > state.renderInterval) {
            state.lastRenderTime = now;
            
            if (state.lightOn && state.frameInstalled) {
                experimentFunctions.updateLightBeam();
                experimentFunctions.checkOpticalAlignment();
                experimentFunctions.updateSpectrumQuality();
            }
        }
    },
    
    toggleLight() {
        const source = document.getElementById('light-source');
        const lightBeam = document.getElementById('light-beam');
        const lightImpact = document.getElementById('light-impact');
        
        this.experimentState.lightOn = !this.experimentState.lightOn;
        
        if (this.experimentState.lightOn) {
            source.classList.add('light-on');
            
            if (this.experimentState.frameInstalled) {
                this.updateLightBeam();
                
                if (this.experimentState.step === 1) {
                    this.updateExperimentStep(2);
                    this.updateInstructions("Расположите дифракционную решетку, линзу и экран вдоль красного луча света.");
                }
            }
        } else {
            source.classList.remove('light-on');
            
            if (lightBeam) lightBeam.classList.remove('visible');
            if (lightImpact) lightImpact.classList.remove('visible');
            
            this.hideSpectrum();
        }
        
        this.checkExperimentConditions();
    },
    
    isElementInBeamPath(elementRect, sourceRect, beamY) {
        const isRightOfSource = elementRect.left > sourceRect.right;
        const beamIntersectsElement = beamY >= elementRect.top && beamY <= elementRect.bottom;
        return isRightOfSource && beamIntersectsElement;
    },
    
    updateLightBeam() {
        if (!this.experimentState.lightOn || !this.experimentState.frameInstalled) return;
        
        const lightBeam = document.getElementById('light-beam');
        const lightImpact = document.getElementById('light-impact');
        const lightSource = document.getElementById('light-source');
        const grating = document.getElementById('diffraction-grating');
        const lens = document.getElementById('lens');
        const screen = document.getElementById('screen');
        const ruler = document.getElementById('ruler');
        
        if (!lightBeam || !lightSource || !screen || !lightImpact || !grating || !lens || !ruler) return;
        
        const sourceRect = lightSource.getBoundingClientRect();
        const gratingRect = grating.getBoundingClientRect();
        const lensRect = lens.getBoundingClientRect();
        const screenRect = screen.getBoundingClientRect();
        const rulerRect = ruler.getBoundingClientRect();
        const sourceY = sourceRect.top + sourceRect.height / 2;
        const beamY = sourceY;
        const gratingInBeamPath = this.isElementInBeamPath(gratingRect, sourceRect, beamY);
        const lensInBeamPath = this.isElementInBeamPath(lensRect, sourceRect, beamY);
        const rulerInBeamPath = this.isElementInBeamPath(rulerRect, sourceRect, beamY);
        const screenInBeamPath = this.isElementInBeamPath(screenRect, sourceRect, beamY);
        
        const startX = sourceRect.right;
        let endX = window.innerWidth;
        
        let rulerBlockingBeam = false;
        let screenReached = false;
        
        if (rulerInBeamPath && screenInBeamPath) {
            if (rulerRect.left < screenRect.left) {
                endX = rulerRect.left;
                rulerBlockingBeam = true;
            } else {
                endX = screenRect.left;
                screenReached = true;
            }
        } else if (rulerInBeamPath) {
            endX = rulerRect.left;
            rulerBlockingBeam = true;
        } else if (screenInBeamPath) {
            endX = screenRect.left;
            screenReached = true;
        }
        
        this.experimentState.beamPassesThroughGrating = gratingInBeamPath && 
            (gratingRect.left < endX || rulerBlockingBeam || screenReached);
        this.experimentState.beamPassesThroughLens = lensInBeamPath && 
            (lensRect.left < endX || rulerBlockingBeam || screenReached);
        this.experimentState.rulerBlockingBeam = rulerBlockingBeam;
        
        const correctOrder = !gratingInBeamPath || !lensInBeamPath || (gratingRect.right < lensRect.left);
        
        let opticalSetup = 'none';
        if (rulerBlockingBeam)
            opticalSetup = 'blocked';
        else if (screenReached)
            opticalSetup = this.experimentState.beamPassesThroughGrating && this.experimentState.beamPassesThroughLens && correctOrder ? 'full' :
                this.experimentState.beamPassesThroughGrating && !this.experimentState.beamPassesThroughLens ? 'grating-only' :
                !this.experimentState.beamPassesThroughGrating && this.experimentState.beamPassesThroughLens ? 'lens-only' : 'none';
        
        this.experimentState.currentOpticalSetup = opticalSetup;
        
        if (this.experimentState.step === 2)
            this.experimentState.opticsAligned = this.experimentState.beamPassesThroughGrating && 
                                               this.experimentState.beamPassesThroughLens && 
                                               correctOrder && 
                                               !rulerBlockingBeam;
        else
            this.experimentState.allElementsInPath = this.experimentState.beamPassesThroughGrating && 
                                                   this.experimentState.beamPassesThroughLens && 
                                                   screenReached && 
                                                   correctOrder && 
                                                   !rulerBlockingBeam;
        
        const beamWidth = endX - startX;
        
        lightBeam.style.left = startX + 'px';
        lightBeam.style.top = beamY + 'px';
        lightBeam.style.width = beamWidth + 'px';
        lightBeam.classList.add('visible');
        
        if (rulerBlockingBeam) {
            lightImpact.style.left = rulerRect.left + 'px';
            lightImpact.style.top = beamY + 'px';
            lightImpact.classList.add('visible');
        } else if (screenReached) {
            lightImpact.style.left = screenRect.left + 'px';
            lightImpact.style.top = beamY + 'px';
            lightImpact.classList.add('visible');
            
            const relativeBeamPositionY = beamY - screenRect.top;
            const beamOffsetPercent = (relativeBeamPositionY / screenRect.height) * 100;
            this.experimentState.beamOffsetY = beamOffsetPercent;
        } else {
            lightImpact.classList.remove('visible');
        }
    },
    
    checkOpticalAlignment() {
        if (!this.experimentState.lightOn || !this.experimentState.frameInstalled) return false;
        
        this.updateLightBeam();
        
        const lens = document.querySelector('#lens');
        const screen = document.querySelector('#screen');
        
        if (lens && screen) {
            const lensRect = lens.getBoundingClientRect();
            const screenRect = screen.getBoundingClientRect();
            const screenDistance = screenRect.left - lensRect.right;
            this.experimentState.screenDistance = screenDistance;
            document.getElementById('screen-distance').textContent = screenDistance.toFixed(0);
        }
        
        return this.experimentState.step == 2 ? this.experimentState.opticsAligned : this.experimentState.allElementsInPath;
    },
    
    checkScreenPosition() {
        if (!this.experimentState.lightOn || !this.experimentState.frameInstalled || this.experimentState.step < 2) return;
        
        const isAligned = this.checkOpticalAlignment();

        if (isAligned) {
            this.experimentState.opticsAligned = true;
            
            if (this.experimentState.step == 2) {
                this.updateExperimentStep(3);
                this.updateInstructions("Перемещайте экран вдоль оптической оси, чтобы получить четкое изображение дифракционных спектров.");
            }
            
            this.updateSpectrumQuality();
        } else {
            this.experimentState.opticsAligned = false;
            this.hideSpectrum();
        }
    },
    
    updateSpectrumQuality() {
        if (!this.experimentState.lightOn || !this.experimentState.frameInstalled) {
            this.hideSpectrum();
            return;
        }
        
        const screenHasImage = document.getElementById('light-impact').classList.contains('visible');
        if (!screenHasImage) {
            this.hideSpectrum();
            return;
        }

        if (this.experimentState.rulerBlockingBeam) {
            this.hideSpectrum();
            return;
        }

        switch (this.experimentState.currentOpticalSetup) {
            case 'full':
                this.showFullSpectrum();
                break;
            case 'grating-only':
                this.showDiffractedBeam();
                break;
            case 'lens-only':
                this.showFocusedBeam();
                break;
            case 'none':
                this.showSimpleBeam();
                break;
            default:
                this.hideSpectrum();
        }
        
        if ((this.experimentState.step === 2 || this.experimentState.step === 3) && 
            this.experimentState.currentOpticalSetup !== 'full' &&
            screenHasImage) {
            this.updateInstructions("Установите и дифракционную решетку, и линзу на пути луча, чтобы получить спектр.");
        }
    },
    
    showFullSpectrum() {
        const currentDistance = this.experimentState.screenDistance;
        const optimalDistance = this.experimentState.optimumFocusDistance;
        const tolerance = optimalDistance * (this.experimentState.focusTolerancePercent / 100);
        
        let quality = 100 - (Math.abs(currentDistance - optimalDistance) / tolerance * 100);
        quality = Math.max(0, Math.min(100, quality));
        
        this.experimentState.spectrumQuality = quality;
        
        if (quality > 10) {
            if (quality > 80) {
                this.showSpectrum();
                
                if (this.experimentState.step === 3 && 
                    !this.experimentState.screenAdjusted && 
                    quality > 90 &&
                    !this.experimentState.isDragging) {
                    this.experimentState.screenAdjusted = true;
                    this.updateExperimentStep(4);
                    this.updateInstructions("Используйте маркеры, чтобы измерить расстояние от центра до красного края спектра.");
                }
            } else {
                this.showBlurredSpectrum(quality);
            }
        } else {
            this.hideSpectrum();
        }
    },
    
    showDiffractedBeam() {
        const screen = document.querySelector('#screen .spectrum-display');
        const leftSpectrum = document.querySelector('.left-spectrum');
        const rightSpectrum = document.querySelector('.right-spectrum');
        const centralLine = document.querySelector('.central-line');
        
        if (!screen || !leftSpectrum || !rightSpectrum || !centralLine) return;
        
        screen.classList.add('spectrum-visible');
        leftSpectrum.classList.add('visible');
        rightSpectrum.classList.add('visible');
        centralLine.style.display = 'block';
        
        const beamOffsetPercent = this.experimentState.beamOffsetY || 50;
        this.adjustSpectrumVerticalPosition(leftSpectrum, rightSpectrum, centralLine, beamOffsetPercent);
        
        const blurAmount = 8;
        leftSpectrum.style.filter = `blur(${blurAmount}px)`;
        rightSpectrum.style.filter = `blur(${blurAmount}px)`;
        
        leftSpectrum.style.opacity = '0.5';
        rightSpectrum.style.opacity = '0.5';
        
        this.experimentState.spectrumVisible = true;
    },
    
    showFocusedBeam() {
        const screen = document.querySelector('#screen .spectrum-display');
        const leftSpectrum = document.querySelector('.left-spectrum');
        const rightSpectrum = document.querySelector('.right-spectrum');
        const centralLine = document.querySelector('.central-line');
        
        if (!screen || !leftSpectrum || !rightSpectrum || !centralLine) return;
        
        screen.classList.add('spectrum-visible');
        leftSpectrum.classList.remove('visible');
        rightSpectrum.classList.remove('visible');
        centralLine.style.display = 'block';
        
        const currentDistance = this.experimentState.screenDistance;
        const optimalDistance = this.experimentState.optimumFocusDistance;
        const tolerance = optimalDistance * (this.experimentState.focusTolerancePercent / 100);
        
        let quality = 100 - (Math.abs(currentDistance - optimalDistance) / tolerance * 100);
        quality = Math.max(0, Math.min(100, quality));
        
        const beamOffsetPercent = this.experimentState.beamOffsetY;
        centralLine.style.top = `${beamOffsetPercent}%`;
        centralLine.style.transform = 'translateY(-50%)';
        centralLine.style.height = '80%';
        
        if (quality > 80) {
            centralLine.style.width = '20px';
            centralLine.style.backgroundColor = 'rgba(255, 255, 0, 0.15)';
            centralLine.style.filter = '';
        } else {
            centralLine.style.width = '20px';
            const blurAmount = Math.max(0, (80 - quality) / 10);
            centralLine.style.filter = `blur(${blurAmount}px)`;
            centralLine.style.boxShadow = '0 0 5px 2px rgba(255, 255, 255, 0.4)';
        }
        
        this.experimentState.spectrumVisible = true;
    },
    
    showSimpleBeam() {
        const screen = document.querySelector('#screen .spectrum-display');
        const leftSpectrum = document.querySelector('.left-spectrum');
        const rightSpectrum = document.querySelector('.right-spectrum');
        const centralLine = document.querySelector('.central-line');
        
        if (!screen || !leftSpectrum || !rightSpectrum || !centralLine) return;
        
        screen.classList.add('spectrum-visible');
        leftSpectrum.classList.remove('visible');
        rightSpectrum.classList.remove('visible');
        centralLine.style.display = 'block';
        
        const beamOffsetPercent = this.experimentState.beamOffsetY;
        centralLine.style.width = '20px';
        centralLine.style.height = '80%';
        centralLine.style.top = `${beamOffsetPercent}%`;
        centralLine.style.transform = 'translateY(-50%)';
        centralLine.style.filter = '';
        centralLine.style.backgroundColor = 'rgba(255, 255, 0, 0.15)';
        
        this.experimentState.spectrumVisible = true;
    },
    
    showSpectrum() {
        const screen = document.querySelector('#screen .spectrum-display');
        const leftSpectrum = document.querySelector('.left-spectrum');
        const rightSpectrum = document.querySelector('.right-spectrum');
        const centralLine = document.querySelector('.central-line');
        
        if (!screen || !leftSpectrum || !rightSpectrum || !centralLine) return;
        
        screen.classList.add('spectrum-visible');
        leftSpectrum.classList.add('visible');
        rightSpectrum.classList.add('visible');
        centralLine.style.display = 'block';
        
        const beamOffsetPercent = this.experimentState.beamOffsetY || 50;
        this.adjustSpectrumVerticalPosition(leftSpectrum, rightSpectrum, centralLine, beamOffsetPercent);
        
        centralLine.style.width = '2px';
        centralLine.style.boxShadow = '';
        leftSpectrum.style.filter = '';
        rightSpectrum.style.filter = '';
        leftSpectrum.style.opacity = '1';
        rightSpectrum.style.opacity = '1';
        
        this.experimentState.spectrumVisible = true;
    },
    
    showBlurredSpectrum(quality) {
        const screen = document.querySelector('#screen .spectrum-display');
        const leftSpectrum = document.querySelector('.left-spectrum');
        const rightSpectrum = document.querySelector('.right-spectrum');
        const centralLine = document.querySelector('.central-line');
        
        if (!screen || !leftSpectrum || !rightSpectrum || !centralLine) return;
        
        screen.classList.add('spectrum-visible');
        leftSpectrum.classList.add('visible');
        rightSpectrum.classList.add('visible');
        centralLine.style.display = 'block';
        
        const beamOffsetPercent = this.experimentState.beamOffsetY || 50;
        this.adjustSpectrumVerticalPosition(leftSpectrum, rightSpectrum, centralLine, beamOffsetPercent);
        
        const blurAmount = Math.max(0, (80 - quality) / 8);
        leftSpectrum.style.filter = `blur(${blurAmount}px)`;
        rightSpectrum.style.filter = `blur(${blurAmount}px)`;
        
        const opacity = quality < 20 ? quality / 20 * 0.4 : quality / 100 * 0.6 + 0.4;
        leftSpectrum.style.opacity = opacity;
        rightSpectrum.style.opacity = opacity;
        
        centralLine.style.width = '2px';
        centralLine.style.boxShadow = '';
        
        this.experimentState.spectrumVisible = true;
    },
    
    adjustSpectrumVerticalPosition(leftSpectrum, rightSpectrum, centralLine, beamOffsetPercent) {
        const visibilityPercent = 100 - Math.abs(beamOffsetPercent - 50) * 2;
        const spectrumHeight = Math.max(0, visibilityPercent);
        
        leftSpectrum.style.top = `${beamOffsetPercent}%`;
        leftSpectrum.style.height = `${spectrumHeight}%`;
        leftSpectrum.style.transform = `translateY(-50%)`;
        
        rightSpectrum.style.top = `${beamOffsetPercent}%`;
        rightSpectrum.style.height = `${spectrumHeight}%`;
        rightSpectrum.style.transform = `translateY(-50%)`;
        
        centralLine.style.top = `${beamOffsetPercent}%`;
        centralLine.style.height = `${spectrumHeight}%`;
        centralLine.style.transform = `translateY(-50%)`;
        
        const markers = document.querySelectorAll('.measurement-marker');
        markers.forEach(marker => {
            marker.style.top = `${beamOffsetPercent}%`;
        });
    },
    
    hideSpectrum() {
        const screen = document.querySelector('#screen .spectrum-display');
        const leftSpectrum = document.querySelector('.left-spectrum');
        const rightSpectrum = document.querySelector('.right-spectrum');
        const centralLine = document.querySelector('.central-line');
        
        if (screen) screen.classList.remove('spectrum-visible');
        if (leftSpectrum) {
            leftSpectrum.classList.remove('visible');
            leftSpectrum.style.filter = '';
            leftSpectrum.style.opacity = '0';
        }
        if (rightSpectrum) {
            rightSpectrum.classList.remove('visible');
            rightSpectrum.style.filter = '';
            rightSpectrum.style.opacity = '0';
        }
        if (centralLine) {
            centralLine.style.display = 'none';
            centralLine.style.width = '2px';
            centralLine.style.height = '';
            centralLine.style.boxShadow = '';
            centralLine.style.filter = '';
        }
        
        this.experimentState.spectrumVisible = false;
    },
    
    handleAttachment(sourceObj, targetObj) {
        if ((sourceObj.element.id === 'slide-frame' && targetObj.element.id === 'light-source') || 
            (sourceObj.element.id === 'light-source' && targetObj.element.id === 'slide-frame')) {
            
            this.experimentState.frameInstalled = true;
            
            sourceObj.element.style.zIndex = sourceObj.element.id === 'slide-frame' ?
                parseInt(targetObj.element.style.zIndex || 0) + 1 :
                parseInt(sourceObj.element.style.zIndex || 0) + 1;
            
            if (this.experimentState.lightOn) {
                this.updateLightBeam();
                
                if (this.experimentState.step === 1) {
                    this.updateExperimentStep(2);
                    this.updateInstructions("Расположите дифракционную решетку, линзу и экран вдоль красного луча света.");
                }
            } else if (this.experimentState.step === 1) {
                this.updateInstructions("Рамка установлена. Теперь включите источник света двойным щелчком по источнику.");
            }
        }
    },
    
    handleDetachment(obj) {
        if (obj.element.id === 'slide-frame' || obj.element.id === 'light-source') {
            this.experimentState.frameInstalled = false;
            
            if (this.experimentState.step > 1) {
                this.updateInstructions("Внимание! Диапозитивная рамка отсоединена. Установите её обратно в источник света.");
            }
            
            const lightBeam = document.getElementById('light-beam');
            const lightImpact = document.getElementById('light-impact');
            if (lightBeam) lightBeam.classList.remove('visible');
            if (lightImpact) lightImpact.classList.remove('visible');
            
            this.hideSpectrum();
        }
    },
    
    startMarkerDrag(e) {
        if (!this.experimentState.spectrumVisible || this.experimentState.step < 4) return;
        
        const marker = e.currentTarget;
        const isRedMarker = marker.classList.contains('red-marker');
        const isLeftMarker = marker.classList.contains('left-red') || marker.classList.contains('left-blue');
        
        if (isRedMarker && this.experimentState.step === 4) {
            this.measureRedEdge(isLeftMarker);
        } else if (!isRedMarker && this.experimentState.step === 5) {
            this.measureBlueEdge(isLeftMarker);
        }
    },
    
    measureRedEdge(isLeftMarker) {
        const redEdgeDistance = 34;
        
        this.experimentState.redEdgeDistance = redEdgeDistance;
        document.getElementById('red-edge-distance').textContent = redEdgeDistance.toFixed(1);
        
        const screenDistance = this.experimentState.screenDistance;
        const gratingConstant = this.experimentState.gratingConstant;
        const redWavelength = gratingConstant * redEdgeDistance / screenDistance * 1000000;
        this.experimentState.redWavelength = redWavelength;
        this.experimentState.redMeasured = true;
        
        const redMarker = document.querySelector('.red-marker' + (isLeftMarker ? '.left-red' : '.right-red'));
        if (redMarker) {
            redMarker.classList.add('reading-taken');
            setTimeout(() => redMarker.classList.remove('reading-taken'), 500);
        }
        
        if (this.experimentState.step === 4) {
            this.updateExperimentStep(5);
            this.updateInstructions("Теперь измерьте расстояние от центра до синего края спектра.");
        }
    },
    
    measureBlueEdge(isLeftMarker) {
        const blueEdgeDistance = 23;
        
        this.experimentState.blueEdgeDistance = blueEdgeDistance;
        document.getElementById('blue-edge-distance').textContent = blueEdgeDistance.toFixed(1);
        
        const screenDistance = this.experimentState.screenDistance;
        const gratingConstant = this.experimentState.gratingConstant;
        const blueWavelength = gratingConstant * blueEdgeDistance / screenDistance * 1000000;
        this.experimentState.blueWavelength = blueWavelength;
        this.experimentState.blueMeasured = true;
        
        const blueMarker = document.querySelector('.blue-marker' + (isLeftMarker ? '.left-blue' : '.right-blue'));
        if (blueMarker) {
            blueMarker.classList.add('reading-taken');
            setTimeout(() => blueMarker.classList.remove('reading-taken'), 500);
        }
        
        if (this.experimentState.redMeasured && this.experimentState.blueMeasured) {
            document.getElementById('wavelength-calculator').style.display = 'block';
            this.updateInstructions("Вычислите длины волн красного и синего света, используя формулу λ = d·a/b.");
        }
    },
    
    checkWavelengthCalculation() {
        const redInput = document.getElementById('red-wavelength-input');
        const blueInput = document.getElementById('blue-wavelength-input');
        const resultDisplay = document.getElementById('wavelength-result');
        
        const userRedWavelength = parseFloat(redInput.value);
        const userBlueWavelength = parseFloat(blueInput.value);
        
        if (isNaN(userRedWavelength) || isNaN(userBlueWavelength)) {
            resultDisplay.textContent = "Пожалуйста, введите числовые значения для обоих полей.";
            resultDisplay.className = "error-message";
            return;
        }
        
        const correctRedWavelength = this.experimentState.redWavelength;
        const correctBlueWavelength = this.experimentState.blueWavelength;
        
        const redTolerance = correctRedWavelength * 0.1;
        const blueTolerance = correctBlueWavelength * 0.1;
        
        const redIsCorrect = Math.abs(userRedWavelength - correctRedWavelength) <= redTolerance;
        const blueIsCorrect = Math.abs(userBlueWavelength - correctBlueWavelength) <= blueTolerance;
        
        if (redIsCorrect && blueIsCorrect) {
            resultDisplay.textContent = "Верно! Расчет выполнен правильно.";
            resultDisplay.className = "success-message";
            
            document.getElementById('red-wavelength').textContent = correctRedWavelength.toFixed(0);
            document.getElementById('blue-wavelength').textContent = correctBlueWavelength.toFixed(0);
            document.getElementById('check-wavelength').disabled = true;
            
            this.updateInstructions("Эксперимент завершен! Вы успешно определили длины волн красного и синего света.");
        } else {
            let errorMsg = "Ошибка в расчетах. Проверьте формулу λ = d·a/b";
            resultDisplay.textContent = errorMsg;
            resultDisplay.className = "error-message";
        }
    },
    
    checkExperimentConditions() {
        if (this.experimentState.frameInstalled && this.experimentState.lightOn) {
            requestAnimationFrame(() => {
                this.checkOpticalAlignment();
                this.updateSpectrumQuality();
            });
        }
    },
    
    updateExperimentStep(step) {
        if (step <= this.experimentState.step) return;
        
        this.experimentState.step = step;
        
        document.querySelectorAll('#status-panel ol li').forEach((li, index) => {
            li.classList.remove('active', 'completed');
            if (index + 1 === step) li.classList.add('active');
            if (index + 1 < step) li.classList.add('completed');
        });
        
        physjs.goToStep('step' + step);
    },
    
    updateInstructions(text) {
        const instructionElement = document.getElementById('current-instruction');
        if (instructionElement) instructionElement.textContent = text;
    },
    
    resetExperiment() {
        window.location.reload();
    },
};

export default experimentFunctions;