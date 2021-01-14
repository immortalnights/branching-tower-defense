import Phaser from 'phaser'
import Tower from './tower'
import Spawner, { SPAWNER_EVENTS } from './components/spawner.js'
import Walker from './enemies/walker'
import { GameEvents, PortalStates } from './defines'

const PortalActiveStates = [PortalStates.WAVE_COUNTDOWN, PortalStates.SPAWNING, PortalStates.WAVE_COOLDOWN]


const PortalConfiguration = {
  pathSegments: 6,
  threatLevel: 1,
  maximumTechnologyLevel: 1
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

    // Apply the Spawner component, but override the spawn monster function for custom monster creation
    Object.assign(this, Spawner, {
      spawnMonster: function(config)
      {
        const obj = new Walker(this.scene, this.path, config)
        this.monsters.add(obj)
        return obj
      }
    })
    this.initializeSpawner(Walker, config.threatLevel)

    // represents the path
    this.path = new Phaser.Curves.Path(origin.x, origin.y)
    this.towers = new Phaser.GameObjects.Group(scene)
    // represents the spawner (currently a square at the end of the line)
    // this.icon = undefined

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

    console.log(`Portal threat ${config.threatLevel}, waves ${this.getData('totalWaves')}`)

    // TODO pick better wave / monster counts
    this.setState(PortalStates.WAITING)

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
    this.initializeWaves(groupTypes)

    // TODO - plot incrementally over time for a better effect
    this.plotPath(config.pathSegments)

    // Handle Spawner events
    this.on(SPAWNER_EVENTS.WAVE_COMPLETE, () => {
      this.setState(PortalStates.WAVE_COUNTDOWN)
    })

    this.on(SPAWNER_EVENTS.ALL_WAVES_COMPLETE, () => {
      this.setState(PortalStates.WAVE_COOLDOWN)
    })

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      scene.add.existing(this.towers)
      // scene.add.existing(this.monsters)
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

    // console.log(`Portal state ${previous} => ${state}`)

    this.emit(GameEvents.PORTAL_STATE_CHANGED, this, this.state, previous)
  }

  onSpawned(obj)
  {
    // Bind to 'MONSTER_KILLED' event
    obj.once(GameEvents.MONSTER_KILLED, obj => {
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

    // Remove the emitter when the Object is destroyed
    obj.once(Phaser.GameObjects.Events.DESTROY, obj => {
      if (obj.emitter)
      {
        obj.emitter.remove()
      }
    })

    this.scene.monsters.add(obj, true)
  }

  preUpdate(time, delta)
  {
    const currentWave = this.getData('wave')
    const waveSettings = this._waveSettings[currentWave]

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
      // delay before the next way
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
        // Perform time check and spawn if required
        this.spawn(time, delta)
        break
      }
      // delay before expiring the portal (wait until all monsters have been destroyed)
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

      if (this.state === PortalStates.EXPIRED)
      {
        this.fillStyle(0x000000, 1)
      }
      else
      {
        this.fillStyle(0x555555, 1)
      }

      this.fillRect(end.x - iconSize / 2, end.y - iconSize / 2, iconSize, iconSize)
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