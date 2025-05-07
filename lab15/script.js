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
        resetButton.addEventListener('click', resetMeasurements);

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        
        rulerLContainer.addEventListener('mousedown', handleRulerLMouseDown);
        
        window.addEventListener('mousemove', handleRulerLMouseMove);
        window.addEventListener('mouseup', handleRulerLMouseUp);
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
        errorInfo.textContent = 'Все результаты сброшены.';
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
        
        const v_calculated = C_LIGHT / n_calculated;
        
        const v_theoretical = C_LIGHT / substance.n_actual;

        const error_n = Math.abs((n_calculated - substance.n_actual) / substance.n_actual) * 100;
        
        calculatedResults[currentSubstanceId] = {
            name: substance.name,
            F: F_measured,
            l: measuredCircumference,
            R: R_measured,
            n_calc: n_calculated,
            v_calc: v_calculated,
            v_theor: v_theoretical,
            error_n: error_n
        };

        updateTable();
    }

    function drawSimulation() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const substance = substances[currentSubstanceId];
        const currentR = measuredCircumference / (2 * Math.PI);

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

        const numRays = 7;
        const raySpacing = (currentR * 1.6) / (numRays - 1);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        for (let i = 0; i < numRays; i++) {
            const y = LENS_CENTER_Y - currentR * 0.8 + i * raySpacing;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(LENS_CENTER_X - Math.sqrt(Math.max(0, currentR**2 - (y - LENS_CENTER_Y)**2)), y);
            ctx.stroke();
        }

        const F_ideal = currentR / (2 * (substance.n_actual - 1));
        const focusPointX = LENS_CENTER_X + F_ideal;

        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < numRays; i++) {
            const y_start = LENS_CENTER_Y - currentR * 0.8 + i * raySpacing;
            
            const x_refract = LENS_CENTER_X + Math.sqrt(Math.max(0, currentR**2 - (y_start - LENS_CENTER_Y)**2));

            ctx.beginPath();
            
            ctx.moveTo(x_refract, y_start);
            ctx.lineTo(focusPointX, LENS_CENTER_Y);
            
            const lineEndX = canvas.width;
            
            const lineEndY = y_start + (LENS_CENTER_Y - y_start) * (lineEndX - x_refract) / (focusPointX - x_refract);
            ctx.lineTo(lineEndX, lineEndY);

            ctx.stroke();
        }
        
        ctx.beginPath();
        ctx.strokeStyle = '#00008B';
        ctx.lineWidth = isDraggingScreen ? 4 : 2;
        ctx.moveTo(screenX, 50);
        ctx.lineTo(screenX, canvas.height - 50);
        ctx.stroke();

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
                <td>${(res.v_calc / 1e8).toFixed(4)}</td>
                <td>${(res.v_theor / 1e8).toFixed(4)}</td>
                <td>${res.error_n.toFixed(2)}</td>
            `;
        }
    }

    init();
});
