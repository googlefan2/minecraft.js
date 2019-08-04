const Config = require('../config/config')

const Helpers = require('./helpers')

const {
  Geometry,
  Matrix4,
  BufferGeometry,
  BufferGeometryLoader,
  Mesh,
  LOD
} = require('three')

const LEVEL_OF_DETAIL = Config.scene.lod
const NEIGHBOR_WIDTH = Config.chunk.neighborWidth
const MAX_WORLD_HEIGHT = Config.world.maxWorldHeight

class Mesher {
  static getSmoothLightingSide = (smoothLighting, i, j, k, l) => {
    if (smoothLighting.get(i, j, k, l, 0, 0) === 0) return null
    const output = new Array(3)
    for (let m = 0; m < 3; m++) {
      output[m] = new Uint8Array(3)
      for (let n = 0; n < 3; n++) {
        output[m][n] = smoothLighting.get(i, j, k, l, m, n)
      }
    }
    return output
  }

  static generateMeshData = (planes, geoManager) => {
    if (!planes || planes.length === 0) return null

    const materials = []
    const mergedGeometry = new Geometry()
    const matrix = new Matrix4()

    for (let i = 0; i < planes.length; i++) {
      const [geo, pos, face, type, lighting, smoothLighting] = planes[i]

      const { x, y, z } = pos

      const geoData = Helpers.isPlant(type)
        ? geoManager.getPure(geo)
        : geoManager.getWLighting(geo, lighting, smoothLighting, type)

      const {
        geometry,
        translation: { x: dx, y: dy, z: dz }
      } = geoData
      const { x: wx, y: wy, z: wz } = Helpers.globalBlockToWorld({
        x: x + dx,
        y: y + dy,
        z: z + dz
      })

      matrix.makeTranslation(wx, wy, wz)
      mergedGeometry.merge(geometry, matrix, i)

      materials.push([type, geo, face])
    }

    const finalGeometry = new BufferGeometry().fromGeometry(mergedGeometry)
    return [finalGeometry.toJSON(), materials]
  }

  static processMeshData = (finalGeometryJSON, materials, resourceManager) => {
    const parser = new BufferGeometryLoader()

    const actualGeo = parser.parse(finalGeometryJSON)
    const actualMats = []

    materials.forEach(([type, geo, face]) =>
      actualMats.push(resourceManager.getMaterial(type, geo, face))
    )

    const finalMesh = new Mesh(actualGeo, actualMats)
    const finalLOD = new LOD()

    finalMesh.matrixAutoUpdate = false
    finalMesh.updateMatrix()

    for (let i = 0; i < LEVEL_OF_DETAIL; i++)
      finalLOD.addLevel(finalMesh, i * 75)

    return finalMesh
  }

  static calcPlanes(
    generator,
    voxelData,
    lighting,
    smoothLighting,
    dims,
    coordx,
    coordz
  ) {
    const planes = []

    for (let x = NEIGHBOR_WIDTH; x < dims[0] - NEIGHBOR_WIDTH; x++) {
      for (let z = NEIGHBOR_WIDTH; z < dims[2] - NEIGHBOR_WIDTH; z++) {
        for (let y = 0; y <= MAX_WORLD_HEIGHT; y++) {
          // dismiss air
          const type = voxelData.get(x, z, y)

          if (type === 0) continue

          const wx = x - NEIGHBOR_WIDTH
          const wy = y
          const wz = z - NEIGHBOR_WIDTH

          const pos = Helpers.chunkBlockToGlobalBlock({
            x: wx,
            y: wy,
            z: wz,
            coordx,
            coordz
          })

          if (Helpers.isPlant(type)) {
            const grassData = generator.getGrassData(pos.x, pos.z)
            if (!grassData) continue
            const { dx, dz } = grassData

            pos.x += dx
            pos.z += dz

            planes.push(['cross1', pos, 'side', type])
            planes.push(['cross2', pos, 'side', type])
            continue
          }

          const isSelfTransparent = Helpers.isTransparent(type)
          const isSelfLiquid = Helpers.isLiquid(type)

          // TOP
          const top = voxelData.get(x, z, y + 1)
          if (
            !top ||
            Helpers.isPlant(top) ||
            (Helpers.isTransparent(top) && !isSelfTransparent)
          ) {
            const smoothLightingSide = this.getSmoothLightingSide(
              smoothLighting,
              wx,
              wz,
              wy,
              0
            )
            const geo =
              smoothLightingSide === null || smoothLightingSide[2][0] !== 1
                ? 'py'
                : 'py2'
            planes.push([
              geo,
              pos,
              'top',
              type,
              lighting.get(wx, wz, wy, 0),
              smoothLightingSide
            ])
          }

          // SIDES
          const px = voxelData.get(x + 1, z, y)
          if (
            !px ||
            Helpers.isPlant(px) ||
            (Helpers.isTransparent(px) && !isSelfTransparent)
          ) {
            const smoothLightingSide = this.getSmoothLightingSide(
              smoothLighting,
              wx,
              wz,
              wy,
              1
            )
            const geo =
              smoothLightingSide === null || smoothLightingSide[2][0] !== 1
                ? 'px'
                : 'px2'
            planes.push([
              geo,
              pos,
              'side',
              type,
              lighting.get(wx, wz, wy, 1),
              smoothLightingSide
            ])
          }

          const pz = voxelData.get(x, z + 1, y)
          if (
            !pz ||
            Helpers.isPlant(pz) ||
            (Helpers.isTransparent(pz) && !isSelfTransparent)
          ) {
            const smoothLightingSide = this.getSmoothLightingSide(
              smoothLighting,
              wx,
              wz,
              wy,
              2
            )
            const geo =
              smoothLightingSide === null || smoothLightingSide[2][0] !== 1
                ? 'pz'
                : 'pz2'
            planes.push([
              geo,
              pos,
              'side',
              type,
              lighting.get(wx, wz, wy, 2),
              smoothLightingSide
            ])
          }

          const nx = voxelData.get(x - 1, z, y)
          if (
            !nx ||
            Helpers.isPlant(nx) ||
            (Helpers.isTransparent(nx) && !isSelfLiquid && !isSelfTransparent)
          ) {
            const smoothLightingSide = this.getSmoothLightingSide(
              smoothLighting,
              wx,
              wz,
              wy,
              3
            )
            const geo =
              smoothLightingSide === null || smoothLightingSide[2][0] !== 1
                ? 'nx'
                : 'nx2'
            planes.push([
              geo,
              pos,
              'side',
              type,
              lighting.get(wx, wz, wy, 3),
              smoothLightingSide
            ])
          }

          const nz = voxelData.get(x, z - 1, y)
          if (
            !nz ||
            Helpers.isPlant(nz) ||
            (Helpers.isTransparent(nz) && !isSelfLiquid && !isSelfTransparent)
          ) {
            const smoothLightingSide = this.getSmoothLightingSide(
              smoothLighting,
              wx,
              wz,
              wy,
              4
            )
            const geo =
              smoothLightingSide === null || smoothLightingSide[2][0] !== 1
                ? 'nz'
                : 'nz2'
            planes.push([
              geo,
              pos,
              'side',
              type,
              lighting.get(wx, wz, wy, 4),
              smoothLightingSide
            ])
          }

          // BOTTOM
          const bottom = voxelData.get(x, z, y - 1)
          if (
            !bottom ||
            Helpers.isPlant(bottom) ||
            (Helpers.isTransparent(bottom) &&
              !isSelfLiquid &&
              !isSelfTransparent)
          ) {
            const smoothLightingSide = this.getSmoothLightingSide(
              smoothLighting,
              wx,
              wz,
              wy,
              5
            )
            const geo =
              smoothLightingSide === null || smoothLightingSide[2][0] !== 1
                ? 'ny'
                : 'ny2'
            planes.push([
              geo,
              pos,
              'bottom',
              type,
              lighting.get(wx, wz, wy, 5),
              smoothLightingSide
            ])
          }
        }
      }
    }

    return planes
  }
}

module.exports = Mesher
