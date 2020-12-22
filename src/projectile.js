'use strict'

import Phaser from 'phaser'


const PROJECTILE_DEPTH = 99


export default class Projectile extends Phaser.GameObjects.Arc {
  constructor(scene, x, y, options)
  {
    super(scene, x, y, options.radius || 2)
    this.setFillStyle(0xBBBBBB, 1)

    // set the z-index
    this.setDepth(PROJECTILE_DEPTH)

    console.assert(options.damage, "Projectile required `options.damage`")
    console.assert(options.baseSpeed, "Projectile required `options.baseSpeed`")
    this.setData({
      damage: options.damage,
      baseSpeed: options.baseSpeed,
      speed: options.baseSpeed * scene.data.get('speed')
    })

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      this.body.setCollideWorldBounds(true)
      // trigger a callback on hitting the game bounds
      this.body.onWorldBounds = true
      // this.body.setVelocity(200, 200)
    })
  }
}