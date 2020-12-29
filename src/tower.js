'use strict'

import Phaser from 'phaser'
import Projectile from './projectile'
import { ProjectileWeaponComponent, RateLimitedWeaponComponent } from './components/'
import { GameEvents } from './defines'


class Weapon extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y, config)
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
  constructor(container, x, y, config)
  {
    super(container.scene, x, y)

    Object.assign(this, ProjectileWeaponComponent)
    Object.assign(this, RateLimitedWeaponComponent)

    this.setData({
      range: config.range,
      rotationSpeed: config.rotationSpeed,
    })
    this.setProjectileOrigin(container.x, container.y)
    this.setProjectileDamage(config.damage)
    this.setRateOfFire(config.rateOfFire)
    this.setProjectileSpeed(config.projectileSpeed)

    const [ damage, multiplier, rateOfFire, rateOfFireMultiplier ] = this.getData([ 'damage', 'damageMultiplier', 'rateOfFire', 'rateOfFireMultiplier' ])
    console.log(`Tower weapon ${damage * multiplier}d, ${rateOfFire * rateOfFireMultiplier}a/s`)
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
        this.tryFire(target.obj, time, delta)
      }
    }
  }

  rotateToTarget(target)
  {
    const angleToTarget = Phaser.Math.Angle.BetweenPoints(this.parentContainer, target.obj) + this.spriteRotationOffset
    const nextRotation = Phaser.Math.Angle.RotateTo(this.rotation, angleToTarget, this.getData('rotationSpeed'))
    this.rotation = nextRotation;

    return angleToTarget
  }
}

export default class Tower extends Phaser.GameObjects.Container {
  constructor(scene, x, y)
  {
    super(scene, x, y)
    this.setSize(16, 16)
    this.setInteractive()

    const defaultColor = 0x222222
    this.setData({
      active: false,
      color: defaultColor,
    })

    const arc = new Phaser.GameObjects.Arc(scene, 0, 0, 8)
    arc.setStrokeStyle(2, defaultColor, 1)
    arc.setFillStyle(0x000000, 1)
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
    // console.log("type", type)
    this.setData({ color: type.color })

    let className = CannonWeapon
    switch (type.id)
    {
      case 'Thermal':
      {
        break
      }
      case 'Electrical':
      {
        break
      }
      case 'Cold':
      {
        break
      }
      case 'Corrosive':
      {
        break
      }
      case 'Enhancer':
      {
        break
      }
    }

    console.assert(className, `Failed to identify tower class from type '${type.id}'`)

    this.weapon = new (className)(this, 0, 0, type)
    this.add(this.weapon)
  }
}