const express = require('express')
const path = require('path')
const process = require('process')

const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const PORT = process.env.port || 8000
const HOST = process.env.host || 'localhost'
const ENV = app.get('env')

const DIRECTIONS = {
    STILL: 0,
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4
};

const WORLD_SIZE = 12;

let clients = {}
let worlds = {
    "world_0": {
        players: {
            "test_player_0": {
                position: {
                    x: 2,
                    y: 2
                }
            },
            "test_player_1": {
                position: {
                    x: 8,
                    y: 8
                }
            },
        }
    }
}

app.set('view engine', 'pug')
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.redirect('lobby')
})

app.get('/lobby', (req, res) => {
    res.render('lobby', { title: 'Mars Rover Lobby', worlds: Object.keys(worlds) })
})

app.post('/world', (req, res) => {
    const id = `world_${Object.keys(worlds).length}`
    worlds[id] = { players: {} }
    console.log(`World ${id} created`)
    res.json({ name: id })
})

app.get('/world/:id', (req, res) => {
    const id = req.params.id;
    res.render('world', { title: `Mars Rover World (${id})`, id: id })
})

io.on('connection', (socket) => {
    console.log(`Client ${socket.id} connected`)
    clients[socket.id] = socket

    socket.on('world-joined', (name) => {
        socket.join(name)
        // TODO: fix crash somewhere here
        worlds[name].players[socket.id] = {
            position: {
                x: (Math.floor(Math.random() * ((WORLD_SIZE - 1) - 1)) + 1),
                y: (Math.floor(Math.random() * ((WORLD_SIZE - 1) - 1)) + 1)
            }
        }
        socket.world = name
        io.in(name).emit('world-updated', worlds[name])
    })

    socket.on('player-moved', (name, direction) => {
        if (direction == DIRECTIONS.STILL) {
        } else if (direction == DIRECTIONS.UP) {
            worlds[socket.world].players[name].position.y--
        } else if (direction == DIRECTIONS.DOWN) {
            worlds[socket.world].players[name].position.y++
        } else if (direction == DIRECTIONS.LEFT) {
            worlds[socket.world].players[name].position.x--
        } else if (direction == DIRECTIONS.RIGHT) {
            worlds[socket.world].players[name].position.x++
        }
        if (worlds[socket.world].players[name].position.y < 1) {
            worlds[socket.world].players[name].position.y = 1;
        }
        if (worlds[socket.world].players[name].position.y > (WORLD_SIZE - 1) - 1) {
            worlds[socket.world].players[name].position.y = (WORLD_SIZE - 1) - 1;
        }
        if (worlds[socket.world].players[name].position.x < 1) {
            worlds[socket.world].players[name].position.x = 1;
        }
        if (worlds[socket.world].players[name].position.x > (WORLD_SIZE - 1) - 1) {
            worlds[socket.world].players[name].position.x = (WORLD_SIZE - 1) - 1;
        }
        io.in(socket.world).emit('world-updated', worlds[socket.world])
    })

    socket.on('world-left', () => {})

    socket.on('disconnect', () => {
        console.log(`Client ${socket.id} disconnected`)
        delete clients[socket.id]

        // Make extra sure we can delete
        if (socket.world && worlds[socket.world]) {
            if (socket.id && worlds[socket.world].players[socket.id]) {
                delete worlds[socket.world].players[socket.id]
                if (Object.keys(worlds[socket.world].players).length == 0) {
                    console.log(`World ${socket.world} deleted`)
                    delete worlds[socket.world]
                } else { // Update only if there are players in the world still
                    io.in(socket.world).emit("'world-updated'", worlds[socket.world])
                }
            }
        }
    })
})

server.listen(PORT, HOST, () => {
    console.log(`${ENV.charAt(0).toUpperCase() + ENV.substring(1)} app listening at http://${server.address().address}:${server.address().port}`)
})