import Helpers from '../../utils/helpers'

import redis from 'redis'
import bluebird from 'bluebird'

bluebird.promisifyAll(redis)

const redisClient = redis.createClient()

redisClient.on('error', err => {
  Helpers.log('redis', err)
})

redisClient.on('connect', () => {
  Helpers.log('redis', 'Redis client connected.')
})

export default redisClient
