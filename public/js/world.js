const socket = io();
const id = document.getElementById("id").getAttribute("data");
let player = '';

socket.on("world-updated", function(world) {
    console.log(world);
    players = world.players;
    drawWorld();
});

const DIRECTIONS = {
    STILL: 0,
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4
};

let players = {};

function drawPlayer(player) {
    const canvas = document.getElementById("world");
    const ctx = canvas.getContext("2d");
    const image = document.getElementById("player");
    const W = canvas.clientWidth, H = canvas.clientHeight, N = 12;

    const name = player.name;
    const x = player.position.x, y = player.position.y;
    const xo = x * (W / N), yo = y * (H / N);
    const ww = W / N, hh = H / N;
    ctx.fillStyle = 'rgba(225, 225, 225, 0.5)';
    ctx.fillRect(xo, yo, ww, hh);
    ctx.drawImage(image, xo, yo, ww, hh);
    ctx.textAlign = "center";
    ctx.font = '25px serif';
    ctx.fillStyle = 'yellow';
    ctx.fillText(name, xo + ww / 2, yo - N);
}

function drawPlayers() {
    for (const [key, value] of Object.entries(players)) {
        drawPlayer({
            name: key,
            ...value
        });
    }
}

function drawWorldBorder() {
    const canvas = document.getElementById("world");
    const ctx = canvas.getContext("2d");
    const W = canvas.clientWidth, H = canvas.clientHeight, N = 12;

    for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
            if (x == 0 || y == 0 || x == N - 1 || y ==  N - 1) {
                const xo = x * (W / N), yo = y * (H / N);
                const ww = W / N, hh = H / N;
                ctx.fillStyle = 'rgba(225, 0, 0, 0.25)';
                ctx.fillRect(xo, yo, ww, hh);
            }
        }
    }
}

function drawWorld() {
    const canvas = document.getElementById("world");
    const ctx = canvas.getContext("2d");
    
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    
    const N = 12;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    const tile = document.getElementById("tile");
    for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
            ctx.drawImage(tile, x * (w / N), y * (h / N), w / N, h / N);
        }
    }

    drawWorldBorder();

    drawPlayers();
}

function movePlayer(direction) {
    console.log(direction);
    socket.emit("player-moved", socket.id, direction);
}

window.onload = function() {
    drawWorld();

    socket.emit("world-joined", id);
};
