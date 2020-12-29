'use strict'

import Phaser from 'phaser'
import Projectile from './projectile'
import { ProjectileWeaponComponent, RateLimitedWeaponComponent } from './components/'
import { DepthSort } from './defines'


export default class Ship extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y)
  {
    super(scene, { x, y })

    // Extend with components
    Object.assign(this, ProjectileWeaponComponent)
    Object.assign(this, RateLimitedWeaponComponent)

    this.setDepth(DepthSort.PLAYER)

    this.setData({
      technologylevel: 1,
      materials: 200,
      datafragments: 0,
    })
    this.setProjectileDamage(1)
    this.setRateOfFire(0.5)
    this.setProjectileSpeed(350)

    // Draw sprite
    this.fillStyle(0x000000, 1)
    this.beginPath()
    this.arc(0, 0, 10, 0, Math.PI * 2)
    this.closePath()
    this.fillPath()

    this.lineStyle(2, 0x662266, 1)
    this.beginPath()
    this.arc(0, 0, 10, 0, Math.PI * 2)
    this.moveTo(0, 0)
    this.lineTo(10, 0)
    this.closePath()
    this.strokePath()

    this.on('changedata-inventory', () => {
      console.log("inventory changes")
    })

    this.on('changedata-inventory.materials', () => {
      console.log("materials changed")
    })

    // this.projectiles = new Phaser.GameObjects.Group()

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      this.body.setDamping(true)
      this.body.setDrag(0.01)
      this.body.setMaxVelocity(300)
    })
  }

  toJSON()
  {
    return {
      x: this.x,
      y: this.y,
      r: this.body.rotation,
      materials: this.getData('materials'),
      datafragments: this.getData('datafragments')
    }
  }

  fromJSON(data)
  {
    if (data)
    {
      this.x = data.x
      this.y = data.y
      // this.rotation = data.rotation
      this.body.rotation = data.rotation
      this.setData({
        materials: data.materials,
        datafragments: data.datafragments
      })
    }
  }

  tryFire()
  {
    // Abstract
  }

  fire()
  {
    // Abstract
  }

  // fire(target, delta)
  // {
  //   const p = new Projectile(this.scene, this.x, this.y, {
  //     baseSpeed: this.getData('bulletSpeed'),
  //     damage: this.getData('damage') * this.getData('damageMultiplier'),
  //   })
  //   this.scene.projectiles.add(p, true)
  //   this.projectiles.add(p)

  //   this.scene.physics.velocityFromRotation(this.rotation, p.getData('speed'), p.body.velocity)
  // }

  // preUpdate()
  // {
  //   super.preUpdate()

  // }
}
