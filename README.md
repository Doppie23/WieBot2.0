# WieBot 2.0

Successor to [WieBot](https://github.com/Doppie23/WieBot).

## Features

- Points system with betting games
  - All games can be found in [`src/commands/rng/`](./src/commands/rng/)
  - Users don't automatically participate in the point system, at the moment they have to be added manually by setting a user their points to a different value then `NULL` in the database.
- Outro
  - Plays a user picked song from predefined options and kicks everyone from the voice channel when the song is finished.
  - Also keeps track of a seperate scoring system based on who was kicked last.
- Plays a random sound from [`join-sounds/`](./join-sounds/) when a user joins a voice channel.

## Patch

The patch for [`@discordjs/rest`](./patches/@discordjs+rest+2.2.0.patch) is needed for the outro command to send all requests in a single burst.
