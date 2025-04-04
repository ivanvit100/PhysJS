function log(message, type = 'info') {
    const logContainer = document.getElementById('log');
    if (!logContainer) return;
    
    const logItem = document.createElement('div');
    logItem.className = `log-item ${type}`;
    logItem.textContent = message;
    logContainer.appendChild(logItem);
    logContainer.scrollTop = logContainer.scrollHeight;
}

const TestFramework = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    currentSuite: null,
    
    describe: function(name, callback) {
        this.currentSuite = {
            name: name,
            tests: [],
            element: document.createElement('div')
        };
        
        this.currentSuite.element.className = 'test-suite';
        this.currentSuite.element.setAttribute('data-description', name);
        
        const title = document.createElement('h3');
        title.textContent = name;
        this.currentSuite.element.appendChild(title);
        
        document.getElementById('test-results').appendChild(this.currentSuite.element);
        
        callback();
        this.currentSuite = null;
    },
    
    test: function(name, callback) {
        if (!this.currentSuite) {
            throw new Error("Test must be defined within a describe block");
        }
        
        const testCase = {
            name: name,
            callback: callback,
            status: 'pending'
        };
        
        this.currentSuite.tests.push(testCase);
        
        const testElement = document.createElement('div');
        testElement.className = 'test-case';
        testElement.setAttribute('data-description', name);
        
        const icon = document.createElement('span');
        icon.className = 'test-icon';
        
        const text = document.createElement('span');
        text.textContent = name;
        
        testElement.appendChild(icon);
        testElement.appendChild(text);
        
        this.currentSuite.element.appendChild(testElement);
        testCase.element = testElement;
        
        if (!window.testRegistry[this.currentSuite.name]) {
            window.testRegistry[this.currentSuite.name] = {};
        }
        window.testRegistry[this.currentSuite.name][name] = callback;
    },
    
    runTests: async function(filter = null) {
        this.reset();
        
        await setupTestEnvironment();
        await wait(300);
        
        const testSuites = Array.from(document.querySelectorAll('.test-suite'));
        
        for (const suite of testSuites) {
            const suiteName = suite.getAttribute('data-description');
            
            if (filter && !suiteName.includes(filter)) {
                continue;
            }
            
            const tests = Array.from(suite.querySelectorAll('.test-case'));
            
            for (const test of tests) {
                this.totalTests++;
                const testName = test.getAttribute('data-description');
                
                test.className = 'test-case running';
                test.querySelector('.test-icon').className = 'test-icon running-icon';
                
                try {
                    log(`Запуск теста: ${suiteName} - ${testName}`);
                    
                    const testFunc = window.testRegistry[suiteName][testName];
                    
                    await Promise.race([
                        testFunc(),
                        wait(3000).then(() => {
                            throw new Error("Тест превысил таймаут (3000мс)");
                        })
                    ]);
                    
                    this.passedTests++;
                    test.className = 'test-case success';
                    test.querySelector('.test-icon').className = 'test-icon success-icon';
                    
                } catch (error) {
                    this.failedTests++;
                    test.className = 'test-case failed';
                    test.querySelector('.test-icon').className = 'test-icon failed-icon';
                    
                    log(`Ошибка в тесте "${testName}": ${error.message}`, 'error');
                    
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = error.message;
                    test.appendChild(errorMsg);
                }
                
                await resetTestEnvironment();
                await wait(100);
            }
        }
        
        this.updateStats();
    },
    
    reset: function() {
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        
        document.querySelectorAll('.test-case').forEach(el => {
            el.className = 'test-case';
            el.querySelector('.test-icon').className = 'test-icon';
            
            const errorMsg = el.querySelector('.error-message');
            if (errorMsg) {
                el.removeChild(errorMsg);
            }
        });
        
        this.updateStats();
    },
    
    clearResults: function() {
        document.getElementById('test-results').innerHTML = '';
        this.reset();
    },
    
    updateStats: function() {
        const stats = document.getElementById('stats');
        stats.innerHTML = `
            <span class="passed">${this.passedTests} тестов пройдено</span> |
            <span class="failed">${this.failedTests} тестов не пройдено</span> |
            <span class="total">Всего: ${this.totalTests} тестов</span>
        `;
    },
    
    expect: function(actual) {
        return {
            toBe: function(expected) {
                if (actual !== expected) {
                    throw new Error(`Ожидалось ${expected}, получено ${actual}`);
                }
            },
            toBeTruthy: function() {
                if (!actual) {
                    throw new Error(`Ожидалось true, получено ${actual}`);
                }
            },
            toBeFalsy: function() {
                if (actual) {
                    throw new Error(`Ожидалось false, получено ${actual}`);
                }
            },
            toBeNull: function() {
                if (actual !== null) {
                    throw new Error(`Ожидался null, получено ${actual}`);
                }
            },
            toEqual: function(expected) {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Ожидалось ${JSON.stringify(expected)}, получено ${JSON.stringify(actual)}`);
                }
            },
            toBeGreaterThan: function(expected) {
                if (!(actual > expected)) {
                    throw new Error(`Ожидалось значение больше ${expected}, получено ${actual}`);
                }
            },
            toContain: function(expected) {
                if (!actual.includes(expected)) {
                    throw new Error(`Ожидалось, что ${JSON.stringify(actual)} содержит ${expected}`);
                }
            },
            toHaveLength: function(expected) {
                if (actual.length !== expected) {
                    throw new Error(`Ожидалась длина ${expected}, получено ${actual.length}`);
                }
            }
        };
    }
};