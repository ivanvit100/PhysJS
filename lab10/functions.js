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
        rulerBlockingBeam: false,
        lastRulerCheckTime: 0,
        activeFilter: null
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
        
        const filters = document.querySelectorAll('.filter, .red-filter, .green-filter, .blue-filter');
        filters.forEach(filter => {
            if (filter) {
                filter.addEventListener('mousedown', () => {
                    this.experimentState.isDragging = true;
                    this.experimentState.draggedElement = filter.className;
                    document.addEventListener('mousemove', this.handleDragMove);
                });
                
                filter.addEventListener('mouseup', () => {
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
                experimentFunctions.checkRulerPosition();
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
            
            const filteredBeam = document.getElementById('filtered-light-beam');
            if (filteredBeam) filteredBeam.remove();
            
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
        
        const existingFilteredBeam = document.getElementById('filtered-light-beam');
        if (existingFilteredBeam) existingFilteredBeam.remove();
        
        const lightBeam = document.getElementById('light-beam');
        const lightImpact = document.getElementById('light-impact');
        const lightSource = document.getElementById('light-source');
        const grating = document.getElementById('diffraction-grating');
        const lens = document.getElementById('lens');
        const screen = document.getElementById('screen');
        const ruler = document.getElementById('ruler');
        const redFilter = document.querySelector('.red-filter');
        const greenFilter = document.querySelector('.green-filter');
        const blueFilter = document.querySelector('.blue-filter');
        
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
        
        this.experimentState.activeFilter = null;
        lightBeam.style.background = 'linear-gradient(to right, rgba(245, 245, 200, .6), rgba(245, 245, 200, 0.4))';
        lightBeam.style.boxShadow = '0 0 2px 1px rgba(245, 245, 200, 0.7), 0 0 4px 2px rgba(245, 245, 200, 0.5), 0 0 8px 4px rgba(245, 245, 200, 0.3)';
        
        let firstFilter = null;
        let firstFilterRect = null;
        let filterType = null;
        
        if (redFilter) {
            const redFilterRect = redFilter.getBoundingClientRect();
            if (this.isElementInBeamPath(redFilterRect, sourceRect, beamY)) {
                if (!firstFilter || redFilterRect.left < firstFilterRect.left) {
                    firstFilter = redFilter;
                    firstFilterRect = redFilterRect;
                    filterType = 'red';
                    console.log("Луч пересекается с красным фильтром");
                }
            }
        }
        
        if (greenFilter) {
            const greenFilterRect = greenFilter.getBoundingClientRect();
            if (this.isElementInBeamPath(greenFilterRect, sourceRect, beamY)) {
                if (!firstFilter || greenFilterRect.left < firstFilterRect.left) {
                    firstFilter = greenFilter;
                    firstFilterRect = greenFilterRect;
                    filterType = 'green';
                    console.log("Луч пересекается с зеленым фильтром");
                }
            }
        }
        
        if (blueFilter) {
            const blueFilterRect = blueFilter.getBoundingClientRect();
            if (this.isElementInBeamPath(blueFilterRect, sourceRect, beamY)) {
                if (!firstFilter || blueFilterRect.left < firstFilterRect.left) {
                    firstFilter = blueFilter;
                    firstFilterRect = blueFilterRect;
                    filterType = 'blue';
                    console.log("Луч пересекается с синим фильтром");
                }
            }
        }
        
        if (firstFilter) {
            this.experimentState.activeFilter = filterType;
        }
        
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
        
        if (firstFilter) {
            const beamWidth1 = firstFilterRect.left - startX;
            lightBeam.style.width = beamWidth1 + 'px';
            lightBeam.style.left = startX + 'px';
            lightBeam.style.top = beamY + 'px';
            lightBeam.classList.add('visible');
            
            const filteredBeam = document.createElement('div');
            filteredBeam.id = 'filtered-light-beam';
            filteredBeam.className = 'light-beam visible';
            filteredBeam.style.position = 'absolute';
            filteredBeam.style.height = '2px';
            filteredBeam.style.left = firstFilterRect.left + 'px';
            filteredBeam.style.top = beamY + 'px';
            filteredBeam.style.width = (endX - firstFilterRect.left) + 'px';
            
            if (filterType === 'red') {
                filteredBeam.style.background = 'linear-gradient(to right, rgba(255, 0, 0, .6), rgba(255, 0, 0, 0.4))';
                filteredBeam.style.boxShadow = '0 0 2px 1px rgba(255, 0, 0, 0.7), 0 0 4px 2px rgba(255, 0, 0, 0.5), 0 0 8px 4px rgba(255, 0, 0, 0.3)';
            } else if (filterType === 'green') {
                filteredBeam.style.background = 'linear-gradient(to right, rgba(0, 255, 0, .6), rgba(0, 255, 0, 0.4))';
                filteredBeam.style.boxShadow = '0 0 2px 1px rgba(0, 255, 0, 0.7), 0 0 4px 2px rgba(0, 255, 0, 0.5), 0 0 8px 4px rgba(0, 255, 0, 0.3)';
            } else if (filterType === 'blue') {
                filteredBeam.style.background = 'linear-gradient(to right, rgba(0, 0, 255, .6), rgba(0, 0, 255, 0.4))';
                filteredBeam.style.boxShadow = '0 0 2px 1px rgba(0, 0, 255, 0.7), 0 0 4px 2px rgba(0, 0, 255, 0.5), 0 0 8px 4px rgba(0, 0, 255, 0.3)';
            }
            
            document.body.appendChild(filteredBeam);
        } else {
            const beamWidth = endX - startX;
            lightBeam.style.left = startX + 'px';
            lightBeam.style.top = beamY + 'px';
            lightBeam.style.width = beamWidth + 'px';
            lightBeam.classList.add('visible');
        }
        
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
    
    checkRulerPosition() {
        if (!this.experimentState.spectrumVisible || this.experimentState.step < 4) return;
        
        const now = performance.now();
        if (now - this.experimentState.lastRulerCheckTime < 1000) return;
        this.experimentState.lastRulerCheckTime = now;
        
        const screen = document.querySelector('#screen');
        const ruler = document.querySelector('#ruler');
        
        if (!screen || !ruler) return;
        
        const screenRect = screen.getBoundingClientRect();
        const rulerRect = ruler.getBoundingClientRect();
        
        const doRectanglesOverlap = !(
            rulerRect.right < screenRect.left ||
            rulerRect.left > screenRect.right ||
            rulerRect.bottom < screenRect.top ||
            rulerRect.top > screenRect.bottom
        );
        
        if (doRectanglesOverlap) {
            if (this.experimentState.step === 4 && !this.experimentState.redMeasured) {
                this.measureRedEdge();
            } else if (this.experimentState.step === 5 && !this.experimentState.blueMeasured) {
                this.measureBlueEdge();
            }
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
                    this.updateInstructions("Поднесите линейку к экрану, чтобы измерить расстояние от центра до красного края спектра.");
                }
            } else {
                this.showBlurredSpectrum(quality);
            }
        } else {
            this.hideSpectrum();
        }
    },
    
    showSpectrum() {
        const screen = document.querySelector('#screen .spectrum-display');
        const leftSpectrum = document.querySelector('.left-spectrum');
        const rightSpectrum = document.querySelector('.right-spectrum');
        const centralLine = document.querySelector('.central-line');
        
        if (!screen || !leftSpectrum || !rightSpectrum || !centralLine) return;
        
        screen.classList.add('spectrum-visible');
        screen.style.overflow = 'hidden';
        
        leftSpectrum.classList.remove('visible');
        rightSpectrum.classList.remove('visible');
        centralLine.style.display = 'none';
        
        const beamOffsetPercent = this.experimentState.beamOffsetY || 50;
        
        screen.querySelectorAll('.spectrum-element, .spectrum-container').forEach(el => el.remove());
        
        const blockWidth = 100;
        const numBlocks = 5;
        const totalWidth = blockWidth * numBlocks;
        
        const spectrumContainer = document.createElement('div');
        spectrumContainer.className = 'spectrum-container';
        spectrumContainer.style.position = 'absolute';
        spectrumContainer.style.top = `${beamOffsetPercent}%`;
        spectrumContainer.style.left = '0';
        spectrumContainer.style.width = `${totalWidth}px`;
        spectrumContainer.style.height = '50%';
        spectrumContainer.style.transform = 'translateY(-50%)';
        
        let maskImage = 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.05) 100%)';
        
        let spectrumBackground;
        if (this.experimentState.activeFilter === 'red')
            spectrumBackground = 'linear-gradient(to right, red, orange, transparent, transparent, transparent)';
        else if (this.experimentState.activeFilter === 'green')
            spectrumBackground = 'linear-gradient(to right, transparent, transparent, transparent, lime, green, transparent)';
        else if (this.experimentState.activeFilter === 'blue')
            spectrumBackground = 'linear-gradient(to right, transparent, transparent, transparent, blue, indigo, transparent)';
        else
            spectrumBackground = 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)';
        
        spectrumContainer.style.maskImage = maskImage;
        spectrumContainer.style.webkitMaskImage = maskImage;
        
        screen.appendChild(spectrumContainer);
        
        for (let i = 0; i < numBlocks; i++) {
            const spectrumBlock = document.createElement('div');
            spectrumBlock.className = 'spectrum-element';
            spectrumContainer.appendChild(spectrumBlock);
            
            const left = i * blockWidth;
            
            spectrumBlock.style.position = 'absolute';
            spectrumBlock.style.left = `${left}px`;
            spectrumBlock.style.top = '0';
            spectrumBlock.style.width = `${blockWidth}px`;
            spectrumBlock.style.height = '100%';
            spectrumBlock.style.background = spectrumBackground;
            spectrumBlock.classList.add('visible');
        }
        
        this.experimentState.spectrumVisible = true;
        this.checkRulerPosition();
    },
    
    showBlurredSpectrum(quality) {
        const screen = document.querySelector('#screen .spectrum-display');
        const leftSpectrum = document.querySelector('.left-spectrum');
        const rightSpectrum = document.querySelector('.right-spectrum');
        const centralLine = document.querySelector('.central-line');
        
        if (!screen || !leftSpectrum || !rightSpectrum || !centralLine) return;
        
        screen.classList.add('spectrum-visible');
        screen.style.overflow = 'hidden';
        
        leftSpectrum.classList.remove('visible');
        rightSpectrum.classList.remove('visible');
        centralLine.style.display = 'none';
        
        const beamOffsetPercent = this.experimentState.beamOffsetY || 50;
        const blurAmount = Math.max(0, (80 - quality) / 8);
        
        screen.querySelectorAll('.spectrum-element, .spectrum-container').forEach(el => el.remove());
        
        const blockWidth = 100;
        const visibleBlocks = Math.max(1, Math.floor(quality / 25) + 1);
        const numBlocks = Math.min(5, visibleBlocks);
        const totalWidth = blockWidth * numBlocks;
        
        const spectrumContainer = document.createElement('div');
        spectrumContainer.className = 'spectrum-container';
        spectrumContainer.style.position = 'absolute';
        spectrumContainer.style.top = `${beamOffsetPercent}%`;
        spectrumContainer.style.left = '0';
        spectrumContainer.style.width = `${totalWidth}px`;
        spectrumContainer.style.height = '50%';
        spectrumContainer.style.transform = 'translateY(-50%)';
        
        const baseOpacity = quality < 20 ? quality / 20 * 0.2 : quality / 100 * 0.8 + 0.2;
        let maskImage = `linear-gradient(to right, rgba(0,0,0,${baseOpacity}) 0%, rgba(0,0,0,0.05) 100%)`;
        
        let spectrumBackground;
        if (this.experimentState.activeFilter === 'red')
            spectrumBackground = 'linear-gradient(to right, red, orange, transparent, transparent, transparent)';
        else if (this.experimentState.activeFilter === 'green')
            spectrumBackground = 'linear-gradient(to right, transparent, transparent, yellow, green, transparent)';
        else if (this.experimentState.activeFilter === 'blue')
            spectrumBackground = 'linear-gradient(to right, transparent, transparent, transparent, blue, indigo, violet)';
        else
            spectrumBackground = 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)';
        
        spectrumContainer.style.maskImage = maskImage;
        spectrumContainer.style.webkitMaskImage = maskImage;
        
        screen.appendChild(spectrumContainer);
        
        for (let i = 0; i < numBlocks; i++) {
            const spectrumBlock = document.createElement('div');
            spectrumBlock.className = 'spectrum-element';
            spectrumContainer.appendChild(spectrumBlock);
            
            const left = i * blockWidth;
            
            spectrumBlock.style.position = 'absolute';
            spectrumBlock.style.left = `${left}px`;
            spectrumBlock.style.top = '0';
            spectrumBlock.style.width = `${blockWidth}px`;
            spectrumBlock.style.height = '100%';
            spectrumBlock.style.background = spectrumBackground;
            spectrumBlock.style.filter = `blur(${blurAmount + (i * 1.0)}px)`;
            spectrumBlock.classList.add('visible');
        }
        
        this.experimentState.spectrumVisible = true;
        this.checkRulerPosition();
    },
    
    showDiffractedBeam() {
        const screen = document.querySelector('#screen .spectrum-display');
        const leftSpectrum = document.querySelector('.left-spectrum');
        const rightSpectrum = document.querySelector('.right-spectrum');
        const centralLine = document.querySelector('.central-line');
        
        if (!screen || !leftSpectrum || !rightSpectrum || !centralLine) return;
        
        screen.classList.add('spectrum-visible');
        screen.style.overflow = 'hidden';
        
        leftSpectrum.classList.remove('visible');
        rightSpectrum.classList.remove('visible');
        centralLine.style.display = 'none';
        
        const beamOffsetPercent = this.experimentState.beamOffsetY || 50;
        
        screen.querySelectorAll('.spectrum-element, .spectrum-container').forEach(el => el.remove());
        
        const blockWidth = 100;
        const numBlocks = 2;
        const totalWidth = blockWidth * numBlocks;
        
        const spectrumContainer = document.createElement('div');
        spectrumContainer.className = 'spectrum-container';
        spectrumContainer.style.position = 'absolute';
        spectrumContainer.style.top = `${beamOffsetPercent}%`;
        spectrumContainer.style.left = '0';
        spectrumContainer.style.width = `${totalWidth}px`;
        spectrumContainer.style.height = '40%';
        spectrumContainer.style.transform = 'translateY(-50%)';
        spectrumContainer.style.filter = 'blur(15px)';
        
        let maskImage = 'linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 100%)';
        
        let spectrumBackground;
        if (this.experimentState.activeFilter === 'red')
            spectrumBackground = 'linear-gradient(to right, red, orange, transparent, transparent, transparent)';
        else if (this.experimentState.activeFilter === 'green')
            spectrumBackground = 'linear-gradient(to right, transparent, transparent, yellow, green, transparent)';
        else if (this.experimentState.activeFilter === 'blue')
            spectrumBackground = 'linear-gradient(to right, transparent, transparent, transparent, blue, indigo, violet)';
        else
            spectrumBackground = 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)';
        
        spectrumContainer.style.maskImage = maskImage;
        spectrumContainer.style.webkitMaskImage = maskImage;
        
        screen.appendChild(spectrumContainer);
        
        for (let i = 0; i < numBlocks; i++) {
            const spectrumBlock = document.createElement('div');
            spectrumBlock.className = 'spectrum-element';
            spectrumContainer.appendChild(spectrumBlock);
            
            const left = i * blockWidth;
            
            spectrumBlock.style.position = 'absolute';
            spectrumBlock.style.left = `${left}px`;
            spectrumBlock.style.top = '0';
            spectrumBlock.style.width = `${blockWidth}px`;
            spectrumBlock.style.height = '100%';
            spectrumBlock.style.background = spectrumBackground;
            spectrumBlock.classList.add('visible');
        }
        
        this.experimentState.spectrumVisible = true;
    },
    
    showFocusedBeam() {
        const screen = document.querySelector('#screen .spectrum-display');
        const leftSpectrum = document.querySelector('.left-spectrum');
        const rightSpectrum = document.querySelector('.right-spectrum');
        const centralLine = document.querySelector('.central-line');
        
        if (!screen || !leftSpectrum || !rightSpectrum || !centralLine) return;
        
        screen.classList.add('spectrum-visible');
        screen.style.overflow = 'hidden';
        
        leftSpectrum.classList.remove('visible');
        rightSpectrum.classList.remove('visible');
        centralLine.style.display = 'block';
        
        const currentDistance = this.experimentState.screenDistance;
        const optimalDistance = this.experimentState.optimumFocusDistance;
        const tolerance = optimalDistance * (this.experimentState.focusTolerancePercent / 100);
        
        let quality = 100 - (Math.abs(currentDistance - optimalDistance) / tolerance * 100);
        quality = Math.max(0, Math.min(100, quality));
        
        const beamOffsetPercent = this.experimentState.beamOffsetY;
        
        centralLine.style.left = `${beamOffsetPercent}%`;
        centralLine.style.top = '0';
        centralLine.style.transform = 'translateX(-50%)';
        centralLine.style.width = '20px';
        centralLine.style.height = '100%';
        
        if (this.experimentState.activeFilter === 'red') {
            centralLine.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        } else if (this.experimentState.activeFilter === 'green') {
            centralLine.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
        } else if (this.experimentState.activeFilter === 'blue') {
            centralLine.style.backgroundColor = 'rgba(0, 0, 255, 0.3)';
        } else if (quality > 80) {
            centralLine.style.backgroundColor = 'rgba(255, 255, 0, 0.15)';
            centralLine.style.filter = '';
        } else {
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
        screen.style.overflow = 'hidden';
        
        leftSpectrum.classList.remove('visible');
        rightSpectrum.classList.remove('visible');
        centralLine.style.display = 'block';
        
        const beamOffsetPercent = this.experimentState.beamOffsetY;
        
        centralLine.style.left = `${beamOffsetPercent}%`;
        centralLine.style.top = '0';
        centralLine.style.width = '20px'; 
        centralLine.style.height = '100%';
        centralLine.style.transform = 'translateX(-50%)';
        centralLine.style.filter = '';
        
        if (this.experimentState.activeFilter === 'red')
            centralLine.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        else if (this.experimentState.activeFilter === 'green')
            centralLine.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
        else if (this.experimentState.activeFilter === 'blue')
            centralLine.style.backgroundColor = 'rgba(0, 0, 255, 0.3)';
        else
            centralLine.style.backgroundColor = 'rgba(255, 255, 0, 0.15)';
        
        this.experimentState.spectrumVisible = true;
    },
    
    hideSpectrum() {
        const screen = document.querySelector('#screen .spectrum-display');
        
        if (screen) {
            screen.classList.remove('spectrum-visible');
            screen.style.overflow = '';
            screen.querySelectorAll('.spectrum-element, .spectrum-container').forEach(el => el.remove());
        }
        
        const centralLine = document.querySelector('.central-line');
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
            const filteredBeam = document.getElementById('filtered-light-beam');
            
            if (lightBeam) lightBeam.classList.remove('visible');
            if (lightImpact) lightImpact.classList.remove('visible');
            if (filteredBeam) filteredBeam.remove();
            
            this.hideSpectrum();
        }
    },
    
    measureRedEdge() {
        const redEdgeDistance = 34;
        
        this.experimentState.redEdgeDistance = redEdgeDistance;
        document.getElementById('red-edge-distance').textContent = redEdgeDistance.toFixed(1);
        
        const screenDistance = this.experimentState.screenDistance;
        const gratingConstant = this.experimentState.gratingConstant;
        const redWavelength = gratingConstant * redEdgeDistance / screenDistance * 1000000;
        this.experimentState.redWavelength = redWavelength;
        this.experimentState.redMeasured = true;
        
        if (this.experimentState.step === 4) {
            this.updateExperimentStep(5);
            this.updateInstructions("Теперь поднесите линейку к экрану, чтобы измерить расстояние от центра до синего края спектра.");
        }
    },
    
    measureBlueEdge() {
        const blueEdgeDistance = 23;
        
        this.experimentState.blueEdgeDistance = blueEdgeDistance;
        document.getElementById('blue-edge-distance').textContent = blueEdgeDistance.toFixed(1);
        
        const screenDistance = this.experimentState.screenDistance;
        const gratingConstant = this.experimentState.gratingConstant;
        const blueWavelength = gratingConstant * blueEdgeDistance / screenDistance * 1000000;
        this.experimentState.blueWavelength = blueWavelength;
        this.experimentState.blueMeasured = true;
        
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
            resultDisplay.textContent = "Ошибка в расчетах. Проверьте формулу λ = d·a/b";
            resultDisplay.className = "error-message";
        }
    },
    
    checkExperimentConditions() {
        if (this.experimentState.frameInstalled && this.experimentState.lightOn) {
            requestAnimationFrame(() => {
                this.checkOpticalAlignment();
                this.updateSpectrumQuality();
                this.checkRulerPosition();
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
    }
};

export default experimentFunctions;