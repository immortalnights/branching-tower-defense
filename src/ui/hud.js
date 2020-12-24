'use strict'

import Phaser from 'phaser'
import PortalStability from './portalstability'
import PortalOverview from './portaloverview'
import { GameEvents } from '../defines'


export default class HUD extends Phaser.Scene {
  constructor(config)
  {
    super({ ...config, key: 'ui' })
  }

  create()
  {
    // this.setDepth(DepthSort.UI)

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

    const portalOverview = new PortalOverview(this, width / 2, height - 200)
    this.add.existing(portalOverview)

    const portalStability = new PortalStability(this, width / 2, height - 100)
    this.add.existing(portalStability)

    const eventNames = Object.keys(sceneEventHandlers)
    eventNames.forEach(name => this.events.on(name, sceneEventHandlers[name]))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventNames.forEach(name => this.events.off(name))
    })
  }
}
