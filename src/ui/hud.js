'use strict'

import Phaser from 'phaser'
import TowerConstructionMenu from './towerui'
import CountdownTimer from './countdowntimer'
import PortalOverview from './portaloverview'
import PortalStability from './portalstability'
import { GameEvents } from '../defines'


class DataValueDisplay extends Phaser.GameObjects.Container {
  constructor(scene, x, y, obj, property, formatter)
  {
    super(scene, x, y)

    const text = new Phaser.GameObjects.Text(scene, 0, 0, "")
    text.setOrigin(0.5, 0.5)
    this.add(text)

    // handle GameObjects and Game/Scenes
    const ee = obj.events ? obj.events : obj
    const dm = obj.registry ? obj.registry : obj.data

    const eventName = 'changedata-' + property
    const fn = (obj, val) => {
      text.setText(formatter(val))
    }

    ee.on(eventName, fn)

    this.on('destroy', () => {
      ee.off(eventName, fn)
    })

    text.setText(formatter(dm.get(property)))
  }
}


export default class HUD extends Phaser.Scene {
  constructor(config)
  {
    super({ ...config, key: 'ui' })
  }

  init()
  {
    console.log("HUD.init")
  }

  create()
  {
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
          towerUI = new TowerConstructionMenu(this, tower)
          this.add.existing(towerUI)
        }
      },
    }

    this.input.on('pointerdown', () => {
      sceneEventHandlers[GameEvents.TOWER_BUILD_CLOSE]()
    })

    const countdownTimer = new CountdownTimer(this, width / 2, 25)
    this.add.existing(countdownTimer)

    const locationLabel = new DataValueDisplay(this, width - 100, 20, this.game, 'location', val => {
      return `Location: ${val.toFixed(0)}`
    })
    this.add.existing(locationLabel)

    const portalOverview = new PortalOverview(this, width / 2, height - 200)
    this.add.existing(portalOverview)

    // local player details
    const localPlayer = this.scene.get('game').localPlayer

    const materialsLabel = new DataValueDisplay(this, width / 2 - 100, height - 160, localPlayer, 'materials', val => {
      return `Materials: ${val.toFixed(0)}`
    })
    this.add.existing(materialsLabel)

    const technologyLevelLabel = new DataValueDisplay(this, width / 2 + 100, height - 160, localPlayer, 'technologylevel', val => {
      return `Technology Level: ${val.toFixed(0)}`
    })
    this.add.existing(technologyLevelLabel)

    const portalStability = new PortalStability(this, width / 2, height - 100)
    this.add.existing(portalStability)

    const eventNames = Object.keys(sceneEventHandlers)
    eventNames.forEach(name => this.events.on(name, sceneEventHandlers[name]))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventNames.forEach(name => this.events.off(name))
    })
  }
}
