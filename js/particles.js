class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.touch = { x: null, y: null, active: false };
        this.config = {
            particleCount: 0,
            baseCount: 80,
            maxCount: 200,
            minRadius: 0.5,
            maxRadius: 2.5,
            minSpeed: -0.5,
            maxSpeed: 0.5,
            connectDistance: 120,
            mouseRepelDistance: 150,
            mouseRepelForce: 0.08,
            mouseAttractForce: 0.02,
            friction: 0.98,
            returnForce: 0.005,
            colors: [
                { r: 147, g: 51, b: 234 },
                { r: 168, g: 85, b: 247 },
                { r: 236, g: 72, b: 153 },
                { r: 244, g: 114, b: 182 },
                { r: 139, g: 92, b: 246 },
                { r: 99, g: 102, b: 241 }
            ],
            glowIntensity: 15,
            particleOpacity: { min: 0.3, max: 0.9 },
            lineOpacity: { min: 0.05, max: 0.3 }
        };
        this.animationId = null;
        this.isRunning = false;
        this.dpr = window.devicePixelRatio || 1;
        this.init();
    }

    init() {
        this.resize();
        this.createParticles();
        this.bindEvents();
        this.start();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.scale(this.dpr, this.dpr);
        const area = this.width * this.height;
        this.config.particleCount = Math.min(
            this.config.maxCount,
            Math.max(this.config.baseCount, Math.floor(area / 8000))
        );
        if (this.particles.length > 0) {
            this.adjustParticleCount();
        }
    }

    adjustParticleCount() {
        const targetCount = this.config.particleCount;
        while (this.particles.length < targetCount) {
            this.particles.push(new Particle(this));
        }
        while (this.particles.length > targetCount) {
            this.particles.pop();
        }
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push(new Particle(this));
        }
    }

    bindEvents() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 100);
        });
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                this.touch.x = e.touches[0].clientX;
                this.touch.y = e.touches[0].clientY;
                this.touch.active = true;
            }
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.touch.x = e.touches[0].clientX;
                this.touch.y = e.touches[0].clientY;
                this.touch.active = true;
            }
        }, { passive: true });
        window.addEventListener('touchend', () => {
            this.touch.active = false;
            this.touch.x = null;
            this.touch.y = null;
        }, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stop();
            } else {
                this.start();
            }
        });
    }

    getActivePointer() {
        if (this.touch.active && this.touch.x !== null) {
            return { x: this.touch.x, y: this.touch.y };
        }
        if (this.mouse.x !== null && this.mouse.y !== null) {
            return { x: this.mouse.x, y: this.mouse.y };
        }
        return null;
    }

    update() {
        const pointer = this.getActivePointer();
        this.particles.forEach(particle => {
            particle.update(pointer);
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawConnections();
        this.particles.forEach(particle => {
            particle.draw();
        });
    }

    drawConnections() {
        const pointer = this.getActivePointer();
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.config.connectDistance) {
                    const opacity = (1 - dist / this.config.connectDistance) *
                        ((p1.opacity + p2.opacity) / 2) * 0.5;
                    const clampedOpacity = Math.min(
                        this.config.lineOpacity.max,
                        Math.max(this.config.lineOpacity.min, opacity)
                    );
                    const gradient = this.ctx.createLinearGradient(
                        p1.x, p1.y, p2.x, p2.y
                    );
                    const color1 = p1.getColorRGBA(clampedOpacity);
                    const color2 = p2.getColorRGBA(clampedOpacity);
                    gradient.addColorStop(0, color1);
                    gradient.addColorStop(1, color2);
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = gradient;
                    this.ctx.lineWidth = Math.max(0.3, (1 - dist / this.config.connectDistance) * 1.5);
                    this.ctx.stroke();
                    this.ctx.closePath();
                }
            }
            if (pointer) {
                const p1 = this.particles[i];
                const dx = p1.x - pointer.x;
                const dy = p1.y - pointer.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.config.mouseRepelDistance * 1.5) {
                    const opacity = (1 - dist / (this.config.mouseRepelDistance * 1.5)) * 0.4;
                    const clampedOpacity = Math.max(0.02, Math.min(0.25, opacity));
                    this.ctx.beginPath();
                    this.ctx.moveTo(pointer.x, pointer.y);
                    this.ctx.lineTo(p1.x, p1.y);
                    this.ctx.strokeStyle = `rgba(168, 85, 247, ${clampedOpacity})`;
                    this.ctx.lineWidth = 0.8;
                    this.ctx.stroke();
                    this.ctx.closePath();
                }
            }
        }
    }

    animate() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    destroy() {
        this.stop();
        this.particles = [];
        this.canvas = null;
        this.ctx = null;
    }
}

class Particle {
    constructor(system) {
        this.system = system;
        this.reset(true);
    }

    reset(initial = false) {
        const config = this.system.config;
        this.x = initial ? Math.random() * this.system.width : Math.random() * this.system.width;
        this.y = initial ? Math.random() * this.system.height : Math.random() * this.system.height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.vx = (Math.random() * (config.maxSpeed - config.minSpeed) + config.minSpeed) * 2;
        this.vy = (Math.random() * (config.maxSpeed - config.minSpeed) + config.minSpeed) * 2;
        this.radius = Math.random() * (config.maxRadius - config.minRadius) + config.minRadius;
        this.baseRadius = this.radius;
        const colorIndex = Math.floor(Math.random() * config.colors.length);
        this.color = { ...config.colors[colorIndex] };
        this.targetColor = { ...this.color };
        this.opacity = Math.random() * (config.particleOpacity.max - config.particleOpacity.min) + config.particleOpacity.min;
        this.baseOpacity = this.opacity;
        this.phase = Math.random() * Math.PI * 2;
        this.phaseSpeed = 0.005 + Math.random() * 0.01;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderSpeed = 0.02 + Math.random() * 0.03;
        this.pulseSpeed = 0.01 + Math.random() * 0.02;
        this.pulseAmount = 0.2 + Math.random() * 0.3;
        this.time = Math.random() * 1000;
    }

    update(pointer) {
        this.time++;
        const config = this.system.config;
        this.phase += this.phaseSpeed;
        this.wanderAngle += (Math.random() - 0.5) * this.wanderSpeed;
        const wanderForce = 0.03;
        this.vx += Math.cos(this.wanderAngle) * wanderForce;
        this.vy += Math.sin(this.wanderAngle) * wanderForce;
        const pulse = Math.sin(this.time * this.pulseSpeed) * this.pulseAmount;
        this.radius = this.baseRadius * (1 + pulse);
        this.opacity = this.baseOpacity * (0.7 + Math.sin(this.phase) * 0.3);
        if (pointer) {
            const dx = this.x - pointer.x;
            const dy = this.y - pointer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < config.mouseRepelDistance && dist > 0) {
                const force = (1 - dist / config.mouseRepelDistance) * config.mouseRepelForce;
                const angle = Math.atan2(dy, dx);
                this.vx += Math.cos(angle) * force * 10;
                this.vy += Math.sin(angle) * force * 10;
                this.radius = this.baseRadius * (1 + pulse + (1 - dist / config.mouseRepelDistance) * 0.8);
                this.opacity = Math.min(1, this.baseOpacity + (1 - dist / config.mouseRepelDistance) * 0.4);
                const hueShift = (1 - dist / config.mouseRepelDistance) * 30;
                this.targetColor = {
                    r: Math.min(255, this.color.r + hueShift),
                    g: Math.min(255, this.color.g + hueShift * 0.5),
                    b: Math.min(255, this.color.b + hueShift)
                };
            } else {
                this.targetColor = { ...this.color };
            }
        } else {
            this.targetColor = { ...this.color };
        }
        this.color.r += (this.targetColor.r - this.color.r) * 0.05;
        this.color.g += (this.targetColor.g - this.color.g) * 0.05;
        this.color.b += (this.targetColor.b - this.color.b) * 0.05;
        const returnDx = this.baseX - this.x;
        const returnDy = this.baseY - this.y;
        const returnDist = Math.sqrt(returnDx * returnDx + returnDy * returnDy);
        if (returnDist > 50) {
            this.vx += (returnDx / returnDist) * config.returnForce;
            this.vy += (returnDy / returnDist) * config.returnForce;
        }
        this.vx *= config.friction;
        this.vy *= config.friction;
        const maxSpeed = 3;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -50) this.x = this.system.width + 50;
        if (this.x > this.system.width + 50) this.x = -50;
        if (this.y < -50) this.y = this.system.height + 50;
        if (this.y > this.system.height + 50) this.y = -50;
    }

    getColorRGBA(opacity = null) {
        const alpha = opacity !== null ? opacity : this.opacity;
        return `rgba(${Math.round(this.color.r)}, ${Math.round(this.color.g)}, ${Math.round(this.color.b)}, ${alpha})`;
    }

    draw() {
        const ctx = this.system.ctx;
        const config = this.system.config;
        ctx.save();
        const glowRadius = this.radius + config.glowIntensity;
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, glowRadius
        );
        const coreAlpha = this.opacity;
        const midAlpha = this.opacity * 0.4;
        const edgeAlpha = 0;
        gradient.addColorStop(0, `rgba(${Math.round(this.color.r)}, ${Math.round(this.color.g)}, ${Math.round(this.color.b)}, ${coreAlpha})`);
        gradient.addColorStop(0.4, `rgba(${Math.round(this.color.r)}, ${Math.round(this.color.g)}, ${Math.round(this.color.b)}, ${midAlpha})`);
        gradient.addColorStop(1, `rgba(${Math.round(this.color.r)}, ${Math.round(this.color.g)}, ${Math.round(this.color.b)}, ${edgeAlpha})`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity * 0.8})`;
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (document.getElementById('particleCanvas')) {
            window.particleSystem = new ParticleSystem('particleCanvas');
        }
    }, 2100);
});
