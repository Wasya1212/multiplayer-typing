const { Room, Multiplayer } = require('../libs/multiplayer');

test('Create room', () => {
  expect((new Room('wasya1212', 'room', 'password', false, false)).name).toBe('wasya1212');
});