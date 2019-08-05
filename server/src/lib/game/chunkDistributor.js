import Helpers from '../../utils/helpers'

function ChunkDistributor() {
  this.funcs = []

  setInterval(() => {
    if (this.funcs.length) {
      const func = this.funcs.shift()
      func()
      Helpers.log('server', 'Distributed one chunk.')
    }
  }, 500)
}

ChunkDistributor.prototype.append = function(func) {
  this.funcs.push(func)
}

module.exports = ChunkDistributor
