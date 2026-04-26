/**
 * Axis Lua - 顶级游戏辅助菜单官网
 * 主JavaScript文件
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有功能
    initParticles();
    initPageLoader();
    initNavbar();
    initMobileMenu();
    initSmoothScroll();
    initScrollAnimations();
    initTabs();
    initBackToTop();
});

/**
 * 几何粒子背景效果 - 灰浅粉色，随鼠标移动激活
 */
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouseX = 0;
    let mouseY = 0;
    let animationId = null;

    // 灰浅粉色系配色
    const colors = [
        'rgba(200, 180, 200, ',  // 浅灰粉
        'rgba(180, 160, 180, ',  // 灰粉
        'rgba(220, 200, 220, ',  // 浅粉
        'rgba(160, 140, 160, ',  // 深灰粉
        'rgba(190, 170, 190, ',  // 中灰粉
    ];

    // 设置画布尺寸
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 监听鼠标移动
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // 粒子类
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2.5 + 0.5;
            this.baseSpeedX = (Math.random() - 0.5) * 0.3;
            this.baseSpeedY = (Math.random() - 0.5) * 0.3;
            this.speedX = this.baseSpeedX;
            this.speedY = this.baseSpeedY;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.baseOpacity = Math.random() * 0.3 + 0.1;
            this.opacity = this.baseOpacity;
            this.shape = Math.floor(Math.random() * 3);
            this.activated = false;
        }

        update() {
            // 计算与鼠标的距离
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 鼠标激活效果 - 200px范围内（减小范围）
            if (distance < 200) {
                this.activated = true;
                const activationStrength = (200 - distance) / 200;

                // 粒子被鼠标轻微吸引（减小吸附力度）
                this.speedX += dx * 0.0002 * activationStrength;
                this.speedY += dy * 0.0002 * activationStrength;

                // 轻微增加亮度和大小
                this.opacity = Math.min(0.6, this.baseOpacity + activationStrength * 0.3);
                this.currentSize = this.size * (1 + activationStrength * 0.2);
            } else {
                this.activated = false;
                // 恢复基础状态
                this.speedX += (this.baseSpeedX - this.speedX) * 0.03;
                this.speedY += (this.baseSpeedY - this.speedY) * 0.03;
                this.opacity += (this.baseOpacity - this.opacity) * 0.03;
                this.currentSize = this.size;
            }

            // 限制速度（降低最大速度）
            const maxSpeed = this.activated ? 1.5 : 0.8;
            this.speedX = Math.max(-maxSpeed, Math.min(maxSpeed, this.speedX));
            this.speedY = Math.max(-maxSpeed, Math.min(maxSpeed, this.speedY));

            // 移动
            this.x += this.speedX;
            this.y += this.speedY;

            // 边界检查 - 循环边界（从一边出去，从另一边进来）
            if (this.x < -50) {
                this.x = canvas.width + 50;
            } else if (this.x > canvas.width + 50) {
                this.x = -50;
            }

            if (this.y < -50) {
                this.y = canvas.height + 50;
            } else if (this.y > canvas.height + 50) {
                this.y = -50;
            }
        }

        draw() {
            const currentColor = this.color + this.opacity + ')';
            ctx.fillStyle = currentColor;
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 1;

            const drawSize = this.currentSize || this.size;

            ctx.beginPath();

            switch(this.shape) {
                case 0: // 圆形
                    ctx.arc(this.x, this.y, drawSize, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 1: // 方形
                    ctx.rect(this.x - drawSize, this.y - drawSize, drawSize * 2, drawSize * 2);
                    ctx.stroke();
                    break;
                case 2: // 三角形
                    ctx.moveTo(this.x, this.y - drawSize);
                    ctx.lineTo(this.x + drawSize, this.y + drawSize);
                    ctx.lineTo(this.x - drawSize, this.y + drawSize);
                    ctx.closePath();
                    ctx.stroke();
                    break;
            }

            // 激活时添加发光效果
            if (this.activated && this.opacity > 0.4) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(200, 180, 200, 0.5)';
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    // 创建粒子
    function createParticles() {
        particles = [];
        const particleCount = Math.min(150, Math.floor((canvas.width * canvas.height) / 8000));

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    // 绘制连线
    function drawConnections() {
        const maxDistance = 180;

        for (let i = 0; i < particles.length; i++) {
            // 与鼠标的连线
            const dx = mouseX - particles[i].x;
            const dy = mouseY - particles[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 250) {
                const opacity = (1 - distance / 250) * 0.4;
                ctx.strokeStyle = `rgba(200, 180, 200, ${opacity})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouseX, mouseY);
                ctx.stroke();
            }

            // 粒子之间的连线
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < maxDistance) {
                    const opacity = (1 - distance / maxDistance) * 0.15;
                    ctx.strokeStyle = `rgba(180, 160, 180, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    // 绘制鼠标周围的激活光环
    function drawMouseAura() {
        const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 200);
        gradient.addColorStop(0, 'rgba(200, 180, 200, 0.05)');
        gradient.addColorStop(0.5, 'rgba(180, 160, 180, 0.02)');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 200, 0, Math.PI * 2);
        ctx.fill();
    }

    // 动画循环
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 绘制鼠标光环
        drawMouseAura();

        // 绘制连线
        drawConnections();

        // 更新和绘制粒子
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        animationId = requestAnimationFrame(animate);
    }

    // 初始化
    createParticles();
    animate();

    // 页面不可见时暂停动画以节省资源
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationId);
        } else {
            animate();
        }
    });
}

/**
 * 页面加载动画
 */
function initPageLoader() {
    const loader = document.querySelector('.page-loader');

    if (!loader) return;

    // 模拟加载完成
    setTimeout(() => {
        loader.classList.add('hidden');

        // 触发初始动画
        setTimeout(() => {
            animateHeroElements();
        }, 300);
    }, 2000);
}

/**
 * Hero区域元素动画
 */
function animateHeroElements() {
    const heroElements = document.querySelectorAll('.hero [data-aos]');

    heroElements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('aos-animate');
        }, index * 100);
    });
}

/**
 * 导航栏滚动效果
 */
function initNavbar() {
    const navbar = document.getElementById('navbar');

    if (!navbar) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // 添加/移除滚动样式
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // 隐藏/显示导航栏（向下滚动隐藏，向上滚动显示）
        if (currentScroll > lastScroll && currentScroll > 100) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }

        lastScroll = currentScroll;
    });

    // 高亮当前导航项
    highlightNavOnScroll();
}

/**
 * 根据滚动位置高亮导航项
 */
function highlightNavOnScroll() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

/**
 * 移动端菜单
 */
function initMobileMenu() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');

    if (!mobileToggle || !navMenu) return;

    mobileToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');

        // 动画汉堡菜单
        const spans = mobileToggle.querySelectorAll('span');
        if (navMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });

    // 点击导航链接后关闭菜单
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            const spans = mobileToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        });
    });
}

/**
 * 平滑滚动
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));

            if (target) {
                const offsetTop = target.offsetTop - 80; // 减去导航栏高度

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * 滚动触发动画
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('[data-aos]:not(.hero [data-aos])');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 添加延迟
                const delay = entry.target.dataset.aosDelay || 0;

                setTimeout(() => {
                    entry.target.classList.add('aos-animate');
                }, delay);

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
}

/**
 * 功能展示标签页
 */
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            // 移除所有活动状态
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // 添加活动状态
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * 回到顶部按钮
 */
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');

    if (!backToTop) return;

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * 卡片3D倾斜效果
 */
document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card, .pricing-card-horizontal').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
    });
});
