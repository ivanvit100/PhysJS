const experimentFunctions = {
    experimentState: {
        canvas: document.getElementById('simulationCanvas'),
        ctx: document.getElementById('simulationCanvas').getContext('2d'),
        resultsBody: document.getElementById('results-body'),
        toggleLensTypeButton: document.getElementById('toggle-lens-type'),
        userThicknessInput: document.getElementById('user-thickness'),
        userDiameterInput: document.getElementById('user-diameter'),
        userEdgeThicknessInput: document.getElementById('user-edge-thickness'),
        userFocusInput: document.getElementById('user-focus'),
        userRadiusInput: document.getElementById('user-radius'),
        userRefractiveIndexInput: document.getElementById('user-refractive-index'),
        thicknessCheck: document.getElementById('thickness-check'),
        diameterCheck: document.getElementById('diameter-check'),
        edgeThicknessCheck: document.getElementById('edge-thickness-check'),
        focusCheck: document.getElementById('focus-check'),
        radiusCheck: document.getElementById('radius-check'),
        refractiveIndexCheck: document.getElementById('refractive-index-check'),
    
        H: 120,
        D: 250,
        h0: 70,
        n: 1.5,
        
        showBothLenses: false,
        convergingLens: null,
        divergingLens: null,
        
        screenX: 600,
        calculatedResults: {},
    
        showCaliper: false,
        caliperPosition: { x1: 200, y1: 150, x2: 300, y2: 150 },
        isDraggingScreen: false,
        isDraggingCaliper: false,
        isDraggingCaliperPoint: false,
        isDraggingLens: false,
        draggingLensType: null,
        draggingCaliperPointIndex: null,
        dragStartX: 0,
        dragStartY: 0,
        initialScreenX: 0,
        measuredFocus: 0,
        animationFrameId: null,

        get R() { return ((this.D * this.D / 4) + Math.pow(this.H - this.h0, 2)) / (2 * (this.H - this.h0)); },
        get bulgeAtCenter() { return (this.H - this.h0) / 2; },
        get halfDiameter() { return this.D / 2; },
        get adjustedR() { return (this.halfDiameter * this.halfDiameter + this.bulgeAtCenter * this.bulgeAtCenter) / (2 * this.bulgeAtCenter); },
        get F() { return this.adjustedR / (2 * (this.n - 1)); }
    },

    init() {
        const canvas = this.experimentState.canvas;
        // Меняем флаги местами
        this.experimentState.convergingLens = {
            x: 200,
            y: canvas.height / 2,
            isConverging: false  // Меняем на false
        };
        this.experimentState.divergingLens = {
            x: 400,
            y: canvas.height / 2,
            isConverging: true   // Меняем на true
        };
        
        this.drawSimulation();
        
        this.experimentState.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.experimentState.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.experimentState.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    },

    toggleBothLenses() {
        const state = experimentFunctions.experimentState;
        
        state.showBothLenses = !state.showBothLenses;
        state.toggleLensTypeButton.textContent = state.showBothLenses ? 'Одна линза' : 'Обе линзы';
        
        if (state.showBothLenses) {
            state.convergingLens.x = 200;
            state.divergingLens.x = 400;
            state.screenX = 650;
        } else {
            state.convergingLens.x = 250;
            state.screenX = state.convergingLens.x + state.F * 1.2;
        }
        
        experimentFunctions.drawSimulation();
    },

    toggleCaliper() {
        const state = experimentFunctions.experimentState;
        state.showCaliper = !state.showCaliper;
        if (state.showCaliper) {
            state.caliperPosition = {
                x1: state.canvas.width / 2 - 50,
                y1: state.canvas.height / 2,
                x2: state.canvas.width / 2 + 50,
                y2: state.canvas.height / 2
            };
        }
        experimentFunctions.drawSimulation();
    },

    resetMeasurements() {
        const state = this.experimentState;
        state.calculatedResults = {};
        state.resultsBody.innerHTML = '';
        
        state.showBothLenses = false;
        state.toggleLensTypeButton.textContent = 'Обе линзы';
        
        state.convergingLens.x = 250;
        state.divergingLens.x = 400;
        state.screenX = state.convergingLens.x + state.F * 1.2;
        state.measuredFocus = 0;
        
        state.userThicknessInput.value = '';
        state.userDiameterInput.value = '';
        state.userEdgeThicknessInput.value = '';
        state.userFocusInput.value = '';
        state.userRadiusInput.value = '';
        state.userRefractiveIndexInput.value = '';

        state.thicknessCheck.className = 'check-mark';
        state.diameterCheck.className = 'check-mark';
        state.edgeThicknessCheck.className = 'check-mark';
        state.focusCheck.className = 'check-mark';
        state.radiusCheck.className = 'check-mark';
        state.refractiveIndexCheck.className = 'check-mark';
        
        this.drawSimulation();
    },

    handleMouseDown(event) {
        const state = this.experimentState;
        const rect = state.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        if (Math.abs(mouseX - state.screenX) < 10) {
            state.isDraggingScreen = true;
            state.dragStartX = mouseX;
            state.initialScreenX = state.screenX;
            state.canvas.classList.add('dragging');
            return;
        }
        
        if (state.showCaliper) {
            if (this.isPointInside(mouseX, mouseY, state.caliperPosition.x1, state.caliperPosition.y1, 10)) {
                state.isDraggingCaliperPoint = true;
                state.draggingCaliperPointIndex = 1;
                state.canvas.classList.add('dragging');
                return;
            }
            
            if (this.isPointInside(mouseX, mouseY, state.caliperPosition.x2, state.caliperPosition.y2, 10)) {
                state.isDraggingCaliperPoint = true;
                state.draggingCaliperPointIndex = 2;
                state.canvas.classList.add('dragging');
                return;
            }
            
            if (this.isPointInsideCaliper(mouseX, mouseY)) {
                state.isDraggingCaliper = true;
                state.dragStartX = mouseX;
                state.dragStartY = mouseY;
                state.canvas.classList.add('dragging');
                return;
            }
        }
        
        if (this.isPointInsideLens(mouseX, mouseY, state.convergingLens)) {
            state.isDraggingLens = true;
            state.draggingLensType = 'converging';
            state.dragStartX = mouseX;
            state.canvas.classList.add('dragging');
            return;
        }
        
        if (state.showBothLenses && this.isPointInsideLens(mouseX, mouseY, state.divergingLens)) {
            state.isDraggingLens = true;
            state.draggingLensType = 'diverging';
            state.dragStartX = mouseX;
            state.canvas.classList.add('dragging');
            return;
        }
    },

    handleMouseMove(event) {
        const state = this.experimentState;
        const rect = state.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
    
        let needsRedraw = false;
    
        if (state.isDraggingScreen) {
            const deltaX = mouseX - state.dragStartX;
            state.screenX = Math.max(100, Math.min(state.canvas.width - 10, state.initialScreenX + deltaX));
            state.measuredFocus = state.screenX - state.convergingLens.x;
            needsRedraw = true;
        }
        
        if (state.isDraggingLens) {
            const deltaX = mouseX - state.dragStartX;
            if (state.draggingLensType === 'converging') {
                state.convergingLens.x = Math.max(50, Math.min(state.canvas.width - 150, state.convergingLens.x + deltaX));
            } else if (state.draggingLensType === 'diverging') {
                state.divergingLens.x = Math.max(50, Math.min(state.canvas.width - 150, state.divergingLens.x + deltaX));
            }
            state.dragStartX = mouseX;
            needsRedraw = true;
        }
        
        if (state.isDraggingCaliperPoint) {
            if (state.draggingCaliperPointIndex === 1) {
                state.caliperPosition.x1 = mouseX;
                state.caliperPosition.y1 = mouseY;
            } else {
                state.caliperPosition.x2 = mouseX;
                state.caliperPosition.y2 = mouseY;
            }
            needsRedraw = true;
        }
        
        if (state.isDraggingCaliper) {
            const deltaX = mouseX - state.dragStartX;
            const deltaY = mouseY - state.dragStartY;
            
            state.caliperPosition.x1 += deltaX;
            state.caliperPosition.y1 += deltaY;
            state.caliperPosition.x2 += deltaX;
            state.caliperPosition.y2 += deltaY;
            
            state.dragStartX = mouseX;
            state.dragStartY = mouseY;
            
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
        state.isDraggingScreen = false;
        state.isDraggingCaliper = false;
        state.isDraggingCaliperPoint = false;
        state.isDraggingLens = false;
        state.draggingLensType = null;

        state.animationFrameId && cancelAnimationFrame(state.animationFrameId);
        this.drawSimulation();
    },

    isPointInside(px, py, x, y, radius) {
        return Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2)) <= radius;
    },
    
    isPointInsideLens(px, py, lens) {
        const state = this.experimentState;
        const distance = Math.sqrt(Math.pow(px - lens.x, 2) + Math.pow(py - lens.y, 2));
        return distance <= state.halfDiameter + 20;
    },

    isPointInsideCaliper(px, py) {
        const state = this.experimentState;
        const angle = Math.atan2(state.caliperPosition.y2 - state.caliperPosition.y1, 
                                state.caliperPosition.x2 - state.caliperPosition.x1);
        
        const distance = Math.sqrt(
            Math.pow(state.caliperPosition.x2 - state.caliperPosition.x1, 2) + 
            Math.pow(state.caliperPosition.y2 - state.caliperPosition.y1, 2)
        );
        
        const midX = (state.caliperPosition.x1 + state.caliperPosition.x2) / 2;
        const midY = (state.caliperPosition.y1 + state.caliperPosition.y2) / 2;
        
        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);
        
        const rotatedX = cosA * (px - midX) - sinA * (py - midY) + midX;
        const rotatedY = sinA * (px - midX) + cosA * (py - midY) + midY;
        
        return (
            rotatedX >= midX - distance/2 - 10 &&
            rotatedX <= midX + distance/2 + 10 &&
            rotatedY >= midY - 40/2 - 10 &&
            rotatedY <= midY + 40/2 + 10
        );
    },

    checkMeasurements() {
        const state = experimentFunctions.experimentState;
        const tolerance = 8;
        const nTolerance = 0.05;
        const FTolerance = 10;
        
        const userThickness = parseFloat(state.userThicknessInput.value) || 0;
        const userDiameter = parseFloat(state.userDiameterInput.value) || 0;
        const userEdgeThickness = parseFloat(state.userEdgeThicknessInput.value) || 0;
        const userFocus = parseFloat(state.userFocusInput.value) || 0;
        const userR = parseFloat(state.userRadiusInput.value) || 0;
        const userN = parseFloat(state.userRefractiveIndexInput.value) || 0;
        
        experimentFunctions.checkValue(userThickness, state.H, tolerance, state.thicknessCheck);
        experimentFunctions.checkValue(userDiameter, state.D, tolerance, state.diameterCheck);
        experimentFunctions.checkValue(userEdgeThickness, state.h0, tolerance, state.edgeThicknessCheck);
        experimentFunctions.checkValue(userFocus, state.F, FTolerance, state.focusCheck);
        experimentFunctions.checkValue(userR, state.R, tolerance, state.radiusCheck);
        experimentFunctions.checkValue(userN, state.n, nTolerance, state.refractiveIndexCheck);
    },

    checkValue(userValue, actualValue, tolerance, checkElement) {
        if (Math.abs(userValue - actualValue) <= tolerance) {
            checkElement.className = 'check-mark correct';
            return true;
        } else {
            checkElement.className = 'check-mark incorrect';
            return false;
        }
    },

    drawSimulation() {
        const state = this.experimentState;
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        state.ctx.beginPath();
        state.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        state.ctx.setLineDash([5, 5]);
        state.ctx.moveTo(0, state.convergingLens.y);
        state.ctx.lineTo(state.canvas.width, state.convergingLens.y);
        state.ctx.stroke();
        state.ctx.setLineDash([]);
    
        if (state.showBothLenses) {
            this.drawLens(state.convergingLens);
            this.drawLens(state.divergingLens);
            this.drawLightRaysForBothLenses();
        } else {
            // В режиме одной линзы показываем собирающую (которая теперь convergingLens с isConverging: false)
            this.drawLens(state.convergingLens);
            this.drawLightRays(state.convergingLens);
        }
        
        state.ctx.beginPath();
        state.ctx.strokeStyle = '#00008B';
        state.ctx.lineWidth = state.isDraggingScreen ? 4 : 2;
        state.ctx.moveTo(state.screenX, 50);
        state.ctx.lineTo(state.screenX, state.canvas.height - 50);
        state.ctx.stroke();
        
        state.showCaliper && this.drawCaliper();
    },

    drawLens(lens) {
        const state = this.experimentState;
        const halfEdgeThickness = state.h0 / 2;
        const centerX = lens.x;
        const centerY = lens.y;
        const leftCenter = centerX - halfEdgeThickness;
        const rightCenter = centerX + halfEdgeThickness;
        
        state.ctx.beginPath();
    
        if (!lens.isConverging) {
            state.ctx.moveTo(leftCenter, centerY - state.halfDiameter);
            for (let y = centerY - state.halfDiameter; y <= centerY + state.halfDiameter; y++) {
                const dy = y - centerY;
                const dx = Math.sqrt(Math.max(0, state.adjustedR * state.adjustedR - dy * dy)) - Math.sqrt(state.adjustedR * state.adjustedR - state.halfDiameter * state.halfDiameter);
                state.ctx.lineTo(leftCenter - dx, y);
            }
            
            for (let y = centerY + state.halfDiameter; y >= centerY - state.halfDiameter; y--) {
                const dy = y - centerY;
                const dx = Math.sqrt(Math.max(0, state.adjustedR * state.adjustedR - dy * dy)) - Math.sqrt(state.adjustedR * state.adjustedR - state.halfDiameter * state.halfDiameter);
                state.ctx.lineTo(rightCenter + dx, y);
            }
        } else {
            state.ctx.moveTo(leftCenter, centerY - state.halfDiameter);
            for (let y = centerY - state.halfDiameter; y <= centerY + state.halfDiameter; y++) {
                const dy = y - centerY;
                const dx = Math.sqrt(Math.max(0, state.adjustedR * state.adjustedR - dy * dy)) - Math.sqrt(state.adjustedR * state.adjustedR - state.halfDiameter * state.halfDiameter);
                state.ctx.lineTo(leftCenter + dx, y);
            }
            
            for (let y = centerY + state.halfDiameter; y >= centerY - state.halfDiameter; y--) {
                const dy = y - centerY;
                const dx = Math.sqrt(Math.max(0, state.adjustedR * state.adjustedR - dy * dy)) - Math.sqrt(state.adjustedR * state.adjustedR - state.halfDiameter * state.halfDiameter);
                state.ctx.lineTo(rightCenter - dx, y);
            }
        }
        
        state.ctx.closePath();
        state.ctx.fillStyle = lens.isConverging ? 'rgba(200, 220, 255, 0.7)' : 'rgba(255, 200, 200, 0.7)';
        state.ctx.fill();
        state.ctx.strokeStyle = '#000';
        state.ctx.lineWidth = 1;
        state.ctx.stroke();
        state.ctx.beginPath();
        state.ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        state.ctx.fillStyle = 'black';
        state.ctx.fill();
    },

    drawLightRays(lens) {
        const state = this.experimentState;
        const centerX = lens.x;
        const centerY = lens.y;
        const halfEdgeThickness = state.h0 / 2;
        const leftCenter = centerX - halfEdgeThickness;
        const rightCenter = centerX + halfEdgeThickness;
        
        state.ctx.strokeStyle = 'red';
        state.ctx.lineWidth = 1;
        
        let leftCurvatureCenter, rightCurvatureCenter;
        if (lens.isConverging) {
            leftCurvatureCenter = leftCenter - state.adjustedR;
            rightCurvatureCenter = rightCenter + state.adjustedR;
        } else {
            leftCurvatureCenter = leftCenter + state.adjustedR;
            rightCurvatureCenter = rightCenter - state.adjustedR;
        }
        
        let intersectionPointsX = [];
        
        const lensPointsLeft = [];
        const lensPointsRight = [];
        const stepY = 1.0;
        
        for (let y = centerY - state.halfDiameter; y <= centerY + state.halfDiameter; y += stepY) {
            const dy = y - centerY;
            const dx = Math.sqrt(Math.max(0, state.adjustedR * state.adjustedR - dy * dy)) - Math.sqrt(state.adjustedR * state.adjustedR - state.halfDiameter * state.halfDiameter);
            
            if (!lens.isConverging) {
                lensPointsLeft.push({x: leftCenter - dx, y: y});
                lensPointsRight.push({x: rightCenter + dx, y: y});
            } else {
                lensPointsLeft.push({x: leftCenter + dx, y: y});
                lensPointsRight.push({x: rightCenter - dx, y: y});
            }
        }
        
        function findExactIntersection(rayX, rayY, rayDirX, rayDirY, isLeftSurface) {
            const points = isLeftSurface ? lensPointsLeft : lensPointsRight;
            const maxIterations = 1000;
            let curX = rayX;
            let curY = rayY;
            let stepSize = 0.5;
            
            for (let i = 0; i < maxIterations; i++) {
                curX += rayDirX * stepSize;
                curY += rayDirY * stepSize;
                
                let minDist = Infinity;
                let closestPoint = null;
                
                for (const point of points) {
                    const dist = Math.sqrt(Math.pow(curX - point.x, 2) + Math.pow(curY - point.y, 2));
                    if (dist < minDist) {
                        minDist = dist;
                        closestPoint = point;
                    }
                }
                
                if (minDist < stepSize)
                    return closestPoint;
                
                if (curX > state.canvas.width || curX < 0 || curY > state.canvas.height || curY < 0)
                    break;
            }
            return {x: curX, y: curY};
        }
        
        function calculateRefraction(rayDirX, rayDirY, normalX, normalY, n1, n2) {
            const rayLength = Math.sqrt(rayDirX * rayDirX + rayDirY * rayDirY);
            const rayNormX = rayDirX / rayLength;
            const rayNormY = rayDirY / rayLength;
            const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
            const normX = normalX / normalLength;
            const normY = normalY / normalLength;
            const cosTheta1 = -(rayNormX * normX + rayNormY * normY);
            const actualCosTheta1 = Math.abs(cosTheta1);
            const actualNormX = cosTheta1 < 0 ? -normX : normX;
            const actualNormY = cosTheta1 < 0 ? -normY : normY;
            const sinTheta1 = Math.sqrt(1 - actualCosTheta1 * actualCosTheta1);
            const sinTheta2 = (n1 / n2) * sinTheta1;
            
            if (sinTheta2 > 1)
                return { x: rayNormX, y: rayNormY };
            
            const cosTheta2 = Math.sqrt(1 - sinTheta2 * sinTheta2);
            const refractedX = (n1 / n2) * rayNormX + ((n1 / n2) * actualCosTheta1 - cosTheta2) * actualNormX;
            const refractedY = (n1 / n2) * rayNormY + ((n1 / n2) * actualCosTheta1 - cosTheta2) * actualNormY;
            
            return { x: refractedX, y: refractedY };
        }
        
        const startY = centerY - state.halfDiameter + 20;
        const endY = centerY + state.halfDiameter - 20;
        
        for (let rayY = startY; rayY <= endY; rayY += 30) {
            let rayDirX = 1;
            let rayDirY = 0;
            
            const isCentralRay = Math.abs(rayY - centerY) < 15;
            const entryPoint = findExactIntersection(0, rayY, rayDirX, rayDirY, true);
    
            state.ctx.beginPath();
            state.ctx.moveTo(0, rayY);
            state.ctx.lineTo(entryPoint.x, entryPoint.y);
            state.ctx.stroke();
            
            if (isCentralRay) {
                state.ctx.beginPath();
                state.ctx.moveTo(entryPoint.x, entryPoint.y);
                state.ctx.lineTo(rightCenter, centerY);
                state.ctx.stroke();     
                state.ctx.beginPath();
                state.ctx.moveTo(rightCenter, centerY);
                state.ctx.lineTo(state.screenX, centerY);
                state.ctx.stroke();
                continue;
            }
            
            let entryNormalX, entryNormalY;
            if (lens.isConverging) {
                entryNormalX = entryPoint.x - leftCurvatureCenter;
                entryNormalY = entryPoint.y - centerY;
            } else {
                entryNormalX = leftCurvatureCenter - entryPoint.x;
                entryNormalY = centerY - entryPoint.y;
            }
            
            const refractedEntry = calculateRefraction(rayDirX, rayDirY, entryNormalX, entryNormalY, 1.0, state.n);
            
            const exitPoint = findExactIntersection(
                entryPoint.x, entryPoint.y, 
                refractedEntry.x, refractedEntry.y, 
                false
            );
            
            state.ctx.beginPath();
            state.ctx.moveTo(entryPoint.x, entryPoint.y);
            state.ctx.lineTo(exitPoint.x, exitPoint.y);
            state.ctx.stroke();
            
            let exitNormalX, exitNormalY;
            if (lens.isConverging) {
                exitNormalX = exitPoint.x - rightCurvatureCenter;
                exitNormalY = exitPoint.y - centerY;
            } else {
                exitNormalX = rightCurvatureCenter - exitPoint.x;
                exitNormalY = centerY - exitPoint.y;
            }
            
            const refractedExit = calculateRefraction(
                refractedEntry.x, refractedEntry.y, 
                exitNormalX, exitNormalY, 
                state.n, 1.0
            );
            
            const maxDistance = state.canvas.width - exitPoint.x;
            const screenT = (state.screenX - exitPoint.x) / refractedExit.x;
            
            if (screenT > 0 && screenT < maxDistance) {
                const screenY = exitPoint.y + screenT * refractedExit.y;
                
                state.ctx.beginPath();
                state.ctx.moveTo(exitPoint.x, exitPoint.y);
                state.ctx.lineTo(state.screenX, screenY);
                state.ctx.stroke();
                
                if (Math.abs(refractedExit.y) > 0.001) {
                    let intersectionX;
                    if (lens.isConverging) {
                        intersectionX = exitPoint.x - refractedExit.x * (exitPoint.y - centerY) / refractedExit.y;
                    } else {
                        intersectionX = exitPoint.x + refractedExit.x * (exitPoint.y - centerY) / refractedExit.y;
                    }
                    
                    if ((lens.isConverging && intersectionX > centerX && intersectionX < state.canvas.width) ||
                        (!lens.isConverging && intersectionX > 0 && intersectionX < centerX))
                        intersectionPointsX.push(intersectionX);
                }
            }
        }
        
        if (intersectionPointsX.length > 0) {
            let sumX = 0;
            for (let i = 0; i < intersectionPointsX.length; i++)
                sumX += intersectionPointsX[i];
            
            const measuredFocalX = sumX / intersectionPointsX.length;
            const measuredFocalLength = lens.isConverging ? 
                measuredFocalX - centerX : 
                centerX - measuredFocalX;
            
            state.ctx.beginPath();
            state.ctx.arc(measuredFocalX, centerY, 5, 0, Math.PI * 2);
            state.ctx.fillStyle = lens.isConverging ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 0, 255, 0.7)';
            state.ctx.fill();
            state.ctx.strokeStyle = lens.isConverging ? 'red' : 'blue';
            state.ctx.lineWidth = 1;
            state.ctx.stroke();
            
            window.actualF = measuredFocalLength;
            
            state.ctx.fillStyle = lens.isConverging ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 255, 0.8)';
            state.ctx.font = '12px Arial';
            const focalType = lens.isConverging ? 'F' : 'F (мнимый)';
            state.ctx.fillText(`${focalType} = ${measuredFocalLength.toFixed(1)}`, measuredFocalX + 10, centerY - 15);
            
            if (!lens.isConverging) {
                state.ctx.setLineDash([3, 3]);
                state.ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
                state.ctx.beginPath();
                state.ctx.moveTo(measuredFocalX, centerY - 20);
                state.ctx.lineTo(measuredFocalX, centerY + 20);
                state.ctx.stroke();
                state.ctx.setLineDash([]);
            }
        }
    },

    drawLightRaysForBothLenses() {
        const state = this.experimentState;
        state.ctx.strokeStyle = 'red';
        state.ctx.lineWidth = 1;
        
        const centerY = state.convergingLens.y;
        const startY = centerY - state.halfDiameter + 20;
        const endY = centerY + state.halfDiameter - 20;
        
        // Массив для хранения точек пересечения лучей (для вычисления фокуса)
        let intersectionPointsX = [];
        
        function calculateRefraction(rayDirX, rayDirY, normalX, normalY, n1, n2) {
            const rayLength = Math.sqrt(rayDirX * rayDirX + rayDirY * rayDirY);
            const rayNormX = rayDirX / rayLength;
            const rayNormY = rayDirY / rayLength;
            const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
            const normX = normalX / normalLength;
            const normY = normalY / normalLength;
            const cosTheta1 = -(rayNormX * normX + rayNormY * normY);
            const actualCosTheta1 = Math.abs(cosTheta1);
            const actualNormX = cosTheta1 < 0 ? -normX : normX;
            const actualNormY = cosTheta1 < 0 ? -normY : normY;
            const sinTheta1 = Math.sqrt(1 - actualCosTheta1 * actualCosTheta1);
            const sinTheta2 = (n1 / n2) * sinTheta1;
            
            if (sinTheta2 > 1)
                return { x: rayNormX, y: rayNormY };
            
            const cosTheta2 = Math.sqrt(1 - sinTheta2 * sinTheta2);
            const refractedX = (n1 / n2) * rayNormX + ((n1 / n2) * actualCosTheta1 - cosTheta2) * actualNormX;
            const refractedY = (n1 / n2) * rayNormY + ((n1 / n2) * actualCosTheta1 - cosTheta2) * actualNormY;
            
            return { x: refractedX, y: refractedY };
        }
        
        function findExactIntersection(lens, rayX, rayY, rayDirX, rayDirY, isLeftSurface) {
            const centerX = lens.x;
            const halfEdgeThickness = state.h0 / 2;
            const leftCenter = centerX - halfEdgeThickness;
            const rightCenter = centerX + halfEdgeThickness;
            
            const lensPoints = [];
            for (let y = centerY - state.halfDiameter; y <= centerY + state.halfDiameter; y += 1.0) {
                const dy = y - centerY;
                const dx = Math.sqrt(Math.max(0, state.adjustedR * state.adjustedR - dy * dy)) - Math.sqrt(state.adjustedR * state.adjustedR - state.halfDiameter * state.halfDiameter);
                
                if (lens.isConverging) {
                    if (isLeftSurface) {
                        lensPoints.push({x: leftCenter + dx, y: y});
                    } else {
                        lensPoints.push({x: rightCenter - dx, y: y});
                    }
                } else {
                    if (isLeftSurface) {
                        lensPoints.push({x: leftCenter - dx, y: y});
                    } else {
                        lensPoints.push({x: rightCenter + dx, y: y});
                    }
                }
            }
            
            const maxIterations = 1000;
            let curX = rayX;
            let curY = rayY;
            let stepSize = 0.5;
            
            for (let i = 0; i < maxIterations; i++) {
                curX += rayDirX * stepSize;
                curY += rayDirY * stepSize;
                
                let minDist = Infinity;
                let closestPoint = null;
                
                for (const point of lensPoints) {
                    const dist = Math.sqrt(Math.pow(curX - point.x, 2) + Math.pow(curY - point.y, 2));
                    if (dist < minDist) {
                        minDist = dist;
                        closestPoint = point;
                    }
                }
                
                if (minDist < stepSize)
                    return closestPoint;
                
                if (curX > state.canvas.width || curX < 0 || curY > state.canvas.height || curY < 0)
                    return null;
            }
            return {x: curX, y: curY};
        }
        
        function findLensBoundary(lens, rayY) {
            const centerX = lens.x;
            const halfEdgeThickness = state.h0 / 2;
            const leftCenter = centerX - halfEdgeThickness;
            
            const dy = rayY - centerY;
            if (Math.abs(dy) > state.halfDiameter) return null;
            
            const dx = Math.sqrt(Math.max(0, state.adjustedR * state.adjustedR - dy * dy)) - Math.sqrt(state.adjustedR * state.adjustedR - state.halfDiameter * state.halfDiameter);
            
            return lens.isConverging ? leftCenter + dx : leftCenter - dx;
        }
        
        function limitRayToCanvas(startX, startY, dirX, dirY, maxDistance = state.canvas.width) {
            let t = maxDistance;
            
            if (dirX > 0)
                t = Math.min(t, (state.canvas.width - startX) / dirX);
            
            if (dirY > 0)
                t = Math.min(t, (state.canvas.height - startY) / dirY);
            else if (dirY < 0)
                t = Math.min(t, -startY / dirY);
            
            return {
                x: startX + t * dirX,
                y: startY + t * dirY,
                withinBounds: t > 0
            };
        }
        
        // Определяем порядок линз по x-координатам
        const leftLens = state.convergingLens.x < state.divergingLens.x ? state.convergingLens : state.divergingLens;
        const rightLens = state.convergingLens.x < state.divergingLens.x ? state.divergingLens : state.convergingLens;
        
        for (let rayY = startY; rayY <= endY; rayY += 30) {
            const isCentralRay = Math.abs(rayY - centerY) < 15;
            
            // Первая линза (левая)
            const lens1Boundary = findLensBoundary(leftLens, rayY);
            
            if (!lens1Boundary) {
                state.ctx.beginPath();
                state.ctx.moveTo(0, rayY);
                state.ctx.lineTo(state.canvas.width, rayY);
                state.ctx.stroke();
                continue;
            }
            
            state.ctx.beginPath();
            state.ctx.moveTo(0, rayY);
            state.ctx.lineTo(lens1Boundary, rayY);
            state.ctx.stroke();
            
            if (isCentralRay) {
                state.ctx.beginPath();
                state.ctx.moveTo(leftLens.x, rayY);
                state.ctx.lineTo(rightLens.x, rayY);
                state.ctx.stroke();
                
                state.ctx.beginPath();
                state.ctx.moveTo(rightLens.x, rayY);
                state.ctx.lineTo(Math.min(state.screenX, state.canvas.width), rayY);
                state.ctx.stroke();
                continue;
            }
            
            // Обработка первой линзы
            const centerX1 = leftLens.x;
            const halfEdgeThickness = state.h0 / 2;
            const leftCenter1 = centerX1 - halfEdgeThickness;
            const rightCenter1 = centerX1 + halfEdgeThickness;
            
            let leftCurvatureCenter1, rightCurvatureCenter1;
            if (leftLens.isConverging) {
                leftCurvatureCenter1 = leftCenter1 - state.adjustedR;
                rightCurvatureCenter1 = rightCenter1 + state.adjustedR;
            } else {
                leftCurvatureCenter1 = leftCenter1 + state.adjustedR;
                rightCurvatureCenter1 = rightCenter1 - state.adjustedR;
            }
            
            const entry1 = findExactIntersection(leftLens, lens1Boundary - 1, rayY, 1, 0, true);
            if (!entry1) continue;
            
            let entryNormal1X, entryNormal1Y;
            if (leftLens.isConverging) {
                entryNormal1X = entry1.x - leftCurvatureCenter1;
                entryNormal1Y = entry1.y - centerY;
            } else {
                entryNormal1X = leftCurvatureCenter1 - entry1.x;
                entryNormal1Y = centerY - entry1.y;
            }
            
            const refracted1Entry = calculateRefraction(1, 0, entryNormal1X, entryNormal1Y, 1.0, state.n);
            
            const exit1 = findExactIntersection(leftLens, entry1.x, entry1.y, refracted1Entry.x, refracted1Entry.y, false);
            if (!exit1) continue;
            
            state.ctx.beginPath();
            state.ctx.moveTo(entry1.x, entry1.y);
            state.ctx.lineTo(exit1.x, exit1.y);
            state.ctx.stroke();
            
            let exitNormal1X, exitNormal1Y;
            if (leftLens.isConverging) {
                exitNormal1X = exit1.x - rightCurvatureCenter1;
                exitNormal1Y = exit1.y - centerY;
            } else {
                exitNormal1X = rightCurvatureCenter1 - exit1.x;
                exitNormal1Y = centerY - exit1.y;
            }
            
            const refracted1Exit = calculateRefraction(refracted1Entry.x, refracted1Entry.y, exitNormal1X, exitNormal1Y, state.n, 1.0);
            
            // Попадание во вторую линзу
            const entry2 = findExactIntersection(rightLens, exit1.x, exit1.y, refracted1Exit.x, refracted1Exit.y, true);
            
            if (!entry2) {
                const endPoint = limitRayToCanvas(exit1.x, exit1.y, refracted1Exit.x, refracted1Exit.y);
                if (endPoint.withinBounds) {
                    state.ctx.beginPath();
                    state.ctx.moveTo(exit1.x, exit1.y);
                    state.ctx.lineTo(endPoint.x, endPoint.y);
                    state.ctx.stroke();
                }
                continue;
            }
            
            state.ctx.beginPath();
            state.ctx.moveTo(exit1.x, exit1.y);
            state.ctx.lineTo(entry2.x, entry2.y);
            state.ctx.stroke();
            
            // Обработка второй линзы
            const centerX2 = rightLens.x;
            const leftCenter2 = centerX2 - halfEdgeThickness;
            const rightCenter2 = centerX2 + halfEdgeThickness;
            
            let leftCurvatureCenter2, rightCurvatureCenter2;
            if (rightLens.isConverging) {
                leftCurvatureCenter2 = leftCenter2 - state.adjustedR;
                rightCurvatureCenter2 = rightCenter2 + state.adjustedR;
            } else {
                leftCurvatureCenter2 = leftCenter2 + state.adjustedR;
                rightCurvatureCenter2 = rightCenter2 - state.adjustedR;
            }
            
            let entryNormal2X, entryNormal2Y;
            if (rightLens.isConverging) {
                entryNormal2X = entry2.x - leftCurvatureCenter2;
                entryNormal2Y = entry2.y - centerY;
            } else {
                entryNormal2X = leftCurvatureCenter2 - entry2.x;
                entryNormal2Y = centerY - entry2.y;
            }
            
            const refracted2Entry = calculateRefraction(refracted1Exit.x, refracted1Exit.y, entryNormal2X, entryNormal2Y, 1.0, state.n);
            
            const exit2 = findExactIntersection(rightLens, entry2.x, entry2.y, refracted2Entry.x, refracted2Entry.y, false);
            if (!exit2) continue;
            
            state.ctx.beginPath();
            state.ctx.moveTo(entry2.x, entry2.y);
            state.ctx.lineTo(exit2.x, exit2.y);
            state.ctx.stroke();
            
            let exitNormal2X, exitNormal2Y;
            if (rightLens.isConverging) {
                exitNormal2X = exit2.x - rightCurvatureCenter2;
                exitNormal2Y = exit2.y - centerY;
            } else {
                exitNormal2X = rightCurvatureCenter2 - exit2.x;
                exitNormal2Y = centerY - exit2.y;
            }
            
            const refracted2Exit = calculateRefraction(refracted2Entry.x, refracted2Entry.y, exitNormal2X, exitNormal2Y, state.n, 1.0);
            
            // Вычисляем точку пересечения с оптической осью для определения фокуса
            if (Math.abs(refracted2Exit.y) > 0.001) {
                const intersectionX = exit2.x - refracted2Exit.x * (exit2.y - centerY) / refracted2Exit.y;
                
                // Проверяем, что пересечение находится в разумных пределах
                if (intersectionX > rightLens.x && intersectionX < state.canvas.width) {
                    intersectionPointsX.push(intersectionX);
                }
            }
            
            const screenT = (state.screenX - exit2.x) / refracted2Exit.x;
            const endPoint = limitRayToCanvas(exit2.x, exit2.y, refracted2Exit.x, refracted2Exit.y, screenT);
            
            if (endPoint.withinBounds) {
                state.ctx.beginPath();
                state.ctx.moveTo(exit2.x, exit2.y);
                state.ctx.lineTo(endPoint.x, endPoint.y);
                state.ctx.stroke();
            }
        }
        
        // Отображаем фокус системы двух линз
        if (intersectionPointsX.length > 0) {
            let sumX = 0;
            for (let i = 0; i < intersectionPointsX.length; i++) {
                sumX += intersectionPointsX[i];
            }
            
            const measuredFocalX = sumX / intersectionPointsX.length;
            const systemFocalLength = measuredFocalX - rightLens.x;
            
            // Рисуем точку фокуса системы
            state.ctx.beginPath();
            state.ctx.arc(measuredFocalX, centerY, 6, 0, Math.PI * 2);
            state.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            state.ctx.fill();
            state.ctx.strokeStyle = 'green';
            state.ctx.lineWidth = 2;
            state.ctx.stroke();
            
            // Подписываем фокус системы
            state.ctx.fillStyle = 'rgba(0, 150, 0, 0.9)';
            state.ctx.font = '14px Arial';
            state.ctx.fillText(`F_система = ${systemFocalLength.toFixed(1)}`, measuredFocalX + 10, centerY - 20);
            
            // Сохраняем измеренное фокусное расстояние
            window.actualF = systemFocalLength;
            
            // Рисуем вертикальную линию через фокус
            state.ctx.setLineDash([3, 3]);
            state.ctx.strokeStyle = 'rgba(0, 150, 0, 0.6)';
            state.ctx.lineWidth = 1;
            state.ctx.beginPath();
            state.ctx.moveTo(measuredFocalX, centerY - 30);
            state.ctx.lineTo(measuredFocalX, centerY + 30);
            state.ctx.stroke();
            state.ctx.setLineDash([]);
        }
    },

    drawCaliper() {
        const state = this.experimentState;
        const x1 = state.caliperPosition.x1;
        const y1 = state.caliperPosition.y1;
        const x2 = state.caliperPosition.x2;
        const y2 = state.caliperPosition.y2;
        
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        state.ctx.save();
        state.ctx.translate(midX, midY);
        state.ctx.rotate(angle);
        
        const caliperHeight = 30;
        state.ctx.fillStyle = "#d1d1d1";
        state.ctx.strokeStyle = "#808080";
        state.ctx.lineWidth = 1;
        
        state.ctx.fillRect(-distance/2, -caliperHeight/2, distance, caliperHeight);
        state.ctx.strokeRect(-distance/2, -caliperHeight/2, distance, caliperHeight);
        state.ctx.fillStyle = "#808080";
        state.ctx.fillRect(-distance/2 - 5, -caliperHeight/2 - 20, 5, caliperHeight + 40);
        state.ctx.fillRect(distance/2, -caliperHeight/2 - 20, 5, caliperHeight + 40);
        state.ctx.fillStyle = "#000";
        
        const markCount = Math.floor(distance / 10);
        for (let i = 0; i <= markCount; i++) {
            const x = -distance/2 + i * 10;
            const height = i % 10 === 0 ? 15 : 10;
            state.ctx.fillRect(x, -caliperHeight/2, 1, height);
            
            if (i % 10 === 0) {
                state.ctx.save();
                state.ctx.translate(x, -caliperHeight/2 - 5);
                state.ctx.rotate(-angle);
                state.ctx.font = "8px Arial";
                state.ctx.textAlign = "center";
                state.ctx.fillText((i * 10).toString(), 0, 0);
                state.ctx.restore();
            }
        }
        
        const vernierLength = 20;
        state.ctx.fillStyle = "#b8b8b8";
        state.ctx.fillRect(-distance/2, caliperHeight/2 - 10, vernierLength, 10);
        state.ctx.save();
        state.ctx.translate(0, caliperHeight/2 + 15);
        state.ctx.rotate(-angle);
        state.ctx.fillStyle = "white";
        state.ctx.fillRect(-40, -10, 80, 20);
        state.ctx.strokeStyle = "black";
        state.ctx.strokeRect(-40, -10, 80, 20);
        state.ctx.fillStyle = "black";
        state.ctx.font = "12px Arial";
        state.ctx.textAlign = "center";
        state.ctx.fillText(`${distance.toFixed(1)} пикс`, 0, 5);
        state.ctx.restore();
        state.ctx.restore();
        
        this.drawDragPoint(x1, y1, "#FF4444");
        this.drawDragPoint(x2, y2, "#4444FF");
    },

    drawDragPoint(x, y, color) {
        const state = this.experimentState;
        state.ctx.beginPath();
        state.ctx.arc(x, y, 8, 0, 2 * Math.PI);
        state.ctx.fillStyle = color;
        state.ctx.fill();
        state.ctx.strokeStyle = "#000";
        state.ctx.lineWidth = 2;
        state.ctx.stroke();
    }
}

export default experimentFunctions;