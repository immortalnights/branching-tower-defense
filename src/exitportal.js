'use strict'

import Phaser from 'phaser'
import { GameEvents, PortalStates, DepthSort } from './defines'


export default class ExitPortal extends Phaser.GameObjects.Triangle {
  constructor(scene, x, y)
  {
    super(scene, x, y, 0, 32, 16, 0, 32, 32)
    this.setDepth(DepthSort.EXIT_PORTAL)
    this.setFillStyle(0x000000, 0.9)
    this.setStrokeStyle(2, 0x111111, 1)

    // Overwritten by game scene default
    this.setData('stability', 0)

    this.setInteractive()
    this.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation()

      const portals = this.scene.portals.getChildren()
      if (portals.every(p => p.state === PortalStates.EXPIRED))
      {
        this.scene.events.emit(GameEvents.EXIT_PORTAL_ACTIVATED, this)
      }
    })
  }
}

