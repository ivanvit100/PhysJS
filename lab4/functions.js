const experimentFunctions = {
    initializePhysicsObject(selector, type, isFixed) {
        const element = document.querySelector(selector);
        if (!element) return;

        if(!element.dataset.type && type) element.dataset.type = type;

        isFixed ?
            !element.classList.contains('phys-fixed') && element.classList.add('phys-fixed') :
            !element.classList.contains('phys') && element.classList.add('phys');

        !element.classList.contains('phys-attachable') && element.classList.add('phys-attachable');
        !physjs.getObject(selector) && physjs.createObject(selector);
    },

    setupLabSteps() {
        const step1 = physjs.createStep('step1', 'Взвесьте шар на весах');
        const step2 = physjs.createStep('step2', 'Укрепите динамометр и желоб на штативах', 
            ['#dynamometer', '#trough', '#left-stand', '#right-stand']);
        const step3 = physjs.createStep('step3', 'Прикрепите шар к динамометру нитью', 
            ['#ball', '#dynamometer']);
        const step4 = physjs.createStep('step4', 'Растяните пружину динамометра');
        const step5 = physjs.createStep('step5', 'Проведите серию измерений дальности полета', 
            ['#ball', '#dynamometer']);
        const step6 = physjs.createStep('step6', 'Проведите расчеты энергии и погрешностей');
        
        physjs.addStep(step1).addStep(step2).addStep(step3).addStep(step4).addStep(step5).addStep(step6);
        physjs.goToStep('step1');
    },

    setupAttachmentPoints() {
        physjs.detachAll();
        physjs.addAttachmentPoint('#left-stand', 'dynamometer-attachment', 100, -30, ['dynamometer']);
        physjs.addAttachmentPoint('#right-stand', 'trough-attachment', -50, 40, ['trough']);
        physjs.addAttachmentPoint('#ball', 'dynamometer-attachment', -90, -85, ['dynamometer']);
    },
    
    placeOnScale(experimentState, elements) {
        if (experimentState.ballOnScale) {
            this.processWeighing(experimentState, elements);
            return;
        }
        
        const ball = elements.ball;
        const scale = elements.scale;
        
        if (!ball || !scale) return;
        
        const scaleRect = scale.getBoundingClientRect();
        const ballRect = ball.getBoundingClientRect();
        
        ball.style.transition = "left 0.3s ease-out, top 0.3s ease-out";
        ball.style.left = `${scaleRect.left + scaleRect.width/2 - ballRect.width/2}px`;
        ball.style.top = `${scaleRect.top - ballRect.height + 27}px`;
        
        experimentState.ballOnScale = true;
        this.processWeighing(experimentState, elements);
    },
    
    processWeighing(experimentState, elements) {
        if (!experimentState.ballOnScale) return;
        
        setTimeout(() => {
            elements.scaleDisplay.textContent = (experimentState.ballMass * 1000).toFixed(1);
            elements.massDisplay.textContent = experimentState.ballMass.toFixed(3);
            
            experimentState.ballWeighed = true;
            elements.scaleDisplay.style.color = '#4CAF50';
            
            if (experimentState.step === 1) {
                const stepElements = document.querySelectorAll('#status-panel ol li');
                this.advanceToStep(stepElements, experimentState, 2);
                elements.currentInstructionDisplay.textContent = "Теперь укрепите динамометр и желоб на штативах.";
                stepElements[0].classList.add('completed');
            }
            
            setTimeout(() => {
                elements.scaleDisplay.style.color = '';
            }, 1000);
        }, 300);
    },

    dragBall(e, experimentState, elements) {
        const ballRect = elements.ball.getBoundingClientRect();
        const dynamoRect = elements.dynamometer.getBoundingClientRect();
        const troughRect = elements.trough.getBoundingClientRect();
        
        const initialLeft = dynamoRect.right;
        const maxLeft = troughRect.right - 80;
        
        let newLeft = e.clientX - ballRect.width/2;
        newLeft = Math.min(Math.max(initialLeft, newLeft), maxLeft);
        
        elements.ball.style.left = `${newLeft}px`;
        
        this.updateStringPosition(elements.ball, elements.string, elements.springEnd, experimentState);
        
        const currentExtension = Math.max(0, newLeft - initialLeft);
        const maxExtension = 200;
        const extensionRatio = Math.min(1, currentExtension / maxExtension);
        
        const baseSpringHeight = 100; 
        const maxExtendedHeight = 150;
        const newHeight = baseSpringHeight + extensionRatio * (maxExtendedHeight - baseSpringHeight);
        
        elements.spring.style.height = `${newHeight}px`;
        elements.springEnd.style.top = `${160 + (newHeight - baseSpringHeight)}px`;
        elements.pointer.style.top = `${165 + (newHeight - baseSpringHeight)}px`;
        
        const maxForce = 3.0;
        const currentForce = extensionRatio * maxForce;
        elements.forceValue.textContent = currentForce.toFixed(1);
        
        const deformationInMeters = (currentExtension / 1000).toFixed(3);
        elements.deformationDisplay.textContent = deformationInMeters;
        experimentState.deformation = parseFloat(deformationInMeters);
        experimentState.force = currentForce;
    },
    
    calculateDistanceValue(experimentState) {
        const initialVelocity = Math.sqrt(experimentState.force * experimentState.deformation / experimentState.ballMass);
        const g = 9.8;
        const flightTime = Math.sqrt(2 * experimentState.height / g);
        
        const baseDistance = initialVelocity * flightTime;
        const randomFactor = 1 + (Math.random() - 0.5) * 0.2;
        return baseDistance * randomFactor;
    },
    
    releaseBall(experimentState, elements) {
        if (experimentState.ballReleased) return;
        
        experimentState.ballReleased = true;
        
        const ball = elements.ball;
        const string = elements.string;
        const spring = elements.spring;
        const springEnd = elements.springEnd;
        const pointer = elements.pointer;
        const floorArea = elements.floorArea;
        const currentInstructionDisplay = elements.currentInstructionDisplay;
        
        ball.classList.remove('phys-attached');
        if (ball.dataset) {
            delete ball.dataset.attached;
            delete ball.dataset.attachedTo;
        }
        experimentState.ballAttached = false;
        
        string.style.display = 'none';
        
        spring.style.transition = "height 0.3s ease-out";
        springEnd.style.transition = "top 0.3s ease-out";
        pointer.style.transition = "top 0.3s ease-out";
        
        spring.style.height = "100px";
        springEnd.style.top = "160px";
        pointer.style.top = "165px";
        
        const distance = this.calculateDistanceValue(experimentState);
        
        const ballRect = ball.getBoundingClientRect();
        const floorRect = floorArea.getBoundingClientRect();
        
        const startX = parseInt(ball.style.left || '350') + ballRect.width/2;
        const startY = parseInt(ball.style.top || '175') + ballRect.height/2;
        
        const v0 = Math.sqrt((2 * experimentState.force * experimentState.deformation) / experimentState.ballMass);
        const visualScale = 60;
        const vx = -v0 * visualScale;
        const vy = -5;
        const g = 0.005;
        
        physjs.calculateTrajectory(
            Math.sqrt(vx*vx + vy*vy),
            Math.atan2(vy, vx),
            floorRect.top - startY,
            g * 1000
        );
        
        const landingX = startX - distance * visualScale;
        const landingY = floorRect.top - ballRect.height/2;
        
        const self = this;
        
        const animationDuration = 1500;
        let startTime = null;
        
        const animateTrajectory = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsedTime = timestamp - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            
            if (progress < 1) {
                const t = progress * animationDuration / 1000;
                const currentX = startX + vx * t;
                const currentY = startY + vy * t + 0.5 * g * Math.pow(t * 1000, 2);
                const finalY = Math.min(currentY, landingY);
                
                ball.style.left = `${currentX - ballRect.width/2}px`;
                ball.style.top = `${finalY - ballRect.height/2}px`;
                
                requestAnimationFrame(animateTrajectory);
            } else {
                self.recordMeasurement(experimentState, distance);
                
                const marker = document.createElement('div');
                marker.className = 'landing-marker';
                marker.style.position = 'absolute';
                marker.style.left = `${landingX - 5}px`;
                marker.style.top = `${landingY - 5}px`;
                marker.style.width = '10px';
                marker.style.height = '10px';
                marker.style.borderRadius = '50%';
                marker.style.backgroundColor = 'red';
                document.getElementById('experiment-container').appendChild(marker);
                
                let isCheckingBoundaries = true;
                
                const checkBoundaries = () => {
                    if (!isCheckingBoundaries) return;
                    
                    const currentBallRect = ball.getBoundingClientRect();
                    const experimentContainer = document.getElementById('experiment-container');
                    const containerRect = experimentContainer.getBoundingClientRect();
                    
                    if (currentBallRect.left <= containerRect.left) {
                        ball.style.left = `${containerRect.left}px`;
                        isCheckingBoundaries = false;
                        makePhysical();
                        return;
                    }
                    
                    if (ball.getBoundingClientRect().left === previousLeft) {
                        ballStoppedCount++;
                        if (ballStoppedCount > 10) {
                            isCheckingBoundaries = false;
                            makePhysical();
                            return;
                        }
                    } else {
                        ballStoppedCount = 0;
                    }
                    previousLeft = ball.getBoundingClientRect().left;
                    
                    requestAnimationFrame(checkBoundaries);
                };
                
                let previousLeft = ball.getBoundingClientRect().left;
                let ballStoppedCount = 0;
                
                requestAnimationFrame(checkBoundaries);
                
                function makePhysical() {
                    experimentState.ballReleased = false;
                    experimentState.ballAttached = false;
                    
                    const currentBall = ball;
                    const ballRect = currentBall.getBoundingClientRect();
                    const ballStyle = window.getComputedStyle(currentBall);
                    const ballLeft = currentBall.style.left || (ballRect.left + 'px');
                    const ballTop = currentBall.style.top || (ballRect.top + 'px');
                    
                    const newBall = document.createElement('div');
                    newBall.id = 'ball';
                    newBall.className = 'phys phys-attachable equipment';
                    newBall.style.position = 'absolute';
                    newBall.style.left = ballLeft;
                    newBall.style.top = ballTop;
                    newBall.style.width = ballRect.width + 'px';
                    newBall.style.height = ballRect.height + 'px';
                    newBall.style.borderRadius = '50%';
                    newBall.style.backgroundColor = ballStyle.backgroundColor;
                    newBall.dataset.type = 'ball';
                    newBall.dataset.name = 'Шар';
                    
                    currentBall.parentNode.insertBefore(newBall, currentBall);
                    currentBall.parentNode.removeChild(currentBall);
                    
                    elements.ball = newBall;
                    
                    const trajectoryPath = document.getElementById('trajectory-path');
                    if (trajectoryPath) trajectoryPath.remove();
                    
                    self.initializePhysicsObject('#ball', 'ball', false);
                    
                    physjs.addAttachmentPoint('#ball', 'dynamometer-attachment', -90, -85, ['dynamometer']);
                    
                    physjs.goToStep('step5');
                    experimentState.step = 5;
                    
                    const stepElements = document.querySelectorAll('#status-panel ol li');
                    stepElements.forEach((el, index) => {
                        el.classList.remove('active');
                        if (index === 4) el.classList.add('active');
                        else if (index < 4) el.classList.add('completed');
                    });
                    
                    currentInstructionDisplay.textContent = "Прикрепите шар к динамометру снова для повторного эксперимента.";
                    
                    newBall.addEventListener('mousedown', (e) => {
                        if (e.button !== 0) return;
                        e.preventDefault();
                        
                        if (experimentState.ballAttached) {
                            let draggingActive = true;
                            
                            const moveHandler = (moveEvent) => {
                                if (!draggingActive) return;
                                self.dragBall(moveEvent, experimentState, elements);
                            };
                            
                            const upHandler = () => {
                                draggingActive = false;
                                document.removeEventListener('mousemove', moveHandler);
                                document.removeEventListener('mouseup', upHandler);
                                
                                if (parseFloat(elements.forceValue.textContent) >= 1.95) {
                                    self.releaseBall(experimentState, elements);
                                }
                            };
                            
                            document.addEventListener('mousemove', moveHandler);
                            document.addEventListener('mouseup', upHandler);
                        } else {
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const ballRect = newBall.getBoundingClientRect();
                            const initialLeft = ballRect.left;
                            const initialTop = ballRect.top;
                            
                            let dragging = true;
                            
                            const handleMove = (moveEvent) => {
                                if (!dragging) return;
                                const deltaX = moveEvent.clientX - startX;
                                const deltaY = moveEvent.clientY - startY;
                                newBall.style.left = `${initialLeft + deltaX}px`;
                                newBall.style.top = `${initialTop + deltaY}px`;
                            };
                            
                            const handleUp = () => {
                                dragging = false;
                                document.removeEventListener('mousemove', handleMove);
                                document.removeEventListener('mouseup', handleUp);
                                
                                if (self.elementsOverlap(newBall, elements.dynamometer, 30)) {
                                    experimentState.ballAttached = true;
                                    self.updateStringPosition(newBall, elements.string, elements.springEnd, experimentState);
                                }
                            };
                            
                            document.addEventListener('mousemove', handleMove);
                            document.addEventListener('mouseup', handleUp);
                        }
                    });
                }
            }
        };
        
        requestAnimationFrame(animateTrajectory);
        
        currentInstructionDisplay.textContent = "Повторите опыт не менее 5 раз. Потом вычислите энергию и погрешности.";
        
        if (experimentState.distanceValues.length === 0)
            document.getElementById('data-collection-panel').style.display = 'block';
    },

    updateExperimentProgress(experimentState, elements) {
        if (experimentState.dynamometerMounted && experimentState.troughMounted && experimentState.step === 2) {
            experimentState.step = 3;
            physjs.goToStep('step3');
            
            elements.stepElements.forEach((el, index) => {
                el.classList.remove('active');
                if (index === 2) el.classList.add('active');
                else if (index < 2) el.classList.add('completed');
            });
            
            elements.currentInstructionDisplay.textContent = "Теперь прикрепите шар к динамометру с помощью нити.";
        }
        
        if (experimentState.ballAttached && experimentState.step === 3) {
            this.advanceToStep(elements.stepElements, experimentState, 4);
            elements.currentInstructionDisplay.textContent = "Отодвигайте шар вправо от желоба до тех пор, пока показания динамометра не станут равными 2H.";
        }
    },

    checkStepCompletion(experimentState, stepElements) {
        if (experimentState.step === 1 && experimentState.ballWeighed)
            stepElements[0].classList.add('completed');
        else if (experimentState.step === 2 && experimentState.dynamometerMounted && experimentState.troughMounted)
            stepElements[1].classList.add('completed');
        else if (experimentState.step === 3 && experimentState.ballAttached)
            stepElements[2].classList.add('completed');
        else if (experimentState.step === 4 && experimentState.springExtended)
            stepElements[3].classList.add('completed');
        else if (experimentState.step === 5 && experimentState.distanceValues.length >= 5)
            stepElements[4].classList.add('completed');
    },

    setupTooltips(tooltip) {
        const physElements = document.querySelectorAll('.phys, .phys-fixed, .phys-attachable');
        physElements.forEach(el => {
            el.addEventListener('mouseenter', function(e) {
                const name = this.getAttribute('data-name');
                if (name) {
                    tooltip.textContent = name;
                    tooltip.style.opacity = 1;
                    tooltip.style.left = (e.clientX + 10) + 'px';
                    tooltip.style.top = (e.clientY + 10) + 'px';
                }
            });
            
            el.addEventListener('mousemove', function(e) {
                if (tooltip.style.opacity === '1') {
                    tooltip.style.left = (e.clientX + 10) + 'px';
                    tooltip.style.top = (e.clientY + 10) + 'px';
                }
            });
            
            el.addEventListener('mouseleave', function() {
                tooltip.style.opacity = 0;
            });
        });
    },

    elementsOverlap(el1, el2, tolerance = 0) {
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();
        
        return !(rect1.right < rect2.left - tolerance || 
                rect1.left > rect2.right + tolerance || 
                rect1.bottom < rect2.top - tolerance || 
                rect1.top > rect2.bottom + tolerance);
    },

    advanceToStep(stepElements, experimentState, step) {
        if (step <= experimentState.step) return;

        experimentState.step = step;
        physjs.goToStep('step' + step);

        stepElements.forEach((el, index) => {
            index + 1 === step ? 
                el.classList.add('active') :
                el.classList.remove('active');
        });
    },

    resetExperiment() {
        location.reload();
    },
    
    goBack() {
        window.location.href = '../index.html';
    },

    addMeasurementToTable(experimentState, resultsBody) {
        const row = document.createElement('tr');
        const rowIndex = experimentState.distanceValues.length;
        
        row.innerHTML = `
            <td>${rowIndex}</td>
            <td>${experimentState.force.toFixed(1)}</td>
            <td>${experimentState.deformation.toFixed(3)}</td>
            <td>${experimentState.distanceValues[rowIndex - 1].toFixed(3)}</td>
        `;
        
        resultsBody.appendChild(row);
    },

    handleBallOnScale(experimentState, ball, scale, scaleDisplay, massDisplay) {
        if (experimentState.ballOnScale) return;
        
        if (this.elementsOverlap(ball, scale, 20)) {
            this.placeOnScale(experimentState, {
                ball: ball,
                scale: scale,
                scaleDisplay: scaleDisplay,
                massDisplay: massDisplay,
                currentInstructionDisplay: document.getElementById('current-instruction')
            });
            return true;
        }
        
        return false;
    },
    
    recordMeasurement(experimentState, distance) {
        if (!experimentState.forceValues) experimentState.forceValues = [];
        if (!experimentState.deformationValues) experimentState.deformationValues = [];
        
        experimentState.forceValues.push(experimentState.force);
        experimentState.deformationValues.push(experimentState.deformation);
        experimentState.distanceValues.push(distance);
        
        this.addMeasurementToTable(experimentState, document.getElementById('results-body'));
        
        experimentState.forceAvg = experimentState.forceValues.reduce((a, b) => a + b, 0) / experimentState.forceValues.length;
        experimentState.deformationAvg = experimentState.deformationValues.reduce((a, b) => a + b, 0) / experimentState.deformationValues.length;
        experimentState.distanceAvg = experimentState.distanceValues.reduce((a, b) => a + b, 0) / experimentState.distanceValues.length;
        
        document.getElementById('distance-avg').textContent = experimentState.distanceAvg.toFixed(2);
        
        if (experimentState.distanceValues.length >= 5) {
            this.calculateStandardDeviation(experimentState);
            
            if (experimentState.step < 6) {
                const stepElements = document.querySelectorAll('#status-panel ol li');
                this.advanceToStep(stepElements, experimentState, 6);
                document.getElementById('current-instruction').textContent = "Теперь выполните расчеты и введите их в форму ниже.";
                
                const calculationForm = document.getElementById('calculations-form') || this.createCalculationForm();
                calculationForm.style.display = 'block';
            }
        }
    },
    
    updateStringPosition(ball, string, springEnd, experimentState) {
        if (experimentState.ballAttached) {
            const ballRect = ball.getBoundingClientRect();
            const dynamoRect = springEnd.getBoundingClientRect();
            
            const startX = dynamoRect.left + dynamoRect.width / 2;
            const startY = dynamoRect.top + dynamoRect.height / 2;
            const endX = ballRect.left + ballRect.width / 2;
            const endY = ballRect.top + ballRect.height / 2;
            
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
            
            string.style.width = `${length}px`;
            string.style.left = `${startX}px`;
            string.style.top = `${startY}px`;
            string.style.transform = `rotate(${angle}deg)`;
            string.style.display = 'block';
        } else {
            string.style.display = 'none';
        }
    },
    
    calculateStandardDeviation(experimentState) {
        const mean = experimentState.distanceAvg;
        const squareDiffs = experimentState.distanceValues.map(value => {
            const diff = value - mean;
            return diff * diff;
        });
        
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        experimentState.distanceStdDev = Math.sqrt(avgSquareDiff);
    },
    
    checkCalculations(experimentState, formData) {
        const correctEp = (experimentState.forceAvg * experimentState.deformationAvg) / 2;
        const g = 9.8;
        const correctEk = (experimentState.ballMass * g * Math.pow(experimentState.distanceAvg, 2)) / (4 * experimentState.height);
        const epAccuracy = Math.abs((formData.Ep - correctEp) / correctEp);
        const ekAccuracy = Math.abs((formData.Ek - correctEk) / correctEk);
        
        const results = {
            Ep: epAccuracy <= 0.05,
            Ek: ekAccuracy <= 0.05,
            allCorrect: false
        };
        
        results.allCorrect = results.Ep && results.Ek;
        
        const energyDifference = Math.abs((correctEp - correctEk) / correctEp);
        const hasConservation = energyDifference <= 0.1;
        
        results.conservationVerified = formData.conservationVerified === hasConservation;
        
        return {
            results,
            correctValues: {
                Ep: correctEp,
                Ek: correctEk,
                conservationVerified: hasConservation
            }
        };
    },
    
    showCalculationFeedback(element, type, message) {
        element.textContent = message;
        element.className = type === 'success' ? 'feedback success' : 'feedback error';
    },
    
    createCalculationForm() {
        const form = document.createElement('div');
        form.id = 'calculations-form';
        form.style.display = 'none';
        form.className = 'calculation-form panel ui-panel';
        
        form.innerHTML = `
            <div class="panel-header">
                <h3>Расчеты</h3>
            </div>
            <div class="panel-content">
                <p>Введите ваши результаты расчетов:</p>
                
                <div class="input-group">
                    <label for="ep-input">Потенциальная энергия пружины (Ep, Дж):</label>
                    <input type="number" id="ep-input" step="0.001" min="0">
                    <div id="ep-feedback" class="feedback"></div>
                </div>
                
                <div class="input-group">
                    <label for="ek-input">Кинетическая энергия шара (Ek, Дж):</label>
                    <input type="number" id="ek-input" step="0.001" min="0">
                    <div id="ek-feedback" class="feedback"></div>
                </div>
                
                <div class="input-group">
                    <p>Выполняется ли закон сохранения энергии?</p>
                    <label>
                        <input type="radio" name="conservation" value="true"> Да
                    </label>
                    <label>
                        <input type="radio" name="conservation" value="false"> Нет
                    </label>
                    <div id="conservation-feedback" class="feedback"></div>
                </div>
                
                <button type="button" id="check-calculation-btn" class="btn btn-primary">Проверить</button>
            </div>
        `;
        
        document.getElementById('experiment-container').appendChild(form);
        
        document.getElementById('check-calculation-btn').addEventListener('click', function() {
            const experimentState = window.experimentState;
            
            const formData = {
                Ep: parseFloat(document.getElementById('ep-input').value),
                Ek: parseFloat(document.getElementById('ek-input').value),
                conservationVerified: document.querySelector('input[name="conservation"]:checked')?.value === 'true'
            };
            
            const checkResult = experimentFunctions.checkCalculations(experimentState, formData);
            
            checkResult.results.Ep ? 
                experimentFunctions.showCalculationFeedback(document.getElementById('ep-feedback'), 'success', 'Правильно!') :
                experimentFunctions.showCalculationFeedback(document.getElementById('ep-feedback'), 'error', 
                    `Неверно. Правильный ответ: ${checkResult.correctValues.Ep.toFixed(3)} Дж`);
            
            checkResult.results.Ek ? 
                experimentFunctions.showCalculationFeedback(document.getElementById('ek-feedback'), 'success', 'Правильно!') :
                experimentFunctions.showCalculationFeedback(document.getElementById('ek-feedback'), 'error', 
                    `Неверно. Правильный ответ: ${checkResult.correctValues.Ek.toFixed(3)} Дж`);
            
            if (checkResult.results.conservationVerified) {
                experimentFunctions.showCalculationFeedback(document.getElementById('conservation-feedback'), 'success', 'Правильно!');
            } else {
                const correctAnswer = checkResult.correctValues.conservationVerified ? 'Да' : 'Нет';
                experimentFunctions.showCalculationFeedback(document.getElementById('conservation-feedback'), 'error', 
                    `Неверно. Правильный ответ: ${correctAnswer}`);
            }
            
            if (checkResult.results.allCorrect && checkResult.results.conservationVerified) {
                const conclusion = document.getElementById('energy-conservation');
                conclusion.style.display = 'block';
                conclusion.innerHTML = `
                    <h4>Результаты проверки закона сохранения энергии:</h4>
                    <p>Потенциальная энергия: ${checkResult.correctValues.Ep.toFixed(3)} Дж</p>
                    <p>Кинетическая энергия: ${checkResult.correctValues.Ek.toFixed(3)} Дж</p>
                    <p class="info-box info-box-success">Все расчеты верны! Лабораторная работа выполнена успешно.</p>
                `;
            }
        });
        
        return form;
    },
    

    checkAttachmentAllowed(experimentState, sourceId, targetId) {
        if (experimentState.step === 2 && (sourceId === 'ball' || targetId === 'ball')) {
            const instruction = document.getElementById('current-instruction');
            const originalText = instruction.textContent;
            instruction.textContent = "Сначала прикрепите динамометр и желоб к штативам!";
            instruction.style.color = 'red';
            
            setTimeout(() => {
                instruction.textContent = originalText;
                instruction.style.color = '';
            }, 2000);
            
            return false;
        }
        return true;
    }
};

export default experimentFunctions;