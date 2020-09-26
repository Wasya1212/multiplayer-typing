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

  #defaultConnectionEvent() {
    // console.log(`User:${this.userID || ''} is connected...`);
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

  connect() {
    this.#channel = this.#ably.channels.get(`${this.#room.name}:${this.#room.password}`);
    this.#channel.presence.subscribe('enter', function(member) {
      // alert('Member ' + member.clientId + ' entered');
    });
    this.#channel.presence.enter();
    this.attach(this.#events.connection);

    Object.keys(this.#events).forEach(eventName => {
      this.#subscribeEvent(eventName, this.#events[eventName]);
    });
  }

  attach(callback) {
    this.#channel.attach(err => {
      if (err) {
        throw new Error("Error attaching to the channel");
      }
      callback();
    });
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

  getMembers(callback) {
    this.#channel.presence.get((err, members) => {
      if (err) {
        throw new Error("Cannot find members!");
      }

      try {
        callback(members);
      } catch (err) {
        console.error(err);
      }
    });
  }

  ss() {
    this.#channel.presence.get(function(err, members) {
      console.log('There are ' + members.length + ' members on this channel');
      console.log('The first member has client ID: ' + members[0].clientId);
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

// multiplayer.getMembers(members => {
//   console.log('members', members);
// });

multiplayer.ss();

document.addEventListener('DOMContentLoaded', () => {
  const formElement = document.querySelector('form');
  const messageInputElement = formElement.querySelector('input');

  formElement.addEventListener('submit', e => {
    e.preventDefault();
    multiplayer.publish('message', messageInputElement.value);
  });
});
