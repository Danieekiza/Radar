const canvas = document.getElementById('radarCanvas');
const ctx = canvas.getContext('2d');
const coordsDisplay = document.getElementById('coordsDisplay'); // Элемент для отображения координат

// Настройка размеров canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function updateUILayout() {
    const isLandscape = window.innerWidth > window.innerHeight;
    document.body.classList.toggle('landscape-layout', isLandscape);
    document.body.classList.toggle('portrait-layout', !isLandscape);
}

resizeCanvas();
updateUILayout();
window.addEventListener('resize', function () {
    resizeCanvas();
    updateUILayout();
});

// Загружаем фоновые изображения для разных масштабов
const backgroundImages = {
    400: new Image(),
    200: new Image(),
    100: new Image()
};

// Загружаем изображения с обработкой ошибок
backgroundImages[400].src = '400.png';
backgroundImages[200].src = '200.png';
backgroundImages[100].src = '100.png';

// Обработка ошибок загрузки изображений
Object.values(backgroundImages).forEach(img => {
    img.onerror = function() {
        console.warn(`Не удалось загрузить изображение: ${img.src}`);
    };
    img.onload = function() {
        console.log(`Изображение загружено: ${img.src}`);
    };
});

// Функция для отрисовки фонового изображения
function drawBackgroundImage() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Определяем текущий масштаб и соответствующее изображение
    let currentScale;
    if (config.scaleMultiplier === 1) currentScale = 400;
    else if (config.scaleMultiplier === 0.5) currentScale = 200;
    else if (config.scaleMultiplier === 0.25) currentScale = 100;
    
    const bgImage = backgroundImages[currentScale];
    
    // Проверяем, загружено ли изображение и корректно ли оно
    if (bgImage.complete && bgImage.naturalWidth > 0 && bgImage.naturalHeight > 0) {
        // Вычисляем размеры изображения для центрирования
        // Размер изображения должен соответствовать размеру радарного поля
        const imageWidth = config.maxRadius * 2;
        const imageHeight = config.maxRadius * 2;
        
        // Рисуем изображение по центру радара
        ctx.drawImage(
            bgImage,
            centerX - imageWidth / 2,
            centerY - imageHeight / 2,
            imageWidth,
            imageHeight
        );
    } else {
        // Если изображение не загружено, можно нарисовать заглушку или оставить как есть
        console.debug(`Фоновое изображение для масштаба ${currentScale} не готово к отображению`);
    }
}

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
const gunButton = document.getElementById('gunButton');
const c300Button = document.getElementById('c300Button');
const c400Button = document.getElementById('c400Button');
const c300PlusButton = document.getElementById('c300PlusButton');
const c400PlusButton = document.getElementById('c400PlusButton');
const gunPlusButton = document.getElementById('gunPlusButton');
const c300ButtonImg = document.getElementById('c300ButtonImg');
const c400ButtonImg = document.getElementById('c400ButtonImg');
const gunButtonImg = document.getElementById('gunButtonImg');
const currencyDisplay = document.getElementById('currencyDisplay');
const c300CountDisplay = document.getElementById('c300CountDisplay');
const c400CountDisplay = document.getElementById('c400CountDisplay');
const gunCountDisplay = document.getElementById('gunCountDisplay');
const afarButton = document.getElementById('afarButton');
const afarButtonImg = document.getElementById('afarButtonImg');
const afarStateDisplay = document.getElementById('afarStateDisplay');
const scaleValues = [1, 0.5, 0.25]; // Масштабы для 400, 200 и 100 км
const scaleLabels = ['400 km', '200 km', '100 km']; // Соответствующие подписи
let currentScaleIndex = 0; // Начинаем с 400 км
let isGunActive = false; // Состояние кнопки Gun
let selectedWeapon = null; // C300 | C400 | GUN | null

// Экономика и боезапас
const START_CURRENCY = 100000;
const AFAR_COST = 8000;
const TYPE23_BASE_APPEAR_RADIUS = 100;
const TYPE23_AFAR_APPEAR_RADIUS = 300;
const C300_PACK_SIZE = 4;
const C300_PACK_COST = 1000;
const C400_PACK_SIZE = 4;
const C400_PACK_COST = 1400;
const GUN_PACK_SIZE = 10;
const GUN_PACK_COST = 800;
let currency = START_CURRENCY;
let c300Count = 0;
let c400Count = 0;
let gunCount = 0;
let isAFARActive = false;

scaleButton.textContent = scaleLabels[currentScaleIndex]; // Устанавливаем начальную подпись

function getType23AppearRadius() {
    return isAFARActive ? TYPE23_AFAR_APPEAR_RADIUS : TYPE23_BASE_APPEAR_RADIUS;
}

function updateEconomyDisplay() {
    if (currencyDisplay) currencyDisplay.textContent = currency.toString();
    if (c300CountDisplay) c300CountDisplay.textContent = `C300: ${c300Count}`;
    if (c400CountDisplay) c400CountDisplay.textContent = `C400: ${c400Count}`;
    if (gunCountDisplay) gunCountDisplay.textContent = `Gun: ${gunCount}`;

    updateAFARButtonState();
}

function updateAFARButtonState() {
    if (!afarButton) return;

    const canActivate = !isAFARActive && currency >= AFAR_COST;
    afarButton.disabled = !canActivate;

    if (afarStateDisplay) {
        afarStateDisplay.textContent = isAFARActive ? 'AFAR: ON' : 'AFAR: OFF';
    }

    // Спрайт AFAR: активировано/деактивировано.
    if (afarButtonImg) {
        afarButton.style.background = 'transparent';
        afarButtonImg.src = isAFARActive ? 'AFAR_activ.png' : 'AFAR_deactiv.png';
    }
    // Hits в таблице Targets зависит от текущего состояния AFAR.
    updateHitsDisplay();
}

function updateWeaponButtonsState() {
    const c300Ready = c300Count > 0;
    const c400Ready = c400Count > 0;
    const gunReadyByScale = currentScaleIndex === 2;
    const gunReady = gunCount > 0 && gunReadyByScale;

    if (selectedWeapon === 'C300' && !c300Ready) selectedWeapon = null;
    if (selectedWeapon === 'C400' && !c400Ready) selectedWeapon = null;
    if (selectedWeapon === 'GUN' && !gunReady) {
        selectedWeapon = null;
        isGunActive = false;
        stopGunFiring();
    }

    c300Button.disabled = !c300Ready;
    c400Button.disabled = !c400Ready;
    gunButton.disabled = !gunReady;

    c300Button.style.background = selectedWeapon === 'C300' && c300Ready ? '#00aa00' : (c300Ready ? '#333' : '#555');
    c400Button.style.background = selectedWeapon === 'C400' && c400Ready ? '#00aa00' : (c400Ready ? '#333' : '#555');
    gunButton.style.background = selectedWeapon === 'GUN' && gunReady ? '#00aa00' : (gunReady ? '#333' : '#555');

    // Спрайты для кнопки C300:
    // 1) недоступна или доступна, но не активна -> C300_deactiv.png
    // 2) активна (выбрана) -> C300_activ.png
    if (c300ButtonImg) {
        c300Button.style.background = 'transparent';
        const c300IsActive = selectedWeapon === 'C300' && c300Ready;
        c300ButtonImg.src = c300IsActive ? 'C300_activ.png' : 'C300_deactiv.png';
    }

    // Спрайты для кнопки C400:
    // Активна только при выбранном C400.
    if (c400ButtonImg) {
        c400Button.style.background = 'transparent';
        const c400IsActive = selectedWeapon === 'C400' && c400Ready;
        c400ButtonImg.src = c400IsActive ? 'C400_activ.png' : 'C400_deactiv.png';
    }

    // Спрайты для кнопки Gun:
    // Активна только при выбранном Gun (и он доступен по текущему масштабу).
    if (gunButtonImg) {
        gunButton.style.background = 'transparent';
        const gunIsActive = selectedWeapon === 'GUN' && isGunActive && gunReady;
        gunButtonImg.src = gunIsActive ? 'Gun_activ.png' : 'Gun_deactiv.png';
    }

    c300PlusButton.disabled = currency < C300_PACK_COST;
    c400PlusButton.disabled = currency < C400_PACK_COST;
    gunPlusButton.disabled = currency < GUN_PACK_COST;

    // Кнопка масштаба всегда активна по ТЗ.
    scaleButton.disabled = false;
    scaleButton.style.background = '#333';
}

function buyAmmo(type) {
    if (type === 'C300') {
        if (currency < C300_PACK_COST) return;
        currency -= C300_PACK_COST;
        c300Count += C300_PACK_SIZE;
    } else if (type === 'C400') {
        if (currency < C400_PACK_COST) return;
        currency -= C400_PACK_COST;
        c400Count += C400_PACK_SIZE;
    } else if (type === 'GUN') {
        if (currency < GUN_PACK_COST) return;
        currency -= GUN_PACK_COST;
        gunCount += GUN_PACK_SIZE;
    }

    updateEconomyDisplay();
    updateWeaponButtonsState();
}

// Обновление доступности и вида кнопок вооружения
function updateGunAvailability() {
    updateWeaponButtonsState();
}

// Инициализация интерфейса вооружения при старте
updateEconomyDisplay();
updateGunAvailability();

// Добавляем флаг для принудительного обновления отображения
let forceTargetDisplay = false;

// Добавляем глобальную переменную для хранения текущей отображаемой точки
let currentDisplayPoint = null;

scaleButton.addEventListener('click', function() {
    // Смена масштаба всегда доступна; при нажатии отключаем Gun-режим.
    if (isGunActive || selectedWeapon === 'GUN') {
        isGunActive = false;
        selectedWeapon = null;
        stopGunFiring();
    }
    
    if (!gameState.buttonEnabled) return;
    
    currentScaleIndex = (currentScaleIndex + 1) % scaleValues.length;
    config.scaleMultiplier = scaleValues[currentScaleIndex];
    this.textContent = scaleLabels[currentScaleIndex];
    
    // Устанавливаем флаг принудительного обновления
    forceTargetDisplay = true;
    
    // Принудительно перерисовываем canvas для обновления фонового изображения
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBackgroundImage();

    // Обновляем доступность Gun после смены масштаба
    updateGunAvailability();
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

// Глобальная переменная для выбранного радиуса взрыва
let selectedExplosionRadius = 15; // По умолчанию 15

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
            registerHit();
            return false;
        }
        
        if (this.r > config.maxRadius) {
            return false;
        }
        return true;
    }
}

// Класс вражеской цели, наследующийся от Target
// type: "11" - missile (ракета, прямолинейное движение к центру)
// type: "12" - cruise missile (крылатая ракета, змеевидное движение к центрту)
// type: "21" - bomber (бомбардировщик, полет по дуге)
class EnemyTarget extends Target {
    constructor(r, phi, speed, type) {
        // Вызываем конструктор родительского класса
        super(r, phi, speed, 0);
        this.type = type; // Устанавливаем тип цели

        // Логика для ракеты (прямолинейное движение)
        if (this.type === "11") {
            this.dr = speed; // 100% скорости направлено на изменение радиуса
            this.dphi = 0;   // Угловая скорость равна нулю
        } 
        // Логика для крылатой ракеты (синусоидальное движение)
        else if (this.type === "12") {
            // Случайная амплитуда dphi (от 0.2 до 0.8 от скорости)
            this.dphi_amplitude = (0.2 + Math.random() * 0.6) * this.speed;
            // Случайное направление первой волны (по или против часовой стрелки)
            this.dphi_sign = Math.random() < 0.5 ? -1 : 1;
            // Случайное количество смен направления (от 2 до 4)
            this.waveCount = 2 + Math.floor(Math.random() * 3);
            // Массив точек смены направления (равномерно по радиусу)
            this.waveSwitches = [];
            for (let i = 1; i <= this.waveCount; i++) {
                this.waveSwitches.push(config.maxRadius - i * (config.maxRadius / (this.waveCount + 1)));
            }
            this.currentWave = 0; // Индекс текущей волны
            // Радиальная составляющая скорости (оставшаяся часть)
            this.dr_base = Math.sqrt(this.speed * this.speed - this.dphi_amplitude * this.dphi_amplitude);
        } 
        // Логика для бомбардировщика (полет по дуге, затем по прямой)
        else if (this.type === "21") {
            this.phase = 'approaching'; // Фаза 1: приближение по дуге
            this.perigee = 200; // Точка разворота (перигей)
            // Создаем случайную траекторию дуги для первой фазы
            const dphi_percentage = 0.2 + Math.random() * 0.6; // Случайная кривизна
            const dphi_sign = Math.random() < 0.5 ? -1 : 1; // Случайное направление
            const tangential_speed = this.speed * dphi_percentage;
            this.dphi_component = tangential_speed * dphi_sign;
            this.dr_base = this.speed * Math.sqrt(1 - dphi_percentage * dphi_percentage);
        }

        // Логика для стелс-бомбардировщика (type 22)
        if (this.type === "22") {
            this.phase = 'approaching'; // Фаза 1: приближение по дуге
            this.perigee = 200; // Точка разворота (перигей)
            // Траектория как у type 21
            const dphi_percentage = 0.2 + Math.random() * 0.6;
            const dphi_sign = Math.random() < 0.5 ? -1 : 1;
            const tangential_speed = this.speed * dphi_percentage;
            this.dphi_component = tangential_speed * dphi_sign;
            this.dr_base = this.speed * Math.sqrt(1 - dphi_percentage * dphi_percentage);
            // Счетчик пересечений радарной линией
            this.radarCrossCount = 0;
            this.lastRadarAngle = null;
            this.visible = false; // Флаг видимости
        }
        // Логика для низколетящего бомбардировщика (type 23)
        if (this.type === "23") {
            this.phase = 'invisible'; // Сначала невидим
            this.hasSeparatedMissile = false;
            this.separationRadius = 70; // Радиус отделения ракеты
            this.minTurnRadius = 68; // Минимальный радиус для разворота
            this.appearRadius = getType23AppearRadius(); // Радиус обнаружения зависит от AFAR
            this.leaving = false;
            this.turning = false;
            this.decelerating = false;
            this.accelerating = false;
            this.turnElapsed = 0;
            this.turnTime = 2; // Время замедления/ускорения
            this.speed0 = speed;
            this.currentSpeed = speed;
            this.reverseDirection = false;
        }
    }

    update(deltaTime) {
        // Обновление для ракеты (type 11)
        if (this.type === "11") {
            this.r -= this.dr * deltaTime; // Движение к центру
        } 
        // Обновление для крылатой ракеты (type 12, синусоида)
        else if (this.type === "12") {
            // Проверяем, не пора ли сменить знак dphi (смена волны)
            if (this.currentWave < this.waveSwitches.length && this.r < this.waveSwitches[this.currentWave]) {
                this.dphi_sign *= -1; // Меняем направление
                this.currentWave++;
            }
            // Угловая скорость обратно пропорциональна радиусу, амплитуда и знак задают синусоиду
            if (this.r > 0) {
                this.dphi = (this.dphi_amplitude / this.r) * this.dphi_sign; // dphi меняет знак по волнам
            } else {
                this.dphi = 0;
            }
            this.phi += this.dphi * deltaTime; // Обновляем угол
            this.r -= this.dr_base * deltaTime; // Обновляем радиус
        }
        // Обновление для бомбардировщика (Type 21)
        else if (this.type === "21") {
            // --- Фаза 1: Движение по дуге к перигею (оставить как есть) ---
            if (this.phase === 'approaching') {
                if (!this.turnLogic21) {
                    this.turnLogic21 = {
                        decelerating: false,
                        turning: false,
                        accelerating: false,
                        turnElapsed: 0,
                        turnTime: 2,
                        speed0: this.speed,
                        currentSpeed: this.speed,
                        separationRadius: this.perigee,
                        minTurnRadius: this.perigee - 2,
                        missileLaunched: false
                    };
                }
                // Обычное движение по дуге
                if (!this.turnLogic21.decelerating && !this.turnLogic21.turning && !this.turnLogic21.accelerating) {
                    if (this.r > 0) {
                        this.dphi = this.dphi_component / this.r;
                    } else {
                        this.dphi = 0;
                    }
                    this.phi += this.dphi * deltaTime;
                    this.r -= this.dr_base * deltaTime;
                    // Проверка достижения перигея и запуск ракеты
                    if (this.r <= this.turnLogic21.separationRadius && !this.turnLogic21.missileLaunched) {
                        const speed = 10 + Math.random() * 5;
                        const phi = this.phi;
                        const enemy = new EnemyTarget(this.perigee, phi, speed, "11");
                        activeTargets.add(enemy);
                        this.turnLogic21.missileLaunched = true;
                    }
                    if (this.r <= this.turnLogic21.separationRadius) {
                        this.turnLogic21.decelerating = true;
                        this.turnLogic21.turnElapsed = 0;
                    }
                }
                // --- Фаза замедления ---
                if (this.turnLogic21.decelerating) {
                    this.turnLogic21.turnElapsed += deltaTime;
                    const t = Math.min((this.turnLogic21.separationRadius - this.r) / (this.turnLogic21.separationRadius - this.turnLogic21.minTurnRadius), 1);
                    this.turnLogic21.currentSpeed = this.turnLogic21.speed0 * (1 - t);
                    this.r -= Math.max(this.turnLogic21.currentSpeed, 0) * deltaTime;
                    if (this.r <= this.turnLogic21.minTurnRadius + 0.1) {
                        this.turnLogic21.decelerating = false;
                        this.turnLogic21.turning = true;
                        this.turnLogic21.turnElapsed = 0;
                    }
                }
                // --- Фаза разворота (мгновенная смена направления) ---
                if (this.turnLogic21.turning) {
                    this.turnLogic21.currentSpeed = 0;
                    this.turnLogic21.turning = false;
                    this.turnLogic21.accelerating = true;
                    this.turnLogic21.turnElapsed = 0;
                }
                // --- Фаза ускорения ---
                if (this.turnLogic21.accelerating) {
                    this.turnLogic21.turnElapsed += deltaTime;
                    const t = Math.min((this.r - this.turnLogic21.minTurnRadius) / (this.turnLogic21.separationRadius - this.turnLogic21.minTurnRadius), 1);
                    this.turnLogic21.currentSpeed = this.turnLogic21.speed0 * t;
                    this.r += Math.max(this.turnLogic21.currentSpeed, 0) * deltaTime;
                    if (this.r >= this.turnLogic21.separationRadius) {
                        this.turnLogic21.accelerating = false;
                        this.phase = 'leaving';
                        this.speed = this.turnLogic21.speed0;
                    }
                }
            }
            // --- Фаза 2: Прямолинейное движение от перигея к границе (оставить как есть) ---
            else if (this.phase === 'leaving') {
                this.r += this.speed * deltaTime;
                if (this.r >= config.maxRadius) {
                    return false;
                }
            }
        }

        // Общая проверка достижения центра для всех типов, чтобы объекты не пролетали сквозь ноль
        if (this.r <= 0) {
            registerHit();
            return false;
        }

        // Логика для стелс-бомбардировщика (type 22)
        if (this.type === "22") {
            if (this.phase === 'approaching') {
                if (this.r > 0) {
                    this.dphi = this.dphi_component / this.r;
                } else {
                    this.dphi = 0;
                }
                this.phi += this.dphi * deltaTime;
                this.r -= this.dr_base * deltaTime;
                // Проверка достижения перигея
                if (this.r <= this.perigee) {
                    this.phase = 'leaving';
                    // Выпуск ракеты type 11
                    const speed = 10 + Math.random() * 5;
                    const phi = this.phi;
                    const enemy = new EnemyTarget(this.perigee, phi, speed, "11");
                    activeTargets.add(enemy);
                }
            } else { // 'leaving'
                this.r += this.speed * deltaTime;
                if (this.r >= config.maxRadius) {
                    return false;
                }
            }
        }

        // === Логика для низколетящего бомбардировщика (type 23) ===
        if (this.type === "23") {
            // Гарантированно синхронизируем радиус обнаружения с текущим состоянием AFAR
            // для всех существующих Type 23 на каждом обновлении.
            const nextAppearRadius = getType23AppearRadius();
            if (this.appearRadius !== nextAppearRadius) {
                this.appearRadius = nextAppearRadius;
                console.log(`[Type 23] Detection radius changed: id=${this.id}, appearRadius=${this.appearRadius}`);
            }

            if (this.phase === 'gone') return false;
            // Движение к центру
            if (!this.leaving && !this.decelerating && !this.turning && !this.accelerating) {
                this.r -= this.currentSpeed * deltaTime;
                if (this.phase === 'invisible' && this.r <= this.appearRadius) {
                    this.phase = 'visible';
                }
                if (!this.hasSeparatedMissile && this.r <= this.separationRadius) {
                    this.hasSeparatedMissile = true;
                    const missile = new EnemyTarget(this.r, this.phi, 5, "11");
                    activeTargets.add(missile);
                    // Начинаем фазу замедления
                    this.decelerating = true;
                    this.turnElapsed = 0;
                }
            }
            // Фаза замедления
            if (this.decelerating) {
                this.turnElapsed += deltaTime;
                // Плавное замедление до 0 на участке от 70 до 68 км
                const t = Math.min((this.separationRadius - this.r) / (this.separationRadius - this.minTurnRadius), 1);
                this.currentSpeed = this.speed0 * (1 - t);
                this.r -= Math.max(this.currentSpeed, 0) * deltaTime;
                if (this.r <= this.minTurnRadius + 0.1) {
                    this.decelerating = false;
                    this.turning = true;
                    this.turnElapsed = 0;
                }
            }
            // Фаза разворота (мгновенная смена направления)
            if (this.turning) {
                // Меняем направление
                this.reverseDirection = true;
                this.currentSpeed = 0;
                this.turning = false;
                this.accelerating = true;
                this.turnElapsed = 0;
            }
            // Фаза ускорения
            if (this.accelerating) {
                this.turnElapsed += deltaTime;
                // Плавное ускорение до исходной скорости
                const t = Math.min((this.r - this.minTurnRadius) / (this.separationRadius - this.minTurnRadius), 1);
                this.currentSpeed = this.speed0 * t;
                this.r += Math.max(this.currentSpeed, 0) * deltaTime;
                // После прохождения 70 км снова летим с постоянной скоростью
                if (this.r >= this.separationRadius) {
                    this.accelerating = false;
                    this.leaving = true;
                    this.currentSpeed = this.speed0;
                }
            }
            // Уход к границе
            if (this.leaving) {
                this.r += this.currentSpeed * deltaTime;
                // Удаляем цель только у физической границы радара, а не по радиусу обнаружения.
                // Это позволяет уже существующим Type 23 корректно "переключаться" при изменении AFAR.
                if (this.r >= config.maxRadius) {
                    this.phase = 'gone';
                    return false;
                }
            }
            // Если достиг центра, регистрируем попадание
            if (this.r <= 0) {
                registerHit();
                return false;
            }
            return true;
        }
        
        return true; // Цель продолжает существовать
    }
}

// Класс для анимации взрыва
class Explosion {
    constructor(r, phi, explosionRadius) {
        this.r = r; // Радиус позиции взрыва
        this.phi = (phi * Math.PI) / 180; // Конвертируем угол из градусов в радианы
        this.radius = explosionRadius; // Радиус самого взрыва в пикселях (передается из AntiMissile)
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
            // Вычисляем разницу по X между центром взрыва и цельюselectedExplosionRadius
            const dx = Math.cos(this.phi) * this.r - Math.cos(targetPhi) * target.r;
            // Вычисляем разницу по Y между центром взрыва и целью
            const dy = Math.sin(this.phi) * this.r - Math.sin(targetPhi) * target.r;
            // Вычисляем расстояние между центром взрыва и целью по теореме Пифагора
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Проверяем, находится ли цель в радиусе действия взрыва
            if (distance <= this.radius) {
                // Если цель является противоракетой (AntiMissile)
                if (target instanceof AntiMissile) {
                    // Создаем новый взрыв на месте уничтоженной противоракеты с задержкой
                    setTimeout(() => {
                        const newExplosion = new Explosion(target.r, target.phi, target.explosionRadius);
                        activeExplosions.add(newExplosion);
                    }, 200); // Задержка 200 мс (0.2 секунды)
                }
                // Удаляем цель из множества активных целей
                activeTargets.delete(target);
                // Удаляем последнюю известную позицию цели
                lastKnownPositions.delete(target.id);
                // === Начало: начисление очков и валюты ===
                if (target instanceof EnemyTarget) {
                    applyEnemyReward(target);
                }
                // === Конец: начисление очков и валюты ===
                // === Начало: статистика сбитых целей ===
                if (killStats.hasOwnProperty(target.type)) {
                    killStats[target.type]++;
                    updateKillStatsDisplay();
                }
                // === Конец: статистика сбитых целей ===
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
        // Проверяем столкновения при обновлении, а не при отрисовке
        this.checkCollisions();

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
        this.explosionRadius = selectedExplosionRadius; // Радиус взрыва для этой противоракеты
        console.log(`AntiMissile created with parameters: r = ${this.r}, phi = ${this.phi}, speed = ${this.speed}, targetAngle = ${this.targetAngle}, targetR = ${this.targetR}, explosionRadius = ${this.explosionRadius}`);
    }

    update(deltaTime) {
        const targetAngleRad = (this.targetAngle * Math.PI) / 180;
        
        // Обновляем позицию с учетом реального времени
        this.r -= this.speed * Math.cos(targetAngleRad) * deltaTime;

        // Gun-логика (перехват/взрыв по фиксированному радиусу и по пересечению с Missile)
        if (isGunActive) {
            const gunMaxR = 75;
            const gunIntersectionRadius = 2;
            const gunExplosionRadius = 2;

            // 1) Взрыв при достижении максимального радиуса r = 75
            if (this.r >= gunMaxR) {
                const explosion = new Explosion(gunMaxR, this.phi, gunExplosionRadius);
                activeExplosions.add(explosion);
                return false;
            }

            // 2) Взрыв при пересечении AntiMissile с Missile (EnemyTarget) на расстоянии r = 2
            const targetsToCheck = new Set(activeTargets);
            const antiPhiRad = (this.phi * Math.PI) / 180; // AntiMissile.phi хранится в градусах

            for (const target of targetsToCheck) {
                // "Missile" в проекте — это EnemyTarget разных типов
                if (!(target instanceof EnemyTarget)) continue;
                if (target.r == null) continue;

                const targetPhiRad = target.phi; // EnemyTarget.phi хранится в радианах

                const dx = Math.cos(antiPhiRad) * this.r - Math.cos(targetPhiRad) * target.r;
                const dy = Math.sin(antiPhiRad) * this.r - Math.sin(targetPhiRad) * target.r;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= gunIntersectionRadius) {
                    // Регистрируем взрыв (для визуализации)
                    const explosion = new Explosion(this.r, this.phi, gunExplosionRadius);
                    activeExplosions.add(explosion);

                    // Уничтожаем Missile и начисляем очки/статистику так же, как делает Explosion.checkCollisions
                    activeTargets.delete(target);
                    lastKnownPositions.delete(target.id);

                    if (target instanceof EnemyTarget) {
                        applyEnemyReward(target);
                    }

                    if (killStats.hasOwnProperty(target.type)) {
                        killStats[target.type]++;
                        updateKillStatsDisplay();
                    }

                    // Уничтожаем и сам AntiMissile
                    return false;
                }
            }
        }

        // Проверяем достижение целевого радиуса с увеличенной погрешностью (не-Gun режим)
        if (!isGunActive && Math.abs(this.r - this.targetR) < 0.2) {
            const explosion = new Explosion(this.targetR, this.phi, this.explosionRadius);
            activeExplosions.add(explosion); // Добавляем взрыв в множество активных взрывов
            return false; // Уничтожаем объект при достижении целевого радиуса
        }
        
        if (this.r <= 0) {
            registerHit();
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

// === Счет игры ===
let score = 0;

// === Статистика сбитых целей ===
const killStats = {
    "11": 0,
    "12": 0,
    "21": 0,
    "22": 0,
    "23": 0
};

function updateKillStatsDisplay() {
    for (const type of ["11", "12", "21", "22", "23"]) {
        const el = document.getElementById(`stat${type}`);
        if (el) el.textContent = killStats[type];
    }
}

function getRewardByTargetType(type) {
    if (type === "11") return 100;
    if (type === "12") return 250;
    if (type === "21") return 500;
    if (type === "22") return 600;
    if (type === "23") return 300;
    return 0;
}

function applyEnemyReward(target) {
    const reward = getRewardByTargetType(target.type);
    if (reward <= 0) return;
    score += reward;
    currency += reward;
    updateScoreDisplay();
    updateEconomyDisplay();
}

function updateScoreDisplay() {
    const scoreDisplay = document.getElementById('scoreDisplay');
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${score}`;
    }
}

// === Попадания (счетчик жизней/пропусков) ===
let hits = 1; // Инициализируется при старте/сбросе

function updateHitsDisplay() {
    const hitsDisplay = document.getElementById('hitsDisplay');
    if (hitsDisplay) {
        const hitsByAFARState = isAFARActive ? 2 : 1;
        hitsDisplay.textContent = `Hits: ${hitsByAFARState}`;
    }
}

function registerHit() {
    // Активный AFAR даёт дополнительную "жизнь": первый прилёт отключает AFAR.
    if (isAFARActive) {
        isAFARActive = false;
        updateEconomyDisplay();
        updateWeaponButtonsState();
        return;
    }

    // Уменьшаем счетчик при попадании
    hits = Math.max(0, hits - 1);
    updateHitsDisplay();
    // Если счетчик исчерпан, останавливаем игру
    if (hits === 0) {
        resetGame();
    }
}

// Обновляем функцию отрисовки треугольника
function drawTriangle(centerX, centerY, phi, target) {
    // Для Type 23 всегда используем текущий радиус обнаружения (зависит от AFAR).
    if (target.type === "23" && target.r > getType23AppearRadius()) return;
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
    // Цвет треугольника: синий для type 22, белый для AntiMissile, зеленый для type 11 и 12, зеленый для остальных
    ctx.fillStyle = target.type === "22" ? '#5050ff' :
        (target instanceof AntiMissile ? '#ffffff' :
        (target.type === "11" || target.type === "12" || target.type === "21" || target.type === "23") ? '#00ff00' : '#00ff0' );
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
            
            // === Логика для стелс-бомбардировщика ===
            if (target.type === "22") {
                if (shouldUpdate) {
                    // Считаем пересечения радарной линией
                    if (typeof target.radarCrossCount === 'number') {
                        target.radarCrossCount++;
                        // Показываем только каждое третье пересечение
                        target.visible = (target.radarCrossCount % 3 === 0);
                    }
                }
                if (!target.visible) continue; // Не отображаем, если не пора
            }
            
            // === Логика для type 23: показываем только если r меньше текущего радиуса обнаружения ===
            if (target.type === "23" && target.r > getType23AppearRadius()) continue;

            // Отображаем цель, используя последнюю известную позицию
            const lastPosition = lastKnownPositions.get(target.id);
            if (lastPosition) {
                // Цвет точки: синий для type 22, белый для AntiMissile, зеленый для остальных
                ctx.fillStyle = target.type === "22" ? '#5050ff' : (target instanceof AntiMissile ? '#ffffff' : '#00ff00');
                const pointRadius = (target instanceof AntiMissile && target.isGunShot) ? 1.5 : 3;
                ctx.beginPath();
                ctx.arc(lastPosition.x, lastPosition.y, pointRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Если цель находится за пределами масштаба, отображаем треугольник
            drawTriangle(centerX, centerY, normalizedTargetPhi, target);
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

let gunFireIntervalId = null;
let isGunMouseDown = false;
// Координаты курсора относительно центра canvas (используются для пересчёта r/phi при каждом создании)
let gunCursorX = 0;
let gunCursorY = 0;

function stopGunFiring() {
    // Если активен автоогонь, останавливаем таймер генерации снарядов.
    if (gunFireIntervalId) {
        clearInterval(gunFireIntervalId);
        gunFireIntervalId = null;
    }
    // Сбрасываем флаг удержания кнопки мыши для режима Gun.
    isGunMouseDown = false;
}

function spawnGunAntiMissile() {
    // Боезапас закончился: выключаем Gun-режим и обновляем UI.
    if (gunCount <= 0) {
        isGunActive = false;
        selectedWeapon = null;
        stopGunFiring();
        updateEconomyDisplay();
        updateWeaponButtonsState();
        return;
    }

    const gunSpeed = -20;          // скорость
    const gunExplosionRadius = 2; // радиус взрыва

    // Gun-направление зависит от текущего положения курсора
    let phi = Math.atan2(gunCursorY, gunCursorX) * (180 / Math.PI); // градусы
    if (phi < 0) phi += 360;

    // По ТЗ для Gun: взрыв на максимальном радиусе r = 75
    const gunMaxR = 75;
    // r (первый аргумент) — стартовый радиус, targetR (последний аргумент) — радиус, на котором будет взрыв
    const antiMissile = new AntiMissile(1, phi, gunSpeed, 0, gunMaxR);
    antiMissile.explosionRadius = gunExplosionRadius;
    antiMissile.isGunShot = true;
    activeTargets.add(antiMissile);
    gunCount -= 1;
    updateEconomyDisplay();
    updateWeaponButtonsState();
}

// При зажатой левой кнопке в режиме Gun создаем AntiMissile с частотой 10/сек
canvas.addEventListener('mousedown', function (event) {
    if (event.button !== 0) return; // только левая кнопка
    if (!(isGunActive && selectedWeapon === 'GUN')) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; // Вычисляем координату X относительно канваса
    const mouseY = event.clientY - rect.top;  // Вычисляем координату Y относительно канваса

    // Проверяем, находится ли клик в пределах канваса
    if (!(mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height)) return;

    isGunMouseDown = true;
    clickX = mouseX - (canvas.width / 2);   // координата X относительно центра
    clickY = mouseY - (canvas.height / 2);  // координата Y относительно центра
    gunCursorX = clickX;
    gunCursorY = clickY;

    // Обновляем поле click в окне Debug Info
    const displayScale = scaleValues[currentScaleIndex];
    const r = Math.sqrt(gunCursorX * gunCursorX + gunCursorY * gunCursorY) * displayScale;
    let phi = Math.atan2(gunCursorY, gunCursorX) * (180 / Math.PI);
    if (phi < 0) phi += 360;

    const clickCoordsElement = document.getElementById('clickCoords');
    if (clickCoordsElement) {
        clickCoordsElement.textContent = `Click: (r: ${(r).toFixed(1)}, φ: ${phi.toFixed(1)}°)`;
    }

    // Стартуем "стрельбу", если таймер ещё не запущен
    if (!gunFireIntervalId) {
        spawnGunAntiMissile(); // первый объект сразу (по текущей позиции курсора)
        gunFireIntervalId = setInterval(spawnGunAntiMissile, 100); // 10 объектов/сек
    }
});

// Во время удержания обновляем координаты курсора для пересчёта r/phi
canvas.addEventListener('mousemove', function (event) {
    if (!isGunActive) return;
    if (!isGunMouseDown) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Если курсор ушёл за пределы canvas, не обновляем (последняя известная позиция останется)
    if (!(mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height)) return;

    clickX = mouseX - (canvas.width / 2);
    clickY = mouseY - (canvas.height / 2);
    gunCursorX = clickX;
    gunCursorY = clickY;
});

// Останавливаем "стрельбу" при отпускании кнопки
window.addEventListener('mouseup', stopGunFiring);
canvas.addEventListener('mouseleave', stopGunFiring);

// Обычное создание AntiMissile по клику (не в режиме Gun)
canvas.addEventListener('click', function(event) {
    if (isGunActive && selectedWeapon === 'GUN') return; // в Gun-режиме используем mousedown/mouseup

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; // Вычисляем координату X относительно канваса
    const mouseY = event.clientY - rect.top; // Вычисляем координату Y относительно канваса

    // Проверяем, находится ли клик в пределах канваса
    if (mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height) {
        clickX = mouseX - (canvas.width / 2); // Вычисляем координату X относительно центра канваса
        clickY = mouseY - (canvas.height / 2); // Вычисляем координату Y относительно центра канваса

        // Получаем текущий масштаб для отображения
        const displayScale = scaleValues[currentScaleIndex];

        // Переводим в полярные координаты с учетом масштаба
        const r = Math.sqrt(clickX * clickX + clickY * clickY) * displayScale;
        let phi = Math.atan2(clickY, clickX) * (180 / Math.PI); // Угол в градусах
        if (phi < 0) phi += 360;

        console.log(`Click Coordinates: X: ${clickX}, Y: ${clickY}, r: ${r}, phi: ${phi}`);

        // Создаем объект AntiMissile в зависимости от выбранного типа вооружения
        if (selectedWeapon !== 'C300' && selectedWeapon !== 'C400') {
            return; // если тип не выбран, ракета не создается
        }

        if (selectedWeapon === 'C300' && c300Count <= 0) return;
        if (selectedWeapon === 'C400' && c400Count <= 0) return;

        const explosionRadius = selectedWeapon === 'C300' ? 15 : 30;
        // Радиус подрыва не может быть меньше самого радиуса взрыва.
        const targetR = Math.max(r, explosionRadius);
        const antiMissile = new AntiMissile(1, phi, -15, 0, targetR);
        antiMissile.explosionRadius = explosionRadius;
        antiMissile.isGunShot = false;
        activeTargets.add(antiMissile);

        if (selectedWeapon === 'C300') {
            c300Count -= 1;
        } else {
            c400Count -= 1;
        }
        updateEconomyDisplay();
        updateWeaponButtonsState();

        // Обновляем поле click в окне Debug Info
        const clickCoordsElement = document.getElementById('clickCoords');
        if (clickCoordsElement) {
            clickCoordsElement.textContent = `Click: (r: ${(targetR).toFixed(1)}, φ: ${phi.toFixed(1)}°)`;
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
        if (target instanceof EnemyTarget) {
            displayPhi = target.phi * (180 / Math.PI);
        } else if (target instanceof AntiMissile) {
            displayPhi = target.phi;
        }
        displayPhi = ((displayPhi + 90) % 360 + 360) % 360;
        
        // Создаем ячейки с данными
        const cells = [
            target.id,
            target.r.toFixed(1),
            displayPhi.toFixed(1),
            target.speed.toFixed(1)
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

    // Отрисовываем фоновое изображение перед сеткой
    drawBackgroundImage();

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
    updateScoreDisplay();
    updateKillStatsDisplay();

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
    score = 0;
    updateScoreDisplay();
    for (const type in killStats) killStats[type] = 0;
    updateKillStatsDisplay();
    
    // Сброс вооружения и экономики при старте новой игры
    selectedExplosionRadius = 15;
    currency = START_CURRENCY;
    c300Count = 0;
    c400Count = 0;
    gunCount = 0;
    isAFARActive = false;
    selectedWeapon = null;
    isGunActive = false;
    stopGunFiring();
    updateEconomyDisplay();
    updateWeaponButtonsState();

    // Сбрасываем счетчик попаданий
    hits = 1;
    updateHitsDisplay();
}

// Обновляем обработчик кнопки Start/Stop
const startButton = document.getElementById('startButton');
startButton.addEventListener('click', function() {
    if (!gameState.buttonEnabled) return;
    
    if (!gameState.isRunning) {
        // Запуск игры
        setButtonState(false);
        
        setTimeout(() => {
            // Инициализируем счетчик попаданий при запуске
            hits = 1;
            updateHitsDisplay();
            gameState.isRunning = true;
            gameState.gameOver = false;
            this.textContent = 'Stop';
            
            // Устанавливаем начальное время
            gameState.startTime = performance.now();
            gameState.lastFrameTime = 0;
            
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
        radarLine.speed = (2 * Math.PI) / 1; // Устанавливаем скорость π/сек
        xButtonCounter++;
    } else if (xButtonCounter === 2) {
        this.textContent = 'X3';
        radarLine.speed = (4 * Math.PI) / 1; // Устанавливаем скорость 2π/сек
        xButtonCounter++;
    } else {
        this.textContent = 'X1';
        radarLine.speed = (Math.PI) / 1; // Устанавливаем скорость 0.5π/сек
        xButtonCounter = 1; // Сбрасываем счетчик
    }
});

// Выбор вооружения C300/C400/GUN
c300Button.addEventListener('click', function () {
    if (c300Count <= 0) return;
    selectedWeapon = 'C300';
    isGunActive = false;
    stopGunFiring();
    selectedExplosionRadius = 15;
    updateWeaponButtonsState();
});

c400Button.addEventListener('click', function () {
    if (c400Count <= 0) return;
    selectedWeapon = 'C400';
    isGunActive = false;
    stopGunFiring();
    selectedExplosionRadius = 30;
    updateWeaponButtonsState();
});

gunButton.addEventListener('click', function () {
    if (gunCount <= 0) return;
    if (currentScaleIndex !== 2) return; // Gun доступен только на масштабе 100

    // Повторное нажатие на Gun выключает режим Gun.
    if (selectedWeapon === 'GUN' && isGunActive) {
        isGunActive = false;
        selectedWeapon = null;
        stopGunFiring();
        updateWeaponButtonsState();
        return;
    }

    selectedWeapon = 'GUN';
    isGunActive = true;
    selectedExplosionRadius = 2;
    updateWeaponButtonsState();
});

// Покупка боезапаса
c300PlusButton.addEventListener('click', function () {
    buyAmmo('C300');
});

c400PlusButton.addEventListener('click', function () {
    buyAmmo('C400');
});

gunPlusButton.addEventListener('click', function () {
    buyAmmo('GUN');
});

if (afarButton) {
    afarButton.addEventListener('click', function () {
        if (isAFARActive) return;
        if (currency < AFAR_COST) return;

        currency -= AFAR_COST;
        isAFARActive = true;

        updateEconomyDisplay();
        updateWeaponButtonsState();
    });
}

// Добавляем обработчики для новых кнопок
const type11Button = document.getElementById('type11Button');
const type12Button = document.getElementById('type12Button');
const type21Button = document.getElementById('type21Button');

// Создание ракеты (type 11)
type11Button.addEventListener('click', function() {
    if (!gameState.isRunning) return;
    // Случайная скорость в диапазоне [10, 15): 10 + (0..1) * 5
    const speed = 5 + Math.random() * 5;
    // Случайный угол в радианах от 0 до 2π (любой азимут появления)
    const phi = Math.random() * 2 * Math.PI;
    // Создаем цель Type 11 на внешней границе радара
    const enemy = new EnemyTarget(config.maxRadius, phi, speed, "11");
    activeTargets.add(enemy);
});

// Создание крылатой ракеты (type 12)
type12Button.addEventListener('click', function() {
    if (!gameState.isRunning) return;
    const speed = 4 + Math.random() * 5;
    const phi = Math.random() * 2 * Math.PI;
    const enemy = new EnemyTarget(config.maxRadius, phi, speed, "12");
    activeTargets.add(enemy);
});

// Создание бомбардировщика (type 21)
type21Button.addEventListener('click', function() {
    if (!gameState.isRunning) return;
    const speed = 3 + Math.random() * 5;
    const phi = Math.random() * 2 * Math.PI;
    const enemy = new EnemyTarget(config.maxRadius, phi, speed, "21");
    activeTargets.add(enemy);
});

// Создание бомбардировщика Stels Type 22
const type22Button = document.getElementById('type22Button');
type22Button.addEventListener('click', function() {
    if (!gameState.isRunning) return;
    const speed = 3 + Math.random() * 5;
    const phi = Math.random() * 2 * Math.PI;
    const enemy = new EnemyTarget(config.maxRadius, phi, speed, "22");
    activeTargets.add(enemy);
});

// Создание низколетящего бомбардировщика Type 23
const type23Button = document.getElementById('type23Button');
type23Button.addEventListener('click', function() {
    if (!gameState.isRunning) return;
    const speed = 3 + Math.random() * 3; // Скорость чуть меньше, чем у обычного бомбардировщика
    const phi = Math.random() * 2 * Math.PI;
    const enemy = new EnemyTarget(config.maxRadius, phi, speed, "23");
    // Радиус появления Type 23 зависит от состояния AFAR
    enemy.appearRadius = getType23AppearRadius();
    console.log(`[Type 23] Created: id=${enemy.id}, r=${enemy.r.toFixed(1)}, phi=${(enemy.phi * 180 / Math.PI).toFixed(1)}°, speed=${enemy.speed.toFixed(2)}, appearRadius=${enemy.appearRadius}`);
    activeTargets.add(enemy);
});

// Инициализация фонового изображения при запуске
setTimeout(() => {
    // Принудительно отрисовываем фоновое изображение после загрузки страницы
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBackgroundImage();
    
    // Инициализация состояния панели вооружения
    updateEconomyDisplay();
    updateWeaponButtonsState();
}, 100);

// Запуск анимации
animate(performance.now());