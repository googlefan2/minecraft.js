import Helpers from '../../utils/helpers'
import commands from '../../lib/game/commands'

// eslint-disable-next-line import/no-unresolved
import { Worker } from 'worker_threads'
import FastIntCompression from 'fastintcompression'

const DEFAULT_MESSAGE = 'Unknown command. Try /help for a list of commands.'

const WorldMutations = {
  async createWorld(parent, args, { prisma, request }, info) {
    const id = Helpers.getUserId(request)
    const {
      data: { gamemode, name, seed }
    } = args

    // Check if user exists
    const userExists = await prisma.exists.User({
      id
    })
    if (!userExists) throw new Error('User not found')

    // World creation
    const world = await prisma.mutation.createWorld(
      {
        data: {
          lastPlayed: new Date().toISOString(),
          name,
          seed,
          time: 1200,
          days: 0
        }
      },
      '{ id }'
    )

    await prisma.mutation.updateUser({
      where: {
        id
      },
      data: {
        worlds: {
          connect: {
            id: world.id
          }
        }
      }
    })

    // Adding owner into world
    await prisma.mutation.createPlayer({
      data: {
        isAdmin: true,
        gamemode,
        user: {
          connect: {
            id
          }
        },
        world: {
          connect: {
            id: world.id
          }
        },
        x: 0,
        y: Number.MIN_SAFE_INTEGER,
        z: 0,
        dirx: 0,
        diry: 0,
        inventory: {
          create: {
            cursor: 0,
            data:
              'ARMOR:0;0;0;0;|BACKPACK:0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;|HOTBAR:0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;0,0;'
          }
        }
      }
    })

    return prisma.query.world(
      {
        where: {
          id: world.id
        }
      },
      info
    )
  },
  async updateWorld(parent, args, { prisma }, info) {
    const worldId = args.data.id
    delete args.data.id

    return prisma.mutation.updateWorld(
      {
        where: {
          id: worldId
        },
        data: {
          ...args.data
        }
      },
      info
    )
  },
  async deleteWorld(parent, args, { prisma }) {
    await prisma.mutation.deleteWorld({ where: { id: args.worldId } })
    return true
  },
  async runCommand(
    parent,
    {
      data: { playerId, worldId, command }
    },
    { prisma }
  ) {
    let type = 'ERROR'
    let sender = ''
    let body = DEFAULT_MESSAGE

    const {
      user: { username }
    } = await prisma.query.player(
      {
        where: {
          id: playerId
        }
      },
      `{
        user {
          username
        }
      }`
    )

    if (command.startsWith('/')) {
      const args = command
        .substr(1)
        .split(' ')
        .filter(ele => !!ele)

      const layer1 = commands[args[0]]

      if (layer1) {
        let isError = true

        const recursiveProcess = async (cmdInfoArr, index) => {
          const instance = cmdInfoArr.find(({ variation }, i) => {
            if (cmdInfoArr.length - 1 === i) return false
            if (typeof variation === 'function') return variation(args[index])
            return variation.includes(args[index])
          })

          if (!instance) {
            isError = true
            return
          }

          const { more, run } = instance

          if (more) await recursiveProcess(more, index + 1)
          if (!run) return

          isError = false

          const context = {
            worldId,
            playerId,
            username,
            arg: args[index],
            prisma
          }

          await run(context)

          type = 'SERVER'
          const defaultFallback = cmdInfoArr[cmdInfoArr.length - 1]
          if (defaultFallback)
            body = defaultFallback({ username, arg: args[index] })
          else body = `Success on running command: /${args[0]}`
        }

        await recursiveProcess(layer1, 1)

        if (isError) {
          type = 'ERROR'
          body = `Incorrect arguments for command: /${args[0]}`
        }
      }
    } else {
      // NORMAL MESSAGE
      type = 'PLAYER'
      sender = username
      body = command
    }

    await prisma.mutation.createMessage({
      data: {
        type,
        sender,
        body,
        world: {
          connect: {
            id: worldId
          }
        }
      }
    })

    return true
  },
  async requestChunks(
    parent,
    {
      data: { worldId, username, chunks, seed }
    },
    { socketIO, redisClient }
  ) {
    // PROCESS ARGS
    const chunkList = chunks.map(chunk => Helpers.get2DCoordsFromRep(chunk))

    // CHECK REDIS
    await Promise.all(
      chunkList.map(async ({ x, z }) => {
        const redisRepData = Helpers.getRedisRep(worldId, x, z, 'data')
        const redisRepMesh = Helpers.getRedisRep(worldId, x, z, 'mesh')
        const chunkData = await redisClient.hgetAsync(worldId, redisRepData)
        const chunkMesh = await redisClient.hgetAsync(worldId, redisRepMesh)

        const emitChunk = (data, meshData) =>
          socketIO.emit(Helpers.getIORep(worldId, username, 'chunk'), {
            data,
            meshData
          })

        if (chunkData && chunkMesh) {
          // EMIT TO IO
          const parsedData = JSON.parse(chunkData)
          const parsedMesh = JSON.parse(chunkMesh)
          emitChunk(FastIntCompression.compress(parsedData), parsedMesh)
        } else {
          // WORKER START WORKING
          const worker = new Worker(
            './server/src/modules/worker/world.worker.js'
          )

          worker.on('message', async ({ data, meshData }) => {
            const jsonVoxelData = JSON.stringify(data)
            const jsonMeshData = JSON.stringify(meshData)

            redisClient.hmset(
              worldId,
              redisRepData,
              jsonVoxelData,
              redisRepMesh,
              jsonMeshData,
              function(err) {
                if (!err)
                  Helpers.log(
                    'redis',
                    `Saved chunk data of ${x}:${z} of worldId ${worldId} to cache.`
                  )
              }
            )

            emitChunk(FastIntCompression.compress(data), meshData)
          })

          worker.postMessage({ seed, x, z })
        }
      })
    )

    // IF EXISTS, EMIT IO

    // IF NOT, DO:
    // OFF-LOAD TO WORKER TO:
    // 1. GENERATE CHUNK DATA
    // 2. MESH CHUNK
    // 3. MAKE GEO
    // 4. COMPRESS CHUNK DATA
    // 5. SAVE TO REDIS

    return true
  }
}

export default WorldMutations
