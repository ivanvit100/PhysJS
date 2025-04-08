import experimentFunctions from './functions.js';

let experimentState = {
    step: 1,
    dynamometerMounted: false,
    rulerAttached: false,
    initialPositionMarked: false,
    weightAttached: false,
    extension1: 0,
    extension1Measured: false,
    weightInWater: false,
    extension2: 0,
    extension2Measured: false,
    volumeMeasured: false,
    volume: 12.5,  
    calculationsSubmitted: false,
    springConstant: 12.25,
    mass: 25,
    initialMarkerPosition: 0,
    extendedMarkerPosition: 0,
    waterMarkerPosition: 0    
};

document.addEventListener('DOMContentLoaded', function() {
    const stand = document.getElementById('stand');
    const dynamometer = document.getElementById('dynamometer');
    const spring = document.querySelector('.spring');
    const springEnd = document.getElementById('spring-end');
    const pointer = document.getElementById('pointer');
    const weight = document.getElementById('weight');
    const waterContainer = document.getElementById('water-container');
    const water = document.getElementById('water');
    const ruler = document.getElementById('ruler');
    const tooltip = document.getElementById('tooltip');

    const extension1Display = document.getElementById('extension1');
    const extension2Display = document.getElementById('extension2');
    const volumeDisplay = document.getElementById('volume');
    const springConstantDisplay = document.getElementById('spring-constant');
    const massArchimedesDisplay = document.getElementById('mass-archimedes');
    const currentInstructionDisplay = document.getElementById('current-instruction');

    const calculationPanel = document.getElementById('calculation-panel');
    const springConstantInput = document.getElementById('spring-constant-input');
    const massInput = document.getElementById('mass-input');
    const checkCalculationsBtn = document.getElementById('check-calculations-btn');
    const calculationResult = document.getElementById('calculation-result');

    const resetBtn = document.getElementById('reset-btn');
    const backBtn = document.getElementById('back-btn');

    let draggingWaterContainer = false;

    const stepElements = [];
    for (let i = 1; i <= 5; i++) 
        stepElements.push(document.getElementById(`step${i}`));

    function updateInstructions(text) {
        currentInstructionDisplay.textContent = text;
    }

    function advanceToStep(step) {
        experimentFunctions.advanceToStep(stepElements, experimentState, step);
    }

    function showCalculationPanel() {
        calculationPanel.style.display = 'block';
    }
    
    function hideCalculationPanel() {
        calculationPanel.style.display = 'none';
    }

    checkCalculationsBtn.addEventListener('click', () => {
        experimentFunctions.checkCalculations(
            experimentState, 
            springConstantInput, 
            massInput, 
            calculationResult, 
            springConstantDisplay, 
            massArchimedesDisplay, 
            hideCalculationPanel, 
            updateInstructions
        );
    });
    
    document.getElementById('experiment-area').addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    document.addEventListener('keydown', function(e) {
        if (e.key.toLowerCase() === 'q' || e.key.toLowerCase() === 'e') {
            e.stopPropagation(); 
            e.preventDefault(); 
            return false;
        }
    }, true);

    waterContainer.addEventListener('mousedown', function(e) {
        if (e.button === 0 && waterContainer.classList.contains('phys')) { 
            draggingWaterContainer = true;
        }
    });
    
    document.addEventListener('mouseup', function(e) {
        if (draggingWaterContainer) {
            draggingWaterContainer = false;
            
            if (experimentState.step === 5 && !experimentState.weightInWater) {
                if (waterContainer.classList.contains('phys')) {
                    const waterContainerRect = waterContainer.getBoundingClientRect();
                    const dynamometerRect = dynamometer.getBoundingClientRect();
                    const weightRect = weight.getBoundingClientRect();
                    const standRect = stand.getBoundingClientRect();
                    
                    const nearDynamometer = experimentFunctions.isNearby(waterContainerRect, dynamometerRect, 100);
                    const nearWeight = experimentFunctions.isNearby(waterContainerRect, weightRect, 100);
                    const nearStand = experimentFunctions.isNearby(waterContainerRect, standRect, 100);
                    
                    if (nearDynamometer || nearWeight || nearStand) {
                        const waterContainerObj = physjs.getObject('#water-container');
                        const standObj = stand.getBoundingClientRect();
                        
                        experimentFunctions.fixWaterContainer(
                            experimentState, 
                            waterContainer, 
                            waterContainerObj, 
                            standObj, 
                            () => experimentFunctions.placeWeightInWater(
                                experimentState, 
                                springEnd, 
                                pointer, 
                                spring, 
                                weight, 
                                water, 
                                volumeDisplay, 
                                updateInstructions
                            )
                        );
                    }
                }
            }
        }
    });

    let draggingRuler = false;
    
    function startDragRuler(e) {
        if (e.button !== 0) return;
        draggingRuler = true;
        document.addEventListener('mousemove', dragRuler);
    }
    
    function dragRuler(e) {
        if (!draggingRuler) return;
        
        const rulerObj = physjs.getObject('#ruler');
        rulerObj && rulerObj.setPosition(e.clientX - ruler.offsetWidth / 2, e.clientY - ruler.offsetHeight / 2);
    }
    
    function stopDragRuler() {
        draggingRuler = false;
        document.removeEventListener('mousemove', dragRuler);
    }
    
    ruler.addEventListener('mousedown', function(e) {
        !experimentState.rulerAttached && startDragRuler(e);
    });
    
    document.addEventListener('mouseup', stopDragRuler);

    ruler.addEventListener('click', function(e) {
        if (experimentState.rulerAttached) {
            if (experimentState.step === 2 && !experimentState.initialPositionMarked)
                experimentFunctions.markInitialPosition(ruler, experimentState, advanceToStep, updateInstructions);
            else if (experimentState.step === 4 && experimentState.weightAttached && !experimentState.extension1Measured)
                experimentFunctions.markExtendedPosition(ruler, experimentState, advanceToStep, updateInstructions, extension1Display);
            else if (experimentState.step === 5 && experimentState.weightInWater && !experimentState.extension2Measured)
                experimentFunctions.markWaterPosition(ruler, experimentState, updateInstructions, extension2Display, showCalculationPanel);
        }
    });

    setInterval(() => {
        if (experimentState.weightAttached && !experimentState.weightInWater && experimentState.step === 4) {
            const waterContainerRect = waterContainer.getBoundingClientRect();
            const weightRect = weight.getBoundingClientRect();
            
            if (weightRect.left < waterContainerRect.right && 
                weightRect.right > waterContainerRect.left && 
                weightRect.top < waterContainerRect.bottom && 
                weightRect.bottom > waterContainerRect.top) {
                experimentFunctions.placeWeightInWater(
                    experimentState, 
                    springEnd, 
                    pointer, 
                    spring, 
                    weight, 
                    water, 
                    volumeDisplay, 
                    updateInstructions
                );
            }
        }
    }, 200);

    physjs.onAttachment(function(sourceObject, targetObject) {
        const sourceElement = sourceObject.element;
        const targetElement = targetObject.element;
    
        if ((sourceElement.id === 'dynamometer' && targetElement.id === 'stand') ||
            (sourceElement.id === 'stand' && targetElement.id === 'dynamometer')) {
            
            experimentState.dynamometerMounted = true;
            
            setTimeout(() => {
                advanceToStep(2);
                updateInstructions("Теперь прикрепите линейку к динамометру, используя правую кнопку мыши.");
            }, 500);
        }
        
        else if ((sourceElement.id === 'ruler' && targetElement.id === 'dynamometer') ||
                 (sourceElement.id === 'dynamometer' && targetElement.id === 'ruler')) {
            
            const rulerObj = physjs.getObject('#ruler');
            const dynamometerObj = physjs.getObject('#dynamometer');
            const standObj = document.querySelector('#stand').getBoundingClientRect();
            
            if (rulerObj) {
                rulerObj.rotation = 90;
                rulerObj.element.style.transform = 'rotate(90deg)';
                rulerObj.setPosition(0, 320);
            }
            if (dynamometerObj) {
                dynamometerObj.setPosition(standObj.x + 30, standObj.y + 50);
            }
    
            experimentState.rulerAttached = true;
    
            updateInstructions("Линейка прикреплена. Нажмите на линейку, чтобы отметить начальное положение пружины.");
        }
        
        else if ((sourceElement.id === 'weight' && targetElement.id === 'dynamometer') ||
                 (sourceElement.id === 'dynamometer' && targetElement.id === 'weight')) {
    
            experimentState.weightAttached = true;
    
            springEnd.style.transition = 'top 0.7s ease-in-out';
            pointer.style.transition = 'top 0.7s ease-in-out';
            spring.style.transition = 'height 0.7s ease-in-out';
    
            const dynamometerObj = physjs.getObject('#dynamometer');
            const standObj = document.querySelector('#stand').getBoundingClientRect();
            dynamometerObj.setPosition(standObj.x + 30, standObj.y + 50);
    
            setTimeout(() => {
                spring.style.height = '120px';
    
                const weightObj = physjs.getObject('#weight');
                weightObj.setPosition(standObj.x + 30, standObj.y + 240);
                
                springEnd.style.top = '180px';
                pointer.style.top = '185px';
                
                advanceToStep(4);
                updateInstructions("Груз прикреплен и пружина растянута. Нажмите на линейку, чтобы отметить новое положение и измерить удлинение (x₁).");
            }, 100);
        }

        resetBtn.addEventListener('click', function() {
            experimentFunctions.resetExperiment(experimentState, {
                dynamometer, spring, springEnd, pointer, weight, 
                ruler, waterContainer, water, calculationPanel,
                extension1Display, extension2Display, volumeDisplay,
                springConstantDisplay, massArchimedesDisplay,
                calculationResult, springConstantInput, massInput,
                stepElements, currentInstructionDisplay
            });
        });
    });

    function initializeExperiment() {
        physjs.setDebugMode(false);
    
        experimentFunctions.initializePhysicsObject('#stand', 'stand', true);
        experimentFunctions.initializePhysicsObject('#dynamometer', 'dynamometer', false);
        experimentFunctions.initializePhysicsObject('#ruler', 'ruler', false);
        experimentFunctions.initializePhysicsObject('#weight', 'weight', false);
        experimentFunctions.initializePhysicsObject('#spring-end', 'spring-end', false);
        experimentFunctions.initializePhysicsObject('#water-container', 'water-container', false);
      
        experimentFunctions.setupTooltips(tooltip);
        experimentFunctions.setupAttachmentPoints();
        experimentFunctions.setupLabSteps();
        
        setTimeout(() => {
            physjs.goToStep('step1');
        }, 100);

        backBtn && backBtn.addEventListener('click', experimentFunctions.goBack);
    }

    initializeExperiment();
});