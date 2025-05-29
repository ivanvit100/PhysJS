const experimentFunctions = {
    experimentState: {
        canvas: document.getElementById('simulationCanvas'),
        ctx: document.getElementById('simulationCanvas').getContext('2d'),
        resultsBody: document.getElementById('results-body'),
        toggleLensTypeButton: document.getElementById('toggle-lens-type'),
        userOneLensInput: document.getElementById('user-one-lens'),
        userTwoLensInput: document.getElementById('user-two-lens'),
        userFocusDistanceInput: document.getElementById('user-focus-distance'),
        oneLensCheck: document.getElementById('one-lens-check'),
        twoLensCheck: document.getElementById('two-lens-check'),
        focusDistanceCheck: document.getElementById('focus-distance-check'),
        H: 120, D: 250, h0: 70, n: 1.8,
        
        lockLensMovement: true,
        convergingFocus: 180, 
        divergingFocus: 220,
        lensDistance: 180,
        
        showBothLenses: false, 
        convergingLens: null, 
        divergingLens: null,
        screenX: 600, calculatedResults: {}, showRuler: false,
        rulerPosition: { x: 200, y: 150, width: 200, height: 30 },
        isDraggingScreen: false, isDraggingRuler: false,
        isDraggingLens: false, draggingLensType: null,
        dragStartX: 0, dragStartY: 0, initialScreenX: 0, measuredFocus: 0, animationFrameId: null,
        storedOneLensDistance: 0, storedTwoLensDistance: 0,
        singleLensFocalPoint: null,
        cachedConvergingLensProps: null,
        get R() { return ((this.D * this.D / 4) + Math.pow(this.H - this.h0, 2)) / (2 * (this.H - this.h0)); },
        get bulgeAtCenter() { return (this.H - this.h0) / 2; },
        get halfDiameter() { return this.D / 2; },
        get adjustedR() { 
            const halfDiam = this.D / 2;
            const bulge = (this.H - this.h0) / 2;
            return (halfDiam * halfDiam + bulge * bulge) / (2 * bulge); 
        },
        get F() { 
            const halfDiam = this.D / 2;
            const bulge = (this.H - this.h0) / 2;
            const adjR = (halfDiam * halfDiam + bulge * bulge) / (2 * bulge);
            return adjR / (2 * (this.n - 1)); 
        }
    },

    init() {
        const canvas = this.experimentState.canvas;
        
        this.experimentState.originalConvergingN = this.experimentState.n;
        this.experimentState.convergingLens = { x: 200, y: canvas.height / 2, isConverging: false };
        this.experimentState.divergingLens = { 
            x: this.experimentState.convergingLens.x + this.experimentState.lensDistance, 
            y: canvas.height / 2, 
            isConverging: true 
        };
        
        this.experimentState.cachedConvergingLensProps = this.calculateConvergingLensProperties();
        this.experimentState.screenX = canvas.width - 50;
        this.experimentState.storedOneLensDistance = Math.abs(this.experimentState.screenX - this.experimentState.convergingLens.x);
        
        const checkButton = document.getElementById('check-measurements');
        if (checkButton) {
            checkButton.addEventListener('click', () => {
                this.checkMeasurementInputs();
            });
        }
    
        this.drawSimulation();
        ['mousedown', 'mousemove', 'mouseup'].forEach((event, i) => 
            canvas.addEventListener(event, [this.handleMouseDown, this.handleMouseMove, this.handleMouseUp][i].bind(this))
        );
    },

    calculateConvergingLensProperties() {
        const state = this.experimentState;
        const focalLength = state.convergingFocus;
        const halfDiam = state.D / 2;
        const bulge = (state.H - state.h0) / 2;
        const adjR = (halfDiam * halfDiam + bulge * bulge) / (2 * bulge);
        
        return {
            focalLength: focalLength,
            refractiveIndex: state.n,
            adjustedR: adjR
        };
    },

    getLensProperties(isConverging) {
        const state = this.experimentState;
        
        if (isConverging) {
            return state.cachedConvergingLensProps;
        } else {
            const halfDiam = state.D / 2;
            const bulge = (state.H - state.h0) / 2;
            const adjR = (halfDiam * halfDiam + bulge * bulge) / (2 * bulge);
            const sphericalWidth = Math.sqrt(Math.max(0, state.adjustedR ** 2 - halfDiam ** 2));
            const formulaF = state.divergingFocus - state.lensDistance - state.h0 - 2 * sphericalWidth;
            const targetF = state.convergingFocus;
            const targetf = formulaF;
            const calculatedD = (targetF * targetf) / (targetF - targetf);
            
            state.calculatedSystemD = calculatedD;
            
            const requiredN = (adjR / (2 * state.divergingFocus)) + 1;
            
            return {
                focalLength: -state.divergingFocus,
                refractiveIndex: requiredN,
                adjustedR: adjR
            };
        }
    },
    
    toggleBothLenses() {
        const state = experimentFunctions.experimentState;
        
        if (!state.showBothLenses) {
            if (state.storedOneLensDistance === 0)
                state.storedOneLensDistance = Math.abs(state.screenX - state.convergingLens.x);
            
            state.divergingLens.x = state.convergingLens.x + state.lensDistance;
            const rightLens = state.convergingLens.x > state.divergingLens.x ? state.convergingLens : state.divergingLens;
            state.storedTwoLensDistance = Math.abs(state.screenX - rightLens.x);
            
        } else {
            const rightLens = state.convergingLens.x > state.divergingLens.x ? state.convergingLens : state.divergingLens;
            state.storedTwoLensDistance = Math.abs(state.screenX - rightLens.x);
            state.storedOneLensDistance = Math.abs(state.screenX - state.convergingLens.x);
        }
        
        state.showBothLenses = !state.showBothLenses;
        state.toggleLensTypeButton.textContent = state.showBothLenses ? 'Одна линза' : 'Обе линзы';
        
        experimentFunctions.updateMeasurementDisplay();
        experimentFunctions.drawSimulation();
    },

    toggleRuler() {
        const state = experimentFunctions.experimentState;
        state.showRuler = !state.showRuler;
        if (state.showRuler) {
            state.rulerPosition = {
                x: state.canvas.width / 2 - 100,
                y: state.canvas.height / 2 - 15,
                width: 200,
                height: 30
            };
        }
        experimentFunctions.drawSimulation();
    },

    resetMeasurements() {
        const state = this.experimentState;
        Object.assign(state, {
            calculatedResults: {}, showBothLenses: false, measuredFocus: 0,
            storedOneLensDistance: 0, storedTwoLensDistance: 0,
            singleLensFocalPoint: null
        });
        state.resultsBody && (state.resultsBody.innerHTML = '');
        state.toggleLensTypeButton.textContent = 'Обе линзы';
        state.convergingLens.x = 250;
        state.divergingLens.x = state.convergingLens.x + state.lensDistance;
        state.screenX = state.canvas.width - 50;
        state.storedOneLensDistance = Math.abs(state.screenX - state.convergingLens.x);
        
        [state.userOneLensInput, state.userTwoLensInput, state.userFocusDistanceInput]
            .forEach(input => input && (input.value = ''));
        [state.oneLensCheck, state.twoLensCheck, state.focusDistanceCheck]
            .forEach(check => check && (check.className = 'check-mark'));
        
        this.drawSimulation();
    },

    getMousePos(event) {
        const rect = this.experimentState.canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    },

    isPointInside(px, py, x, y, radius) {
        return Math.sqrt((px - x) ** 2 + (py - y) ** 2) <= radius;
    },

    isPointInsideLens(px, py, lens) {
        return this.isPointInside(px, py, lens.x, lens.y, this.experimentState.halfDiameter + 20);
    },

    isPointInsideRuler(px, py) {
        const state = this.experimentState;
        const { x, y, width, height } = state.rulerPosition;
        return px >= x && px <= x + width && py >= y && py <= y + height;
    },

    handleMouseDown(event) {
        const state = this.experimentState;
        const { x: mouseX, y: mouseY } = this.getMousePos(event);
        
        if (Math.abs(mouseX - state.screenX) < 10) {
            Object.assign(state, { isDraggingScreen: true, dragStartX: mouseX, initialScreenX: state.screenX });
        } else if (state.showRuler && this.isPointInsideRuler(mouseX, mouseY)) {
            Object.assign(state, { isDraggingRuler: true, dragStartX: mouseX, dragStartY: mouseY });
        } else if (this.isPointInsideLens(mouseX, mouseY, state.convergingLens) && !(state.showBothLenses && state.lockLensMovement)) {
            Object.assign(state, { isDraggingLens: true, draggingLensType: 'converging', dragStartX: mouseX });
        } else if (state.showBothLenses && this.isPointInsideLens(mouseX, mouseY, state.divergingLens) && !state.lockLensMovement) {
            Object.assign(state, { isDraggingLens: true, draggingLensType: 'diverging', dragStartX: mouseX });
        }
        
        if (state.isDraggingScreen || state.isDraggingRuler || state.isDraggingLens) {
            state.canvas.classList.add('dragging');
        }
    },

    handleMouseMove(event) {
        const state = this.experimentState;
        const { x: mouseX, y: mouseY } = this.getMousePos(event);
        let needsRedraw = false;
    
        if (state.isDraggingScreen) {
            const deltaX = mouseX - state.dragStartX;
            state.screenX = Math.max(100, Math.min(state.canvas.width - 10, state.initialScreenX + deltaX));
            
            if (state.showBothLenses) {
                const rightLens = state.convergingLens.x > state.divergingLens.x ? state.convergingLens : state.divergingLens;
                state.measuredFocus = Math.abs(state.screenX - rightLens.x);
                state.storedTwoLensDistance = state.measuredFocus;
            } else {
                state.measuredFocus = Math.abs(state.screenX - state.convergingLens.x);
                state.storedOneLensDistance = state.measuredFocus;
            }
            
            needsRedraw = true;
        } else if (state.isDraggingLens) {
            const deltaX = mouseX - state.dragStartX;
            
            if (state.draggingLensType === 'converging') {
                state.convergingLens.x = Math.max(50, Math.min(state.canvas.width - 150 - state.lensDistance, state.convergingLens.x + deltaX));
                state.divergingLens.x = state.convergingLens.x + state.lensDistance;
            } else {
                state.divergingLens.x = Math.max(50 + state.lensDistance, Math.min(state.canvas.width - 150, state.divergingLens.x + deltaX));
                state.convergingLens.x = state.divergingLens.x - state.lensDistance;
            }
            
            state.dragStartX = mouseX;
            needsRedraw = true;
        } else if (state.isDraggingRuler) {
            const [deltaX, deltaY] = [mouseX - state.dragStartX, mouseY - state.dragStartY];
            state.rulerPosition.x = Math.max(0, Math.min(state.canvas.width - state.rulerPosition.width, state.rulerPosition.x + deltaX));
            state.rulerPosition.y = Math.max(0, Math.min(state.canvas.height - state.rulerPosition.height, state.rulerPosition.y + deltaY));
            Object.assign(state, { dragStartX: mouseX, dragStartY: mouseY });
            needsRedraw = true;
        }
    
        if (needsRedraw) {
            state.animationFrameId && cancelAnimationFrame(state.animationFrameId);
            state.animationFrameId = requestAnimationFrame(() => {
                this.drawSimulation();
                state.animationFrameId = null;
            });
        }
    },

    handleMouseUp() {
        const state = this.experimentState;
        state.canvas.classList.remove('dragging');
        Object.assign(state, {
            isDraggingScreen: false, isDraggingRuler: false,
            isDraggingLens: false, draggingLensType: null
        });
        state.animationFrameId && cancelAnimationFrame(state.animationFrameId);
        this.drawSimulation();
    },

    checkValue(userValue, checkElement) {
        if (!checkElement) return;
        
        const isCorrect = userValue <= 5;
        const newClassName = `check-mark ${isCorrect ? 'correct' : 'incorrect'}`;
        
        checkElement.className = newClassName;
        checkElement.classList.remove('check-mark', 'correct', 'incorrect');
        checkElement.classList.add('check-mark');
        checkElement.classList.add(isCorrect ? 'correct' : 'incorrect');
        checkElement.style.display = 'none';
        checkElement.offsetHeight;
        checkElement.style.display = '';
    },

    drawSimulation() {
        const state = this.experimentState;
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        this.drawLine(0, state.convergingLens.y, state.canvas.width, state.convergingLens.y, 'rgba(0, 0, 0, 0.3)', [5, 5]);
        
        if (state.showBothLenses) {
            this.drawLens(state.convergingLens);
            this.drawLens(state.divergingLens);
            this.drawLightRaysForBothLenses();
        } else {
            this.drawLens(state.convergingLens);
            this.drawLightRays(state.convergingLens);
        }
        
        this.updateMeasurementDisplay();
        this.drawLine(state.screenX, 50, state.screenX, state.canvas.height - 50, '#00008B', [], state.isDraggingScreen ? 4 : 2);
        state.showRuler && this.drawRuler();
    },

    drawLine(x1, y1, x2, y2, color, dash = [], width = 1) {
        const state = this.experimentState;
        state.ctx.beginPath();
        state.ctx.strokeStyle = color;
        state.ctx.lineWidth = width;
        state.ctx.setLineDash(dash);
        state.ctx.moveTo(x1, y1);
        state.ctx.lineTo(x2, y2);
        state.ctx.stroke();
        state.ctx.setLineDash([]);
    },

    drawLens(lens) {
        const state = this.experimentState;
        const { x: centerX, y: centerY, isConverging } = lens;
        const halfEdgeThickness = state.h0 / 2;
        const [leftCenter, rightCenter] = [centerX - halfEdgeThickness, centerX + halfEdgeThickness];
        
        state.ctx.beginPath();
        
        for (let side = 0; side < 2; side++) {
            const isLeft = side === 0;
            const center = isLeft ? leftCenter : rightCenter;
            const yStart = isLeft ? centerY - state.halfDiameter : centerY + state.halfDiameter;
            const yEnd = isLeft ? centerY + state.halfDiameter : centerY - state.halfDiameter;
            const yStep = isLeft ? 1 : -1;
            
            if (isLeft) state.ctx.moveTo(center, yStart);
            
            for (let y = yStart; isLeft ? y <= yEnd : y >= yEnd; y += yStep) {
                const dy = y - centerY;
                const dx = Math.sqrt(Math.max(0, state.adjustedR ** 2 - dy ** 2)) - 
                          Math.sqrt(state.adjustedR ** 2 - state.halfDiameter ** 2);
                const x = isConverging ? 
                    (isLeft ? center + dx : center - dx) : 
                    (isLeft ? center - dx : center + dx);
                state.ctx.lineTo(x, y);
            }
        }
        
        state.ctx.closePath();
        state.ctx.fillStyle = isConverging ? 'rgba(200, 220, 255, 0.7)' : 'rgba(255, 200, 200, 0.7)';
        state.ctx.fill();
        state.ctx.strokeStyle = '#000';
        state.ctx.lineWidth = 1;
        state.ctx.stroke();
        this.drawCircle(centerX, centerY, 3, 'black');
    },

    drawCircle(x, y, radius, color) {
        const state = this.experimentState;
        state.ctx.beginPath();
        state.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        state.ctx.fillStyle = color;
        state.ctx.fill();
    },

    calculateRefraction(rayDirX, rayDirY, normalX, normalY, n1, n2) {
        const rayLength = Math.sqrt(rayDirX ** 2 + rayDirY ** 2);
        const [rayNormX, rayNormY] = [rayDirX / rayLength, rayDirY / rayLength];
        const normalLength = Math.sqrt(normalX ** 2 + normalY ** 2);
        const [normX, normY] = [normalX / normalLength, normalY / normalLength];
        const cosTheta1 = -(rayNormX * normX + rayNormY * normY);
        const actualCosTheta1 = Math.abs(cosTheta1);
        const [actualNormX, actualNormY] = [cosTheta1 < 0 ? -normX : normX, cosTheta1 < 0 ? -normY : normY];
        const sinTheta1 = Math.sqrt(1 - actualCosTheta1 ** 2);
        const sinTheta2 = (n1 / n2) * sinTheta1;
        
        if (sinTheta2 > 1) return { x: rayNormX, y: rayNormY };
        
        const cosTheta2 = Math.sqrt(1 - sinTheta2 ** 2);
        const ratio = n1 / n2;
        return {
            x: ratio * rayNormX + (ratio * actualCosTheta1 - cosTheta2) * actualNormX,
            y: ratio * rayNormY + (ratio * actualCosTheta1 - cosTheta2) * actualNormY
        };
    },

    findLensSurfaceIntersection(lens, rayX, rayY, rayDirX, rayDirY, isLeftSurface) {
        const state = this.experimentState;
        const centerX = lens.x;
        const halfEdgeThickness = state.h0 / 2;
        const surfaceCenterX = isLeftSurface ? centerX - halfEdgeThickness : centerX + halfEdgeThickness;
        
        if (Math.abs(rayDirX) < 0.001) return null;
        
        const t = (surfaceCenterX - rayX) / rayDirX;
        if (t < 0) return null;
        
        const intersectionY = rayY + t * rayDirY;
        const dy = intersectionY - lens.y;
        
        if (Math.abs(dy) > state.halfDiameter) return null;
        
        const dx = Math.sqrt(Math.max(0, state.adjustedR ** 2 - dy ** 2)) - 
                  Math.sqrt(state.adjustedR ** 2 - state.halfDiameter ** 2);
        
        const actualX = lens.isConverging ?
            (isLeftSurface ? surfaceCenterX + dx : surfaceCenterX - dx) :
            (isLeftSurface ? surfaceCenterX - dx : surfaceCenterX + dx);
        
        return { x: actualX, y: intersectionY };
    },

    drawLightRays(lens) {
        const state = this.experimentState;
        const { x: centerX, y: centerY } = lens;
        const halfEdgeThickness = state.h0 / 2;
        const [leftCenter, rightCenter] = [centerX - halfEdgeThickness, centerX + halfEdgeThickness];
        
        const lensProps = this.getLensProperties(lens.isConverging);
        const lensN = lensProps.refractiveIndex;
        
        state.ctx.strokeStyle = 'red';
        state.ctx.lineWidth = 1;
        
        const [leftCurvatureCenter, rightCurvatureCenter] = lens.isConverging ?
            [leftCenter - state.adjustedR, rightCenter + state.adjustedR] :
            [leftCenter + state.adjustedR, rightCenter - state.adjustedR];
        
        let intersectionPointsX = [];
        const lensPointsLeft = [], lensPointsRight = [];
        
        for (let y = centerY - state.halfDiameter; y <= centerY + state.halfDiameter; y += 1) {
            const dy = y - centerY;
            const dx = Math.sqrt(Math.max(0, state.adjustedR ** 2 - dy ** 2)) - 
                     Math.sqrt(state.adjustedR ** 2 - state.halfDiameter ** 2);
            
            if (!lens.isConverging) {
                lensPointsLeft.push({x: leftCenter - dx, y});
                lensPointsRight.push({x: rightCenter + dx, y});
            } else {
                lensPointsLeft.push({x: leftCenter + dx, y});
                lensPointsRight.push({x: rightCenter - dx, y});
            }
        }
        
        const findExactIntersection = (rayX, rayY, rayDirX, rayDirY, isLeftSurface) => {
            const points = isLeftSurface ? lensPointsLeft : lensPointsRight;
            let [curX, curY, stepSize] = [rayX, rayY, 0.5];
            
            for (let i = 0; i < 1000; i++) {
                curX += rayDirX * stepSize;
                curY += rayDirY * stepSize;
                
                const closestPoint = points.reduce((closest, point) => {
                    const dist = Math.sqrt((curX - point.x) ** 2 + (curY - point.y) ** 2);
                    return !closest || dist < closest.dist ? {point, dist} : closest;
                }, null);
                
                if (closestPoint.dist < stepSize) return closestPoint.point;
                if (curX > state.canvas.width || curX < 0 || curY > state.canvas.height || curY < 0) break;
            }
            return {x: curX, y: curY};
        };
        
        for (let rayY = centerY - state.halfDiameter + 50; rayY <= centerY + state.halfDiameter - 50; rayY += 30) {
            const isCentralRay = Math.abs(rayY - centerY) < 15;
            const entryPoint = findExactIntersection(0, rayY, 1, 0, true);
            
            this.drawLine(0, rayY, entryPoint.x, entryPoint.y, 'red');
            
            if (isCentralRay) {
                this.drawLine(entryPoint.x, entryPoint.y, rightCenter, centerY, 'red');
                this.drawLine(rightCenter, centerY, state.screenX, centerY, 'red');
                continue;
            }
            
            const [entryNormalX, entryNormalY] = lens.isConverging ?
                [entryPoint.x - leftCurvatureCenter, entryPoint.y - centerY] :
                [leftCurvatureCenter - entryPoint.x, centerY - entryPoint.y];
            
            const refractedEntry = this.calculateRefraction(1, 0, entryNormalX, entryNormalY, 1.0, lensN);
            const exitPoint = findExactIntersection(entryPoint.x, entryPoint.y, refractedEntry.x, refractedEntry.y, false);
            
            this.drawLine(entryPoint.x, entryPoint.y, exitPoint.x, exitPoint.y, 'red');
            
            const [exitNormalX, exitNormalY] = lens.isConverging ?
                [exitPoint.x - rightCurvatureCenter, exitPoint.y - centerY] :
                [rightCurvatureCenter - exitPoint.x, centerY - exitPoint.y];
            
            const refractedExit = this.calculateRefraction(refractedEntry.x, refractedEntry.y, exitNormalX, exitNormalY, lensN, 1.0);
            
            const screenT = (state.screenX - exitPoint.x) / refractedExit.x;
            if (screenT > 0) {
                const screenY = exitPoint.y + screenT * refractedExit.y;
                this.drawLine(exitPoint.x, exitPoint.y, state.screenX, screenY, 'red');
                
                if (Math.abs(refractedExit.y) > 0.001) {
                    const intersectionX = exitPoint.x - refractedExit.x * (exitPoint.y - centerY) / refractedExit.y;
                    intersectionX > centerX && intersectionX < state.canvas.width && intersectionPointsX.push(intersectionX);
                }
            }
        }
        
        if (intersectionPointsX.length > 0) {
            const actualFocalX = intersectionPointsX.reduce((sum, x) => sum + x, 0) / intersectionPointsX.length;
            const actualFocalLength = actualFocalX - centerX;
            
            state.singleLensFocalPoint = { x: actualFocalX, y: centerY };
            
            this.drawCircle(actualFocalX, centerY, 6, 'rgba(0, 255, 0, 0.8)');
            state.ctx.strokeStyle = 'green';
            state.ctx.lineWidth = 2;
            state.ctx.stroke();
            
            this.drawLine(actualFocalX, centerY - 30, actualFocalX, centerY + 30, 'rgba(0, 150, 0, 0.6)', [3, 3]);
            
            window.actualF = actualFocalLength;
        }
    },

    drawLightRaysForBothLenses() {
        const state = this.experimentState;
        state.ctx.strokeStyle = 'red';
        state.ctx.lineWidth = 1;
        
        const centerY = state.convergingLens.y;
        const [leftLens, rightLens] = state.convergingLens.x < state.divergingLens.x ? 
            [state.convergingLens, state.divergingLens] : [state.divergingLens, state.convergingLens];
        
        const convergingProps = {
            focalLength: state.convergingFocus,
            refractiveIndex: state.n,
            adjustedR: state.adjustedR
        };
        
        const divergingProps = this.getLensProperties(false);
        const leftLensProps = leftLens === state.convergingLens ? convergingProps : divergingProps;
        const rightLensProps = rightLens === state.convergingLens ? convergingProps : divergingProps;
        
        let intersectionPointsX = [];
        
        const limitRayToCanvas = (startX, startY, dirX, dirY, maxDistance = state.canvas.width) => {
            let t = maxDistance;
            if (dirX > 0) t = Math.min(t, (state.canvas.width - startX) / dirX);
            if (dirY > 0) t = Math.min(t, (state.canvas.height - startY) / dirY);
            else if (dirY < 0) t = Math.min(t, -startY / dirY);
            return { x: startX + t * dirX, y: startY + t * dirY, withinBounds: t > 0 };
        };
        
        for (let rayY = centerY - state.halfDiameter + 50; rayY <= centerY + state.halfDiameter - 50; rayY += 30) {
            const isCentralRay = Math.abs(rayY - centerY) < 15;
            
            if (isCentralRay) {
                this.drawLine(0, rayY, leftLens.x, rayY, 'red');
                this.drawLine(leftLens.x, rayY, rightLens.x, rayY, 'red');
                this.drawLine(rightLens.x, rayY, Math.min(state.screenX, state.canvas.width), rayY, 'red');
                continue;
            }
            
            const entry1 = this.findLensSurfaceIntersection(leftLens, 0, rayY, 1, 0, true);
            if (!entry1) continue;
            
            this.drawLine(0, rayY, entry1.x, entry1.y, 'red');
            
            const halfEdgeThickness = state.h0 / 2;
            const leftCenter1 = leftLens.x - halfEdgeThickness;
            const rightCenter1 = leftLens.x + halfEdgeThickness;
            
            const [leftCurvatureCenter1, rightCurvatureCenter1] = leftLens.isConverging ?
                [leftCenter1 - state.adjustedR, rightCenter1 + state.adjustedR] :
                [leftCenter1 + state.adjustedR, rightCenter1 - state.adjustedR];
            
            const [entryNormal1X, entryNormal1Y] = leftLens.isConverging ?
                [entry1.x - leftCurvatureCenter1, entry1.y - centerY] :
                [leftCurvatureCenter1 - entry1.x, centerY - entry1.y];
            
            const refracted1Entry = this.calculateRefraction(1, 0, entryNormal1X, entryNormal1Y, 1.0, leftLensProps.refractiveIndex);
            const exit1 = this.findLensSurfaceIntersection(leftLens, entry1.x, entry1.y, refracted1Entry.x, refracted1Entry.y, false);
            if (!exit1) continue;
            
            this.drawLine(entry1.x, entry1.y, exit1.x, exit1.y, 'red');
            
            const [exitNormal1X, exitNormal1Y] = leftLens.isConverging ?
                [exit1.x - rightCurvatureCenter1, exit1.y - centerY] :
                [rightCurvatureCenter1 - exit1.x, centerY - exit1.y];
            
            const refracted1Exit = this.calculateRefraction(refracted1Entry.x, refracted1Entry.y, exitNormal1X, exitNormal1Y, leftLensProps.refractiveIndex, 1.0);
            const entry2 = this.findLensSurfaceIntersection(rightLens, exit1.x, exit1.y, refracted1Exit.x, refracted1Exit.y, true);
            
            if (!entry2) {
                const endPoint = limitRayToCanvas(exit1.x, exit1.y, refracted1Exit.x, refracted1Exit.y);
                if (endPoint.withinBounds) this.drawLine(exit1.x, exit1.y, endPoint.x, endPoint.y, 'red');
                continue;
            }
            
            this.drawLine(exit1.x, exit1.y, entry2.x, entry2.y, 'red');
            
            const leftCenter2 = rightLens.x - halfEdgeThickness;
            const rightCenter2 = rightLens.x + halfEdgeThickness;
            
            const [leftCurvatureCenter2, rightCurvatureCenter2] = rightLens.isConverging ?
                [leftCenter2 - state.adjustedR, rightCenter2 + state.adjustedR] :
                [leftCenter2 + state.adjustedR, rightCenter2 - state.adjustedR];
            
            const [entryNormal2X, entryNormal2Y] = rightLens.isConverging ?
                [entry2.x - leftCurvatureCenter2, entry2.y - centerY] :
                [leftCurvatureCenter2 - entry2.x, centerY - entry2.y];
            
            const refracted2Entry = this.calculateRefraction(refracted1Exit.x, refracted1Exit.y, entryNormal2X, entryNormal2Y, 1.0, rightLensProps.refractiveIndex);
            const exit2 = this.findLensSurfaceIntersection(rightLens, entry2.x, entry2.y, refracted2Entry.x, refracted2Entry.y, false);
            if (!exit2) continue;
            
            this.drawLine(entry2.x, entry2.y, exit2.x, exit2.y, 'red');
            
            const [exitNormal2X, exitNormal2Y] = rightLens.isConverging ?
                [exit2.x - rightCurvatureCenter2, exit2.y - centerY] :
                [rightCurvatureCenter2 - exit2.x, centerY - exit2.y];
            
            const refracted2Exit = this.calculateRefraction(refracted2Entry.x, refracted2Entry.y, exitNormal2X, exitNormal2Y, rightLensProps.refractiveIndex, 1.0);
            
            if (Math.abs(refracted2Exit.y) > 0.001) {
                const intersectionX = exit2.x - refracted2Exit.x * (exit2.y - centerY) / refracted2Exit.y;
                intersectionX > rightLens.x && intersectionX < state.canvas.width && intersectionPointsX.push(intersectionX);
            }
            
            const screenT = (state.screenX - exit2.x) / refracted2Exit.x;
            const endPoint = limitRayToCanvas(exit2.x, exit2.y, refracted2Exit.x, refracted2Exit.y, screenT);
            
            if (endPoint.withinBounds) this.drawLine(exit2.x, exit2.y, endPoint.x, endPoint.y, 'red');
        }
        
        if (intersectionPointsX.length > 0) {
            const systemFocalX = intersectionPointsX.reduce((sum, x) => sum + x, 0) / intersectionPointsX.length;
            const systemFocalLength = systemFocalX - rightLens.x;
            
            if (state.singleLensFocalPoint) {
                this.drawCircle(systemFocalX, centerY, 6, 'rgba(0, 255, 0, 0.8)');
                this.drawCircle(state.singleLensFocalPoint.x, centerY, 4, 'rgba(255, 255, 0, 0.8)');
            } else {
                this.drawCircle(systemFocalX, centerY, 6, 'rgba(0, 255, 0, 0.8)');
            }
            
            state.ctx.strokeStyle = 'green';
            state.ctx.lineWidth = 2;
            state.ctx.stroke();
            
            window.actualF = systemFocalLength;
            this.drawLine(systemFocalX, centerY - 30, systemFocalX, centerY + 30, 'rgba(0, 150, 0, 0.6)', [3, 3]);
        }
    },

    drawRuler() {
        const state = this.experimentState;
        const { x, y, width, height } = state.rulerPosition;
        
        state.ctx.fillStyle = '#f0f0f0';
        state.ctx.fillRect(x, y, width, height);
        state.ctx.strokeStyle = '#333';
        state.ctx.lineWidth = 2;
        state.ctx.strokeRect(x, y, width, height);
        state.ctx.strokeStyle = '#000';
        state.ctx.lineWidth = 1;
        state.ctx.font = '10px Arial';
        state.ctx.fillStyle = '#000';
        state.ctx.textAlign = 'center';
        
        const markSpacing = 10;
        const numMarks = Math.floor(width / markSpacing);
        
        for (let i = 0; i <= numMarks; i++) {
            const markX = x + i * markSpacing;
            const markHeight = i % 5 === 0 ? height * 0.6 : height * 0.3;
            
            state.ctx.beginPath();
            state.ctx.moveTo(markX, y + height - markHeight);
            state.ctx.lineTo(markX, y + height);
            state.ctx.stroke();
        }
        
        this.checkRulerIntersections();
    },

    checkRulerIntersections() {
        const state = this.experimentState;
        const { x: rulerX, y: rulerY, width, height } = state.rulerPosition;
        const rulerCenterY = rulerY + height / 2;
        
        const importantPoints = [];
        
        importantPoints.push({
            x: state.convergingLens.x,
            y: state.convergingLens.y,
            label: 'Собирающая линза',
            color: '#0066cc'
        });
        
        if (state.showBothLenses) {
            importantPoints.push({
                x: state.divergingLens.x,
                y: state.divergingLens.y,
                label: 'Рассеивающая линза',
                color: '#cc6600'
            });
        }
        
        if (!state.showBothLenses && state.storedOneLensDistance > 0) {
            importantPoints.push({
                x: state.screenX,
                y: state.convergingLens.y,
                label: 'Экран',
                value: `d = ${state.storedOneLensDistance.toFixed(1)}`,
                measurementType: 'd',
                color: '#000088'
            });
        }
        
        if (state.showBothLenses && state.singleLensFocalPoint) {
            const real_f_distance = Math.abs(state.singleLensFocalPoint.x - state.divergingLens.x);
            const F = state.convergingFocus;
            const f = real_f_distance;
            const calculated_d = (F * f) / (F - f);
            
            importantPoints.push({
                x: state.singleLensFocalPoint.x,
                y: state.singleLensFocalPoint.y,
                label: 'Фокус одной линзы (желтая точка)',
                value: `f = ${f.toFixed(1)}`,
                measurementType: 'f',
                color: '#ffaa00'
            });
            
            if (window.actualF !== undefined) {
                const rightLens = state.convergingLens.x > state.divergingLens.x ? state.convergingLens : state.divergingLens;
                const systemFocalX = rightLens.x + window.actualF;
                
                if (systemFocalX > 0 && systemFocalX < state.canvas.width) {
                    importantPoints.push({
                        x: systemFocalX,
                        y: state.convergingLens.y,
                        label: 'Фокус системы',
                        value: `d = ${Math.abs(calculated_d).toFixed(1)}`,
                        measurementType: 'd',
                        color: '#00aa00'
                    });
                }
            }
        }
        
        const tolerance = 25;
        const intersections = [];
        
        for (const point of importantPoints) {
            if (point.x >= rulerX - tolerance && point.x <= rulerX + width + tolerance &&
                Math.abs(point.y - rulerCenterY) <= tolerance + height / 2) {
                intersections.push(point);
            }
        }
        
        state.ctx.font = '12px Arial';
        state.ctx.textAlign = 'center';
        
        intersections.forEach((intersection, index) => {
            const labelY = rulerY - 20 - (index * 30);
            
            if (!intersection.value || !intersection.measurementType) return;
            
            const displayText = intersection.value;
            const textWidth = state.ctx.measureText(displayText).width;
            
            state.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            state.ctx.fillRect(intersection.x - textWidth/2 - 8, labelY - 18, textWidth + 16, 24);
            state.ctx.strokeStyle = intersection.color;
            state.ctx.lineWidth = 2;
            state.ctx.strokeRect(intersection.x - textWidth/2 - 8, labelY - 18, textWidth + 16, 24);
            state.ctx.fillStyle = intersection.color;
            state.ctx.font = 'bold 14px Arial';
            state.ctx.fillText(displayText, intersection.x, labelY - 2);
            state.ctx.strokeStyle = intersection.color;
            state.ctx.lineWidth = 3;
            state.ctx.setLineDash([5, 5]);
            state.ctx.beginPath();
            state.ctx.moveTo(intersection.x, intersection.y);
            state.ctx.lineTo(intersection.x, rulerY);
            state.ctx.stroke();
            state.ctx.setLineDash([]);
            state.ctx.font = '12px Arial';
        });
    },

    checkMeasurementInputs() {
        const state = this.experimentState;
    
        if(!state.showBothLenses) return;
        
        this.updateMeasurementDisplay();
        
        const real_f_distance = Math.abs(state.singleLensFocalPoint.x - state.divergingLens.x);
        const real_d_distance = 1/(1/real_f_distance - 1/state.convergingFocus);
        const correctOneLens = real_d_distance;
        const correctTwoLens = real_f_distance;
        const correctFocus = state.convergingFocus;

        console.log(`Correct values: One Lens = ${correctOneLens}, Two Lenses = ${correctTwoLens}, Focus = ${correctFocus}`);
        
        let userOneLens = parseFloat(document.getElementById('user-one-lens').value) || 0;
        let userTwoLens = parseFloat(document.getElementById('user-two-lens').value) || 0;
        let userFocus = parseFloat(document.getElementById('user-focus-distance').value) || 0;
    
        userOneLens = Math.abs(correctTwoLens - userOneLens);
        userTwoLens = Math.abs(correctOneLens - userTwoLens);
        userFocus = Math.abs(correctFocus - userFocus);
    
        this.checkValue(userOneLens, document.getElementById('one-lens-check'));
        this.checkValue(userTwoLens, document.getElementById('two-lens-check'));
        this.checkValue(userFocus, document.getElementById('focus-distance-check'));
    },

    updateMeasurementDisplay() {
        const state = this.experimentState;
        
        if (state.showBothLenses) {
            const rightLens = state.convergingLens.x > state.divergingLens.x ? state.convergingLens : state.divergingLens;
            state.measuredFocus = Math.abs(state.screenX - rightLens.x);
            state.storedTwoLensDistance = state.measuredFocus;
        } else {
            state.measuredFocus = Math.abs(state.screenX - state.convergingLens.x);
            state.storedOneLensDistance = state.measuredFocus;
        }
        
        if (state.storedOneLensDistance === 0 && !state.showBothLenses)
            state.storedOneLensDistance = state.measuredFocus;
        if (state.storedTwoLensDistance === 0 && state.showBothLenses)
            state.storedTwoLensDistance = state.measuredFocus;
    }
};

export default experimentFunctions;