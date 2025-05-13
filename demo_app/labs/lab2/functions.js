const experimentFunctions = {
    initializePhysicsObject(selector, type, isFixed) {
        const element = document.querySelector(selector);
        if (!element) {
            console.error(`Элемент ${selector} не найден!`);
            return;
        }

        if(!element.dataset.type) element.dataset.type = type;

        isFixed ?
            !element.classList.contains('phys-fixed') && element.classList.add('phys-fixed') :
            !element.classList.contains('phys') && element.classList.add('phys');

        !element.classList.contains('phys-attachable') && element.classList.add('phys-attachable');
        !physjs.getObject(selector) && physjs.createObject(selector);
    },

    setupAttachmentPoints() {
        physjs.detachAll();
                
        physjs.addAttachmentPoint('#stand', 'dynamometer-attachment', 30, 50, ['dynamometer']);
        physjs.addAttachmentPoint('#dynamometer', 'stand-attachment', 0, 0, ['stand']);
        physjs.addAttachmentPoint('#dynamometer', 'ruler-attachment', 10, 100, ['ruler']);
        physjs.addAttachmentPoint('#ruler', 'dynamometer-attachment', 0, 0, ['dynamometer']);        
        physjs.addAttachmentPoint('#weight', 'dynamometer-attachment', 0, -190, ['dynamometer']);       
        physjs.addAttachmentPoint('#water-container', 'dynamometer-attachment', 180, 150, ['dynamometer']);
    },

    setupLabSteps() {
        const step1 = physjs.createStep('step1', 'Установите динамометр на штатив', ['#dynamometer', '#stand']);
        const step2 = physjs.createStep('step2', 'Прикрепите линейку и отметьте начальное положение', ['#ruler', '#dynamometer']);
        const step3 = physjs.createStep('step3', 'Прикрепите груз к динамометру', ['#weight', '#dynamometer']);
        const step4 = physjs.createStep('step4', 'Измерьте удлинение с грузом');
        const step5 = physjs.createStep('step5', 'Погрузите груз в воду и измерьте удлинение');
        
        physjs.addStep(step1).addStep(step2).addStep(step3).addStep(step4).addStep(step5);
        
        physjs.goToStep('step1');
    },

    createMarker(position, color, label) {
        const marker = document.createElement('div');
        marker.style.position = 'absolute';
        marker.style.width = '2px'; 
        marker.style.height = '100%';
        marker.style.backgroundColor = color;
        marker.style.left = position + 'px'; 
        marker.style.top = '0';
        marker.style.zIndex = 10;
    
        const labelElem = document.createElement('div');
        labelElem.style.position = 'absolute';
        labelElem.style.top = '-25px'; 
        labelElem.style.left = '-5px';
        labelElem.style.color = color;
        labelElem.style.fontSize = '12px';
        labelElem.style.fontWeight = 'bold';
        labelElem.textContent = label;
        marker.appendChild(labelElem);
    
        return marker;
    },

    markInitialPosition(ruler, experimentState, advanceToStep, updateInstructions) {
        if (experimentState.step !== 2 || experimentState.initialPositionMarked) return;
        
        const marker = this.createMarker(128, '#e74c3c', 'x₀');
        ruler.appendChild(marker);
    
        experimentState.initialMarkerPosition = 128;
        experimentState.initialPositionMarked = true;
    
        advanceToStep(3);
        updateInstructions("Начальная позиция отмечена. Теперь прикрепите груз к динамометру, используя правую кнопку мыши.");
    },
    
    markExtendedPosition(ruler, experimentState, advanceToStep, updateInstructions, extension1Display) {
        if (experimentState.step !== 4 || experimentState.extension1Measured || !experimentState.weightAttached) {
            return;
        }
        
        const marker = this.createMarker(148, '#2ecc71', 'x₁');
        ruler.appendChild(marker);
        
        experimentState.extendedMarkerPosition = 148;
        experimentState.extension1 = Math.abs(experimentState.extendedMarkerPosition - experimentState.initialMarkerPosition) / 10;
        experimentState.extension1Measured = true;
        
        extension1Display.textContent = experimentState.extension1.toFixed(1);
        
        advanceToStep(5);
        updateInstructions("Удлинение измерено! Теперь поместите груз в контейнер с водой.");
    },
    
    markWaterPosition(ruler, experimentState, updateInstructions, extension2Display, showCalculationPanel) {
        if (experimentState.step !== 5 || experimentState.extension2Measured || !experimentState.weightInWater) return;
              
        const marker = this.createMarker(138, '#3498db', 'x₂');
        ruler.appendChild(marker);
        
        experimentState.waterMarkerPosition = 138;
        experimentState.extension2 = Math.abs(experimentState.waterMarkerPosition - experimentState.initialMarkerPosition) / 10;
        experimentState.extension2Measured = true;
        
        extension2Display.textContent = experimentState.extension2.toFixed(1);
        
        showCalculationPanel();
        updateInstructions("Удлинение в воде измерено! Теперь рассчитайте жесткость пружины и массу груза.");
    },

    updateSpringStretch(newHeight) {
        const springSvg = document.querySelector('.spring2 svg');
        if (!springSvg) return;
        
        springSvg.style.height = `${newHeight}px`;
        
        springSvg.setAttribute('viewBox', `0 0 10 ${newHeight}`);
        
        const path = springSvg.querySelector('path');
        if (path) {
            path.setAttribute('d', this.generateSpringPath(newHeight));
        }
    },

    generateSpringPath(height) {
        const coils = 5;
        const segmentHeight = height / (coils * 2 + 2);
        
        let path = `M5 0, 5 ${segmentHeight}`;
        
        for (let i = 0; i < coils; i++) {
            const y1 = segmentHeight * (i * 2 + 1);
            const y2 = segmentHeight * (i * 2 + 2);
            path += `, 1 ${y1}, 9 ${y2}`;
        }
        
        path += `, 5 ${height - segmentHeight}, 5 ${height}`;
        
        return path;
    },

    showTooltip(e, tooltip) {
        const name = this.getAttribute('data-name');
        if (name) {
            tooltip.textContent = name;
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY + 10) + 'px';
            tooltip.style.opacity = 1;
        }
    },

    hideTooltip(tooltip) {
        tooltip.style.opacity = 0;
    },

    setupTooltips(tooltip) {
        const physElements = document.querySelectorAll('.phys, .phys-fixed, .phys-attachable');
        physElements.forEach(el => {
            el.addEventListener('mouseenter', (e) => this.showTooltip.call(el, e, tooltip));
            el.addEventListener('mouseleave', () => this.hideTooltip(tooltip));
        });
    },

    fixWaterContainer(experimentState, waterContainer, waterContainerObj, standObj, placeWeightInWater) {
        if (experimentState.step === 5 && !experimentState.weightInWater) {
            if (!waterContainerObj || !standObj) return;
            
            const fixedX = standObj.x - 25;
            const fixedY = standObj.y + standObj.height - 220;
            
            waterContainer.classList.remove('phys');
            waterContainer.classList.remove('phys-attachable');
            
            waterContainerObj.disabled = true;
            waterContainer.style.pointerEvents = 'none';

            requestAnimationFrame(() => {
                waterContainer.style.left = fixedX + 'px';
                waterContainer.style.top = fixedY + 'px';    
            });
            
            placeWeightInWater();
        }
    },
    
    placeWeightInWater(experimentState, springEnd, pointer, spring, weight, water, volumeDisplay, updateInstructions) {
        if (experimentState.step !== 5 || experimentState.weightInWater) return;
               
        springEnd.style.transition = 'top 0.7s ease-in-out';
        pointer.style.transition = 'top 0.7s ease-in-out';
        spring.style.transition = 'height 0.7s ease-in-out';
        weight.style.transition = 'top 0.7s ease-in-out, left 0.7s ease-in-out';
        
        const currentSpringHeight = parseInt(spring.style.height) || 120;
        const currentSpringEndTop = parseInt(springEnd.style.top) || 180;
        const currentPointerTop = parseInt(pointer.style.top) || 185;
        const currentWeightTop = parseInt(weight.style.top) || 240;

        const newHeight = currentSpringHeight - 10;
        spring.style.height = newHeight + 'px';
        this.updateSpringStretch(newHeight);
        
        springEnd.style.top = (currentSpringEndTop - 10) + 'px';
        pointer.style.top = (currentPointerTop - 10) + 'px';
        weight.style.top = (currentWeightTop - 10) + 'px';
               
        water.style.transition = 'height 1s ease-in-out';
        water.style.height = '80%';
        
        setTimeout(() => {
            volumeDisplay.textContent = experimentState.volume.toFixed(1);
            experimentState.volumeMeasured = true;
        }, 1000);
        
        experimentState.weightInWater = true;
        
        updateInstructions("Груз помещен в воду. Нажмите на линейку, чтобы отметить новое положение растяжения.");
    },

    checkCalculations(experimentState, springConstantInput, massInput, calculationResult, springConstantDisplay, 
                      massArchimedesDisplay, hideCalculationPanel, updateInstructions) {
        const springConstantValue = parseFloat(springConstantInput.value.replace(',', '.'));
        const massValue = parseFloat(massInput.value.replace(',', '.'));
        
        if (isNaN(springConstantValue) || isNaN(massValue)) {
            this.showCalculationFeedback(calculationResult, 'error', 'Пожалуйста, введите корректные числа в оба поля.');
            return;
        }
        
        const expectedMass = 1000 * experimentState.volume / 1000;
        const expectedK = expectedMass * 9.8 / (experimentState.extension1 - experimentState.extension2);
        
        const kTolerance = expectedK * 0.1;
        const massTolerance = expectedMass * 0.1;
        
        const isKCorrect = Math.abs(springConstantValue - expectedK) <= kTolerance;
        const isMassCorrect = Math.abs(massValue - expectedMass) <= massTolerance;

        console.log(expectedMass, expectedK);
        
        if (isKCorrect && isMassCorrect) {
            this.showCalculationFeedback(calculationResult, 'success', 'Верно! Ваши расчеты соответствуют ожидаемым значениям.');
            
            springConstantDisplay.textContent = expectedK.toFixed(2);
            massArchimedesDisplay.textContent = expectedMass.toFixed(2);
            
            experimentState.calculationsSubmitted = true;
            
            setTimeout(() => {
                hideCalculationPanel();
                updateInstructions("Эксперимент завершен! Вы можете сбросить настройки, чтобы повторить.");
            }, 2000);
        } else {
            this.showCalculationFeedback(calculationResult, 'error', 'Ваши расчеты неверны. Пожалуйста, проверьте формулы и попробуйте снова.');
        }
    },
    
    showCalculationFeedback(calculationResult, type, message) {
        calculationResult.textContent = message;
        calculationResult.className = 'feedback ' + type;
    },

    isNearby(rect1, rect2, threshold) {
        const center1X = rect1.left + rect1.width / 2;
        const center1Y = rect1.top + rect1.height / 2;
        const center2X = rect2.left + rect2.width / 2;
        const center2Y = rect2.top + rect2.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(center1X - center2X, 2) + 
            Math.pow(center1Y - center2Y, 2)
        );
        
        return distance < threshold;
    },

    advanceToStep(stepElements, experimentState, step) {
        if (step <= experimentState.step) return;

        experimentState.step = step;
        
        physjs.goToStep('step' + step);

        stepElements.forEach((el, index) => {
            if (index + 1 < step) {
                el.classList.remove('active');
                el.style.textDecoration = 'line-through';
                el.style.opacity = '0.6';
            } else if (index + 1 === step) {
                el.classList.add('active');
                el.style.textDecoration = '';
                el.style.opacity = '1';
            } else {
                el.classList.remove('active');
                el.style.textDecoration = '';
                el.style.opacity = '0.6';
            }
        });
    },

    resetExperiment(experimentState, elements) {
        experimentState.step = 1;
        experimentState.dynamometerMounted = false;
        experimentState.rulerAttached = false;
        experimentState.initialPositionMarked = false;
        experimentState.weightAttached = false;
        experimentState.extension1 = 0;
        experimentState.extension1Measured = false;
        experimentState.weightInWater = false;
        experimentState.extension2 = 0;
        experimentState.extension2Measured = false;
        experimentState.volumeMeasured = false;
        experimentState.calculationsSubmitted = false;
        experimentState.initialMarkerPosition = 0;
        experimentState.extendedMarkerPosition = 0;
        experimentState.waterMarkerPosition = 0;

        const { 
            dynamometer, spring, springEnd, pointer, weight, 
            ruler, waterContainer, water, calculationPanel,
            extension1Display, extension2Display, volumeDisplay,
            springConstantDisplay, massArchimedesDisplay,
            calculationResult, springConstantInput, massInput,
            stepElements, currentInstructionDisplay
        } = elements;
        
        const markers = ruler.querySelectorAll('div');
        markers.forEach(marker => {
            if (marker !== ruler.querySelector('.ruler-body')) {
                marker.remove();
            }
        });
        
        extension1Display.textContent = '-';
        extension2Display.textContent = '-';
        volumeDisplay.textContent = '-';
        springConstantDisplay.textContent = '-';
        massArchimedesDisplay.textContent = '-';
        
        calculationPanel.style.display = 'none';
        calculationResult.className = 'feedback';
        calculationResult.textContent = '';
        springConstantInput.value = '';
        massInput.value = '';
        
        physjs.detachAll();
        
        if (physjs.getObject('#dynamometer')) {
            const dynamometerObj = physjs.getObject('#dynamometer');
            dynamometerObj.setPosition(350, 70);
            dynamometer.style.transition = '';
        }
        
        spring.style.transition = 'height 0.3s ease-in-out';
        spring.style.height = '100px';
        this.updateSpringStretch(100);
        
        springEnd.style.transition = 'top 0.3s ease-in-out';
        springEnd.style.top = '160px';
        
        pointer.style.transition = 'top 0.3s ease-in-out';
        pointer.style.top = '165px';
        
        if (physjs.getObject('#weight')) {
            const weightObj = physjs.getObject('#weight');
            weightObj.setPosition(300, 200);
            weight.style.transition = '';
        }
        
        if (physjs.getObject('#ruler')) {
            const rulerObj = physjs.getObject('#ruler');
            rulerObj.setPosition(280, 150);
            rulerObj.rotation = 0;
            ruler.style.transform = 'rotate(0deg)';
        }
        
        if (physjs.getObject('#water-container')) {
            const waterContainerObj = physjs.getObject('#water-container');
            waterContainerObj.setPosition(500, 280);
            waterContainerObj.disabled = false;
            waterContainer.style.pointerEvents = 'auto';
            waterContainer.classList.add('phys');
            waterContainer.classList.add('phys-attachable');
        }
        
        water.style.transition = 'height 0.5s ease-in-out';
        water.style.height = '70%';
        
        this.setupAttachmentPoints();
        
        this.advanceToStep(stepElements, experimentState, 1);
        currentInstructionDisplay.textContent = 
            "Начните с установки динамометра на штатив, используя правую кнопку мыши";
        
        physjs.goToStep('step1');
    },
    
    goBack() {
        window.location.href = '../index.html';
    }    
};

export default experimentFunctions;