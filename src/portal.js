'use strict'

import Phaser from 'phaser'
import Tower from './tower'
import Walker from './enemies/walker'
import { GameEvents, PortalStates } from './defines'


export default class Portal extends Phaser.GameObjects.Graphics {
  constructor(scene, origin)
  {
    super(scene)

    // represents the path
    this.path = new Phaser.Curves.Path(origin.x, origin.y)
    this.towers = new Phaser.GameObjects.Group(scene)
    // represents the spawner (currently a square at the end of the line)
    // this.icon = undefined
    // spawned "monsters" are added to this group
    this.monsters = new Phaser.GameObjects.Group(scene)

    this.particleManager = new Phaser.GameObjects.Particles.ParticleEmitterManager(scene, 'flare')
    this.exploderEmitter = this.particleManager.createEmitter({
      frequency: -1,
      speed: { min: -500, max: 500 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.05, end: 0 },
      blendMode: 'ADD',
      lifespan: 300,
      tint: 0x990000
    })

    // TODO pick better wave / monster counts
    this.setData({
      state: PortalStates.WAVE_COUNTDOWN,
      points: 8,
      threat: "Unknown",
      // total waves
      totalWaves: 6,
      // total monsters
      totalMonsters: 12,
      // wave count
      wave: 0,
      // next wave time (would not be set by default)
      nextWaveAt: scene.game.getTime() + 3000,
      // monsters per wave
      waveMonsters: 100,
      // monsters spawned this wave
      spawnedForWave: 0,
      // total monsters spawned
      spawned: 0,
    })

    // TODO - plot incrementally over time for a better effect
    this.plotPath(0)

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      scene.add.existing(this.towers)
      scene.add.existing(this.monsters)
      scene.add.existing(this.particleManager)

      // FIXME find a better place to add the towers to the scene
      this.towers.getChildren().forEach(t => {
        scene.add.existing(t)
      })

      this.redraw()
    })

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.path.destroy()
      this.towers.destroy()
      this.monsters.destroy()
      this.particleManager.destroy()
    })
  }

  preUpdate(time, delta)
  {
    switch (this.getData('state'))
    {
      case PortalStates.BRANCHING:
      {
        break
      }
      case PortalStates.WAVE_COUNTDOWN:
      {
        if (time > this.getData('nextWaveAt'))
        {
          const currentWave = this.getData('wave')
          this.setData({
            state: PortalStates.SPAWNING,
            wave: currentWave + 1,
            nextSpawnAt: time + 250,
            spawnedForWave: 0
          })
        }
        break
      }
      case PortalStates.SPAWNING:
      {
        if (time > this.getData('nextSpawnAt'))
        {
          const monster = new Walker(this.scene, this.path)
          monster.once(GameEvents.MONSTER_KILLED, obj => {
            this.exploderEmitter.setPosition(obj.x, obj.y)
            this.exploderEmitter.explode(10)

            // TODO pass the Portal or emitter to the monster and get it to do this
            obj.emitter = this.particleManager.createEmitter({
              frequency: 1,
              speed: 20,
              scale: { start: 0.05, end: 0 },
              blendMode: 'ADD',
              tint: 0x444444
            })

            obj.emitter.startFollow(obj)
          })
          this.monsters.add(monster)
          this.scene.monsters.add(monster, true)

          this.incData('spawned')
          this.incData('spawnedForWave')

          if (this.getData('spawnedForWave') < this.getData('waveMonsters'))
          {
            this.setData('nextSpawnAt', time + 500)
          }
          else
          {
            this.setData({
              state: PortalStates.WAVE_COOLDOWN,
              nextSpawnAt: 0
            })

            // TODO remove, for demonstration purposed, kill them all!
            // this.monsters.getChildren().forEach(monster => {
            //   monster.emit(GameEvents.MONSTER_KILLED, monster)
            //   monster.setVisible(false)
            // })
          }
        }
        break
      }
      case PortalStates.WAVE_COOLDOWN:
      {
        if (this.monsters.getChildren().length == 0)
        {
          if (this.getData('wave') < this.getData('totalWaves'))
          {
            this.setData({
              state: PortalStates.WAVE_COUNTDOWN,
              nextWaveAt: time + 3000
            })
          }
          else
          {
            console.log("Portal has expired")
            this.setData('state', PortalStates.EXPIRED)
            this.scene.events.emit(GameEvents.PORTAL_EXPIRED, this)
            this.redraw()
          }
        }
        else
        {
        }
        break
      }
      case PortalStates.EXPIRED:
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
    if (state !== PortalStates.BRANCHING)
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

      if (state === PortalStates.EXPIRED)
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

      const next = new Phaser.Math.Vector2(origin)
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
      let hasTower = false
      if (this.path.curves.length === 0)
      {
        origin = this.path.getEndPoint()
      }
      else
      {
        const last = this.path.curves[this.path.curves.length - 1]
        origin = last.getEndPoint()
        previous = last.getStartPoint()
        hasTower = true
      }

      const point = nextPoint(origin, previous)
      this.path.lineTo(point)

      if (hasTower)
      {
        const angle = Phaser.Math.Angle.BetweenPoints(origin, previous)
        const location = new Phaser.Math.Vector2(origin)
        const halfPI = Math.PI / 2

        if (angle > -halfPI && angle < halfPI)
        {
          location.setAngle(angle - halfPI)
        }
        else
        {
          location.setAngle(angle + halfPI)
        }

        location.setLength(20)
        location.add(origin)

        const tower = new Tower(this.scene, location.x, location.y)
        tower.setData('origin', origin.clone())

        this.scene.towers.add(tower)
        this.towers.add(tower)
      }
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