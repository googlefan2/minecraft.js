import {
  ResourceManager,
  ChunkManager,
  WorkerManager,
  PlayersManager
} from '../../managers'
import Helpers from '../../../utils/helpers'
import Stateful from '../../../lib/stateful/stateful'
import { Chat } from '../../interfaces'
import {
  UPDATE_WORLD_MUTATION,
  WORLD_SUBSCRIPTION,
  GET_CHUNK_QUERY
  // OTHER_PLAYERS_SUBSCRIPTION
} from '../../../lib/graphql'

import createSky from './sky/sky'

class World extends Stateful {
  constructor(worldData, scene, apolloClient, ioClient, container, playerData) {
    super({ isSetup: false })

    const { id, name, seed, time, days, changedBlocks } = worldData

    this.data = {
      id,
      name,
      seed,
      time,
      days,
      playerId: playerData.id
    }

    this.scene = scene
    this.apolloClient = apolloClient
    this.ioClient = ioClient

    this.chat = new Chat(this.data.playerId, id, container, apolloClient)

    this.resourceManager = new ResourceManager()
    this.workerManager = new WorkerManager(this)
    this.playersManager = new PlayersManager(scene)
    this.chunkManager = new ChunkManager(
      scene,
      seed,
      this.resourceManager,
      this.workerManager,
      changedBlocks
    )
  }

  init = () => {
    this.initUpdaters()
    this.initSubscriptions()
  }

  initUpdaters = () => {
    this.envUpdater = window.requestInterval(this.updateEnv, 100)
    this.timeUpdater = window.requestInterval(() => {
      const t = this.sky.getTime()
      if (t) {
        this.apolloClient.mutate({
          mutation: UPDATE_WORLD_MUTATION,
          variables: {
            id: this.data.id,
            time: t
          }
        })
      }
    }, 500)

    this.sky.on('new-day', () => {
      const days = this.sky.getDays()
      if (days) {
        this.data.days = days
        this.apolloClient.mutate({
          mutation: UPDATE_WORLD_MUTATION,
          variables: {
            id: this.data.id,
            days
          }
        })
      }
    })
  }

  initSubscriptions = () => {
    this.worldSubscription = this.apolloClient
      .subscribe({
        query: WORLD_SUBSCRIPTION,
        variables: {
          worldId: this.data.id,
          mutation_in: ['UPDATED'],
          updatedFields_contains_some: ['timeChanger']
        }
      })
      .subscribe({
        next: ({ data }) => {
          this.handleServerUpdate(data)
        },
        error(e) {
          Helpers.error(e.message)
        }
      })

    this.ioClient.on('players', pkg => {
      this.playersManager.update({
        ...pkg.playerCoords,
        ...pkg.playerDir,
        username: pkg.username
      })
    })

    this.ioClient.on(
      Helpers.getIORep(this.data.id, this.player.data.user.username, 'chunk'),
      ({ coordx, coordy, coordz }) => {
        this.apolloClient
          .query({
            query: GET_CHUNK_QUERY,
            variables: {
              worldId: this.data.id,
              x: coordx,
              y: coordy,
              z: coordz
            }
          })
          .then(({ data }) => {
            this.chunkManager.handleNewChunk(coordx, coordy, coordz, data)
          })
      }
    )
  }

  update = () => {
    this.sky.tick()
  }

  updateEnv = () => {
    const playerPos = this.player.getCoordinates()
    const { coordx, coordy, coordz } = Helpers.globalBlockToChunkCoords(
      playerPos
    )
    this.chunkManager.surroundingChunksCheck(coordx, coordy, coordz)
  }

  terminate = () => {
    this.worldSubscription.unsubscribe()

    this.getChat().terminate()
    this.removeUpdaters()
  }

  handleServerUpdate = ({
    world: {
      node: { timeChanger }
    }
  }) => {
    this.sky.setTime(timeChanger)
  }

  removeUpdaters = () => {
    window.clearRequestInterval(this.envUpdater)
    window.clearRequestInterval(this.timeUpdater)
  }

  /* -------------------------------------------------------------------------- */
  /*                                   SETTERS                                  */
  /* -------------------------------------------------------------------------- */
  setPlayer = player => {
    this.player = player
    this.sky = createSky(this.scene, this, {
      speed: 0.1
    })(this.data.time, this.data.days)
  }

  setTarget = target => (this.targetBlock = target)

  setPotential = potential => (this.potentialBlock = potential)

  /* -------------------------------------------------------------------------- */
  /*                                   GETTERS                                  */
  /* -------------------------------------------------------------------------- */
  getPlayer = () => this.player

  getChat = () => this.chat

  getDays = () => this.data.days

  getVoxelByVoxelCoords = (x, y, z) => {
    /** RETURN INFORMATION ABOUT CHUNKS */
    const type = this.chunkManager.getTypeAt(x, y, z)
    return type
  }

  getVoxelByWorldCoords = (x, y, z) => {
    const gbc = Helpers.worldToBlock({ x, y, z })
    return this.getVoxelByVoxelCoords(gbc.x, gbc.y, gbc.z)
  }

  getSolidityByVoxelCoords = (x, y, z, forPassing = false) => {
    const type = this.getVoxelByVoxelCoords(x, y, z)
    if (typeof type !== 'number') return forPassing

    const isSolid = forPassing
      ? Helpers.isPassable(type)
      : Helpers.isLiquid(type)
    return !isSolid
  }

  getSolidityByWorldCoords = (x, y, z) => {
    const gbc = Helpers.worldToBlock({ x, y, z })
    return this.getSolidityByVoxelCoords(gbc.x, gbc.y, gbc.z)
  }

  getPassableByVoxelCoords = (x, y, z) =>
    this.getSolidityByVoxelCoords(x, y, z, true)

  getTargetBlockType = () => {
    if (!this.targetBlock) return 0

    const {
      chunk: { cx, cy, cz },
      block: { x, y, z }
    } = this.targetBlock
    const bCoords = Helpers.chunkBlockToGlobalBlock({
      x,
      y,
      z,
      coordx: cx,
      coordy: cy,
      coordz: cz
    })

    return this.getVoxelByVoxelCoords(bCoords.x, bCoords.y, bCoords.z)
  }

  getIsReady = () => this.chunkManager.isReady
}

export default World
