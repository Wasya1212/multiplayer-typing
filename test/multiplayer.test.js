const { Room, Multiplayer } = require('../libs/multiplayer');

test('Room client', () => {
  expect(new Room('wasya1212').currentClientName).toBe('wasya1212');
});

test('Room members', () => {
  expect(new Room().members).toBeUndefined();
});

test('Room members count', () => {
  expect(new Room('wasya1212', 'room', 'password', 5).maxMembersCount).toBe(5);
});

test('Room owner', () => {
  expect(new Room('wasya1212', 'room', 'password').isOwner).toBeTruthy();
});

test('Room owner replace', () => {
  expect(new Room('wasya1212', 'room', 'password', null, false).isOwner).toBeFalsy();
});