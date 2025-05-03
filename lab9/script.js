import experimentFunctions from './functions.js';

document.addEventListener('DOMContentLoaded', () => {
    physjs.init({ debug: true });
    
    const elements = ['#power-source', '#ammeter', '#voltmeter', '#copper-coil', '#thermometer'];
    elements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            if (selector !== '#thermometer') {
                element.classList.add('phys', 'phys-draggable', 'phys-attachable', 'phys-connectors');
            } else {
                element.classList.add('phys', 'phys-draggable', 'phys-attachable');
            }
            physjs.createObject(selector);
        }
    });
    
    document.querySelector('#power-source').dataset.wireColor = '#e74c3c';
    document.querySelector('#ammeter').dataset.wireColor = '#3498db';
    document.querySelector('#voltmeter').dataset.wireColor = '#2ecc71';
    document.querySelector('#copper-coil').dataset.wireColor = '#95a5a6';
    
    const step = physjs.createStep('step1', 'Соберите электрическую цепь', 
        ['#power-source', '#ammeter', '#voltmeter', '#copper-coil'], ['*']);
    physjs.addStep(step);
    physjs.goToStep('step1');
    
    physjs.onConnect((fromId, toId) => {
        experimentFunctions.checkCircuitConnections();
    });
    
    experimentFunctions.initializeExperiment();
});