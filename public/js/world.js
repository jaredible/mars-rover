const socket = io();
const worldName = document.getElementById("data").getAttribute("world");
const playerName = document.getElementById("data").getAttribute("player");

socket.on("world-update", function(world) {
    drawWorld(world);
});

function drawWorld(world) {
    if (!world) return;

    const canvas = document.getElementById("screen");
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth, h = canvas.clientHeight;

    // Clear screen
    ctx.clearRect(0, 0, w, h);
    
    // Draw background
    const tile = document.getElementById("tile");
    for (var y = 0; y < world.size; y++) {
        for (var x = 0; x < world.size; x++) {
            const xo = x * (w / world.size), yo = y * (h / world.size);
            const ww = w / world.size, hh = h / world.size;
            ctx.drawImage(tile, xo, yo, ww, hh);
        }
    }

    // Draw world border
    for (var y = 0; y < world.size; y++) {
        for (var x = 0; x < world.size; x++) {
            if (x == 0 || y == 0 || x == world.size - 1 || y ==  world.size - 1) {
                const xo = x * (w / world.size), yo = y * (h / world.size);
                const ww = w / world.size, hh = h / world.size;
                ctx.fillStyle = "rgba(225, 0, 0, 0.25)";
                ctx.fillRect(xo, yo, ww, hh);
            }
        }
    }

    drawPlayers(canvas, world);
}

function drawPlayers(canvas, world) {
    if (!canvas) return;
    if (!world.players) return;
    
    for (const [key, value] of Object.entries(world.players)) {
        drawPlayer(canvas, world, {
            name: key,
            ...value
        });
    }
}

function drawPlayer(canvas, world, player) {
    if (!canvas) return;
    if (!world) return;
    if (!player) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth, h = canvas.clientHeight;

    const x = player.position.x, y = player.position.y;
    const xo = x * (w / world.size), yo = y * (h / world.size);
    const ww = w / world.size, hh = h / world.size;

    // Draw transparent box behind player
    ctx.fillStyle = "rgba(225, 225, 225, 0.5)";
    ctx.fillRect(xo, yo, ww, hh);

    // Draw player
    const image = document.getElementById("player");
    ctx.drawImage(image, xo, yo, ww, hh);

    // Draw player name
    ctx.font = "25px serif";
    ctx.fillStyle = "yellow";
    ctx.textAlign = "center";
    ctx.fillText(player.name, xo + ww / 2, yo - world.size);
}

function movePlayer(direction) {
    socket.emit("player-move", direction);
}

window.onload = function() {
    drawWorld();
    socket.emit("world-join", worldName, playerName);
};
