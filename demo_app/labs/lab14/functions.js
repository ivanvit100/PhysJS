const experimentFunctions = {
    experimentState: {
        step: 1,
        isDragging: false,
        currentDragElement: null,
        dragOffset: { x: 0, y: 0 },
        
        scale: 100,
        roomWidth: 700,
        roomHeight: 500,
        tolerance: 0.1,
        
        config: {
            acceptDrag: false, 
            fixedValues: {
                h: 1.7,
                l1: 2.0,
                l2: 1.0
            }
        },
        
        params: {
            h: 0,
            l1: 0,
            l2: 0,
            H: 0
        },
        
        measurements: {
            h: null,
            l1: null,
            l2: null,
            H: null
        },
        
        trueValues: {
            h: null,
            l1: null,
            l2: null,
            H: null
        },
        
        measurementComplete: {
            h: false,
            l1: false,
            l2: false,
            H: false
        }
    },
    
    initializeExperiment() {
        if (this.experimentState.config.acceptDrag) {
            this.generateExperimentParams();
        } else {
            const fixedValues = this.experimentState.config.fixedValues;
            this.experimentState.params.h = fixedValues.h;
            this.experimentState.params.l1 = fixedValues.l1;
            this.experimentState.params.l2 = fixedValues.l2;
            this.experimentState.params.H = (fixedValues.h * fixedValues.l1) / fixedValues.l2;
        }
        
        this.positionElements();
        this.setupEventHandlers();
        this.createPermanentLines();
        this.updateTrueValues();
        this.updateSightLines();
        this.updateTapeMeasurement();
        this.setupInputValidation();
        this.updateExperimentStep(1);
    },
    
    createPermanentLines() {
        const room = document.getElementById('room');
        if (!room) return;
        
        const incidentLine = document.createElement('div');
        incidentLine.className = 'line incident';
        incidentLine.id = 'incident-line';
        room.appendChild(incidentLine);
        
        const reflectionLine = document.createElement('div');
        reflectionLine.className = 'line reflection';
        reflectionLine.id = 'reflection-line';
        room.appendChild(reflectionLine);
        
        const dottedLine = document.createElement('div');
        dottedLine.className = 'line dotted';
        dottedLine.id = 'dotted-line';
        room.appendChild(dottedLine);
    },
    
    setupInputValidation() {
        const measurementPanel = document.getElementById('measurement-panel');
        if (!measurementPanel) return;
        
        const panelContent = measurementPanel.querySelector('.panel-content') || 
                              document.createElement('div');
                              
        if (!panelContent.classList.contains('panel-content')) {
            panelContent.className = 'panel-content';
            measurementPanel.appendChild(panelContent);
        }
        
        panelContent.innerHTML = '';
        
        const measurements = [
            { id: 'eye-height-input', label: 'Высота h (от пола до глаз):', value: '', unit: 'м', readonly: false },
            { id: 'distance-to-mirror-input', label: 'Расстояние l₁ (до зеркала):', value: '', unit: 'м', readonly: false },
            { id: 'person-to-mirror-input', label: 'Расстояние l₂ (от зеркала до человека):', value: '', unit: 'м', readonly: false },
            { id: 'room-height-input', label: 'Высота комнаты H:', value: '', unit: 'м', readonly: false }
        ];
        
        measurements.forEach(item => {
            const row = document.createElement('div');
            row.className = 'measurement-row' + (item.id === 'room-height-input' ? ' result' : '');
            
            const label = document.createElement('span');
            label.className = 'measurement-label';
            label.textContent = item.label;
            
            const valueContainer = document.createElement('span');
            valueContainer.className = 'measurement-value';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.id = item.id;
            input.value = item.value;
            input.readOnly = item.readonly;
            input.style.width = '60px';
            input.style.textAlign = 'right';
            input.style.marginRight = '5px';
            
            const unit = document.createElement('span');
            unit.textContent = item.unit;
            
            const validationMark = document.createElement('span');
            validationMark.className = 'validation-mark';
            validationMark.id = `${item.id}-validation`;
            validationMark.style.marginLeft = '10px';
            validationMark.style.fontWeight = 'bold';
            
            valueContainer.appendChild(input);
            valueContainer.appendChild(unit);
            valueContainer.appendChild(validationMark);
            
            row.appendChild(label);
            row.appendChild(valueContainer);
            panelContent.appendChild(row);
            
            input.addEventListener('input', () => {
                this.validateInput(item.id);
            });
        });
        
        const displayElements = [
            { id: 'eye-height', value: '-' },
            { id: 'distance-to-mirror', value: '-' },
            { id: 'person-to-mirror', value: '-' },
            { id: 'room-height', value: '-' }
        ];
        
        displayElements.forEach(item => {
            const span = document.createElement('span');
            span.id = item.id;
            span.style.display = 'none';
            span.textContent = item.value;
            panelContent.appendChild(span);
        });
    },
    
    updateTrueValues() {
        const state = this.experimentState;
        
        if (!state.config.acceptDrag) {
            const fixedValues = state.config.fixedValues;
            state.trueValues.h = fixedValues.h.toFixed(2);
            state.trueValues.l1 = fixedValues.l1.toFixed(2);
            state.trueValues.l2 = fixedValues.l2.toFixed(2);
            state.trueValues.H = ((fixedValues.h * fixedValues.l1) / fixedValues.l2).toFixed(2);
        } else {
            const room = document.getElementById('room');
            const person = document.getElementById('person');
            const mirror = document.getElementById('mirror');
            
            if (!room || !person || !mirror) return;
            
            const personRect = person.getBoundingClientRect();
            const mirrorRect = mirror.getBoundingClientRect();
            const roomRect = room.getBoundingClientRect();
            const head = person.querySelector('.head');
            const headHeight = head ? head.offsetHeight : 25;
            const eyeY = personRect.top + headHeight/2;
            const floorY = roomRect.bottom;
            state.trueValues.h = ((floorY - eyeY) / state.scale).toFixed(2);
            
            const wallX = roomRect.left;
            const mirrorX = mirrorRect.left + mirrorRect.width/2;
            state.trueValues.l1 = ((mirrorX - wallX) / state.scale).toFixed(2);
            
            const personX = personRect.left + personRect.width/2;
            state.trueValues.l2 = (Math.abs(personX - mirrorX) / state.scale).toFixed(2);
            
            const h = parseFloat(state.trueValues.h);
            const l1 = parseFloat(state.trueValues.l1);
            const l2 = parseFloat(state.trueValues.l2);
            
            state.trueValues.H = ((h * l1) / l2).toFixed(2);
        }
        
        this.validateAllInputs();
    },
    
    validateAllInputs() {
        const inputs = [
            'eye-height-input',
            'distance-to-mirror-input',
            'person-to-mirror-input',
            'room-height-input'
        ];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && input.value && input.value !== '') {
                this.validateInput(inputId);
            }
        });
    },
    
    validateInput(inputId) {
        const input = document.getElementById(inputId);
        const validationMark = document.getElementById(`${inputId}-validation`);
        
        if (!input || !validationMark) return;
        
        let correctValue;
        let tolerance = 0.05;
        
        switch (inputId) {
            case 'eye-height-input':
                correctValue = parseFloat(this.experimentState.trueValues.h);
                break;
            case 'distance-to-mirror-input':
                correctValue = parseFloat(this.experimentState.trueValues.l1);
                break;
            case 'person-to-mirror-input':
                correctValue = parseFloat(this.experimentState.trueValues.l2);
                break;
            case 'room-height-input':
                correctValue = parseFloat(this.experimentState.trueValues.H);
                break;
        }
        
        if (isNaN(correctValue)) {
            validationMark.textContent = '';
            return;
        }
        
        let inputValue;
        try {
            inputValue = parseFloat(input.value.replace(',', '.'));
        } catch (e) {
            validationMark.textContent = '❌';
            validationMark.style.color = 'red';
            return;
        }
        
        if (isNaN(inputValue)) {
            validationMark.textContent = '';
            return;
        }
        
        const difference = Math.abs(inputValue - correctValue);
        const percentDifference = difference / correctValue;
        
        if (percentDifference <= tolerance) {
            validationMark.textContent = '✓';
            validationMark.style.color = 'green';
            input.style.borderColor = '#4CAF50';
        } else {
            validationMark.textContent = '❌';
            validationMark.style.color = 'red';
            input.style.borderColor = '#F44336';
        }
    },
    
    generateExperimentParams() {
        const state = this.experimentState;
        
        state.params.h = 1.5 + Math.random() * 0.3;
        state.params.l1 = 1.0 + Math.random() * 1.5;
        state.params.l2 = 0.5 + Math.random() * 1.0;
        state.params.H = (state.params.h * state.params.l1) / state.params.l2;
    },
    
    positionElements() {
        const state = this.experimentState;
        const room = document.getElementById('room');
        const person = document.getElementById('person');
        const mirror = document.getElementById('mirror');
        const startPoint = document.getElementById('start-point');
        const endPoint = document.getElementById('end-point');
        
        if (!room || !person || !mirror || !startPoint || !endPoint) return;
        
        room.style.position = 'relative';
        person.style.position = 'absolute';
        mirror.style.position = 'absolute';
        startPoint.style.position = 'absolute';
        endPoint.style.position = 'absolute';
        
        let h, l1, l2;
        if (state.config.acceptDrag) {
            h = state.params.h;
            l1 = state.params.l1;
            l2 = state.params.l2;
        } else {
            h = state.config.fixedValues.h;
            l1 = state.config.fixedValues.l1;
            l2 = state.config.fixedValues.l2;
        }
        
        const personHeight = Math.round(h * state.scale);
        const headHeight = 25;
        const bodyHeight = personHeight - headHeight;
        
        if (!person.querySelector('.head')) {
            const head = document.createElement('div');
            head.className = 'head';
            person.appendChild(head);
        }
        
        if (!person.querySelector('.body')) {
            const body = document.createElement('div');
            body.className = 'body';
            person.appendChild(body);
        }
        
        person.querySelector('.body').style.height = `${bodyHeight}px`;
        
        const mirrorWidth = mirror.offsetWidth || 80;
        const personWidth = person.offsetWidth || 15;
        const mirrorCenterX = l1 * state.scale;
        const personCenterX = mirrorCenterX + l2 * state.scale;
        
        mirror.style.left = `${mirrorCenterX - mirrorWidth / 2}px`;
        mirror.style.bottom = '10px';
        
        person.style.left = `${personCenterX - personWidth / 2}px`;
        person.style.bottom = '10px';
        
        startPoint.style.left = '50px';
        startPoint.style.top = '100px';
        endPoint.style.left = '150px';
        endPoint.style.top = '100px';
        
        this.updateTapeMeasurement();
    },
    
    setupEventHandlers() {
        document.addEventListener('mousedown', (e) => {
            const element = e.target.closest('#start-point, #end-point');
            element && this.startDrag(e);
        });
        if (this.experimentState.config.acceptDrag) {
            document.addEventListener('mousedown', (e) => {
                const element = e.target.closest('#person, #mirror');
                element && this.startDrag(e);
            });
        }
        document.addEventListener('mousemove', (e) => {
            this.experimentState.isDragging && this.onDrag(e);
        });
        document.addEventListener('mouseup', () => {
            this.experimentState.isDragging && this.stopDrag();
        });
    },
    
    startDrag(e) {
        const element = e.target.closest('#person, #mirror, #start-point, #end-point');
        if (!element) return;
        if (!this.experimentState.config.acceptDrag && 
            (element.id === 'person' || element.id === 'mirror')) {
            return;
        }
        
        e.preventDefault();
        
        this.experimentState.isDragging = true;
        this.experimentState.currentDragElement = element;
        
        const rect = element.getBoundingClientRect();
        
        this.experimentState.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    },
    
    onDrag(e) {
        e.preventDefault();
        
        const state = this.experimentState;
        const element = state.currentDragElement;
        const room = document.getElementById('room');
        
        if (!element || !room) return;
        
        if (!state.config.acceptDrag && 
            (element.id === 'person' || element.id === 'mirror')) {
            this.stopDrag();
            return;
        }
        
        const roomRect = room.getBoundingClientRect();
        let x = e.clientX - roomRect.left - state.dragOffset.x;
        
        if (element.id === 'person' || element.id === 'mirror') {
            x = Math.max(10, Math.min(x, room.offsetWidth - element.offsetWidth - 10));
            
            element.style.left = `${x}px`;
            element.style.bottom = '10px';
            
            this.updateTrueValues();
            this.updateSightLines();
        } else {
            let y = e.clientY - roomRect.top - state.dragOffset.y;
            x = Math.max(0, Math.min(x, roomRect.width - 20));
            y = Math.max(0, Math.min(y, roomRect.height - 20));
            
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            
            this.updateTapeMeasurement();
        }
    },
    
    stopDrag() {
        this.experimentState.isDragging = false;
        
        if (this.experimentState.currentDragElement && 
            (this.experimentState.currentDragElement.id === 'person' || 
             this.experimentState.currentDragElement.id === 'mirror')) {
            this.updateTrueValues();
        }
        
        this.checkMeasurements();
        this.experimentState.step === 1 && this.isMirrorPositionedCorrectly() && this.updateExperimentStep(2);
        this.experimentState.currentDragElement = null;
    },
    
    isMirrorPositionedCorrectly() {
        const mirror = document.getElementById('mirror');
        const room = document.getElementById('room');
        
        if (!mirror || !room) return false;
        
        const mirrorLeft = parseInt(mirror.style.left || '0');
        return mirrorLeft >= 100;
    },
    
    updateTapeMeasurement() {
        const start = document.getElementById('start-point');
        const end = document.getElementById('end-point');
        const tapeLine = document.getElementById('tape-line');
        const display = document.getElementById('display');
        
        if (!start || !end || !tapeLine || !display) return;
        
        const startX = parseInt(start.style.left || '0') + start.offsetWidth / 2;
        const startY = parseInt(start.style.top || '0') + start.offsetHeight / 2;
        const endX = parseInt(end.style.left || '0') + end.offsetWidth / 2;
        const endY = parseInt(end.style.top || '0') + end.offsetHeight / 2;
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        tapeLine.style.width = `${distance}px`;
        tapeLine.style.left = `${startX}px`;
        tapeLine.style.top = `${startY}px`;
        tapeLine.style.transform = `rotate(${angle}deg)`;
        tapeLine.style.transformOrigin = '0 50%';
        
        const meters = (distance / this.experimentState.scale).toFixed(2);
        display.textContent = `${meters} м`;
        display.style.left = `${startX + dx / 2 - 25}px`;
        display.style.top = `${startY + dy / 2 - 25}px`;
    },
    
    updateLine(lineElement, x1, y1, x2, y2) {
        if (!lineElement) return;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        lineElement.style.width = `${length}px`;
        lineElement.style.left = `${x1}px`;
        lineElement.style.top = `${y1}px`;
        lineElement.style.transform = `rotate(${angle}deg)`;
        lineElement.style.transformOrigin = '0 50%';
    },
    
    updateSightLines() {
        const room = document.getElementById('room');
        const person = document.getElementById('person');
        const mirror = document.getElementById('mirror');
        
        if (!room || !person || !mirror) return;
        
        const incidentLine = document.getElementById('incident-line');
        const reflectionLine = document.getElementById('reflection-line');
        const dottedLine = document.getElementById('dotted-line');
        
        if (!incidentLine || !reflectionLine || !dottedLine) return;
        
        const head = person.querySelector('.head');
        const personRect = person.getBoundingClientRect();
        const headRect = head ? head.getBoundingClientRect() : null;
        const mirrorRect = mirror.getBoundingClientRect();
        const roomRect = room.getBoundingClientRect();
        const roomWidth = room.offsetWidth;
        
        const eyeX = personRect.left + personRect.width / 2 - roomRect.left - 15;
        const eyeY = headRect ? 
            headRect.top + headRect.height / 2 - roomRect.top - 5 : 
            personRect.top + 25 - roomRect.top;
        const mirrorX = mirrorRect.left + mirrorRect.width / 2 - roomRect.left;
        const mirrorY = mirrorRect.top - roomRect.top;
        
        this.updateLine(incidentLine, eyeX, eyeY, mirrorX, mirrorY);
        
        const dx = mirrorX - eyeX;
        const dy = mirrorY - eyeY;
        const incidentAngle = Math.atan2(dy, dx);
        const reflectionAngle = Math.PI - incidentAngle;
        const ceilingY = 0;
        const distanceY = mirrorY - ceilingY;
        const distanceX = distanceY / Math.tan(reflectionAngle);
        const unboundedCeilingX = mirrorX - distanceX;
        
        let endpointX = unboundedCeilingX;
        let endpointY = ceilingY;
        
        if (unboundedCeilingX < 0) {
            const wallX = 0;
            const t = (wallX - mirrorX) / (unboundedCeilingX - mirrorX);
            endpointY = mirrorY + t * (ceilingY - mirrorY);
            endpointX = wallX;
        } else if (unboundedCeilingX > roomWidth) {
            const wallX = roomWidth;
            const t = (wallX - mirrorX) / (unboundedCeilingX - mirrorX);
            endpointY = mirrorY + t * (ceilingY - mirrorY);
            endpointX = wallX;
        }
        
        this.updateLine(reflectionLine, mirrorX, mirrorY, endpointX, endpointY);
        this.updateLine(dottedLine, mirrorX, mirrorY, mirrorX, mirrorY - 50);
    },
    
    createLine(x1, y1, x2, y2, className = '') {
        const room = document.getElementById('room');
        if (!room) return;
        
        const line = document.createElement('div');
        line.className = `line ${className}`;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        line.style.width = `${length}px`;
        line.style.left = `${x1}px`;
        line.style.top = `${y1}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.transformOrigin = '0 50%';
        
        room.appendChild(line);
    },
    
    checkMeasurements() {
        const state = this.experimentState;
        const room = document.getElementById('room');
        const person = document.getElementById('person');
        const mirror = document.getElementById('mirror');
        const start = document.getElementById('start-point');
        const end = document.getElementById('end-point');
        
        if (!room || !person || !mirror || !start || !end) return;
        
        const roomRect = room.getBoundingClientRect();
        const personRect = person.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();
        const startRect = start.getBoundingClientRect();
        const endRect = end.getBoundingClientRect();
        const startX = startRect.left + startRect.width / 2 - roomRect.left;
        const startY = startRect.top + startRect.height / 2 - roomRect.top;
        const endX = endRect.left + endRect.width / 2 - roomRect.left;
        const endY = endRect.top + endRect.height / 2 - roomRect.top;
        const personX = personRect.left + personRect.width / 2 - roomRect.left;
        const personY = personRect.top - roomRect.top;
        const personBottom = personRect.bottom - roomRect.top;
        const mirrorX = mirrorRect.left + mirrorRect.width / 2 - roomRect.left;
        const wallX = 10;
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy) / state.scale;
        
        if (Math.abs(startX - endX) < 30 &&
            Math.abs(startX - personX) < 30 &&
            ((Math.abs(startY - personBottom) < 20 && Math.abs(endY - personY) < 40) ||
             (Math.abs(endY - personBottom) < 20 && Math.abs(startY - personY) < 40))) {
            
            state.measurements.h = distance;
            state.measurementComplete.h = true;
            this.updateHiddenValue('eye-height', state.trueValues.h);
            
            state.step === 2 && this.updateExperimentStep(3);
        }
        
        if (Math.abs(startY - endY) < 30 &&
            Math.abs(startX - wallX) < 30 &&
            Math.abs(endX - mirrorX) < 30) {
            
            state.measurements.l1 = distance;
            state.measurementComplete.l1 = true;
            this.updateHiddenValue('distance-to-mirror', state.trueValues.l1);
            
            state.step === 3 && this.updateExperimentStep(4);
        }
        
        if (Math.abs(startY - endY) < 30 &&
            Math.abs(startX - mirrorX) < 30 &&
            Math.abs(endX - personX) < 30) {
            
            state.measurements.l2 = distance;
            state.measurementComplete.l2 = true;
            this.updateHiddenValue('person-to-mirror', state.trueValues.l2);
            
            state.step === 4 && this.updateExperimentStep(5);
        }
        
        if (state.measurementComplete.h && state.measurementComplete.l1 && state.measurementComplete.l2) {
            state.measurements.H = state.trueValues.H;
            state.measurementComplete.H = true;
            
            this.updateHiddenValue('room-height', state.trueValues.H);
        }
    },
    
    updateHiddenValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
        
        const inputId = `${id}-input`;
        this.validateInput(inputId);
    },
    
    updateExperimentStep(step) {
        const state = this.experimentState;
        state.step = step;
        
        for (let i = 1; i <= 5; i++) {
            const element = document.getElementById(`step${i}`);
            if (element) {
                element.classList.remove('active', 'completed');
                
                i === step && element.classList.add('active');
                i < step && element.classList.add('completed');
            }
        }
        
        const instructionText = {
            1: "Расположите зеркало на полу комнаты так, чтобы был виден потолок.",
            2: "Измерьте высоту h от пола до глаз человека с помощью измерительной ленты.",
            3: "Измерьте расстояние l₁ от стены до зеркала с помощью измерительной ленты.",
            4: "Измерьте расстояние l₂ от зеркала до человека с помощью измерительной ленты.",
            5: "Рассчитайте высоту комнаты H по формуле H = h × l₁ / l₂"
        };
        
        const instruction = document.getElementById('current-instruction');
        if (instruction) instruction.textContent = instructionText[step] || "";
        
        physjs.goToStep(`step${step}`);
    },
    
    resetExperiment() {
        window.location.reload();
    }
};

export default experimentFunctions;