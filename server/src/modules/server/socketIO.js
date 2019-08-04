import Helpers from '../../utils/helpers'

import prisma from './prisma'

import { createServer } from 'http'
import socketIO from 'socket.io'

const app = createServer()
const io = socketIO(app)

const watchers = {}

app.listen(5000, () => {
  Helpers.log('socket', 'Socket server running on port 5000.')
})

io.on('connection', function(socket) {
  Helpers.log('socket', 'user connected.')

  socket.on('setInfo', async function({ worldId, username }) {
    watchers[socket.id] = username

    // CREATE JOIN WORLD MESSAGE
    await prisma.mutation.createMessage({
      data: {
        type: 'INFO',
        sender: '',
        body: `${username} joined the game.`,
        world: {
          connect: {
            id: worldId
          }
        }
      }
    })

    Helpers.log('socket', `set info for '${username}' on world '${worldId}'`)
  })

  socket.on('position', function(data) {
    data.username = watchers[socket.id]
    socket.broadcast.emit('players', data)
  })

  socket.on('removeInfo', async function({ worldId, username }) {
    delete watchers[socket.id]

    // CREATE LEAVE WORLD MESSAGE
    await prisma.mutation.createMessage({
      data: {
        type: 'INFO',
        sender: '',
        body: `${username} left the game.`,
        world: {
          connect: {
            id: worldId
          }
        }
      }
    })

    Helpers.log(
      'socket',
      `removed info for '${username}' on world '${worldId}'`
    )
  })

  socket.on('disconnect', function() {
    Helpers.log('socket', 'user disconnected.')
  })
})

export default io
