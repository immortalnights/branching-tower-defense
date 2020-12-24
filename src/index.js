'use strict'

import Phaser from 'phaser'
import Tower from './tower'
import Projectile from './projectile'
import Button from './button'
import PortalOverviewUI from './portaloverviewui'
import { DefaultKeys, GameEvents, PortalStates, MonsterStates } from './defines'

const OBJ_DEPTH = {
  UI: 1000,
  PLAYER: 100,
  EXIT_PORTAL: 85,
  PORTAL: 80,
}

class Ship extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y)
  {
    super(scene, { x, y })
    this.setDepth(OBJ_DEPTH.PLAYER)

    this.setData({
      damage: 1,
      damageMultiplier: 1,
      bulletSpeed: 200,
    })

    // Draw sprite
    this.lineStyle(2, 0x662266, 1)
    this.beginPath()
    this.arc(0, 0, 10, 0, Math.PI * 2)
    this.moveTo(0, 0)
    this.lineTo(10, 0)
    this.closePath()
    this.strokePath()

    this.projectiles = new Phaser.GameObjects.Group()

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      this.body.setDamping(true)
      this.body.setDrag(0.01)
      this.body.setMaxVelocity(200)
    })
  }

  fire()
  {
    const p = new Projectile(this.scene, this.x, this.y, {
      baseSpeed: this.getData('bulletSpeed'),
      damage: this.getData('damage') * this.getData('damageMultiplier'),
    })
    this.scene.projectiles.add(p, true)
    this.projectiles.add(p)

    this.scene.physics.velocityFromRotation(this.rotation, p.getData('speed'), p.body.velocity)
  }

  // preUpdate()
  // {
  //   super.preUpdate()

  // }
}


class Walker extends Phaser.GameObjects.Arc {
  constructor(scene, path)
  {
    super(scene, path.getEndPoint().x, path.getEndPoint().y, 10)

    Object.assign(this, Phaser.GameObjects.Components.PathFollower)

    this.setPath(path)
    this.setStrokeStyle(2, 0x662222, 1)

    this.setData({
      state: MonsterStates.ALIVE,
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
            if (this.getData('state') === MonsterStates.DEAD)
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
    return this.active && this.getData('state') !== MonsterStates.DEAD
  }

  takeDamage(amount)
  {
    this.kill()
  }

  kill()
  {
    this.setData('state', MonsterStates.DEAD)
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


class TowerUI extends Phaser.GameObjects.Container {
  constructor(scene, tower)
  {
    super(scene, tower.x, tower.y)

    const width = 184
    const height = 64

    this.setSize(width, height)
    this.setInteractive()

    this.tower = tower

    this.border = new Phaser.GameObjects.Rectangle(scene, 0, 0, width, height)
    this.border.setFillStyle(0x000000, 0.75)
    this.border.setStrokeStyle(1, 0x444444, 1)
    this.add(this.border)

    const towerTypes = [
      {
        id: "damage1",
        name: "Damage 1",
        displayName: "1"
      },
      {
        id: "damage2",
        name: "Damage 2",
        displayName: "2"
      },
      {
        id: "damage3",
        name: "Damage 3",
        displayName: "3"
      },
      {
        id: "damage4",
        name: "Damage 4",
        displayName: "4"
      },
      {
        id: "damage4",
        name: "Damage 5",
        displayName: "5"
      }
    ]

    // buttons
    // this.buttons = []
    const buttonWidth = 32
    const buttonHeight = 26
    let buttonX = -(width / 2) + (buttonWidth / 2) + 4
    let buttonY = -(height / 2) + (buttonHeight / 2) + 4
    towerTypes.forEach((type, index) => {

      const btn = new Button(scene, buttonX, buttonY, type.displayName, {
        width: buttonWidth,
        height: buttonHeight,
        onClick: (pointer, localX, localY, event) => {
          this.scene.events.emit(GameEvents.TOWER_BUILD, this.tower, type.id)
          this.scene.events.emit(GameEvents.TOWER_BUILD_CLOSE)
        }
      })
      this.add(btn)

      buttonX += buttonWidth + 4
    })

    // Cancel button
    const cancelButton = new Button(scene, 0, 16, "Cancel", () => {
      this.scene.events.emit(GameEvents.TOWER_BUILD_CLOSE)
    })
    this.add(cancelButton)

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
    })

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
    })

    this.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation()
    })

    this.on('pointerover', (pointer, localX, localY, event) => {
      // this.border.setStrokeStyle(1, 0xFFFFFF, 1)
    })

    this.on('pointerout', (pointer, localX, localY, event) => {
      // this.border.setStrokeStyle(1, 0x444444, 1)
    })
  }
}


class Portal extends Phaser.GameObjects.Graphics {
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

class HUD extends Phaser.Scene {
  constructor(scene)
  {
    super({ ...config, key: 'ui' })
  }

  create()
  {
    // this.setDepth(OBJ_DEPTH.UI)

    const { width, height } = this.sys.game.canvas

    let towerUI = null
    const sceneEventHandlers = {
      // Tower UI events
      [GameEvents.TOWER_BUILD_CLOSE]: () => {
        if (towerUI)
        {
          // this.remove(towerUI)
          towerUI.destroy()
          towerUI = null
        }
      },

      [GameEvents.TOWER_SELECT]: tower => {
        sceneEventHandlers[GameEvents.TOWER_BUILD_CLOSE]()

        // Cannot build two weapons
        // TODO upgrade
        if (!tower.weapon)
        {
          towerUI = new TowerUI(this, tower)
          this.add.existing(towerUI)
        }
      },

      [GameEvents.TOWER_BUILD]: (tower, type) => {
        tower.build(type)
      }
    }

    this.input.on('pointerdown', () => {
      sceneEventHandlers[GameEvents.TOWER_BUILD_CLOSE]()
    })

    const portalOverview = new PortalOverviewUI(this, width / 2, height - height / 5)
    this.add.existing(portalOverview)

    const eventNames = Object.keys(sceneEventHandlers)
    eventNames.forEach(name => this.events.on(name, sceneEventHandlers[name]))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventNames.forEach(name => this.events.off(name))
    })
  }
}


class ExitPortal extends Phaser.GameObjects.Triangle {
  constructor(scene, x, y)
  {
    super(scene, x, y, 0, 32, 16, 0, 32, 32)
    this.setDepth(OBJ_DEPTH.EXIT_PORTAL)
    this.setFillStyle(0x000000, 0.9)
    this.setStrokeStyle(2, 0x111111, 1)

    this.setData('stability', 0)

    this.setInteractive()
    this.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation()

      const portals = this.scene.portals.getChildren()
      if (portals.every(p => p.getData('state') === PortalStates.EXPIRED))
      {
        this.scene.scene.restart({})
      }
    })
  }
}


class Game extends Phaser.Scene {
  constructor(config)
  {
    super({ ...config, key: 'game' })
  }

  init()
  {
    const { width, height } = this.sys.game.canvas

    // Only need this event listener once
    this.physics.world.on('worldbounds', obj => {
      // Only objects with both `body.setCollideWorldBounds(true)` and `body.onWorldBounds = true` will call this event
      // assume it's a projectile
      obj.gameObject.destroy()
    })

    this.data.set({
      speed: 1 // game speed
    })

    this.ui = this.scene.get('ui').events

    // if all portals have expired; open the level portal
    let complete = false

    const sceneEventHandlers = {
      [GameEvents.PORTAL_EXPIRED]: portal => {
        const portals = this.portals.getChildren()
        if (!complete)
        {
          complete = portals.every(p => p.getData('state', PortalStates.EXPIRED))
          if (complete)
          {
            this.exitPortal.setStrokeStyle(2, 0x228822, 1)
            // const exitPortal = this.add.triangle(width / 2, height / 2, 0, 32, 16, 0, 32, 32)
            // exitPortal.setStrokeStyle(2, 0x228822, 1)
            // exitPortal.setInteractive()
            // exitPortal.on('pointerdown', (pointer, localX, localY, event) => {
            //   event.stopPropagation()
            //   this.scene.restart({})
            // })
          }
        }
      }
    }

    const eventNames = Object.keys(sceneEventHandlers)

    eventNames.forEach(name => this.events.on(name, sceneEventHandlers[name]))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventNames.forEach(name => this.events.off(name))
    })
  }

  preload()
  {
    this.load.image('flare', './flare_01.png')
  }

  create()
  {
    const { width, height } = this.sys.game.canvas

    // accelerate decelerate
    this.bindings = this.input.keyboard.addKeys(DefaultKeys)

    this.playerShip = new Ship(this, 80, 80)
    this.physics.add.existing(this.playerShip)
    this.add.existing(this.playerShip)

    this.projectiles = this.physics.add.group()

    this.exitPortal = new ExitPortal(this, width / 2, height / 2 - 5)
    this.add.existing(this.exitPortal)

    this.portals = this.add.group()
    this.towers = this.add.group()
    this.monsters = this.physics.add.group()

    // const hud = new HUD(this)
    // this.add.existing(hud)
    // this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      // hud.removeAllListeners()
      // hud.destroy()
    // })

    const PORTAL_COUNT = 6
    for (let i = 0; i < PORTAL_COUNT; i++)
    {
      const portal = new Portal(this, new Phaser.Math.Vector2(width / 2, height / 2))
      this.portals.add(portal, true)
    }

    this.physics.add.collider(this.projectiles, this.monsters, (projectile, monster) => {
      if (monster.isAlive())
      {
        monster.takeDamage(projectile.getData('damage'))
        projectile.destroy()
      }
    }, (projectile, monster) => monster.isAlive())

    // Launch the UI scene once all the game objects are initialized
    this.scene.launch('ui')
    this.debugText = this.add.text(0, 0, ``)
  }

  update()
  {
    const pointer = this.input.activePointer

    const targetAngle = Phaser.Math.Angle.BetweenPoints(this.playerShip, pointer)
    const nextAngle = Phaser.Math.Angle.RotateTo(this.playerShip.rotation, targetAngle, 0.1)
    this.playerShip.rotation = nextAngle
    this.debugText.setText(`${this.playerShip.rotation.toFixed(2)}, ${this.playerShip.body.velocity.x.toFixed(2)}, ${this.playerShip.body.velocity.y.toFixed(2)}, ${this.projectiles.getChildren().length}`)

    // handle player controls
    let firing = false
    if (pointer.isDown && pointer.button === 0)
    {
      this.playerShip.fire()
    }

    let acceleration = { x: 0, y: 0 }

    if (this.bindings.ACCELERATE.isDown || this.bindings.ACCELERATE_ALT.isDown)
    {
      acceleration.y = -200
      // this.physics.velocityFromRotation(this.playerShip.rotation, 200, this.playerShip.body.acceleration)
    }
    else if (this.bindings.DECELERATE.isDown || this.bindings.DECELERATE_ALT.isDown)
    {
      acceleration.y = 200
      // this.physics.velocityFromRotation(this.playerShip.rotation + Math.PI, 200, this.playerShip.body.acceleration)
    }

    if (this.bindings.STRAFE_RIGHT.isDown || this.bindings.STRAFE_RIGHT_ALT.isDown)
    {
      acceleration.x = 200
      // this.physics.velocityFromRotation(this.playerShip.rotation + (Math.PI / 2), 200, this.playerShip.body.acceleration)
    }
    else if (this.bindings.STRAFE_LEFT.isDown || this.bindings.STRAFE_LEFT_ALT.isDown)
    {
      acceleration.x = -200
      // this.physics.velocityFromRotation(this.playerShip.rotation - (Math.PI / 2), 200, this.playerShip.body.acceleration)
    }

    this.playerShip.body.setAcceleration(acceleration.x, acceleration.y)

    const ACTIVATION_RANGE = 75
    const towers = this.towers.getChildren()
    const inRange = []
    const closest = {
      distance: undefined,
      tower: undefined
    }

    towers.forEach(tower => {
      const towerActivated = tower.getData('active')
      if (towerActivated)
      {
        // deactivate the tower, in case it is no longer the closest
        // prevent the "changedata-active" event being handled on all
        // towers by only changing the previously active tower
        tower.setData('active', false)
      }

      const distance = Phaser.Math.Distance.BetweenPoints(this.playerShip, tower)
      if (distance < ACTIVATION_RANGE)
      {
        if (closest.tower == null || closest.distance > distance)
        {
          closest.tower = tower
          closest.distance = distance
        }

        inRange.push(tower)
      }
    })

    if (closest.tower)
    {
      closest.tower.setData('active', true)
    }
  }
}

const config = {
  title: "Branching Tower Defense",
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  scene: [ Game, HUD ],
  seed: 1,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  loader: {
    baseUrl: '.',
    path: process.env.NODE_ENV === 'production' ? './assets' : './src/assets'
  },
  disableContextMenu: true
};

const game = new Phaser.Game(config);
