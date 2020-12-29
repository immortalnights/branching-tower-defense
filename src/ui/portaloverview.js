'use strict'

import Phaser from 'phaser'
import { GameEvents, PortalStates } from '../defines'


const ACTIVE_COLOR = 0xFFD700
const EXPIRED_COLOR = 0x222222

export default class PortalOverview extends Phaser.GameObjects.Container {
  constructor(scene, x, y)
  {
    super(scene, x, y)

    const width = 300
    const height = 64

    this.setSize(width, height)

    this.border = new Phaser.GameObjects.Rectangle(scene, 0, 0, width, height)
    this.border.setFillStyle(0x000000, 0)
    this.border.setStrokeStyle(1, 0x111111, 0)
    this.add(this.border)

    const updateIcon = function(portal, icon) {
      console.log("portal state", arguments)
      switch (portal.state)
      {
        case PortalStates.WAITING:
        {
          icon.setStrokeStyle(1, EXPIRED_COLOR, 1)
          break
        }
        case PortalStates.BRANCHING:
        {
          break
        }
        case PortalStates.WAVE_COUNTDOWN:
        case PortalStates.SPAWNING:
        case PortalStates.WAVE_COOLDOWN:
        {
          icon.setStrokeStyle(1, ACTIVE_COLOR, 1)
          break
        }
        case PortalStates.EXPIRED:
        {
          icon.setStrokeStyle(1, EXPIRED_COLOR, 1)
          break
        }
      }
    }

    const iconWidth = 36
    const iconPadding = 8
    const portals = this.scene.scene.get('game').portals.getChildren()
    let iconX = ((iconWidth + iconPadding) / 2) + -((iconWidth + iconPadding) * (portals.length / 2))
    portals.forEach((portal, index) => {
      const portalIcon = new Phaser.GameObjects.Rectangle(scene, iconX, 0, iconWidth, 36)
      portalIcon.setFillStyle(0x000000, 0.75)

      updateIcon(portal, portalIcon)

      this.add(portalIcon)

      // FIXME add this handler once and update the specific icon for the portal
      portal.on(GameEvents.PORTAL_STATE_CHANGED, updateIcon.bind(null, portal, portalIcon))

      portal.once(Phaser.GameObjects.Events.DESTROY, obj => {
        obj.off(GameEvents.PORTAL_STATE_CHANGED)
      })

      iconX = iconX + iconWidth + iconPadding
    })
  }
}