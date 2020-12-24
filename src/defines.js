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
}

const GameEvents = {
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
  EXPIRED: 'expired'
}

const MonsterStates = {
  ALIVE: 'alive',
  DEAD: 'dead',
}

export {
  DefaultKeys,
  GameEvents,
  PortalStates,
  MonsterStates,
}