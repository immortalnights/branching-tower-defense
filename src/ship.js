'use strict'

import Phaser from 'phaser'
import Projectile from './projectile'
import { DepthSort } from './defines'


export default class Ship extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y)
  {
    super(scene, { x, y })
    this.setDepth(DepthSort.PLAYER)

    this.setData({
      damage: 1,
      damageMultiplier: 1,
      bulletSpeed: 200,
    })

    // Draw sprite
    this.lineStyle(2, 0x662266, 1)
    this.beginPath()
    this.arc(0, 0, 10, 0, Math.PI * 2)
    this.moveTo(0, 0)
    this.lineTo(10, 0)
    this.closePath()
    this.strokePath()

    this.projectiles = new Phaser.GameObjects.Group()

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      this.body.setDamping(true)
      this.body.setDrag(0.01)
      this.body.setMaxVelocity(200)
    })
  }

  fire()
  {
    const p = new Projectile(this.scene, this.x, this.y, {
      baseSpeed: this.getData('bulletSpeed'),
      damage: this.getData('damage') * this.getData('damageMultiplier'),
    })
    this.scene.projectiles.add(p, true)
    this.projectiles.add(p)

    this.scene.physics.velocityFromRotation(this.rotation, p.getData('speed'), p.body.velocity)
  }

  // preUpdate()
  // {
  //   super.preUpdate()

  // }
}
