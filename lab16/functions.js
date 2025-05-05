const experimentFunctions = {
    experimentState: {
        step: 1,
        circuitAssembled: false,
        emfMeasured: false,
        switchClosed: false,
        closedMeasurementsComplete: false,
        resistanceCalculated: false,
        errorsCalculated: false,
        
        trueEmf: 1.5,
        internalResistance: 2.0,
        
        measuredEmf: 0,
        closedCircuitVoltage: 0,
        current: 0,
        
        calculatedInternalResistance: 0,
        absoluteError: 0,
        relativeError: 0,
    },
    
    initializeExperiment() {
        this.setupPhysicsObjects();
        physjs.setRotationKeysEnabled(false);
        document.getElementById('theoretical-emf').textContent = this.experimentState.trueEmf.toFixed(2);
        
        physjs.onConnect((fromId, toId) => {
            this.checkCircuitConnections();
        });
        
        document.getElementById('switch').addEventListener('dblclick', () => {
            this.experimentState.circuitAssembled && this.toggleSwitch();
        });

        const self = this;
        
        document.getElementById('ammeter').addEventListener('click', function() {
            if (self.experimentState.step === 3 && 
                self.experimentState.switchClosed && 
                !self.experimentState.closedMeasurementsComplete) {
                self.recordAmperReading();
            }
        });
        
        document.getElementById('voltmeter').addEventListener('click', function() {
            if (self.experimentState.step === 2 && 
                self.experimentState.circuitAssembled && 
                !self.experimentState.emfMeasured) {
                self.recordEmfMeasurement();
                return;
            }
            
            if (self.experimentState.step === 3 && 
                self.experimentState.switchClosed && 
                !self.experimentState.closedMeasurementsComplete) {
                self.recordVoltmeterReading();
            }
        });
        
        document.getElementById('check-r-internal').addEventListener('click', () => {
            this.checkInternalResistance();
        });
        document.getElementById('check-errors').addEventListener('click', () => {
            this.checkErrors();
        });
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetExperiment();
        });
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = '../index.html';
        });
        
        this.updateMeterReadings();
    },
    
    setupPhysicsObjects() {
        physjs.detachAll();
        
        const objects = [
            { selector: '#power-source', type: 'power-source' },
            { selector: '#ammeter', type: 'ammeter' },
            { selector: '#voltmeter', type: 'voltmeter' },
            { selector: '#switch', type: 'switch' }
        ];
        
        objects.forEach(obj => {
            const element = document.querySelector(obj.selector);
            if (!element) return;
            
            element.classList.add('phys', 'phys-draggable', 'phys-connectors');
            if (!physjs.getObject(obj.selector)) physjs.createObject(obj.selector);
            
            if (obj.type === 'power-source') element.dataset.wireColor = '#e74c3c';
            else if (obj.type === 'voltmeter') element.dataset.wireColor = '#2ecc71';
            else if (obj.type === 'ammeter') element.dataset.wireColor = '#3498db';
            else if (obj.type === 'switch') element.dataset.wireColor = '#95a5a6';
        });
        
        physjs.addConnectionPoint('#power-source', 'power-positive', 80, 85);
        physjs.addConnectionPoint('#power-source', 'power-negative', 20, 85);
        physjs.addConnectionPoint('#power-source', 'power-volt1', 80, 35);
        physjs.addConnectionPoint('#power-source', 'power-volt2', 20, 35);
        
        physjs.addConnectionPoint('#ammeter', 'ammeter-input', 15, 92);
        physjs.addConnectionPoint('#ammeter', 'ammeter-output', 85, 92);
        
        physjs.addConnectionPoint('#voltmeter', 'voltmeter-positive', 15, 92);
        physjs.addConnectionPoint('#voltmeter', 'voltmeter-negative', 85, 92);
        
        physjs.addConnectionPoint('#switch', 'switch-input', 10, 50);
        physjs.addConnectionPoint('#switch', 'switch-output', 90, 50);
    },

    recordEmfMeasurement() {
        document.getElementById('measured-emf').textContent = this.experimentState.measuredEmf.toFixed(2);
        this.experimentState.emfMeasured = true;
        
        const voltmeter = document.getElementById('voltmeter');
        voltmeter.classList.add('reading-taken');
        setTimeout(() => voltmeter.classList.remove('reading-taken'), 500);
        
        document.getElementById('current-instruction').textContent = 
            "Показания ЭДС записаны. Теперь замкните ключ двойным щелчком и снимите показания приборов.";
        
        this.updateExperimentStep(3);
    },

    recordAmperReading() {
        const amperValue = document.getElementById('current-value').textContent;
        const match = amperValue.match(/(\d+\.\d+)/);
        const currentInMA = match ? parseFloat(match[1]) : 0;
        const currentInA = currentInMA / 1000;
        
        document.getElementById('circuit-current').textContent = currentInA.toFixed(3);
        
        const ammeter = document.getElementById('ammeter');
        ammeter.classList.add('reading-taken');
        setTimeout(() => ammeter.classList.remove('reading-taken'), 500);
        
        this.checkBothReadings();
    },
    
    recordVoltmeterReading() {
        const voltmeterValue = document.getElementById('voltage-value').textContent;
        const match = voltmeterValue.match(/(\d+\.\d+)/);
        const voltageInVolts = match ? parseFloat(match[1]) : 0;
        
        document.getElementById('closed-circuit-voltage').textContent = voltageInVolts.toFixed(2);
        
        const voltmeter = document.getElementById('voltmeter');
        voltmeter.classList.add('reading-taken');
        setTimeout(() => voltmeter.classList.remove('reading-taken'), 500);
        
        this.checkBothReadings();
    },
    
    checkBothReadings() {
        const currentValue = document.getElementById('circuit-current').textContent;
        const voltageValue = document.getElementById('closed-circuit-voltage').textContent;

        if (currentValue !== '-' && voltageValue !== '-') {
            this.experimentState.closedMeasurementsComplete = true;
            document.getElementById('current-instruction').textContent = 
                "Показания сняты. Теперь рассчитайте внутреннее сопротивление источника.";
            document.getElementById('calculator-panel').style.display = 'block';
            this.updateExperimentStep(4);
        }
    },
    
    checkCircuitConnections() {
        if (this.experimentState.circuitAssembled) return;
        
        const voltmeterPoints = ['voltmeter-positive', 'voltmeter-negative'];
        const powerPoints = ['power-volt1', 'power-volt2', 'power-positive', 'power-negative'];
        
        let voltmeterConnections = 0;
        for (const voltPoint of voltmeterPoints)
            for (const powerPoint of powerPoints)
                if (physjs.areConnected(voltPoint, powerPoint))
                    voltmeterConnections++;
        
        const voltmeterCorrect = voltmeterConnections === 2;
        const switchPoints = ['switch-input', 'switch-output'];
        const ammeterPoints = ['ammeter-input', 'ammeter-output'];
        const circuitConnections = [];
        
        for (const powerPoint of powerPoints)
            for (const switchPoint of switchPoints)
                if (physjs.areConnected(powerPoint, switchPoint))
                    circuitConnections.push(`${powerPoint} -> ${switchPoint}`);
        
        for (const switchPoint of switchPoints)
            for (const ammeterPoint of ammeterPoints)
                if (physjs.areConnected(switchPoint, ammeterPoint))
                    circuitConnections.push(`${switchPoint} -> ${ammeterPoint}`);
        
        for (const ammeterPoint of ammeterPoints)
            for (const powerPoint of powerPoints)
                if (physjs.areConnected(ammeterPoint, powerPoint))
                    circuitConnections.push(`${ammeterPoint} -> ${powerPoint}`);
        
        const ampermetrCircuitCorrect = circuitConnections.length >= 3;
        
        if (voltmeterCorrect && ampermetrCircuitCorrect) {
            this.experimentState.circuitAssembled = true;
            this.updateExperimentStep(2);
            this.updateMeterReadings();
            this.experimentState.measuredEmf = this.getEmfWithError();
            this.updateMeterReadings();
            document.getElementById('current-instruction').textContent = 
                "Схема собрана правильно! Дважды щелкните по вольтметру для снятия показаний";
        }
    },
    
    toggleSwitch() {
        if (!this.experimentState.circuitAssembled) return;
        
        this.experimentState.switchClosed = !this.experimentState.switchClosed;
        
        const switchElement = document.getElementById('switch');
        const switchLever = switchElement.querySelector('.switch-lever');
        
        if (this.experimentState.switchClosed) {
            switchLever.style.transform = 'translate(0, -50%) rotate(0deg)';
            
            if (this.experimentState.emfMeasured) {
                document.getElementById('current-instruction').textContent = 
                    "Щёлкните на амперметр и вольтметр, чтобы снять показания при замкнутой цепи.";
                this.updateClosedCircuitReadings();
                setTimeout(() => {
                    this.updateClosedCircuitReadings();
                }, 100);
            } else {
                document.getElementById('current-instruction').textContent = 
                    "Сначала снимите показания ЭДС при разомкнутом ключе (щёлкните на вольтметр).";
                setTimeout(() => {
                    this.experimentState.switchClosed = false;
                    switchLever.style.transform = 'rotate(-45deg)';
                }, 500);
            }
        } else {
            switchLever.style.transform = 'rotate(-45deg)';
            this.updateMeterReadings();
        }
        
        this.updateMeterReadings();
    },
    
    updateMeterReadings() {
        const voltmeterValue = document.getElementById('voltage-value');
        const voltmeterNeedle = document.querySelector('#voltmeter .meter-needle');
        
        const amperValue = document.getElementById('current-value');
        const amperNeedle = document.querySelector('#ammeter .meter-needle');
        
        if (!this.experimentState.switchClosed) {
            voltmeterValue.textContent = this.experimentState.measuredEmf.toFixed(2) + ' В';
            voltmeterNeedle.style.transform = `rotate(${(this.experimentState.measuredEmf / 3) * 90 - 45}deg)`;
            amperValue.textContent = '0.00 мА';
            amperNeedle.style.transform = 'rotate(-45deg)';
        } else {
            this.updateClosedCircuitReadings();
        }
    },
    
    updateClosedCircuitReadings() {
        if (!this.experimentState.switchClosed) return;
        
        const resistance = this.experimentState.internalResistance;
        const emf = this.experimentState.measuredEmf;
        const externalResistance = 8;
        const current = emf / (resistance + externalResistance);
        const voltageDrop = current * resistance;
        const terminalVoltage = emf - voltageDrop;
        
        this.experimentState.current = current;
        this.experimentState.closedCircuitVoltage = terminalVoltage;
        
        const voltmeterValue = document.getElementById('voltage-value');
        const voltmeterNeedle = document.querySelector('#voltmeter .meter-needle');
        const amperValue = document.getElementById('current-value');
        const amperNeedle = document.querySelector('#ammeter .meter-needle');
        
        voltmeterValue.textContent = terminalVoltage.toFixed(2) + ' В';
        voltmeterNeedle.style.transform = `rotate(${(terminalVoltage / 3) * 90 - 45}deg)`;
        
        const currentInMA = current * 1000;
        amperValue.textContent = currentInMA.toFixed(2) + ' мА';
        amperNeedle.style.transform = `rotate(${(currentInMA / 300) * 90 - 45}deg)`;
        
        setTimeout(() => {
            amperValue.textContent = currentInMA.toFixed(2) + ' мА';
            amperNeedle.style.transform = `rotate(${(currentInMA / 300) * 90 - 45}deg)`;
        }, 50);
    },
    
    checkInternalResistance() {
        if (!this.experimentState.closedMeasurementsComplete) return;
        
        const inputField = document.getElementById('r-internal-input');
        const resultField = document.getElementById('calculation-result');
        
        const userValue = parseFloat(inputField.value);
        if (isNaN(userValue)) {
            resultField.textContent = "Введите числовое значение!";
            resultField.className = "error-message";
            return;
        }
        
        const emfElement = document.getElementById('measured-emf');
        const voltageElement = document.getElementById('closed-circuit-voltage');
        const currentElement = document.getElementById('circuit-current');
        const emf = parseFloat(emfElement.textContent);
        const voltage = parseFloat(voltageElement.textContent);
        const current = parseFloat(currentElement.textContent);
        const correctResistance = (emf - voltage) / current;
        const tolerance = correctResistance * 0.1;
        
        if (Math.abs(userValue - correctResistance) <= tolerance) {
            resultField.textContent = "Верно! Расчет выполнен правильно.";
            resultField.className = "success-message";
            
            document.getElementById('internal-resistance').textContent = correctResistance.toFixed(2);
            this.experimentState.calculatedInternalResistance = correctResistance;
            this.experimentState.resistanceCalculated = true;
            
            this.updateExperimentStep(5);
            
            document.getElementById('error-calculator-panel').style.display = 'block';
            document.getElementById('current-instruction').textContent = 
                "Теперь рассчитайте абсолютную и относительную погрешности измерения ЭДС.";
        } else {
            resultField.textContent = `Неверно. Проверьте расчеты. r = (E - U) / I = (${emf.toFixed(2)} - ${voltage.toFixed(2)}) / ${current.toFixed(3)} = ?`;
            resultField.className = "error-message";
        }
    },
    
    checkErrors() {
        if (!this.experimentState.resistanceCalculated) return;
        
        const absErrorInput = document.getElementById('abs-error-input');
        const relErrorInput = document.getElementById('rel-error-input');
        const resultField = document.getElementById('error-calculation-result');
        const userAbsError = parseFloat(absErrorInput.value);
        const userRelError = parseFloat(relErrorInput.value);
        
        if (isNaN(userAbsError) || isNaN(userRelError)) {
            resultField.textContent = "Введите числовые значения для обоих полей!";
            resultField.className = "error-message";
            return;
        }
        
        const measuredEmfElement = document.getElementById('measured-emf');
        const theoreticalEmfElement = document.getElementById('theoretical-emf');
        const measuredEmf = parseFloat(measuredEmfElement.textContent);
        const trueEmf = parseFloat(theoreticalEmfElement.textContent);
        const correctAbsError = Math.abs(measuredEmf - trueEmf);
        const correctRelError = (correctAbsError / trueEmf) * 100;
        const absTolerance = correctAbsError * 0.05;
        const relTolerance = correctRelError * 0.05;
        const absErrorCorrect = Math.abs(userAbsError - correctAbsError) <= absTolerance;
        const relErrorCorrect = Math.abs(userRelError - correctRelError) <= relTolerance;
        
        if (absErrorCorrect && relErrorCorrect) {
            resultField.textContent = "Верно! Расчет погрешностей выполнен правильно.";
            resultField.className = "success-message";

            document.getElementById('absolute-error').textContent = correctAbsError.toFixed(3);
            document.getElementById('relative-error').textContent = correctRelError.toFixed(2);
            
            this.experimentState.absoluteError = correctAbsError;
            this.experimentState.relativeError = correctRelError;
            this.experimentState.errorsCalculated = true;
            
            document.getElementById('current-instruction').textContent = 
                "Эксперимент завершен! Вы успешно определили ЭДС, внутреннее сопротивление и рассчитали погрешности измерений.";
            document.getElementById('check-errors').disabled = true;
        } else {
            let errorMsg = "Проверьте расчеты.";
            resultField.innerHTML = errorMsg;
            resultField.className = "error-message";
        }
    },
    
    getEmfWithError() {
        const trueEmf = this.experimentState.trueEmf;
        const error = (Math.random() - 0.5) * 0.06;
        return trueEmf + error;
    },
    
    updateExperimentStep(step) {
        if (step <= this.experimentState.step) return;
        
        this.experimentState.step = step;

        document.querySelectorAll('#status-panel ol li').forEach((li, index) => {
            li.classList.remove('active', 'completed');
            if (index + 1 == step) li.classList.add('active');
            if (index + 1 < step) li.classList.add('completed');
        });
        
        physjs.goToStep('step' + step);
    },
    
    resetExperiment() {
        window.location.reload();
    }
};

export default experimentFunctions;