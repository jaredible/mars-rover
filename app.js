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

let clients = {}
let worlds = {
    "w0": {
        size: 12,
        players: {
            "p0": {
                position: {
                    x: 2,
                    y: 2
                }
            },
            "p1": {
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

    // Get new player name
    const playerName = `p${Object.keys(worlds[worldName].players).length}`
    // Instantiate player in world
    worlds[worldName].players[playerName] = {
        position: {
            x: Math.floor(Math.random() * ((worlds[worldName].size - 1) - 1)) + 1,
            y: Math.floor(Math.random() * ((worlds[worldName].size - 1) - 1)) + 1
        }
    }
    console.log(playerName);

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

io.on('connection', (socket) => {
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

        io.in(worldName).emit('world-update', worlds[worldName])
    })

    socket.on('player-move', (direction) => {
        // Gaurd against nulls
        if (!socket.worldName) return
        if (!worlds[socket.worldName]) return
        if (!worlds[socket.worldName].players) return
        if (!worlds[socket.worldName].players[socket.playerName]) return

        console.log('HERE')

        // Compute position difference
        let dx = 0, dy = 0
        if (direction === '') {}
        else if (direction === 'up') dy--
        else if (direction === 'down') dy++
        else if (direction === 'left') dx--
        else if (direction === 'right') dx++
        if (DEBUG) console.log(`Player ${socket.playerName} moved ${direction} in ${socket.worldName}`)

        // Compute new position
        let x = worlds[socket.worldName].players[socket.playerName].position.x
        let y = worlds[socket.worldName].players[socket.playerName].position.y
        x += dx
        y += dy
        x = Math.max(1, Math.min(x, (worlds[socket.worldName].size - 1) - 1))
        y = Math.max(1, Math.min(y, (worlds[socket.worldName].size - 1) - 1))

        // Update player position
        var updatePosition = true
        for (const [key, value] of Object.entries(worlds[socket.worldName].players)) {
            // Ensure we don't overlap with another player
            if (x == value.position.x && y == value.position.y) updatePosition = false
        }
        if (updatePosition) {
            worlds[socket.worldName].players[socket.playerName].position.x = x
            worlds[socket.worldName].players[socket.playerName].position.y = y
        }

        io.in(socket.worldName).emit('world-update', worlds[socket.worldName])
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
            return
        }

        io.in(socket.worldName).emit('world-update', worlds[socket.worldName])
    })
})

server.listen(PORT, HOST, () => {
    console.log(`${ENV.charAt(0).toUpperCase() + ENV.substring(1)} app listening at http://${server.address().address}:${server.address().port}`)
})

// Ideas:
// TODO: Present error page upon going to non-existent world.
// TODO: Refreshing world page crashes app...
// FEATURE: Allow world to be created by typing custom world ID in URL? No matter if "/world" was hit.
// TODO: Try functional style, not OOP (and maybe Webpack)
// TODO: Use Selenium to generate a screenshot of the game automatically (before pushing)
// FEATURE: AI players (ie, bots)
// TODO: Live lobby updates
