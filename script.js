const canvas = document.getElementById('radarCanvas');
const ctx = canvas.getContext('2d');
const coordsDisplay = document.getElementById('coordsDisplay'); // Элемент для отображения координат

// Настройка размеров canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Конфигурация радара
const config = {
    maxRadius: 400,     // Максимальный радиус радара
    gridStep: 50,       // Шаг сетки
    radialLines: 12,    // Количество радиальных линий
    radarColor: '#00ff00', // Цвет радарной линии
    gridColor: '#808080',  // Цвет сетки
    labelOffset: 20,    // Отступ для подписей
    thickCircleColor: '#a0a0a0', // Цвет толстых окружностей
    thickCircleWidth: 1.5, // Толщина толстых окружностей
    cursorColor: '#ff0000', // Цвет курсора
    cursorSize: 10, // Размер курсора
    scaleMultiplier: 1 // Множитель масштаба для подписей (по умолчанию 1)
};

// Перевод декартовых координат в полярные
function cartesianToPolar(x, y) {
    const r = Math.sqrt(x * x + y * y); // Радиус
    let phi = Math.atan2(y, x) + Math.PI / 2; // Угол в радианах со смещением 90град
    if (phi < 0) phi += 2 * Math.PI; // Приводим угол к диапазону [0, 2π]
    return { r, phi };
}

// Обработчик кнопки масштаба
const scaleButton = document.getElementById('scaleButton');
const scaleValues = [1, 0.5, 0.25]; // Масштабы для 400, 200 и 100 км
const scaleLabels = ['400 km', '200 km', '100 km']; // Соответствующие подписи
let currentScaleIndex = 0; // Начинаем с 400 км

scaleButton.textContent = scaleLabels[currentScaleIndex]; // Устанавливаем начальную подпись

// Обновляем флаг для принудительного обновления отображения
let forceTargetDisplay = false;

// Добавляем глобальную переменную для хранения текущей отображаемой точки
let currentDisplayPoint = null;

scaleButton.addEventListener('click', function() {
    if (!gameState.buttonEnabled) return;
    
    currentScaleIndex = (currentScaleIndex + 1) % scaleValues.length;
    config.scaleMultiplier = scaleValues[currentScaleIndex];
    this.textContent = scaleLabels[currentScaleIndex];
    
    // Сбрасываем текущую точку и запрашиваем обновление
    currentDisplayPoint = null;
    forceTargetDisplay = true;
});

// Отрисовка круговой сетки
function drawGrid() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.strokeStyle = config.gridColor;
    ctx.lineWidth = 0.8;
    ctx.font = '12px Arial';
    ctx.fillStyle = config.gridColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Концентрические окружности
    for (let r = config.gridStep; r <= config.maxRadius; r += config.gridStep) {
        // Увеличиваем толщину для окружностей с радиусом, кратным 100
        if (r % 100 === 0) {
            ctx.lineWidth = config.thickCircleWidth;
            ctx.strokeStyle = config.thickCircleColor;
        } else {
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = config.gridColor;
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();

        // Подписи к окружностям с учетом масштаба
        if (r % 50 === 0) {
            // Применяем множитель масштаба к значению подписи
            const scaledValue = Math.round(r * config.scaleMultiplier);
            
            // Подпись для 0° (вверх)
            ctx.fillText(scaledValue.toString(), centerX + 11, centerY - r + 11);

            // Подпись для 90° (вправо)
            ctx.fillText(scaledValue.toString(), centerX + r - 11, centerY - 6);

            // Подпись для 180° (вниз)
            ctx.fillText(scaledValue.toString(), centerX - 11, centerY + r - 8);

            // Подпись для 270° (влево)
            ctx.fillText(scaledValue.toString(), centerX - r + 11, centerY + 9);
        }
    }

    // Радиальные линии
    const angleStep = (Math.PI * 2) / config.radialLines;
    for (let i = 0; i < config.radialLines; i++) {
        // Угол с 0° вверху и по часовой стрелке
        const angle = angleStep * i;

        const startX = centerX + Math.cos(angle) * config.gridStep;
        const startY = centerY + Math.sin(angle) * config.gridStep;
        const endX = centerX + Math.cos(angle) * config.maxRadius;
        const endY = centerY + Math.sin(angle) * config.maxRadius;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Подписи к радиальным линиям
        let labelAngle = (angle * 180 / Math.PI - 270).toFixed(0);
        labelAngle = (labelAngle < 0) ? 360 + Number(labelAngle) : labelAngle;

        const labelRadius = config.maxRadius + config.labelOffset;
        const labelX = centerX + Math.cos(angle) * labelRadius;
        const labelY = centerY + Math.sin(angle) * labelRadius;

        // Рисуем подпись
        ctx.save();
        ctx.translate(labelX, labelY);
        ctx.rotate(angle + Math.PI / 2); // Поворачиваем текст в соответствии с углом
        ctx.textAlign = 'center';
        ctx.fillText(`${labelAngle}°`, 0, 0);
        ctx.restore();
    }
}

// Добавляем состояние игры
const gameState = {
    isRunning: false,
    gameOver: false,
    buttonEnabled: true,
    startTime: 0,        // Время начала игры
    currentTime: 0,      // Текущее время игры
    lastFrameTime: 0     // Время последнего кадра
};

// Функция для управления состоянием кнопки
function setButtonState(enabled) {
    gameState.buttonEnabled = enabled;
    startButton.disabled = !enabled;
    startButton.style.opacity = enabled ? '1' : '0.5'; // Визуальная индикация
}

// Обновляем класс RadarLine для фиксированной скорости
class RadarLine {
    constructor() {
        this.angle = 0;
        this.speed = Math.PI / 2; // Скорость в радианах в секунду (полный оборот за 4 секунды)
        this.lastAngle = this.angle;
    }

    update(deltaTime) {
        if (gameState.isRunning) {
            this.lastAngle = this.angle;
            this.angle += this.speed * deltaTime; // Используем deltaTime для обновления угла
            if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
        }
    }

    reset() {
        this.angle = 0;
        this.lastAngle = this.angle;
    }

    draw() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const endX = centerX + Math.cos(this.angle) * config.maxRadius;
        const endY = centerY + Math.sin(this.angle) * config.maxRadius;

        ctx.strokeStyle = config.radarColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}

const radarLine = new RadarLine();

// Переменные для хранения координат курсора
let mouseX = 0;
let mouseY = 0;

// Обработчик движения мыши
function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left - canvas.width / 2;
    mouseY = event.clientY - rect.top - canvas.height / 2;

    const { r, phi } = cartesianToPolar(mouseX, mouseY);
    const phiDeg = (phi * 180 / Math.PI).toFixed(0);

    // Получаем текущий масштаб для отображения
    const displayScale = 400 / (scaleValues[currentScaleIndex] * 400);
    
    if (r <= config.maxRadius) {
        const scaledR = Math.round(r * config.scaleMultiplier);
        coordsDisplay.textContent = `Координаты: (r: ${scaledR}, φ: ${phiDeg}°)`;
    } else {
        coordsDisplay.textContent = 'Координаты: за пределами радара';
    }
}

canvas.addEventListener('mousemove', handleMouseMove);

// Отрисовка курсора
function drawCursor() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Проверяем, находится ли курсор в пределах радара
    const r = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
    if (r <= config.maxRadius) {
        ctx.strokeStyle = config.cursorColor;
        ctx.lineWidth = 2;

        // Рисуем крестик
        ctx.beginPath();
        ctx.moveTo(centerX + mouseX - config.cursorSize, centerY + mouseY);
        ctx.lineTo(centerX + mouseX + config.cursorSize, centerY + mouseY);
        ctx.moveTo(centerX + mouseX, centerY + mouseY - config.cursorSize);
        ctx.lineTo(centerX + mouseX, centerY + mouseY + config.cursorSize);
        ctx.stroke();
    }
}

// Добавляем ID для целей
class Target {
    static nextId = 1; // Статическое поле для генерации уникальных ID

    constructor(r, phi, speed, targetAngle) {
        this.id = Target.nextId++; // Уникальный ID для каждой цели
        this.r = r;
        this.phi = phi;
        this.speed = speed; // Скорость в единицах в секунду
        this.targetAngle = targetAngle;
    }

    // Метод для обновления позиции
    update(deltaTime) {
        const targetAngleRad = (this.targetAngle * Math.PI) / 180;
        
        // Обновляем позицию с учетом реального времени
        this.r -= this.speed * Math.cos(targetAngleRad) * deltaTime;
        
        if (this.r <= 0) {
            resetGame(); // Вызываем resetGame для остановки игры и изменения текста кнопки
            return false;
        }
        
        if (this.r > config.maxRadius) {
            return false;
        }
        return true;
    }
}

// Класс ракеты, наследующийся от Target
class Missile extends Target {
    constructor(r, phi) {
        // Вызываем конструктор родительского класса
        super(r, phi, 0, 0); // Скорость и угол сближения будут установлены позже
        this.initialR = r;
        this.initialPhi = phi;
    }
}

// Хранилище для активных целей
const activeTargets = new Set();

// Обновляем функцию инициализации цели
function targetInit() {
    const randomSpeed = 3 + Math.random() * 12; // Случайная скорость от 3 до 15
    const randomPhi = Math.random() * 2 * Math.PI; // Случайный начальный угол
    
    const missile = new Missile(400, randomPhi);
    missile.speed = randomSpeed;
    missile.targetAngle = 0; // Фиксированный угол сближения - движение к центру
    activeTargets.add(missile);
}

// Обновляем функцию отрисовки треугольника
function drawTriangle(centerX, centerY, phi) {
    const triangleSize = 15;
    const r = 420;
    
    // Вычисляем центр треугольника
    const triangleCenterX = centerX + Math.cos(phi) * r;
    const triangleCenterY = centerY + Math.sin(phi) * r;
    
    // Вычисляем вершины треугольника
    // Добавляем поворот на 60 градусов (Math.PI/3) по часовой стрелке
    const points = [];
    for (let i = 0; i < 3; i++) {
        const angle = phi + (i * 2 * Math.PI / 3); // Добавляем Math.PI/3 для поворота на 60°
        points.push({
            x: triangleCenterX + Math.cos(angle) * (triangleSize / Math.sqrt(3)),
            y: triangleCenterY + Math.sin(angle) * (triangleSize / Math.sqrt(3))
        });
    }
    
    // Рисуем треугольник
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.closePath();
    ctx.fill();
}

// Обновляем функцию targetPrint
function targetPrint() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const displayScale = 400 / (scaleValues[currentScaleIndex] * 400);
    const outOfRangeTargets = [];
    
    for (const target of activeTargets) {
        const displayR = target.r * displayScale;
        const targetPhi = target.phi;
        
        // Проверяем, находится ли цель в пределах отображения
        if (displayR > config.maxRadius) {
            outOfRangeTargets.push(target);
            // Очищаем текущую точку, если она вышла за пределы
            currentDisplayPoint = null;
            continue;
        }

        const normalizedTargetPhi = ((targetPhi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        
        let shouldUpdate = false;
        
        const currentAngle = ((radarLine.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const lastAngle = ((radarLine.lastAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        
        // Проверка пересечения с радарной линией
        if (lastAngle < currentAngle) {
            if (normalizedTargetPhi >= lastAngle && normalizedTargetPhi < currentAngle) {
                shouldUpdate = true;
            }
        } else {
            if (normalizedTargetPhi >= lastAngle || normalizedTargetPhi < currentAngle) {
                shouldUpdate = true;
            }
        }

        // Проверка принудительного обновления при смене масштаба
        if (forceTargetDisplay) {
            shouldUpdate = true;
        }
        
        // Обновляем точку отображения только при необходимости
        if (shouldUpdate) {
            currentDisplayPoint = {
                x: centerX + Math.cos(targetPhi) * displayR,
                y: centerY + Math.sin(targetPhi) * displayR
            };
        }
    }
    
    // Отрисовываем сохраненную точку, если она существует
    if (currentDisplayPoint) {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(currentDisplayPoint.x, currentDisplayPoint.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Отрисовываем треугольники для целей за пределами
    outOfRangeTargets.forEach(target => {
        drawTriangle(centerX, centerY, target.phi);
    });

    forceTargetDisplay = false;
}

// Добавим константу для времени задержки
const BUTTON_DELAY = 1000; // Унифицированная задержка 1 секунда

// Функция обновления отладочной таблицы
function updateDebugTable() {
    const tableBody = document.getElementById('targetTableBody');
    tableBody.innerHTML = ''; // Очищаем таблицу

    for (const target of activeTargets) {
        const row = document.createElement('tr');
        
        // Создаем ячейки с данными
        const cells = [
            target.id,
            target.r.toFixed(1),
            ((target.phi * 180 / Math.PI) % 360).toFixed(1),
            target.speed.toFixed(1),
            target.targetAngle.toFixed(1)
        ];

        // Добавляем ячейки в строку
        cells.forEach(cellData => {
            const cell = document.createElement('td');
            cell.style.border = '1px solid #00ff00';
            cell.style.padding = '5px';
            cell.textContent = cellData;
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    }
}

// Функция обновления времени
function updateGameTime() {
    if (gameState.isRunning) {
        const currentFrameTime = performance.now();
        if (gameState.lastFrameTime === 0) {
            gameState.lastFrameTime = currentFrameTime;
        }
        
        gameState.currentTime = (currentFrameTime - gameState.startTime) / 1000;
        document.getElementById('gameTimer').textContent = 
            `Time: ${gameState.currentTime.toFixed(1)} sec`;
        
        gameState.lastFrameTime = currentFrameTime;
    }
}

// Обновляем функцию animate для обновления таблицы
function animate(currentTime) {
    if (!gameState.lastFrameTime) {
        gameState.lastFrameTime = currentTime;
    }
    
    // Вычисляем реальное время между кадрами в секундах
    const deltaTime = (currentTime - gameState.lastFrameTime) / 1000;
    gameState.lastFrameTime = currentTime;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState.isRunning) {
        for (const target of activeTargets) {
            if (!target.update(deltaTime)) { // Передаем реальное deltaTime
                activeTargets.delete(target);
            }
        }
    }

    drawGrid();
    radarLine.update(deltaTime); // Передаем deltaTime в обновление радарной линии
    radarLine.draw();
    targetPrint();
    drawCursor();
    
    updateGameTime();
    updateDebugTable();

    requestAnimationFrame(animate);
}

// Обновляем функцию resetGame для очистки таблицы
function resetGame() {
    gameState.isRunning = false;
    gameState.gameOver = false;
    activeTargets.clear();
    radarLine.reset();
    startButton.textContent = 'Start';
    
    // Сброс времени
    gameState.startTime = 0;
    gameState.currentTime = 0;
    gameState.lastFrameTime = 0;
    document.getElementById('gameTimer').textContent = 'Time: 0.0 sec';
    
    // Очищаем таблицу
    document.getElementById('targetTableBody').innerHTML = '';
    
    setButtonState(false);
    setTimeout(() => {
        setButtonState(true);
    }, BUTTON_DELAY);

    currentDisplayPoint = null; // Очищаем точку при сбросе игры
}

// Обновляем обработчик кнопки Start/Stop
const startButton = document.getElementById('startButton');
startButton.addEventListener('click', function() {
    if (!gameState.buttonEnabled) return;
    
    if (!gameState.isRunning) {
        // Запуск игры
        setButtonState(false);
        
        setTimeout(() => {
            gameState.isRunning = true;
            gameState.gameOver = false;
            this.textContent = 'Stop';
            
            // Устанавливаем начальное время
            gameState.startTime = performance.now();
            gameState.lastFrameTime = 0;
            
            targetInit();
            setButtonState(true);
        }, BUTTON_DELAY);
    } else {
        // Остановка игры
        resetGame();
    }
});

// Обновляем обработчик кнопки X1
const stopButton = document.getElementById('stopButton');
let xButtonCounter = 1; // Счетчик для названия кнопки

stopButton.addEventListener('click', function() {
    // Меняем название кнопки в зависимости от счетчика
    if (xButtonCounter === 1) {
        this.textContent = 'X2';
        radarLine.speed = (Math.PI) / 1; // Устанавливаем скорость π/сек
        xButtonCounter++;
    } else if (xButtonCounter === 2) {
        this.textContent = 'X3';
        radarLine.speed = (2 * Math.PI) / 1; // Устанавливаем скорость 2π/сек
        xButtonCounter++;
    } else {
        this.textContent = 'X1';
        radarLine.speed = (0.5 *Math.PI) / 1; // Устанавливаем скорость 0.5π/сек
        xButtonCounter = 1; // Сбрасываем счетчик
    }
});

// Запуск анимации
animate(performance.now());