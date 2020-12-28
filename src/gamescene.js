'use strict'

import Phaser from 'phaser'
import Ship from './ship'
import Portal from './portal'
import ExitPortal from './exitportal'
import { DefaultKeys, GameEvents, PortalStates } from './defines'


export default class Game extends Phaser.Scene {
  constructor(config)
  {
    super({
      ...config,
      key: 'game',
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      },
    })
  }

  init(options)
  {
    const { width, height } = this.sys.game.canvas

    console.log(options)

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

    const sceneEventHandlers = {
      [GameEvents.EXIT_PORTAL_ACTIVATED]: exitPortal => {
        const player = this.localPlayer.toJSON()

        this.scene.restart({ player })
      },

      [GameEvents.PORTAL_EXPIRED]: portal => {
        const portals = this.portals.getChildren()

        // if all portals have expired; open the level portal
        let complete = portals.every(p => p.state === PortalStates.EXPIRED)
        if (complete)
        {
          this.exitPortal.setStrokeStyle(2, 0x228822, 1)
        }

        this.localPlayer.incData('materials', 100)
      },

      [GameEvents.TOWER_BUILD]: (tower, type) => {
        const techLevel = this.localPlayer.getData('technologylevel')
        const materials = this.localPlayer.getData('materials')

        if (techLevel >= type.requiredTechnologyLevel && materials >= type.requiredMaterials)
        {
          this.localPlayer.incData('materials', -type.requiredMaterials)
          tower.build(type)
        }
      },

      [GameEvents.MONSTER_KILLED]: monster => {
        const value = monster.getData('materialValue')
        this.localPlayer.incData('materials', value)
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

  create(options)
  {
    const { width, height } = this.sys.game.canvas

    console.log("create", options)

    // accelerate decelerate
    this.bindings = this.input.keyboard.addKeys(DefaultKeys)

    this.localPlayer = new Ship(this, width / 2 - 100, height / 2)
    this.physics.add.existing(this.localPlayer)
    this.add.existing(this.localPlayer)
    this.localPlayer.fromJSON(options.player)

    this.projectiles = this.physics.add.group()

    this.exitPortal = new ExitPortal(this, width / 2, height / 2 - 5)
    this.add.existing(this.exitPortal)

    this.portals = this.add.group()
    this.towers = this.add.group()
    this.monsters = this.physics.add.group()

    const PORTAL_COUNT = 2
    for (let i = 0; i < PORTAL_COUNT; i++)
    {
      const portal = new Portal(this, new Phaser.Math.Vector2(width / 2, height / 2))
      this.portals.add(portal, true)
    }

    this.physics.add.collider(this.projectiles, this.monsters, (projectile, monster) => {
      if (monster.isAlive() && projectile.active)
      {
        monster.takeDamage(projectile.getData('damage'))
        projectile.destroy()
      }
    }, (projectile, monster) => monster.isAlive())

    // Launch the UI scene once all the game objects are initialized
    this.scene.launch('ui')
    this.debugText = this.add.text(0, 0, ``)

    // testing
    setTimeout(() => {
      // have to wait for the hub scene to start...
      this.countdown = this.time.addEvent({
        delay: 10000,
        callback: () => {
          console.log("Level countdown completed")
          this.events.emit(GameEvents.END_COUNTDOWN, this.countdown)

          const portals = this.portals.getChildren()
          portals.forEach(portal => {
            portal.setState(PortalStates.WAVE_COOLDOWN)
          })
        },
        args: []
      })
      this.events.emit(GameEvents.START_COUNTDOWN, this.countdown)
    }, 1000)
  }

  update(time, delta)
  {
    const pointer = this.input.activePointer

    const targetAngle = Phaser.Math.Angle.BetweenPoints(this.localPlayer, pointer)
    const nextAngle = Phaser.Math.Angle.RotateTo(this.localPlayer.rotation, targetAngle, 0.1)
    this.localPlayer.rotation = nextAngle
    this.debugText.setText(`${this.localPlayer.rotation.toFixed(2)}, ${this.localPlayer.body.velocity.x.toFixed(2)}, ${this.localPlayer.body.velocity.y.toFixed(2)}, ${this.projectiles.getChildren().length}`)

    // handle player controls
    let firing = false
    if (pointer.isDown && pointer.button === 0)
    {
      this.localPlayer.tryFire(pointer, time, delta)
    }

    let acceleration = { x: 0, y: 0 }

    if (this.bindings.ACCELERATE.isDown || this.bindings.ACCELERATE_ALT.isDown)
    {
      acceleration.y = -200
      // this.physics.velocityFromRotation(this.localPlayer.rotation, 200, this.localPlayer.body.acceleration)
    }
    else if (this.bindings.DECELERATE.isDown || this.bindings.DECELERATE_ALT.isDown)
    {
      acceleration.y = 200
      // this.physics.velocityFromRotation(this.localPlayer.rotation + Math.PI, 200, this.localPlayer.body.acceleration)
    }

    if (this.bindings.STRAFE_RIGHT.isDown || this.bindings.STRAFE_RIGHT_ALT.isDown)
    {
      acceleration.x = 200
      // this.physics.velocityFromRotation(this.localPlayer.rotation + (Math.PI / 2), 200, this.localPlayer.body.acceleration)
    }
    else if (this.bindings.STRAFE_LEFT.isDown || this.bindings.STRAFE_LEFT_ALT.isDown)
    {
      acceleration.x = -200
      // this.physics.velocityFromRotation(this.localPlayer.rotation - (Math.PI / 2), 200, this.localPlayer.body.acceleration)
    }

    this.localPlayer.body.setAcceleration(acceleration.x, acceleration.y)

    // this.upateActiveTower()
  }

  updateActiveTower()
  {
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

      const distance = Phaser.Math.Distance.BetweenPoints(this.localPlayer, tower)
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

