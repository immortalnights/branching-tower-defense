'use strict'

import Phaser from 'phaser'
import enemyTypes from '../enemies.json'
import { GameEvents, MonsterStates } from '../defines'


// Base properties are taken from enemies.json, modifiers are applied by the portal
const MonsterConfiguration = {
  healthMultiplier: 1,
  speedMultiplier: 1,
}


export default class Walker extends Phaser.GameObjects.Arc {
  constructor(scene, path, config)
  {
    super(scene, path.getEndPoint().x, path.getEndPoint().y, 10)

    // Extend with components
    Object.assign(this, Phaser.GameObjects.Components.PathFollower)

    const type = enemyTypes.find(t => t.id === 'Walker')

    // console.log("Monster base", type, config)
    config = Object.assign({}, type, MonsterConfiguration, config)
    // console.log("Monster config", config)

    const baseHealth = config.health
    const health = config.health * config.healthMultiplier
    const baseSpeed = config.speed
    const speed = baseSpeed * config.speedMultiplier
    const pathDuration = (path.getLength() / speed) * 1000
    console.log(`Walker ${health}hp, ${speed}m/s (${pathDuration / 1000}s)`)

    this.setPath(path)
    this.setFillStyle(0x662222, 0.25)
    this.setStrokeStyle(2, 0x662222, 1)

    this.setState(MonsterStates.ALIVE)
    this.setData({
      health,
      speed,
      materialValue: config.materials,
      stabilityDamage: config.damage,
      attacksPlayer: false,
    })

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      this.body.setImmovable()
      this.beginFollow(pathDuration)
    })

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
    })
  }

  beginFollow(duration, start)
  {
    this.startFollow({
      duration: duration,
      positionOnPath: true,
      rotateToPath: false,
      onComplete: () => {
        // This is sometimes called when the enemy is killed, so only reduce
        // the players life if the enemy is active.
        if (this.active)
        {
          let stability = this.scene.exitPortal.getData('stability')
          if (this.state === MonsterStates.DEAD)
          {
            stability += this.getData('stabilityDamage')
          }
          else
          {
            stability -= this.getData('stabilityDamage')
          }

          this.scene.exitPortal.setData('stability', Phaser.Math.Clamp(stability, -100, 100))

          // TODO monsters don't die when reaching the core, they attack it
          // causing core damage per second
          this.destroy()
        }
      }
    }, start)
  }

  isAlive()
  {
    return this.active && this.state !== MonsterStates.DEAD
  }

  takeDamage(amount)
  {
    const health = this.getData('health')
    this.incData('health', -amount)

    if (amount >= health)
    {
      this.kill()
    }
  }

  kill()
  {
    this.setState(MonsterStates.DEAD)
    // FIX ME, two events?
    this.emit(GameEvents.MONSTER_KILLED, this)
    this.scene.events.emit(GameEvents.MONSTER_KILLED, this)
    this.beginFollow(2000, this.pathTween.getValue())
    this.setVisible(false)
  }

  preUpdate(time, delta)
  {
    // Arc does not have a preUpdate, but Sprite does
    // super.preUpdate()
    this.pathUpdate(time)
  }

  postUpdate(time, delta)
  {
    super.postUpdate(time, delta)
    this.icon.setPosition(this.x, this.y)
  }
}
