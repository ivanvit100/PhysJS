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
    
        // Отрисовка сферической линзы
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
    
        // Расчет фокусного расстояния с учетом физической достоверности
        let n_effective = substance.n_actual;
        
        // Максимальное эффективное значение n, при котором фокус остается за пределами линзы
        const maxNForExternalFocus = 1 + currentR / (2 * (currentR + 10));
        
        // Если n слишком высок, корректируем эффективное значение для визуализации
        if (substance.n_actual > maxNForExternalFocus) {
            n_effective = maxNForExternalFocus;
        }
        
        const F_ideal = currentR / (2 * (n_effective - 1));
        const focusPointX = LENS_CENTER_X + F_ideal;
    
        const numRays = 7;
        const raySpacing = (currentR * 1.6) / (numRays - 1);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        
        const rayPositions = [];
        
        // Рисуем входящие лучи
        for (let i = 0; i < numRays; i++) {
            const y = LENS_CENTER_Y - currentR * 0.8 + i * raySpacing;
            const entryX = LENS_CENTER_X - Math.sqrt(Math.max(0, currentR**2 - (y - LENS_CENTER_Y)**2));
            
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(entryX, y);
            ctx.stroke();
            
            rayPositions.push({
                entry_y: y,
                distance_from_axis: y - LENS_CENTER_Y,
                entry_x: entryX
            });
        }
    
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < rayPositions.length; i++) {
            const ray = rayPositions[i];
            
            // Находим точку выхода из линзы
            const x_refract = LENS_CENTER_X + Math.sqrt(Math.max(0, currentR**2 - (ray.entry_y - LENS_CENTER_Y)**2));
            
            // Рассчитываем аберрацию - лучи дальше от оси имеют немного другой фокус
            const distanceFromAxis = Math.abs(ray.distance_from_axis);
            const aberrationFactor = 1 - 0.05 * Math.pow(distanceFromAxis / currentR, 2);
            
            // Рассчитываем эффективное фокусное расстояние с учетом аберрации
            let effectiveFocalLength = F_ideal * aberrationFactor;
            
            // Минимальное допустимое фокусное расстояние - чуть больше радиуса
            const minFocalLength = currentR + 10;
            if (effectiveFocalLength < minFocalLength) {
                effectiveFocalLength = minFocalLength;
            }
            
            const effectiveFocusX = LENS_CENTER_X + effectiveFocalLength;
            
            // Направление луча после выхода из линзы - к фокусу
            const rayDirection = Math.atan2(LENS_CENTER_Y - ray.entry_y, effectiveFocusX - x_refract);
            
            // Проверка на пересечение с окружностью - математически точный метод
            let shouldDraw = true;
            
            // Вектор направления преломленного луча внутри сферы
            const dirX = Math.cos(rayDirection);
            const dirY = Math.sin(rayDirection);
            
            // Проверяем пересечение луча с окружностью
            // Точка старта - точка выхода из линзы
            const startX = x_refract;
            const startY = ray.entry_y;
            
            // Уравнение для пересечения луча с окружностью
            const a = dirX*dirX + dirY*dirY;
            const b = 2*((startX - LENS_CENTER_X)*dirX + (startY - LENS_CENTER_Y)*dirY);
            const c = (startX - LENS_CENTER_X)*(startX - LENS_CENTER_X) + 
                    (startY - LENS_CENTER_Y)*(startY - LENS_CENTER_Y) - 
                    currentR*currentR;
            
            // Решаем квадратное уравнение
            const discriminant = b*b - 4*a*c;
            
            // Если дискриминант > 0, то есть 2 точки пересечения
            if (discriminant > 0) {
                const t1 = (-b + Math.sqrt(discriminant)) / (2*a);
                const t2 = (-b - Math.sqrt(discriminant)) / (2*a);
                
                // Нас интересуют только положительные значения t (движение вперед)
                // и отбрасываем очень маленькие t (это текущая точка выхода)
                const possibleT = [t1, t2].filter(t => t > 0.01);
                
                // Если есть хотя бы одно пересечение впереди, луч пересекает сферу
                if (possibleT.length > 0) {
                    shouldDraw = false;
                }
            }
            
            // Дополнительная проверка для случая, когда луч направлен через фокус
            if (shouldDraw && substance.n_actual <= maxNForExternalFocus) {
                // Направление от точки выхода к фокусу
                const toFocusX = effectiveFocusX - x_refract;
                const toFocusY = LENS_CENTER_Y - ray.entry_y;
                const toFocusLength = Math.sqrt(toFocusX*toFocusX + toFocusY*toFocusY);
                
                // Нормализованный вектор направления
                const dirToFocusX = toFocusX / toFocusLength;
                const dirToFocusY = toFocusY / toFocusLength;
                
                // Проверяем, пересекает ли линия от точки выхода к фокусу сферу
                const a2 = dirToFocusX*dirToFocusX + dirToFocusY*dirToFocusY;
                const b2 = 2*((x_refract - LENS_CENTER_X)*dirToFocusX + (ray.entry_y - LENS_CENTER_Y)*dirToFocusY);
                const c2 = (x_refract - LENS_CENTER_X)*(x_refract - LENS_CENTER_X) + 
                          (ray.entry_y - LENS_CENTER_Y)*(ray.entry_y - LENS_CENTER_Y) - 
                          currentR*currentR;
                
                // Решаем квадратное уравнение
                const discriminant2 = b2*b2 - 4*a2*c2;
                
                if (discriminant2 > 0) {
                    const t1 = (-b2 + Math.sqrt(discriminant2)) / (2*a2);
                    const t2 = (-b2 - Math.sqrt(discriminant2)) / (2*a2);
                    
                    // Нас интересуют только положительные t, меньшие расстояния до фокуса
                    const possibleT = [t1, t2].filter(t => t > 0.01 && t < toFocusLength);
                    
                    if (possibleT.length > 0) {
                        shouldDraw = false;
                    }
                }
            }
            
            if (shouldDraw) {
                // Рисуем путь луча внутри линзы и после выхода
                ctx.beginPath();
                ctx.moveTo(ray.entry_x, ray.entry_y);
                
                // Подбираем цвет луча внутри линзы
                ctx.strokeStyle = 'rgba(255, 150, 150, 0.5)';
                ctx.lineTo(x_refract, ray.entry_y);
                ctx.stroke();
                
                // Рисуем луч после выхода из линзы
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                
                // Рассчитываем точку на экране
                const screenY = ray.entry_y + Math.tan(rayDirection) * (screenX - x_refract);
                
                ctx.moveTo(x_refract, ray.entry_y);
                
                // Если фокус внутри линзы из-за высокого n, рисуем лучи без перегиба
                if (substance.n_actual > maxNForExternalFocus) {
                    // Просто продолжаем луч от точки выхода
                    ctx.lineTo(screenX, screenY);
                } else {
                    // Обычное поведение - луч идет через фокус
                    ctx.lineTo(effectiveFocusX, LENS_CENTER_Y);
                    ctx.lineTo(screenX, screenY);
                }
                
                ctx.stroke();
                
                // Сохраняем точку пересечения с экраном
                ray.screen_x = screenX;
                ray.screen_y = screenY;
            } else {
                // Для лучей, которые не рисуем полностью, рисуем только начальный путь внутри линзы
                ctx.beginPath();
                ctx.moveTo(ray.entry_x, ray.entry_y);
                ctx.strokeStyle = 'rgba(255, 150, 150, 0.3)';
                const partialPath = ray.entry_x + (x_refract - ray.entry_x) * 0.7;
                ctx.lineTo(partialPath, ray.entry_y);
                ctx.stroke();
                
                // Помечаем, что этот луч не дошел до экрана
                ray.screen_x = null;
                ray.screen_y = null;
            }
        }
        
        // Отмечаем фокусную точку
        ctx.beginPath();
        ctx.arc(focusPointX, LENS_CENTER_Y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fill();
        
        // Остальной код остается прежним...
        // Отрисовка экрана
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
        
        // Отрисовка точек на экране и светового пятна
        const distanceFromFocus = Math.abs(screenX - focusPointX);
        const maxDistance = canvas.width / 2;
        const relativeDistance = Math.min(1, distanceFromFocus / maxDistance);
        
        let visibleRays = 0;
        for (let i = 0; i < rayPositions.length; i++) {
            const ray = rayPositions[i];
            
            if (ray.screen_x !== null && ray.screen_y !== null &&
                ray.screen_y >= screenY && ray.screen_y <= screenY + screenHeight) {
                const dotSize = 2 + relativeDistance * 8;
                const dotOpacity = 0.7 - relativeDistance * 0.5;
                
                ctx.beginPath();
                ctx.arc(ray.screen_x, ray.screen_y, dotSize, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(255, 220, 150, ${dotOpacity})`;
                ctx.fill();
                visibleRays++;
            }
        }
        
        // Создаем световое пятно на экране только если есть видимые лучи
        if (visibleRays > 0) {
            const minImageSize = 5;
            const maxImageSize = 60;
            const imageSize = minImageSize + relativeDistance * (maxImageSize - minImageSize);
            
            const minOpacity = 0.1;
            const maxOpacity = 0.8;
            const imageOpacity = maxOpacity - relativeDistance * (maxOpacity - minOpacity);
            
            const windowX = screenX;
            const windowY = LENS_CENTER_Y;
            
            const gradient = ctx.createRadialGradient(
                windowX, windowY, 0,
                windowX, windowY, imageSize
            );
            gradient.addColorStop(0, `rgba(255, 215, 0, ${imageOpacity})`);
            gradient.addColorStop(0.2, `rgba(255, 165, 0, ${imageOpacity * 0.7})`);
            gradient.addColorStop(1, `rgba(255, 69, 0, 0)`);
            
            ctx.beginPath();
            ctx.arc(windowX, windowY, imageSize, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            const windowLineSize = imageSize * 0.7;
            ctx.strokeStyle = `rgba(255, 255, 255, ${imageOpacity * 0.9})`;
            ctx.lineWidth = 1 + (1 - relativeDistance) * 2;
            ctx.beginPath();
            ctx.moveTo(windowX - windowLineSize/2, windowY);
            ctx.lineTo(windowX + windowLineSize/2, windowY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(windowX, windowY - windowLineSize/2);
            ctx.lineTo(windowX, windowY + windowLineSize/2);
            ctx.stroke();
        }
    
        // Отрисовка линии фокусного расстояния
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
