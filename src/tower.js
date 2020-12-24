'use strict'

import Phaser from 'phaser'
import Projectile from './projectile'
import { GameEvents } from './defines'

class Weapon extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y)
  {
    super(scene, { x, y })

    // for a sprite facing N, add Math.PI / 2
    this.spriteRotationOffset = 0

    this.setData({
      // Range, if applicable
      range: undefined,
      rangeMultiplier: 1,
      // Number of attacks per second
      rateOfFire: undefined,
      rateOfFireMultiplier: 1,
      // Rotation speed, if applicable, number of seconds to perform a full rotation
      rotationSpeed: undefined,
      rotationSpeedMultiplier: 1,
      // Taget, if aquired and applicable
      target: undefined,
      damage: undefined,
      damageMultiplier: 1
    })

    this.canFireAt = 0

    this.draw()
  }

  findTargetsInRange(others, range)
  {
    if (others instanceof Phaser.GameObjects.Group)
    {
      others = others.getChildren()
    }
    else if (!Array.isArray(others))
    {
      others = [ others ]
    }

    const inRange = []
    others.forEach(obj => {
      if (obj.isAlive())
      {
        const distance = Phaser.Math.Distance.BetweenPoints(this.parentContainer, obj)

        if (range == null || distance <= range)
        {
          inRange.push({
            distance,
            obj
          })
        }
      }
    })

    return inRange
  }

  findClosestTarget(others, range)
  {
    const inRange = this.findTargetsInRange(others, range)
    let closest

    inRange.forEach(obj => {
      if (closest == null || obj.distance < closest.distance)
      {
        closest = obj
      }
    })

    return closest
  }

  canFire(time)
  {
    // console.log("check", this.canFireAt, time, time > this.canFireAt)
    return (time > this.canFireAt)
  }

  setNextFireTime(time)
  {
    const timeDifference = 1000 / this.getData('rateOfFire')
    // console.log("set", time, timeDifference)
    this.canFireAt = time + (timeDifference / this.scene.data.get('speed'))
  }

  draw()
  {
    // Abstract
  }

  fire()
  {
    // Abstract
  }
}

class CannonWeapon extends Weapon {
  constructor(container, x, y)
  {
    super(container.scene, x, y)

    // this.fireSprite = container.scene.add.arc(x, y, 2/*, 0, Math.PI * 2*/)
    // this.fireSprite.setDepth(7)
    // this.fireSprite.setVisible(false)

    // container.add(this)
    // container.add(this.fireSprite)

    this.setData({
      range: 50,
      // One shot every two seconds
      rateOfFire: 0.5,
      rotationSpeed: 0.25,
      bulletSpeed: 400,
      damage: 10,
    })
  }

  draw()
  {
    this.lineStyle(2, 0xFFFFFF, 1)

    this.beginPath()
    this.moveTo(0, 0)
    this.lineTo(8, 0)
    this.closePath()

    this.strokePath()
  }

  aquireTarget(others)
  {
    let target = this.target

    // Note: This will force the turrent to keep the same target so long as it's in range.
    // May want it to change to the closest / weakest / etc for better logic.
    if (target)
    {
      const obj = target.obj
      if (obj.isAlive())
      {
        const distance = Phaser.Math.Distance.BetweenPoints(this.parentContainer, obj)
        if (distance > this.getData('range'))
        {
          target = undefined
        }
        else
        {
          // Update the distance
          target.distance = distance
        }
      }
      else
      {
        target = undefined
      }
    }

    // If there was no target, or it has been lost, find a new one
    if (!target)
    {
      target = this.findClosestTarget(others, this.getData('range'))
    }

    this.target = target
    return this.target
  }

  preUpdate(time, delta)
  {
    const target = this.aquireTarget(this.scene.monsters)

    if (target)
    {
      const angleToTarget = this.rotateToTarget(target)

      const angleDifference = this.rotation - Phaser.Math.Angle.Wrap(angleToTarget)
      if (target.distance < this.getData('range') && (angleDifference < 0.08 && angleDifference > -0.08))
      {
        if (this.canFire(time))
        {
          this.fire(target.obj, delta)
          this.setNextFireTime(time)
        }
      }
    }

    // if (this.fireSprite.visible)
    // {
    //   let life = this.fireSprite.getData('life')
    //   life = life - (100 * (delta / 1000))
    //   this.fireSprite.setData('life', life)

    //   if (life < 0)
    //   {
    //     this.fireSprite.setVisible(false)
    //   }
    // }
  }

  rotateToTarget(target)
  {
    const angleToTarget = Phaser.Math.Angle.BetweenPoints(this.parentContainer, target.obj) + this.spriteRotationOffset
    const nextRotation = Phaser.Math.Angle.RotateTo(this.rotation, angleToTarget, this.getData('rotationSpeed'))
    this.rotation = nextRotation;

    // if (this.fireSprite.visible)
    // {
    //   const center = { x: this.parentContainer.x, y: this.parentContainer.y }
    //   const rad = this.rotation + Math.PI / 2
    //   const point = { x: center.x, y: center.y }
    //   Phaser.Math.RotateAroundDistance(point, center.x, center.y, rad, 20);

    //   this.fireSprite.rotation = this.rotation
    //   this.fireSprite.setPosition(this.parentContainer.x - point.x, this.parentContainer.y - point.y)
    // }

    return angleToTarget
  }

  fire(target, delta)
  {
    // center of the gun
    const center = { x: this.parentContainer.x, y: this.parentContainer.y }
    // angle between gun and pointer
    const rad = this.rotation - this.spriteRotationOffset
    const point = { x: center.x, y: center.y }
    // offset the start point of the bullet based on the rotation
    Phaser.Math.RotateAroundDistance(point, center.x, center.y, rad, 20);

    // this.fireSprite.setVisible(true)
    // this.fireSprite.setData('life', 10)

    // spawn the bullet
    const bullet = new Projectile(this.scene, point.x, point.y, {
      baseSpeed: this.getData('bulletSpeed'),
      damage: this.getData('damage') * this.getData('damageMultiplier'),
    })
    this.scene.projectiles.add(bullet, true)

    // set the velocity based on the rotation
    this.scene.physics.velocityFromRotation(rad, bullet.getData('speed'), bullet.body.velocity)
  }
}

export default class Tower extends Phaser.GameObjects.Container {
  constructor(scene, x, y)
  {
    super(scene, x, y)
    this.setSize(16, 16)
    this.setInteractive()

    const defaultColor = 0x111111
    this.setData({
      active: false,
      color: defaultColor,
    })

    const arc = new Phaser.GameObjects.Arc(scene, 0, 0, 8)
    arc.setStrokeStyle(2, defaultColor, 1)
    this.add(arc)

    this.on('pointerdown', (pointer, x, y, event) => {
      event.stopPropagation()
      this.scene.ui.emit(GameEvents.TOWER_SELECT, this)
    })

    const selectionArc = new Phaser.GameObjects.Arc(scene, 0, 0, 14)
    selectionArc.setStrokeStyle(2, 0xAAAAAA, 1)
    selectionArc.setVisible(false)
    this.add(selectionArc)

    this.on('changedata-color', (obj, val, previous) => {
      arc.setStrokeStyle(2, val, 1)
    })

    this.on('changedata-active', (obj, val, previous) => {
      selectionArc.setVisible(val)
    })
  }

  preUpdate(time, delta)
  {
    if (this.weapon)
    {
      this.weapon.preUpdate(time, delta)
    }
  }

  build(type)
  {
    let color = undefined
    switch (type)
    {
      case 'damage1':
      {
        color = 0xFF0000
        break
      }
      case 'damage2':
      {
        color = 0x0000FF
        break
      }
      case 'damage3':
      {
        color = 0xFFFF00
        break
      }
      case 'damage4':
      {
        color = 0xFF9800
        break
      }
      case 'damage5':
      {
        color = 0X00BCD4
        break
      }
    }

    this.setData({ color })

    this.weapon = new CannonWeapon(this, 0, 0)
    this.add(this.weapon)
  }
}