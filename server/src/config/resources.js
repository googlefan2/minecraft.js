const resources = {
  geometries: {
    blocks: {
      px: {
        func: 'rotateY',
        rotation: Math.PI / 2,
        translation: {
          x: 1,
          y: 0.5,
          z: 0.5
        }
      },
      py: {
        func: 'rotateX',
        rotation: -Math.PI / 2,
        translation: {
          x: 0.5,
          y: 1,
          z: 0.5
        }
      },
      pz: {
        func: null,
        rotation: null,
        translation: {
          x: 0.5,
          y: 0.5,
          z: 1
        }
      },
      nx: {
        func: 'rotateY',
        rotation: Math.PI / 2,
        translation: {
          x: 0,
          y: 0.5,
          z: 0.5
        }
      },
      ny: {
        func: 'rotateX',
        rotation: -Math.PI / 2,
        translation: {
          x: 0.5,
          y: 0,
          z: 0.5
        }
      },
      nz: {
        func: null,
        rotation: null,
        translation: {
          x: 0.5,
          y: 0.5,
          z: 0
        }
      },
      px2: {
        func: ['rotateY', 'rotateX'],
        rotation: [Math.PI / 2, Math.PI / 2],
        translation: {
          x: 1,
          y: 0.5,
          z: 0.5
        }
      },
      py2: {
        func: ['rotateX', 'rotateY'],
        rotation: [-Math.PI / 2, Math.PI / 2],
        translation: {
          x: 0.5,
          y: 1,
          z: 0.5
        }
      },
      pz2: {
        func: 'rotateZ',
        rotation: Math.PI / 2,
        translation: {
          x: 0.5,
          y: 0.5,
          z: 1
        }
      },
      nx2: {
        func: ['rotateY', 'rotateX'],
        rotation: [Math.PI / 2, Math.PI / 2],
        translation: {
          x: 0,
          y: 0.5,
          z: 0.5
        }
      },
      ny2: {
        func: ['rotateX', 'rotateY'],
        rotation: [-Math.PI / 2, Math.PI / 2],
        translation: {
          x: 0.5,
          y: 0,
          z: 0.5
        }
      },
      nz2: {
        func: 'rotateZ',
        rotation: Math.PI / 2,
        translation: {
          x: 0.5,
          y: 0.5,
          z: 0
        }
      },
      cross1: {
        func: 'rotateY',
        rotation: Math.PI / 4,
        translation: {
          x: 0.5,
          y: 0.5,
          z: 0.5
        }
      },
      cross2: {
        func: ['rotateZ', 'rotateY'],
        rotation: [Math.PI / 2, -Math.PI / 4],
        translation: {
          x: 0.5,
          y: 0.5,
          z: 0.5
        }
      }
    }
  }
}

module.exports = resources
