const experimentFunctions = {
    PIXELS_PER_METER: 22,
    ballMass: 1.5,

    initExperiment(state, elements) {
        physjs.setDebugMode(false);
        physjs.init();
        
        const towerTop = document.querySelector('.tower-top');
        if (towerTop) {
            const towerRect = towerTop.getBoundingClientRect();
            elements.pistol.style.top = (towerRect.top - 60) + 'px';
        } else {
            elements.pistol.style.top = '150px';
        }
        
        state.basePosition = this.getBarrelBasePosition(elements.pistol);
        
        const barrelEnd = this.getBarrelEndPosition(elements.pistol);
        this.createMeasuringTools(elements.floorArea, barrelEnd.x);
        
        const heightRow = document.querySelector('.measurement-row:nth-child(1)');
        const rangeLExpRow = document.querySelector('.measurement-row:nth-child(5)');
        const rangeLCalcRow = document.querySelector('.measurement-row:nth-child(6)');
        
        if (heightRow) heightRow.style.display = 'none';
        if (rangeLExpRow) rangeLExpRow.style.display = 'none';
        if (rangeLCalcRow) rangeLCalcRow.style.display = 'none';
        
        elements.heightDisplay.textContent = state.h.toFixed(2);
        elements.alphaDisplay.textContent = state.alpha_deg;
        this.updateAngleDisplay(state.alpha_deg, elements.angleDisplay);
        this.resetProjectilePosition(state, elements.pistol, elements.projectile);
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.updateInstructions("Произведите горизонтальный выстрел для определения начальной скорости.");
        this.setupLabSteps();
        
        this.createResultsTable();
        
        state.currentResultAdded = false;
        
        const baseCorrectionFactor = 0.88;
        state.correctionFactor = baseCorrectionFactor * (1 + 0.1 * Math.log(this.ballMass / 0.5));
        state.rulerBottomY = 50;
    },

    getBarrelBasePosition(pistol) {
        const barrelElem = pistol.querySelector('.cannon-barrel');
        const originalTransform = barrelElem.style.transform;
        
        barrelElem.style.transform = 'rotate(0deg)';
        
        const barrelRect = barrelElem.getBoundingClientRect();
        const pivotX = barrelRect.left;
        const pivotY = barrelRect.top + barrelRect.height / 2;
        
        const barrelLength = barrelRect.width + 10;
        const verticalOffset = 5;
        
        const endX = pivotX + barrelLength;
        const endY = pivotY + verticalOffset;
        
        barrelElem.style.transform = originalTransform;
        
        return {
            x: endX,
            y: endY
        };
    },

    createMeasuringTools(floorArea, barrelX) {
        const oldRuler = document.getElementById('measuring-ruler');
        if (oldRuler) oldRuler.remove();
        
        const ruler = document.createElement('div');
        ruler.id = 'measuring-ruler';
        ruler.className = 'measuring-ruler';
        ruler.style.left = barrelX + 'px';
        ruler.style.width = 'calc(100% - ' + (barrelX + 20) + 'px)';
        
        for (let i = 0; i <= 40; i++) {
            const mark = document.createElement('div');
            mark.className = i % 5 === 0 ? 'ruler-mark major-mark' : 'ruler-mark';
            mark.style.left = (i * this.PIXELS_PER_METER) + 'px';
            
            if (i % 5 === 0) {
                const label = document.createElement('div');
                label.textContent = i + ' м';
                label.className = 'ruler-label';
                label.style.bottom = '22px';
                label.style.left = '-10px';
                mark.appendChild(label);
            }
            
            ruler.appendChild(mark);
        }
        
        document.getElementById('experiment-area').appendChild(ruler);
        
        const measurementPanel = document.createElement('div');
        measurementPanel.id = 'user-measurement-panel';
        measurementPanel.className = 'user-measurement-panel ui-panel';
        measurementPanel.style.display = 'none';
        
        measurementPanel.innerHTML = `
            <div class="panel-header">
                <h3>Измерение дальности</h3>
            </div>
            <div class="panel-content">
                <div class="input-group">
                    <label>Ваша измеренная дальность (м):</label>
                    <input type="number" id="user-measured-distance" step="0.1" min="0">
                </div>
                <button id="verify-measurement-btn" class="btn btn-primary">Проверить</button>
                <div id="measurement-feedback" class="feedback"></div>
            </div>
        `;
        
        document.getElementById('experiment-area').appendChild(measurementPanel);
        
        const self = this;
        
        document.getElementById('verify-measurement-btn').addEventListener('click', function() {
            const state = window.experimentState;
            if (state.currentResultAdded) return;
            
            const userValue = parseFloat(document.getElementById('user-measured-distance').value);
            if (isNaN(userValue)) {
                const feedback = document.getElementById('measurement-feedback');
                feedback.textContent = "Введите корректное число!";
                feedback.className = "feedback error";
                return;
            }
            
            const actualValue = state.l_exp;
            const tolerance = 0.15;
            
            const isCorrect = Math.abs(userValue - actualValue) / actualValue <= tolerance;
            
            const feedback = document.getElementById('measurement-feedback');
            feedback.textContent = isCorrect 
                ? "Верно! Ваше измерение совпадает с экспериментальным значением."
                : "Неверно. Погрешность превышает допустимые 15%.";
            feedback.className = isCorrect ? "feedback success" : "feedback error";
            
            if (isCorrect) {
                self.addResultToTable(-state.alpha_deg, state.l_exp, state.lastShootHeight);
                state.currentResultAdded = true;
            }
        });
    },
    
    createResultsTable() {
        const resultsPanel = document.createElement('div');
        resultsPanel.id = 'results-panel';
        resultsPanel.className = 'results-panel ui-panel';
        
        resultsPanel.innerHTML = `
            <div class="panel-header">
                <h3>Результаты измерений</h3>
            </div>
            <div class="panel-content">
                <table id="results-table">
                    <thead>
                        <tr>
                            <th>Угол (°)</th>
                            <th>Дальность (м)</th>
                            <th>Высота (м)</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
                <div id="optimal-angle-result" class="info-box info-box-primary mt-3"></div>
            </div>
        `;
        
        document.getElementById('experiment-area').appendChild(resultsPanel);
    },
    
    addResultToTable(angle, range, height) {
        const tbody = document.querySelector('#results-table tbody');
        
        let existingRow = null;
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const existingAngle = parseFloat(row.querySelector('td:first-child').textContent);
            if (existingAngle === angle) {
                existingRow = row;
            }
        });
        
        if (existingRow) {
            existingRow.querySelector('td:nth-child(2)').textContent = range.toFixed(2);
            existingRow.querySelector('td:nth-child(3)').textContent = height.toFixed(2);
        } else {
            const row = document.createElement('tr');
            
            const angleCell = document.createElement('td');
            angleCell.textContent = angle;
            
            const rangeCell = document.createElement('td');
            rangeCell.textContent = range.toFixed(2);
            
            const heightCell = document.createElement('td');
            heightCell.textContent = height.toFixed(2);
            
            row.appendChild(angleCell);
            row.appendChild(rangeCell);
            row.appendChild(heightCell);
            tbody.appendChild(row);
        }
        
        this.checkOptimalAngle();
    },
    
    checkOptimalAngle() {
        const rows = document.querySelectorAll('#results-table tbody tr');
        if (rows.length < 3) return;
        
        const results = [];
        rows.forEach(row => {
            const angle = parseFloat(row.cells[0].textContent);
            const range = parseFloat(row.cells[1].textContent);
            results.push({ angle, range });
        });
        
        results.sort((a, b) => b.range - a.range);
        const maxResult = results[0];
        
        document.getElementById('optimal-angle-result').textContent = 
            `Оптимальный угол: ${maxResult.angle}° (${maxResult.range.toFixed(2)} м)`;
    },

    handleKeyDown(event) {
        const state = window.experimentState;
        if (state && state.animation_in_progress) {
            if (event.key === 'q' || event.key === 'Q' || 
                event.key === 'й' || event.key === 'Й' ||
                event.key === 'e' || event.key === 'E' ||
                event.key === 'у' || event.key === 'У') {
                event.preventDefault();
                return;
            }
        }
        
        const pistolElem = document.getElementById('pistol');
        if (!pistolElem) return;

        const barrelElem = pistolElem.querySelector('.cannon-barrel');
        if (!barrelElem) return;

        const rotationStep = 5;
        let currentAngle = 0;

        const currentTransform = barrelElem.style.transform || '';
        const rotateMatch = currentTransform.match(/rotate\(([-\d.]+)deg\)/);
        if (rotateMatch) currentAngle = parseFloat(rotateMatch[1]);

        let newAngle = currentAngle;

        if (event.key === 'q' || event.key === 'Q' || event.key === 'й' || event.key === 'Й')
            newAngle = Math.max(currentAngle - rotationStep, -90);
        else if (event.key === 'e' || event.key === 'E' || event.key === 'у' || event.key === 'У')
            newAngle = Math.min(currentAngle + rotationStep, 0);

        if (newAngle !== currentAngle) {
            barrelElem.style.transform = `rotate(${newAngle}deg)`;

            const displayAngle = -newAngle;
            document.getElementById('angle-display').textContent = displayAngle + '°';

            const alphaDisplay = document.getElementById('alpha-val');
            if (alphaDisplay) alphaDisplay.textContent = displayAngle;

            const state = window.experimentState;
            if (state) {
                state.alpha_deg = newAngle;
                state.alpha_rad = newAngle * (Math.PI / 180);
            }
            
            const barrelEnd = this.getBarrelEndPosition(pistolElem);
            this.createMeasuringTools(document.getElementById('floor-area'), barrelEnd.x);
            this.resetProjectilePosition(state, pistolElem, document.getElementById('projectile'));
        }
    },
    
    getBarrelEndPosition(pistol) {
        const muzzleElem = pistol.querySelector('.cannon-muzzle');
        
        if (!muzzleElem) {
            const barrelElem = pistol.querySelector('.cannon-barrel');
            
            let barrelAngle = 0;
            const currentTransform = barrelElem.style.transform || '';
            const rotateMatch = currentTransform.match(/rotate\(([-\d.]+)deg\)/);
            if(rotateMatch) barrelAngle = parseFloat(rotateMatch[1]);
    
            const barrelAngleRad = barrelAngle * (Math.PI / 180);
            const barrelRect = barrelElem.getBoundingClientRect();
            const pivotX = barrelRect.left;
            const pivotY = barrelRect.top + barrelRect.height / 2;
            const barrelLength = barrelRect.width + 10;
            const verticalOffset = 5;
            const endX = pivotX + barrelLength * Math.cos(barrelAngleRad);
            const endY = pivotY + barrelLength * Math.sin(barrelAngleRad) + verticalOffset;
            
            return {
                x: endX,
                y: endY,
                angle: barrelAngle,
                angleRad: barrelAngleRad
            };
        }
        
        const muzzleRect = muzzleElem.getBoundingClientRect();
        const centerX = muzzleRect.left + muzzleRect.width / 2;
        const centerY = muzzleRect.top + muzzleRect.height / 2;
        
        const barrelElem = pistol.querySelector('.cannon-barrel');
        let barrelAngle = 0;
        const currentTransform = barrelElem.style.transform || '';
        const rotateMatch = currentTransform.match(/rotate\(([-\d.]+)deg\)/);
        if(rotateMatch) barrelAngle = parseFloat(rotateMatch[1]);
        const barrelAngleRad = barrelAngle * (Math.PI / 180);
        
        return {
            x: centerX,
            y: centerY,
            angle: barrelAngle,
            angleRad: barrelAngleRad
        };
    },
    
    resetProjectilePosition(state, pistol, projectile) {
        const barrelEnd = this.getBarrelEndPosition(pistol);
        
        projectile.style.left = (barrelEnd.x - projectile.offsetWidth / 2) + 'px';
        projectile.style.top = (barrelEnd.y - projectile.offsetHeight / 2) + 'px';
        projectile.style.visibility = 'hidden';
    },

    setupTooltips(tooltip) {
        const physElements = document.querySelectorAll('.phys, .phys-fixed, .phys-attachable');
        physElements.forEach(el => {
            el.addEventListener('mouseenter', (e) => this.showTooltip.call(el, e, tooltip));
            el.addEventListener('mouseleave', () => this.hideTooltip(tooltip));
        });
    },

    showTooltip(e, tooltip) {
        const name = this.dataset.name;
        if (name && tooltip) {
            tooltip.textContent = name;
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY + 10) + 'px';
            tooltip.style.opacity = 1;
        }
    },

    hideTooltip(tooltip) {
        if (tooltip) tooltip.style.opacity = 0;
    },

    setupLabSteps() {
        const step1 = physjs.createStep('step1', 'Произведите горизонтальный выстрел');
        const step2 = physjs.createStep('step2', 'Измерьте дальность (s) и рассчитайте v₀');
        const step3 = physjs.createStep('step3', 'Установите угол выстрела (α)');
        const step4 = physjs.createStep('step4', 'Произведите выстрел под углом α');
        const step5 = physjs.createStep('step5', 'Измерьте дальность полета снаряда');
        physjs.addStep(step1).addStep(step2).addStep(step3).addStep(step4).addStep(step5);
        physjs.goToStep('step1');
    },
    
    updateAngleDisplay(angle, angleDisplay) {
        if(angleDisplay) angleDisplay.textContent = (-angle) + '°';
    },

    fire(state, projectile, pistol, floorArea, rangeSDisplay, v0Display, rangeLExpDisplay, rangeLCalcDisplay, angleDisplay) {
        if (state.animation_in_progress) return;
        
        const barrelEnd = this.getBarrelEndPosition(pistol);
        
        this.createMeasuringTools(floorArea, barrelEnd.x);
        
        state.animation_in_progress = true;
        state.alpha_deg = barrelEnd.angle;
        state.alpha_rad = barrelEnd.angleRad;
        const invertedAlphaRad = -state.alpha_rad;
        
        this.clearLandingMarks(floorArea);
        this.updateUIButtons(state, true);
        
        document.getElementById('user-measurement-panel').style.display = 'none';
        
        state.currentResultAdded = false;
    
        const isHorizontal = !state.horizontalShotDone;        
        const floorRect = floorArea.getBoundingClientRect();
        
        const heightFromBottom = floorRect.bottom - barrelEnd.y;
        const heightFromRuler = heightFromBottom - state.rulerBottomY;
        const heightInMeters = heightFromRuler / this.PIXELS_PER_METER;
        
        state.lastShootHeight = heightInMeters;
        state.currentShootHeight = heightInMeters;
        
        if (isHorizontal) {
            const trajectory = physjs.calculateTrajectory(state.v0, 0, state.currentShootHeight, state.g);
            state.s = trajectory.range;
            rangeSDisplay.textContent = state.s.toFixed(2);
            v0Display.textContent = state.v0.toFixed(2);
            state.v0_calculated = true;
            state.horizontalShotDone = true;
            
            this.advanceToStep(state, 2);
            this.updateInstructions("Начальная скорость определена. Поверните пистолет клавишами Q/E и сделайте выстрел под углом.");
        } else {
            const trajectory = physjs.calculateTrajectory(state.v0, invertedAlphaRad, state.currentShootHeight, state.g);
            state.l_calc = trajectory.range;
            
            this.advanceToStep(state, 4);
            this.updateInstructions("Выстрел под углом произведен. Измерьте дальность полета снаряда с помощью линейки.");
        }
    
        const vx = state.v0 * Math.cos(invertedAlphaRad) * state.correctionFactor;
        const vy = state.v0 * Math.sin(invertedAlphaRad);
        
        let time;
        if (vy >= 0) {
            time = (vy + Math.sqrt(vy*vy + 2 * state.g * state.currentShootHeight)) / state.g;
        } else {
            const discriminant = vy*vy + 2 * state.g * state.currentShootHeight;
            if (discriminant >= 0) {
                time = (-vy + Math.sqrt(discriminant)) / state.g;
            } else {
                time = Math.sqrt(2 * state.currentShootHeight / state.g);
            }
        }
        time = Math.max(time, 0.5);
    
        const startX_px = barrelEnd.x;
        const startY_px = barrelEnd.y;
        
        const vx_px = vx * this.PIXELS_PER_METER;
        const vy_initial_px = -vy * this.PIXELS_PER_METER;
    
        this.animateProjectile(state, projectile, startX_px, startY_px, vx_px, vy_initial_px, time, floorArea, isHorizontal, rangeLExpDisplay, rangeSDisplay, pistol);
        
        physjs.showTrajectory(startX_px, startY_px, vx_px, vy_initial_px, state.g * this.PIXELS_PER_METER, floorArea, 'trajectory-path', 'experiment-area');
    },

    animateProjectile(state, projectile, startX_px, startY_px, vx_px, vy_initial_px, duration, floorArea, isHorizontal, rangeLExpDisplay, rangeSDisplayParam, pistol) {
        projectile.style.left = (startX_px - projectile.offsetWidth / 2) + 'px';
        projectile.style.top = (startY_px - projectile.offsetHeight / 2) + 'px';
        projectile.style.visibility = 'visible';
    
        let startTime = null;
        const g_px = state.g * this.PIXELS_PER_METER;
        const floorRect = floorArea.getBoundingClientRect();
        const floorY = floorRect.top;
        let hasHitFloor = false;
        const self = this;
        const MAX_ANIMATION_TIME = 30;
        
        const speedFactor = state.animationSpeedFactor || 2.5;
    
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            
            const elapsedTime_s = (timestamp - startTime) / 1000 * speedFactor;
            
            if (elapsedTime_s > MAX_ANIMATION_TIME && !hasHitFloor) {
                hasHitFloor = true;
                projectile.style.visibility = 'hidden';
                state.animation_in_progress = false;
                self.updateUIButtons(state, false);
                return;
            }
    
            const currentX_px = startX_px + vx_px * elapsedTime_s;
            const currentY_px = startY_px + vy_initial_px * elapsedTime_s + 0.5 * g_px * elapsedTime_s * elapsedTime_s;
            
            const projectileBottom = currentY_px + projectile.offsetHeight / 2;
            
            if (projectileBottom >= floorY) {
                if (!hasHitFloor) {
                    hasHitFloor = true;
                    
                    const a = 0.5 * g_px;
                    const b = vy_initial_px;
                    const c = startY_px - (floorY - projectile.offsetHeight / 2);
                    
                    const discriminant = b*b - 4*a*c;
                    
                    let hitTime_s;
                    if (discriminant >= 0) {
                        const t1 = (-b + Math.sqrt(discriminant)) / (2*a);
                        const t2 = (-b - Math.sqrt(discriminant)) / (2*a);
                        
                        hitTime_s = t1 > 0 && t2 > 0 ?
                            Math.min(t1, t2) :
                            (t1 > 0) ? t1 : t2;
                    } else {
                        hitTime_s = elapsedTime_s;
                    }
                    
                    const finalX_px = startX_px + vx_px * hitTime_s;
                    
                    projectile.style.left = (finalX_px - projectile.offsetWidth / 2) + 'px';
                    projectile.style.top = (floorY - projectile.offsetHeight) + 'px';
                    
                    self.addLandingMark(floorArea, finalX_px);
                    
                    if (!isHorizontal) {
                        const rulerStart = parseFloat(document.getElementById('measuring-ruler').style.left);
                        const distanceOnRuler_px = finalX_px - rulerStart;
                        const distanceOnRuler_m = distanceOnRuler_px / self.PIXELS_PER_METER;
                        
                        state.l_exp = distanceOnRuler_m;
                        state.l_calc = distanceOnRuler_m;
                        
                        document.getElementById('user-measurement-panel').style.display = 'block';
                        document.getElementById('user-measured-distance').value = '';
                        document.getElementById('measurement-feedback').textContent = '';
                        
                        self.advanceToStep(state, 5);
                        self.updateInstructions("Выстрел завершен. Измерьте дальность полета снаряда с помощью линейки и введите значение.");
                    } else {
                        const rulerStart = parseFloat(document.getElementById('measuring-ruler').style.left);
                        const distanceOnRuler_px = finalX_px - rulerStart;
                        const distanceOnRuler_m = distanceOnRuler_px / self.PIXELS_PER_METER;
                        
                        state.s = distanceOnRuler_m;
                        if (rangeSDisplayParam) {
                            rangeSDisplayParam.textContent = state.s.toFixed(2);
                        }
                        
                        self.addResultToTable(0, state.s, state.lastShootHeight);
                    }
                    
                    state.animation_in_progress = false;
                    self.updateUIButtons(state, false);
                }
                return;
            }
            
            projectile.style.left = (currentX_px - projectile.offsetWidth / 2) + 'px';
            projectile.style.top = (currentY_px - projectile.offsetHeight / 2) + 'px';
            
            if (!hasHitFloor) {
                requestAnimationFrame(step);
            }
        }
    
        requestAnimationFrame(step);
    },

    addLandingMark(floorArea, landingX_px) {
        const mark = document.createElement('div');
        mark.className = 'landing-mark';
        mark.style.left = landingX_px + 'px';
        document.getElementById('experiment-area').appendChild(mark);
    },

    clearLandingMarks(floorArea) {
        const marks = document.querySelectorAll('.landing-mark');
        marks.forEach(mark => mark.remove());
        
        const trajectory = document.getElementById('trajectory-path');
        if (trajectory) trajectory.remove();
    },

    updateInstructions(text) {
        const display = document.getElementById('current-instruction');
        if (display) display.textContent = text;
    },

    advanceToStep(state, step) {
        if (step <= state.step) return;
        state.step = step;
        physjs.goToStep('step' + step);
        const stepElements = [];
        for (let i = 1; i <= 5; i++) {
            const el = document.getElementById(`step${i}`);
            if (el) stepElements.push(el);
        }
        stepElements.forEach((el, index) => {
            const currentStepNum = index + 1;
            if (currentStepNum < step) {
                el.classList.remove('active');
                el.style.textDecoration = 'line-through';
                el.style.opacity = '0.6';
            } else if (currentStepNum === step) {
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

    updateUIButtons(state, animationInProgress) {
        const fireBtn = document.getElementById('fire-btn');
        if (fireBtn) {
            fireBtn.disabled = animationInProgress;
            fireBtn.style.opacity = animationInProgress ? '0.5' : '1';
        }
    },

    resetExperiment(state, elements) {
        location.reload();
    },

    goBack() {
        window.location.href = '../index.html';
    }
};

export default experimentFunctions;