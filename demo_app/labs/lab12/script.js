window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');
    const resultsBody = document.getElementById('results-body');
    const resetButton = document.getElementById('reset-btn');
    const checkMeasurementsButton = document.getElementById('check-measurements');
    const toggleCaliperButton = document.getElementById('toggle-caliper');

    const userThicknessInput = document.getElementById('user-thickness');
    const userDiameterInput = document.getElementById('user-diameter');
    const userEdgeThicknessInput = document.getElementById('user-edge-thickness');
    const userFocusInput = document.getElementById('user-focus');
    const userRadiusInput = document.getElementById('user-radius');
    const userRefractiveIndexInput = document.getElementById('user-refractive-index');
    
    const thicknessCheck = document.getElementById('thickness-check');
    const diameterCheck = document.getElementById('diameter-check');
    const edgeThicknessCheck = document.getElementById('edge-thickness-check');
    const focusCheck = document.getElementById('focus-check');
    const radiusCheck = document.getElementById('radius-check');
    const refractiveIndexCheck = document.getElementById('refractive-index-check');

    const LENS_CENTER_X = 250;
    const LENS_CENTER_Y = canvas.height / 2;

    // CONFIG
    const H = 120;
    const D = 250;
    const h0 = 70;
    const n = 1.5;
    
    const R = ((D * D / 4) + Math.pow(H - h0, 2)) / (2 * (H - h0));
    
    
    const bulgeAtCenter = (H - h0) / 2;
    const halfDiameter = D / 2;
    const adjustedR = (halfDiameter * halfDiameter + bulgeAtCenter * bulgeAtCenter) / (2 * bulgeAtCenter);
    
    const F = adjustedR / (2 * (n - 1));
    
    let screenX = LENS_CENTER_X + F * 1.2;
    let calculatedResults = {};
    
    let showCaliper = false;
    let caliperPosition = { x1: 200, y1: 150, x2: 300, y2: 150 };
    let isDraggingScreen = false;
    let isDraggingCaliper = false;
    let isDraggingCaliperPoint = false;
    let draggingCaliperPointIndex = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialScreenX = 0;
    let measuredFocus = 0;

    function init() {
        drawSimulation();
        
        resetButton.addEventListener('click', resetMeasurements);
        checkMeasurementsButton.addEventListener('click', checkMeasurements);
        toggleCaliperButton.addEventListener('click', toggleCaliper);

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        
        document.getElementById('guide-btn').addEventListener('click', () => {
            intro.start();
        });
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = window.location.origin;
        });
    }
    
    function toggleCaliper() {
        showCaliper = !showCaliper;
        if (showCaliper) {
            caliperPosition = {
                x1: canvas.width / 2 - 50,
                y1: canvas.height / 2,
                x2: canvas.width / 2 + 50,
                y2: canvas.height / 2
            };
        }
        drawSimulation();
    }

    function resetMeasurements() {
        calculatedResults = {};
        resultsBody.innerHTML = '';
        
        screenX = LENS_CENTER_X + F * 1.2;
        measuredFocus = 0;
        
        userThicknessInput.value = '';
        userDiameterInput.value = '';
        userEdgeThicknessInput.value = '';
        userFocusInput.value = '';
        userRadiusInput.value = '';
        userRefractiveIndexInput.value = '';

        correctAnswersCount = 0;
        incorrectAnswersCount = 0;
        
        thicknessCheck.className = 'check-mark';
        diameterCheck.className = 'check-mark';
        edgeThicknessCheck.className = 'check-mark';
        focusCheck.className = 'check-mark';
        radiusCheck.className = 'check-mark';
        refractiveIndexCheck.className = 'check-mark';
        
        drawSimulation();
    }

    function handleMouseDown(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        if (isPointInside(mouseX, mouseY, screenX, LENS_CENTER_Y, 10) || 
            (mouseX >= screenX - 5 && mouseX <= screenX + 5 && mouseY >= 50 && mouseY <= canvas.height - 50)) {
            isDraggingScreen = true;
            dragStartX = mouseX;
            initialScreenX = screenX;
            canvas.classList.add('dragging');
            return;
        }
        
        if (showCaliper) {
            const pointRadius = 8;
            
            if (isPointInside(mouseX, mouseY, caliperPosition.x1, caliperPosition.y1, pointRadius)) {
                isDraggingCaliperPoint = true;
                draggingCaliperPointIndex = 1;
                canvas.classList.add('dragging');
                return;
            }
            
            if (isPointInside(mouseX, mouseY, caliperPosition.x2, caliperPosition.y2, pointRadius)) {
                isDraggingCaliperPoint = true;
                draggingCaliperPointIndex = 2;
                canvas.classList.add('dragging');
                return;
            }
            
            if (isPointInsideCaliper(mouseX, mouseY)) {
                isDraggingCaliper = true;
                dragStartX = mouseX;
                dragStartY = mouseY;
                canvas.classList.add('dragging');
                return;
            }
        }
    }

    let animationFrameId = null;

    function handleMouseMove(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
    
        let needsRedraw = false;
    
        if (isDraggingScreen) {
            const deltaX = mouseX - dragStartX;
            screenX = Math.max(LENS_CENTER_X + 50, Math.min(canvas.width - 10, initialScreenX + deltaX));
            measuredFocus = screenX - LENS_CENTER_X;
            needsRedraw = true;
        }
        
        if (isDraggingCaliperPoint) {
            if (draggingCaliperPointIndex === 1) {
                caliperPosition.x1 = mouseX;
                caliperPosition.y1 = mouseY;
            } else {
                caliperPosition.x2 = mouseX;
                caliperPosition.y2 = mouseY;
            }
            needsRedraw = true;
        }
        
        if (isDraggingCaliper) {
            const deltaX = mouseX - dragStartX;
            const deltaY = mouseY - dragStartY;
            
            caliperPosition.x1 += deltaX;
            caliperPosition.y1 += deltaY;
            caliperPosition.x2 += deltaX;
            caliperPosition.y2 += deltaY;
            
            dragStartX = mouseX;
            dragStartY = mouseY;
            
            needsRedraw = true;
        }
    
        if (needsRedraw) {
            drawSimulation();
    
            animationFrameId && cancelAnimationFrame(animationFrameId);
    
            animationFrameId = requestAnimationFrame(() => {
                drawSimulation();
                animationFrameId = null;
            });
        }
    }

    function handleMouseUp() {
        canvas.classList.remove('dragging');
        isDraggingScreen = false;
        isDraggingCaliper = false;
        isDraggingCaliperPoint = false;

        animationFrameId && cancelAnimationFrame(animationFrameId);
        drawSimulation();
    }

    function handleMouseLeave() {
        canvas.classList.remove('dragging');
        isDraggingScreen = false;
        isDraggingCaliper = false;
        isDraggingCaliperPoint = false;

        animationFrameId && cancelAnimationFrame(animationFrameId);
        drawSimulation();
    }
    
    function isPointInside(px, py, x, y, radius) {
        return Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2)) <= radius;
    }
    
    function isPointInsideCaliper(px, py) {
        const angle = Math.atan2(caliperPosition.y2 - caliperPosition.y1, 
                                caliperPosition.x2 - caliperPosition.x1);
        
        const distance = Math.sqrt(
            Math.pow(caliperPosition.x2 - caliperPosition.x1, 2) + 
            Math.pow(caliperPosition.y2 - caliperPosition.y1, 2)
        );
        
        const midX = (caliperPosition.x1 + caliperPosition.x2) / 2;
        const midY = (caliperPosition.y1 + caliperPosition.y2) / 2;
        
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
    }

    function checkMeasurements() {
        const tolerance = 8;
        const nTolerance = 0.05;
        const FTolerance = 10;
        
        const userThickness = parseFloat(userThicknessInput.value) || 0;
        const userDiameter = parseFloat(userDiameterInput.value) || 0;
        const userEdgeThickness = parseFloat(userEdgeThicknessInput.value) || 0;
        const userFocus = parseFloat(userFocusInput.value) || 0;
        const userR = parseFloat(userRadiusInput.value) || 0;
        const userN = parseFloat(userRefractiveIndexInput.value) || 0;
        
        checkValue(userThickness, H, tolerance, thicknessCheck);
        checkValue(userDiameter, D, tolerance, diameterCheck);
        checkValue(userEdgeThickness, h0, tolerance, edgeThicknessCheck);
        checkValue(userFocus, F, FTolerance, focusCheck);
        checkValue(userR, R, tolerance, radiusCheck);
        checkValue(userN, n, nTolerance, refractiveIndexCheck);
    }
    
    function checkValue(userValue, actualValue, tolerance, checkElement) {
        if (Math.abs(userValue - actualValue) <= tolerance) {
            checkElement.className = 'check-mark correct';
            return true;
        } else {
            checkElement.className = 'check-mark incorrect';
            return false;
        }
    }

    function drawSimulation() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawLens();
        drawLightRays();
        
        ctx.beginPath();
        ctx.strokeStyle = '#00008B';
        ctx.lineWidth = isDraggingScreen ? 4 : 2;
        ctx.moveTo(screenX, 50);
        ctx.lineTo(screenX, canvas.height - 50);
        ctx.stroke();
        
        showCaliper && drawCaliper();
    }
    
    function drawLens() {
        const halfEdgeThickness = h0 / 2;
        const centerX = LENS_CENTER_X;
        const centerY = LENS_CENTER_Y;
        
        const leftCenter = centerX - halfEdgeThickness;
        const rightCenter = centerX + halfEdgeThickness;
        
        ctx.beginPath();
    
        ctx.moveTo(leftCenter, centerY - halfDiameter);
        for (let y = centerY - halfDiameter; y <= centerY + halfDiameter; y++) {
            const dy = y - centerY;
            const dx = Math.sqrt(Math.max(0, adjustedR * adjustedR - dy * dy)) - Math.sqrt(adjustedR * adjustedR - halfDiameter * halfDiameter);
            ctx.lineTo(leftCenter - dx, y);
        }
        
        for (let y = centerY + halfDiameter; y >= centerY - halfDiameter; y--) {
            const dy = y - centerY;
            const dx = Math.sqrt(Math.max(0, adjustedR * adjustedR - dy * dy)) - Math.sqrt(adjustedR * adjustedR - halfDiameter * halfDiameter);
            ctx.lineTo(rightCenter + dx, y);
        }
        
        ctx.closePath();
        ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    function drawLightRays() {
        const centerX = LENS_CENTER_X;
        const centerY = LENS_CENTER_Y;
        
        const halfEdgeThickness = h0 / 2;
        const leftCenter = centerX - halfEdgeThickness;
        const rightCenter = centerX + halfEdgeThickness;
        
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        
        const leftCurvatureCenter = leftCenter - adjustedR;
        const rightCurvatureCenter = rightCenter + adjustedR;
        
        const numRaysPerSide = 4; 
        const raySpacing = (halfDiameter * 0.8) / numRaysPerSide;
        
        let intersectionPointsX = [];
        let intersectionPointsY = [];
        
        // ======= РАСЧЕТ ТОЧЕК ПОВЕРХНОСТИ ЛИНЗЫ =======
        const lensPointsLeft = [];
        const lensPointsRight = [];
        const stepY = 1.0;
        
        for (let y = centerY - halfDiameter; y <= centerY + halfDiameter; y += stepY) {
            const dy = y - centerY;
            const dx = Math.sqrt(Math.max(0, adjustedR * adjustedR - dy * dy)) - Math.sqrt(adjustedR * adjustedR - halfDiameter * halfDiameter);
            lensPointsLeft.push({x: leftCenter - dx, y: y});
            lensPointsRight.push({x: rightCenter + dx, y: y});
        }
        
        // ======= ФУНКЦИЯ ПОИСКА ТОЧКИ ПЕРЕСЕЧЕНИЯ ЛУЧА С ПОВЕРХНОСТЬЮ ЛИНЗЫ =======
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
                    const dist = Math.sqrt((curX - point.x) ** 2 + (curY - point.y) ** 2);
                    if (dist < minDist) {
                        minDist = dist;
                        closestPoint = point;
                    }
                }
                
                if (minDist < stepSize) return closestPoint;
            }
            return {x: curX, y: curY};
        }
        
        // ======= ОСНОВНОЙ ЦИКЛ ГЕНЕРАЦИИ ЛУЧЕЙ =======
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i <= numRaysPerSide; i++) {
                if (side === 1 && i === 0) continue;
                
                const rayY = centerY + side * i * raySpacing;
                const isCentralRay = Math.abs(rayY - centerY) < 2;
                const entryPoint = findExactIntersection(0, rayY, 1, 0, true);
    
                ctx.beginPath();
                ctx.moveTo(0, rayY);
                ctx.lineTo(entryPoint.x, entryPoint.y);
                ctx.stroke();
                
                if (isCentralRay) {
                    const exitPoint = findExactIntersection(entryPoint.x, entryPoint.y, 1, 0, false);
                    ctx.beginPath();
                    ctx.moveTo(entryPoint.x, entryPoint.y);
                    ctx.lineTo(exitPoint.x, exitPoint.y);
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.moveTo(exitPoint.x, exitPoint.y);
                    ctx.lineTo(screenX, exitPoint.y);
                    ctx.stroke();
                    continue;
                }
                
                // ======= РАСЧЕТ ПРЕЛОМЛЕНИЯ НА ВХОДЕ В ЛИНЗУ =======
                const entryNormalX = entryPoint.x - leftCurvatureCenter;
                const entryNormalY = entryPoint.y - centerY;
                const entryNormalLength = Math.sqrt(entryNormalX * entryNormalX + entryNormalY * entryNormalY);
                const entryNormalizedX = entryNormalX / entryNormalLength;
                const entryNormalizedY = -entryNormalY / entryNormalLength;
                
                const n1 = 1.0;
                const n2 = n;
                
                const incidentX = 1.0;
                const incidentY = 0.0;
                const incidentDotNormal = incidentX * entryNormalizedX + incidentY * entryNormalizedY;
                
                const refractedX = (n1/n2) * incidentX - (n1/n2 * incidentDotNormal - 
                                Math.sqrt(1 - (n1/n2)*(n1/n2) * (1 - incidentDotNormal*incidentDotNormal))) * 
                                entryNormalizedX;
                                
                const refractedY = (n1/n2) * incidentY - (n1/n2 * incidentDotNormal - 
                                Math.sqrt(1 - (n1/n2)*(n1/n2) * (1 - incidentDotNormal*incidentDotNormal))) * 
                                entryNormalizedY;
                
                const refractedLength = Math.sqrt(refractedX * refractedX + refractedY * refractedY);
                const refractedNormalizedX = refractedX / refractedLength;
                const refractedNormalizedY = refractedY / refractedLength;
                
                // ======= ТРАССИРОВКА ЛУЧА ВНУТРИ ЛИНЗЫ =======
                const exitPoint = findExactIntersection(
                    entryPoint.x, entryPoint.y, 
                    refractedNormalizedX, refractedNormalizedY, 
                    false
                );
                
                ctx.beginPath();
                ctx.moveTo(entryPoint.x, entryPoint.y);
                ctx.lineTo(exitPoint.x, exitPoint.y);
                ctx.stroke();
                
                // ======= РАСЧЕТ ПРЕЛОМЛЕНИЯ НА ВЫХОДЕ ИЗ ЛИНЗЫ =======
                // Вычисляем нормаль к поверхности в точке выхода
                const exitNormalX = rightCurvatureCenter - exitPoint.x;
                const exitNormalY = centerY - exitPoint.y;
                const exitNormalLength = Math.sqrt(exitNormalX * exitNormalX + exitNormalY * exitNormalY);
                const exitNormalizedX = exitNormalX / exitNormalLength;
                const exitNormalizedY = -exitNormalY / exitNormalLength;
                
                const exitIncidentX = refractedNormalizedX;
                const exitIncidentY = refractedNormalizedY;
                
                const n3 = n;
                const n4 = 1.0;
                
                const exitIncidentDotNormal = exitIncidentX * exitNormalizedX + exitIncidentY * exitNormalizedY;
                
                const criticalAngle = Math.sqrt(1 - (n4*n4)/(n3*n3));
                if (Math.abs(exitIncidentDotNormal) < criticalAngle)
                    continue;
                
                const exitRefractedX = (n3/n4) * exitIncidentX - (n3/n4 * exitIncidentDotNormal - 
                                    Math.sqrt(1 - (n3/n4)*(n3/n4) * (1 - exitIncidentDotNormal*exitIncidentDotNormal))) * 
                                    exitNormalizedX;
                                    
                const exitRefractedY = (n3/n4) * exitIncidentY - (n3/n4 * exitIncidentDotNormal - 
                                    Math.sqrt(1 - (n3/n4)*(n3/n4) * (1 - exitIncidentDotNormal*exitIncidentDotNormal))) * 
                                    exitNormalizedY;
                
                const exitRefractedLength = Math.sqrt(exitRefractedX * exitRefractedX + exitRefractedY * exitRefractedY);
                const exitRefractedNormalizedX = exitRefractedX / exitRefractedLength;
                const exitRefractedNormalizedY = exitRefractedY / exitRefractedLength;
                
                // ======= РАСЧЕТ ПУТИ ЛУЧА ДО ЭКРАНА =======
                const t = (screenX - exitPoint.x) / exitRefractedNormalizedX;
                const screenY = exitPoint.y + t * exitRefractedNormalizedY;
                
                ctx.beginPath();
                ctx.moveTo(exitPoint.x, exitPoint.y);
                ctx.lineTo(screenX, screenY);
                ctx.stroke();
                
                // ======= РАСЧЕТ ТОЧЕК ПЕРЕСЕЧЕНИЯ ДЛЯ ФОКУСА =======
                if (!isCentralRay && Math.abs(exitRefractedNormalizedY) > 0.001) {
                    const intersectionX = exitPoint.x + exitRefractedNormalizedX * (centerY - exitPoint.y) / exitRefractedNormalizedY;
                    
                    if (intersectionX > rightCenter && intersectionX < canvas.width) {
                        intersectionPointsX.push(intersectionX);
                        intersectionPointsY.push(centerY);
                    }
                }
            }
        }
        
        // ======= ОТОБРАЖЕНИЕ ФОКУСНОГО РАССТОЯНИЯ =======
        if (intersectionPointsX.length > 0) {
            let sumX = 0;
            for (let i = 0; i < intersectionPointsX.length; i++)
                sumX += intersectionPointsX[i];
            
            const measuredFocalX = sumX / intersectionPointsX.length;
            const measuredFocalLength = measuredFocalX - centerX;
            
            ctx.beginPath();
            ctx.arc(measuredFocalX, centerY, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fill();
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            window.actualF = measuredFocalLength;
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.font = '12px Arial';
            ctx.fillText(`Measured F = ${measuredFocalLength.toFixed(1)}`, measuredFocalX + 10, centerY - 15);
        }
    }

    function drawCaliper() {
        const x1 = caliperPosition.x1;
        const y1 = caliperPosition.y1;
        const x2 = caliperPosition.x2;
        const y2 = caliperPosition.y2;
        
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        
        const caliperHeight = 30;
        ctx.fillStyle = "#d1d1d1";
        ctx.strokeStyle = "#808080";
        ctx.lineWidth = 1;
        
        ctx.fillRect(-distance/2, -caliperHeight/2, distance, caliperHeight);
        ctx.strokeRect(-distance/2, -caliperHeight/2, distance, caliperHeight);
        
        ctx.fillStyle = "#808080";
        ctx.fillRect(-distance/2 - 5, -caliperHeight/2 - 20, 5, caliperHeight + 40);
        ctx.fillRect(distance/2, -caliperHeight/2 - 20, 5, caliperHeight + 40);
        
        ctx.fillStyle = "#000";
        const markCount = Math.floor(distance / 10);
        for (let i = 0; i <= markCount; i++) {
            const x = -distance/2 + i * 10;
            const height = i % 10 === 0 ? 15 : 10;
            ctx.fillRect(x, -caliperHeight/2, 1, height);
            
            if (i % 10 === 0) {
                ctx.save();
                ctx.translate(x, -caliperHeight/2 - 5);
                ctx.rotate(-angle);
                ctx.fillStyle = "#000";
                ctx.font = "10px Arial";
                ctx.textAlign = "center";
                ctx.fillText(i.toString(), 0, 0);
                ctx.restore();
            }
        }
        
        const vernierLength = 20;
        ctx.fillStyle = "#b8b8b8";
        ctx.fillRect(-distance/2, caliperHeight/2 - 10, vernierLength, 10);
        
        ctx.save();
        ctx.translate(0, caliperHeight/2 + 15);
        ctx.rotate(-angle);
        ctx.fillStyle = "white";
        ctx.fillRect(-40, -10, 80, 20);
        ctx.strokeStyle = "black";
        ctx.strokeRect(-40, -10, 80, 20);
        
        ctx.fillStyle = "black";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${distance.toFixed(1)} пикс`, 0, 5);
        ctx.restore();
        
        ctx.restore();
        
        drawDragPoint(x1, y1, "#FF4444");
        drawDragPoint(x2, y2, "#4444FF");
    }
    
    function drawDragPoint(x, y, color) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function updateTable() {
        resultsBody.innerHTML = '';
        const res = calculatedResults;
        
        if (res && res.n) {
            const row = resultsBody.insertRow();
            row.innerHTML = `
                <td>${res.f.toFixed(1)}</td>
                <td>${res.F.toFixed(1)}</td>
                <td>${res.H.toFixed(1)}</td>
                <td>${res.D.toFixed(1)}</td>
                <td>${res.h0.toFixed(1)}</td>
                <td>${res.R.toFixed(1)}</td>
                <td>${res.n.toFixed(4)}</td>
            `;
        }
    }

    const tabsContent = intro.createTabContent([
        'status-panel',
        'theory-panel',
        'results-table-panel',
        'measurement-panel'
    ], 'tabs-container');
          
    const tabButtons = tabsContent.querySelectorAll('.info-content-buttons button');
    tabButtons[0].textContent = 'Порядок';
    tabButtons[1].textContent = 'Формулы';
    tabButtons[2].textContent = 'Таблица';
    tabButtons[3].textContent = 'Результаты';
      
    intro.init([
        {
            title: 'Информация',
            description: 'Здесь вы можете ознакомиться с порядком выполнения лабораторной работы, теоретической моделью, и результатами эксперимента.',
            element: '#tabs-container'
        },
        {
            title: 'Инструкция',
            description: 'Здесь показывается, что нужно сделать на текущем шаге эксперимента.',
            element: '#steps-vis'
        },
        {
            title: 'Рабочая область',
            description: 'В этой области расположено оборудование, которое используется для проведения лабораторной работы.',
            element: '#experiment-area'
        },
        {
            title: 'Подсказки',
            description: 'Здесь вы можете ознакомиться с краткими подсказками по управлению в эксперименте.',
            element: '#help-text'
        },
        {
            title: 'Панель управления',
            description: 'Здесь расположены кнопки управления экспериментом. Кнопка "Сбросить" начинает эксперимент заново.',
            element: '.buttons-container'
        }
    ]);

    init();
});