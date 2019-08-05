import Helpers from '../../utils/helpers'

const WorldQueries = {
  myWorlds(parent, args, { prisma, request }, info) {
    const userId = Helpers.getUserId(request)
    return prisma.query.user({ where: { id: userId } }, info)
  },
  async world(parent, args, { prisma }, info) {
    const id = args.query

    await prisma.mutation.updateWorld({
      data: {
        lastPlayed: new Date().toISOString()
      },
      where: {
        id
      }
    })
    return prisma.query.world({ where: { id } }, info)
  },
  async getChunk(
    parent,
    {
      data: { worldId, x, z }
    },
    { redisClient }
  ) {
    const redisRepData = Helpers.getRedisRep(worldId, x, z, 'data')
    const redisRepMesh = Helpers.getRedisRep(worldId, x, z, 'mesh')
    const chunkData = await redisClient.hgetAsync(worldId, redisRepData)
    const chunkMesh = await redisClient.hgetAsync(worldId, redisRepMesh)
    const parsedData = JSON.parse(chunkData)
    const parsedMesh = JSON.parse(chunkMesh)
    return JSON.stringify({
      data: parsedData,
      meshData: parsedMesh
    })
  }
}

export default WorldQueries
