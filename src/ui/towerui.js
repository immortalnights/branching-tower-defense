'use strict'

import Phaser from 'phaser'
import Button from './button'
import { DefaultKeys, GameEvents } from '../defines'
import towerTypes from '../towers.json'

export default class TowerUI extends Phaser.GameObjects.Container {
  constructor(scene, tower)
  {
    super(scene, tower.x, tower.y)

    const width = 184
    const height = 64

    this.setSize(width, height)
    this.setInteractive()

    const bindings = this.scene.input.keyboard.addKeys({
      close: Phaser.Input.Keyboard.KeyCodes[DefaultKeys.CLOSE_DIALOG],
      buildThermal: Phaser.Input.Keyboard.KeyCodes[DefaultKeys.BUILD_THERMAL],
      buildElectrical: Phaser.Input.Keyboard.KeyCodes[DefaultKeys.BUILD_ELECTRICAL],
      buildCold: Phaser.Input.Keyboard.KeyCodes[DefaultKeys.BUILD_COLD],
      buildCorrosive: Phaser.Input.Keyboard.KeyCodes[DefaultKeys.BUILD_CORROSIVE],
      buildEnhancer: Phaser.Input.Keyboard.KeyCodes[DefaultKeys.BUILD_ENHANCER],
    })

    bindings.close.on('up', () => {
      this.scene.events.emit(GameEvents.TOWER_BUILD_CLOSE)
    })

    this.tower = tower

    this.border = new Phaser.GameObjects.Rectangle(scene, 0, 0, width, height)
    this.border.setFillStyle(0x000000, 0.75)
    this.border.setStrokeStyle(1, 0x444444, 1)
    this.add(this.border)

    const onBuild = function(tower, type) {
      this.events.emit(GameEvents.TOWER_BUILD, tower, type)
      this.events.emit(GameEvents.TOWER_BUILD_CLOSE)
    }

    // buttons
    // this.buttons = []
    const buttonWidth = 32
    const buttonHeight = 26
    let buttonX = -(width / 2) + (buttonWidth / 2) + 4
    let buttonY = -(height / 2) + (buttonHeight / 2) + 4
    towerTypes.forEach((type, index) => {
      const towerOnBuild = onBuild.bind(this.scene, this.tower, { ...type })

      const btn = new Button(scene, buttonX, buttonY, type.displayName, {
        width: buttonWidth,
        height: buttonHeight,
        onClick: (pointer, localX, localY, event) => {
          towerOnBuild()
        }
      })
      this.add(btn)

      buttonX += buttonWidth + 4

      bindings["build" + type.id].on('up', () => {
        towerOnBuild()
      })
    })

    // Cancel button
    const cancelButton = new Button(scene, 0, 16, "Cancel", () => {
      this.scene.events.emit(GameEvents.TOWER_BUILD_CLOSE)
    })
    this.add(cancelButton)

    this.once(Phaser.GameObjects.Events.ADDED_TO_SCENE, (obj, scene) => {
    })

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      Object.keys(bindings).forEach(name => {
        bindings[name].off('up')
      })
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
