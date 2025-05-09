import experimentFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', () => {
    experimentFunctions.initializeExperiment();
    
    document.getElementById('back-btn').addEventListener('click', experimentFunctions.backToMainPage);
    document.getElementById('reset-btn').addEventListener('click', experimentFunctions.resetExperiment.bind(experimentFunctions));
    
    const cylinder = document.getElementById('cylinder');
    if (cylinder) {
        cylinder.ondblclick = function(event) {
            if (experimentFunctions.experimentState.step === 1) {
                experimentFunctions.fillCylinder();
                event.stopPropagation();
                event.preventDefault();
            }
        };
    }
    
    physjs.onAttachment((sourceObj, targetObj) => {
        if ((sourceObj.element.id === 'heater' && targetObj.element.id === 'cylinder' ||
            sourceObj.element.id === 'cylinder' && targetObj.element.id === 'heater') && 
            experimentFunctions.experimentState.step == 2) {
            
            experimentFunctions.experimentState.heaterInWater = true;
            
            const heaterControl = document.getElementById('heater-control');
            if (heaterControl) heaterControl.style.display = 'flex';
            
            setTimeout(() => experimentFunctions.forceSetStep(3), 100);
        }
    });
    
    const createTooltip = (element, text) => {
        if (element) {
            element.addEventListener('mouseover', (e) => {
                const tooltip = document.getElementById('tooltip');
                if (tooltip) {
                    tooltip.textContent = text;
                    tooltip.style.left = `${e.clientX + 10}px`;
                    tooltip.style.top = `${e.clientY + 10}px`;
                    tooltip.style.display = 'block';
                }
            });
            
            element.addEventListener('mouseout', () => {
                const tooltip = document.getElementById('tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
        }
    };
    
    createTooltip(cylinder, "Цилиндрический сосуд с водой. Двойной клик для наполнения водой.");
    createTooltip(thermometer, "Термометр для измерения температуры воды.");
    createTooltip(heater, "Кипятильник. Опустите его в воду.");
    
    setTimeout(() => {
        experimentFunctions.forceSetStep(1);
    }, 100);
});