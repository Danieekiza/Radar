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

// Добавляем флаг для принудительного обновления отображения
let forceTargetDisplay = false;

// Добавляем глобальную переменную для хранения текущей отображаемой точки
let currentDisplayPoint = null;

scaleButton.addEventListener('click', function() {
    if (!gameState.buttonEnabled) return;
    
    currentScaleIndex = (currentScaleIndex + 1) % scaleValues.length;
    config.scaleMultiplier = scaleValues[currentScaleIndex];
    this.textContent = scaleLabels[currentScaleIndex];
    
    // Устанавливаем флаг принудительного обновления
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
    const rect = canvas.getBoundingClientRect(); // Получаем размеры канваса
    mouseX = event.clientX - rect.left - canvas.width / 2; // Вычисляем координату X курсора относительно центра канваса
    mouseY = event.clientY - rect.top - canvas.height / 2; // Вычисляем координату Y курсора относительно центра канваса

    const { r, phi } = cartesianToPolar(mouseX, mouseY); // Преобразуем декартовы координаты в полярные
    const phiDeg = (phi * 180 / Math.PI).toFixed(0); // Преобразуем угол из радиан в градусы и округляем до целого

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
        this.phi = phi; // угол в градусах
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

// Класс для анимации взрыва
class Explosion {
    constructor(r, phi) {
        this.r = r; // Радиус позиции взрыва
        this.phi = (phi * Math.PI) / 180; // Конвертируем угол из градусов в радианы
        this.radius = 15; // Радиус самого взрыва в пикселях
        this.duration = 0.5; // Длительность анимации в секундах
        this.elapsedTime = 0; // Прошедшее время анимации
        this.isActive = true; // Флаг активности взрыва
        this.hasCheckedCollisions = false; // Флаг проверки столкновений
    }

    // Метод для проверки столкновений с целями
    checkCollisions() {
        // Если проверка столкновений уже была выполнена, выходим из метода
        if (this.hasCheckedCollisions) return;

        // Создаем копию множества активных целей для безопасной итерации
        const targetsToCheck = new Set(activeTargets);

        // Перебираем все цели для проверки столкновений
        for (const target of targetsToCheck) {
            // Если цель - AntiMissile, преобразуем phi в радианы
            let targetPhi = target.phi;
            if (target instanceof AntiMissile) {
                targetPhi = (targetPhi * Math.PI) / 180;
            }
            // Вычисляем разницу по X между центром взрыва и целью
            const dx = Math.cos(this.phi) * this.r - Math.cos(targetPhi) * target.r;
            // Вычисляем разницу по Y между центром взрыва и целью
            const dy = Math.sin(this.phi) * this.r - Math.sin(targetPhi) * target.r;
            // Вычисляем расстояние между центром взрыва и целью по теореме Пифагора
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Проверяем, находится ли цель в радиусе действия взрыва
            if (distance <= this.radius) {
                // Если цель является противоракетой (AntiMissile)
                if (target instanceof AntiMissile) {
                    // Создаем новый взрыв на месте уничтоженной противоракеты
                    const newExplosion = new Explosion(target.r, target.phi);
                    activeExplosions.add(newExplosion);
                }
                // Удаляем цель из множества активных целей
                activeTargets.delete(target);
                // Удаляем последнюю известную позицию цели
                lastKnownPositions.delete(target.id);
            }
        }

        // Отмечаем, что проверка столкновений выполнена
        this.hasCheckedCollisions = true;
    }

    draw(ctx, centerX, centerY) {
        if (!this.isActive) return; // Если взрыв неактивен, не рисуем его

        // Получаем текущий масштаб для отображения
        const displayScale = 400 / (scaleValues[currentScaleIndex] * 400);
        const displayR = this.r * displayScale; // Получаем радиус с учетом масштаба

        // Проверяем, находится ли взрыв в пределах отображения
        if (displayR <= config.maxRadius) {
            // Вычисляем координаты центра взрыва
            const x = centerX + Math.cos(this.phi) * displayR;
            const y = centerY + Math.sin(this.phi) * displayR;

            // Настраиваем стиль для отрисовки взрыва
            ctx.strokeStyle = 'red'; // Устанавливаем красный цвет
            ctx.lineWidth = 2; // Устанавливаем толщину линии
            ctx.beginPath(); // Начинаем новый путь
            ctx.arc(x, y, this.radius * displayScale, 0, Math.PI * 2); // Рисуем окружность
            ctx.stroke(); // Отрисовываем линию

            // Проверяем столкновения при первой отрисовке
            this.checkCollisions();
        } else {
            // Если взрыв за пределами масштаба, отображаем красный треугольник
            const triangleSize = 15;
            const r = config.maxRadius + 20; // Размещаем треугольник за пределами радара
            
            // Вычисляем центр треугольника
            const triangleCenterX = centerX + Math.cos(this.phi) * r;
            const triangleCenterY = centerY + Math.sin(this.phi) * r;
            
            // Вычисляем вершины треугольника
            const points = [];
            for (let i = 0; i < 3; i++) {
                const angle = this.phi + (i * 2 * Math.PI / 3);
                points.push({
                    x: triangleCenterX + Math.cos(angle) * (triangleSize / Math.sqrt(3)),
                    y: triangleCenterY + Math.sin(angle) * (triangleSize / Math.sqrt(3))
                });
            }
            
            // Рисуем красный треугольник
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.closePath();
            ctx.fill();
        }
    }

    update(deltaTime) {
        this.elapsedTime += deltaTime; // Увеличиваем прошедшее время
        if (this.elapsedTime >= this.duration) { // Если время истекло
            this.isActive = false; // Деактивируем взрыв
            return false; // Возвращаем false для удаления взрыва
        }
        return true; // Взрыв все еще активен
    }
}

// Множество для хранения активных взрывов
const activeExplosions = new Set();

// Класс AntiMissile, унаследованный от Target
class AntiMissile extends Target {
    constructor(r, phi, speed, targetAngle, targetR) {
        super(r, phi, speed, targetAngle); // Pass all parameters to the parent class
        this.targetR = targetR; // Сохраняем целевой радиус
        console.log(`AntiMissile created with parameters: r = ${this.r}, phi = ${this.phi}, speed = ${this.speed}, targetAngle = ${this.targetAngle}, targetR = ${this.targetR}`);
    }

    update(deltaTime) {
        const targetAngleRad = (this.targetAngle * Math.PI) / 180;
        
        // Обновляем позицию с учетом реального времени
        this.r -= this.speed * Math.cos(targetAngleRad) * deltaTime;
        
        // Проверяем достижение целевого радиуса с увеличенной погрешностью
        if (Math.abs(this.r - this.targetR) < 0.2) {
            // Получаем текущий масштаб для отображения
            const displayScale = 400 / (scaleValues[currentScaleIndex] * 400);
            // Создаем новый взрыв при достижении цели, передаем радиус с учетом масштаба
            // const explosion = new Explosion(this.targetR * displayScale, this.phi);
            const explosion = new Explosion(this.targetR, this.phi);
            activeExplosions.add(explosion); // Добавляем взрыв в множество активных взрывов
            return false; // Уничтожаем объект при достижении целевого радиуса
        }
        
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

// Хранилище для активных целей
const activeTargets = new Set();

// Добавляем Map для хранения последних известных позиций целей
const lastKnownPositions = new Map();

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
    const r = config.maxRadius + 20; // Размещаем треугольник за пределами радара
    
    // Вычисляем центр треугольника
    const triangleCenterX = centerX + Math.cos(phi) * r;
    const triangleCenterY = centerY + Math.sin(phi) * r;
    
    // Вычисляем вершины треугольника
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

// Функция для отображения целей на радаре
function targetPrint(deltaTime) {
    const centerX = canvas.width / 2; // Находим центр канваса по оси X
    const centerY = canvas.height / 2; // Находим центр канваса по оси Y
    
    // Получаем текущий масштаб для отображения
    const displayScale = 400 / (scaleValues[currentScaleIndex] * 400);
    
    // Проходим по всем активным целям
    for (const target of activeTargets) {
        const displayR = target.r * displayScale; // Получаем радиус цели с учетом масштаба
        let targetPhi = target.phi; // Получаем угол цели в радианах
        
        // Преобразуем угол в радианы, если он в градусах
        if (target instanceof AntiMissile) {
            targetPhi = (targetPhi * Math.PI) / 180; // Конвертируем градусы в радианы
        }
        
        // Нормализуем углы для корректного сравнения
        const normalizedTargetPhi = ((targetPhi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const currentAngle = ((radarLine.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const lastAngle = ((radarLine.lastAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        
        // Проверяем, находится ли цель в пределах отображения
        if (displayR <= config.maxRadius) {
            // Проверяем, прошла ли радарная линия через позицию цели или требуется принудительное обновление
            let shouldUpdate = forceTargetDisplay;
            if (!shouldUpdate) {
                if (lastAngle < currentAngle) {
                    // Нормальный случай: радарная линия движется по часовой стрелке
                    if (normalizedTargetPhi >= lastAngle && normalizedTargetPhi < currentAngle) {
                        shouldUpdate = true;
                    }
                } else {
                    // Случай перехода через 0/360 градусов
                    if (normalizedTargetPhi >= lastAngle || normalizedTargetPhi < currentAngle) {
                        shouldUpdate = true;
                    }
                }
            }
            
            // Если радарная линия прошла через позицию цели или требуется принудительное обновление
            if (shouldUpdate) {
                const targetX = centerX + Math.cos(normalizedTargetPhi) * displayR;
                const targetY = centerY + Math.sin(normalizedTargetPhi) * displayR;
                lastKnownPositions.set(target.id, { x: targetX, y: targetY });
            }
            
            // Отображаем цель, используя последнюю известную позицию
            const lastPosition = lastKnownPositions.get(target.id);
            if (lastPosition) {
                // Устанавливаем цвет в зависимости от типа цели
                ctx.fillStyle = target instanceof AntiMissile ? '#ffffff' : '#00ff00'; // Белый для AntiMissile, зеленый для остальных
                ctx.beginPath(); // Начинаем новый путь
                ctx.arc(lastPosition.x, lastPosition.y, 3, 0, Math.PI * 2); // Рисуем круг для цели
                ctx.fill(); // Заполняем круг цветом
            }
        } else {
            // Если цель находится за пределами масштаба, отображаем треугольник
            drawTriangle(centerX, centerY, normalizedTargetPhi);
        }
    }
    
    // Обновляем и отрисовываем взрывы
    const explosionsToCheck = new Set(activeExplosions);
    for (const explosion of explosionsToCheck) {
        if (!explosion.update(deltaTime)) {
            activeExplosions.delete(explosion);
        } else {
            explosion.draw(ctx, centerX, centerY);
        }
    }
    
    // Сбрасываем флаг принудительного обновления после обработки всех целей
    forceTargetDisplay = false;
}

// Добавим константу для времени задержки
const BUTTON_DELAY = 1000; // Унифицированная задержка 1 секунда

// Переменные для хранения координат клика
let clickX = 0;
let clickY = 0;

// Обработчик нажатия на левую кнопку мыши
canvas.addEventListener('click', function(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; // Вычисляем координату X относительно канваса
    const mouseY = event.clientY - rect.top; // Вычисляем координату Y относительно канваса

    // Проверяем, находится ли клик в пределах канваса
    if (mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height) {
        clickX = mouseX - (canvas.width / 2); // Вычисляем координату X относительно центра канваса
        clickY = mouseY - (canvas.height / 2); // Вычисляем координату Y относительно центра канваса

        // Получаем текущий масштаб для отображения
        const displayScale = scaleValues[currentScaleIndex]; // Получаем текущий масштаб (1, 0.5 или 0.25)

        // Переводим в полярные координаты с учетом масштаба
        const r = Math.sqrt(clickX * clickX + clickY * clickY) * displayScale; // Радиус с учетом масштаба
        let phi = Math.atan2(clickY, clickX) * (180 / Math.PI); // Угол в градусах
        // Приводим phi к диапазону [0, 360]
        if (phi < 0) {
            phi += 360; // Если угол отрицательный, добавляем 360
        }

        console.log(`Click Coordinates: X: ${clickX}, Y: ${clickY}, r: ${r}, phi: ${phi}`); // вывод в консоль

        // Создаем объект AntiMissile с заданными параметрами, включая целевой радиус
        const antiMissile = new AntiMissile(1, phi, -15, 0, r); // Передаем r с учетом масштаба

        // Добавляем antiMissile в активные цели
        activeTargets.add(antiMissile);

        // Обновляем поле click в окне Debug Info
        const clickCoordsElement = document.getElementById('clickCoords');
        if (clickCoordsElement) {
            clickCoordsElement.textContent = `Click: (r: ${(r).toFixed(1)}, φ: ${phi.toFixed(1)}°)`;
        } else {
            console.error("Element with ID 'clickCoords' not found.");
        }
    }
});

// Обновляем функцию обновления отладочной таблицы
function updateDebugTable() {
    const tableBody = document.getElementById('targetTableBody');
    tableBody.innerHTML = ''; // Очищаем таблицу

    for (const target of activeTargets) {
        const row = document.createElement('tr');
        
        // Преобразуем угол в градусы для отображения
        let displayPhi = target.phi;
        if (target instanceof Missile) {
            displayPhi = (target.phi * 180 / Math.PI).toFixed(1); // Конвертируем радианы в градусы
        } else if (target instanceof AntiMissile) {
            displayPhi = target.phi.toFixed(1); // Оставляем один знак после запятой для AntiMissile
        }
        
        // Создаем ячейки с данными
        const cells = [
            target.id,
            target.r.toFixed(1),
            displayPhi,
            target.speed.toFixed(1),
            target.targetAngle.toFixed(1),
            `Click: (r: ${(Math.sqrt(clickX * clickX + clickY * clickY) * scaleValues[currentScaleIndex]).toFixed(1)}, φ: ${(Math.atan2(clickY, clickX) * (180 / Math.PI) - Math.PI / 2).toFixed(1)}°)`
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
    targetPrint(deltaTime); // Передаем deltaTime в функцию отрисовки целей
    drawCursor();
    
    updateGameTime();
    updateDebugTable();

    requestAnimationFrame(animate);
}

// Обновляем функцию resetGame для очистки последних известных позиций
function resetGame() {
    gameState.isRunning = false;
    gameState.gameOver = false;
    activeTargets.clear();
    lastKnownPositions.clear(); // Очищаем последние известные позиции
    activeExplosions.clear(); // Очищаем все активные взрывы при сбросе игры
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