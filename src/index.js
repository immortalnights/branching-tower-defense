'use strict'

import Phaser from 'phaser';

const UI_DEPTH = 1000
const PLAYER_DEPTH = 100

const GameEvents = {
  PORTAL_EXPIRED: 'portal:expired',
  MONSTER_KILLED: 'monster:killed',
  TOWER_SELECT: 'tower:select',
  TOWER_BUILD: 'tower:build',
}

class Projectile extends Phaser.GameObjects.Arc {
  constructor(scene, x, y, radius)
  {
    super(scene, x, y, radius)
    this.setFillStyle(0xBBBBBB, 1)

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      // this.body.setVelocity(200, 200)
    })
  }
}


class Ship extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y)
  {
    super(scene, { x, y })
    this.setDepth(PLAYER_DEPTH)

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
    const p = new Projectile(this.scene, this.x, this.y, 2)
    this.scene.projectiles.add(p, true)
    this.projectiles.add(p)
    this.scene.physics.velocityFromRotation(this.rotation, 200, p.body.velocity)
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
      state: '',
      coreDamagePerSecond: '',
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

  takeDamage(amount)
  {
    this.kill()
  }

  kill()
  {
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
    this.setDepth(UI_DEPTH)
    this.setSize(64, 64)
    this.setInteractive()

    this.tower = tower

    this.gfx = new Phaser.GameObjects.Graphics(scene, { x: -32, y: -32 })
    this.add(this.gfx)

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
      }
    ]

    // buttons
    // this.buttons = []
    let buttonX = 0
    let buttonY = 0
    towerTypes.forEach((type, index) => {
      buttonX = -19 + (index % 2 === 0 ? 4 : 34)
      buttonY = -19 + (4 + (30 * Math.floor(index / 2)))

      const rect = new Phaser.GameObjects.Rectangle(scene, buttonX, buttonY, 26, 26)
      rect.setInteractive()
      rect.setStrokeStyle(1, 0x444444, 1)

      rect.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation()
        this.scene.events.emit(GameEvents.TOWER_BUILD, this.tower, type.id)
      })

      rect.on('pointerover', () => {
        rect.setStrokeStyle(1, 0x4444FF, 1)
      })

      rect.on('pointerout', () => {
        rect.setStrokeStyle(1, 0x444444, 1)
      })

      this.add(rect)

      const label = new Phaser.GameObjects.Text(scene, buttonX, buttonY, type.displayName)
      label.setOrigin(0.5, 0.5)
      this.add(label)
    })

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
      this.draw()
    })

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
    })

    this.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation()
    })
  }

  draw(overX, overY)
  {
    this.gfx.clear()

    this.gfx.setDepth(UI_DEPTH + 1)
    this.gfx.lineStyle(1, 0x444444, 1)
    this.gfx.fillStyle(0x000000, 0.8)
    this.gfx.fillRect(0, 0, 64, 64)
    this.gfx.strokeRect(0, 0, 64, 64)
  }
}

class Tower extends Phaser.GameObjects.Container {
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
      this.scene.events.emit(GameEvents.TOWER_SELECT, this)
    })


    const selectionArc = new Phaser.GameObjects.Arc(scene, 0, 0, 14)
    selectionArc.setStrokeStyle(2, 0xDDDDDD, 1)
    selectionArc.setVisible(false)
    this.add(selectionArc)

    this.on('changedata-color', (obj, val, previous) => {
      arc.setStrokeStyle(2, val, 1)
    })

    this.on('changedata-active', (obj, val, previous) => {
      selectionArc.setVisible(val)
    })
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
    }

    this.setData({ color })
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
              state: Portal.States.WAVE_COOLDOWN,
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
        else
        {
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

    // handle portal events
    this.events.off()

    // if all portals have expired; open the level portal
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

    // tower events
    let towerUI = null
    this.input.on('pointerdown', () => {
      if (towerUI)
      {
        towerUI.destroy()
        towerUI = null
      }
    })

    this.events.on(GameEvents.TOWER_SELECT, tower => {
      if (towerUI != null)
      {
        towerUI.destroy()
        towerUI = null
      }

      towerUI = new TowerUI(this, tower)
      this.add.existing(towerUI)
    })

    this.events.on(GameEvents.TOWER_BUILD, (tower, type) => {
      if (towerUI)
      {
        towerUI.destroy()
      }

      tower.build(type)
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
    this.bindings = this.input.keyboard.addKeys({
      ACCELERATE: 'W',
      DECELERATE: 'S',
      STRAFE_RIGHT: 'D',
      STRAFE_LEFT: 'A',
      ACCELERATE_ALT: 'UP',
      DECELERATE_ALT: 'DOWN',
      STRAFE_RIGHT_ALT: 'RIGHT',
      STRAFE_LEFT_ALT: 'LEFT',
    })

    this.playerShip = new Ship(this, 80, 80)
    this.physics.add.existing(this.playerShip)
    this.add.existing(this.playerShip)

    this.projectiles = this.physics.add.group()

    this.portals = this.add.group()
    this.towers = this.add.group()
    this.monsters = this.physics.add.group()

    const PORTAL_COUNT = 6
    for (let i = 0; i < PORTAL_COUNT; i++)
    {
      const portal = new Portal(this, new Phaser.Math.Vector2(width / 2, height / 2))
      this.portals.add(portal, true)
    }

    this.physics.add.collider(this.projectiles, this.monsters, (projectile, monster) => {
      monster.takeDamage(projectile.getData('damage'))
      projectile.destroy()
    })

    this.debugText = this.add.text(0, 0, ``)
  }

  update()
  {
    const pointer = this.input.activePointer

    const targetAngle = Phaser.Math.Angle.BetweenPoints(this.playerShip, pointer)
    const nextAngle = Phaser.Math.Angle.RotateTo(this.playerShip.rotation, targetAngle, 0.1)
    this.playerShip.rotation = nextAngle
    this.debugText.setText(`${this.playerShip.rotation.toFixed(2)}, ${this.playerShip.body.velocity.x.toFixed(2)}, ${this.playerShip.body.velocity.y.toFixed(2)}`)

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
  scene: Game,
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
