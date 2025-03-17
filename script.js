class RadarLine {
    constructor() {
        this.element = document.querySelector('.radar-line');
        this.angle = 0; // Текущий угол в градусах
        this.speed = 180; // Скорость вращения (180°/сек = 0.5 оборота/сек)
    }
    
    update(deltaTime) {
        this.angle = (this.angle + this.speed * deltaTime) % 360;
        this.element.style.transform = `translateX(-50%) rotate(${this.angle}deg)`;
    }
}

class Target {
    constructor() {
        this.startRadius = 100; // Начальный радиус (%)
        this.currentRadius = this.startRadius;
        this.speed = this.startRadius / 20; // Скорость движения (5% в секунду, в 2 раза медленнее)
    }

    update(deltaTime) {
        this.currentRadius = Math.max(0, this.currentRadius - this.speed * deltaTime);
    }

    get position() {
        return {
            x: 0, // Цель всегда движется вертикально вниз (x = 0)
            y: this.currentRadius // y меняется от 100% до 0%
        };
    }
}

class Game {
    constructor() {
        this.radar = new RadarLine();
        this.target = new Target();
        this.point = document.querySelector('.intersection-point');
        this.lastTime = null;
        this.isGameActive = true;
        this.isIntersected = false; // Флаг пересечения

        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
    }

    checkIntersection() {
        // Угол линии радара в радианах
        const radarAngle = this.radar.angle * Math.PI / 180;

        // Угол цели (всегда вертикально вниз, 90°)
        const targetAngle = 90 * Math.PI / 180;
        
        // Разница углов
        const angleDiff = Math.abs(radarAngle - targetAngle);
        
        // Проверка пересечения (с погрешностью 2°)
        return angleDiff < 2 * Math.PI / 180 || angleDiff > 358 * Math.PI / 180;
    }
    
    updatePointPosition() {
        const container = document.querySelector('.radar-container');
        const radius = container.offsetWidth / 2;
        const pos = this.target.position;
        
        // Позиция точки в % от центра
        this.point.style.left = `${50 + pos.x}%`;
        this.point.style.top = `${50 + pos.y}%`;
    }
    
    gameLoop(timestamp) {
        if (!this.isGameActive) return;
        
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Обновление объектов
        this.radar.update(deltaTime);
        this.target.update(deltaTime);
        
        // Проверка пересечения
        if (this.checkIntersection()) {
            this.updatePointPosition();
            this.point.style.display = 'block';
            this.isIntersected = true;
        } else if (this.isIntersected) {
            // Точка остается на месте до следующего пересечения
            this.point.style.display = 'block';
        } else {
            this.point.style.display = 'none';
        }
        
        // Проверка конца игры
        if (this.target.currentRadius <= 0) {
            this.isGameActive = false;
            alert('Цель достигла центра!');
            return;
        }
        
        requestAnimationFrame(this.gameLoop);
    }
}

new Game();