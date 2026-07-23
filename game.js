const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Oyun Durumu
let gameState = "menu"; // 'menu', 'shop', 'playing', 'gameover'
let score = 0; 
let totalPassedObstacles = 0; 
let currentLevel = 1; 
let money = 500; // Test için başlangıç parası

// Oyuncu Seçimleri (Envanter)
let currentSkin = "tekne"; 
let currentTrail = "yok"; 

// Satın Alınanlar
let unlockedSkins = { tekne: true, roket: false, araba: false, denizalti: false, balina: false };
let unlockedTrails = { yok: true, mavi: false, kirmizi: false, yesil: false, gokkusagi: false };

let boat = {
    x: 100,
    y: 250,
    width: 45,
    height: 30,
    speed: 5
};

// --- GÖRSELLERİ TANITIYORUZ (Assets Klasöründen Çeker) ---
const skinImages = {};

function loadImages() {
    const skinsToLoad = {
        roket: "assets/roket.png",
        araba: "assets/araba.png",
        denizalti: "assets/denizalti.png",
        balina: "assets/balina.png"
    };

    for (let key in skinsToLoad) {
        skinImages[key] = new Image();
        skinImages[key].src = skinsToLoad[key];
    }
}
loadImages();

// Arkadaki İzi Saklamak İçin Dizi
let trailParticles = [];

let obstacles = [];
let obstacleSpeed = 3.5;
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

// Menü Geçişleri
function startGameFromMenu() {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("shop-screen").style.display = "none";
    document.getElementById("game-container").style.display = "block";
    resetGame();
}

function openShop() {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("shop-screen").style.display = "flex";
    updateShopUI(); 
}

function closeShop() {
    document.getElementById("shop-screen").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
}

function returnToMainMenu() {
    gameState = "menu";
    document.getElementById("game-container").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
}

// Mağaza Arayüzünü Güncelleme
function updateShopUI() {
    document.getElementById("shop-gold").innerText = money;

    const skins = [
        { id: 'tekne', name: 'Tekne (Varsayılan)', price: 0 },
        { id: 'roket', name: '🚀 Roket', price: 50 },
        { id: 'araba', name: '🏎️ Araba', price: 80 },
        { id: 'denizalti', name: '🛥️ Denizaltı', price: 120 },
        { id: 'balina', name: '🐋 Balina', price: 200 }
    ];

    skins.forEach(s => {
        let btn = document.getElementById(`btn-skin-${s.id}`);
        if (btn) {
            btn.className = "shop-item-btn";
            if (currentSkin === s.id) {
                btn.innerText = `${s.name} (Seçili)`;
                btn.classList.add("active-item");
            } else if (unlockedSkins[s.id]) {
                btn.innerText = `${s.name} (Alındı)`;
            } else {
                btn.innerText = `${s.name} (${s.price} Altın)`;
            }
        }
    });

    const trails = [
        { id: 'yok', name: 'İz Yok', price: 0 },
        { id: 'mavi', name: '🔵 Mavi İz', price: 20 },
        { id: 'kirmizi', name: '🔴 Kırmızı İz', price: 30 },
        { id: 'yesil', name: '🟢 Yeşil İz', price: 40 },
        { id: 'gokkusagi', name: '🌈 Gökkuşağı İzi', price: 150 }
    ];

    trails.forEach(t => {
        let btn = document.getElementById(`btn-trail-${t.id}`);
        if (btn) {
            btn.className = "shop-item-btn";
            if (currentTrail === t.id) {
                btn.innerText = `${t.name} (Seçili)`;
                btn.classList.add("active-item");
            } else if (unlockedTrails[t.id]) {
                btn.innerText = `${t.name} (Alındı)`;
            } else {
                btn.innerText = `${t.name} (${t.price} Altın)`;
            }
        }
    });
}

function selectSkin(skinName) {
    if (unlockedSkins[skinName]) {
        currentSkin = skinName;
        updateShopUI();
    }
}

function buyOrSelectSkin(skinName, price) {
    if (unlockedSkins[skinName]) {
        currentSkin = skinName;
    } else {
        if (money >= price) {
            money -= price;
            unlockedSkins[skinName] = true;
            currentSkin = skinName;
            alert("Skin başarıyla satın alındı!");
        } else {
            alert("Yeterli altının yok!");
        }
    }
    updateShopUI();
}

function selectTrail(trailName) {
    if (unlockedTrails[trailName]) {
        currentTrail = trailName;
        updateShopUI();
    }
}

function buyOrSelectTrail(trailName, price) {
    if (unlockedTrails[trailName]) {
        currentTrail = trailName;
    } else {
        if (money >= price) {
            money -= price;
            unlockedTrails[trailName] = true;
            currentTrail = trailName;
            alert("İz başarıyla satın alındı!");
        } else {
            alert("Yeterli altının yok!");
        }
    }
    updateShopUI();
}

function updateUI() {
    document.getElementById("cargo-val").innerText = money;
    document.getElementById("fuel-val").innerText = score;
    document.getElementById("status-val").innerText = `Sv. ${currentLevel} (${totalPassedObstacles % 10}/10)`;
}

function resetGame() {
    boat.y = canvas.height / 2;
    obstacles = [];
    coins = [];
    trailParticles = [];
    score = 0;
    totalPassedObstacles = 0;
    currentLevel = 1;
    obstacleSpeed = 3.5;
    obstacleSpawnTimer = 0;
    gameState = "playing";
    
    document.getElementById("mobile-controls").style.display = "flex";
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
        
        document.getElementById("mobile-controls").style.display = "flex";
        document.getElementById("gameover-screen").style.display = "none";
    } else {
        alert("Yeniden doğmak için en az 15 altının olmalı!");
    }
}

function spawnObstacle() {
    const gapSize = Math.max(120, 160 - (currentLevel * 5)); 
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

    obstacleSpeed = 3.5 + ((currentLevel - 1) * 0.6) + (totalPassedObstacles * 0.01);

    if (keys["w"] || keys["arrowup"] || movingUp) boat.y -= boat.speed;
    if (keys["s"] || keys["arrowdown"] || movingDown) boat.y += boat.speed;

    if (boat.y < boat.height / 2) boat.y = boat.height / 2;
    if (boat.y > canvas.height - boat.height / 2) boat.y = canvas.height - boat.height / 2;

    // İz Parçacığı Oluşturma
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
    let spawnLimit = Math.max(60, 90 - (currentLevel * 5));
    if (obstacleSpawnTimer > spawnLimit) {
        spawnObstacle();
        obstacleSpawnTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= obstacleSpeed;

        if (
            boat.x - boat.width/2 < obs.x + obs.width &&
            boat.x + boat.width/2 > obs.x &&
            boat.y - boat.height/2 < obs.y + obs.height &&
            boat.y + boat.height/2 > obs.y
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
    let currentTheme = levelThemes[themeKey];

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

    // --- GERÇEK GÖRSELLERİN ÇİZİMİ (DRAW IMAGE) ---
    ctx.save();
    ctx.translate(boat.x, boat.y);

    if (currentSkin === "tekne") {
        ctx.fillStyle = "#ff5722";
        ctx.fillRect(-boat.width / 2, -boat.height / 2, boat.width, boat.height);
    } else {
        // Eğer roket, araba, denizaltı veya balina seçildiyse ilgili PNG resmi çizilir
        let img = skinImages[currentSkin];
        if (img && img.complete) {
            ctx.drawImage(img, -boat.width, -boat.height / 1.5, boat.width * 2, boat.height * 1.5);
        }
    }

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();