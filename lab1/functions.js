const experimentFunctions = {
    setupTooltips() {
        const physElements = document.querySelectorAll('.phys, .phys-fixed, .phys-attachable');
        physElements.forEach(el => {
            el.addEventListener('mouseenter', this.showTooltip);
            el.addEventListener('mouseleave', this.hideTooltip);
        });
    },

    setupAttachmentPoints() {
        physjs.detachAll();
        
        physjs.addAttachmentPoint('#hose', 'sphere-end', -85, -35, ['sphere']);
        physjs.addAttachmentPoint('#hose', 'pump-end', 120, -70, ['pump']);
        physjs.addAttachmentPoint('#hose', 'clamp-point', 100, -15, ['clamp']);
    },

    setupScaleInteraction() {
        window.scalePlate.addEventListener('click', () => {
            if ((window.experimentState.step === 2 || window.experimentState.step === 5) && 
                window.experimentState.hoseAttachedToSphere) {
                this.placeOnScale();
            }
        });
        
        window.sphere.addEventListener('mousedown', this.handleSphereDragStart);
        document.addEventListener('mouseup', this.handleSphereDragEnd);
    },

    setupWaterContainerInteraction() {
        window.waterContainer.addEventListener('click', () => {
            if (window.experimentState.step === 6 && 
                window.experimentState.sphereReweighed && 
                !window.experimentState.hoseInWater) {
                this.placeInWaterContainer();
            }
        });
        
        setInterval(() => this.checkWaterContainerProximity(), 200);
    },

    setupCylinderInteraction() {
        window.cylinder.addEventListener('click', () => {
            if (window.experimentState.step === 7 && 
                window.experimentState.sphereFilledWithWater && 
                !window.experimentState.waterInCylinder && 
                !window.experimentState.animatingWaterTransfer) {
                this.placeAtCylinder();
            }
        });
        
        setInterval(() => this.checkCylinderProximity(), 200);
    },

    elementsOverlap(el1, el2, tolerance = 0) {
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();
        
        return !(rect1.right < rect2.left - tolerance || 
                rect1.left > rect2.right + tolerance || 
                rect1.bottom < rect2.top - tolerance || 
                rect1.top > rect2.bottom + tolerance);
    },

    moveGroupByDelta(deltaX, deltaY) {
        const sphereObj = physjs.getObject('#glass-sphere');
        if (sphereObj) {
            const spherePos = sphereObj.getPosition();
            sphereObj.setPosition(spherePos.x + deltaX, spherePos.y + deltaY);
        }
        
        const hoseObj = physjs.getObject('#hose');
        if (hoseObj) {
            const hosePos = hoseObj.getPosition();
            hoseObj.setPosition(hosePos.x + deltaX, hosePos.y + deltaY);
        }
        
        if (window.experimentState.clampAttachedToHose) {
            const clampObj = physjs.getObject('#clamp');
            if (clampObj) {
                const clampPos = clampObj.getPosition();
                clampObj.setPosition(clampPos.x + deltaX, clampPos.y + deltaY);
            }
        }
    },

    restoreAttachment() {
        const hoseObj = physjs.getObject('#hose');
        const sphereObj = physjs.getObject('#glass-sphere');
        
        if (hoseObj && sphereObj) {
            hoseObj.detach && hoseObj.detach();
            sphereObj.detach && sphereObj.detach();
            
            setTimeout(() => {
                if (window.experimentState.hoseAttachedToSphere) {
                    let attached = false;
                    if (hoseObj.attach)
                        attached = hoseObj.attach(sphereObj);
                    if (!attached && sphereObj.attach)
                        attached = sphereObj.attach(hoseObj);
                    
                    window.experimentState.hoseAttachedToSphere = attached;
                }
            }, 200);
        }
    },

    placeOnScale() {        
        if (window.experimentState.sphereOnScale) {
            this.processWeighing();
            return;
        }
        
        const sphereObj = physjs.getObject('#glass-sphere');
        if (!sphereObj || !window.experimentState.hoseAttachedToSphere) return;
        
        const targetX = window.scale.offsetLeft + (window.scale.offsetWidth / 2) - (window.sphere.offsetWidth / 2);
        const targetY = window.scale.offsetTop - window.sphere.offsetHeight + 30;
               
        const currentPos = sphereObj.getPosition();
        const deltaX = targetX - currentPos.x;
        const deltaY = targetY - currentPos.y;
        
        this.moveGroupByDelta(deltaX, deltaY);
        
        window.experimentState.sphereOnScale = true;
        
        if (window.experimentState.step === 5 && window.experimentState.airPumpedOut) {
            const currentMass = (
                window.experimentState.initialMass - 
                (window.experimentState.initialAirMass - window.experimentState.currentAirMass)
            ).toFixed(2);

            window.scaleDisplay.textContent = currentMass;
        }
        else
            window.scaleDisplay.textContent = window.experimentState.initialMass.toFixed(2);
        
        window.scaleDisplay.style.color = '#4CAF50';
        
        this.processWeighing();
    },

    placeInWaterContainer() {
        if (window.experimentState.animatingWaterFill) return;
        
        const sphereObj = physjs.getObject('#glass-sphere');
        const hoseObj = physjs.getObject('#hose');
        
        if (!sphereObj || !hoseObj || !window.experimentState.hoseAttachedToSphere) return;
        
        if (window.experimentState.clampAttachedToHose) {
            this.updateInstructions("Снимите зажим со шланга, чтобы наполнить сферу водой");
            return;
        }
        
        const targetX = 380; 
        const targetY = 250; 
        
        const spherePos = sphereObj.getPosition();
        const deltaX = targetX - spherePos.x;
        const deltaY = targetY - spherePos.y;
        
        this.moveGroupByDelta(deltaX, deltaY);
        
        window.experimentState.hoseInWater = true;
        window.experimentState.animatingWaterFill = true;
        
        window.sphere.style.visibility = 'hidden';
        window.hose.style.visibility = 'hidden';
        
        const waterContainerRect = document.querySelector('#water-container').getBoundingClientRect();
        
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.zIndex = '1000';
        tempContainer.style.left = waterContainerRect.left + 'px';
        tempContainer.style.top = waterContainerRect.top + 'px';
        document.body.appendChild(tempContainer);
        
        const sphereTemp = document.querySelector('#glass-sphere-inv').cloneNode(true);
        const hoseTemp = document.querySelector('#hose-inv').cloneNode(true);
        
        sphereTemp.style.position = 'absolute';
        sphereTemp.style.left = '30px';
        sphereTemp.style.top = '-130px';
        sphereTemp.style.visibility = 'visible';
        sphereTemp.style.display = 'block';
        
        hoseTemp.style.position = 'absolute';
        hoseTemp.style.left = '70px';
        hoseTemp.style.top = '-60px';
        hoseTemp.style.visibility = 'visible';
        hoseTemp.style.display = 'block';
        
        tempContainer.appendChild(sphereTemp);
        tempContainer.appendChild(hoseTemp);
        
        setTimeout(() => {
        document.body.removeChild(tempContainer);
        
        window.sphere.style.visibility = 'visible';
        window.hose.style.visibility = 'visible';
        
        const airRemovalPercentage = (window.experimentState.initialAirMass - window.experimentState.currentAirMass) / 
                                  window.experimentState.initialAirMass;
        
        window.experimentState.airVolume = Math.round(140 * airRemovalPercentage);
        
        this.restoreAttachment();
        
        window.experimentState.sphereFilledWithWater = true;
        window.experimentState.animatingWaterFill = false;
        
        this.advanceToStep(7);
        this.updateInstructions("Переместите шланг к измерительному цилиндру, чтобы перелить воду из сферы");
    }, 2000);
    },

    placeAtCylinder() {
        if (window.experimentState.animatingWaterTransfer) {
            return;
        }
        
        const sphereObj = physjs.getObject('#glass-sphere');
        const hoseObj = physjs.getObject('#hose');
        
        if (!sphereObj || !hoseObj || !window.experimentState.sphereFilledWithWater) {
            return;
        }
        
        if (window.experimentState.clampAttachedToHose) {
            this.updateInstructions("Снимите зажим со шланга, чтобы перелить воду в цилиндр");
            return;
        }
        
        window.experimentState.animatingWaterTransfer = true;
        
        const overlay = document.createElement('div');
        overlay.id = 'animation-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.zIndex = '9999';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);
        
        const sphereClone = window.sphere.cloneNode(true);
        sphereClone.id = 'sphere-clone';
        sphereClone.style.position = 'absolute';
        sphereClone.style.left = window.sphere.offsetLeft + 'px';
        sphereClone.style.top = window.sphere.offsetTop + 'px';
        sphereClone.style.zIndex = '10000';
        sphereClone.style.backgroundColor = 'rgba(64, 164, 223, 0.5)';
        
        const hoseClone = window.hose.cloneNode(true);
        hoseClone.id = 'hose-clone';
        hoseClone.style.position = 'absolute';
        hoseClone.style.left = window.hose.offsetLeft + 'px';
        hoseClone.style.top = window.hose.offsetTop + 'px';
        hoseClone.style.zIndex = '10000';
        
        overlay.appendChild(sphereClone);
        overlay.appendChild(hoseClone);
        
        const targetX = 700;
        const targetY = 180;
        const currentX = parseInt(sphereClone.style.left);
        const currentY = parseInt(sphereClone.style.top);
        const deltaX = targetX - currentX;
        const deltaY = targetY - currentY;
        
        sphereClone.style.transition = 'all 1s ease';
        hoseClone.style.transition = 'all 1s ease';
        
        setTimeout(() => {
            sphereClone.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            hoseClone.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        }, 50);
        
        setTimeout(() => {
            const waterHeight = 135 * (window.experimentState.airVolume / 140);
            
            window.cylinderWater.style.transition = 'height 1.5s ease-in-out';
            window.cylinderWater.style.height = `${waterHeight}px`;
            
            setTimeout(() => {
                document.body.removeChild(overlay);
                window.sphere.style.backgroundColor = 'rgba(200, 230, 255, 0.6)';
                window.volumeDisplay.textContent = window.experimentState.airVolume.toString();
                window.experimentState.waterInCylinder = true;
                window.experimentState.animatingWaterTransfer = false;
                
                window.experimentState.hoseAttachedToSphere = 
                    (sphereObj.attachedObjects && sphereObj.attachedObjects.has(hoseObj)) || 
                    (hoseObj.attachedObjects && hoseObj.attachedObjects.has(sphereObj));
                
                this.advanceToStep(8);
                this.showDensityCalculator();
                this.updateInstructions("Теперь рассчитайте плотность воздуха и введите результат для проверки");

                window.cylinderWater.style.transition = '';
            }, 2000);
        }, 1200);
    },

    processWeighing() {
        if (!window.experimentState.sphereWeighed && window.experimentState.step === 2) {
            setTimeout(() => {
                window.mass1Display.textContent = window.experimentState.initialMass.toFixed(2);
                window.experimentState.sphereWeighed = true;
                
                setTimeout(() => {
                    window.scaleDisplay.style.color = '';
                }, 500);
                
                this.advanceToStep(3);
                this.updateInstructions("Подсоедините шланг к насосу и нажмите на ручку насоса");
            }, 1000);
            
            return;
        }
        
        if (window.experimentState.clampAttachedToHose && !window.experimentState.sphereReweighed && window.experimentState.step === 5) {
            window.experimentState.sphereReweighed = true;
            
            const currentMass = (
                window.experimentState.initialMass - 
                (window.experimentState.initialAirMass - window.experimentState.currentAirMass)
            ).toFixed(2);
            
            window.scaleDisplay.textContent = currentMass;
            
            if (window.mass2Display) {
                window.mass2Display.textContent = currentMass;
            }
            
            this.advanceToStep(6);
        }
        
        setTimeout(() => {
            window.scaleDisplay.style.color = '';
        }, 500);
    },

    setupLabSteps() {
        const step1 = physjs.createStep('step1', 'Присоедините шланг к сфере', ['#glass-sphere', '#hose']);
        const step2 = physjs.createStep('step2', 'Взвесьте сферу на весах');
        const step3 = physjs.createStep('step3', 'Подсоедините шланг к насосу', ['#pump', '#hose']);
        const step4 = physjs.createStep('step4', 'Закройте шланг зажимом', ['#clamp', '#hose'], ['#pump']);
        const step5 = physjs.createStep('step5', 'Повторно взвесьте сферу');
        const step6 = physjs.createStep('step6', 'Поместите шланг в контейнер с водой', ['#hose', '#glass-sphere'], ['#water-container', '#clamp']);
        const step7 = physjs.createStep('step7', 'Перелейте воду в цилиндр', ['#hose', '#glass-sphere'], ['#water-container']);
        const step8 = physjs.createStep('step8', 'Рассчитайте плотность воздуха', ['#hose', '#glass-sphere'], ['#water-container']);
        
        physjs.addStep(step1).addStep(step2).addStep(step3).addStep(step4)
              .addStep(step5).addStep(step6).addStep(step7).addStep(step8);
        
        physjs.goToStep('step1');
    },

    createDensityCalculator() {
        const resultsTable = document.querySelector('.results-table') || document.getElementById('results');
        const densityInputContainer = document.createElement('div');
        densityInputContainer.id = 'density-input-container';
        densityInputContainer.classList.add('density-calculator');
        densityInputContainer.style.display = 'none';

        densityInputContainer.innerHTML = `
            <h3>Расчет плотности воздуха</h3>
            <div class="input-group">
                <label for="density-input">Введите рассчитанную плотность воздуха (кг/м³):</label>
                <input type="text" id="density-input" placeholder="Пример: 1.225">
                <button id="check-density-btn" class="btn btn-primary">Проверить</button>
            </div>
            <div id="density-result" class="feedback"></div>
            <div class="calculation-hint info-box info-box-primary">
                <p>Используйте формулу: ρ = Δm / V</p>
                <p>где:</p>
                <ul>
                    <li>ρ - плотность воздуха (кг/м³)</li>
                    <li>Δm - разница масс до и после откачки (кг)</li>
                    <li>V - объем откачанного воздуха (м³)</li>
                </ul>
            </div>
        `;

        if (resultsTable && resultsTable.parentNode) {
            resultsTable.parentNode.insertBefore(densityInputContainer, resultsTable.nextSibling);
        } else {
            const experimentArea = document.getElementById('experiment-area');
            experimentArea ? experimentArea.appendChild(densityInputContainer) : document.body.appendChild(densityInputContainer);
        }
        
        const checkDensityBtn = document.getElementById('check-density-btn');
        checkDensityBtn && checkDensityBtn.addEventListener('click', () => this.checkDensityCalculation());
    },

    handleSphereDragStart(e) {
        if (e.button !== 0) return;
        
        if (window.experimentState.sphereOnScale) {
            window.experimentState.sphereOnScale = false;
            window.scaleDisplay.textContent = '0.00';
        }
    },

    handleSphereDragEnd(e) {
        if (e.button !== 0) return;
        
        if (!window.experimentState.hoseAttachedToSphere) return;
        
        const experimentFuncs = experimentFunctions;
        
        if ((window.experimentState.step === 2 || window.experimentState.step === 5) && 
            !window.experimentState.animatingWaterFill) {
            
            if (window.experimentState.step === 2 && window.experimentState.sphereWeighed) return;
            if (window.experimentState.step === 5 && window.experimentState.sphereReweighed) return;
            
            if (experimentFuncs.elementsOverlap(window.sphere, window.scalePlate, 30)) {
                experimentFuncs.placeOnScale();
            } else {
                const sphereRect = window.sphere.getBoundingClientRect();
                const plateRect = window.scalePlate.getBoundingClientRect();

                const sphereCenterX = sphereRect.left + sphereRect.width/2;
                const sphereCenterY = sphereRect.top + sphereRect.height/2;
                const plateCenterX = plateRect.left + plateRect.width/2;
                const plateCenterY = plateRect.top + plateRect.height/2;

                const distance = Math.sqrt(
                    Math.pow(sphereCenterX - plateCenterX, 2) + 
                    Math.pow(sphereCenterY - plateCenterY, 2)
                );

                if (distance < 120) experimentFuncs.placeOnScale();
            }
        }
        
        if (window.experimentState.step === 6 && window.experimentState.sphereReweighed &&
           !window.experimentState.hoseInWater && !window.experimentState.animatingWaterFill && 
           !window.experimentState.clampAttachedToHose) {
            
            if (experimentFuncs.elementsOverlap(window.hose, window.waterContainer)) {
                experimentFuncs.placeInWaterContainer();
            } else {
                const hoseObj = physjs.getObject('#hose');
                const waterContainerObj = physjs.getObject('#water-container');
                
                if (hoseObj && waterContainerObj && hoseObj.isOverlapping(waterContainerObj))
                    experimentFuncs.placeInWaterContainer();
            }
        }
        
        if (window.experimentState.step === 7 && window.experimentState.sphereFilledWithWater &&
           !window.experimentState.waterInCylinder && !window.experimentState.animatingWaterTransfer && 
           !window.experimentState.clampAttachedToHose) {
            
            if (experimentFuncs.elementsOverlap(window.hose, window.cylinder)) {
                experimentFuncs.placeAtCylinder();
            } else {
                const hoseObj = physjs.getObject('#hose');
                const cylinderObj = physjs.getObject('#cylinder');
                
                if (hoseObj && cylinderObj && hoseObj.isOverlapping(cylinderObj))
                    experimentFuncs.placeAtCylinder();
            }
        }
    },

    checkWaterContainerProximity() {
        if (!window.experimentState.hoseAttachedToSphere || !window.experimentState.sphereReweighed) return;
        if (window.experimentState.step !== 6 || window.experimentState.hoseInWater || window.experimentState.animatingWaterFill) return;
        if (window.experimentState.clampAttachedToHose) return;
        
        const directOverlap = this.elementsOverlap(window.hose, window.waterContainer);
        
        if (directOverlap) {
            this.placeInWaterContainer();
            return;
        }
        
        const hoseObj = physjs.getObject('#hose');
        const waterContainerObj = physjs.getObject('#water-container');
        
        if (hoseObj && waterContainerObj && hoseObj.isOverlapping(waterContainerObj))
            this.placeInWaterContainer();
    },

    checkCylinderProximity() {
        if (!window.experimentState.hoseAttachedToSphere || !window.experimentState.sphereFilledWithWater) return;
        if (window.experimentState.step !== 7 || window.experimentState.waterInCylinder || window.experimentState.animatingWaterTransfer) return;
        if (window.experimentState.clampAttachedToHose) return;
        
        const directOverlap = this.elementsOverlap(window.hose, window.cylinder);
        
        if (directOverlap) {
            this.placeAtCylinder();
            return;
        }
        
        const hoseObj = physjs.getObject('#hose');
        const cylinderObj = physjs.getObject('#cylinder');
        
        if (hoseObj && cylinderObj && hoseObj.isOverlapping(cylinderObj)) {
            this.placeAtCylinder();
        }
    },

    initExperiment() {
        window.pumpHandle.addEventListener('click', () => this.pumpAir());
        
        physjs.onAttachment((sourceObject, targetObject) => {
            this.handleAttachment(sourceObject, targetObject);
        });
        
        physjs.onDetachment((object) => {
            this.handleDetachment(object);
        });
        
        this.updateInstructions("Присоедините шланг к сфере, используя правую кнопку мыши");
    },

    showTooltip(e) {
        const name = this.getAttribute('data-name');
        if (name) {
            window.tooltip.textContent = name;
            window.tooltip.style.left = (e.pageX + 10) + 'px';
            window.tooltip.style.top = (e.pageY + 10) + 'px';
            window.tooltip.style.opacity = 1;
        }
    },

    hideTooltip() {
        window.tooltip.style.opacity = 0;
    },

    handleAttachment(sourceObj, targetObj) {
        const sourceElement = sourceObj.element;
        const targetElement = targetObj.element;
        
        if ((sourceElement.id === 'hose' && targetElement.id === 'glass-sphere') ||
            (sourceElement.id === 'glass-sphere' && targetElement.id === 'hose')) {
            
            if (!window.experimentState.hoseAttachedToSphere) {
                window.experimentState.hoseAttachedToSphere = true;
                this.advanceToStep(2);
                this.updateInstructions("Поместите сферу со шлангом на весы");
            }
        }
        
        if ((sourceElement.id === 'clamp' && targetElement.id === 'hose') ||
            (sourceElement.id === 'hose' && targetElement.id === 'clamp')) {
            
            if (window.experimentState.hoseAttachedToPump) {
                this.updateInstructions("Сначала отсоедините насос от шланга, затем прикрепите зажим");
                
                setTimeout(() => {
                    const clampObj = physjs.getObject('#clamp');
                    if (clampObj) {
                        clampObj.detach();
                    }
                }, 500);
                
                return;
            }
            
            if (window.experimentState.airPumpedOut && !window.experimentState.clampAttachedToHose) {
                window.experimentState.clampAttachedToHose = true;
                window.clamp.style.backgroundColor = '#d00';
                this.advanceToStep(5);
                this.updateInstructions("Поместите сферу на весы для повторного взвешивания");
            }
        }
        
        if ((sourceElement.id === 'hose' && targetElement.id === 'pump') ||
            (sourceElement.id === 'pump' && targetElement.id === 'hose')) {
            
            if (window.experimentState.clampAttachedToHose) {
                this.updateInstructions("Сначала снимите зажим со шланга, затем прикрепите шланг к насосу");
                
                setTimeout(() => {
                    const pumpObj = physjs.getObject('#pump');
                    const hoseObj = physjs.getObject('#hose');
                    if (pumpObj && pumpObj.attachedObjects.has(hoseObj)) {
                        pumpObj.detach();
                    }
                    if (hoseObj && hoseObj.attachedObjects.has(pumpObj)) {
                        hoseObj.detach();
                    }
                }, 500);
                
                return;
            }
            
            if (window.experimentState.sphereWeighed && !window.experimentState.hoseAttachedToPump) {
                window.experimentState.hoseAttachedToPump = true;
                this.updateInstructions("Нажмите на ручку насоса несколько раз");
            }
        }
    },

    handleDetachment(obj) {
        const element = obj.element;
        
        if (element.id === 'clamp' && window.experimentState.clampAttachedToHose) {
            window.experimentState.clampAttachedToHose = false;
            window.clamp.style.backgroundColor = '#444';
            
            if (window.experimentState.hoseInWater && !window.experimentState.sphereFilledWithWater) {
                window.experimentState.clampOpened = true;
                this.fillSphereWithWater();
            }
        }
        
        if (element.id === 'pump') {
            window.experimentState.hoseAttachedToPump = false;
            
            if (window.experimentState.airPumpedOut) {
                this.updateInstructions("Теперь прикрепите зажим к шлангу");
            }
        }
    },

    pumpCount: 0,

    pumpAir() {
        if (!window.experimentState.hoseAttachedToPump) return;
    
        this.pumpCount++;
        window.pumpHandle.style.transform = 'translate(-50%, 5px)';
    
        setTimeout(() => {
            window.pumpHandle.style.transform = 'translate(-50%, -25px)';
    
            if (window.experimentState.currentAirMass > 0) {
                const airRemoved = window.experimentState.initialAirMass * window.experimentState.pumpEfficiency;
                window.experimentState.currentAirMass = Math.max(
                    0,
                    window.experimentState.currentAirMass - airRemoved
                );
            }
    
            if (!window.experimentState.airPumpedOut) {
                window.experimentState.airPumpedOut = true;
                this.advanceToStep(4);
                this.updateInstructions("Отсоедините насос, затем закройте шланг сферы, прикрепив зажим");
            }
        }, 200);
    },

    fillSphereWithWater() {
        if (!window.experimentState.hoseInWater || window.experimentState.sphereFilledWithWater) return;

        window.sphere.style.transition = 'background-color 1s ease';
        
        setTimeout(() => {
            window.sphere.style.backgroundColor = 'rgba(64, 164, 223, 0.5)';
            window.experimentState.sphereFilledWithWater = true;
            this.advanceToStep(7);
            this.updateInstructions("Переместите шланг к измерительному цилиндру, чтобы перелить воду из сферы");
            
            setTimeout(() => {
                window.sphere.style.transition = '';
            }, 1000);
        }, 1000);
    },

    showDensityCalculator() {
        const densityInputContainer = document.getElementById('density-input-container');
        if (densityInputContainer) {
            densityInputContainer.style.display = 'block';
        }
    },

    checkDensityCalculation() {
        const densityInput = document.getElementById('density-input');
        const checkBtn = document.getElementById('check-density-btn');

        const userInputValue = densityInput.value.trim().replace(',', '.');
        const userCalculatedDensity = parseFloat(userInputValue);

        if (isNaN(userCalculatedDensity) || userInputValue === '') {
            this.showDensityFeedback('error', 'Пожалуйста, введите числовое значение плотности');
            return;
        }

        const massDiff = (window.experimentState.initialAirMass - window.experimentState.currentAirMass) / 1000;
        const volumeInCubicMeters = window.experimentState.airVolume / 1000000;
        const correctDensity = massDiff / volumeInCubicMeters;

        const errorMargin = correctDensity * 0.05;

        if (Math.abs(userCalculatedDensity - correctDensity) <= errorMargin) {
            window.densityDisplay.textContent = correctDensity.toFixed(3);
            this.showDensityFeedback('success', `Верно! Рассчитанная плотность воздуха: ${correctDensity.toFixed(3)} кг/м³`);
            window.experimentState.calculationSubmitted = true;
            checkBtn.disabled = true;
            this.updateInstructions("Отлично! Вы успешно измерили плотность воздуха.");
        } else {
            const hint = userCalculatedDensity > correctDensity ?
                'Ваше значение слишком высокое. Проверьте ваши расчеты.' :
                'Ваше значение слишком низкое. Проверьте ваши расчеты.';

            this.showDensityFeedback('error', hint);
        }
    },

    showDensityFeedback(type, message) {
        const densityInput = document.getElementById('density-input');
        const densityResult = document.getElementById('density-result');

        if (type === 'success') {
            densityInput.classList.remove('input-invalid');
            densityInput.classList.add('input-valid');
            densityResult.classList.remove('error');
            densityResult.classList.add('success');
        } else {
            densityInput.classList.remove('input-valid');
            densityInput.classList.add('input-invalid');
            densityResult.classList.remove('success');
            densityResult.classList.add('error');
        }

        densityResult.textContent = message;
    },

    updateInstructions(text) {
        window.currentInstructionDisplay.textContent = text;
    },

    advanceToStep(step) {
        if (step <= window.experimentState.step) return;

        window.experimentState.step = step;
        
        physjs.goToStep('step' + step);

        window.stepElements.forEach((el, index) => {
            el.classList.remove('active');
            if (index + 1 === step) {
                el.classList.add('active');
            }
        });
    },

    resetExperiment() {
        window.sphere.style.transition = '';
        window.hose.style.transition = '';
        window.clamp.style.transition = '';
        window.cylinderWater.style.transition = '';
        
        window.sphere.style.transformOrigin = '';
        window.hose.style.transformOrigin = '';
        window.clamp.style.transformOrigin = '';
        
        window.experimentState = {
            step: 1,
            hoseAttachedToSphere: false,
            sphereWeighed: false,
            initialMass: 153.45,
            initialAirMass: 0.17,
            currentAirMass: 0.17,
            pumpEfficiency: 0.1,
            hoseAttachedToPump: false,
            airPumpedOut: false,
            clampAttachedToHose: false,
            sphereReweighed: false,
            hoseInWater: false,
            clampOpened: false,
            sphereFilledWithWater: false,
            waterInCylinder: false,
            airVolume: 140,
            calculationSubmitted: false,
            sphereOnScale: false,
            animatingWaterFill: false,
            animatingWaterTransfer: false
        };

        window.mass1Display.textContent = '-';
        window.mass2Display.textContent = '-';
        window.volumeDisplay.textContent = '-';
        window.densityDisplay.textContent = '-';
        window.scaleDisplay.textContent = '0.00';
        window.scaleDisplay.style.color = '';

        window.sphere.style.backgroundColor = 'rgba(200, 230, 255, 0.6)';
        window.sphere.style.transform = '';
        window.hose.style.transform = '';
        window.clamp.style.transform = '';
        window.clamp.style.backgroundColor = '#444';
        window.cylinderWater.style.height = '0px';

        const densityInput = document.getElementById('density-input');
        const densityResult = document.getElementById('density-result');
        const checkBtn = document.getElementById('check-density-btn');
        const densityInputContainer = document.getElementById('density-input-container');

        if (densityInput) densityInput.value = '';
        if (densityInput) densityInput.classList.remove('input-valid', 'input-invalid');
        if (densityResult) {
            densityResult.textContent = '';
            densityResult.classList.remove('success', 'error');
        }
        if (checkBtn) checkBtn.disabled = false;
        if (densityInputContainer) densityInputContainer.style.display = 'none';

        physjs.detachAll();
        physjs.resetLab();

        window.sphere.style.left = '50px';
        window.sphere.style.top = '60px';
        window.hose.style.left = '120px';
        window.hose.style.top = '100px';
        window.clamp.style.left = '150px';
        window.clamp.style.top = '130px';
        window.pump.style.left = '350px';
        window.pump.style.top = '70px';
        window.scale.style.left = '50px';
        window.scale.style.top = '350px';
        window.waterContainer.style.left = '500px';
        window.waterContainer.style.top = '280px';
        window.cylinder.style.left = '700px';
        window.cylinder.style.top = '280px';

        this.pumpCount = 0;
        window.pumpHandle.style.transform = 'translate(-50%, -25px)';

        this.advanceToStep(1);
        this.updateInstructions("Присоедините шланг к сфере, используя правую кнопку мыши");
    },

    goBack() {
        window.location.href = '../index.html';
    }
};

export default experimentFunctions;