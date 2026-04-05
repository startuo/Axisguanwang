(function () {
    'use strict';

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function lerp(start, end, amount) {
        return start + (end - start) * amount;
    }

    function mixColor(stopA, stopB, amount) {
        return {
            r: Math.round(lerp(stopA.r, stopB.r, amount)),
            g: Math.round(lerp(stopA.g, stopB.g, amount)),
            b: Math.round(lerp(stopA.b, stopB.b, amount))
        };
    }

    var COLOR_STOPS = [
        { position: 0.00, r: 255, g: 88, b: 72 },
        { position: 0.14, r: 255, g: 190, b: 48 },
        { position: 0.34, r: 76, g: 114, b: 255 },
        { position: 0.58, r: 124, g: 83, b: 255 },
        { position: 0.82, r: 72, g: 110, b: 255 },
        { position: 1.00, r: 255, g: 88, b: 72 }
    ];

    function sampleAngularColor(angle, brightnessShift) {
        var normalized = (angle / (Math.PI * 2)) % 1;
        var stopIndex = 0;
        var index;

        if (normalized < 0) {
            normalized += 1;
        }

        for (index = 0; index < COLOR_STOPS.length - 1; index += 1) {
            if (normalized >= COLOR_STOPS[index].position && normalized <= COLOR_STOPS[index + 1].position) {
                stopIndex = index;
                break;
            }
        }

        var start = COLOR_STOPS[stopIndex];
        var end = COLOR_STOPS[stopIndex + 1];
        var localT = (normalized - start.position) / (end.position - start.position || 1);
        var color = mixColor(start, end, localT);

        color.r = clamp(Math.round(color.r + brightnessShift), 0, 255);
        color.g = clamp(Math.round(color.g + brightnessShift * 0.82), 0, 255);
        color.b = clamp(Math.round(color.b + brightnessShift * 0.65), 0, 255);
        return color;
    }

    function FlowRipple() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.amplitude = 0;
        this.life = 0;
        this.speed = 0;
        this.width = 0;
        this.spin = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.maxRadius = 0;
    }

    FlowRipple.prototype.activate = function activate(x, y, time, amplitude, life, speed, width, spin) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.amplitude = amplitude;
        this.life = life;
        this.speed = speed;
        this.width = width;
        this.spin = spin;
        this.startTime = time;
        this.endTime = time + life;
        this.maxRadius = (speed * life) + (width * 3);
    };

    FlowRipple.prototype.update = function update(time) {
        if (this.active && time >= this.endTime) {
            this.active = false;
        }
    };

    function BurstParticle(index) {
        this.index = index;
        this.active = false;
        this.isDust = false;
        this.radiusRatio = 0;
        this.baseX = 0;
        this.baseY = 0;
        this.vectorX = 0;
        this.vectorY = 0;
        this.vectorLength = 0;
        this.normalX = 0;
        this.normalY = 0;
        this.tangentX = 0;
        this.tangentY = 0;
        this.baseAngle = 0;
        this.localPhase = Math.random() * Math.PI * 2;
        this.seed = Math.random() * 1000;

        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.length = 0;
        this.renderLength = 0;
        this.lineWidth = 0;
        this.alpha = 0;
        this.renderAlpha = 0;
        this.angle = 0;
        this.angleEase = 0.08;
        this.spring = 0.02;
        this.friction = 0.9;
        this.maxSpeed = 5;
        this.driftRadius = 0;
        this.driftSpeed = 0;
        this.wobble = 0;
        this.pointerWeight = 1;
        this.intensity = 0;
        this.boost = 0;
        this.color = { r: 255, g: 255, b: 255 };
        this.colorKey = '255,255,255';
    }

    BurstParticle.prototype.activate = function activate() {
        this.active = true;
        this.vx = 0;
        this.vy = 0;
        this.boost = 0;
        this.intensity = 0;
        this.x = this.baseX;
        this.y = this.baseY;
        this.angle = this.baseAngle;
        this.renderLength = this.length;
        this.renderAlpha = this.alpha;
    };

    BurstParticle.prototype.setColor = function setColor(angle, brightnessShift) {
        this.color = sampleAngularColor(angle, brightnessShift);
        this.colorKey = this.color.r + ',' + this.color.g + ',' + this.color.b;
    };

    BurstParticle.prototype.resetBurst = function resetBurst(engine, ratio) {
        var baseRatio = 0.06 + Math.pow(ratio, 0.68) * 0.94;
        var radiusRatio = clamp(baseRatio + ((Math.random() - 0.5) * 0.12), 0.04, 1);
        var angle = (this.index * engine.goldenAngle) + ((Math.random() - 0.5) * 0.12);

        if (Math.random() < 0.34) {
            radiusRatio *= 0.56 + (Math.random() * 0.26);
        }

        var xSpread = engine.burstRadiusX * radiusRatio * (0.74 + Math.random() * 0.36);
        var ySpread = engine.burstRadiusY * radiusRatio * (0.72 + Math.random() * 0.42);

        this.isDust = false;
        this.radiusRatio = radiusRatio;
        this.vectorX = Math.cos(angle) * xSpread;
        this.vectorY = Math.sin(angle) * ySpread;
        this.vectorLength = Math.sqrt((this.vectorX * this.vectorX) + (this.vectorY * this.vectorY)) || 1;
        this.normalX = this.vectorX / this.vectorLength;
        this.normalY = this.vectorY / this.vectorLength;
        this.tangentX = -this.normalY;
        this.tangentY = this.normalX;
        this.baseAngle = Math.atan2(this.vectorY, this.vectorX);
        this.baseX = engine.burstCenterX + this.vectorX;
        this.baseY = engine.burstCenterY + this.vectorY;
        this.length = 1.7 + Math.pow(radiusRatio, 1.16) * 5.8 + Math.random() * 2.2;
        this.lineWidth = 0.7 + radiusRatio * 1.04;
        this.alpha = 0.22 + radiusRatio * 0.48 + Math.random() * 0.18;
        this.driftRadius = 1.6 + radiusRatio * 4.4;
        this.driftSpeed = 0.35 + Math.random() * 0.7;
        this.wobble = 0.035 + Math.random() * 0.08;
        this.pointerWeight = 0.92 + radiusRatio * 0.58;
        this.spring = 0.012 + (1 - radiusRatio) * 0.014;
        this.friction = 0.87 + radiusRatio * 0.06;
        this.maxSpeed = 3.6 + radiusRatio * 3.6;
        this.localPhase = Math.random() * Math.PI * 2;
        this.setColor(this.baseAngle, radiusRatio * 12);
        this.activate();
    };

    BurstParticle.prototype.resetDust = function resetDust(engine, ratio) {
        var xPadding = engine.width * 0.03;
        var yPadding = engine.height * 0.04;
        var x = xPadding + (Math.random() * Math.max(1, engine.width - (xPadding * 2)));
        var y = yPadding + (Math.random() * Math.max(1, engine.height - (yPadding * 2)));
        var dx = x - engine.burstCenterX;
        var dy = y - engine.burstCenterY;
        var length = Math.sqrt((dx * dx) + (dy * dy)) || 1;
        var angle = Math.atan2(dy, dx);

        this.isDust = true;
        this.radiusRatio = ratio;
        this.vectorX = dx;
        this.vectorY = dy;
        this.vectorLength = length;
        this.normalX = dx / length;
        this.normalY = dy / length;
        this.tangentX = -this.normalY;
        this.tangentY = this.normalX;
        this.baseAngle = angle + ((Math.random() - 0.5) * 0.5);
        this.baseX = x;
        this.baseY = y;
        this.length = 0.95 + Math.random() * 2.4;
        this.lineWidth = 0.34 + Math.random() * 0.58;
        this.alpha = 0.09 + Math.random() * 0.18;
        this.driftRadius = 0.6 + Math.random() * 2.8;
        this.driftSpeed = 0.16 + Math.random() * 0.24;
        this.wobble = 0.015 + Math.random() * 0.035;
        this.pointerWeight = 0.16 + (ratio * 0.26);
        this.spring = 0.004 + Math.random() * 0.004;
        this.friction = 0.91 + Math.random() * 0.05;
        this.maxSpeed = 0.9 + Math.random() * 1.2;
        this.localPhase = Math.random() * Math.PI * 2;
        this.setColor(angle, -8 + Math.random() * 10);
        this.activate();
    };

    BurstParticle.prototype.deactivate = function deactivate() {
        this.active = false;
        this.boost = 0;
        this.intensity = 0;
    };

    BurstParticle.prototype.update = function update(engine, delta) {
        if (!this.active) {
            return;
        }

        var time = engine.time;
        var driftPhase = (time * this.driftSpeed) + (this.seed * 0.011);
        var driftX = Math.cos(driftPhase) * this.driftRadius;
        var driftY = Math.sin((driftPhase * 0.88) + this.localPhase) * this.driftRadius * 0.8;
        var targetX;
        var targetY;
        var rippleDx = 0;
        var rippleDy = 0;
        var rippleEnergy = 0;
        var rippleIndex;
        var ripple;
        var age;
        var rx;
        var ry;
        var distance;
        var ringRadius;
        var band;
        var envelope;
        var pulse;

        if (this.isDust) {
            targetX = this.baseX + driftX + (engine.fieldShiftX * 0.14);
            targetY = this.baseY + driftY + (engine.fieldShiftY * 0.12);
        } else {
            var radialPulse =
                Math.sin((time * engine.idleWaveSpeedA) - (this.radiusRatio * engine.idleWaveDensityA) + this.localPhase) * engine.idleWaveAmplitudeA +
                Math.sin((time * engine.idleWaveSpeedB) + (this.baseAngle * 2.4) - (this.radiusRatio * engine.idleWaveDensityB)) * engine.idleWaveAmplitudeB;
            var swirl = Math.cos((time * engine.idleSwirlSpeed) + (this.baseAngle * 3.2) + this.localPhase) *
                engine.idleSwirlAmplitude *
                (0.24 + (this.radiusRatio * 0.9));
            var breathe = 1 + (Math.sin((time * engine.breatheSpeed) + this.localPhase) * engine.breatheAmplitude * (0.22 + (this.radiusRatio * 0.55)));
            var followStrength = 0.24 + (this.radiusRatio * engine.fieldFollowStrength);

            targetX = engine.burstCenterX +
                (this.vectorX * breathe) +
                (this.normalX * radialPulse * (0.45 + this.radiusRatio)) +
                (this.tangentX * swirl) +
                (engine.fieldShiftX * followStrength) +
                driftX;
            targetY = engine.burstCenterY +
                (this.vectorY * breathe) +
                (this.normalY * radialPulse * (0.45 + this.radiusRatio)) +
                (this.tangentY * swirl) +
                (engine.fieldShiftY * (0.24 + (this.radiusRatio * 0.72))) +
                driftY;
        }

        for (rippleIndex = 0; rippleIndex < engine.maxRipples; rippleIndex += 1) {
            ripple = engine.ripples[rippleIndex];
            if (!ripple.active) {
                continue;
            }

            age = time - ripple.startTime;
            if (age < 0 || age > ripple.life) {
                continue;
            }

            rx = targetX - ripple.x;
            ry = targetY - ripple.y;
            distance = Math.sqrt((rx * rx) + (ry * ry)) || 0.0001;
            if (distance > ripple.maxRadius) {
                continue;
            }

            ringRadius = age * ripple.speed;
            band = distance - ringRadius;
            envelope = Math.exp(-((band * band) / (ripple.width * ripple.width)));
            pulse = envelope * ripple.amplitude * (1 - (age / ripple.life));

            rippleDx += (rx / distance) * pulse;
            rippleDy += (ry / distance) * pulse;

            if (!this.isDust) {
                rippleDx += (-ry / distance) * pulse * ripple.spin;
                rippleDy += (rx / distance) * pulse * ripple.spin;
            }

            rippleEnergy += pulse;
        }

        targetX += rippleDx;
        targetY += rippleDy;

        this.vx += (targetX - this.x) * this.spring * delta;
        this.vy += (targetY - this.y) * this.spring * delta;

        if (engine.pointerStrength > 0.001) {
            var dx = engine.pointerX - this.x;
            var dy = engine.pointerY - this.y;
            var distanceSq = (dx * dx) + (dy * dy);
            var outerRadius = this.isDust ? engine.pointerDustRadius : engine.pointerRadius;

            if (distanceSq < (outerRadius * outerRadius)) {
                var pointerDistance = Math.sqrt(distanceSq) || 0.0001;
                var influence = 1 - (pointerDistance / outerRadius);
                var nx = dx / pointerDistance;
                var ny = dy / pointerDistance;
                var attractForce = influence * influence * this.pointerWeight * engine.pointerStrength;

                this.vx += (nx * engine.pointerPull + (engine.pointerVelocityX * 0.14)) * attractForce * delta;
                this.vy += (ny * engine.pointerPull + (engine.pointerVelocityY * 0.14)) * attractForce * delta;

                if (!this.isDust && pointerDistance < engine.pointerRepelRadius) {
                    var repel = 1 - (pointerDistance / engine.pointerRepelRadius);
                    this.vx -= nx * repel * repel * engine.pointerPush * delta;
                    this.vy -= ny * repel * repel * engine.pointerPush * delta;
                }

                this.boost = Math.max(this.boost, attractForce * 0.9);
            }
        }

        this.vx *= this.friction;
        this.vy *= this.friction;

        var speed = Math.sqrt((this.vx * this.vx) + (this.vy * this.vy));
        if (speed > this.maxSpeed) {
            var clampRatio = this.maxSpeed / speed;
            this.vx *= clampRatio;
            this.vy *= clampRatio;
            speed = this.maxSpeed;
        }

        this.x += this.vx * delta;
        this.y += this.vy * delta;

        var motionAngle = speed > 0.04 ? Math.atan2(this.vy, this.vx) : 0;
        var targetAngle = this.baseAngle + (Math.sin((time * 0.7) + this.localPhase) * this.wobble) + (motionAngle * 0.24);
        this.angle += (targetAngle - this.angle) * this.angleEase * delta;

        this.boost = Math.max(this.boost, rippleEnergy * (this.isDust ? 0.8 : 1.1));
        this.boost += (0 - this.boost) * 0.08 * delta;
        this.intensity = clamp(this.boost, 0, 1.35);
        this.renderLength = this.length * (1 + (this.intensity * (this.isDust ? 0.32 : 0.46)) + (speed * 0.06));
        this.renderAlpha = clamp(this.alpha * (1 + (this.intensity * (this.isDust ? 0.38 : 0.58))), 0.035, 1);
    };

    BurstParticle.prototype.draw = function draw(context) {
        if (!this.active) {
            return;
        }

        var halfLength = this.renderLength * 0.5;
        var cos = Math.cos(this.angle);
        var sin = Math.sin(this.angle);
        var startX = this.x - (cos * halfLength);
        var startY = this.y - (sin * halfLength);
        var endX = this.x + (cos * halfLength);
        var endY = this.y + (sin * halfLength);

        if (!this.isDust && this.intensity > 0.08) {
            context.strokeStyle = 'rgba(' + this.colorKey + ',' + (this.renderAlpha * 0.25) + ')';
            context.lineWidth = this.lineWidth * 1.9;
            context.beginPath();
            context.moveTo(startX, startY);
            context.lineTo(endX, endY);
            context.stroke();
        }

        context.strokeStyle = 'rgba(' + this.colorKey + ',' + this.renderAlpha + ')';
        context.lineWidth = this.lineWidth;
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();
    };

    function AntigravityHero(root) {
        this.root = root;
        this.canvas = root.querySelector('[data-antigravity-canvas]');
        this.content = root.querySelector('.hero-content');
        this.title = root.querySelector('.hero-title');
        this.context = this.canvas ? this.canvas.getContext('2d', {
            alpha: true,
            desynchronized: true
        }) : null;

        if (!this.canvas || !this.context) {
            return;
        }

        this.maxParticles = 560;
        this.maxRipples = 10;
        this.particles = [];
        this.ripples = [];
        this.activeCount = 0;
        this.burstCount = 0;
        this.dustCount = 0;
        this.dpr = 1;
        this.width = 0;
        this.height = 0;
        this.bounds = this.root.getBoundingClientRect();
        this.goldenAngle = Math.PI * (3 - Math.sqrt(5));
        this.animationFrame = 0;
        this.lastTime = 0;
        this.time = 0;
        this.isVisible = true;
        this.isRunning = false;
        this.lastIdleRippleTime = -10;
        this.lastPointerRippleTime = -10;

        this.pointerTargetX = 0;
        this.pointerTargetY = 0;
        this.pointerX = 0;
        this.pointerY = 0;
        this.pointerActive = false;
        this.pointerStrength = 0;
        this.pointerVelocityX = 0;
        this.pointerVelocityY = 0;
        this.pointerRadius = 150;
        this.pointerDustRadius = 108;
        this.pointerRepelRadius = 56;
        this.pointerPull = 0.32;
        this.pointerPush = 3.4;

        this.fieldShiftX = 0;
        this.fieldShiftY = 0;
        this.fieldFollowStrength = 0.48;
        this.ambientShiftRangeX = 26;
        this.ambientShiftRangeY = 18;
        this.idleWaveAmplitudeA = 12;
        this.idleWaveAmplitudeB = 8;
        this.idleWaveDensityA = 7.4;
        this.idleWaveDensityB = 5.8;
        this.idleWaveSpeedA = 2.2;
        this.idleWaveSpeedB = 1.35;
        this.idleSwirlAmplitude = 9.4;
        this.idleSwirlSpeed = 1.1;
        this.breatheAmplitude = 0.04;
        this.breatheSpeed = 0.8;

        this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.handleAnimationFrame = this.handleAnimationFrame.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerEnter = this.handlePointerEnter.bind(this);
        this.handlePointerLeave = this.handlePointerLeave.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleReducedMotionChange = this.handleReducedMotionChange.bind(this);

        this.createPools();
        this.bind();
        this.resize();
        this.start();
    }

    AntigravityHero.prototype.createPools = function createPools() {
        var index;
        for (index = 0; index < this.maxParticles; index += 1) {
            this.particles.push(new BurstParticle(index));
        }
        for (index = 0; index < this.maxRipples; index += 1) {
            this.ripples.push(new FlowRipple());
        }
    };

    AntigravityHero.prototype.bind = function bind() {
        this.root.addEventListener('pointerenter', this.handlePointerEnter, { passive: true });
        this.root.addEventListener('pointermove', this.handlePointerMove, { passive: true });
        this.root.addEventListener('pointerleave', this.handlePointerLeave, { passive: true });
        this.root.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.root.addEventListener('touchmove', this.handleTouchMove, { passive: true });
        this.root.addEventListener('touchend', this.handleTouchEnd, { passive: true });
        window.addEventListener('resize', this.handleResize, { passive: true });
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        if (typeof this.reducedMotionQuery.addEventListener === 'function') {
            this.reducedMotionQuery.addEventListener('change', this.handleReducedMotionChange);
        } else if (typeof this.reducedMotionQuery.addListener === 'function') {
            this.reducedMotionQuery.addListener(this.handleReducedMotionChange);
        }

        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(this.handleResize);
            this.resizeObserver.observe(this.root);
        }

        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(function (entries) {
                var visibleEntry = entries[0];
                this.isVisible = !!(visibleEntry && visibleEntry.isIntersecting);
                if (this.isVisible) {
                    this.start();
                } else {
                    this.stop();
                }
            }.bind(this), {
                threshold: 0.02
            });
            this.intersectionObserver.observe(this.root);
        }
    };

    AntigravityHero.prototype.handleReducedMotionChange = function handleReducedMotionChange() {
        this.resize();
    };

    AntigravityHero.prototype.handleVisibilityChange = function handleVisibilityChange() {
        if (document.hidden) {
            this.stop();
        } else if (this.isVisible) {
            this.start();
        }
    };

    AntigravityHero.prototype.handleResize = function handleResize() {
        if (this.resizeTimer) {
            window.clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = window.setTimeout(function () {
            this.resize();
        }.bind(this), 80);
    };

    AntigravityHero.prototype.handlePointerEnter = function handlePointerEnter(event) {
        this.updatePointerTarget(event.clientX, event.clientY);
        this.pointerActive = true;
        this.emitRipple(this.pointerTargetX, this.pointerTargetY, 7.5, 1.25, 110, 34, 0.06);
    };

    AntigravityHero.prototype.handlePointerMove = function handlePointerMove(event) {
        this.updatePointerTarget(event.clientX, event.clientY);
        this.pointerActive = true;
    };

    AntigravityHero.prototype.handlePointerLeave = function handlePointerLeave() {
        this.pointerActive = false;
    };

    AntigravityHero.prototype.handleTouchStart = function handleTouchStart(event) {
        if (event.touches && event.touches[0]) {
            this.updatePointerTarget(event.touches[0].clientX, event.touches[0].clientY);
            this.pointerActive = true;
            this.emitRipple(this.pointerTargetX, this.pointerTargetY, 7.5, 1.25, 110, 34, 0.06);
        }
    };

    AntigravityHero.prototype.handleTouchMove = function handleTouchMove(event) {
        if (event.touches && event.touches[0]) {
            this.updatePointerTarget(event.touches[0].clientX, event.touches[0].clientY);
            this.pointerActive = true;
        }
    };

    AntigravityHero.prototype.handleTouchEnd = function handleTouchEnd() {
        this.pointerActive = false;
    };

    AntigravityHero.prototype.updatePointerTarget = function updatePointerTarget(clientX, clientY) {
        this.bounds = this.root.getBoundingClientRect();
        this.pointerTargetX = clientX - this.bounds.left;
        this.pointerTargetY = clientY - this.bounds.top;
    };

    AntigravityHero.prototype.emitRipple = function emitRipple(x, y, amplitude, life, speed, width, spin) {
        var slot = null;
        var index;
        for (index = 0; index < this.maxRipples; index += 1) {
            if (!this.ripples[index].active) {
                slot = this.ripples[index];
                break;
            }
        }
        if (!slot) {
            slot = this.ripples[0];
            for (index = 1; index < this.maxRipples; index += 1) {
                if (this.ripples[index].endTime < slot.endTime) {
                    slot = this.ripples[index];
                }
            }
        }
        slot.activate(x, y, this.time, amplitude, life, speed, width, spin);
    };

    AntigravityHero.prototype.updateLayoutMetrics = function updateLayoutMetrics() {
        var rootRect = this.root.getBoundingClientRect();
        var referenceRect = this.title ? this.title.getBoundingClientRect() : this.content.getBoundingClientRect();

        this.bounds = rootRect;
        this.burstCenterX = (referenceRect.left - rootRect.left) + (referenceRect.width * 0.5);
        this.burstCenterY = (referenceRect.top - rootRect.top) + (referenceRect.height * 0.54);
        this.burstRadiusX = Math.min(this.width * 0.5, Math.max(referenceRect.width * 1.05, 360));
        this.burstRadiusY = Math.min(this.height * 0.46, Math.max(referenceRect.height * 3.2, 260));
    };

    AntigravityHero.prototype.applyResponsiveBudget = function applyResponsiveBudget() {
        var area = this.width * this.height;
        var isTablet = this.width <= 1100;
        var isMobile = this.width <= 768;
        var reducedMotion = this.reducedMotionQuery.matches;
        var scale = clamp(area / 980000, 0.74, 1.34);

        this.burstCount = Math.round((isMobile ? 138 : (isTablet ? 232 : 336)) * scale);
        this.dustCount = Math.round((isMobile ? 72 : (isTablet ? 116 : 176)) * scale);

        if (reducedMotion) {
            this.burstCount = Math.round(this.burstCount * 0.55);
            this.dustCount = Math.round(this.dustCount * 0.44);
        }

        this.activeCount = Math.min(this.maxParticles, this.burstCount + this.dustCount);
        this.pointerRadius = isMobile ? 112 : (isTablet ? 132 : 158);
        this.pointerDustRadius = isMobile ? 82 : (isTablet ? 96 : 114);
        this.pointerRepelRadius = isMobile ? 42 : 56;
        this.pointerPull = reducedMotion ? 0.08 : (isMobile ? 0.18 : 0.32);
        this.pointerPush = reducedMotion ? 0.9 : (isMobile ? 2.2 : 3.4);
        this.fieldFollowStrength = reducedMotion ? 0.2 : (isMobile ? 0.28 : 0.48);
        this.ambientShiftRangeX = isMobile ? 14 : 26;
        this.ambientShiftRangeY = isMobile ? 10 : 18;
        this.idleWaveAmplitudeA = reducedMotion ? 4.5 : (isMobile ? 7.5 : 12);
        this.idleWaveAmplitudeB = reducedMotion ? 2.4 : (isMobile ? 4.4 : 8.2);
        this.idleSwirlAmplitude = reducedMotion ? 2.6 : (isMobile ? 5.6 : 9.2);
        this.breatheAmplitude = reducedMotion ? 0.012 : (isMobile ? 0.026 : 0.042);
    };

    AntigravityHero.prototype.reseedParticles = function reseedParticles() {
        var burstCount = Math.min(this.burstCount, this.particles.length);
        var totalCount = Math.min(this.activeCount, this.particles.length);
        var index;

        for (index = 0; index < burstCount; index += 1) {
            this.particles[index].resetBurst(this, index / Math.max(1, burstCount - 1));
        }
        for (index = burstCount; index < totalCount; index += 1) {
            this.particles[index].resetDust(this, (index - burstCount) / Math.max(1, this.dustCount));
        }
        for (index = totalCount; index < this.particles.length; index += 1) {
            this.particles[index].deactivate();
        }
        for (index = 0; index < this.maxRipples; index += 1) {
            this.ripples[index].active = false;
        }

        this.pointerX = this.burstCenterX;
        this.pointerY = this.burstCenterY;
        this.pointerTargetX = this.burstCenterX;
        this.pointerTargetY = this.burstCenterY;
        this.pointerVelocityX = 0;
        this.pointerVelocityY = 0;
        this.pointerStrength = 0;
        this.fieldShiftX = 0;
        this.fieldShiftY = 0;
        this.lastIdleRippleTime = this.time - 0.8;
        this.lastPointerRippleTime = this.time;
    };

    AntigravityHero.prototype.resize = function resize() {
        this.bounds = this.root.getBoundingClientRect();
        this.width = Math.max(1, Math.round(this.bounds.width));
        this.height = Math.max(1, Math.round(this.bounds.height));
        this.dpr = Math.min(1.75, window.devicePixelRatio || 1);

        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.context.lineCap = 'round';

        this.updateLayoutMetrics();
        this.applyResponsiveBudget();
        this.reseedParticles();
        this.draw();
    };

    AntigravityHero.prototype.updatePointer = function updatePointer(delta) {
        var previousX = this.pointerX;
        var previousY = this.pointerY;
        var easing = this.pointerActive ? 0.24 : 0.1;
        var ambientShiftX;
        var ambientShiftY;
        var pointerShiftX;
        var pointerShiftY;

        if (!this.pointerActive) {
            this.pointerTargetX = this.burstCenterX;
            this.pointerTargetY = this.burstCenterY;
        }

        this.pointerX += (this.pointerTargetX - this.pointerX) * easing * delta;
        this.pointerY += (this.pointerTargetY - this.pointerY) * easing * delta;
        this.pointerVelocityX = this.pointerX - previousX;
        this.pointerVelocityY = this.pointerY - previousY;

        if (this.pointerActive) {
            this.pointerStrength += (1 - this.pointerStrength) * 0.18 * delta;
        } else {
            this.pointerStrength += (0 - this.pointerStrength) * 0.12 * delta;
        }

        ambientShiftX = Math.cos(this.time * 0.46) * this.ambientShiftRangeX;
        ambientShiftY = Math.sin((this.time * 0.54) + 0.9) * this.ambientShiftRangeY;
        pointerShiftX = (this.pointerX - this.burstCenterX) * 0.34 * this.pointerStrength;
        pointerShiftY = (this.pointerY - this.burstCenterY) * 0.26 * this.pointerStrength;

        this.fieldShiftX += (((ambientShiftX + pointerShiftX) - this.fieldShiftX) * 0.09 * delta);
        this.fieldShiftY += (((ambientShiftY + pointerShiftY) - this.fieldShiftY) * 0.09 * delta);

        if (this.pointerActive) {
            var pointerSpeed = Math.sqrt((this.pointerVelocityX * this.pointerVelocityX) + (this.pointerVelocityY * this.pointerVelocityY));
            if (pointerSpeed > 0.3 && (this.time - this.lastPointerRippleTime) > 0.09) {
                this.emitRipple(
                    this.pointerX,
                    this.pointerY,
                    clamp(pointerSpeed * 10, 5.5, 12.5),
                    1.15,
                    130,
                    34,
                    0.08
                );
                this.lastPointerRippleTime = this.time;
            }
        } else if ((this.time - this.lastIdleRippleTime) > 1.28) {
            this.emitRipple(
                this.burstCenterX + (Math.cos(this.time * 0.8) * this.burstRadiusX * 0.08),
                this.burstCenterY + (Math.sin(this.time * 0.66) * this.burstRadiusY * 0.08),
                7.2,
                1.8,
                120,
                48,
                0.05
            );
            this.lastIdleRippleTime = this.time;
        }
    };

    AntigravityHero.prototype.updateRipples = function updateRipples() {
        var index;
        for (index = 0; index < this.maxRipples; index += 1) {
            this.ripples[index].update(this.time);
        }
    };

    AntigravityHero.prototype.update = function update(delta) {
        var index;
        this.time += delta / 60;
        this.updatePointer(delta);
        this.updateRipples();
        for (index = 0; index < this.activeCount; index += 1) {
            this.particles[index].update(this, delta);
        }
    };

    AntigravityHero.prototype.draw = function draw() {
        var index;
        this.context.clearRect(0, 0, this.width, this.height);
        this.context.save();
        this.context.globalCompositeOperation = 'lighter';
        for (index = 0; index < this.activeCount; index += 1) {
            this.particles[index].draw(this.context);
        }
        this.context.restore();
    };

    AntigravityHero.prototype.handleAnimationFrame = function handleAnimationFrame(timestamp) {
        if (!this.isRunning) {
            return;
        }

        if (!this.lastTime) {
            this.lastTime = timestamp;
        }

        var delta = clamp((timestamp - this.lastTime) / 16.6667, 0.65, 1.8);
        this.lastTime = timestamp;

        this.update(delta);
        this.draw();
        this.animationFrame = window.requestAnimationFrame(this.handleAnimationFrame);
    };

    AntigravityHero.prototype.start = function start() {
        if (this.isRunning || document.hidden || !this.isVisible) {
            return;
        }
        this.isRunning = true;
        this.lastTime = 0;
        this.animationFrame = window.requestAnimationFrame(this.handleAnimationFrame);
    };

    AntigravityHero.prototype.stop = function stop() {
        this.isRunning = false;
        if (this.animationFrame) {
            window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = 0;
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        var hero = document.querySelector('.hero');
        if (hero) {
            window.axisAntigravityHero = new AntigravityHero(hero);
        }
    });
}());
