'use strict'

import Phaser from 'phaser'
import HUD from './ui/hud'
import Ship from './ship'
import Portal from './portal'
import ExitPortal from './exitportal'
import { DefaultKeys, GameEvents, PortalStates } from './defines'


export default class Game extends Phaser.Scene {
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

