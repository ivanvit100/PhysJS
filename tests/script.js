function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTestObject(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Элемент не найден: ${selector}`);
    }
    
    const existingObj = physjs.getObject(element);
    if (existingObj) {
        return existingObj;
    }
    
    element.classList.add('phys-attachable');
    if (!element.dataset.type) {
        element.dataset.type = element.id;
    }
    if (getComputedStyle(element).position !== 'absolute') {
        element.style.position = 'absolute';
    }
    
    await wait(50);
    
    const physObject = physjs.createObject(element);
    if (!physObject) {
        throw new Error(`Не удалось создать PhysJS объект для ${selector}`);
    }
    
    return physObject;
}

async function setupTestEnvironment() {
    log("Настройка тестового окружения...");
    
    const testArea = document.getElementById('test-area');
    testArea.innerHTML = '';
    
    testArea.innerHTML = `
        <div id="stand" data-type="stand" class="phys-fixed phys-attachable" 
             style="width: 80px; height: 300px; left: 50px; top: 50px; position: absolute; background-color: #95a5a6;">Штатив</div>
        
        <div id="dynamometer" data-type="dynamometer" class="phys phys-attachable" 
             style="width: 40px; height: 150px; left: 200px; top: 80px; position: absolute; background-color: #34495e; color: white">Динамометр</div>
        
        <div id="ruler" data-type="ruler" class="phys phys-attachable" 
             style="width: 250px; height: 30px; left: 300px; top: 100px; position: absolute; background-color: #ecf0f1;">Линейка</div>
        
        <div id="weight" data-type="weight" class="phys phys-attachable" 
             style="width: 60px; height: 60px; left: 400px; top: 250px; position: absolute; background-color: #7f8c8d; color: white; border-radius: 50%;">Груз</div>
        
        <div id="temp-object" style="width: 100px; height: 100px; position: absolute; background-color: #e74c3c; visibility: hidden; display: none;">Временный объект</div>
        
        <div id="combined-object" data-type="combined" class="phys-attachable" 
             style="width: 200px; height: 200px; position: absolute; background-color: #3498db; visibility: hidden; display: none;">Объединенный объект</div>
    `;
    
    await wait(100);
    
    try {
        physjs.init();
        physjs.setDebugMode(true);
        
        await createTestObject('#stand');
        await createTestObject('#dynamometer');
        await createTestObject('#ruler');
        await createTestObject('#weight');
        
        log("Тестовое окружение настроено успешно");
    } catch (error) {
        log("Ошибка при настройке тестового окружения: " + error.message, "error");
    }
}

async function resetTestEnvironment() {
    try {
        physjs.detachAll();
        physjs.resetLab();
    } catch (error) {
        log("Ошибка при сбросе тестового окружения: " + error.message, "error");
    }
}

window.testRegistry = {};

function setupButtonHandlers() {
    const buttons = {
        'run-all-tests': () => TestFramework.runTests(),
        'run-creation-tests': () => TestFramework.runTests('Создание и инициализация объектов'),
        'run-position-tests': () => TestFramework.runTests('Позиционирование и перемещение'),
        'run-rotation-tests': () => TestFramework.runTests('Поворот объектов'),
        'run-attachment-tests': () => TestFramework.runTests('Точки прикрепления'),
        'run-attach-detach-tests': () => TestFramework.runTests('Прикрепление и отсоединение объектов'),
        'run-overlap-tests': () => TestFramework.runTests('Обнаружение перекрытий'),
        'run-event-tests': () => TestFramework.runTests('События прикрепления и отсоединения'),
        'run-lab-tests': () => TestFramework.runTests('Лабораторные шаги'),
        'run-advanced-tests': () => TestFramework.runTests('Расширенные операции с объектами'),
        'clear-results': () => {
            TestFramework.clearResults();
            setupTestEnvironment();
        }
    };
    
    Object.entries(buttons).forEach(([id, handler]) => {
        const button = document.getElementById(id);
        if (button) {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', handler);
        }
    });
}

function defineAllTests() {
    TestFramework.describe('Создание и инициализация объектов', function() {
        TestFramework.test('Создание физического объекта', async function() {
            const stand = await createTestObject('#stand');
            TestFramework.expect(stand).toBeTruthy();
            TestFramework.expect(stand.element).toBe(document.getElementById('stand'));
            TestFramework.expect(stand.rotation).toBe(0);
            TestFramework.expect(stand.isAttached).toBeFalsy();
        });
        
        TestFramework.test('Получение существующего объекта', async function() {
            await createTestObject('#dynamometer');
            const dynamometer = physjs.getObject('#dynamometer');
            
            TestFramework.expect(dynamometer).toBeTruthy();
            TestFramework.expect(dynamometer.element).toBe(document.getElementById('dynamometer'));
        });
        
        TestFramework.test('Получение несуществующего объекта', async function() {
            const nonExistent = physjs.getObject('#non-existent');
            TestFramework.expect(nonExistent).toBeNull();
        });
    });
    
    TestFramework.describe('Позиционирование и перемещение', function() {
        TestFramework.test('Установка позиции объекта', async function() {
            const ruler = await createTestObject('#ruler');
            ruler.setPosition(150, 200);
            
            const position = ruler.getPosition();
            TestFramework.expect(position.x).toBe(150);
            TestFramework.expect(position.y).toBe(200);
            TestFramework.expect(ruler.element.style.left).toBe('150px');
            TestFramework.expect(ruler.element.style.top).toBe('200px');
        });
        
        TestFramework.test('Перемещение объекта на указанное расстояние', async function() {
            const weight = await createTestObject('#weight');
            const initialPos = weight.getPosition();
            weight.move(50, 60);
            
            const newPos = weight.getPosition();
            TestFramework.expect(newPos.x).toBe(initialPos.x + 50);
            TestFramework.expect(newPos.y).toBe(initialPos.y + 60);
        });
        
        TestFramework.test('Перемещение объекта с прикрепленными объектами', async function() {
            const stand = await createTestObject('#stand');
            const dynamometer = await createTestObject('#dynamometer');
            
            stand.attachmentPoints = [];
            physjs.addAttachmentPoint('#stand', 'top', 40, 20, ['dynamometer']);
            
            stand.attach(dynamometer);
            
            const initialStandPos = stand.getPosition();
            const initialDynamometerPos = dynamometer.getPosition();
            
            stand.move(30, 40);
            
            const newStandPos = stand.getPosition();
            const newDynamometerPos = dynamometer.getPosition();
            
            TestFramework.expect(newStandPos.x).toBe(initialStandPos.x + 30);
            TestFramework.expect(newStandPos.y).toBe(initialStandPos.y + 40);
            TestFramework.expect(newDynamometerPos.x).toBe(initialDynamometerPos.x + 30);
            TestFramework.expect(newDynamometerPos.y).toBe(initialDynamometerPos.y + 40);
        });
    });
    
    TestFramework.describe('Поворот объектов', function() {
        TestFramework.test('Поворот на заданный угол', async function() {
            const ruler = await createTestObject('#ruler');
            ruler.rotate(45);
            
            TestFramework.expect(ruler.rotation).toBe(45);
            TestFramework.expect(ruler.element.style.transform).toBe('rotate(45deg)');
        });
        
        TestFramework.test('Накопительный поворот', async function() {
            const weight = await createTestObject('#weight');
            weight.rotate(30);
            weight.rotate(15);
            
            TestFramework.expect(weight.rotation).toBe(45);
            TestFramework.expect(weight.element.style.transform).toBe('rotate(45deg)');
        });
        
        TestFramework.test('Невозможность поворота прикрепленного объекта', async function() {
            const stand = await createTestObject('#stand');
            const dynamometer = await createTestObject('#dynamometer');
            
            stand.attachmentPoints = [];
            physjs.addAttachmentPoint('#stand', 'top', 40, 20, ['dynamometer']);
            
            stand.attach(dynamometer);
            
            dynamometer.rotate(45);
            
            TestFramework.expect(dynamometer.rotation).toBe(0);
        });
    });
    
    TestFramework.describe('Точки прикрепления', function() {
        TestFramework.test('Добавление точки прикрепления', async function() {
            const stand = await createTestObject('#stand');
            
            stand.attachmentPoints = [];
            
            physjs.addAttachmentPoint('#stand', 'test-point', 30, 40, ['dynamometer']);
            
            const points = stand.getAttachmentPoints();
            TestFramework.expect(points.length).toBeGreaterThan(0);
            
            const newPoint = points.find(p => p.id === 'test-point');
            TestFramework.expect(newPoint).toBeTruthy();
            TestFramework.expect(newPoint.x).toBe(30);
            TestFramework.expect(newPoint.y).toBe(40);
            TestFramework.expect(newPoint.acceptedTypes).toContain('dynamometer');
        });
        
        TestFramework.test('Поиск совместимой точки прикрепления', async function() {
            const stand = await createTestObject('#stand');
            const dynamometer = await createTestObject('#dynamometer');
            const ruler = await createTestObject('#ruler');
            
            stand.attachmentPoints = [];
            
            physjs.addAttachmentPoint('#stand', 'dyn-point', 30, 40, ['dynamometer']);
            
            const compatiblePoint = stand.findCompatibleAttachmentPoint(dynamometer);
            TestFramework.expect(compatiblePoint).toBeTruthy();
            
            const incompatiblePoint = stand.findCompatibleAttachmentPoint(ruler);
            TestFramework.expect(incompatiblePoint).toBeNull();
        });
        
        TestFramework.test('Точки прикрепления для разных типов объектов', async function() {
            const stand = await createTestObject('#stand');
            
            stand.attachmentPoints = [];
            
            physjs.addAttachmentPoint('#stand', 'dyn-point', 30, 40, ['dynamometer']);
            physjs.addAttachmentPoint('#stand', 'any-point', 50, 60, []);
            
            const dynamometer = await createTestObject('#dynamometer');
            const ruler = await createTestObject('#ruler');
            
            const dynPoint = stand.findCompatibleAttachmentPoint(dynamometer);
            TestFramework.expect(dynPoint.id).toBe('dyn-point');
            
            const anyPoint = stand.findCompatibleAttachmentPoint(ruler);
            TestFramework.expect(anyPoint.id).toBe('any-point');
        });
    });
    
    TestFramework.describe('Прикрепление и отсоединение объектов', function() {
        TestFramework.test('Прикрепление объекта', async function() {
            const stand = await createTestObject('#stand');
            const dynamometer = await createTestObject('#dynamometer');
            
            stand.attachmentPoints = [];
            physjs.addAttachmentPoint('#stand', 'dyn-point', 30, 40, ['dynamometer']);
            
            const result = stand.attach(dynamometer);
            
            TestFramework.expect(result).toBeTruthy();
            TestFramework.expect(dynamometer.isAttached).toBeTruthy();
            TestFramework.expect(dynamometer.parentObject).toBe(stand);
            TestFramework.expect(dynamometer.attachedToPoint).toBe('dyn-point');
            TestFramework.expect(stand.attachedObjects.has(dynamometer)).toBeTruthy();
        });
        
        TestFramework.test('Отсоединение объекта', async function() {
            const stand = await createTestObject('#stand');
            const dynamometer = await createTestObject('#dynamometer');
            
            stand.attachmentPoints = [];
            physjs.addAttachmentPoint('#stand', 'dyn-point', 30, 40, ['dynamometer']);
            
            stand.attach(dynamometer);
            dynamometer.detach();
            
            TestFramework.expect(dynamometer.isAttached).toBeFalsy();
            TestFramework.expect(dynamometer.parentObject).toBeNull();
            TestFramework.expect(dynamometer.attachedToPoint).toBeNull();
            TestFramework.expect(stand.attachedObjects.has(dynamometer)).toBeFalsy();
        });
        
        TestFramework.test('Прикрепление к несовместимой точке', async function() {
            const stand = await createTestObject('#stand');
            const ruler = await createTestObject('#ruler');
            
            stand.attachmentPoints = [];
            physjs.addAttachmentPoint('#stand', 'dyn-point', 30, 40, ['dynamometer']);
            
            const result = stand.attach(ruler);
            
            TestFramework.expect(result).toBeFalsy();
            TestFramework.expect(ruler.isAttached).toBeFalsy();
            TestFramework.expect(stand.attachedObjects.has(ruler)).toBeFalsy();
        });
        
        TestFramework.test('Каскадное отсоединение объектов', async function() {
            const stand = await createTestObject('#stand');
            const dynamometer = await createTestObject('#dynamometer');
            const weight = await createTestObject('#weight');
            
            stand.attachmentPoints = [];
            dynamometer.attachmentPoints = [];
            
            physjs.addAttachmentPoint('#stand', 'dyn-point', 30, 40, ['dynamometer']);
            physjs.addAttachmentPoint('#dynamometer', 'weight-point', 20, 30, ['weight']);
            
            stand.attach(dynamometer);
            dynamometer.attach(weight);
            
            stand.detach();
            
            TestFramework.expect(stand.attachedObjects.size).toBe(0);
            TestFramework.expect(dynamometer.isAttached).toBeFalsy();
            TestFramework.expect(weight.isAttached).toBeFalsy();
        });
    });
    
    TestFramework.describe('Обнаружение перекрытий', function() {
        TestFramework.test('Обнаружение перекрытия объектов', async function() {
            const stand = await createTestObject('#stand');
            const dynamometer = await createTestObject('#dynamometer');
            
            stand.setPosition(100, 100);
            dynamometer.setPosition(110, 110);
            
            await wait(50);
            
            const overlap = stand.isOverlapping(dynamometer);
            TestFramework.expect(overlap).toBeTruthy();
            
            const reverseOverlap = dynamometer.isOverlapping(stand);
            TestFramework.expect(reverseOverlap).toBeTruthy();
        });
        
        TestFramework.test('Объекты не перекрываются', async function() {
            const ruler = await createTestObject('#ruler');
            const weight = await createTestObject('#weight');
            
            ruler.setPosition(50, 50);
            weight.setPosition(500, 500);
            
            await wait(50);
            
            const overlap = ruler.isOverlapping(weight);
            TestFramework.expect(overlap).toBeFalsy();
        });
    });
    
    TestFramework.describe('События прикрепления и отсоединения', function() {
        TestFramework.test('Событие прикрепления', async function() {
            let attachEventFired = false;
            let sourceObj = null;
            let targetObj = null;
            
            physjs.onAttachment(function(source, target) {
                attachEventFired = true;
                sourceObj = source;
                targetObj = target;
            });
            
            const stand = await createTestObject('#stand');
            const dynamometer = await createTestObject('#dynamometer');
            
            stand.attachmentPoints = [];
            
            physjs.addAttachmentPoint('#stand', 'dyn-point', 30, 40, ['dynamometer']);
            stand.attach(dynamometer);
            
            TestFramework.expect(attachEventFired).toBeTruthy();
            TestFramework.expect(sourceObj).toBe(stand);
            TestFramework.expect(targetObj).toBe(dynamometer);
        });
        
        TestFramework.test('Событие отсоединения', async function() {
            let detachEventFired = false;
            let detachedObj = null;
            
            physjs.onDetachment(function(obj) {
                detachEventFired = true;
                detachedObj = obj;
            });
            
            const stand = await createTestObject('#stand');
            const dynamometer = await createTestObject('#dynamometer');
            
            stand.attachmentPoints = [];
            
            physjs.addAttachmentPoint('#stand', 'dyn-point', 30, 40, ['dynamometer']);
            stand.attach(dynamometer);
            dynamometer.detach();
            
            TestFramework.expect(detachEventFired).toBeTruthy();
            TestFramework.expect(detachedObj).toBe(dynamometer);
        });
    });
    
    TestFramework.describe('Лабораторные шаги', function() {
        TestFramework.test('Создание шага', async function() {
            const step = physjs.createStep('step1', 'Первый шаг', ['#dynamometer']);
            
            TestFramework.expect(step.id).toBe('step1');
            TestFramework.expect(step.description).toBe('Первый шаг');
            TestFramework.expect(step.allowedAttachments).toHaveLength(1);
            TestFramework.expect(step.allowedAttachments[0]).toBe('#dynamometer');
        });
        
        TestFramework.test('Добавление шагов и навигация', async function() {
            physjs.resetLab();
            
            const step1 = physjs.createStep('step1', 'Первый шаг', ['#dynamometer']);
            const step2 = physjs.createStep('step2', 'Второй шаг', ['#ruler']);
            
            physjs.addStep(step1).addStep(step2);
            
            TestFramework.expect(physjs.getCurrentStep().id).toBe('step1');
            
            physjs.nextStep();
            TestFramework.expect(physjs.getCurrentStep().id).toBe('step2');
            
            physjs.previousStep();
            TestFramework.expect(physjs.getCurrentStep().id).toBe('step1');
            
            physjs.goToStep('step2');
            TestFramework.expect(physjs.getCurrentStep().id).toBe('step2');
        });
        
        TestFramework.test('Допустимые прикрепления в шаге', async function() {
            physjs.resetLab();
            
            const step = physjs.createStep('step1', 'Тестовый шаг', ['#dynamometer']);
            physjs.addStep(step);
            
            const currentStep = physjs.getCurrentStep();
            TestFramework.expect(currentStep.isAttachmentAllowed(document.getElementById('dynamometer'))).toBeTruthy();
            TestFramework.expect(currentStep.isAttachmentAllowed(document.getElementById('ruler'))).toBeFalsy();
        });
        
        TestFramework.test('Допустимые отсоединения в шаге', async function() {
            physjs.resetLab();
            
            const stand = await createTestObject('#stand');
            const dynamometer = await createTestObject('#dynamometer');
            
            stand.attachmentPoints = [];
            physjs.addAttachmentPoint('#stand', 'dyn-point', 30, 40, ['dynamometer']);
            
            const step = physjs.createStep('step1', 'Тестовый шаг', [], ['*']);
            physjs.addStep(step);
            
            stand.attach(dynamometer);
            TestFramework.expect(dynamometer.isAttached).toBeTruthy();
            
            dynamometer.detach();
            
            TestFramework.expect(dynamometer.isAttached).toBeFalsy();
            TestFramework.expect(stand.attachedObjects.has(dynamometer)).toBeFalsy();
        });
    });
    
    // Новые тесты для расширенных функций
    TestFramework.describe('Расширенные операции с объектами', function() {
        TestFramework.test('Временное отображение объекта', async function() {
            const ruler = await createTestObject('#ruler');
            const weight = await createTestObject('#weight');
            
            // Устанавливаем позицию объектов
            ruler.setPosition(100, 100);
            
            // Начальная видимость
            TestFramework.expect(ruler.element.style.visibility === 'hidden').toBeFalsy();
            TestFramework.expect(document.querySelector('#temp-object').style.visibility).toBe('hidden');
            
            // Показываем временный объект
            physjs.showTemporaryObjectAt(ruler.element, weight.element, '#temp-object', 10, 20, 500);
            
            // Проверяем, что объект скрыт, а временный объект показан
            TestFramework.expect(ruler.element.style.visibility).toBe('hidden');
            TestFramework.expect(document.querySelector('#temp-object').style.visibility).toBe('visible');
            
            // Ждем пока временный объект исчезнет
            await wait(600);
            
            // Проверяем, что всё вернулось к исходному состоянию
            TestFramework.expect(ruler.element.style.visibility === 'hidden').toBeFalsy();
            TestFramework.expect(document.querySelector('#temp-object').style.visibility).toBe('hidden');
        });
        
        TestFramework.test('Объединение двух объектов в один', async function() {
            const dynamometer = await createTestObject('#dynamometer');
            const weight = await createTestObject('#weight');
            
            // Устанавливаем позиции объектов
            dynamometer.setPosition(150, 150);
            weight.setPosition(180, 180);
            
            // Начальная видимость
            TestFramework.expect(dynamometer.element.style.visibility === 'hidden').toBeFalsy();
            TestFramework.expect(weight.element.style.visibility === 'hidden').toBeFalsy();
            TestFramework.expect(document.querySelector('#combined-object').style.visibility).toBe('hidden');
            
            // Объединяем объекты
            physjs.swapObjectsWithElement(dynamometer.element, weight.element, '#combined-object');
            
            // Проверяем, что исходные объекты скрыты, а новый объект показан
            TestFramework.expect(dynamometer.element.style.visibility).toBe('hidden');
            TestFramework.expect(weight.element.style.visibility).toBe('hidden');
            TestFramework.expect(document.querySelector('#combined-object').style.visibility).toBe('visible');
            
            // Проверяем, что новый объект создан как физический объект
            const combinedObject = physjs.getObject('#combined-object');
            TestFramework.expect(combinedObject).toBeTruthy();
            
            // Проверяем позицию нового объекта (должна быть минимальной из двух объектов)
            const combinedPos = combinedObject.getPosition();
            TestFramework.expect(combinedPos.x).toBe(150);
            TestFramework.expect(combinedPos.y).toBe(150);
        });
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    window.testRegistry = {};
    
    await setupTestEnvironment();
    defineAllTests();
    setupButtonHandlers();
    
    log("Тесты PhysJS готовы к запуску");
});