'use strict'

const DefaultKeys = {
  ACCELERATE: 'W',
  DECELERATE: 'S',
  STRAFE_RIGHT: 'D',
  STRAFE_LEFT: 'A',
  ACCELERATE_ALT: 'UP',
  DECELERATE_ALT: 'DOWN',
  STRAFE_RIGHT_ALT: 'RIGHT',
  STRAFE_LEFT_ALT: 'LEFT',
  BUILD_THERMAL: 'ONE',
  BUILD_ELECTRICAL: 'TWO',
  BUILD_COLD: 'THREE',
  BUILD_CORROSIVE: 'FOUR',
  BUILD_ENHANCER: 'FIVE',
  CLOSE_DIALOG: 'ESC',
}

const GameEvents = {
  EXIT_PORTAL_ACTIVATED: 'level:exit',
  PORTAL_ACTIVATED: 'portal:activated',
  PORTAL_EXPIRED: 'portal:expired',
  MONSTER_KILLED: 'monster:killed',
  TOWER_SELECT: 'tower:select',
  TOWER_BUILD: 'tower:build',
  TOWER_BUILD_CLOSE: 'tower:buildclose',
}

const PortalStates = {
  BRANCHING: 'branching',
  WAVE_COUNTDOWN: 'countdown',
  SPAWNING: 'spawning',
  WAVE_COOLDOWN: 'cooldown',
  EXPIRED: 'expired',
}

const MonsterStates = {
  ALIVE: 'alive',
  DEAD: 'dead',
}

const DepthSort = {
  UI: 1000,
  PLAYER: 100,
  EXIT_PORTAL: 85,
  PORTAL: 80,
}

export {
  DefaultKeys,
  DepthSort,
  GameEvents,
  PortalStates,
  MonsterStates,
}