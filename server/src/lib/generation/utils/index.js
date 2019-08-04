const Perlin = require('./perlin')
const Simplex = require('./simplex')

module.exports = {
  Perlin: {
    create: seed => new Perlin(seed)
  },
  Simplex: {
    create: seed => new Simplex(seed)
  }
}
