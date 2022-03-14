const express = require('express')
const path = require('path')
const process = require('process')

const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

// Server config
const PORT = process.env.port || 8000
const HOST = process.env.host || 'localhost'
const ENV = app.get('env')

// App config
const DEBUG = true

const lobbyNamespace = io.of('/lobby')
const worldNamespace = io.of('/world')

let clients = {}
let worlds = {
    "w0": {
        size: 12,
        players: {
            "p0": {
                bot: true,
                position: {
                    x: 2,
                    y: 2
                }
            },
            "p1": {
                bot: true,
                position: {
                    x: 8,
                    y: 8
                }
            }
        }
    }
}

app.set('view engine', 'pug')
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.redirect('lobby')
})

app.get('/lobby', (req, res) => {
    res.render('lobby', {
        title: 'Mars Rover Lobby',
        worlds: Object.keys(worlds).map(function(key) {
            return {
                name: key,
                size: worlds[key].size,
                playerCount: Object.keys(worlds[key].players).length
            }
        })
    })
})

// Create world
app.post('/world', (req, res, next) => {
    // Generate new world name
    const worldName = `w${Object.keys(worlds).length}`

    // Throw error if world already exists
    if (worlds[worldName]) {
        const error = new Error(`World Exists - ${worldName}`)
        next(error)
        return
    }

    // Instantiate world with no players
    worlds[worldName] = {
        size: Math.floor(Math.random() * (15 - 5)) + 5,
        players: {}
    }
    if (DEBUG) console.log(`World ${worldName} created`)

    res.json({
        name: worldName
    })
})

// Open world
app.get('/world/:name', (req, res, next) => {
    // Get world name from URL
    const worldName = req.params.name

    // Throw error if world doesn't exist
    if (!worlds[worldName]) {
        const error = new Error(`World Not Found - ${worldName}`)
        next(error)
        return
    }

    const playerName = spawnPlayer(worldName, false)

    res.render('world', {
        title: `Mars Rover World (${worldName})`,
        worldName: worldName,
        playerName: playerName,
        worldState: worlds[worldName]
    })
})

// 404 handler
app.use((req, res, next) => {
    const error = new Error(`Page Not Found - ${req.originalUrl}`)
    res.status(404)
    next(error)
})

// Error handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode
    res.status(statusCode)
    res.render('error', {
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    })
})

worldNamespace.on('connection', (socket) => {
    if (DEBUG) console.log(`Client ${socket.id} connected`)
    clients[socket.id] = socket

    socket.on('world-join', (worldName, playerName) => {
        // Gaurd against nulls
        if (!worlds[worldName]) return
        if (!worlds[worldName].players) return

        socket.join(worldName)
        socket.worldName = worldName
        socket.playerName = playerName
        if (DEBUG) console.log(`Player ${playerName} joined ${worldName}`)

        worldNamespace.to(worldName).emit('world-update', worlds[worldName])
        lobbyNamespace.emit('world-update')
    })

    socket.on('player-move', (direction) => {
        // Gaurd against nulls
        if (!worlds[socket.worldName]) return
        if (!worlds[socket.worldName].players) return
        if (!worlds[socket.worldName].players[socket.playerName]) return

        // Compute position difference
        let dx = 0, dy = 0
        if (direction === '') {}
        else if (direction === 'up') dy--
        else if (direction === 'down') dy++
        else if (direction === 'left') dx--
        else if (direction === 'right') dx++
        if (DEBUG) console.log(`Player ${socket.playerName} moved ${direction} in ${socket.worldName}`)

        movePlayer(socket.worldName, socket.playerName, dx, dy)
    })

    socket.on('bot-spawn', () => {
        spawnPlayer(socket.worldName, true)
        worldNamespace.to(socket.worldName).emit('world-update', worlds[socket.worldName])
    })

    socket.on('disconnect', () => {
        if (DEBUG) console.log(`Client ${socket.id} disconnected`)
        delete clients[socket.id]

        // Gaurd against nulls
        if (!socket.worldName) return
        if (!worlds[socket.worldName]) return
        if (!worlds[socket.worldName].players) return
        if (!worlds[socket.worldName].players[socket.playerName]) return

        // Remove player from world
        delete worlds[socket.worldName].players[socket.playerName]
        if (DEBUG) console.log(`Player ${socket.playerName} left ${socket.worldName}`)

        // Delete world if no players exist
        if (Object.keys(worlds[socket.worldName].players).length == 0) {
            if (DEBUG) console.log(`World ${socket.worldName} deleted`)
            delete worlds[socket.worldName]
            lobbyNamespace.emit('world-update')
            return
        }

        worldNamespace.to(socket.worldName).emit('world-update', worlds[socket.worldName])
    })
})

server.listen(PORT, HOST, () => {
    console.log(`${ENV.charAt(0).toUpperCase() + ENV.substring(1)} app listening at http://${server.address().address}:${server.address().port}`)
})

function spawnPlayer(worldName, bot) {
    // Gaurd against nulls
    if (!worlds[worldName]) return
    if (!worlds[worldName].players) return

    // Get new player name
    const playerName = `p${Object.keys(worlds[worldName].players).length}`
    // Instantiate player in world
    worlds[worldName].players[playerName] = {
        bot,
        position: {
            x: Math.floor(Math.random() * ((worlds[worldName].size - 1) - 1)) + 1,
            y: Math.floor(Math.random() * ((worlds[worldName].size - 1) - 1)) + 1
        }
    }

    return playerName
}

function movePlayer(worldName, playerName, dx, dy) {
    // Gaurd against nulls
    if (!worlds[worldName]) return
    if (!worlds[worldName].players) return
    if (!worlds[worldName].players[playerName]) return
    if (dx == 0 && dy == 0) return // Doesn't move

    // Compute new position
    let x = worlds[worldName].players[playerName].position.x
    let y = worlds[worldName].players[playerName].position.y
    x += dx
    y += dy
    x = Math.max(1, Math.min(x, (worlds[worldName].size - 1) - 1))
    y = Math.max(1, Math.min(y, (worlds[worldName].size - 1) - 1))

    // Update player position
    var updatePosition = true
    for (const [key, value] of Object.entries(worlds[worldName].players)) {
        // Ensure we don't overlap with another player
        if (x == value.position.x && y == value.position.y) updatePosition = false
    }
    if (updatePosition) {
        worlds[worldName].players[playerName].position.x = x
        worlds[worldName].players[playerName].position.y = y
    }

    worldNamespace.to(worldName).emit('world-update', worlds[worldName])
}

const botUpdateInterval = setInterval(() => {
    for (const [worldName, world] of Object.entries(worlds)) {
        for (const [playerName, player] of Object.entries(world.players)) {
            if (player.bot && Math.random() * 100 < 50) {
                const direction = (Math.floor(Math.random() * (3 - 0 + 1) + 0)).toString(2)
                const dx = parseInt(direction[0] * 2 - 1), dy = parseInt((direction[1] || 0) * 2 - 1)
                movePlayer(worldName, playerName, dx, dy)
            }
        }
    }
}, 1000);

// Ideas:
// TODO: Try functional style, not OOP (and maybe Webpack)
// TODO: Use Selenium to generate a screenshot of the game automatically (before pushing)
// FEATURE: Chat system
