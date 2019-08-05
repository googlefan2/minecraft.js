import { resolvers } from './resolvers'
import { prisma, socketIO, redisClient } from './modules/server'
import Helpers from './utils/helpers'
import ChunkDistributor from './lib/game/chunkDistributor'

import { GraphQLServer, PubSub } from 'graphql-yoga'

const pubsub = new PubSub()
const chunkDistro = new ChunkDistributor()

const server = new GraphQLServer({
  typeDefs: 'server/src/schema.graphql',
  resolvers,
  context(request) {
    return {
      pubsub,
      prisma,
      socketIO,
      redisClient,
      request,
      chunkDistro
    }
  }
})

server.start({ port: process.env.PORT | 4000 }, ({ port }) => {
  // eslint-disable-next-line no-console
  Helpers.log('server', `The server is up and running on port ${port}.`)
})
