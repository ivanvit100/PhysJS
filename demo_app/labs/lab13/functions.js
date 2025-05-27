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
        H: 120, D: 250, h0: 70, n: 1.5,
        lockLensMovement: true,
        convergingFocus: 200, divergingFocus: -300,
        showBothLenses: false, convergingLens: null, divergingLens: null,
        screenX: 600, calculatedResults: {}, showCaliper: false,
        caliperPosition: { x1: 200, y1: 150, x2: 300, y2: 150 },
        isDraggingScreen: false, isDraggingCaliper: false, isDraggingCaliperPoint: false,
        isDraggingLens: false, draggingLensType: null, draggingCaliperPointIndex: null,
        dragStartX: 0, dragStartY: 0, initialScreenX: 0, measuredFocus: 0, animationFrameId: null,
        storedOneLensDistance: 0, storedTwoLensDistance: 0,
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
        this.experimentState.convergingLens = { x: 200, y: canvas.height / 2, isConverging: false };
        this.experimentState.divergingLens = { x: 400, y: canvas.height / 2, isConverging: true };
        
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

    getLensProperties(isConverging) {
        const state = this.experimentState;
        const focalLength = isConverging ? state.convergingFocus : state.divergingFocus;
        const halfDiam = state.D / 2;
        const bulge = (state.H - state.h0) / 2;
        const adjR = (halfDiam * halfDiam + bulge * bulge) / (2 * bulge);
        const requiredN = (adjR / (2 * Math.abs(focalLength))) + 1;
        
        return {
            focalLength: focalLength,
            refractiveIndex: requiredN,
            adjustedR: adjR
        };
    },

    toggleBothLenses() {
        const state = experimentFunctions.experimentState;
        
        !state.showBothLenses ?
            state.storedOneLensDistance = state.measuredFocus :
            state.storedTwoLensDistance = state.measuredFocus;
        
        state.showBothLenses = !state.showBothLenses;
        state.toggleLensTypeButton.textContent = state.showBothLenses ? 'Одна линза' : 'Обе линзы';
        
        if (state.showBothLenses) {
            state.divergingLens.x = state.convergingLens.x + 250;
            state.screenX = state.divergingLens.x + 250;
        } else {
            state.convergingLens.x = 250;
            state.screenX = state.convergingLens.x + state.F * 1.2;
        }
        
        experimentFunctions.updateMeasurementDisplay();
        experimentFunctions.drawSimulation();
    },

    toggleCaliper() {
        const state = experimentFunctions.experimentState;
        state.showCaliper = !state.showCaliper;
        if (state.showCaliper) {
            state.caliperPosition = {
                x1: state.canvas.width / 2 - 50, y1: state.canvas.height / 2,
                x2: state.canvas.width / 2 + 50, y2: state.canvas.height / 2
            };
        }
        experimentFunctions.drawSimulation();
    },

    resetMeasurements() {
        const state = this.experimentState;
        Object.assign(state, {
            calculatedResults: {}, showBothLenses: false, measuredFocus: 0,
            screenX: 250 + state.F * 1.2, storedOneLensDistance: 0, storedTwoLensDistance: 0
        });
        state.resultsBody && (state.resultsBody.innerHTML = '');
        state.toggleLensTypeButton.textContent = 'Обе линзы';
        state.convergingLens.x = 250;
        state.divergingLens.x = 400;
        
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

    isPointInsideCaliper(px, py) {
        const state = this.experimentState;
        const { x1, y1, x2, y2 } = state.caliperPosition;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const [midX, midY] = [(x1 + x2) / 2, (y1 + y2) / 2];
        const [cosA, sinA] = [Math.cos(-angle), Math.sin(-angle)];
        const rotatedX = cosA * (px - midX) - sinA * (py - midY) + midX;
        const rotatedY = sinA * (px - midX) + cosA * (py - midY) + midY;
        return rotatedX >= midX - distance/2 - 10 && rotatedX <= midX + distance/2 + 10 &&
               rotatedY >= midY - 30 && rotatedY <= midY + 30;
    },

    handleMouseDown(event) {
        const state = this.experimentState;
        const { x: mouseX, y: mouseY } = this.getMousePos(event);
        
        if (Math.abs(mouseX - state.screenX) < 10) {
            Object.assign(state, { isDraggingScreen: true, dragStartX: mouseX, initialScreenX: state.screenX });
        } else if (state.showCaliper) {
            if (this.isPointInside(mouseX, mouseY, state.caliperPosition.x1, state.caliperPosition.y1, 10))
                Object.assign(state, { isDraggingCaliperPoint: true, draggingCaliperPointIndex: 1 });
            else if (this.isPointInside(mouseX, mouseY, state.caliperPosition.x2, state.caliperPosition.y2, 10))
                Object.assign(state, { isDraggingCaliperPoint: true, draggingCaliperPointIndex: 2 });
            else if (this.isPointInsideCaliper(mouseX, mouseY))
                Object.assign(state, { isDraggingCaliper: true, dragStartX: mouseX, dragStartY: mouseY });
        } else if (this.isPointInsideLens(mouseX, mouseY, state.convergingLens) && !(state.showBothLenses && state.lockLensMovement))
            Object.assign(state, { isDraggingLens: true, draggingLensType: 'converging', dragStartX: mouseX });
        else if (state.showBothLenses && this.isPointInsideLens(mouseX, mouseY, state.divergingLens) && !state.lockLensMovement)
            Object.assign(state, { isDraggingLens: true, draggingLensType: 'diverging', dragStartX: mouseX });
        
        state.isDraggingScreen || state.isDraggingCaliper || state.isDraggingCaliperPoint || state.isDraggingLens && state.canvas.classList.add('dragging');
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
            const lens = state.draggingLensType === 'converging' ? state.convergingLens : state.divergingLens;
            lens.x = Math.max(50, Math.min(state.canvas.width - 150, lens.x + deltaX));
            state.dragStartX = mouseX;
            needsRedraw = true;
        } else if (state.isDraggingCaliperPoint) {
            const point = state.draggingCaliperPointIndex === 1 ? 'x1' : 'x2';
            const pointY = state.draggingCaliperPointIndex === 1 ? 'y1' : 'y2';
            state.caliperPosition[point] = mouseX;
            state.caliperPosition[pointY] = mouseY;
            needsRedraw = true;
        } else if (state.isDraggingCaliper) {
            const [deltaX, deltaY] = [mouseX - state.dragStartX, mouseY - state.dragStartY];
            ['x1', 'y1', 'x2', 'y2'].forEach(coord => {
                state.caliperPosition[coord] += coord.includes('x') ? deltaX : deltaY;
            });
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
            isDraggingScreen: false, isDraggingCaliper: false, isDraggingCaliperPoint: false,
            isDraggingLens: false, draggingLensType: null
        });
        state.animationFrameId && cancelAnimationFrame(state.animationFrameId);
        this.drawSimulation();
    },

    checkValue(userValue, actualValue, tolerance, checkElement) {
        if (!checkElement) return;
        
        const isCorrect = Math.abs(userValue - actualValue) <= tolerance;
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
        state.showCaliper && this.drawCaliper();
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
        
        for (let rayY = centerY - state.halfDiameter + 20; rayY <= centerY + state.halfDiameter - 20; rayY += 30) {
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
                    const intersectionX = lens.isConverging ?
                        exitPoint.x - refractedExit.x * (exitPoint.y - centerY) / refractedExit.y :
                        exitPoint.x + refractedExit.x * (exitPoint.y - centerY) / refractedExit.y;
                    
                    if ((lens.isConverging && intersectionX > centerX && intersectionX < state.canvas.width) ||
                        (!lens.isConverging && intersectionX > 0 && intersectionX < centerX))
                        intersectionPointsX.push(intersectionX);
                }
            }
        }
    },

    drawLightRaysForBothLenses() {
        const state = this.experimentState;
        state.ctx.strokeStyle = 'red';
        state.ctx.lineWidth = 1;
        
        const centerY = state.convergingLens.y;
        const [leftLens, rightLens] = state.convergingLens.x < state.divergingLens.x ? 
            [state.convergingLens, state.divergingLens] : [state.divergingLens, state.convergingLens];
        
        const leftLensProps = this.getLensProperties(leftLens.isConverging);
        const rightLensProps = this.getLensProperties(rightLens.isConverging);
        
        let intersectionPointsX = [];
        
        const limitRayToCanvas = (startX, startY, dirX, dirY, maxDistance = state.canvas.width) => {
            let t = maxDistance;
            if (dirX > 0) t = Math.min(t, (state.canvas.width - startX) / dirX);
            if (dirY > 0) t = Math.min(t, (state.canvas.height - startY) / dirY);
            else if (dirY < 0) t = Math.min(t, -startY / dirY);
            return { x: startX + t * dirX, y: startY + t * dirY, withinBounds: t > 0 };
        };
        
        for (let rayY = centerY - state.halfDiameter + 20; rayY <= centerY + state.halfDiameter - 20; rayY += 30) {
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
                if (intersectionX > rightLens.x && intersectionX < state.canvas.width) {
                    intersectionPointsX.push(intersectionX);
                }
            }
            
            const screenT = (state.screenX - exit2.x) / refracted2Exit.x;
            const endPoint = limitRayToCanvas(exit2.x, exit2.y, refracted2Exit.x, refracted2Exit.y, screenT);
            
            if (endPoint.withinBounds) this.drawLine(exit2.x, exit2.y, endPoint.x, endPoint.y, 'red');
        }
        
        if (intersectionPointsX.length > 0) {
            const measuredFocalX = intersectionPointsX.reduce((sum, x) => sum + x, 0) / intersectionPointsX.length;
            const systemFocalLength = measuredFocalX - rightLens.x;
            
            this.drawCircle(measuredFocalX, centerY, 6, 'rgba(0, 255, 0, 0.8)');
            state.ctx.strokeStyle = 'green';
            state.ctx.lineWidth = 2;
            state.ctx.stroke();
            
            window.actualF = systemFocalLength;
            this.drawLine(measuredFocalX, centerY - 30, measuredFocalX, centerY + 30, 'rgba(0, 150, 0, 0.6)', [3, 3]);
        }
        
        const rightTheoreticalFocalX = rightLens.isConverging ? 
            rightLens.x + Math.abs(rightLensProps.focalLength) : 
            rightLens.x - Math.abs(rightLensProps.focalLength);
        
        if (rightTheoreticalFocalX > 0 && rightTheoreticalFocalX < state.canvas.width) {
            this.drawCircle(rightTheoreticalFocalX, centerY, 6, 'blue');
            state.ctx.strokeStyle = '#0000FF';
            state.ctx.lineWidth = 2;
            state.ctx.stroke();
            
            this.drawLine(rightTheoreticalFocalX, centerY - 25, rightTheoreticalFocalX, centerY + 25, 'blue', [2, 2]);
        }
    },

    drawCaliper() {
        const state = this.experimentState;
        const { x1, y1, x2, y2 } = state.caliperPosition;
        const [angle, distance, midX, midY] = [
            Math.atan2(y2 - y1, x2 - x1),
            Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
            (x1 + x2) / 2,
            (y1 + y2) / 2
        ];
        
        state.ctx.save();
        state.ctx.translate(midX, midY);
        state.ctx.rotate(angle);
        
        const caliperHeight = 30;
        
        ['#d1d1d1', '#808080'].forEach((color, i) => {
            state.ctx[i ? 'strokeStyle' : 'fillStyle'] = color;
            state.ctx[i ? 'strokeRect' : 'fillRect'](-distance/2, -caliperHeight/2, distance, caliperHeight);
        });
        
        state.ctx.fillStyle = '#808080';
        [[-distance/2 - 5, distance/2]].forEach(([left, right]) => {
            state.ctx.fillRect(left, -caliperHeight/2 - 20, 5, caliperHeight + 40);
            state.ctx.fillRect(right, -caliperHeight/2 - 20, 5, caliperHeight + 40);
        });
        
        state.ctx.fillStyle = '#000';
        const markCount = Math.floor(distance / 10);
        for (let i = 0; i <= markCount; i++) {
            const x = -distance/2 + i * 10;
            const height = i % 10 === 0 ? 15 : 10;
            state.ctx.fillRect(x, -caliperHeight/2, 1, height);
            
            if (i % 10 === 0) {
                state.ctx.save();
                state.ctx.translate(x, -caliperHeight/2 - 5);
                state.ctx.rotate(-angle);
                state.ctx.font = '8px Arial';
                state.ctx.textAlign = 'center';
                state.ctx.fillText((i * 10).toString(), 0, 0);
                state.ctx.restore();
            }
        }
        
        state.ctx.fillStyle = '#b8b8b8';
        state.ctx.fillRect(-distance/2, caliperHeight/2 - 10, 20, 10);
        state.ctx.save();
        state.ctx.translate(0, caliperHeight/2 + 15);
        state.ctx.rotate(-angle);
        
        ['white', 'black'].forEach((color, i) => {
            state.ctx[i ? 'strokeStyle' : 'fillStyle'] = color;
            state.ctx[i ? 'strokeRect' : 'fillRect'](-40, -10, 80, 20);
        });
        
        state.ctx.fillStyle = 'black';
        state.ctx.font = '12px Arial';
        state.ctx.textAlign = 'center';
        state.ctx.fillText(`${distance.toFixed(1)} пикс`, 0, 5);
        state.ctx.restore();
        state.ctx.restore();
        
        this.drawDragPoint(x1, y1, '#FF4444');
        this.drawDragPoint(x2, y2, '#4444FF');
    },

    drawDragPoint(x, y, color) {
        this.drawCircle(x, y, 8, color);
        const state = this.experimentState;
        state.ctx.strokeStyle = '#000';
        state.ctx.lineWidth = 2;
        state.ctx.stroke();
    },

    checkMeasurementInputs() {
        const state = this.experimentState;
        this.updateMeasurementDisplay();
        
        const oneLensDistance = state.storedOneLensDistance || 0;
        const twoLensDistance = state.storedTwoLensDistance || 0;
        const currentOneLens = state.showBothLenses ? oneLensDistance : (oneLensDistance || state.measuredFocus);
        const currentTwoLens = state.showBothLenses ? (twoLensDistance || state.measuredFocus) : twoLensDistance;
        
        let calculatedFocus = 0;
        if (currentOneLens > 0 && currentTwoLens > 0)
            calculatedFocus = this.calculateDivergingLensFocus(currentOneLens, currentTwoLens);
        
        const userOneLens = parseFloat(document.getElementById('user-one-lens').value) || 0;
        const userTwoLens = parseFloat(document.getElementById('user-two-lens').value) || 0;
        const userFocus = parseFloat(document.getElementById('user-focus-distance').value) || 0;
    
        console.log('Correct values:', { 
            oneLens: currentOneLens, 
            twoLens: currentTwoLens, 
            focus: Math.abs(calculatedFocus) 
        });
    
        this.checkValue(userOneLens, currentOneLens, 10, document.getElementById('one-lens-check'));
        this.checkValue(userTwoLens, currentTwoLens, 10, document.getElementById('two-lens-check'));
        calculatedFocus !== 0 ?
            this.checkValue(userFocus, Math.abs(calculatedFocus), 10, document.getElementById('focus-distance-check')) :
            this.checkValue(userFocus, -999, 10, document.getElementById('focus-distance-check'));
    },

    calculateDivergingLensFocus(f, d) {
        if (f === 0 || d === 0 || d === f) return 0;
        return (f * d) / (d - f);
    },

    updateMeasurementDisplay() {
        const state = this.experimentState;
        
        if (state.showBothLenses) {
            const rightLens = state.convergingLens.x > state.divergingLens.x ? state.convergingLens : state.divergingLens;
            state.measuredFocus = Math.abs(state.screenX - rightLens.x);
        } else {
            state.measuredFocus = Math.abs(state.screenX - state.convergingLens.x);
        }
        
        state.currentOneLensDistance = state.showBothLenses ? 0 : state.measuredFocus;
        state.currentTwoLensDistance = state.showBothLenses ? state.measuredFocus : 0;
        state.currentCalculatedFocus = this.calculateDivergingLensFocus(
            state.currentOneLensDistance, 
            state.currentTwoLensDistance
        );
    },
};

export default experimentFunctions;