# Tower Defense

## Tower attribute description

*id* - Identifier.
*name* - Name.
*description* - Description.
*displayName* - Display name used in build UI.
*color* - Tower display color.
*damage* - Direct unresisted damage.
*range* - Tower attach or boost range.
*rateOfFire* - Attacks per second.
*speedModifier* - Reduce enemy movement speed. For the Enhancer tower, this applies a positive increase to the attack speed of nearby towers.
*damageModifier* - Reduce enemy damage. For the Enhancer tower, this applies a positive increase to the direct damage of nearby towers.
*resistanceModifier* - Increase or reduce enemy resistances

## Enemy attribute descriptions

*id*  - Identifier.
*name*  - Name.
*description*  - Description.
*resistances*  - Resistances.
*speed*  - Movement speed.
*damageMultiplier*  - Portal damage multiplier
*health*  - Health

## Requirements

[Node.js](https://nodejs.org) is required to install dependencies and run scripts via `npm`.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies |
| `npm start` | Build project and open web server running project |
| `npm run build` | Builds code bundle with production settings (minification, uglification, etc..) |