class MirrorExperiment {
    constructor() {
        this.isDragging = false;
        this.currentDragElement = null;
        this.dragOffset = { x: 0, y: 0 };
        
        this.scale = 100;
        
        this.roomWidth = 700;
        this.roomHeight = 500;
        
        this.tolerance = 0.1;
        
        this.initElements();
        this.generateExperiment();
        this.bindEvents();
        this.updateTape();
    }
    
    initElements() {
        this.room = document.getElementById('room');
        this.person = document.getElementById('person');
        this.mirror = document.getElementById('mirror');
        this.eye = document.getElementById('eye');
        
        this.startPoint = document.getElementById('start-point');
        this.endPoint = document.getElementById('end-point');
        this.tapeLine = document.getElementById('tape-line');
        this.tapeDisplay = document.getElementById('display');
        this.currentDisplay = document.getElementById('current-display');
        
        this.inputs = {
            h: document.getElementById('input-h'),
            l1: document.getElementById('input-l1'),
            l2: document.getElementById('input-l2'),
            H: document.getElementById('input-H')
        };
        
        this.checkIcons = {
            h: document.getElementById('check-h'),
            l1: document.getElementById('check-l1'),
            l2: document.getElementById('check-l2'),
            H: document.getElementById('check-H')
        };
        
        this.tableElements = {
            h: {
                measured: document.getElementById('table-h-measured'),
                theory: document.getElementById('table-h-theory'),
                error: document.getElementById('table-h-error')
            },
            l1: {
                measured: document.getElementById('table-l1-measured'),
                theory: document.getElementById('table-l1-theory'),
                error: document.getElementById('table-l1-error')
            },
            l2: {
                measured: document.getElementById('table-l2-measured'),
                theory: document.getElementById('table-l2-theory'),
                error: document.getElementById('table-l2-error')
            },
            H: {
                measured: document.getElementById('table-H-calculated'),
                theory: document.getElementById('table-H-theory'),
                error: document.getElementById('table-H-error')
            }
        };
        
        this.checkBtn = document.getElementById('check-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.status = document.getElementById('status');
    }
    
    generateExperiment() {
        this.experimentParams = {
            h: 2.4,
            l1: 1.5,
            l2: 0.7,
            H: 0
        };
        
        this.experimentParams.H = (this.experimentParams.h * this.experimentParams.l1) / this.experimentParams.l2;
        
        this.positionElements();
    }
    
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    positionElements() {
        const personHeight = this.experimentParams.h * this.scale * 1 + 10;
        this.person.style.height = personHeight + 'px';
    
        const bodyHeight = personHeight - 30;
        this.person.querySelector('.body').style.height = bodyHeight + 'px';
        
        const mirrorX = -10 + this.experimentParams.l1 * this.scale;
        this.mirror.style.left = mirrorX + 'px';
        
        const mirrorCenterX = mirrorX + 25;
        const mirrorCenterY = 20;
        
        const personCenterX = mirrorCenterX + this.experimentParams.l2 * this.scale;
        
        const personX = personCenterX - 15;
        this.person.style.left = personX + 'px';
        this.person.style.right = 'auto';

        const eyeX = personCenterX;
        const eyeY = personHeight;

        this.createLine(eyeX, eyeY, mirrorCenterX, mirrorCenterY, '');

        const incidentDx = mirrorCenterX - eyeX;
        const incidentDy = mirrorCenterY - eyeY;
        const incidentAngle = Math.atan2(incidentDy, incidentDx);
        
        const reflectedAngle = Math.PI - incidentAngle;
        
        const reflectedSlope = Math.tan(reflectedAngle);
        const wallHitY = mirrorCenterY + (0 - mirrorCenterX) * reflectedSlope;
        
        this.createLine(mirrorCenterX, mirrorCenterY, 0, wallHitY, '');

        this.createLine(mirrorCenterX, mirrorCenterY, mirrorCenterX, this.roomHeight, 'dotted');
    }

    createLine(x1, y1, x2, y2, style = '') {
        const line = document.createElement('div');
        line.className = style === 'dotted' ? 'line dotted' : 'line';
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
        line.style.left = x1 + 'px';
        line.style.top = (this.roomHeight - y1) + 'px';
        line.style.width = distance + 'px';
        line.style.transform = `rotate(${-angle}deg)`;
        line.style.transformOrigin = '0 50%';
    
        this.room.appendChild(line);
    }
    
    bindEvents() {
        this.startPoint.addEventListener('mousedown', (e) => this.startDrag(e, this.startPoint));
        this.endPoint.addEventListener('mousedown', (e) => this.startDrag(e, this.endPoint));
        
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        Object.entries(this.inputs).forEach(([key, input]) => {
            input.addEventListener('input', () => this.validateInput(key));
        });
        
        this.checkBtn.addEventListener('click', () => this.checkResults());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        document.addEventListener('selectstart', (e) => {
            if (this.isDragging) e.preventDefault();
        });
    }
    
    startDrag(e, element) {
        e.preventDefault();
        this.isDragging = true;
        this.currentDragElement = element;
        
        const rect = this.room.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left - element.offsetLeft - 10,
            y: e.clientY - rect.top - element.offsetTop - 10
        };
        
        element.style.cursor = 'grabbing';
    }
    
    onDrag(e) {
        if (!this.isDragging || !this.currentDragElement) return;
        
        e.preventDefault();
        
        const rect = this.room.getBoundingClientRect();
        let x = e.clientX - rect.left - this.dragOffset.x - 10;
        let y = e.clientY - rect.top - this.dragOffset.y - 10;
        
        x = Math.max(0, Math.min(x, this.room.offsetWidth - 20));
        y = Math.max(0, Math.min(y, this.room.offsetHeight - 20));
        
        this.currentDragElement.style.left = x + 'px';
        this.currentDragElement.style.top = y + 'px';
        
        this.updateTape();
    }
    
    stopDrag() {
        if (this.currentDragElement) {
            this.currentDragElement.style.cursor = 'grab';
        }
        this.isDragging = false;
        this.currentDragElement = null;
    }
    
    updateTape() {
        const start = {
            x: this.startPoint.offsetLeft + 10,
            y: this.startPoint.offsetTop + 10
        };
        
        const end = {
            x: this.endPoint.offsetLeft + 10,
            y: this.endPoint.offsetTop + 10
        };
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        this.tapeLine.style.left = start.x + 'px';
        this.tapeLine.style.top = start.y + 'px';
        this.tapeLine.style.width = distance + 'px';
        this.tapeLine.style.transform = `rotate(${angle}deg)`;
        this.tapeLine.style.transformOrigin = '0 50%';
        
        const meters = distance / this.scale;
        
        const displayText = `${meters.toFixed(2)} м`;
        this.tapeDisplay.textContent = displayText;
        this.currentDisplay.textContent = displayText;
        
        this.tapeDisplay.style.left = (start.x + dx / 2 - 25) + 'px';
        this.tapeDisplay.style.top = (start.y + dy / 2 - 15) + 'px';
    }
    
    validateInput(key) {
        const input = this.inputs[key];
        const icon = this.checkIcons[key];
        const value = parseFloat(input.value);
        
        icon.className = 'validation-icon';
        
        if (isNaN(value) || value <= 0) {
            return;
        }
        
        const correct = this.experimentParams[key];
        const isCorrect = Math.abs(value - correct) <= this.tolerance;
        
        if (isCorrect) {
            icon.classList.add('correct');
        } else {
            icon.classList.add('incorrect');
        }
    }
    
    checkResults() {
        const results = {};
        let allCorrect = true;
        
        Object.entries(this.inputs).forEach(([key, input]) => {
            const value = parseFloat(input.value);
            const correct = this.experimentParams[key];
            
            if (isNaN(value) || value <= 0) {
                allCorrect = false;
                return;
            }
            
            const isCorrect = Math.abs(value - correct) <= this.tolerance;
            results[key] = { value, isCorrect, correct };
            
            if (!isCorrect) {
                allCorrect = false;
            }
        });
        
        if (allCorrect && Object.keys(results).length === 4) {
            this.fillTable(results);
            this.showSuccess();
        } else {
            this.showError();
        }
    }
    
    fillTable(results) {
        Object.entries(results).forEach(([key, data]) => {
            this.tableElements[key].measured.textContent = data.value.toFixed(2);
            this.tableElements[key].theory.textContent = data.correct.toFixed(2);
            
            const error = Math.abs(data.value - data.correct);
            const errorPercent = (error / data.correct * 100);
            this.tableElements[key].error.textContent = `${errorPercent.toFixed(1)}%`;
        });
    }
    
    showSuccess() {
        this.status.className = 'status success';
        this.status.textContent = '✅ Отлично! Все измерения выполнены правильно. Результаты записаны в таблицу.';
    }
    
    showError() {
        this.status.className = 'status error';
        this.status.textContent = '❌ Проверьте измерения. Некоторые значения неточны. Используйте измерительную ленту для получения точных результатов.';
    }
    
    reset() {
        Object.values(this.inputs).forEach(input => {
            input.value = '';
        });
        
        Object.values(this.checkIcons).forEach(icon => {
            icon.className = 'validation-icon';
        });
        
        Object.values(this.tableElements).forEach(row => {
            Object.values(row).forEach(element => {
                element.textContent = '—';
            });
        });
        
        this.startPoint.style.left = '100px';
        this.startPoint.style.top = '100px';
        this.endPoint.style.left = '200px';
        this.endPoint.style.top = '200px';
        
        this.updateTape();
        
        this.status.className = 'status';
        this.status.textContent = 'Выполните измерения с помощью ленты и введите результаты в поля выше.';
        
        this.generateExperiment();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MirrorExperiment();
});