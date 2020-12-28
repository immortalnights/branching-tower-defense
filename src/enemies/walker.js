'use strict'

import Phaser from 'phaser'
import { GameEvents, MonsterStates } from '../defines'


export default class Walker extends Phaser.GameObjects.Arc {
  constructor(scene, path)
  {
    super(scene, path.getEndPoint().x, path.getEndPoint().y, 10)

    // Extend with components
    Object.assign(this, Phaser.GameObjects.Components.PathFollower)

    this.setPath(path)
    this.setStrokeStyle(2, 0x662222, 1)

    this.setState(MonsterStates.ALIVE)
    this.setData({
      health: 1,
      materialValue: 2,
      stabilityDamage: 2,
      attackPlayer: false,
    })

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      this.beginFollow(10000)
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
          if (this.emitter)
          {
            this.emitter.remove()
          }

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
    this.beginFollow(5000, this.pathTween.getValue())
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
