const Config = require('../config/config')

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const debug = require('debug')

const SIZE = Config.chunk.size
const DIMENSION = Config.block.dimension
const NEIGHBOR_WIDTH = Config.chunk.neighborWidth
const TRANSPARENT_BLOCKS = Config.block.transparent
const LIQUID_BLOCKS = Config.block.liquid
const PLANT_BLOCKS = Config.block.plant
const PASSABLE_BLOCKS = Config.block.passabl

class Helpers {
  static log = (source, output) =>
    debug(source)(JSON.stringify(output, null, 2))

  static hashPassword = password => {
    if (password.length < 8) {
      throw new Error('Password must be 8 characters or longer.')
    }

    return bcrypt.hash(password, 10)
  }

  static getUserId = (request, requireAuth = true) => {
    const header = request.request
      ? request.request.headers.authorization
      : request.connection.context.Authorization

    if (header) {
      const token = header.replace('Bearer ', '')
      const decoded = jwt.verify(token, 'thisisasecret')
      return decoded.userId
    }

    if (requireAuth) {
      throw new Error('Authentication required')
    }

    return null
  }

  static getBlockRep = (worldId, x, y, z) => `${worldId}:${x}:${y}:${z}`

  static generateToken = userId => {
    return jwt.sign({ userId }, 'thisisasecret', { expiresIn: '7 days' })
  }

  static getWorldChunkRep = (worldId, cx, cy, cz) =>
    `${worldId}::${Helpers.get3DCoordsRep(cx, cy, cz)}`

  static getRedisRep = (worldId, coordx, coordy, coordz, key) =>
    `${Helpers.getWorldChunkRep(worldId, coordx, coordy, coordz)}::${key}`

  static getIORep = (worldId, username, key) =>
    `${worldId}::${username}::${key}`

  static get2DCoordsRep = (x, z) => `${x}:${z}`

  static get2DCoordsFromRep = repr => {
    const [x, z] = repr.toString().split(':')
    return { x: parseInt(x, 10), z: parseInt(z, 10) }
  }

  static get3DCoordsRep = (x, y, z) => {
    return `${x}:${y}:${z}`
  }

  static get3DCoordsFromRep = rep => {
    const [x, y, z] = rep.split(':')
    return { x: parseInt(x, 10), y: parseInt(y, 10), z: parseInt(z, 10) }
  }

  static getRelativeCoords = (x, y, z, offsets) => ({
    x: x - offsets[0],
    y: y - offsets[1],
    z: z - offsets[2]
  })

  static getAbsoluteCoords = (x, y, z, offsets) => ({
    x: x + offsets[0],
    y: y + offsets[1],
    z: z + offsets[2]
  })

  static checkWithinChunk = (x, y, z) =>
    x >= 0 &&
    x < SIZE + NEIGHBOR_WIDTH * 2 &&
    y >= 0 &&
    y < SIZE + NEIGHBOR_WIDTH * 2 &&
    z >= 0 &&
    z < SIZE + NEIGHBOR_WIDTH * 2

  static getLoadedBlocks = (x, y, z, voxelData, generator, offsets) => {
    const relativeCoords = Helpers.getRelativeCoords(x, y, z, offsets)
    if (
      Helpers.checkWithinChunk(
        relativeCoords.x,
        relativeCoords.y,
        relativeCoords.z
      )
    ) {
      return voxelData.get(relativeCoords.x, relativeCoords.z, relativeCoords.y)
    }
    const maxHeight = generator.getHighestBlock(x, z)
    return generator.getBlockInfo(x, y, z, maxHeight)
  }

  static normalizeNoise = noise => (1 + noise) / 2

  static round(value, decimals) {
    return Number(`${Math.round(`${value}e${decimals}`)}e-${decimals}`)
  }

  static toFixed(value, decimals) {
    return Number(value.toFixed(decimals))
  }

  static isTransparent = type => TRANSPARENT_BLOCKS.includes(type)

  static isLiquid = type => LIQUID_BLOCKS.includes(type)

  static isPlant = type => PLANT_BLOCKS.includes(type)

  static isPassable = type => PASSABLE_BLOCKS.includes(type)

  static chunkBlockToGlobalBlock = ({
    x: bx,
    y: by,
    z: bz,
    coordx,
    coordy,
    coordz
  }) => ({
    x: Math.floor(coordx * SIZE + bx),
    y: Math.floor(coordy * SIZE + by),
    z: Math.floor(coordz * SIZE + bz)
  })

  static globalBlockToWorld = ({ x, y, z }) => ({
    x: x * DIMENSION,
    y: y * DIMENSION,
    z: z * DIMENSION
  })
}

module.exports = Helpers
