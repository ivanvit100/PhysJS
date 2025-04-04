// Простой тестовый фреймворк
const BrowserTest = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    currentSuite: null,
    currentTest: null,
    
    // Создание теста
    describe: function(description, callback) {
        this.currentSuite = { 
            description, 
            tests: [],
            element: this._createSuiteElement(description)
        };
        
        callback();
        
        this.currentSuite = null;
    },
    
    // Определение теста
    test: function(description, callback) {
        if (!this.currentSuite) {
            throw new Error("Test must be defined within a describe block");
        }
        
        const testCase = { description, callback, status: 'pending' };
        this.currentSuite.tests.push(testCase);
        
        const testElement = this._createTestElement(testCase);
        this.currentSuite.element.appendChild(testElement);
        testCase.element = testElement;
    },
    
    // Запуск тестов
    runTests: async function(filter = null) {
        this.reset();
        
        // Сбрасываем состояние PhysJS перед запуском тестов
        await setupTestEnvironment();
        await wait(500); // Увеличено время ожидания
        
        try {
            if (typeof physjs !== 'undefined') {
                console.log("Проверка PhysJS перед тестами");
                physjs.detachAll();
                physjs.resetLab();
            } else {
                console.error("КРИТИЧЕСКАЯ ОШИБКА: PhysJS не доступен");
                throw new Error("PhysJS недоступен");
            }
        } catch (e) {
            console.error("Ошибка при сбросе PhysJS:", e);
        }
        
        // Даем время для инициализации DOM и PhysJS
        await wait(200);
        
        const testSuites = Array.from(document.querySelectorAll('.test-suite'));
        
        for (const suiteElement of testSuites) {
            const suiteDesc = suiteElement.getAttribute('data-description');
            
            if (filter && !suiteDesc.includes(filter)) {
                continue;
            }
            
            const testElements = Array.from(suiteElement.querySelectorAll('.test-case'));
            
            for (const testElement of testElements) {
                this.totalTests++;
                
                testElement.className = 'test-case running';
                testElement.querySelector('.test-icon').className = 'test-icon running-icon';
                const testDesc = testElement.getAttribute('data-description');
                
                try {
                    console.log(`Запуск теста: ${suiteDesc} - ${testDesc}`);
                    
                    // Находим соответствующий тест в объекте
                    const suite = this._findSuiteByDescription(suiteDesc);
                    const test = suite.tests.find(t => t.description === testDesc);
                    
                    if (!test) continue;
                    
                    this.currentTest = test;
                    test.status = 'running';
                    
                    // Исполняем тест с таймаутом для более надежной проверки
                    await Promise.race([
                        test.callback(),
                        wait(2000).then(() => {
                            throw new Error("Тест занял слишком много времени (таймаут)");
                        })
                    ]);
                    
                    // Если тест дошел до этой точки без исключений, считаем его успешным
                    test.status = 'passed';
                    this.passedTests++;
                    testElement.className = 'test-case success';
                    testElement.querySelector('.test-icon').className = 'test-icon success-icon';
                    
                } catch (error) {
                    this.failedTests++;
                    testElement.className = 'test-case failed';
                    testElement.querySelector('.test-icon').className = 'test-icon failed-icon';
                    
                    console.error(`Ошибка в тесте "${testDesc}":`, error);
                    
                    const errorMsgElement = document.createElement('div');
                    errorMsgElement.className = 'error-message';
                    errorMsgElement.textContent = error.stack || error.message;
                    testElement.appendChild(errorMsgElement);
                }
                
                // Сбрасываем среду после каждого теста
                try {
                    await resetTestEnvironment();
                } catch (e) {
                    console.error("Ошибка при сбросе среды:", e);
                }
                
                // Небольшая пауза между тестами для завершения DOM-операций
                await wait(100);
            }
        }
        
        this.updateStats();
    },
    
    // Утверждения (assertions)
    expect: function(actual) {
        return {
            toBe: function(expected) {
                if (actual !== expected) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
                }
            },
            toBeTruthy: function() {
                if (!actual) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`);
                }
            },
            toBeFalsy: function() {
                if (actual) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`);
                }
            },
            toEqual: function(expected) {
                // Простая проверка для примитивов и объектов
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
                }
            },
            toBeNull: function() {
                if (actual !== null) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to be null`);
                }
            },
            toBeUndefined: function() {
                if (actual !== undefined) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to be undefined`);
                }
            },
            toBeDefined: function() {
                if (actual === undefined) {
                    throw new Error('Expected value to be defined');
                }
            },
            toContain: function(expected) {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
                }
            },
            toBeInstanceOf: function(expected) {
                if (!(actual instanceof expected)) {
                    throw new Error(`Expected ${actual} to be instance of ${expected.name}`);
                }
            },
            toHaveLength: function(expected) {
                if (actual.length !== expected) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to have length ${expected}, but it has length ${actual.length}`);
                }
            }
        };
    },
    
    // Сброс состояния
    reset: function() {
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.currentSuite = null;
        this.currentTest = null;
        
        // Сбрасываем отображение результатов тестов
        const testElements = document.querySelectorAll('.test-case');
        testElements.forEach(element => {
            element.className = 'test-case';
            element.querySelector('.test-icon').className = 'test-icon';
            
            const errorMessage = element.querySelector('.error-message');
            errorMessage && element.removeChild(errorMessage);
        });
        
        this.updateStats();
    },
    
    // Очистка результатов
    clearResults: function() {
        document.getElementById('test-results').innerHTML = '';
        this.reset();
    },
    
    // Обновление статистики
    updateStats: function() {
        const statsElement = document.getElementById('stats');
        statsElement.innerHTML = `
            <span class="passed">${this.passedTests} тестов пройдено</span> |
            <span class="failed">${this.failedTests} тестов не пройдено</span> |
            <span class="total">Всего: ${this.totalTests} тестов</span>
        `;
    },
    
    // Вспомогательные функции для создания UI
    _createSuiteElement: function(description) {
        const element = document.createElement('div');
        element.className = 'test-suite';
        element.setAttribute('data-description', description);
        
        const title = document.createElement('h3');
        title.textContent = description;
        element.appendChild(title);
        
        document.getElementById('test-results').appendChild(element);
        
        return element;
    },
    
    _createTestElement: function(testCase) {
        const element = document.createElement('div');
        element.className = 'test-case';
        element.setAttribute('data-description', testCase.description);
        
        const icon = document.createElement('span');
        icon.className = 'test-icon';
        
        const text = document.createElement('span');
        text.textContent = testCase.description;
        
        element.appendChild(icon);
        element.appendChild(text);
        
        return element;
    },
    
    _findSuiteByDescription: function(description) {
        const testSuites = Array.from(document.querySelectorAll('.test-suite'));
        for (const suiteElement of testSuites) {
            const suiteDesc = suiteElement.getAttribute('data-description');
            if (suiteDesc === description) {
                const testElements = Array.from(suiteElement.querySelectorAll('.test-case'));
                const tests = testElements.map(el => ({
                    description: el.getAttribute('data-description'),
                    element: el,
                    status: 'pending',
                    callback: this._findTestCallback(description, el.getAttribute('data-description'))
                }));
                
                return { description, tests, element: suiteElement };
            }
        }
        return null;
    },
    
    _findTestCallback: function(suiteDesc, testDesc) {
        // Находим колбэк для теста (реализуется в тестовом скрипте)
        return window.testRegistry[suiteDesc]?.[testDesc] || function() {};
    }
};

// Регистр для хранения тестовых функций
window.testRegistry = {};

// Переопределяем console.log для отображения в UI
const originalConsoleLog = console.log;
console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    
    const logElement = document.getElementById('log');
    if (!logElement) return;
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    // Безопасное преобразование аргументов в строку
    let logText = "";
    for (const arg of args) {
        if (typeof arg === 'object' && arg !== null) {
            try {
                // Попытка использовать JSON.stringify с обработкой циклических ссылок
                const cache = new Set();
                const jsonStr = JSON.stringify(arg, (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        // Проверка на циклические ссылки
                        if (cache.has(value)) {
                            return '[Cyclic Reference]';
                        }
                        cache.add(value);
                    }
                    return value;
                }, 2);
                logText += jsonStr + " ";
            } catch (e) {
                // Если JSON.stringify не удался, используем упрощенное представление
                if (arg && arg._physObject) {
                    logText += `[PhysObject: ${arg.element?.id || 'unknown'}] `;
                } else if (arg && arg.element) {
                    logText += `[Object: ${arg.element?.id || 'unknown'}] `;
                } else if (arg instanceof Error) {
                    logText += `[Error: ${arg.message}] `;
                } else {
                    logText += "[Object] ";
                }
            }
        } else {
            logText += String(arg) + " ";
        }
    }
    
    entry.textContent = logText;
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;
};

// Функция ожидания с таймаутом
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Безопасное создание объекта PhysJS с расширенной диагностикой
async function safeCreateObject(selector) {
    console.log(`Попытка создать объект PhysJS для селектора: ${selector}`);
    
    // Проверяем доступность PhysJS
    if (typeof physjs === 'undefined') {
        console.error("PhysJS недоступен при создании объекта");
        return null;
    }
    
    // Проверка и получение DOM-элемента
    let element;
    if (typeof selector === 'string') {
        element = document.querySelector(selector);
        if (!element) {
            console.error(`Элемент не найден по селектору: ${selector}`);
            return null;
        }
        console.log(`Найден DOM элемент для селектора: ${selector}`, element);
    } else {
        element = selector;
    }
    
    // Проверка существующего объекта PhysJS
    const existingObject = physjs.getObject(element);
    if (existingObject) {
        console.log(`Найден существующий PhysJS объект для ${element.id || 'элемента'}`);
        return existingObject;
    }
    
    console.log(`Создаю новый PhysJS объект для элемента ${element.id || 'без ID'}`);
    
    // Установка необходимых классов и атрибутов
    element.classList.add('phys-attachable');
    if (!element.getAttribute('data-type') && element.id) {
        element.setAttribute('data-type', element.id);
    }
    
    // Убедимся, что элемент имеет position: absolute
    if (getComputedStyle(element).position !== 'absolute') {
        element.style.position = 'absolute';
    }
    
    // Пауза для применения изменений в DOM
    await wait(50);
    
    // Попытка создания объекта
    try {
        const physObject = physjs.createObject(element);
        if (physObject) {
            console.log(`Успешно создан объект PhysJS для ${element.id || 'элемента без ID'}`);
            return physObject;
        } else {
            console.error(`Не удалось создать PhysJS объект для ${element.id || 'элемента'}`);
        }
    } catch (err) {
        console.error(`Ошибка при создании PhysJS объекта: ${err.message}`);
    }
    
    return null;
}

// Регистрация обработчиков для кнопок управления тестами
function registerButtonHandlers() {
    try {
        // Определяем обработчики для всех кнопок
        const buttons = {
            'run-all-tests': () => BrowserTest.runTests(),
            'run-creation-tests': () => BrowserTest.runTests('Создание и инициализация объектов'),
            'run-position-tests': () => BrowserTest.runTests('Позиционирование и перемещение'),
            'run-rotation-tests': () => BrowserTest.runTests('Поворот объектов'),
            'run-attachment-tests': () => BrowserTest.runTests('Точки прикрепления'),
            'run-attach-detach-tests': () => BrowserTest.runTests('Прикрепление и отсоединение объектов'),
            'run-overlap-tests': () => BrowserTest.runTests('Обнаружение перекрытий'),
            'run-event-tests': () => BrowserTest.runTests('События прикрепления и отсоединения'),
            'run-lab-tests': () => BrowserTest.runTests('Лабораторные шаги'),
            'clear-results': () => {
                BrowserTest.clearResults();
                setupTestEnvironment();
            }
        };
        
        // Добавляем обработчики для каждой кнопки
        Object.entries(buttons).forEach(([id, handler]) => {
            const button = document.getElementById(id);
            if (button) {
                // Клонируем кнопку чтобы избежать дублирования обработчиков
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                newButton.addEventListener('click', handler);
            } else {
                console.warn(`Кнопка с ID "${id}" не найдена`);
            }
        });
        
        console.log("Обработчики кнопок успешно зарегистрированы");
    } catch (e) {
        console.error("Ошибка при регистрации обработчиков кнопок:", e);
    }
}

// Сброс тестовой среды между тестами
async function resetTestEnvironment() {
    try {
        if (typeof physjs !== 'undefined') {
            physjs.detachAll();
            physjs.resetLab();
        }
    } catch (e) {
        console.error("Ошибка при сбросе тестовой среды:", e);
    }
}

// Инициализация тестовой среды
async function setupTestEnvironment() {
    console.log("Начало настройки тестового окружения");
    
    const testArea = document.getElementById('test-area');
    if (!testArea) {
        console.error("Не найден элемент #test-area");
        return;
    }
    
    testArea.innerHTML = '';
    
    // Создаем тестовые элементы с правильными классами и атрибутами
    testArea.innerHTML = `
        <div id="stand" data-type="stand" data-name="Штатив" class="phys-fixed phys-attachable" 
             style="width: 80px; height: 300px; left: 50px; top: 50px; position: absolute; background-color: #95a5a6;">Штатив</div>
        
        <div id="dynamometer" data-type="dynamometer" data-name="Динамометр" class="phys phys-attachable" 
             style="width: 40px; height: 150px; left: 200px; top: 80px; position: absolute; background-color: #34495e; color: white">Динамометр</div>
        
        <div id="ruler" data-type="ruler" data-name="Линейка" class="phys phys-attachable" 
             style="width: 250px; height: 30px; left: 300px; top: 100px; position: absolute; background-color: #ecf0f1;">Линейка</div>
        
        <div id="weight" data-type="weight" data-name="Груз" class="phys phys-attachable" 
             style="width: 60px; height: 60px; left: 400px; top: 250px; position: absolute; background-color: #7f8c8d; color: white; border-radius: 50%;">Груз</div>
    `;
    
    // Проверяем создание элементов
    const elements = ['stand', 'dynamometer', 'ruler', 'weight'];
    for (const id of elements) {
        const element = document.getElementById(id);
        if (element) {
            console.log(`Элемент #${id} успешно создан`);
        } else {
            console.error(`Элемент #${id} не был создан!`);
        }
    }
    
    // Даем время для отрисовки DOM
    await wait(100);
    
    // Инициализируем PhysJS
    try {
        if (typeof physjs !== 'undefined') {
            console.log("Инициализация PhysJS...");
            physjs.init();
            physjs.setDebugMode(true);
            console.log("PhysJS успешно инициализирован");
            
            // Проверяем работоспособность
            for (const id of elements) {
                const obj = await safeCreateObject(`#${id}`);
                if (obj) {
                    console.log(`PhysJS успешно создал объект для #${id}`);
                } else {
                    console.error(`Не удалось создать PhysJS объект для #${id}`);
                }
            }
        } else {
            console.error("PhysJS не найден!");
        }
    } catch (e) {
        console.error("Ошибка при инициализации PhysJS:", e);
    }
    
    // Регистрируем обработчики для кнопок
    registerButtonHandlers();
    
    console.log("Настройка тестового окружения завершена");
}

// Определяем все тесты в формате, совместимом с BrowserTest
document.addEventListener('DOMContentLoaded', async function() {
    await setupTestEnvironment();
    defineAllTests();
});

// Определение всех тестов
function defineAllTests() {
    // Секция 1: Создание и инициализация объектов
    BrowserTest.describe('Создание и инициализация объектов', function() {
        window.testRegistry['Создание и инициализация объектов'] = {};
        
        BrowserTest.test('Создание физического объекта', async function() {
            console.log("Начало теста 'Создание физического объекта'");
            
            // Проверяем наличие элемента
            const standElement = document.getElementById('stand');
            if (!standElement) {
                throw new Error("Элемент #stand не найден в DOM");
            }
            
            // Безопасное создание объекта
            const stand = await safeCreateObject('#stand');
            
            // Проверяем результат
            BrowserTest.expect(stand).toBeDefined();
            BrowserTest.expect(stand.element).toBe(standElement);
            BrowserTest.expect(stand.rotation).toBe(0);
            BrowserTest.expect(stand.isAttached).toBeFalsy();
            
            console.log("Тест успешно завершен");
        });
        window.testRegistry['Создание и инициализация объектов']['Создание физического объекта'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Получение существующего объекта', async function() {
            await safeCreateObject('#stand');
            const stand = physjs.getObject('#stand');
            const standElement = document.getElementById('stand');
            
            BrowserTest.expect(stand).toBeDefined();
            BrowserTest.expect(stand.element).toBe(standElement);
        });
        window.testRegistry['Создание и инициализация объектов']['Получение существующего объекта'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Получение несуществующего объекта', async function() {
            const nonExistentObj = physjs.getObject('#non-existent');
            
            BrowserTest.expect(nonExistentObj).toBeNull();
        });
        window.testRegistry['Создание и инициализация объектов']['Получение несуществующего объекта'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
    });
    
    // Секция 2: Позиционирование и перемещение
    BrowserTest.describe('Позиционирование и перемещение', function() {
        window.testRegistry['Позиционирование и перемещение'] = {};
        
        BrowserTest.test('Установка позиции объекта', async function() {
            const dynamometer = await safeCreateObject('#dynamometer');
            const dynamometerElement = document.getElementById('dynamometer');
            
            dynamometer.setPosition(150, 250);
            
            BrowserTest.expect(dynamometerElement.style.left).toBe('150px');
            BrowserTest.expect(dynamometerElement.style.top).toBe('250px');
            
            // Возвращаем в исходное положение
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['Позиционирование и перемещение']['Установка позиции объекта'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Получение позиции объекта', async function() {
            const dynamometer = await safeCreateObject('#dynamometer');
            dynamometer.setPosition(150, 250);
            
            const position = dynamometer.getPosition();
            
            BrowserTest.expect(position.x).toBe(150);
            BrowserTest.expect(position.y).toBe(250);
            
            // Возвращаем в исходное положение
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['Позиционирование и перемещение']['Получение позиции объекта'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Перемещение объекта', async function() {
            const dynamometer = await safeCreateObject('#dynamometer');
            const dynamometerElement = document.getElementById('dynamometer');
            
            dynamometer.setPosition(150, 250);
            dynamometer.move(50, 50);
            
            BrowserTest.expect(dynamometerElement.style.left).toBe('200px');
            BrowserTest.expect(dynamometerElement.style.top).toBe('300px');
            
            // Возвращаем в исходное положение
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['Позиционирование и перемещение']['Перемещение объекта'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Перемещение объекта с прикрепленными объектами', async function() {
            const stand = await safeCreateObject('#stand');
            const dynamometer = await safeCreateObject('#dynamometer');
            const standElement = document.getElementById('stand');
            const dynamometerElement = document.getElementById('dynamometer');
            
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            stand.attach(dynamometer);
            
            const initialStandLeft = parseInt(standElement.style.left);
            const initialStandTop = parseInt(standElement.style.top);
            const initialDynamometerLeft = parseInt(dynamometerElement.style.left);
            const initialDynamometerTop = parseInt(dynamometerElement.style.top);
            
            stand.move(20, 30);
            
            // Стенд должен переместиться
            BrowserTest.expect(parseInt(standElement.style.left)).toBe(initialStandLeft + 20);
            BrowserTest.expect(parseInt(standElement.style.top)).toBe(initialStandTop + 30);
            
            // Динамометр должен переместиться вместе со стендом
            BrowserTest.expect(parseInt(dynamometerElement.style.left)).toBe(initialDynamometerLeft + 20);
            BrowserTest.expect(parseInt(dynamometerElement.style.top)).toBe(initialDynamometerTop + 30);
            
            // Отсоединяем и возвращаем в исходное положение
            dynamometer.detach();
            stand.setPosition(50, 50);
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['Позиционирование и перемещение']['Перемещение объекта с прикрепленными объектами'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
    });
    
    // Секция 3: Поворот объектов
    BrowserTest.describe('Поворот объектов', function() {
        window.testRegistry['Поворот объектов'] = {};
        
        BrowserTest.test('Поворот объекта на заданный угол', async function() {
            const ruler = await safeCreateObject('#ruler');
            const rulerElement = document.getElementById('ruler');
            
            ruler.rotate(45);
            
            BrowserTest.expect(ruler.rotation).toBe(45);
            BrowserTest.expect(rulerElement.style.transform).toBe('rotate(45deg)');
            
            // Возвращаем в исходное положение
            ruler.rotate(-45);
        });
        window.testRegistry['Поворот объектов']['Поворот объекта на заданный угол'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Невозможность поворота прикрепленного объекта', async function() {
            const stand = await safeCreateObject('#stand');
            const dynamometer = await safeCreateObject('#dynamometer');
            const dynamometerElement = document.getElementById('dynamometer');
            
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            stand.attach(dynamometer);
            
            // Попытка повернуть прикрепленный объект
            dynamometer.rotate(45);
            
            // Поворот не должен произойти
            BrowserTest.expect(dynamometer.rotation).toBe(0);
            BrowserTest.expect(dynamometerElement.style.transform).toBe('rotate(0deg)');
            
            // Отсоединяем и возвращаем в исходное положение
            dynamometer.detach();
            stand.setPosition(50, 50);
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['Поворот объектов']['Невозможность поворота прикрепленного объекта'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
    });
    
    // Секция 4: Точки прикрепления
    BrowserTest.describe('Точки прикрепления', function() {
        window.testRegistry['Точки прикрепления'] = {};
        
        BrowserTest.test('Добавление точки прикрепления', async function() {
            const stand = await safeCreateObject('#stand');
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            
            const attachmentPoints = stand.getAttachmentPoints();
            
            BrowserTest.expect(attachmentPoints.length).toBeInstanceOf(Number);
            BrowserTest.expect(attachmentPoints.length).toBe(1);
            BrowserTest.expect(attachmentPoints[0].id).toBe('dynamometer-point');
            BrowserTest.expect(attachmentPoints[0].x).toBe(30);
            BrowserTest.expect(attachmentPoints[0].y).toBe(20);
            BrowserTest.expect(attachmentPoints[0].acceptedTypes[0]).toBe('dynamometer');
        });
        window.testRegistry['Точки прикрепления']['Добавление точки прикрепления'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Поиск совместимой точки прикрепления', async function() {
            const stand = await safeCreateObject('#stand');
            const dynamometer = await safeCreateObject('#dynamometer');
            const ruler = await safeCreateObject('#ruler');
            
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            
            // Совместимая точка для динамометра
            const compatiblePoint = stand.findCompatibleAttachmentPoint(dynamometer);
            BrowserTest.expect(compatiblePoint).toBeDefined();
            BrowserTest.expect(compatiblePoint.id).toBe('dynamometer-point');
            
            // Несовместимая точка для линейки
            const incompatiblePoint = stand.findCompatibleAttachmentPoint(ruler);
            BrowserTest.expect(incompatiblePoint).toBeNull();
        });
        window.testRegistry['Точки прикрепления']['Поиск совместимой точки прикрепления'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
    });
    
    // Секция 5: Прикрепление и отсоединение объектов
    BrowserTest.describe('Прикрепление и отсоединение объектов', function() {
        window.testRegistry['Прикрепление и отсоединение объектов'] = {};
        
        BrowserTest.test('Прикрепление объекта', async function() {
            const stand = await safeCreateObject('#stand');
            const dynamometer = await safeCreateObject('#dynamometer');
            
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            
            const result = stand.attach(dynamometer);
            
            BrowserTest.expect(result).toBeTruthy();
            BrowserTest.expect(stand.attachedObjects.has(dynamometer)).toBeTruthy();
            BrowserTest.expect(dynamometer.isAttached).toBeTruthy();
            BrowserTest.expect(dynamometer.parentObject).toBe(stand);
            BrowserTest.expect(dynamometer.attachedToPoint).toBe('dynamometer-point');
            
            // Проверяем, что объект переместился в точку прикрепления
            const standPos = stand.getPosition();
            const dynamometerPos = dynamometer.getPosition();
            
            BrowserTest.expect(dynamometerPos.x).toBe(standPos.x + 30);
            BrowserTest.expect(dynamometerPos.y).toBe(standPos.y + 20);
            
            // Отсоединяем и возвращаем в исходное положение
            dynamometer.detach();
            stand.setPosition(50, 50);
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['Прикрепление и отсоединение объектов']['Прикрепление объекта'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Прикрепление объекта к уже прикрепленному объекту', async function() {
            const stand = await safeCreateObject('#stand');
            const dynamometer = await safeCreateObject('#dynamometer');
            
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            stand.attach(dynamometer);
            
            // Пытаемся прикрепить стенд к динамометру
            const result = dynamometer.attach(stand);
            
            // Это должно быть невозможно, так как динамометр уже прикреплен
            BrowserTest.expect(result).toBeFalsy();
            
            // Отсоединяем и возвращаем в исходное положение
            dynamometer.detach();
            stand.setPosition(50, 50);
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['Прикрепление и отсоединение объектов']['Прикрепление объекта к уже прикрепленному объекту'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Прикрепление объекта с отсутствующей совместимой точкой', async function() {
            const stand = await safeCreateObject('#stand');
            const ruler = await safeCreateObject('#ruler');
            
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            
            // Пытаемся прикрепить линейку, хотя точка принимает только динамометр
            const result = stand.attach(ruler);
            
            BrowserTest.expect(result).toBeFalsy();
            BrowserTest.expect(stand.attachedObjects.has(ruler)).toBeFalsy();
            BrowserTest.expect(ruler.isAttached).toBeFalsy();
            
            // Возвращаем в исходное положение
            stand.setPosition(50, 50);
            ruler.setPosition(300, 100);
        });
        window.testRegistry['Прикрепление и отсоединение объектов']['Прикрепление объекта с отсутствующей совместимой точкой'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Отсоединение объекта', async function() {
            const stand = await safeCreateObject('#stand');
            const dynamometer = await safeCreateObject('#dynamometer');
            
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            stand.attach(dynamometer);
            
            // Отсоединяем динамометр
            dynamometer.detach();
            
            BrowserTest.expect(stand.attachedObjects.has(dynamometer)).toBeFalsy();
            BrowserTest.expect(dynamometer.isAttached).toBeFalsy();
            BrowserTest.expect(dynamometer.parentObject).toBeNull();
            BrowserTest.expect(dynamometer.attachedToPoint).toBeNull();
            
            // Возвращаем в исходное положение
            stand.setPosition(50, 50);
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['Прикрепление и отсоединение объектов']['Отсоединение объекта'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Отсоединение корневого объекта с прикрепленными объектами', async function() {
            const stand = await safeCreateObject('#stand');
            const dynamometer = await safeCreateObject('#dynamometer');
            const ruler = await safeCreateObject('#ruler');
            
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            physjs.addAttachmentPoint('#dynamometer', 'ruler-point', 20, 30, ['ruler']);
            
            stand.attach(dynamometer);
            dynamometer.attach(ruler);
            
            // Отсоединяем стенд (корневой объект)
            stand.detach();
            
            // Проверяем, что все объекты отсоединены
            BrowserTest.expect(stand.attachedObjects.size).toBe(0);
            BrowserTest.expect(dynamometer.isAttached).toBeFalsy();
            BrowserTest.expect(ruler.isAttached).toBeFalsy();
            
            // Возвращаем в исходное положение
            stand.setPosition(50, 50);
            dynamometer.setPosition(200, 80);
            ruler.setPosition(300, 100);
        });
        window.testRegistry['Прикрепление и отсоединение объектов']['Отсоединение корневого объекта с прикрепленными объектами'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
    });
    
    // Секция 6: Обнаружение перекрытий
    BrowserTest.describe('Обнаружение перекрытий', function() {
        window.testRegistry['Обнаружение перекрытий'] = {};
        
        BrowserTest.test('Обнаружение перекрытия объектов', async function() {
            const stand = await safeCreateObject('#stand');
            const dynamometer = await safeCreateObject('#dynamometer');
            
            // Перемещаем динамометр так, чтобы он перекрывался со стендом
            const standPos = stand.getPosition();
            dynamometer.setPosition(standPos.x + 20, standPos.y + 20);
            
            // Запускаем перерисовку браузера, чтобы обновились позиции
            await wait(50);
            
            const overlap = stand.isOverlapping(dynamometer);
            console.log('Перекрытие:', overlap);
            
            BrowserTest.expect(overlap).toBeTruthy();
            
            // Возвращаем в исходное положение
            stand.setPosition(50, 50);
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['Обнаружение перекрытий']['Обнаружение перекрытия объектов'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Объекты не перекрываются', async function() {
            const stand = await safeCreateObject('#stand');
            const ruler = await safeCreateObject('#ruler');
            
            // Явно устанавливаем позиции, чтобы гарантировать отсутствие перекрытия
            stand.setPosition(50, 50);
            ruler.setPosition(400, 400);
            
            // Запускаем перерисовку браузера, чтобы обновились позиции
            await wait(50);
            
            BrowserTest.expect(stand.isOverlapping(ruler)).toBeFalsy();
            BrowserTest.expect(ruler.isOverlapping(stand)).toBeFalsy();
            
            // Возвращаем в исходное положение
            stand.setPosition(50, 50);
            ruler.setPosition(300, 100);
        });
        window.testRegistry['Обнаружение перекрытий']['Объекты не перекрываются'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
    });
    
    // Секция 7: События
    BrowserTest.describe('События прикрепления и отсоединения', function() {
        window.testRegistry['События прикрепления и отсоединения'] = {};
        
        BrowserTest.test('Событие прикрепления вызывается', async function() {
            let attachmentCalled = false;
            let savedSource = null;
            let savedTarget = null;
            
            // Регистрируем обработчик событий
            physjs.onAttachment(function(sourceObject, targetObject) {
                attachmentCalled = true;
                savedSource = sourceObject;
                savedTarget = targetObject;
            });
            
            const stand = await safeCreateObject('#stand');
            const dynamometer = await safeCreateObject('#dynamometer');
            
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            stand.attach(dynamometer);
            
            BrowserTest.expect(attachmentCalled).toBeTruthy();
            BrowserTest.expect(savedSource).toBe(stand);
            BrowserTest.expect(savedTarget).toBe(dynamometer);
            
            // Отсоединяем и возвращаем в исходное положение
            dynamometer.detach();
            stand.setPosition(50, 50);
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['События прикрепления и отсоединения']['Событие прикрепления вызывается'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
        
        BrowserTest.test('Событие отсоединения вызывается', async function() {
            let detachmentCalled = false;
            let savedObject = null;
            
            // Регистрируем обработчик событий
            physjs.onDetachment(function(object) {
                detachmentCalled = true;
                savedObject = object;
            });
            
            const stand = await safeCreateObject('#stand');
            const dynamometer = await safeCreateObject('#dynamometer');
            
            physjs.addAttachmentPoint('#stand', 'dynamometer-point', 30, 20, ['dynamometer']);
            stand.attach(dynamometer);
            dynamometer.detach();
            
            BrowserTest.expect(detachmentCalled).toBeTruthy();
            BrowserTest.expect(savedObject).toBe(dynamometer);
            
            // Возвращаем в исходное положение
            stand.setPosition(50, 50);
            dynamometer.setPosition(200, 80);
        });
        window.testRegistry['События прикрепления и отсоединения']['Событие отсоединения вызывается'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
    });
    
    // Секция 8: Лабораторные шаги
    BrowserTest.describe('Лабораторные шаги', function() {
        window.testRegistry['Лабораторные шаги'] = {};
        
        BrowserTest.test('Создание и навигация по шагам', async function() {
            physjs.resetLab();
            
            const step1 = physjs.createStep('step1', 'Шаг 1', ['#stand']);
            const step2 = physjs.createStep('step2', 'Шаг 2', ['#dynamometer']);
            
            physjs.addStep(step1).addStep(step2);           
            BrowserTest.expect(physjs.getCurrentStep().id).toBe('step1');
            
            physjs.nextStep();
            BrowserTest.expect(physjs.getCurrentStep().id).toBe('step2');
            
            physjs.previousStep();
            BrowserTest.expect(physjs.getCurrentStep().id).toBe('step1');
            
            physjs.goToStep('step2');
            BrowserTest.expect(physjs.getCurrentStep().id).toBe('step2');
            
            physjs.resetLab();
        });
        window.testRegistry['Лабораторные шаги']['Создание и навигация по шагам'] = 
            BrowserTest.currentSuite.tests[BrowserTest.currentSuite.tests.length - 1].callback;
    });
}