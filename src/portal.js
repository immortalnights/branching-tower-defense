'use strict'

import Phaser from 'phaser'
import Tower from './tower'
import Walker from './enemies/walker'
import { GameEvents, PortalStates } from './defines'

const PortalActiveStates = [PortalStates.WAVE_COUNTDOWN, PortalStates.SPAWNING, PortalStates.WAVE_COOLDOWN]


const PortalConfiguration = {
  pathSegments: 6,
  threatLevel: 1,
  maximumTechnologyLevel: 1
}


const getThreatLevelName = threatLevel => {
  return "Unknown"
}


export default class Portal extends Phaser.GameObjects.Graphics {
  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.Math.Vector2D} origin - start point for the path
   * @param {PortalConfiguration} - portal configuration
   */
  constructor(scene, origin, config)
  {
    super(scene)

    config = Object.assign({}, PortalConfiguration, config)
    console.log("Portal config", config)

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

    const totalWaves = 1 + config.threatLevel
    console.log(`Portal threat ${config.threatLevel}, waves ${totalWaves}`)

    // TODO pick better wave / monster counts
    this.setState(PortalStates.WAITING)
    this.setData({
      threatLevel: config.threatLevel,
      threat: getThreatLevelName(config.threatLevel),
      // total waves
      totalWaves,
      // total monsters
      totalMonsters: undefined,
      // wave count
      wave: 0,
      // next wave or spwan time
      nextEventAt: 0,
      // monsters spawned this wave
      spawnedForWave: 0,
      // total monsters spawned
      spawned: 0,
    })

    // FIXME better name!
    const groupTypes = [
      {
        type: 'Default',
        monsterType: 'Walker',
        monsterMultiplier: 4,
        healthMultiplier: 1,
        speedMultiplier: 1,
        delay: 2000
      },
      {
        type: 'Many, weaker',
        monsterType: 'Walker',
        monsterMultiplier: 12,
        healthMultiplier: 0.75,
        speedMultiplier: 0.75,
        delay: 2500
      },
      {
        type: 'Many, fast, but weak',
        monsterType: 'Walker',
        monsterMultiplier: 8,
        healthMultiplier: 0.25,
        speedMultiplier: 4,
        delay: 3000
      },
      {
        type: 'Slower and stronger',
        monsterType: 'Walker',
        monsterMultiplier: 4,
        healthMultiplier: 4,
        speedMultiplier: 2,
        delay: 4000
      },
      {
        type: 'Very slow, very strong',
        monsterType: 'Walker',
        monsterMultiplier: 2,
        healthMultiplier: 10,
        speedMultiplier: 0.25,
        delay: 5000
      }
    ]

    const weightedValue = (base, threat) => {
      return Math.ceil(base * (1 + ~~(Math.pow(Phaser.Math.RND.frac(), 2) * (threat) + 0.5)))
    }

    this.waveSettings = []
    let totalMonsters = 0
    for (let w = 0; w < totalWaves; w++)
    {
      const groupType = Phaser.Math.RND.weightedPick(groupTypes)

      // time between each wave (first wave begins when the level countdown expires)
      const delay = Phaser.Math.RND.between(1500, groupType.delay)
      // monsters stats for wave
      const monsters = weightedValue(groupType.monsterMultiplier, config.threatLevel)
      const healthMultiplier = weightedValue(groupType.healthMultiplier, config.threatLevel)
      const speedMultiplier = weightedValue(groupType.speedMultiplier, config.threatLevel)
      // time between each monster
      const spawnDelay = Phaser.Math.RND.between(200, ((groupType.delay * 4) / 100))

      const waveSettings = {
        delay,
        monsters,
        modifiers: {
          healthMultiplier,
          speedMultiplier,
        },
        spawnDelay,
      }

      console.log(`Wave ${w} for threat ${config.threatLevel}, ${groupType.type}:`, waveSettings)
      this.waveSettings.push(waveSettings)

      totalMonsters += waveSettings.monsters
    }

    this.setData({ totalMonsters })

    // TODO - plot incrementally over time for a better effect
    this.plotPath(config.pathSegments)

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

  isAlive()
  {
    return this.active && PortalActiveStates.includes(this.state)
  }

  // start spawning
  activate()
  {
    this.setState(PortalStates.SPAWNING)
  }

  setState(state)
  {
    const previous = this.state
    super.setState(state)

    if (this.state === PortalStates.WAVE_COUNTDOWN)
    {
      this.emit(GameEvents.PORTAL_ACTIVATED, this)
    }
    else if (this.state === PortalStates.EXPIRED)
    {
      this.emit(GameEvents.PORTAL_EXPIRED, this)
    }

    this.emit(GameEvents.PORTAL_STATE_CHANGED, this, this.state, previous)
  }

  preUpdate(time, delta)
  {
    const currentWave = this.getData('wave')
    const waveSettings = this.waveSettings[currentWave]

    switch (this.state)
    {
      case PortalStates.BRANCHING:
      {
        break
      }
      case PortalStates.WAITING:
      {
        break
      }
      case PortalStates.WAVE_COUNTDOWN:
      {
        if (time > this.getData('nextEventAt'))
        {
          this.setState(PortalStates.SPAWNING)
          this.setData({
            nextEventAt: 0
          })
        }
        break
      }
      case PortalStates.SPAWNING:
      {
        if (time > this.getData('nextEventAt'))
        {
          const monster = new Walker(this.scene, this.path, waveSettings.modifiers)
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

          monster.once(Phaser.GameObjects.Events.DESTROY, obj => {
            if (obj.emitter)
            {
              obj.emitter.remove()
            }
          })

          this.monsters.add(monster)
          this.scene.monsters.add(monster, true)

          this.incData('spawned')
          this.incData('spawnedForWave')

          // Is the wave complete?
          if (this.getData('spawnedForWave') < waveSettings.monsters)
          {
            // No, continue spawning monsters
            this.setData('nextEventAt', time + waveSettings.spawnDelay)
          }
          else
          {
            console.log(`Portal has spawned all wave monsters`)

            // Are all waves complete?
            if (currentWave < (this.getData('totalWaves') - 1))
            {
              // No, wait for the next wave to start
              const nextWave = currentWave + 1
              const nextWaveTime = time + this.waveSettings[nextWave].delay

              this.setState(PortalStates.WAVE_COUNTDOWN)
              this.setData({
                wave: nextWave,
                nextEventAt: nextWaveTime,
                spawnedForWave: 0
              })

              console.log(`Next wave in ${((nextWaveTime - time) / 1000).toFixed(2)}s`)
            }
            else
            {
              this.setState(PortalStates.WAVE_COOLDOWN)
            }
          }
        }
        break
      }
      case PortalStates.WAVE_COOLDOWN:
      {
        if (this.monsters.getChildren().length == 0)
        {
          console.log("Portal has expired")
          this.setState(PortalStates.EXPIRED)
          this.emit(GameEvents.PORTAL_EXPIRED, this)
          this.scene.events.emit(GameEvents.PORTAL_EXPIRED, this)
          this.redraw()
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

    if (this.state !== PortalStates.BRANCHING)
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

      if (this.state === PortalStates.EXPIRED)
      {
        this.strokeRect(...rect)
      }
      else
      {
        this.fillRect(...rect)
      }
    }
  }

  plotPath(totalPoints)
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
      angle = Phaser.Math.RND.realInRange(...angle)

      const next = new Phaser.Math.Vector2(origin)
      // console.log(`From ${next.x}, ${next.y} at ${angle} for ${length}`)
      next.setAngle(angle)
      next.setLength(length)
      // console.log("Add", next.x, next.y)
      next.add(origin)

      return next
    }

    for (let i = 0; i < totalPoints; i++)
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