const { ClassicGenerator } = require('../../lib/generation/terrain')
const Config = require('../../config/config')
const Mesher = require('../../utils/mesher')
const { LightingManager, GeometryManager } = require('../managers')

// eslint-disable-next-line import/no-unresolved
const { parentPort } = require('worker_threads')
const ndarray = require('ndarray')

const SIZE = Config.chunk.size
const NEIGHBOR_WIDTH = Config.chunk.neighborWidth
const MAX_WORLD_HEIGHT = Config.world.maxWorldHeight

parentPort.once('message', workerData => {
  if (!workerData) return

  // PROBABLY CACHE THIS???
  const { seed, x: coordx, z: coordz } = workerData

  const generator = new ClassicGenerator(seed)
  const lightingManager = new LightingManager(generator)
  const geometryManager = new GeometryManager()

  geometryManager.load()

  const voxelData = ndarray(
    new Uint8Array((SIZE + NEIGHBOR_WIDTH * 2) ** 2 * (MAX_WORLD_HEIGHT + 1)),
    [SIZE + NEIGHBOR_WIDTH * 2, SIZE + NEIGHBOR_WIDTH * 2, MAX_WORLD_HEIGHT + 1]
  )

  const lighting = ndarray(
    new Uint8Array(SIZE ** 2 * (MAX_WORLD_HEIGHT + 1) * 6),
    [SIZE, SIZE, MAX_WORLD_HEIGHT + 1, 6]
  )

  const smoothLighting = ndarray(
    new Uint8Array(SIZE ** 2 * (MAX_WORLD_HEIGHT + 1) * 6 * 3 * 3),
    [SIZE, SIZE, MAX_WORLD_HEIGHT + 1, 6, 3, 3]
  )

  generator.setVoxelData(voxelData, coordx, coordz)
  lightingManager.setLightingData(
    lighting,
    smoothLighting,
    voxelData,
    coordx,
    coordz
  )

  const dims = [
    SIZE + NEIGHBOR_WIDTH * 2,
    MAX_WORLD_HEIGHT + 1,
    SIZE + NEIGHBOR_WIDTH * 2
  ]

  const planes = Mesher.calcPlanes(
    generator,
    voxelData,
    lighting,
    smoothLighting,
    dims,
    coordx,
    coordz
  )

  const meshData = Mesher.generateMeshData(planes, geometryManager)

  parentPort.postMessage({
    data: voxelData.data,
    lighting: lighting.data,
    smoothLighting: smoothLighting.data,
    meshData
  })
})
