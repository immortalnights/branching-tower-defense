'use strict'

import Phaser from 'phaser'
import { GameEvents, MonsterStates } from '../defines'


export default class Walker extends Phaser.GameObjects.Arc {
  constructor(scene, path)
  {
    super(scene, path.getEndPoint().x, path.getEndPoint().y, 10)

    Object.assign(this, Phaser.GameObjects.Components.PathFollower)

    this.setPath(path)
    this.setStrokeStyle(2, 0x662222, 1)

    this.setState(MonsterStates.ALIVE)
    this.setData({
      stabilityDamage: 2,
      attackPlayer: false,
    })

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      this.startFollow({
        duration: 3000, // TODO
        positionOnPath: true,
        rotateToPath: true,
        onComplete: () => {
          // This is sometimes called when the enemy is killed, so only reduce
          // the players life if the enemy is active.
          if (this.active)
          {
            if (this.emitter)
            {
              this.emitter.remove()
            }

            let stability = scene.exitPortal.getData('stability')
            if (this.state === MonsterStates.DEAD)
            {
              stability += this.getData('stabilityDamage')
            }
            else
            {
              stability -= this.getData('stabilityDamage')
            }

            scene.exitPortal.setData('stability', Phaser.Math.Clamp(stability, -100, 100))

            // TODO monsters don't die when reaching the core, they attack it
            // causing core damage per second
            this.destroy()
          }
        }
      })
    })

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
    })
  }

  isAlive()
  {
    return this.active && this.state !== MonsterStates.DEAD
  }

  takeDamage(amount)
  {
    this.kill()
  }

  kill()
  {
    this.setState(MonsterStates.DEAD)
    this.emit(GameEvents.MONSTER_KILLED, this)
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
