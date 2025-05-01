/* Phys.js v1.2.0
 * Физическая библиотека для работы с объектами на веб-странице
 * 
 * GitHub: https://github.com/ivanvit100/PhysJS 
 * Issues: https://github.com/ivanvit100/PhysJS/issues
 * Documentation: https://github.com/ivanvit100/PhysJS/README.md
 * 
 * License MIT
 * @Copyright 2025 ivanvit (Иванущенко Виталий)
 */

(function() {
    let debugMode = false;

    function log(...args) {
        debugMode && console.log(...args);
    }
    
    class PhysObject {
        constructor(element) {
            this.element = element;
            this.rotation = 0;
            this.isAttached = false;
            this.attachedObjects = new Set();
            this.attachmentPoints = [];
            this.attachedToPoint = null;
            this.parentObject = null;
            this.lastClickTime = 0;
            this.canRotate = true;
            
            this.initElement();
        }
        
        initElement() {
            const element = this.element;
            element.style.position = 'absolute';
            
            const style = window.getComputedStyle(element);
            const transform = style.transform || style.webkitTransform || '';
            
            let initialRotation = 0;
            const rotateMatch = transform.match(/rotate\(([-\d.]+)deg\)/);
            if (rotateMatch) {
                initialRotation = parseFloat(rotateMatch[1]);
            } else if (transform.includes('matrix')) {
                const matrix = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
                if (matrix) {
                    const values = matrix[1].split(',');
                    if (values.length === 6) {
                        const a = parseFloat(values[0]);
                        const b = parseFloat(values[1]);
                        initialRotation = Math.round(Math.atan2(b, a) * (180 / Math.PI));
                    }
                }
            }
            
            this.rotation = initialRotation;
            element.style.transform = `rotate(${initialRotation}deg)`;
            
            element._physObject = this;
        }
        
        rotate(angleDelta) {
            if (this.isAttached) return;
            
            this.rotation += angleDelta;
            this.element.style.transform = `rotate(${this.rotation}deg)`;
        }
        
        addAttachmentPoint(id, x, y, acceptedTypes = []) {
            log(`Добавление точки крепления ${id} к объекту ${this.element.id} с координатами (${x}, ${y})`);
            this.attachmentPoints.push({
                id: id,
                x: x,
                y: y,
                acceptedTypes: acceptedTypes
            });
            return this;
        }
        
        getAttachmentPoints() {
            return this.attachmentPoints;
        }
        
        findCompatibleAttachmentPoint(otherObject) {
            if (!otherObject || this.attachmentPoints.length === 0) return null;
            
            const objectType = otherObject.element.dataset.type || '';
            log(`Поиск точки крепления для объекта типа ${objectType} в ${this.element.id}`);
            
            for (const point of this.attachmentPoints) {
                if (point.acceptedTypes.length > 0 && 
                    !point.acceptedTypes.includes(objectType)) {
                    continue;
                }
                
                log(`Найдена совместимая точка крепления: ${point.id}`);
                return point;
            }
            
            return null;
        }
        
        attach(otherObject) {
            if (!otherObject || otherObject === this || this.isAttached) {
                log("Ошибка крепления: неверный объект или уже прикреплен");
                return false;
            }
            
            if (!triggerBeforeAttachmentEvent(this, otherObject)) {
                log(`Прикрепление ${otherObject.element.id} к ${this.element.id} запрещено обработчиком beforeAttachment`);
                return false;
            }
            
            const attachPoint = this.findCompatibleAttachmentPoint(otherObject);
            
            if (!attachPoint) {
                log(`Нет совместимых точек крепления в ${this.element.id} для ${otherObject.element.id}`);
                return false;
            }
            
            log(`Прикрепление ${otherObject.element.id} к ${this.element.id} в точке ${attachPoint.id}`);
            
            const thisPos = this.getPosition();
            const attachX = thisPos.x + attachPoint.x;
            const attachY = thisPos.y + attachPoint.y;
            
            otherObject.setPosition(attachX, attachY);
            
            this.attachedObjects.add(otherObject);
            otherObject.isAttached = true;
            otherObject.parentObject = this;
            otherObject.attachedToPoint = attachPoint.id;
            
            this.element.classList.add('attached');
            otherObject.element.classList.add('attached');
            
            triggerAttachmentEvent(this, otherObject);
            
            log(`Успешно прикреплено ${otherObject.element.id} к ${this.element.id}`);
            return true;
        }
        
        detach() {
            if (!this.isAttached && this.attachedObjects.size === 0) {
                log(`${this.element.id} не прикреплен ни к чему`);
                return;
            }
            
            log(`Проверка перед откреплением ${this.element.id}`);
            
            if (!triggerBeforeDetachmentEvent(this)) {
                log(`Открепление ${this.element.id} запрещено обработчиком beforeDetachment`);
                return false;
            }
            
            log(`Открепление ${this.element.id}`);
            
            if (this.isAttached) {
                this.isAttached = false;
                this.element.classList.remove('attached');
                this.attachedToPoint = null;
                
                if (this.parentObject) {
                    this.parentObject.attachedObjects.delete(this);
                    this.parentObject = null;
                }
                
                triggerDetachmentEvent(this);
            }
            
            if (this.attachedObjects.size > 0) {
                const attachedObjectsCopy = [...this.attachedObjects];
                
                attachedObjectsCopy.forEach(obj => {
                    if (triggerBeforeDetachmentEvent(obj)) {
                        obj.isAttached = false;
                        obj.element.classList.remove('attached');
                        obj.attachedToPoint = null;
                        obj.parentObject = null;
                        
                        triggerDetachmentEvent(obj);
                    }
                });
                
                this.attachedObjects.clear();
                this.element.classList.remove('attached');
            }
            
            return true;
        }
        
        getPosition() {
            const style = window.getComputedStyle(this.element);
            return {
                x: parseInt(style.left) || 0,
                y: parseInt(style.top) || 0
            };
        }
        
        setPosition(x, y) {
            this.element.style.left = x + 'px';
            this.element.style.top = y + 'px';
        }
        
        move(deltaX, deltaY) {
            const pos = this.getPosition();
            this.setPosition(pos.x + deltaX, pos.y + deltaY);
            
            this.attachedObjects.forEach(obj => {
                obj.move(deltaX, deltaY);
            });
        }
        
        getBounds() {
            const rect = this.element.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height
            };
        }
        
        isOverlapping(otherObject) {
            const rect1 = this.getBounds();
            const rect2 = otherObject.getBounds();
            
            const isOverlap = !(rect1.right < rect2.left ||
                   rect1.left > rect2.right ||
                   rect1.bottom < rect2.top ||
                   rect1.top > rect2.bottom);
            
            isOverlap && log(`${this.element.id} перекрывается с ${otherObject.element.id}`);
            
            return isOverlap;
        }
    }
    
    class LabStep {
        constructor(id, description, allowedAttachments = [], allowedDetachments = []) {
            this.id = id;
            this.description = description;
            this.allowedAttachments = allowedAttachments;
            this.allowedDetachments = allowedDetachments;
            this.completed = false;
        }
        
        isAttachmentAllowed(element) {
            return this.allowedAttachments.some(selector => {
                if (selector.startsWith('#'))
                    return element.id === selector.substring(1);
                else if (selector.startsWith('.'))
                    return element.classList.contains(selector.substring(1));
                return false;
            });
        }
        
        isDetachmentAllowed(element) {
            if (this.allowedDetachments.length === 0) return false;
            
            if (this.allowedDetachments.includes('*')) return true;
            
            return this.allowedDetachments.some(selector => {
                if (selector.startsWith('#'))
                    return element.id === selector.substring(1);
                else if (selector.startsWith('.'))
                    return element.classList.contains(selector.substring(1));
                return false;
            });
        }
        
        complete() {
            this.completed = true;
            return this;
        }
        
        reset() {
            this.completed = false;
            return this;
        }
    }
    
    class LabStepIterator {
        constructor(steps = []) {
            this.steps = steps;
            this.currentIndex = 0;
            this.eventListeners = {
                'stepchange': [],
                'complete': []
            };
        }
        
        addStep(step) {
            this.steps.push(step);
            return this;
        }
        
        getCurrentStep() {
            return this.steps[this.currentIndex];
        }
        
        next() {
            if (this.currentIndex < this.steps.length - 1) {
                this.currentIndex++;
                this.triggerEvent('stepchange', this.getCurrentStep());
                
                this.currentIndex === this.steps.length - 1 && this.triggerEvent('complete');
                
                this.logAllowedAttachments();
                
                return this.getCurrentStep();
            }
            return null;
        }
        
        previous() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.triggerEvent('stepchange', this.getCurrentStep());
                this.logAllowedAttachments();
                return this.getCurrentStep();
            }
            return null;
        }
        
        goToStep(id) {
            const index = this.steps.findIndex(step => step.id === id);
            if (index !== -1) {
                this.currentIndex = index;
                this.triggerEvent('stepchange', this.getCurrentStep());
                this.logAllowedAttachments();
                return this.getCurrentStep();
            }
            return null;
        }
        
        logAllowedAttachments() {
            const currentStep = this.getCurrentStep();
            if (currentStep) {
                log(`Шаг ${currentStep.id}: ${currentStep.description}`);
                log(`Разрешенные прикрепления: ${currentStep.allowedAttachments.join(', ')}`);
                log(`Разрешенные открепления: ${currentStep.allowedDetachments.join(', ') || 'Нет'}`);
            }
        }
        
        on(event, callback) {
            this.eventListeners[event] && this.eventListeners[event].push(callback);
            return this;
        }
        
        triggerEvent(event, data) {
            this.eventListeners[event] && this.eventListeners[event].forEach(callback => callback(data));
        }
        
        reset() {
            this.currentIndex = 0;
            this.steps.forEach(step => step.reset());
            this.triggerEvent('stepchange', this.getCurrentStep());
            this.logAllowedAttachments();
            return this;
        }
    }
    
    let draggedObject = null;
    let selectedObject = null;
    let startX, startY;
    let initialPositions = new Map();
    const rotationStep = 5;
    
    const physObjects = new Map();
    
    const customEventListeners = {
        'attachment': [],
        'detachment': [],
        'beforeAttachment': [],
        'beforeDetachment': [],
        'connect': []
    };
    
    function triggerAttachmentEvent(sourceObject, targetObject) {
        customEventListeners['attachment'].forEach(callback => {
            callback(sourceObject, targetObject);
        });
    }
    
    function triggerDetachmentEvent(object) {
        customEventListeners['detachment'].forEach(callback => {
            callback(object);
        });
    }
    
    function triggerBeforeAttachmentEvent(sourceObject, targetObject) {
        if (customEventListeners['beforeAttachment'].length === 0)
            return true;
        
        for (const callback of customEventListeners['beforeAttachment']) {
            if (callback(sourceObject, targetObject) === false) {
                showDenyEffect(sourceObject.element);
                showDenyEffect(targetObject.element);
                return false;
            }
        }
        
        return true;
    }

    function triggerBeforeDetachmentEvent(object) {
        if (customEventListeners['beforeDetachment'].length === 0)
            return true;
        
        for (const callback of customEventListeners['beforeDetachment']) {
            if (callback(object) === false) {
                showDenyEffect(object.element);
                return false;
            }
        }
        
        return true;
    }
    
    function triggerConnectEvent(fromId, toId) {
        customEventListeners['connect'].forEach(callback => {
            callback(fromId, toId);
        });
    }

    function init() {
        log("Инициализация физической библиотеки...");
        
        document.querySelectorAll('.phys').forEach(element => {
            const obj = new PhysObject(element);
            physObjects.set(element, obj);
            
            element.addEventListener('mousedown', startDrag);
            element.addEventListener('click', handleClick);
        });

        document.querySelectorAll('.phys-fixed').forEach(element => {
            const obj = new PhysObject(element);
            physObjects.set(element, obj);
            
            element.addEventListener('click', handleClick);
        });
        
        document.addEventListener('keydown', handleKeyPress);
        document.addEventListener('click', handleGlobalClick);
        
        log(`Инициализировано ${physObjects.size} физических объектов`);
    }
    
    function handleGlobalClick(e) {
        let clickedOnPhys = false;
        let target = e.target;
        
        while (target && target !== document) {
            if (target.classList && target.classList.contains('phys')) {
                clickedOnPhys = true;
                break;
            }
            target = target.parentElement;
        }
        
        if (!clickedOnPhys) unselectElement();
    }
    
    function handleClick(e) {
        if (draggedObject) return;
        let element = e.currentTarget;
        const physObject = physObjects.get(element);
        
        if (!physObject) return;
        
        const currentTime = new Date().getTime();
        if (currentTime - physObject.lastClickTime < 1000) {
            if (element.classList.contains('phys-connectors') && 
                labStepIterator && 
                labStepIterator.getCurrentStep() && 
                labStepIterator.currentIndex === 0) {
            } 
            else if (physObject.isAttached || physObject.attachedObjects.size > 0) {
                if (labStepIterator && labStepIterator.getCurrentStep()) {
                    const currentStep = labStepIterator.getCurrentStep();
                    
                    if (!currentStep.isDetachmentAllowed(element)) {
                        log(`Открепление не разрешено для ${element.id} на текущем шаге`);
                        return;
                    }
                }
                
                if (!triggerBeforeDetachmentEvent(physObject)) {
                    log(`Открепление ${element.id} запрещено обработчиком beforeDetachment`);
                    return;
                }
                
                log(`Открепление ${element.id} по двойному клику`);
                physObject.detach();
                e.stopPropagation();
                return;
            }
        }
        
        physObject.lastClickTime = currentTime;
        
        unselectElement();
        selectedObject = physObject;
        element.classList.add('selected');
        
        e.stopPropagation();
    }
    
    function selectElement(e) {
        if (draggedObject) return;
        let element = e.currentTarget;
        unselectElement();
        
        const physObject = physObjects.get(element);
        if (physObject) {
            selectedObject = physObject;
            element.classList.add('selected');
        }
        
        e.stopPropagation();
    }
    
    function unselectElement() {
        if (selectedObject) {
            selectedObject.element.classList.remove('selected');
            selectedObject = null;
        }
    }
    
    function startDrag(e) {
        if (e.button !== 0) return;
    
        e.preventDefault();
        const element = this;
        let physObject = physObjects.get(element);
    
        if (!physObject) return;
    
        function isGroupContainsFixedObject(initialObject) {
            const allGroupObjects = [];
            const checkedObjects = new Set();
            
            function collectGroupObjects(obj) {
                if (checkedObjects.has(obj)) return;
                
                checkedObjects.add(obj);
                allGroupObjects.push(obj);
                
                obj.parentObject && collectGroupObjects(obj.parentObject);                
                for (const attachedObj of obj.attachedObjects)
                    collectGroupObjects(attachedObj);
            }
            
            collectGroupObjects(initialObject);
            
            for (const [potentialFixedElement, potentialFixedObj] of physObjects) {
                if (potentialFixedElement.classList.contains('phys-fixed')) {
                    for (const groupObj of allGroupObjects) {
                        if (groupObj.parentObject === potentialFixedObj) 
                            return true;                        
                        if (groupObj.attachedObjects.has(potentialFixedObj))
                            return true;                        
                        if (potentialFixedObj.attachedObjects.has(groupObj))
                            return true;
                    }
                }
            }
            
            for (const groupObj of allGroupObjects) {
                if (groupObj.element.classList.contains('phys-fixed'))
                    return true
            }
            
            return false;
        }
    
        if (isGroupContainsFixedObject(physObject)) {
            log(`Перемещение заблокировано: группа содержит фиксированный объект`);
            return;
        }
    
        if (physObject.isAttached && physObject.parentObject) {
            let rootParent = physObject.parentObject;
            while (rootParent.parentObject) {
                rootParent = rootParent.parentObject;
            }
            
            physObject = rootParent;
            log(`Объект прикреплен, перетаскиваем корневой родительский объект: ${physObject.element.id}`);
        }
    
        draggedObject = physObject;
        selectElement({ currentTarget: physObject.element, stopPropagation: () => {} });
    
        startX = e.clientX;
        startY = e.clientY;
    
        storeGroupInitialPositions();
    
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', stopDrag);
    }
    
    function storeGroupInitialPositions() {
        initialPositions.clear();
        
        const position = draggedObject.getPosition();
        initialPositions.set(draggedObject, position);
        
        if (draggedObject.isAttached) return;
        
        if (draggedObject.attachedObjects.size > 0) {
            draggedObject.attachedObjects.forEach(obj => {
                initialPositions.set(obj, obj.getPosition());
            });
        }
    }
    
    function dragMove(e) {
        if (!draggedObject) return;
        
        e.preventDefault();
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const initialPos = initialPositions.get(draggedObject);
        
        draggedObject.setPosition(initialPos.x + deltaX, initialPos.y + deltaY);
        
        draggedObject.attachedObjects.forEach(obj => {
            const attachedPos = initialPositions.get(obj);
            attachedPos && obj.setPosition(attachedPos.x + deltaX, attachedPos.y + deltaY);
        });
        
        updateAllWirePositions();
    }
    
    function stopDrag() {
        if (!draggedObject) return;
        
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', stopDrag);
        
        tryAutoAttach(draggedObject);
        draggedObject = null;
    }

    function showDenyEffect(element) {
        if (!element) return;
        
        element.classList.add('phys-deny');
        setTimeout(() => {
            element.classList.remove('phys-deny');
        }, 1000);
    }
    
    function tryAutoAttach(physObject) {
        if (!physObject || physObject.isAttached) return;
        
        if (!physObject.element.classList.contains('phys-attachable')) return;
        
        const overlappingElements = findOverlappingElements(physObject);
        
        if (overlappingElements.length === 0) return;
        
        if (labStepIterator && labStepIterator.getCurrentStep()) {
            const currentStep = labStepIterator.getCurrentStep();
            
            const allowedOverlapping = overlappingElements.filter(element => 
                currentStep.isAttachmentAllowed(element)
            );
            
            log(`Разрешенные перекрывающиеся элементы: ${allowedOverlapping.map(el => el.id).join(', ')}`);
            
            if (allowedOverlapping.length === 0) return;
            
            for (const element of allowedOverlapping) {
                const targetObject = physObjects.get(element);
                
                log(`Попытка прикрепить ${element.id} к ${physObject.element.id}`);
                if (targetObject && targetObject.attach(physObject)) {
                    log(`${element.id} успешно прикреплен к ${physObject.element.id}`);
                    return;
                }
                
                log(`Попытка прикрепить ${physObject.element.id} к ${element.id}`);
                if (physObject.attach(targetObject)) {
                    log(`${physObject.element.id} успешно прикреплен к ${element.id}`);
                    return;
                }
            }
            
            log("Все попытки прикрепления не удались");
        } else {
            log("Нет активного шага, пробуем прикрепить к любому перекрывающемуся объекту");
            
            for (const element of overlappingElements) {
                const targetObject = physObjects.get(element);
                
                if (targetObject && triggerBeforeAttachmentEvent(targetObject, physObject) && 
                    targetObject.attach(physObject)) {
                    log(`${element.id} успешно прикреплен к ${physObject.element.id}`);
                    return;
                }
                
                if (triggerBeforeAttachmentEvent(physObject, targetObject) && 
                    physObject.attach(targetObject)) {
                    log(`${physObject.element.id} успешно прикреплен к ${element.id}`);
                    return;
                }
            }
            
            log("Все попытки прикрепления не удались");
        }
    }
    
    function findOverlappingElements(physObject) {
        const result = [];
        
        physObjects.forEach((obj, element) => {
            if (obj !== physObject && 
                element.classList.contains('phys-attachable') && 
                physObject.isOverlapping(obj)) {
                result.push(element);
            }
        });
        
        log(`Найдено ${result.length} перекрывающихся элементов с ${physObject.element.id}`);
        return result;
    }
    
    function handleKeyPress(e) {
        if (draggedObject) return;
        if (!selectedObject) return;
        
        if (selectedObject.isAttached || selectedObject.attachedObjects.size > 0) {
            log("Невозможно вращать: объект является частью прикрепленной группы");
            return;
        }
        
        if (!selectedObject.canRotate) {
            log("Вращение отключено для этого объекта");
            return;
        }
        
        let rotationAngle = 0;
        
        if (e.key.toLowerCase() === 'q') {
            rotationAngle = -rotationStep;
            e.preventDefault();
        } else if (e.key.toLowerCase() === 'e') {
            rotationAngle = rotationStep;
            e.preventDefault();
        } else {
            return;
        }
        
        selectedObject.rotate(rotationAngle);
    }
    
    let wireInProgress = null;
    let connectionPoints = new Map();
    const wires = new Map();
    let wireIdCounter = 0;

    function createWire(color = '#000000') {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("class", "phys-wire");
        svg.setAttribute("style", 
            "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:99;"
        );
        document.body.appendChild(svg);
        
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        path.style.pointerEvents = "auto";
        path.style.cursor = "pointer";
        
        svg.appendChild(path);
        wireIdCounter++;
        
        const wireId = `wire-${wireIdCounter}`;
        svg.id = wireId;
        
        path.addEventListener('dblclick', (e) => {
            if (labStepIterator && labStepIterator.getCurrentStep()) {
                const currentStep = labStepIterator.getCurrentStep();
                if (!currentStep.isDetachmentAllowed(`#${wireId}`)) {
                    log(`Удаление провода ${wireId} не разрешено на текущем шаге`);
                    return;
                }
            }
            
            removeWire(wireId);
            e.stopPropagation();
        });
        
        return { svg, path, id: wireId };
    }

    function findNearestConnectionPoint(element, clientX, clientY) {
        const elementPoints = [];
        
        for (const [id, data] of connectionPoints) {
            if (data.element === element && !data.used) {
                const rect = element.getBoundingClientRect();
                const pointX = rect.left + data.point.x;
                const pointY = rect.top + data.point.y;
                
                const distance = Math.sqrt(Math.pow(clientX - pointX, 2) + Math.pow(clientY - pointY, 2));
                
                elementPoints.push({
                    id: id,
                    x: pointX,
                    y: pointY,
                    distance: distance
                });
            }
        }
        
        if (elementPoints.length === 0) return null;
        
        elementPoints.sort((a, b) => a.distance - b.distance);
        const nearest = elementPoints[0];
        
        return {
            id: nearest.id,
            x: nearest.x,
            y: nearest.y
        };
    }

    function updateWirePath(wire, fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const curveIntensity = Math.min(distance * 0.5, 50);
        const controlX1 = fromX + Math.sign(dx) * curveIntensity;
        const controlY1 = fromY;
        const controlX2 = toX - Math.sign(dx) * curveIntensity;
        const controlY2 = toY;
        
        const pathData = `M ${fromX} ${fromY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${toX} ${toY}`;
        wire.path.setAttribute("d", pathData);
    }

    function startWireConnection(element, event, color) {
        if (wireInProgress) {
            log("Уже есть активное соединение");
            return;
        }
        
        const nearestPoint = findNearestConnectionPoint(element, event.clientX, event.clientY);
        
        if (!nearestPoint) {
            log("Нет доступных точек подключения");
            return;
        }
        
        log(`Использую точку подключения ${nearestPoint.id} с координатами (${nearestPoint.x}, ${nearestPoint.y})`);
        
        const wire = createWire(color);
        document.body.appendChild(wire.svg);
        
        wireInProgress = {
            wire: wire,
            fromElement: element,
            fromPoint: nearestPoint,
            fromPointId: nearestPoint.id
        };
        
        connectionPoints.get(nearestPoint.id).used = true;
        
        const moveHandler = (e) => {
            updateWirePath(
                wireInProgress.wire,
                nearestPoint.x, nearestPoint.y,
                e.clientX, e.clientY
            );
        };
        
        document.addEventListener('mousemove', moveHandler);
        
        wireInProgress.removeListeners = () => {
            document.removeEventListener('mousemove', moveHandler);
        };
        
        updateWirePath(wire, nearestPoint.x, nearestPoint.y, event.clientX, event.clientY);
    }

    function completeWireConnection(element, event) {
        if (!wireInProgress) return;
        
        const nearestPoint = findNearestConnectionPoint(element, event.clientX, event.clientY);
        
        if (!nearestPoint) {
            log("Нет доступных точек для завершения подключения");
            return;
        }
        
        connectionPoints.get(nearestPoint.id).used = true;
        
        updateWirePath(
            wireInProgress.wire,
            wireInProgress.fromPoint.x, wireInProgress.fromPoint.y,
            nearestPoint.x, nearestPoint.y
        );
        
        const wireInfo = {
            element: wireInProgress.wire.svg,
            path: wireInProgress.wire.path,
            fromElement: wireInProgress.fromElement,
            toElement: element,
            fromPoint: wireInProgress.fromPointId,
            toPoint: nearestPoint.id,
            from: {x: wireInProgress.fromPoint.x, y: wireInProgress.fromPoint.y},
            to: {x: nearestPoint.x, y: nearestPoint.y}
        };
        
        wires.set(wireInProgress.wire.id, wireInfo);
        wireInProgress.wire.path.style.pointerEvents = "auto";
        
        triggerConnectEvent(wireInProgress.fromPointId, nearestPoint.id);
        
        wireInProgress.removeListeners();
        wireInProgress = null;
    }

    function removeWire(wireId) {
        const wire = wires.get(wireId);
        if (!wire) return;
        
        if (wire.fromPoint) {
            const fromPointData = connectionPoints.get(wire.fromPoint);
            if (fromPointData) fromPointData.used = false;
        }
        
        if (wire.toPoint) {
            const toPointData = connectionPoints.get(wire.toPoint);
            if (toPointData) toPointData.used = false;
        }
        
        wire.element.remove();
        wires.delete(wireId);
        
        log(`Провод ${wireId} удален`);
    }

    function registerConnectionPoint(element, pointId, x, y) {
        if (typeof element === 'string') element = document.querySelector(element);
        if (!element) {
            log(`Элемент не найден для точки подключения ${pointId}`);
            return;
        }
        
        if (!element.classList.contains('phys-connectors')) {
            element.classList.add('phys-connectors');
        }
        
        connectionPoints.set(pointId, {
            element: element,
            point: {x, y},
            used: false
        });
        
        log(`Зарегистрирована точка подключения ${pointId} для ${element.id || 'элемента'} с координатами (${x}, ${y})`);
    }

    function updateAllWirePositions() {
        for (const [wireId, wire] of wires) {
            const fromPointData = connectionPoints.get(wire.fromPoint);
            const toPointData = connectionPoints.get(wire.toPoint);
            
            if (fromPointData && toPointData) {
                const fromElement = fromPointData.element;
                const toElement = toPointData.element;
                
                const fromRect = fromElement.getBoundingClientRect();
                const toRect = toElement.getBoundingClientRect();
                
                const fromX = fromRect.left + fromPointData.point.x;
                const fromY = fromRect.top + fromPointData.point.y;
                const toX = toRect.left + toPointData.point.x;
                const toY = toRect.top + toPointData.point.y;
                
                updateWirePath(wire, fromX, fromY, toX, toY);
            }
        }
    }

    function initConnectors() {
        document.querySelectorAll('.phys-connectors').forEach(element => {
            if (element._dblClickHandler)
                element.removeEventListener('dblclick', element._dblClickHandler);
            
            element._dblClickHandler = function(e) {
                log(`Двойной клик на элементе ${element.id || 'без ID'}`);
                
                if (labStepIterator && labStepIterator.getCurrentStep()) {
                    const currentStep = labStepIterator.getCurrentStep();
                    if (!currentStep.isAttachmentAllowed(element)) {
                        log(`Подключение не разрешено для ${element.id} на текущем шаге`);
                        return;
                    }
                }
                
                if (wireInProgress && wireInProgress.fromElement !== element) {
                    log(`Завершаем соединение на элементе ${element.id || 'без ID'}`);
                    completeWireConnection(element, e);
                    return;
                } else if (!wireInProgress) {
                    const defaultColor = element.dataset.wireColor || '#000000';
                    log(`Начинаем новое соединение от элемента ${element.id || 'без ID'} с цветом ${defaultColor}`);
                    startWireConnection(element, e, defaultColor);
                }
                
                e.stopPropagation();
            };
            
            element.addEventListener('dblclick', element._dblClickHandler);
        });
    }
    
    window.startWireConnection = startWireConnection;
    window.addEventListener('resize', updateAllWirePositions);
    
    const labStepIterator = new LabStepIterator();
    
    window.physjs = {
        init: function(options = {}) {
            debugMode = !!options.debug;
            init();
            initConnectors();
            return this;
        },
        
        setDebugMode: function(enabled) {
            debugMode = !!enabled;
            return this;
        },

        detachAll: function() {
            log("Открепление всех объектов");
            physObjects.forEach(obj => obj.detach());
        },
        
        resetRotations: function() {
            physObjects.forEach(obj => {
                obj.rotation = 0;
                obj.element.style.transform = 'rotate(0deg)';
            });
        },

        disableRotation: function() {
            physObjects.forEach(obj => {
                obj.canRotate = false;
            });
            log("Вращение отключено для всех объектов");
            return this;
        },
        
        enableRotation: function() {
            physObjects.forEach(obj => {
                obj.canRotate = true;
            });
            log("Вращение включено для всех объектов");
            return this;
        },
        
        disableRotationFor: function(elements) {
            if (!Array.isArray(elements)) {
                elements = [elements];
            }
            
            elements.forEach(element => {
                if (typeof element === 'string')
                    element = document.querySelector(element);
                
                const obj = physObjects.get(element);
                if (obj) {
                    obj.canRotate = false;
                    log(`Вращение отключено для ${element.id || 'элемента'}`);
                }
            });
            
            return this;
        },
        
        enableRotationFor: function(elements) {
            if (!Array.isArray(elements))
                elements = [elements];
            
            elements.forEach(element => {
                if (typeof element === 'string')
                    element = document.querySelector(element);
                
                const obj = physObjects.get(element);
                if (obj) {
                    obj.canRotate = true;
                    log(`Вращение включено для ${element.id || 'элемента'}`);
                }
            });
            
            return this;
        },
        
        createStep: function(id, description, allowedAttachments = [], allowedDetachments = []) {
            return new LabStep(id, description, allowedAttachments, allowedDetachments);
        },
        
        addStep: function(step) {
            labStepIterator.addStep(step);
            return this;
        },
        
        nextStep: function() {
            return labStepIterator.next();
        },
        
        previousStep: function() {
            return labStepIterator.previous();
        },
        
        getCurrentStep: function() {
            return labStepIterator.getCurrentStep();
        },
        
        goToStep: function(id) {
            return labStepIterator.goToStep(id);
        },
        
        onStepChange: function(callback) {
            labStepIterator.on('stepchange', callback);
            return this;
        },
        
        onLabComplete: function(callback) {
            labStepIterator.on('complete', callback);
            return this;
        },
        
        resetLab: function() {
            labStepIterator.reset();
            return this;
        },
        
        getObject: function(element) {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            return physObjects.get(element) || null;
        },
        
        createObject: function(element) {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            
            if (element && !physObjects.has(element)) {
                const obj = new PhysObject(element);
                physObjects.set(element, obj);
                
                element.addEventListener('mousedown', startDrag);
                element.addEventListener('click', handleClick);
                
                return obj;
            }
            
            return null;
        },
        
        addAttachmentPoint: function(element, pointId, x, y, acceptedTypes = []) {
            const obj = this.getObject(element);
            obj && obj.addAttachmentPoint(pointId, x, y, acceptedTypes);
            return this;
        },
        
        onAttachment: function(callback) {
            if (typeof callback === 'function')
                customEventListeners['attachment'].push(callback);
            return this;
        },
        
        onDetachment: function(callback) {
            if (typeof callback === 'function')
                customEventListeners['detachment'].push(callback);
            return this;
        },

        onBeforeAttachment: function(callback) {
            if (typeof callback === 'function')
                customEventListeners['beforeAttachment'].push(callback);
            return this;
        },

        onBeforeDetachment: function(callback) {
            if (typeof callback === 'function')
                customEventListeners['beforeDetachment'].push(callback);
            return this;
        },
        
        onConnect: function(callback) {
            if (typeof callback === 'function')
                customEventListeners['connect'].push(callback);
            return this;
        },

        isAttached: function(element1, element2) {
            const obj1 = this.getObject(element1);
            const obj2 = this.getObject(element2);

            if (!obj1 || !obj2) {
                log("Один или оба объекта не найдены");
                return false;
            }

            if (obj1.isAttached && obj1.parentObject === obj2) return true;
            if (obj2.isAttached && obj2.parentObject === obj1) return true;
            if (obj1.attachedObjects.has(obj2)) return true;
            if (obj2.attachedObjects.has(obj1)) return true;

            return false;
        },
        
        registerConnectionPoint: registerConnectionPoint,
        
        addConnectionPoint: function(elementSelector, pointId, x, y) {
            registerConnectionPoint(elementSelector, pointId, x, y);
            return this;
        },
        
        createWire: function(fromPointId, toPointId, color = '#000000') {
            const fromPointData = connectionPoints.get(fromPointId);
            const toPointData = connectionPoints.get(toPointId);
            
            if (!fromPointData || !toPointData) {
                log(`Одна или обе точки подключения не найдены: ${fromPointId}, ${toPointId}`);
                return null;
            }
            
            if (fromPointData.used || toPointData.used) {
                log(`Одна или обе точки подключения уже используются: ${fromPointId}, ${toPointId}`);
                return null;
            }
            
            const fromRect = fromPointData.element.getBoundingClientRect();
            const toRect = toPointData.element.getBoundingClientRect();
            
            const fromX = fromRect.left + fromPointData.point.x;
            const fromY = fromRect.top + fromPointData.point.y;
            const toX = toRect.left + toPointData.point.x;
            const toY = toRect.top + toPointData.point.y;
            
            const wire = createWire(color);
            updateWirePath(wire, fromX, fromY, toX, toY);
            
            fromPointData.used = true;
            toPointData.used = true;
            
            const wireInfo = {
                element: wire.svg,
                path: wire.path,
                fromElement: fromPointData.element,
                toElement: toPointData.element,
                fromPoint: fromPointId,
                toPoint: toPointId,
                from: {x: fromX, y: fromY},
                to: {x: toX, y: toY}
            };
            
            wires.set(wire.id, wireInfo);
            
            triggerConnectEvent(fromPointId, toPointId);
            
            return wire.id;
        },
        
        removeWire: function(wireId) {
            removeWire(wireId);
            return this;
        },
        
        removeAllWires: function() {
            for (const wireId of wires.keys()) {
                removeWire(wireId);
            }
            return this;
        },
        
        areConnected: function(point1, point2) {
            for (const [_, wire] of wires) {
                if ((wire.fromPoint === point1 && wire.toPoint === point2) || 
                    (wire.fromPoint === point2 && wire.toPoint === point1)) {
                    return true;
                }
            }
            return false;
        },
        
        getAllWires: function() {
            return Array.from(wires.keys());
        },
        
        getWireInfo: function(wireId) {
            return wires.get(wireId);
        },
        
        getConnectionState: function() {
            const result = [];
            for (const [wireId, wire] of wires) {
                result.push({
                    id: wireId,
                    from: wire.fromPoint,
                    to: wire.toPoint
                });
            }
            return result;
        },
        
        updateWirePositions: function() {
            updateAllWirePositions();
            return this;
        }
    };
})();