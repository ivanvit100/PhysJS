window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');
    const substanceSelect = document.getElementById('substance-select');
    const resultsBody = document.getElementById('results-body');
    const calculateButton = document.getElementById('calculate-button');
    const resetButton = document.getElementById('reset-button');
    const errorInfo = document.getElementById('error-info');

    const radiusDisplay = document.getElementById('radius-display');
    const circumferenceDisplay = document.getElementById('circumference-display');
    const focusDisplay = document.getElementById('focus-display');
    const lValueDisplay = document.getElementById('l-value');
    const fValueDisplay = document.getElementById('f-value');
    const rulerLContainer = document.getElementById('ruler-l');
    const rulerLLine = rulerLContainer.querySelector('.ruler-line-l');
    const rulerFLabel = document.querySelector('.ruler-label-f');

    const C_LIGHT = 3e8;

    const LENS_CENTER_X = 150;
    const LENS_CENTER_Y = canvas.height / 2;
    const FLASK_RADIUS = 60;
    let screenX = LENS_CENTER_X + FLASK_RADIUS + 100;
    let measuredFocus = null;
    let measuredCircumference = FLASK_RADIUS * 2 * Math.PI;

    const substances = {
        water: { name: 'Вода', n_actual: 1.333, color: 'rgba(173, 216, 230, 0.6)' },
        glycerin: { name: 'Глицерин', n_actual: 1.474, color: 'rgba(211, 211, 211, 0.7)' },
        oil: { name: 'Растительное масло', n_actual: 1.470, color: 'rgba(240, 230, 140, 0.6)' },
        ethylene_glycol: { name: 'Этиленгликоль', n_actual: 1.43, color: 'rgba(144, 238, 144, 0.6)' },
        gelatin: { name: 'Желатин', n_actual: 1.525, color: 'rgba(210, 180, 140, 0.7)' },
        silicone_oil: { name: 'Силиконовое масло', n_actual: 1.41, color: 'rgba(192, 192, 192, 0.6)' },
        air: { name: 'Воздух', n_actual: 1.0003, color: 'rgba(245, 245, 245, 0.3)' }
    };
    let currentSubstanceId = 'water';
    let calculatedResults = {};

    let isDraggingScreen = false;
    let isDraggingRulerL = false;
    let dragStartX = 0;
    let initialScreenX = 0;
    let initialRulerLWidth = 0;

    function init() {
        updateDisplays();
        drawSimulation();
        setupEventListeners();
        rulerLLine.style.width = `${measuredCircumference / Math.PI}px`;
        lValueDisplay.textContent = measuredCircumference.toFixed(1);
    }

    function setupEventListeners() {
        substanceSelect.addEventListener('change', handleSubstanceChange);
        calculateButton.addEventListener('click', handleCalculation);

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        
        rulerLContainer.addEventListener('mousedown', handleRulerLMouseDown);
        
        window.addEventListener('mousemove', handleRulerLMouseMove);
        window.addEventListener('mouseup', handleRulerLMouseUp);

        document.getElementById('reset-btn').addEventListener('click', () => {
            resetMeasurements();
        });
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = window.location.origin;
        });
    }
    
    function handleSubstanceChange() {
        currentSubstanceId = substanceSelect.value;
        resetMeasurementsForCurrentSubstance();
        drawSimulation();
        errorInfo.textContent = '';
    }

    function resetMeasurements() {
        calculatedResults = {};
        resultsBody.innerHTML = '';
        resetMeasurementsForCurrentSubstance();
    }

    function resetMeasurementsForCurrentSubstance() {
        screenX = LENS_CENTER_X + FLASK_RADIUS + 100;
        measuredFocus = null;
        
        measuredCircumference = FLASK_RADIUS * 2 * Math.PI;
        rulerLLine.style.width = `${measuredCircumference / Math.PI}px`;
        updateDisplays();
        drawSimulation();
    }

    function handleMouseDown(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        
        if (mouseX >= screenX - 5 && mouseX <= screenX + 5) {
            isDraggingScreen = true;
            dragStartX = mouseX;
            initialScreenX = screenX;
            canvas.classList.add('dragging');
            errorInfo.textContent = '';
        }
    }

    function handleRulerLMouseDown(event) {
        isDraggingRulerL = true;
        dragStartX = event.clientX;
        initialRulerLWidth = parseFloat(rulerLLine.style.width) || (FLASK_RADIUS * 2);
        rulerLContainer.style.cursor = 'grabbing';
        event.preventDefault();
    }

    function handleMouseMove(event) {
        if (!isDraggingScreen) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const deltaX = mouseX - dragStartX;
        screenX = initialScreenX + deltaX;

        
        screenX = Math.max(LENS_CENTER_X + FLASK_RADIUS / 2, screenX);
        screenX = Math.min(canvas.width - 10, screenX);

        measuredFocus = screenX - LENS_CENTER_X;
        updateDisplays();
        drawSimulation();
    }

    function handleRulerLMouseMove(event) {
        if (!isDraggingRulerL) return;

        const currentX = event.clientX;
        const deltaX = currentX - dragStartX;

        const newWidth = Math.max(10, initialRulerLWidth + deltaX * 0.5);
        rulerLLine.style.width = `${newWidth}px`;

        measuredCircumference = newWidth * Math.PI;
        lValueDisplay.textContent = measuredCircumference.toFixed(1);
        
        const calculatedR = measuredCircumference / (2 * Math.PI);
        radiusDisplay.textContent = calculatedR.toFixed(1);
        circumferenceDisplay.textContent = measuredCircumference.toFixed(1);
    }

    function handleMouseUp() {
        if (isDraggingScreen) {
            isDraggingScreen = false;
            canvas.classList.remove('dragging');
            
            updateDisplays();
        }
    }

    function handleRulerLMouseUp() {
        if (isDraggingRulerL) {
            isDraggingRulerL = false;
            rulerLContainer.style.cursor = 'ew-resize';
            
            updateDisplays();
            drawSimulation();
        }
    }

    function handleMouseLeave() {
        if (isDraggingScreen) {
            isDraggingScreen = false;
            canvas.classList.remove('dragging');
            updateDisplays();
        }
    }

    function drawSimulation() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);    
        const substance = substances[currentSubstanceId];
        const currentR = measuredCircumference / (2 * Math.PI);
    
        // ======= ОТРИСОВКА СФЕРИЧЕСКОЙ КОЛБЫ =======
        ctx.beginPath();
        ctx.arc(LENS_CENTER_X, LENS_CENTER_Y, currentR, 0, 2 * Math.PI);
        ctx.fillStyle = substance.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    
        ctx.beginPath();
        ctx.arc(LENS_CENTER_X, LENS_CENTER_Y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
    
        // ======= ОТРИСОВКА ОПТИЧЕСКОЙ ОСИ =======
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, LENS_CENTER_Y);
        ctx.lineTo(canvas.width, LENS_CENTER_Y);
        ctx.stroke();
        ctx.setLineDash([]);
    
        // ======= РАСЧЕТ ФОКУСНОГО РАССТОЯНИЯ =======
        const n_liquid = substance.n_actual;
        const F_ideal = currentR / (2 * (n_liquid - 1));
        const focusPointX = LENS_CENTER_X + F_ideal;
    
        // ======= ПАРАМЕТРЫ ТРАССИРОВКИ ЛУЧЕЙ =======
        const numRaysPerSide = 4;
        const raySpacing = (currentR * 0.8) / numRaysPerSide;
        
        let intersectionPointsX = [];
        let intersectionPointsY = [];
        
        // ======= ОСНОВНОЙ ЦИКЛ ТРАССИРОВКИ ЛУЧЕЙ =======
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i <= numRaysPerSide; i++) {
                if (side === 1 && i === 0) continue;
                
                const rayY = LENS_CENTER_Y + side * i * raySpacing;
                const isCentralRay = Math.abs(rayY - LENS_CENTER_Y) < 2;
                
                // Рассчитаем расстояние от оптической оси (для коррекции аберрации)
                const distanceFromAxis = Math.abs(rayY - LENS_CENTER_Y);
                const normalizedDistance = distanceFromAxis / currentR; // от 0 до 1
                
                // ======= РАСЧЕТ ТОЧКИ ВХОДА ЛУЧА В КОЛБУ =======
                const dy = rayY - LENS_CENTER_Y;
                const entryX = LENS_CENTER_X - Math.sqrt(Math.max(0, currentR**2 - dy**2));
                
                // Отрисовка падающего луча до точки входа
                ctx.beginPath();
                ctx.moveTo(0, rayY);
                ctx.lineTo(entryX, rayY);
                ctx.stroke();
                
                // ======= ОБРАБОТКА ЦЕНТРАЛЬНОГО ЛУЧА =======
                if (isCentralRay) {
                    const exitX = LENS_CENTER_X + Math.sqrt(Math.max(0, currentR**2 - dy**2));
                    
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255, 150, 150, 0.6)';
                    ctx.moveTo(entryX, rayY);
                    ctx.lineTo(exitX, rayY);
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.strokeStyle = 'red';
                    ctx.moveTo(exitX, rayY);
                    ctx.lineTo(screenX, rayY);
                    ctx.stroke();
                    continue;
                }
                
                // ======= РАСЧЕТ ПРЕЛОМЛЕНИЯ НА ВХОДЕ В КОЛБУ =======
                const entryNormalX = entryX - LENS_CENTER_X;
                const entryNormalY = rayY - LENS_CENTER_Y;
                const entryNormalLength = Math.sqrt(entryNormalX**2 + entryNormalY**2);
                
                const entryNormalizedX = -entryNormalX / entryNormalLength;
                const entryNormalizedY = -entryNormalY / entryNormalLength;
                
                // УСИЛЕННАЯ КОРРЕКЦИЯ: Более агрессивная коррекция аберрации для крайних лучей
                const n1 = 1.0; // Воздух
                
                // ИЗМЕНЕНО: Усиленная коррекция аберрации с кубической зависимостью
                const aberrationCorrection = 0.4 * Math.pow(normalizedDistance, 3);
                const n2_effective = n_liquid - aberrationCorrection * (n_liquid - 1);
                
                const incidentX = 1.0;
                const incidentY = 0.0;
                const incidentDotNormal = incidentX * entryNormalizedX + incidentY * entryNormalizedY;
                
                const refractedX = (n1/n2_effective) * incidentX - (n1/n2_effective * incidentDotNormal - 
                                  Math.sqrt(1 - (n1/n2_effective)**2 * (1 - incidentDotNormal**2))) * 
                                  entryNormalizedX;
                                  
                const refractedY = (n1/n2_effective) * incidentY - (n1/n2_effective * incidentDotNormal - 
                                  Math.sqrt(1 - (n1/n2_effective)**2 * (1 - incidentDotNormal**2))) * 
                                  entryNormalizedY;
                
                const refractedLength = Math.sqrt(refractedX**2 + refractedY**2);
                const refractedNormalizedX = refractedX / refractedLength;
                const refractedNormalizedY = refractedY / refractedLength;
                
                // ======= НАХОЖДЕНИЕ ТОЧКИ ВЫХОДА ИЗ КОЛБЫ =======
                let exitX = entryX;
                let exitY = rayY;
                let stepSize = 0.5;
                
                for (let step = 0; step < 2000; step++) {
                    const prevX = exitX;
                    const prevY = exitY;
                    
                    exitX += refractedNormalizedX * stepSize;
                    exitY += refractedNormalizedY * stepSize;
                    
                    const distToCenter = Math.sqrt((exitX - LENS_CENTER_X)**2 + (exitY - LENS_CENTER_Y)**2);
                    
                    if (distToCenter >= currentR) {
                        const prevDist = Math.sqrt((prevX - LENS_CENTER_X)**2 + (prevY - LENS_CENTER_Y)**2);
                        const ratio = (currentR - prevDist) / (distToCenter - prevDist);
                        
                        exitX = prevX + ratio * (exitX - prevX);
                        exitY = prevY + ratio * (exitY - prevY);
                        break;
                    }
                }
                
                // Отрисовка луча внутри колбы
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 150, 150, 0.6)';
                ctx.moveTo(entryX, rayY);
                ctx.lineTo(exitX, exitY);
                ctx.stroke();
                
                // ======= РАСЧЕТ ПРЕЛОМЛЕНИЯ НА ВЫХОДЕ ИЗ КОЛБЫ =======
                const exitNormalX = exitX - LENS_CENTER_X;
                const exitNormalY = exitY - LENS_CENTER_Y;
                const exitNormalLength = Math.sqrt(exitNormalX**2 + exitNormalY**2);
                
                const exitNormalizedX = exitNormalX / exitNormalLength;
                const exitNormalizedY = exitNormalY / exitNormalLength;
                
                const n3_effective = n2_effective;
                const n4 = 1.0;
                
                const exitIncidentX = refractedNormalizedX;
                const exitIncidentY = refractedNormalizedY;
                
                const exitIncidentDotNormal = exitIncidentX * exitNormalizedX + exitIncidentY * exitNormalizedY;
                
                const criticalAngle = Math.sqrt(1 - (n4/n3_effective)**2);
                if (Math.abs(exitIncidentDotNormal) < criticalAngle) {
                    continue;
                }
                
                // ИЗМЕНЕНО: Усилена коррекция для всех лучей не на оси
                // Направляем все лучи к теоретической фокусной точке с весовым коэффициентом
                const targetFocusX = focusPointX;
                const targetFocusY = LENS_CENTER_Y;
                
                let exitRefractedX, exitRefractedY;
                
                // ИЗМЕНЕНО: Начинаем коррекцию с меньшего порога (0.2 вместо 0.4)
                // и используем более агрессивную кривую смешивания
                if (normalizedDistance > 0.2) {
                    // Усиленный коэффициент смешивания для крайних лучей
                    const blendFactor = Math.min(1, Math.pow(normalizedDistance * 1.5, 2));
                    
                    // Направление на идеальный фокус
                    const toFocusX = targetFocusX - exitX;
                    const toFocusY = targetFocusY - exitY;
                    const toFocusLength = Math.sqrt(toFocusX**2 + toFocusY**2);
                    const toFocusNormX = toFocusX / toFocusLength;
                    const toFocusNormY = toFocusY / toFocusLength;
                    
                    // Стандартное преломление по Снеллиусу
                    const stdRefractedX = (n3_effective/n4) * exitIncidentX - (n3_effective/n4 * exitIncidentDotNormal - 
                                        Math.sqrt(1 - (n3_effective/n4)**2 * (1 - exitIncidentDotNormal**2))) * 
                                        exitNormalizedX;
                                        
                    const stdRefractedY = (n3_effective/n4) * exitIncidentY - (n3_effective/n4 * exitIncidentDotNormal - 
                                        Math.sqrt(1 - (n3_effective/n4)**2 * (1 - exitIncidentDotNormal**2))) * 
                                        exitNormalizedY;
                    
                    // Смешиваем стандартное преломление и направление к фокусу
                    // с усиленным влиянием вектора направления к фокусу
                    exitRefractedX = stdRefractedX * (1 - blendFactor) + toFocusNormX * blendFactor;
                    exitRefractedY = stdRefractedY * (1 - blendFactor) + toFocusNormY * blendFactor;
                } else {
                    // Для лучей ближе к оси используем стандартное преломление
                    exitRefractedX = (n3_effective/n4) * exitIncidentX - (n3_effective/n4 * exitIncidentDotNormal - 
                                    Math.sqrt(1 - (n3_effective/n4)**2 * (1 - exitIncidentDotNormal**2))) * 
                                    exitNormalizedX;
                                    
                    exitRefractedY = (n3_effective/n4) * exitIncidentY - (n3_effective/n4 * exitIncidentDotNormal - 
                                    Math.sqrt(1 - (n3_effective/n4)**2 * (1 - exitIncidentDotNormal**2))) * 
                                    exitNormalizedY;
                }
                
                // Нормализуем выходящий луч
                const exitRefractedLength = Math.sqrt(exitRefractedX**2 + exitRefractedY**2);
                const exitRefractedNormalizedX = exitRefractedX / exitRefractedLength;
                const exitRefractedNormalizedY = exitRefractedY / exitRefractedLength;
                
                // ======= РАСЧЕТ ПУТИ ЛУЧА ДО ЭКРАНА =======
                const t_screen = (screenX - exitX) / exitRefractedNormalizedX;
                const screenY = exitY + exitRefractedNormalizedY * t_screen;
                
                // Отрисовка луча после выхода из колбы до экрана
                ctx.beginPath();
                ctx.strokeStyle = 'red';
                ctx.moveTo(exitX, exitY);
                ctx.lineTo(screenX, screenY);
                ctx.stroke();
                
                // ======= РАСЧЕТ ТОЧЕК ПЕРЕСЕЧЕНИЯ ДЛЯ ФОКУСА =======
                if (!isCentralRay && Math.abs(exitRefractedNormalizedY) > 0.001) {
                    const intersectionX = exitX + exitRefractedNormalizedX * (LENS_CENTER_Y - exitY) / exitRefractedNormalizedY;
                    
                    if (intersectionX > LENS_CENTER_X && intersectionX < canvas.width) {
                        intersectionPointsX.push(intersectionX);
                        intersectionPointsY.push(LENS_CENTER_Y);
                    }
                }
                
                // Отрисовка точки на экране
                if (screenY >= 50 && screenY <= canvas.height - 50) {
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, 3, 0, 2 * Math.PI);
                    ctx.fillStyle = 'rgba(255, 220, 150, 0.7)';
                    ctx.fill();
                }
            }
        }
        
        // ======= ОТОБРАЖЕНИЕ ФОКУСНОГО РАССТОЯНИЯ =======
        if (intersectionPointsX.length > 0) {
            let sumX = 0;
            for (let i = 0; i < intersectionPointsX.length; i++) {
                sumX += intersectionPointsX[i];
            }
            
            const measuredFocalX = sumX / intersectionPointsX.length;
            const measuredFocalLength = measuredFocalX - LENS_CENTER_X;
            
            measuredFocus = measuredFocalLength;
            
            ctx.beginPath();
            ctx.arc(measuredFocalX, LENS_CENTER_Y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fill();
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.font = '12px Arial';
            ctx.fillText(`F = ${measuredFocalLength.toFixed(1)}`, measuredFocalX + 10, LENS_CENTER_Y - 15);
        }
        
        // Отрисовка теоретической фокусной точки
        ctx.beginPath();
        ctx.arc(focusPointX, LENS_CENTER_Y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fill();
        
        // ======= ОТРИСОВКА ЭКРАНА И ОСТАЛЬНЫЕ ЭЛЕМЕНТЫ БЕЗ ИЗМЕНЕНИЙ =======
        const screenWidth = 15;
        const screenHeight = canvas.height - 100;
        const screenY = 50;
        
        ctx.fillStyle = '#e0e0e0';
        ctx.strokeStyle = isDraggingScreen ? '#0056b3' : '#00008B';
        ctx.lineWidth = isDraggingScreen ? 4 : 2;
        ctx.beginPath();
        ctx.rect(screenX - screenWidth/2, screenY, screenWidth, screenHeight);
        ctx.fill();
        ctx.stroke();
        
        // Остальной код без изменений...
        
        // ======= ОТРИСОВКА СВЕТОВОГО ПЯТНА НА ЭКРАНЕ =======
        if (measuredFocus !== null) {
            const distanceFromFocus = Math.abs(screenX - focusPointX);
            const maxDistance = canvas.width / 2;
            const relativeDistance = Math.min(1, distanceFromFocus / maxDistance);
            
            const minImageSize = 5;
            const maxImageSize = 60;
            const imageSize = minImageSize + relativeDistance * (maxImageSize - minImageSize);
            
            const minOpacity = 0.1;
            const maxOpacity = 0.8;
            const imageOpacity = maxOpacity - relativeDistance * (maxOpacity - minOpacity);
            
            const gradient = ctx.createRadialGradient(
                screenX, LENS_CENTER_Y, 0,
                screenX, LENS_CENTER_Y, imageSize
            );
            gradient.addColorStop(0, `rgba(255, 215, 0, ${imageOpacity})`);
            gradient.addColorStop(0.2, `rgba(255, 165, 0, ${imageOpacity * 0.7})`);
            gradient.addColorStop(1, `rgba(255, 69, 0, 0)`);
            
            ctx.beginPath();
            ctx.arc(screenX, LENS_CENTER_Y, imageSize, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            const windowLineSize = imageSize * 0.7;
            ctx.strokeStyle = `rgba(255, 255, 255, ${imageOpacity * 0.9})`;
            ctx.lineWidth = 1 + (1 - relativeDistance) * 2;
            ctx.beginPath();
            ctx.moveTo(screenX - windowLineSize/2, LENS_CENTER_Y);
            ctx.lineTo(screenX + windowLineSize/2, LENS_CENTER_Y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screenX, LENS_CENTER_Y - windowLineSize/2);
            ctx.lineTo(screenX, LENS_CENTER_Y + windowLineSize/2);
            ctx.stroke();
        }
        
        // ======= ОТРИСОВКА ЛИНИИ ФОКУСНОГО РАССТОЯНИЯ =======
        if (measuredFocus !== null) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(LENS_CENTER_X, LENS_CENTER_Y);
            ctx.lineTo(screenX, LENS_CENTER_Y);
            ctx.lineTo(screenX, canvas.height - 35);
            ctx.stroke();
            ctx.setLineDash([]);
            
            const rulerFWidth = document.getElementById('ruler-f').offsetWidth;
            const fPositionOnRuler = (screenX - LENS_CENTER_X) * (rulerFWidth / canvas.width);
            const rulerZeroX = LENS_CENTER_X * (rulerFWidth / canvas.width);
            rulerFLabel.style.left = `${rulerZeroX + fPositionOnRuler}px`;
        } else {
            rulerFLabel.style.left = `-1000px`;
        }
        
        updateDisplays();
    }

    function updateDisplays() {
        const R = measuredCircumference / (2 * Math.PI);
        radiusDisplay.textContent = R.toFixed(1);
        circumferenceDisplay.textContent = measuredCircumference.toFixed(1);
        lValueDisplay.textContent = measuredCircumference.toFixed(1);

        if (measuredFocus !== null) {
            focusDisplay.textContent = measuredFocus.toFixed(1);
            fValueDisplay.textContent = measuredFocus.toFixed(1);
        } else {
            focusDisplay.textContent = '?';
            fValueDisplay.textContent = '?';
        }
    }

    function updateTable() {
        resultsBody.innerHTML = '';
        for (const id in calculatedResults) {
            const res = calculatedResults[id];
            const row = resultsBody.insertRow();
            
            row.innerHTML = `
                <td>${res.name}</td>
                <td>${res.F.toFixed(1)}</td>
                <td>${res.l.toFixed(1)}</td>
                <td>${res.R.toFixed(1)}</td>
                <td>${res.n_calc.toFixed(4)}</td>
                <td><input type="text" class="velocity-input" data-id="${id}" data-type="calc" placeholder="?"></td>
                <td><input type="text" class="velocity-input" data-id="${id}" data-type="theor" placeholder="?"></td>
                <td id="error-${id}">${res.calcCorrect && res.theorCorrect ? res.error_n.toFixed(2) + '%' : '?'}</td>
                <td><button class="check-btn" data-id="${id}">${res.calcCorrect && res.theorCorrect ? "✓ Верно" : "Проверить"}</button></td>
            `;
            
            const calcInput = row.querySelector(`input[data-id="${id}"][data-type="calc"]`);
            const theorInput = row.querySelector(`input[data-id="${id}"][data-type="theor"]`);
            const errorCell = row.querySelector(`#error-${id}`);
            const checkButton = row.querySelector(`.check-btn[data-id="${id}"]`);
            
            if (res.userCalcValue)
                calcInput.value = res.userCalcValue;
            
            if (res.userTheorValue)
                theorInput.value = res.userTheorValue;
            
            if (res.calcCorrect) {
                calcInput.disabled = true;
                calcInput.style.borderColor = 'green';
            }
            
            if (res.theorCorrect) {
                theorInput.disabled = true;
                theorInput.style.borderColor = 'green';
            }
            
            if (res.calcCorrect && res.theorCorrect) {
                errorCell.style.color = 'green';
                checkButton.disabled = true;
                checkButton.style.backgroundColor = 'green';
            }
            
            checkButton.addEventListener('click', function() {
                const rowId = this.getAttribute('data-id');
                checkVelocityValues(rowId);
            });
        }
    }

    function checkVelocityValues(id) {
        const result = calculatedResults[id];
        
        const calcInput = document.querySelector(`input[data-id="${id}"][data-type="calc"]`);
        const theorInput = document.querySelector(`input[data-id="${id}"][data-type="theor"]`);
        const errorCell = document.getElementById(`error-${id}`);
        const checkButton = document.querySelector(`.check-btn[data-id="${id}"]`);
        
        const userCalcValue = parseFloat(calcInput.value) * 1e8;
        const userTheorValue = parseFloat(theorInput.value) * 1e8;
        
        const correctCalcValue = C_LIGHT / result.n_calc;
        const correctTheorValue = C_LIGHT / substances[id].n_actual;
        
        const calcTolerance = 0.05 * correctCalcValue;
        const theorTolerance = 0.05 * correctTheorValue;
        
        const calcCorrect = Math.abs(userCalcValue - correctCalcValue) <= calcTolerance;
        const theorCorrect = Math.abs(userTheorValue - correctTheorValue) <= theorTolerance;

        result.userCalcValue = calcInput.value;
        result.userTheorValue = theorInput.value;
        result.calcCorrect = calcCorrect;
        result.theorCorrect = theorCorrect;
        
        if (calcCorrect) {
            calcInput.value = (correctCalcValue / 1e8).toFixed(4);
            calcInput.disabled = true;
            calcInput.style.borderColor = 'green';
        } else {
            calcInput.style.borderColor = 'red';
        }
        
        if (theorCorrect) {
            theorInput.value = (correctTheorValue / 1e8).toFixed(4);
            theorInput.disabled = true;
            theorInput.style.borderColor = 'green';
        } else {
            theorInput.style.borderColor = 'red';
        }
        
        if (calcCorrect && theorCorrect) {
            errorCell.textContent = result.error_n.toFixed(2) + '%';
            errorCell.style.color = 'green';
            checkButton.disabled = true;
            checkButton.textContent = "✓ Верно";
            checkButton.style.backgroundColor = 'green';
        } else {
            errorCell.textContent = 'Проверьте значения';
            errorCell.style.color = 'red';
        }
    }

    function handleCalculation() {
        if (measuredFocus === null || measuredFocus <= 0) {
            errorInfo.textContent = 'Ошибка: Сначала измерьте фокусное расстояние F, переместив экран.';
            return;
        }
        if (measuredCircumference === null || measuredCircumference <= 0) {
            errorInfo.textContent = 'Ошибка: Сначала измерьте длину окружности L с помощью гибкой линейки.';
            return;
        }
    
        errorInfo.textContent = '';
    
        const substance = substances[currentSubstanceId];
        const R_measured = measuredCircumference / (2 * Math.PI);
        const F_measured = measuredFocus;
    
        const n_calculated = R_measured / (2 * F_measured) + 1;
        
        const existingResult = calculatedResults[currentSubstanceId];
        
        calculatedResults[currentSubstanceId] = {
            name: substance.name,
            F: F_measured,
            l: measuredCircumference,
            R: R_measured,
            n_calc: n_calculated,
            v_calc: C_LIGHT / n_calculated,
            v_theor: C_LIGHT / substance.n_actual,
            error_n: Math.abs((n_calculated - substance.n_actual) / substance.n_actual) * 100,
            userCalcValue: existingResult ? existingResult.userCalcValue : null,
            userTheorValue: existingResult ? existingResult.userTheorValue : null,
            calcCorrect: existingResult ? existingResult.calcCorrect : false,
            theorCorrect: existingResult ? existingResult.theorCorrect : false
        };
    
        updateTable();
    }

    init();

    const tabsContent = intro.createTabContent([
        'status-panel',
        'results-panel',
        'measurement-panel'
      ], 'tabs-container');
        
      const tabButtons = tabsContent.querySelectorAll('.info-content-buttons button');
      tabButtons[0].textContent = 'Порядок';
      tabButtons[1].textContent = 'Таблица';
      tabButtons[2].textContent = 'Результаты';
      
      intro.init([
        {
          title: 'Информация',
          description: 'Здесь вы можете ознакомиться с порядком выполнения лабораторной работы, теоретической моделью, и результатами эксперимента.',
          element: '#tabs-container'
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
      
      document.getElementById('guide-btn').addEventListener('click', () => {
        intro.start();
      });
});
