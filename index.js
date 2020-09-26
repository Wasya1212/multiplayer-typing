class Room {
  currentClientName;
  name;
  password;
  members;
  maxMembersCount;


  constructor(currentClientName, name = `room-${Date.now()}`, password = '', maxMembersCount = false) {
    this.name = name;
    this.password = password;
    this.maxMembersCount = maxMembersCount;
    this.currentClientName = currentClientName;
  }
}

class Multiplayer {
  #room;
  #channel;
  #ably;
  #events = {
    connection: this.#defaultConnectionEvent,
    error: this.#defaultErrorEvent,
    disconnect: this.#defaultDisconnectEvent
  };

  userID;

  #defaultConnectionEvent({ clientId }) {
    console.log(`User:${clientId} is connected...`);
  }

  #defaultErrorEvent(error) {
    console.error(error.message);
  }

  #defaultDisconnectEvent() {
    console.log(`User:${this.userID} disconnected...`);
  }

  #subscribeEvent(eventName, callback) {
    this.#channel.subscribe(eventName, callback);
  }

  constructor(ablySecretToken, room, events = {}, connect = true) {
    if (!room || !(room instanceof Room)) {
      throw new Error("Room must be a {Room} object!");
    }

    this.#room = room;
    this.#ably = new Ably.Realtime({
      key: ablySecretToken,
      clientId: room.currentClientName
    });
    this.#events = Object.assign(this.#events, events);
    this.userID = room.currentClientName;

    connect && this.connect();
  }

  get events() {
    return Object.keys(this.#events);
  }

  get members() {
    return this.#room.members;
  }

  connect() {
    this.#channel = this.#ably.channels.get(`${this.#room.name}:${this.#room.password}`);
    this.#channel.presence.enter();

    Object.keys(this.#events).forEach(eventName => {
      this.#subscribeEvent(eventName, this.#events[eventName]);
    });

    this.#channel.publish('connection', {});
    this.watchPresence();
  }

  publish(eventName, data) {
    if (!this.#events[eventName]) {
      throw new Error(`No match for '${eventName}' - event name was found!`);
    }
    this.#channel.publish(eventName, data);
  }

  subscribe(eventName, callback) {
    if (typeof callback !== 'function') {
      throw new Error(`Callback of event:${eventName} must be a function!`);
    }

    this.#events[eventName] = callback;
    this.#subscribeEvent(eventName, ({ data, clientId }) => {
      callback(data, clientId);
    });
  }

  watchPresence() {
    this.#channel.presence.subscribe(presenceMsg => {
      this.#channel.presence.get((err, members) => {
        if (err) {
          throw new Error("Cannot find members!");
        }
        this.#room.members = members;
      });
    });
  }
}

const ABLY_TOKEN = "Bxk-Gg.Gf2v1g:x9_6JwTiQBorqaHw";

const getRoomName = () => prompt("Choose room:");
const getRoomPassword = () => prompt("Enter password:");
const getUsername = () => prompt("Your nickname:");

const room = new Room(getUsername(), getRoomName(), getRoomPassword());

const multiplayer = new Multiplayer(ABLY_TOKEN, room);

multiplayer.subscribe('message', data => {
  console.dir(data);
});


setInterval(() => {
  console.log(multiplayer.members.length);
}, 1000);

document.addEventListener('DOMContentLoaded', () => {
  const formElement = document.querySelector('form');
  const messageInputElement = formElement.querySelector('input');

  formElement.addEventListener('submit', e => {
    e.preventDefault();
    multiplayer.publish('message', messageInputElement.value);
  });
});
