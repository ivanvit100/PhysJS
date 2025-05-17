# Документация библиотеки PhysJS
### Содержание
1. Введение
2. Начало работы
3. Основные концепции
4. API библиотеки
    - Инициализация и настройка
    - Управление объектами
    - Управление точками крепления
    - Управление шагами лабораторной работы
    - Обработка событий
    - Специальные эффекты
    - Управление вращением объектов
    - Расширенные обработчики событий
    - Работа с проводами и соединениями
    - Баллистические траектории
5. Классы HTML-элементов
6. Примеры использования
7. Советы по производительности  
8. Устранение неполадок

## Введение
PhysJS — это JavaScript библиотека для создания интерактивных лабораторных работ и физических симуляций в веб-браузере. Библиотека позволяет создавать перетаскиваемые объекты, определять точки крепления между ними, и организовывать последовательность шагов для выполнения лабораторной работы.

С примерами использования библиотеки можно ознакомиться [здесь](/demo_app/).

### Основные возможности библиотеки
- Создание перетаскиваемых физических объектов
- Определение точек крепления между объектами
- Создание проводов и точек крепления для них
- Организация последовательности шагов лабораторной работы
- Отслеживание событий взаимодействия с объектами
- Создание специальных визуальных эффектов

## Начало работы

Подключение библиотеки
```html
<link rel="stylesheet" href="phys.css">
<script src="phys.js"></script>
```
Минимальный HTML-шаблон
```html
<!DOCTYPE html>
<html>
<head>
    <title>PhysJS Лабораторная работа</title>
    <link rel="stylesheet" href="phys.css">
</head>
<body>
    <div id="experiment-area">
        <!-- Здесь будут размещены физические объекты -->
        <div id="object1" class="phys phys-attachable" style="left: 50px; top: 50px; width: 100px; height: 100px; background-color: red;" data-type="object1"></div>
        <div id="object2" class="phys phys-attachable" style="left: 200px; top: 50px; width: 100px; height: 100px; background-color: blue;" data-type="object2"></div>
    </div>

    <script src="phys.js"></script>
    <script>
        // Включение режима отладки для вывода логов
        physjs.setDebugMode(true);
        
        // Добавление точек крепления
        physjs.addAttachmentPoint('#object1', 'right', 100, 50, ['object2']);
        physjs.addAttachmentPoint('#object2', 'left', 0, 50, ['object1']);
        
        // Создание шагов лабораторной работы
        const step1 = physjs.createStep('step1', 'Соедините объекты', ['#object1', '#object2']);
        physjs.addStep(step1);
        physjs.goToStep('step1');
    </script>
</body>
</html>
```

### Основные концепции

#### Физические объекты
Физические объекты — это DOM-элементы, которые могут быть перетаскиваемыми и взаимодействовать друг с другом. Для создания физического объекта необходимо добавить класс `phys` к HTML-элементу:
```html
<div id="my-object" class="phys" data-type="object"></div>
```
Объекты, которые могут быть прикреплены к другим объектам, должны иметь дополнительный класс `phys-attachable`:
```html
<div id="my-attachable-object" class="phys phys-attachable" data-type="attachable-object"></div>
```

#### Точки крепления
Точки крепления определяют, как объекты могут присоединяться друг к другу. Каждая точка крепления имеет:

- Идентификатор
- Координаты относительно родительского объекта (x, y)
- Список типов объектов, которые могут быть прикреплены к этой точке

#### Шаги лабораторной работы
Шаги лабораторной работы определяют последовательность действий, которые должен выполнить пользователь. Каждый шаг имеет:

- Идентификатор
- Описание
- Список разрешенных объектов для прикрепления
- Список разрешенных объектов для открепления

## API библиотеки
### Инициализация и настройка
1. `physjs.init(options)`

Инициализирует библиотеку с настройками.

Параметры:
- `debug (boolean)` - включает/выключает режим отладки

Пример:
```js
physjs.init({ debug: true });
```

2. `physjs.setDebugMode(enabled)`

Включает или выключает режим отладки.

Параметры:
- enabled (boolean) - true для включения, false для выключения

Пример:
```js
physjs.setDebugMode(true); // Включить режим отладки
physjs.setDebugMode(false); // Выключить режим отладки
```

### Управление объектами
3. `physjs.getObject(element)`

Возвращает физический объект по DOM-элементу или селектору.

Параметры:
- element (DOM-элемент или строка) - DOM-элемент или CSS-селектор

Возвращает: объект PhysObject или null, если объект не найден

Пример:
```js
const obj = physjs.getObject('#my-object');
const pos = obj.getPosition();
console.log(`Позиция объекта: x=${pos.x}, y=${pos.y}`);
```

4. `physjs.createObject(element)`

Создает новый физический объект из DOM-элемента.

Параметры:
- element (DOM-элемент или строка) - DOM-элемент или CSS-селектор

Возвращает: созданный объект PhysObject или null в случае ошибки

Пример:
```js 
const newObj = physjs.createObject('#new-element');
```

5. `physjs.detachAll()`

Открепляет все прикрепленные объекты.

Пример:
```js
physjs.detachAll();
```

6. `physjs.resetRotations()`

Сбрасывает поворот всех объектов к нулевому значению.

Пример:
```js
physjs.resetRotations();
```

### Управление точками крепления
7. `physjs.addAttachmentPoint(element, pointId, x, y, acceptedTypes)`

Добавляет точку крепления к физическому объекту.

Параметры:
- element (DOM-элемент или строка) - DOM-элемент или CSS-селектор
- pointId (строка) - идентификатор точки крепления
- x (число) - координата X относительно родительского объекта
- y (число) - координата Y относительно родительского объекта
- acceptedTypes (массив строк) - список типов объектов, которые могут быть прикреплены

Пример:
```js
// Добавляем точку крепления 'top' к объекту #cylinder
// в координатах (50, 0) относительно объекта
// и разрешаем прикрепление только объектов с типом 'tube'
physjs.addAttachmentPoint('#cylinder', 'top', 50, 0, ['tube']);
```

### Управление шагами лабораторной работы
8. `physjs.createStep(id, description, allowedAttachments, allowedDetachments)`

Создает новый шаг лабораторной работы.

Параметры:
- id (строка) - уникальный идентификатор шага
- description (строка) - описание шага
- allowedAttachments (массив строк) - CSS-селекторы объектов, которые можно прикреплять
- allowedDetachments (массив строк) - CSS-селекторы объектов, которые можно откреплять

Возвращает: объект LabStep

Пример:
```js
// Создаем шаг с идентификатором 'step1' и описанием
// Разрешаем прикреплять объекты '#tube' и '#flask'
// и откреплять объект '#tube'
const step1 = physjs.createStep('step1', 'Соедините трубку с колбой', ['#tube', '#flask'], ['#tube']);
```

9. `physjs.addStep(step)`

Добавляет шаг в последовательность лабораторной работы.

Параметры:
- step (объект LabStep) - шаг, созданный с помощью createStep

Пример:
```js
physjs.addStep(step1);
physjs.addStep(step2);
physjs.addStep(step3);
```

10. `physjs.nextStep()`

Переходит к следующему шагу лабораторной работы.

Возвращает: следующий шаг или null, если это последний шаг

Пример:
```js
const nextStep = physjs.nextStep();
if (nextStep) {
    console.log(`Переход к шагу: ${nextStep.description}`);
}
```

11. `physjs.previousStep()`

Переходит к предыдущему шагу лабораторной работы.

Возвращает: предыдущий шаг или null, если это первый шаг

Пример:
```js
const prevStep = physjs.previousStep();
if (prevStep) {
    console.log(`Возврат к шагу: ${prevStep.description}`);
}
```

12. `physjs.getCurrentStep()`

Возвращает текущий шаг лабораторной работы.

Возвращает: текущий шаг или null, если ни один шаг не активен

Пример:
```js
const currentStep = physjs.getCurrentStep();
console.log(`Текущий шаг: ${currentStep.description}`);
```

13. `physjs.goToStep(id)`

Переходит к шагу с указанным идентификатором.

Параметры:
- id (строка) - идентификатор шага

Возвращает: найденный шаг или null, если шаг не найден

Пример:
```js
physjs.goToStep('step3'); // Переход к шагу с id='step3'
```

14. `physjs.resetLab()`

Сбрасывает лабораторную работу к начальному состоянию.

Пример:
```js
physjs.resetLab();
```

### Обработка событий
15. `physjs.onAttachment(callback)`

Регистрирует обработчик события прикрепления объектов.

Параметры:
- callback (функция) - функция обратного вызова, принимающая sourceObject и targetObject

Пример:
```js
physjs.onAttachment(function(sourceObject, targetObject) {
    console.log(`Объект ${sourceObject.element.id} был прикреплен к ${targetObject.element.id}`);
});
```

16. `physjs.onDetachment(callback)`

Регистрирует обработчик события открепления объекта.

Параметры:
- callback (функция) - функция обратного вызова, принимающая объект

Пример:
```js
physjs.onDetachment(function(object) {
    console.log(`Объект ${object.element.id} был откреплен`);
});
```

17. `physjs.onStepChange(callback)`

Регистрирует обработчик события изменения шага лабораторной работы.

Параметры:
- callback (функция) - функция обратного вызова, принимающая новый шаг

Пример:
```js
physjs.onStepChange(function(step) {
    console.log(`Новый шаг: ${step.description}`);
    document.getElementById('current-step').textContent = step.description;
});
```

18. `physjs.onLabComplete(callback)`

Регистрирует обработчик завершения лабораторной работы.

Параметры:
- callback (функция) - функция обратного вызова

Пример:
```js
physjs.onLabComplete(function() {
    console.log('Лабораторная работа завершена!');
});
```

### Специальные эффекты
19. `physjs.showTemporaryObjectAt(objectToHide, referenceObject, selectorToShow, offsetX, offsetY, durationMs)`

Временно скрывает один объект и показывает другой в указанной позиции. 
Функция может быть полезна для создания анимаций для групп объектов, когда взаимодействие с изначальной группой объектов пользователем нежелательно. Например, анимация переливания воды из сосудов по шлангам и тд.

Параметры:
- objectToHide (DOM-элемент или строка) - объект, который нужно скрыть
- referenceObject (DOM-элемент или строка) - объект, относительно которого позиционировать
- selectorToShow (строка) - CSS-селектор объекта, который нужно показать
- offsetX (число) - смещение по оси X относительно referenceObject
- offsetY (число) - смещение по оси Y относительно referenceObject
- durationMs (число) - продолжительность в миллисекундах

Пример:
```js
// Скрывает #flask, показывает #animation-overlay на 2 секунды
// в позиции на 10px правее и 20px ниже #beaker
physjs.showTemporaryObjectAt('#flask', '#beaker', '#animation-overlay', 10, 20, 2000);
```

20. `physjs.swapObjectsWithElement(object1, object2, selectorToShow)`

Скрывает два объекта и показывает вместо них третий объект. Позволяет "соединять объекты", подменяя два постоянно связанных объекта на один цельный.

Параметры:
- object1 (DOM-элемент или строка) - первый объект, который нужно скрыть
- object2 (DOM-элемент или строка) - второй объект, который нужно скрыть
- selectorToShow (строка) - CSS-селектор объекта, который нужно показать
Пример:
```js
// Скрывает #water и #salt, показывает #solution
physjs.swapObjectsWithElement('#water', '#salt', '#solution');
```

### Управление вращением объектов

21. `physjs.disableRotation()`

Отключает возможность вращения для всех объектов.

Пример:
```js
physjs.disableRotation();
```

22. `physjs.enableRotation()`

Включает возможность вращения для всех объектов.

Пример:
```js
physjs.enableRotation();
```

23.`physjs.disableRotationFor(elements)`

Отключает возможность вращения для указанных объектов.

Параметры:
- elements (массив или строка) - объекты или селекторы объектов
Пример:
```js
physjs.disableRotationFor(['#tube', '#flask']);
```

24. `physjs.enableRotationFor(elements)`

Включает возможность вращения для указанных объектов.

Параметры:
- elements (массив или строка) - объекты или селекторы объектов
Пример:
```js
physjs.enableRotationFor('#microscope');
```

25. `physjs.setRotationKeysEnabled(enabled)`

Включает или отключает использование клавиш Q/E для вращения объектов.

Параметры:
- enabled (boolean) - true для включения, false для отключения
Пример:
```js
physjs.setRotationKeysEnabled(false); // Отключение вращения клавишами
```

### Расширенные обработчики событий
26. `physjs.onBeforeAttachment(callback)`

Регистрирует обработчик события перед прикреплением объектов. Позволяет предотвратить прикрепление, вернув false.

Параметры:
- callback (функция) - функция, принимающая sourceObject и targetObject
Пример:
```js
physjs.onBeforeAttachment(function(sourceObject, targetObject) {
    // Проверка условий прикрепления
    if (someCondition) return false; // Предотвращает прикрепление
    return true; // Разрешает прикрепление
});
```

27. `physjs.onBeforeDetachment(callback)`

Регистрирует обработчик события перед откреплением объекта. Позволяет предотвратить открепление, вернув false.

Параметры:
- callback (функция) - функция, принимающая объект
Пример:
```js
physjs.onBeforeDetachment(function(object) {
    // Проверка условий открепления
    if (someCondition) return false; // Предотвращает открепление
    return true; // Разрешает открепление
});
```

28. `physjs.isAttached(element1, element2)`

Проверяет, прикреплены ли два объекта друг к другу.

Параметры:
- element1 (DOM-элемент или строка) - первый объект
- element2 (DOM-элемент или строка) - второй объект
Возвращает: true, если объекты прикреплены друг к другу, иначе false

Пример:
```js
if (physjs.isAttached('#tube', '#flask')) {
    console.log('Трубка прикреплена к колбе');
}
```

### Работа с проводами и соединениями
29. `physjs.addConnectionPoint(elementSelector, pointId, x, y)`

Добавляет точку подключения проводов к объекту.

Параметры:
- elementSelector (строка) - CSS-селектор объекта
- pointId (строка) - идентификатор точки подключения
- x (число) - координата X в процентах от ширины элемента (0-100)
- y (число) - координата Y в процентах от высоты элемента (0-100)
Пример:
```js
// Добавляет точку подключения на 80% ширины и 20% высоты элемента
physjs.addConnectionPoint('#power-source', 'power-positive', 80, 20);
```

30. `physjs.onConnect(callback)`

Регистрирует обработчик события подключения проводов.

Параметры:
- callback (функция) - функция обратного вызова, принимающая fromId и toId
Пример:
```js
physjs.onConnect(function(fromPointId, toPointId) {
    console.log(`Соединение создано от ${fromPointId} к ${toPointId}`);
});
```

31. `physjs.createWire(fromPointId, toPointId, color)`

Программно создает провод между двумя точками подключения.

Параметры:
- fromPointId (строка) - идентификатор начальной точки
- toPointId (строка) - идентификатор конечной точки
- color (строка) - цвет провода в формате CSS
Возвращает: ID созданного провода или null, если соединение не удалось

Пример:
```js
const wireId = physjs.createWire('power-positive', 'ammeter-input', '#FF0000');
```

32. `physjs.removeWire(wireId)`

Удаляет провод по его идентификатору.

Параметры:
- wireId (строка) - идентификатор провода
Пример:
```js
physjs.removeWire('wire-1');
```

33. `physjs.removeAllWires()`

Удаляет все провода.

Пример:
```js
physjs.removeAllWires();
```

### Баллистические траектории
34. `physjs.calculateTrajectory(v0, alpha, h, g)`

Рассчитывает траекторию полета тела, брошенного с начальной скоростью под углом.

Параметры:
- v0 (число) - начальная скорость
- alpha (число) - угол в радианах
- h (число) - начальная высота
- g (число) - ускорение свободного падения
Возвращает: объект с параметрами траектории (дальность, время полета, максимальная высота)

Пример:
```js
const trajectory = physjs.calculateTrajectory(10, Math.PI/4, 0, 9.8);
console.log(`Дальность полета: ${trajectory.range} м`);
```

35. `physjs.showTrajectory(startX, startY, vx, vy, g, floorArea, id, container_id)`

physjs.showTrajectory(startX, startY, vx, vy, g, floorArea, id, container_id)
Отображает траекторию движения на экране.

Параметры:
- startX, startY (числа) - начальные координаты
- vx, vy (числа) - компоненты скорости
- g (число) - ускорение свободного падения
- floorArea (DOM-элемент) - элемент, представляющий "пол"
- id (строка) - идентификатор для созданного элемента траектории
- container_id (строка) - идентификатор контейнера для размещения траектории
Пример:
```js
physjs.showTrajectory(100, 100, 5, -10, 9.8, document.getElementById('floor'), 'trajectory-1', 'experiment-area');
```

## HTML и CSS
### Классы
Библиотека PhysJS использует специальные CSS-классы для определения поведения элементов:

| Класс | Описание |
|-------|----------|
| `phys` | Базовый класс для всех физических объектов. Делает объект перетаскиваемым |
| `phys-attachable` | Позволяет объекту прикрепляться к другим объектам |
| `phys-fixed` | Создает неподвижный объект, который нельзя перетащить |
| `phys-connectors` | Объект может иметь точки подключения для проводов |

Пример использования классов:
```html
<!-- Обычный перетаскиваемый объект -->
<div id="beaker" class="phys" data-type="beaker"></div>

<!-- Объект, который можно прикрепить к другим объектам -->
<div id="tube" class="phys phys-attachable" data-type="tube"></div>

<!-- Неподвижный объект (например, стол или штатив) -->
<div id="stand" class="phys phys-fixed" data-type="stand"></div>

<!-- Электрический компонент с точками подключения -->
<div id="battery" class="phys phys-connectors" data-type="battery"></div>
```

### Атрибут data-type
Атрибут data-type используется для определения типа объекта, который проверяется при работе с точками крепления и в обработчиках событий:
```html
<div id="resistor" class="phys phys-connectors" data-type="resistor"></div>
```
Этот атрибут используется при настройке точек крепления для определения, какие типы объектов могут быть прикреплены:
```js
physjs.addAttachmentPoint('#stand', 'top', 50, 0, ['tube', 'flask']);
```

## Примеры использования
### Создание лабораторной работы
```js
// Создание шагов
const step1 = physjs.createStep('step1', 'Соедините трубку с колбой', ['#tube', '#flask']);
const step2 = physjs.createStep('step2', 'Нагрейте колбу горелкой', ['#burner', '#flask']);
const step3 = physjs.createStep('step3', 'Перелейте жидкость в пробирку', ['#flask', '#test-tube'], ['#flask']);

// Добавление шагов
physjs.addStep(step1).addStep(step2).addStep(step3);

// Начало лабораторной работы
physjs.goToStep('step1');

// Обработка изменения шага
physjs.onStepChange(function(step) {
    document.getElementById('current-step').textContent = step.description;
});

// Обработка завершения лабораторной работы
physjs.onLabComplete(function() {
    alert('Поздравляем! Вы успешно выполнили все задания лабораторной работы.');
});
```

### Настройка объектов и точек крепления
```js
// Добавление точек крепления для соединения трубки и колбы
physjs.addAttachmentPoint('#tube', 'bottom', 15, 90, ['flask']); // Нижняя точка трубки
physjs.addAttachmentPoint('#flask', 'top', 50, 0, ['tube']); // Верхняя точка колбы

// Добавление точки крепления для горелки
physjs.addAttachmentPoint('#burner', 'flame', 25, 0, ['flask']); // Пламя горелки
physjs.addAttachmentPoint('#flask', 'bottom', 50, 100, ['burner']); // Нижняя точка колбы

// Добавление точки крепления для пробирки
physjs.addAttachmentPoint('#flask', 'outlet', 90, 60, ['test-tube']); // Выходной патрубок колбы
physjs.addAttachmentPoint('#test-tube', 'inlet', 20, 10, ['flask']); // Входное отверстие пробирки
```

## Советы по производительности
1. **Ограничьте количество физических объектов**
   - Старайтесь не превышать 30-50 объектов на одной странице для оптимальной производительности
   - При необходимости используйте технику "пулинга" объектов, показывая только нужные в данный момент

2. **Используйте класс `phys-fixed` для неподвижных объектов**
   - Это уменьшит количество вычислений при перетаскивании и взаимодействии

3. **Группируйте сложные объекты**
   - Для сложных объектов используйте один контейнер с классом `phys` и вложенные элементы без этого класса
   - Используйте `physjs.swapObjectsWithElement()` для объединения часто соединяемых объектов

4. **Оптимизируйте работу с проводами**
   - Старайтесь не превышать 15-20 проводов на одной схеме
   - Используйте `physjs.updateWirePositions()` только при необходимости

## Устранение неполадок
### Проблема: Объекты не прикрепляются друг к другу
Решение:
1. Убедитесь, что оба объекта имеют класс phys-attachable
2. Проверьте правильность настройки точек крепления
3. Проверьте, разрешено ли прикрепление этих объектов на текущем шаге
4. Включите режим отладки для получения подробных логов: physjs.setDebugMode(true)

### Проблема: Объект не перетаскивается
Решение:
1. Убедитесь, что объект имеет класс phys
2. Проверьте, не является ли объект прикрепленным к родительскому объекту
3. Убедитесь, что для объекта установлено position: absolute

### Проблема: Лабораторная работа не переходит к следующему шагу
Решение:
1. Проверьте, правильно ли созданы и добавлены шаги
2. Убедитесь, что вызывается метод physjs.nextStep()
3. Проверьте консоль на наличие ошибок
4. Включите режим отладки для получения подробных логов: physjs.setDebugMode(true)

--- 

Документация составлена для библиотеки PhysJS версии 1.2.4. 