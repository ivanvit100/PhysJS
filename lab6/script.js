document.addEventListener('DOMContentLoaded', () => {
    !physjs.getObject("#glass-tube") && physjs.createObject("#glass-tube");
    !physjs.getObject("#cork") && physjs.createObject("#cork");

    physjs.onAttachment((sourceObject, targetObject) => {
        console.log(physjs.getCurrentStep());

        if (sourceObject == "glass-tube")
            physjs.goToStep('step2')
    });


    experimentFunctions.setupLabSteps();
    experimentFunctions.setupAttachmentPoints();

})

const experimentFunctions = {
    setupAttachmentPoints() {
        physjs.detachAll();
        physjs.addAttachmentPoint('#glass-tube', 'sphere-end', 3, -5, ['cork']);
        physjs.addAttachmentPoint('#water-container1', 'sphere-end', 3, -5, ['glass-tube']);
    },

    setupLabSteps() {
        const step1 = physjs.createStep('step1', 'мем2', ['#glass-tube', '#water-container1']);
        const step2 = physjs.createStep('step2', 'мем', ['#glass-tube', '#cork']);

        physjs.addStep(step1);
        physjs.addStep(step2);
        
        physjs.goToStep('step1');
    },

    
    elementsOverlap(el1, el2, tolerance = 0) {
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();
        
        return !(rect1.right < rect2.left - tolerance || 
                rect1.left > rect2.right + tolerance || 
                rect1.bottom < rect2.top - tolerance || 
                rect1.top > rect2.bottom + tolerance);
    }

}