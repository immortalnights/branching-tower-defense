'use strict'

import Phaser from 'phaser'


export default class PortalStability extends Phaser.GameObjects.Container {
  constructor(scene, x, y)
  {
    super(scene, x, y)

    const width = 300
    const height = 84

    this.setSize(width, height)
    // this.setInteractive()

    this.border = new Phaser.GameObjects.Rectangle(scene, 0, 0, width, height)
    this.border.setFillStyle(0x000000, 0.75)
    this.border.setStrokeStyle(1, 0x111111, 1)
    this.add(this.border)

    const label = new Phaser.GameObjects.Text(scene, 0, -(height / 2) + 5, "Portal Stability")
    label.setOrigin(0.5, 0)
    this.add(label)

    const barMaxWidth = width - 20
    const barMinWidth = 10
    const barHeight = 20
    const stabilityBarBorder = new Phaser.GameObjects.Rectangle(scene, 0, -2, barMaxWidth, barHeight + 8)
    stabilityBarBorder.setStrokeStyle(1, 0x444444, 1)
    this.add(stabilityBarBorder)

    const stabilityBar = new Phaser.GameObjects.Rectangle(scene, 0, -2, barMinWidth, barHeight)
    stabilityBar.setFillStyle(0x444444, 0.9)
    this.add(stabilityBar)

    const stabilityPercentage = new Phaser.GameObjects.Text(scene, 0, barHeight + 2, "0%")
    stabilityPercentage.setOrigin(0.5, 0.5)
    this.add(stabilityPercentage)

    let change = 1

    // Testing
    // setInterval(() => {
    //   let s = this.getData('stability')
    //   if (s === 25)
    //   {
    //     change = -1
    //   }

    //   if (s === -25)
    //   {
    //     change = 1
    //   }

    //   this.incData('stability', change)
    // }, 50)

    const update = val => {
      let w = Math.max(Math.abs((barMaxWidth / 2) * (val / 100)), barMinWidth)
      stabilityBar.width = w

      if (val > 5)
      {
        // Good
        stabilityBar.setFillStyle(0x44FF44, 0.9)
        stabilityBar.x = 0
      }
      else if (val < -5)
      {
        // Bad
        stabilityBar.setFillStyle(0xFF4444, 0.9)
        // stabilityBar.setOrigin()
        stabilityBar.x = 10 - w
      }
      else
      {
        stabilityBar.setFillStyle(0x444444, 0.9)
      }

      stabilityPercentage.setText(`${val.toFixed(0)}%`)
    }

    this.on(Phaser.GameObjects.Events.ADDED_TO_SCENE, () => {
      const exitPortal = this.scene.scene.get('game').exitPortal

      exitPortal.on('changedata-stability', (obj, val, previous) => {
        update(val)
      })

      this.scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
        exitPortal.off('changedata-stability')
      })

      update(exitPortal.getData('stability'))
    })
  }
}