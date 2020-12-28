'use strict'

import Phaser from 'phaser'
import TowerConstructionMenu from './towerui'
import CountdownTimer from './countdowntimer'
import PortalOverview from './portaloverview'
import PortalStability from './portalstability'
import { GameEvents } from '../defines'


class MaterialsDisplay extends Phaser.GameObjects.Container {
  constructor(scene, x, y)
  {
    super(scene, x, y)

    const formatText = materials => {
      return `Materials: ${materials.toFixed(0)}`
    }

    const text = new Phaser.GameObjects.Text(scene, 0, 0, "")
    text.setOrigin(0.5, 0.5)
    this.add(text)

    const gameScene = this.scene.scene.get('game')
    gameScene.localPlayer.on('changedata-materials', (obj, val) => {
      text.setText(formatText(val))
    })

    text.setText(formatText(gameScene.localPlayer.getData('materials')))
  }
}


export default class HUD extends Phaser.Scene {
  constructor(config)
  {
    super({ ...config, key: 'ui' })
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

    const portalOverview = new PortalOverview(this, width / 2, height - 200)
    this.add.existing(portalOverview)

    const playerInventory = new MaterialsDisplay(this, width / 2, height - 160)
    this.add.existing(playerInventory)

    const portalStability = new PortalStability(this, width / 2, height - 100)
    this.add.existing(portalStability)

    const eventNames = Object.keys(sceneEventHandlers)
    eventNames.forEach(name => this.events.on(name, sceneEventHandlers[name]))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventNames.forEach(name => this.events.off(name))
    })
  }
}
