const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Oyun Durumu
let gameState = "menu"; // 'menu', 'shop', 'playing', 'gameover'
let score = 0; 
let totalPassedObstacles = 0; 
let currentLevel = 1; 
let money = 500; 

// Oyuncu Seçimleri (Envanter)
let currentSkin = "tekne"; 
let currentTrail = "yok"; 

// Satın Alınanlar
let unlockedSkins = { tekne: true, roket: false, araba: false, denizalti: false, balina: false };
let unlockedTrails = { yok: true, mavi: false, kirmizi: false, yesil: false, gokkusagi: false };

let boat = {
    x: 100,
    y: 250,
    width: 30,
    height: 18,
    speed: 7
};

let trailParticles = [];
let obstacles = [];
let obstacleSpeed = 4.5;
let obstacleSpawnTimer = 0;
let coins = [];

const levelThemes = {
    1: { bg: "#0b1d3a", wall: "#455a64" },
    2: { bg: "#1a0b2e", wall: "#7b1fa2" },
    3: { bg: "#2e0b0b", wall: "#c62828" },
    4: { bg: "#0b2e1a", wall: "#2e7d32" },
    5: { bg: "#2e290b", wall: "#f57c00" }
};

let keys = {};
window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

let movingUp = false;
let movingDown = false;

// Mobil / Cihaz Tespiti
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 800;

// Emniyet: Telefondan parmak tamamen kaldırıldığında hareketin takılı kalmasını önler
window.addEventListener("touchend", () => {
    movingUp = false;
    movingDown = false;
});
window.addEventListener("touchcancel", () => {
    movingUp = false;
    movingDown = false;
});

// Canvas Boyutunu Ayarla
function resizeCanvas() {
    if (document.fullscreenElement) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        canvas.width = 900;
        canvas.height = 500;
    }
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Tam Ekran Yapma Fonksiyonu
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            setTimeout(resizeCanvas, 100);
        }).catch(err => {
            console.log("Tam ekran hatası: ", err.message);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                setTimeout(resizeCanvas, 100);
            });
        }
    }
}

function startGameFromMenu() {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("game-container").style.display = "block";
    resizeCanvas();
    resetGame();
}

function returnToMainMenu() {
    gameState = "menu";
    document.getElementById("game-container").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
}

function updateUI() {
    document.getElementById("cargo-val").innerText = money;
    document.getElementById("fuel-val").innerText = score;
    document.getElementById("status-val").innerText = `Sv. ${currentLevel} (${totalPassedObstacles % 10}/10)`;
}

function resetGame() {
    resizeCanvas();
    boat.y = canvas.height / 2;
    obstacles = [];
    coins = [];
    trailParticles = [];
    score = 0;
    
    if (isMobile) {
        totalPassedObstacles = 40; 
        currentLevel = 5;
        obstacleSpeed = 6.5;
    } else {
        totalPassedObstacles = 0;
        currentLevel = 1;
        obstacleSpeed = 4.0;
    }

    obstacleSpawnTimer = 0;
    gameState = "playing";
    
    if (isMobile) {
        document.getElementById("mobile-controls").style.display = "flex";
    }
    document.getElementById("gameover-screen").style.display = "none";
}

function die() {
    gameState = "gameover";
    document.getElementById("mobile-controls").style.display = "none";
    document.getElementById("gameover-screen").style.display = "block";
    document.getElementById("final-score").innerText = score;
}

function respawn() {
    if (money >= 15) {
        money -= 15;
        boat.y = canvas.height / 2;
        obstacles = []; 
        coins = [];
        gameState = "playing";
        
        if (isMobile) {
            document.getElementById("mobile-controls").style.display = "flex";
        }
        document.getElementById("gameover-screen").style.display = "none";
    } else {
        alert("Yeniden doğmak için en az 15 altının olmalı!");
    }
}

function spawnObstacle() {
    const gapSize = Math.max(110, 150 - (currentLevel * 4)); 
    const minHeight = 40;
    const maxHeight = canvas.height - gapSize - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

    let obsX = canvas.width;

    obstacles.push({ x: obsX, y: 0, width: 35, height: topHeight, passed: false });
    obstacles.push({ x: obsX, y: topHeight + gapSize, width: 35, height: canvas.height - (topHeight + gapSize), passed: false });

    let coinChance = Math.min(0.8, 0.3 + (currentLevel * 0.1));
    if (Math.random() < coinChance) {
        coins.push({
            x: obsX + 10,
            y: topHeight + (gapSize / 2),
            radius: 12,
            collected: false
        });
    }
}

function update() {
    if (gameState !== "playing") return;

    let baseSpeed = isMobile ? 5.5 : 3.8;
    obstacleSpeed = baseSpeed + ((currentLevel - 1) * 0.6) + (totalPassedObstacles * 0.015);

    // Hareket Kontrolü (Klavye + Mobil Tuşlar Bas-Tut)
    if (keys["w"] || keys["arrowup"] || movingUp) boat.y -= boat.speed;
    if (keys["s"] || keys["arrowdown"] || movingDown) boat.y += boat.speed;

    if (boat.y < boat.height / 2) boat.y = boat.height / 2;
    if (boat.y > canvas.height - boat.height / 2) boat.y = canvas.height - boat.height / 2;

    if (currentTrail !== "yok") {
        let trailColor = "#ffffff";
        if (currentTrail === "mavi") trailColor = "#00bcd4";
        if (currentTrail === "kirmizi") trailColor = "#ff5252";
        if (currentTrail === "yesil") trailColor = "#4caf50";
        if (currentTrail === "gokkusagi") {
            let hue = (Date.now() / 5) % 360;
            trailColor = `hsl(${hue}, 100%, 50%)`;
        }

        trailParticles.push({
            x: boat.x - 15,
            y: boat.y,
            color: trailColor,
            size: 8,
            alpha: 1.0
        });
    }

    for (let i = trailParticles.length - 1; i >= 0; i--) {
        let p = trailParticles[i];
        p.x -= obstacleSpeed;
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
            trailParticles.splice(i, 1);
        }
    }

    obstacleSpawnTimer++;
    let spawnLimit = Math.max(45, 75 - (currentLevel * 3));
    if (obstacleSpawnTimer > spawnLimit) {
        spawnObstacle();
        obstacleSpawnTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= obstacleSpeed;

        if (
            boat.x < obs.x + obs.width &&
            boat.x + boat.width > obs.x &&
            boat.y < obs.y + obs.height &&
            boat.y + boat.height > obs.y
        ) {
            die();
        }

        if (!obs.passed && obs.x + obs.width < boat.x) {
            obs.passed = true;
            if (obs.y === 0) {
                totalPassedObstacles += 1;
                currentLevel = Math.floor(totalPassedObstacles / 10) + 1;
            }
        }

        if (obs.x + obs.width < 0) obstacles.splice(i, 1);
    }

    for (let i = coins.length - 1; i >= 0; i--) {
        let c = coins[i];
        if (!c.collected) {
            c.x -= obstacleSpeed;
            let dist = Math.hypot(boat.x - c.x, boat.y - c.y);
            if (dist < boat.width / 2 + c.radius) {
                c.collected = true;
                score += 1;
                money += 1;
            }
        }
        if (c.x < -20) coins.splice(i, 1);
    }

    updateUI();
}

function draw() {
    if (gameState === "menu") return;

    let themeKey = Math.min(currentLevel, 5);
    let currentTheme = levelThemes[themeKey] || levelThemes[5];

    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    trailParticles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`SEVİYE ${currentLevel}`, canvas.width / 2, canvas.height / 2 + 25);

    ctx.fillStyle = currentTheme.wall;
    obstacles.forEach(obs => ctx.fillRect(obs.x, obs.y, obs.width, obs.height));

    coins.forEach(c => {
        if (!c.collected) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
            ctx.fillStyle = "#ffeb3b";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#f57c00";
            ctx.stroke();
            ctx.closePath();
        }
    });

    ctx.save();
    ctx.translate(boat.x, boat.y);

    if (currentSkin === "tekne") {
        ctx.fillStyle = "#ff5722";
        ctx.fillRect(-boat.width / 2, -boat.height / 2, boat.width, boat.height);
    } else if (currentSkin === "roket") {
        ctx.fillStyle = "#e53935";
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-15, -12);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-15, 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffeb3b";
        ctx.fillRect(-22, -4, 6, 8);
    } else if (currentSkin === "araba") {
        ctx.fillStyle = "#1e88e5";
        ctx.fillRect(-18, -10, 36, 20);
        ctx.fillStyle = "#212121";
        ctx.fillRect(-12, -13, 8, 4);
        ctx.fillRect(4, -13, 8, 4);
        ctx.fillRect(-12, 9, 8, 4);
        ctx.fillRect(4, 9, 8, 4);
    } else if (currentSkin === "denizalti") {
        ctx.fillStyle = "#00acc1";
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#b2ebf2";
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0, Math.PI * 2);
        ctx.fill();
    } else if (currentSkin === "balina") {
        ctx.fillStyle = "#5c6bc0";
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(-28, -10);
        ctx.lineTo(-25, 0);
        ctx.lineTo(-28, 10);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();