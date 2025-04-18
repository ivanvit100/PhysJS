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
            experimentState.rubberTubeConnectedToFunnel && !isDraggingFunnel) {
            return false;
        }
        
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
    
    const randomBarometerReading = Math.floor(750 + Math.random() * 20);
    elements.barometerDisplay.textContent = randomBarometerReading;
    experimentState.initialBarometerReading = randomBarometerReading;
    experimentState.currentBarometerReading = randomBarometerReading;
    experimentFunctions.updateBarometerNeedle(randomBarometerReading);
    
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
            
            if (!funnelConstrainedMode) {
                funnelBasePosition = {
                    left: parseInt(elements.funnel.style.left || '300'),
                    top: parseInt(elements.funnel.style.top || '100')
                };
            } else {
                funnelBasePosition.top = parseInt(elements.funnel.style.top || '100');
            }
            
            if (!experimentState.funnelPosition) experimentState.funnelPosition = {};
            
            experimentState.funnelPosition = {
                top: funnelBasePosition.top,
                left: funnelBasePosition.left
            };
            
            if (experimentState.waterInFunnel) {
                experimentFunctions.updateWaterLevels(elements);
                experimentState.corkInserted && experimentFunctions.updateBarometerReadingBasedOnWaterLevel(elements);
                
                if (experimentState.step === 2 && !experimentState.initialWaterLevelSet) {
                    const tubeWaterLevel = experimentFunctions.calculateWaterLevelInTube(elements);
                    
                    if (tubeWaterLevel >= 45 && tubeWaterLevel <= 55) {
                        elements.ruler.style.display = 'block';
                        elements.currentInstruction.textContent = 
                            "Используйте линейку, чтобы измерить длину воздушного столба в трубке";
                    }
                }
                
                if (experimentState.step === 4 && experimentState.corkInserted && 
                    !experimentState.finalMeasurementsDone) {
                    const heightDifference = experimentState.funnelPosition.top - experimentState.initialFunnelHeight;
                    
                    if (heightDifference >= 45) {
                        const heightDifferenceInCm = heightDifference * 0.11;
                        const waterChangeInTube = heightDifferenceInCm * 0.8;
                        const totalWaterLevelDiff = waterChangeInTube;
                        
                        experimentState.waterLevelDifference = totalWaterLevelDiff;
                        elements.waterLevelDiffDisplay.textContent = totalWaterLevelDiff.toFixed(1);
                        
                        experimentFunctions.advanceToStep(5, elements);
                        elements.currentInstruction.textContent = 
                            "Используйте линейку, чтобы измерить новую длину воздушного столба";
                            
                        elements.ruler.style.display = 'block';
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
                            "Теперь установите воронку так, чтобы уровень воды в трубке был на 50 см от верхнего конца";
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
    });
    
    elements.ruler.addEventListener('mousedown', (e) => {
        elements.ruler.classList.add('being-dragged');
    });
    
    physjs.onAttachment((sourceObject, targetObject) => {
        const sourceId = sourceObject.element.id;
        const targetId = targetObject.element.id;
        
        if ((sourceId === 'rubber-tube' && targetId === 'glass-tube') || 
            (sourceId === 'glass-tube' && targetId === 'rubber-tube')) {
            experimentState.rubberTubeConnectedToGlassTube = true;
            
            if (experimentState.rubberTubeConnectedToFunnel) {
                experimentFunctions.updateRubberTubePosition();
                
                funnelBasePosition = {
                    left: parseInt(elements.funnel.style.left || '300'),
                    top: parseInt(elements.funnel.style.top || '100')
                };
                
                applyFunnelConstraints();
            }
            
            experimentFunctions.checkFullConnection(elements);
        }
        
        if ((sourceId === 'rubber-tube' && targetId === 'funnel') || 
            (sourceId === 'funnel' && targetId === 'rubber-tube')) {
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
            experimentState.initialFunnelHeight = experimentState.funnelPosition.top;
            experimentState.initialTubeWaterLevel = parseFloat(elements.tubeWater.style.height || '50');
            experimentState.initialFunnelWaterLevel = parseFloat(elements.funnelWater.style.height || '50');
            experimentState.initialAirVolume = 100 - experimentState.initialTubeWaterLevel;
            experimentFunctions.updateWaterLevels(elements);
            if (experimentState.step === 3) {
                experimentFunctions.advanceToStep(4, elements);
                elements.currentInstruction.textContent = 
                    "Теперь опустите воронку примерно на 50 см ниже первоначального положения";
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
            elements.barometerDisplay.textContent = experimentState.initialBarometerReading.toFixed(0);
            experimentFunctions.updateBarometerNeedle(experimentState.initialBarometerReading);
            
            if (experimentState.step > 3) {
                experimentFunctions.resetToStep(3, elements);
                elements.currentInstruction.textContent = 
                    "Вы вынули пробку. Вставьте пробку обратно, чтобы продолжить эксперимент";
            }
        }
    });
    
    experimentFunctions.setupTooltips();

    elements.currentInstruction.textContent = 
        "Соедините резиновую трубку со стеклянной трубкой и воронкой";
});