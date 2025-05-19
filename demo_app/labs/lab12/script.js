window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');
    const resultsBody = document.getElementById('results-body');
    const calculateButton = document.getElementById('calculate-button');
    const resetButton = document.getElementById('reset-btn');
    const checkMeasurementsButton = document.getElementById('check-measurements');
    const errorInfo = document.getElementById('error-info');
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

    let correctAnswersCount = 0;
    let incorrectAnswersCount = 0;
    let measuredFocus = 0;
    
    // CONFIG
    const H = 170;
    const D = 250;
    const h0 = 60;
    const n = 1.5;
    
    const R = ((D * D / 4) + Math.pow(H - h0, 2)) / (2 * (H - h0));
    const F = R / (2 * (n - 1));
    
    let screenX = LENS_CENTER_X + F * 1.2;

    const bulgeAtCenter = (H - h0) / 2;
    const halfDiameter = D / 2;
    const halfThickness = h0 / 2;
    const adjustedR = (halfDiameter * halfDiameter + bulgeAtCenter * bulgeAtCenter) / (2 * bulgeAtCenter);

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
    
    function init() {
        drawSimulation();
        
        calculateButton.addEventListener('click', handleCalculation);
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
            errorInfo.textContent = 'Штангенциркуль активирован. Перетащите его для измерения параметров линзы.';
            errorInfo.style.color = '#333';
        } else {
            errorInfo.textContent = 'Штангенциркуль скрыт.';
            errorInfo.style.color = '#333';
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
        errorInfo.textContent = 'Все результаты сброшены.';
        errorInfo.style.color = '#333';
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

    function handleMouseMove(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        if (isDraggingScreen) {
            const deltaX = mouseX - dragStartX;
            screenX = Math.max(LENS_CENTER_X + 50, Math.min(canvas.width - 10, initialScreenX + deltaX));
            
            measuredFocus = screenX - LENS_CENTER_X;
            drawSimulation();
        }
        
        if (isDraggingCaliperPoint) {
            if (draggingCaliperPointIndex === 1) {
                caliperPosition.x1 = mouseX;
                caliperPosition.y1 = mouseY;
            } else {
                caliperPosition.x2 = mouseX;
                caliperPosition.y2 = mouseY;
            }
            drawSimulation();
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
            
            drawSimulation();
        }
    }

    function handleMouseUp() {
        canvas.classList.remove('dragging');
        isDraggingScreen = false;
        isDraggingCaliper = false;
        isDraggingCaliperPoint = false;
    }

    function handleMouseLeave() {
        canvas.classList.remove('dragging');
        isDraggingScreen = false;
        isDraggingCaliper = false;
        isDraggingCaliperPoint = false;
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

    function handleCalculation() {
        if (!areAllMeasurementsValid()) {
            errorInfo.textContent = 'Ошибка: Заполните все поля корректными значениями и проверьте их точность.';
            errorInfo.style.color = 'red';
            return;
        }
        
        errorInfo.textContent = '';

        const h = parseFloat(userThicknessInput.value);
        const d = parseFloat(userDiameterInput.value);
        const h0 = parseFloat(userEdgeThicknessInput.value);
        const F = parseFloat(userFocusInput.value);
        const R = parseFloat(userRadiusInput.value);
        const n = parseFloat(userRefractiveIndexInput.value);
        
        calculatedResults = {
            f: F,
            F: F,
            H: h,
            D: d,
            h0: h0,
            R: R,
            n: n
        };

        updateTable();
    }
    
    function areAllMeasurementsValid() {
        return thicknessCheck.classList.contains('correct') &&
               diameterCheck.classList.contains('correct') &&
               edgeThicknessCheck.classList.contains('correct') &&
               focusCheck.classList.contains('correct') &&
               radiusCheck.classList.contains('correct') &&
               refractiveIndexCheck.classList.contains('correct');
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
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 100, 0, 0.5)';
        ctx.setLineDash([5, 3]);
        ctx.moveTo(LENS_CENTER_X + F, 50);
        ctx.lineTo(LENS_CENTER_X + F, canvas.height - 50);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(0, 100, 0, 0.8)';
        ctx.font = '12px Arial';
        ctx.fillText(`F = ${F.toFixed(1)}`, LENS_CENTER_X + F + 5, 70);
        
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
        
        const leftCenter = centerX - halfThickness;
        const rightCenter = centerX + halfThickness;
        
        const numRays = 7;
        const raySpacing = (halfDiameter * 1.8) / (numRays - 1);
        
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        
        const focusX = centerX + F;
        const focusY = centerY;
        
        for (let i = 0; i < numRays; i++) {
            const rayY = centerY - halfDiameter * 0.9 + i * raySpacing;
            
            const dy = rayY - centerY;
            const dx = Math.sqrt(Math.max(0, adjustedR * adjustedR - dy * dy)) - Math.sqrt(adjustedR * adjustedR - halfDiameter * halfDiameter);
            const entryX = leftCenter - dx;
            
            const innerY = centerY + (rayY - centerY) * 0.9;
            const innerDy = innerY - centerY;
            const innerDx = Math.sqrt(Math.max(0, adjustedR * adjustedR - innerDy * innerDy)) - Math.sqrt(adjustedR * adjustedR - halfDiameter * halfDiameter);
            const exitX = rightCenter + innerDx;
            
            const slope = (focusY - innerY) / (focusX - exitX);
            const screenY = innerY + slope * (screenX - exitX);
            
            ctx.beginPath();
            ctx.moveTo(0, rayY);
            ctx.lineTo(entryX, rayY);
            ctx.lineTo(exitX, innerY);
            ctx.lineTo(screenX, screenY);
            ctx.stroke();
            
            if (i === Math.floor(numRays / 2)) {
                ctx.beginPath();
                ctx.arc(focusX, focusY, 3, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.fill();
            }
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
            
            errorInfo.textContent = 'Расчет выполнен успешно!';
            errorInfo.style.color = 'green';
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