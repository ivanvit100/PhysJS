import experimentFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', () => {
    const experimentState = experimentFunctions.experimentState;
    window.experimentState = experimentState;

    const elements = {
        glassTube: document.getElementById('glass-tube'),
        funnel: document.getElementById('funnel'),
        rubberTube: document.getElementById('rubber-tube'),
        cork: document.getElementById('cork'),
        ruler: document.getElementById('ruler'),
        barometer: document.getElementById('barometer'),
        waterContainer: document.getElementById('water-container'),
        tubeWater: document.querySelector('#glass-tube .tube-water'),
        tubeAir: document.querySelector('#glass-tube .tube-air'),
        funnelWater: document.querySelector('#funnel .tube-water'),
        funnelAir: document.querySelector('#funnel .tube-air'),
        currentInstruction: document.getElementById('current-instruction'),
        resetBtn: document.getElementById('reset-btn'),
        backBtn: document.getElementById('back-btn'),
        lengthDisplay1: document.getElementById('length1'),
        lengthDisplay2: document.getElementById('length2'),
        waterLevelDiffDisplay: document.getElementById('water-level-diff'),
        pressureDisplay: document.getElementById('pressure'),
        barometerDisplay: document.getElementById('barometer-display'),
        stepElements: document.querySelectorAll('#status-panel ol li'),
        answerForm: document.getElementById('answer-form'),
        userPressureInput: document.getElementById('user-pressure'),
        submitButton: document.getElementById('submit-answer'),
        answerFeedback: document.getElementById('answer-feedback')
    };
    
    let funnelConstrainedMode = false;
    let isDraggingFunnel = false;
    
    let funnelBasePosition = {
        left: parseInt(elements.funnel.style.left || '300'),
        top: parseInt(elements.funnel.style.top || '100')
    };
    
    physjs.onBeforeAttachment(function(sourceObject, targetObject) {
        const sourceId = sourceObject.element.id;
        const targetId = targetObject.element.id;
        
        if (!experimentFunctions.isAttachmentAllowedForStep(sourceId, targetId, experimentState.step)) {
            experimentFunctions.showAttachmentHint(sourceId, targetId, experimentState.step, elements);
            return false;
        }
        
        return true;
    });
    
    physjs.onBeforeDetachment(function(object) {
        const id = object.element.id;
        
        if (id === 'funnel' && experimentState.rubberTubeConnectedToGlassTube && 
            experimentState.rubberTubeConnectedToFunnel && !isDraggingFunnel)
            return false;
        if (id === 'glass-tube' && experimentState.rubberTubeConnectedToGlassTube && 
            experimentState.rubberTubeConnectedToFunnel)
            return false;
        
        if (!experimentFunctions.isDetachmentAllowedForStep(id, experimentState.step)) {
            experimentFunctions.showDetachmentHint(id, experimentState.step, elements);
            return false;
        }
        
        return true;
    });
    
    experimentFunctions.setupPhysicsObjects();
    experimentFunctions.setupAttachmentPoints();
    
    elements.tubeWater.style.height = '0%';
    elements.funnelWater.style.height = '0%';
    elements.tubeAir.style.height = '100%';
    elements.funnelAir.style.height = '100%';
    
    elements.barometerDisplay.textContent = "760";
    experimentState.initialBarometerReading = 760;
    experimentState.currentBarometerReading = 760;
    experimentFunctions.updateBarometerNeedle(760);
    
    elements.resetBtn.addEventListener('click', () => {
        window.location.reload();
    });
    
    elements.backBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });
    
    if (elements.submitButton) {
        elements.submitButton.addEventListener('click', () => {
            experimentFunctions.calculatePressure(elements);
        });
    }
    
    if (elements.answerForm) {
        elements.answerForm.style.display = "none";
        
        if (elements.userPressureInput) {
            elements.userPressureInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    experimentFunctions.calculatePressure(elements);
                }
            });
        }
    }
    
    const svgContainer = document.createElement('div');
    svgContainer.id = 'svg-container';
    svgContainer.innerHTML = `<svg width="100%" height="100%" style="position:absolute; top:0; left:0; pointer-events:none; z-index:10;"></svg>`;
    document.body.appendChild(svgContainer);
    
    function applyFunnelConstraints() {
        funnelConstrainedMode = experimentFunctions.applyFunnelConstraints(elements, funnelConstrainedMode, funnelBasePosition, isDraggingFunnel);
    }
    
    document.addEventListener('mousemove', (e) => {
        if (elements.funnel.classList.contains('being-dragged')) {
            if (funnelConstrainedMode) {
                const newTop = e.clientY - elements.funnel.offsetHeight / 2;
                elements.funnel.style.top = `${newTop}px`;
                
                if (experimentState.corkInserted) {
                    const initialHeight = experimentState.initialFunnelHeight;
                    const minTop = initialHeight;
                    const maxTop = initialHeight + 200;
                    
                    if (newTop < minTop) elements.funnel.style.top = `${minTop}px`;
                    else if (newTop > maxTop) elements.funnel.style.top = `${maxTop}px`;
                    
                    if (!experimentState.funnelPosition) experimentState.funnelPosition = {};
                    experimentState.funnelPosition.top = parseInt(elements.funnel.style.top);
                    
                    experimentFunctions.updateWaterLevels(elements);
                    experimentFunctions.updateBarometerReadingBasedOnWaterLevel(elements);
                } else {
                    experimentFunctions.limitFunnelMovement(elements.funnel);
                }
                
                experimentFunctions.updateRubberTubePosition();
                elements.funnel.style.left = `${funnelBasePosition.left}px`;
            } else {
                const newLeft = e.clientX - elements.funnel.offsetWidth / 2;
                const newTop = e.clientY - elements.funnel.offsetHeight / 2;
                
                elements.funnel.style.left = `${newLeft}px`;
                elements.funnel.style.top = `${newTop}px`;
            }
        }
        
        if (elements.ruler.classList.contains('being-dragged')) {
            const newLeft = e.clientX - elements.ruler.offsetWidth / 2;
            const newTop = e.clientY - elements.ruler.offsetHeight / 2;
            
            elements.ruler.style.left = `${newLeft}px`;
            elements.ruler.style.top = `${newTop}px`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDraggingFunnel = false;
        
        if (elements.funnel.classList.contains('being-dragged')) {
            elements.funnel.classList.remove('being-dragged');
            
            const currentTop = parseInt(elements.funnel.style.top);
            const currentLeft = parseInt(elements.funnel.style.left);
            
            if (!funnelConstrainedMode) {
                funnelBasePosition = {
                    left: currentLeft || 300,
                    top: currentTop || 100
                };
            }
            
            experimentState.funnelPosition = {
                top: currentTop,
                left: currentLeft
            };
            
            experimentFunctions.updateWaterLevels(elements);
            experimentState.corkInserted && experimentFunctions.updateBarometerReadingBasedOnWaterLevel(elements);
    
            if (experimentState.waterInFunnel) {
                if (experimentState.step === 4 && experimentState.corkInserted && 
                    !experimentState.finalMeasurementsDone) {
                    const waterElements = document.querySelectorAll('.tube-water');
                    if (waterElements.length >= 2) {
                        const glassTube = document.getElementById('glass-tube');
                        const funnel = document.getElementById('funnel');
                        const tubeRect = glassTube.getBoundingClientRect();
                        const funnelRect = funnel.getBoundingClientRect();
                        const tubeWater = document.querySelector('#glass-tube .tube-water');
                        const funnelWater = document.querySelector('#funnel .tube-water');
                        const currentTubeWaterLevel = parseFloat(tubeWater.style.height || (100 - experimentState.airLevel));
                        const currentFunnelWaterLevel = parseFloat(funnelWater.style.height || (100 - experimentState.airLevel));
                        const tubeHeight = tubeRect.height;
                        const funnelHeight = funnelRect.height;
                        const tubeTop = tubeRect.top;
                        const funnelTop = funnelRect.top;
                        const tubeWaterLevelY = tubeTop + tubeHeight * (1 - currentTubeWaterLevel / 100);
                        const funnelWaterLevelY = funnelTop + funnelHeight * (1 - currentFunnelWaterLevel / 100);
                        const waterLevelDiffPixels = Math.abs(funnelWaterLevelY - tubeWaterLevelY);
                        const pixelsPerCm = tubeHeight / 100;
                        const heightDiffInCm = waterLevelDiffPixels / pixelsPerCm;
                        
                        if (heightDiffInCm >= 30) {
                            experimentState.waterLevelDifference = heightDiffInCm;
                            elements.waterLevelDiffDisplay.textContent = heightDiffInCm.toFixed(1);
                            
                            experimentFunctions.advanceToStep(5, elements);
                            elements.currentInstruction.textContent = 
                                "Используйте линейку, чтобы измерить новую длину воздушного столба";
                                
                            elements.ruler.style.display = 'block';
                        }
                    }               
                }
                
                if (experimentState.step === 1 && 
                    experimentState.rubberTubeConnectedToGlassTube && 
                    experimentState.rubberTubeConnectedToFunnel) {
                    
                    if (experimentFunctions.elementsOverlap(elements.funnel, elements.waterContainer, 50)) {
                        experimentState.waterFilled = true;
                        experimentState.waterInRubberTube = true;
                        experimentState.waterInFunnel = true;
                        experimentState.waterInTube = true;
                        
                        experimentFunctions.updateWaterLevels(elements);
                        
                        experimentFunctions.advanceToStep(2, elements);
                        elements.currentInstruction.textContent = 
                            "Теперь установите воронку на одном уровне с трубкой";
                    }
                }
            }
            
            applyFunnelConstraints();
        }
        
        if (elements.ruler.classList.contains('being-dragged')) {
            elements.ruler.classList.remove('being-dragged');
            experimentFunctions.checkRulerMeasurement(elements);
        }
    });
    
    elements.funnel.addEventListener('mousedown', (e) => {
        isDraggingFunnel = true;
        elements.funnel.classList.add('being-dragged');
        
        if (funnelConstrainedMode) elements.funnel.style.left = `${funnelBasePosition.left}px`;
        
        if (experimentState.step === 3) {
            experimentFunctions.resetToStep(2, elements);
            elements.currentInstruction.textContent = 
                "Установите воронку на один уровень с трубкой.";
                
            experimentState.initialWaterLevelSet = false;
        }
    });
    
    elements.ruler.addEventListener('mousedown', (e) => {
        elements.ruler.classList.add('being-dragged');
    });
    
    physjs.onAttachment((sourceObject, targetObject) => {
        const sourceId = sourceObject.element.id;
        const targetId = targetObject.element.id;
        
        if (sourceId === 'glass-tube' && targetId === 'rubber-tube') {
            experimentState.rubberTubeConnectedToGlassTube = true;
            
            if (!experimentState.rubberTubeConnectedToFunnel) {
                const funnel = physjs.getObject('#funnel');
                const rubberTube = physjs.getObject('#rubber-tube');
                
                if (funnel && rubberTube) {
                    const rubberTubeRect = elements.rubberTube.getBoundingClientRect();
                    elements.funnel.style.left = `${rubberTubeRect.left + 100}px`;
                    elements.funnel.style.top = `${rubberTubeRect.top - 50}px`;
                    
                    if (funnel.attach(rubberTube)) {
                        experimentState.rubberTubeConnectedToFunnel = true;
                        
                        const rect = document.querySelector("#glass-tube").getBoundingClientRect();
                        const viewportY = rect.top;
                        document.querySelector("#funnel").style.top = `${viewportY}px`;
                        
                        experimentFunctions.updateRubberTubePosition();
                        experimentFunctions.updateWaterLevels(elements);
                    }
                }
            }
            experimentFunctions.checkFullConnection(elements);
        }
        
        if (sourceId === 'funnel' && targetId === 'rubber-tube') {
            experimentState.rubberTubeConnectedToFunnel = true;
            
            if (experimentState.rubberTubeConnectedToGlassTube) {
                experimentFunctions.updateRubberTubePosition();
                
                funnelBasePosition = {
                    left: parseInt(elements.funnel.style.left || '300'),
                    top: parseInt(elements.funnel.style.top || '100')
                };
                
                applyFunnelConstraints();
            }
            
            experimentFunctions.checkFullConnection(elements);
        }
        
        if ((sourceId === 'cork' && targetId === 'glass-tube') || 
            (sourceId === 'glass-tube' && targetId === 'cork')) {
            experimentState.corkInserted = true;
            elements.cork.style.transform = 'translateY(-5px)';
            
            const tubeBounds = elements.glassTube.getBoundingClientRect();
            const tubeTop = tubeBounds.top;
            
            elements.funnel.style.top = `${tubeTop}px`;
            const currentTop = parseInt(elements.funnel.style.top);
            
            experimentState.initialFunnelHeight = currentTop;
            experimentState.funnelPosition = {
                top: currentTop,
                left: parseInt(elements.funnel.style.left || '300')
            };
            
            experimentState.initialTubeWaterLevel = parseFloat(elements.tubeWater.style.height);
            experimentState.initialFunnelWaterLevel = parseFloat(elements.funnelWater.style.height);
            
            if (!experimentState.initialAirColumnLength)
                experimentState.initialAirColumnLength = 100 - experimentState.initialTubeWaterLevel;
            
            experimentState.initialAirVolume = 100 - experimentState.initialTubeWaterLevel;
            experimentFunctions.updateWaterLevels(elements);
            
            if (experimentState.step === 3) {
                experimentFunctions.advanceToStep(4, elements);
                elements.currentInstruction.textContent = 
                    "Теперь опустите воронку ниже первоначального положения";
            }
        }
    });
    
    physjs.onDetachment((object) => {
        const id = object.element.id;
        
        if (id === 'rubber-tube') {
            if (experimentState.rubberTubeConnectedToGlassTube) experimentState.rubberTubeConnectedToGlassTube = false;
            if (experimentState.rubberTubeConnectedToFunnel) experimentState.rubberTubeConnectedToFunnel = false;
            
            experimentState.systemConnected = false;
            elements.rubberTube.classList.remove('connected');
            elements.rubberTube.style.transform = 'rotate(0deg)';
            elements.rubberTube.style.width = '150px';
            elements.rubberTube.style.left = '450px';
            elements.rubberTube.style.top = '350px';
            
            const path = document.getElementById('rubber-tube-path');
            if (path) path.remove();
            
            elements.rubberTube.style.display = 'block';
            
            if (experimentState.waterFilled && experimentState.step < 3) experimentFunctions.resetWaterFilling();
            
            funnelConstrainedMode = false;
        }

        if (id === 'cork' && experimentState.corkInserted) {
            experimentState.corkInserted = false;
            experimentState.initialWaterLevelSet = false;
            elements.barometerDisplay.textContent = experimentState.initialBarometerReading.toFixed(0);
            experimentFunctions.updateBarometerNeedle(experimentState.initialBarometerReading);
            
            experimentFunctions.resetToStep(2, elements);
            elements.currentInstruction.textContent = 
                "Вы вынули пробку. Теперь установите уровень воды в трубке.";
                
            if (elements.answerForm)
                elements.answerForm.style.display = "none";
            
            elements.lengthDisplay1.textContent = "0.0";
            elements.lengthDisplay2.textContent = "0.0";
            elements.waterLevelDiffDisplay.textContent = "0.0";
            experimentFunctions.updateWaterLevels(elements);
        }
    });
    
    experimentFunctions.setupTooltips();

    elements.currentInstruction.textContent = 
        "Соедините резиновую трубку со стеклянной трубкой и воронкой";

    const tabsContent = intro.createTabContent([
      'status-panel',
      'measurement-panel'
    ], 'tabs-container');
      
    const tabButtons = tabsContent.querySelectorAll('.info-content-buttons button');
    tabButtons[0].textContent = 'Порядок';
    tabButtons[1].textContent = 'Результаты';
    
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
});