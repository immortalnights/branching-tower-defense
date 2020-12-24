'use strict'

import Phaser from 'phaser'
import Button from './button'


export default class TowerUI extends Phaser.GameObjects.Container {
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
