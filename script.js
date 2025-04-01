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

scaleButton.addEventListener('click', function() {
    currentScaleIndex = (currentScaleIndex + 1) % scaleValues.length;
    config.scaleMultiplier = scaleValues[currentScaleIndex];
    
    // Обновляем текст кнопки
    this.textContent = scaleLabels[currentScaleIndex];
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

// Класс радарной линии
class RadarLine {
    constructor() {
        this.angle = 0; // Начинаем с угла 0 (вертикально вверх)
        this.speed = 0.02; // Скорость вращения (рад/кадр)
    }

    update() {
        this.angle += this.speed;
        if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
    }

    draw() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const endX = centerX + Math.cos(this.angle - Math.PI / 2) * config.maxRadius;
        const endY = centerY + Math.sin(this.angle - Math.PI / 2) * config.maxRadius;

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
    mouseX = event.clientX - rect.left - canvas.width / 2; // X относительно центра
    mouseY = event.clientY - rect.top - canvas.height / 2; // Y относительно центра

    // Преобразуем в полярные координаты
    const { r, phi } = cartesianToPolar(mouseX, mouseY);
    const phiDeg = (phi * 180 / Math.PI).toFixed(0); // Угол в градусах

    // Обновляем текст в элементе coordsDisplay с учетом масштаба
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

// Основной цикл анимации
function animate() {
    // Очистка экрана
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Отрисовка элементов
    drawGrid();
    radarLine.update();
    radarLine.draw();
    drawCursor(); // Отрисовка курсора

    requestAnimationFrame(animate);
}

// Запуск анимации
animate();