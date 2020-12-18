'use strict'

import Phaser from 'phaser';


const GameEvents = {
  PORTAL_EXPIRED: 'portalexpired'
}


class Walker extends Phaser.GameObjects.PathFollower {
  constructor(scene, path)
  {
    super(scene, path, path.getEndPoint().x, path.getEndPoint().y, '', '')
    this.setSize(10, 10)

    this.setData({
      state: '',
      coreDamagePerSecond: '',
      attackPlayer: false,
    })

    this.icon = new Phaser.GameObjects.Arc(scene, this.x, this.y, 10, undefined, undefined, 0x660000)
    this.icon.setActive(false).setVisible(false)

    this.on(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      scene.add.existing(this.icon)
      this.icon.setActive(true).setVisible(true)

      this.startFollow({
        duration: 3000, // TODO
        positionOnPath: true,
        rotateToPath: true,
        onComplete: () => {
          // This is sometimes called when the enemy is killed, so only reduce
          // the players life if the enemy is active.
          if (this.active)
          {
            // TODO monsters don't die when reaching the core, they attack it
            // causing core damage per second
            this.destroy()
          }
        }
      })

    })

    this.on(Phaser.GameObjects.Events.DESTROY, () => {
      this.icon.destroy()
    })
  }

  postUpdate(time, delta)
  {
    super.postUpdate(time, delta)
    this.icon.setPosition(this.x, this.y)
  }
}


class Portal extends Phaser.GameObjects.Graphics {
  constructor(scene, origin)
  {
    super(scene)

    // represents the path
    this.path = new Phaser.Curves.Path(origin.x, origin.y)
    // represents the spawner (currently a circle at the end of the line)
    // this.icon = undefined
    // spawned "monsters" are added to this group
    this.monsters = new Phaser.GameObjects.Group(scene)

    // TODO pick better wave / monster counts
    this.setData({
      state: Portal.States.WAVE_COUNTDOWN,
      points: 6,
      threat: "Unknown",
      // total waves
      totalWaves: 2,
      // total monsters
      totalMonsters: 12,
      // wave count
      wave: 0,
      // next wave time (would not be set by default)
      nextWaveAt: scene.game.getTime() + 3000,
      // monsters per wave
      waveMonsters: 6,
      // monsters spawned this wave
      spawnedForWave: 0,
      // total mosters spawned
      spawned: 0,
    })

    // TODO - plot incrementally over time for a better effect
    this.plotPath(0)

    this.on(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      scene.add.existing(this.monsters, true)
      this.redraw()
    })

    this.on(Phaser.GameObjects.Events.DESTROY, () => {
      this.path.destroy()
      this.monsters.destroy()
    })
  }

  preUpdate(time, delta)
  {
    switch (this.getData('state'))
    {
      case Portal.States.BRANCHING:
      {
        break
      }
      case Portal.States.WAVE_COUNTDOWN:
      {
        if (time > this.getData('nextWaveAt'))
        {
          const currentWave = this.getData('wave')
          this.setData({
            state: Portal.States.SPAWNING,
            wave: currentWave + 1,
            nextSpawnAt: time + 250,
            spawnedForWave: 0
          })
        }
        break
      }
      case Portal.States.SPAWNING:
      {
        if (time > this.getData('nextSpawnAt'))
        {
          const monster = new Walker(this.scene, this.path)
          this.monsters.add(monster, true)

          this.incData('spawned')
          this.incData('spawnedForWave')

          if (this.getData('spawnedForWave') < this.getData('waveMonsters'))
          {
            this.setData('nextSpawnAt', time + 500)
          }
          else
          {
            this.setData({
              state: Portal.States.WAVE_COOLDOWN,
              nextSpawnAt: 0
            })
          }
        }
        break
      }
      case Portal.States.WAVE_COOLDOWN:
      {
        if (this.monsters.getChildren().length == 0)
        {
          if (this.getData('wave') < this.getData('totalWaves'))
          {
            this.setData({
              state: Portal.States.WAVE_COUNTDOWN,
              nextWaveAt: time + 3000
            })
          }
          else
          {
            console.log("Portal has expired")
            this.setData('state', Portal.States.EXPIRED)
            this.scene.events.emit(GameEvents.PORTAL_EXPIRED, this)
            this.redraw()
          }
        }
        break
      }
      case Portal.States.EXPIRED:
      {
        break
      }
    }
  }

  redraw()
  {
    this.clear()
    this.lineStyle(2, 0x333333, 1)
    this.path.draw(this)

    const state = this.getData('state')
    if (state !== Portal.States.BRANCHING)
    {
      const end = this.path.getStartPoint()
      const iconSize = 10
      this.lineStyle(2, 0x333333, 1)
      this.fillStyle(0x555555, 1)

      const rect = [
        end.x - iconSize / 2,
        end.y - iconSize / 2,
        iconSize,
        iconSize
      ]

      if (state === Portal.States.EXPIRED)
      {
        this.strokeRect(...rect)
      }
      else
      {
        this.fillRect(...rect)
      }
    }
  }

  plotPath()
  {
    const nextPoint = (origin, previous) => {
      let angle
      let length

      // Angle for first plot of random
      if (previous == null)
      {
        // right
        // angle = [.5, -.5]
        // left
        // angle = [Math.PI-.5, Math.PI+.5]

        // real
        angle = [-Math.PI, Math.PI]
      }
      else
      {
        // Get the angle of the previous points
        const pAngle = Phaser.Math.Angle.BetweenPoints(previous, origin)
        angle = [ pAngle - ((Math.PI * 0.25)), pAngle - (-Math.PI * 0.25) ]
      }

      length = Phaser.Math.RND.between(50, 100)
      angle = (Phaser.Math.RND.realInRange(...angle))

      const next = new Phaser.Math.Vector2()
      next.copy(origin)
      // console.log(`From ${next.x}, ${next.y} at ${angle} for ${length}`)
      next.setAngle(angle)
      next.setLength(length)
      // console.log("Add", next.x, next.y)
      next.add(origin)

      return next
    }

    for (let i = 0; i < this.getData('points'); i++)
    {
      let origin
      let previous
      if (this.path.curves.length === 0)
      {
        origin = this.path.getEndPoint()
      }
      else
      {
        const last = this.path.curves[this.path.curves.length - 1]
        origin = last.getEndPoint()
        previous = last.getStartPoint()
      }

      this.path.lineTo(nextPoint(origin, previous))
    }

    // Once the path is complete reverse it, as the followers need to go toward the center
    const newOrigin = this.path.getEndPoint()
    const reversedPath = new Phaser.Curves.Path(newOrigin.x, newOrigin.y)
    for (let i = this.path.curves.length - 1; i >= 0; i--)
    {
      const curve = this.path.curves[i]
      reversedPath.lineTo(curve.getStartPoint())
    }
    this.path.destroy()
    this.path = reversedPath
  }
}

Portal.States = {
  BRANCHING: 'branching',
  WAVE_COUNTDOWN: 'countdown',
  SPAWNING: 'spawning',
  EXPIRED: 'expired'
}

class Game extends Phaser.Scene {
  constructor(config)
  {
    super(config);
  }

  init()
  {
    const { width, height } = this.sys.game.canvas

    this.events.off(GameEvents.PORTAL_EXPIRED)

    // if all portals have expired; open the portal
    let complete = false
    this.events.on(GameEvents.PORTAL_EXPIRED, portal => {
      const portals = this.portals.getChildren()
      if (!complete)
      {
        complete = portals.every(p => p.getData('state', Portal.States.EXPIRED))
        if (complete)
        {
          const exitPortal = this.add.triangle(width / 2, height / 2, 0, 32, 16, 0, 32, 32)
          exitPortal.setStrokeStyle(2, 0x228822, 1)
          exitPortal.setInteractive()
          exitPortal.on('pointerup', () => {
            this.scene.restart({})
          })
        }
      }
    })
  }

  preload()
  {
  }

  create()
  {
    const { width, height } = this.sys.game.canvas


    this.portals = new Phaser.GameObjects.Group(this)
    this.monsters = new Phaser.Physics.Arcade.Group(this)

    this.add.existing(this.portals)
    this.add.existing(this.monsters)

    const PORTAL_COUNT = 5
    for (let i = 0; i < PORTAL_COUNT; i++)
    {
      const spawner = new Portal(this, new Phaser.Math.Vector2(width / 2, height / 2))
      this.portals.add(spawner, true)
    }

    this.debugText = this.add.text(0, 0, ``)
  }

  testSpawnBrancher()
  {
    const { width, height } = this.sys.game.canvas

    const styles = [ 0x333333, 0x444444, 0x555555, 0x666666, 0x777777, 0x888888 ]

    const gfx = this.add.graphics()
    gfx.lineStyle(2, 0x333333, 1)

    this.path = new Phaser.Curves.Path(width / 2, height / 2)

    const plot = () => {
      let angle
      let length

      // Angle for first plot of random
      if (this.path.curves.length === 0)
      {
        // right
        // angle = [.5, -.5]
        // left
        // angle = [Math.PI-.5, Math.PI+.5]

        // real
        angle = [-Math.PI, Math.PI]
      }
      else
      {
        const previous = this.path.curves[this.path.curves.length - 1]

        // console.log("Previous points", previous.getStartPoint().x, previous.getStartPoint().y, previous.getEndPoint().x, previous.getEndPoint().y)

        // Get the angle of the previous points
        const pAngle = Phaser.Math.Angle.BetweenPoints(previous.getStartPoint(), previous.getEndPoint())
        angle = [ pAngle - ((Math.PI * 0.25)), pAngle - (-Math.PI * 0.25) ]
      }

      length = Phaser.Math.RND.between(50, 100)
      angle = (Phaser.Math.RND.realInRange(...angle))

      const next = new Phaser.Math.Vector2()
      next.copy(this.path.getEndPoint())
      // console.log(`From ${next.x}, ${next.y} at ${angle} for ${length}`)
      next.setAngle(angle)
      next.setLength(length)
      // console.log("Add", next.x, next.y)
      next.add(this.path.getEndPoint())
      this.path.lineTo(next.x, next.y)

      // gfx.clear()
      this.path.draw(gfx)
    }

    const delay = 100
    const timeout = () => {
      plot()

      if (this.path.curves.length < 6)
      {
        this.countDownTimer = this.time.delayedCall(delay, timeout)
      }
    }

    timeout()

  }

  update()
  {
    const pointer = this.input.activePointer


    // const angle = Phaser.Math.Angle.BetweenPoints(this.path.getStartPoint(), pointer)
    // this.debugText.setText(`${angle}`)
  }
}


const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: Game,
  seed: 1
};

const game = new Phaser.Game(config);
