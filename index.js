class Room {
  name;
  password;

  constructor(name = `room-${Date.now()}`, password = '') {
    this.name = name;
    this.password = password;
  }
}

class Multiplayer {
  #room;
  #channel;
  #ably;

  #events = {
    connection: () => {
      console.log(`User:${this.userID} is connected...`);
    },
    error: (error) => {
      console.error(error.message);
    },
    disconnect: () => {
      console.log(`User:${this.userID} disconnected...`);
    }
  };

  userID;

  #subscribeEvent(eventName, callback) {
    this.#channel.subscribe(eventName, callback);
  }

  constructor(ablySecretToken, room, events = {}, connect = true) {
    if (!room || !(room instanceof Room)) {
      throw new Error("Room must be a {Room} object!");
    }

    this.#room = room;
    this.#ably = new Ably.Realtime(ablySecretToken);
    this.#events = Object.assign(this.#events, events);

    connect && this.connect();
  }

  get events() {
    return Object.keys(this.#events);
  }

  connect() {
    this.#channel = this.#ably.channels.get(`${this.#room.name}:${this.#room.password}`);

    Object.keys(this.#events).forEach(eventName => {
      this.#subscribeEvent(eventName, this.#events[eventName]);
    });
  }

  publish(eventName, data) {
    if (!this.#events[eventName]) {
      throw new Error(`No match for '${eventName}' - event name was found!`);
    }
    this.#channel.publish(eventName, data);
  }

  subscribe(eventName, callback) {
    this.#events[eventName] = callback;
    this.#subscribeEvent(eventName, callback);
  }
}

const ABLY_TOKEN = "Bxk-Gg.Gf2v1g:x9_6JwTiQBorqaHw";

const getRoomName = () => prompt("Choose room:");
const getRoomPassword = () => prompt("Enter password:");

const room = new Room(getRoomName(), getRoomPassword());

const multiplayer = new Multiplayer(ABLY_TOKEN, room);

multiplayer.subscribe('message', data => {
  console.dir(data);
});

document.addEventListener('DOMContentLoaded', () => {
  const formElement = document.querySelector('form');
  const messageInputElement = formElement.querySelector('input');

  formElement.addEventListener('submit', e => {
    e.preventDefault();
    multiplayer.publish('message', { message: messageInputElement.value });
  });
});

// const ably = new Ably.Realtime('Bxk-Gg.Gf2v1g:x9_6JwTiQBorqaHw');

// const room = {
//     name: prompt("Choose room:"),
//     password: prompt("Enter password:")
// };

// const channel = ably.channels.get(`${room.name}:${room.password}`);
// channel.attach(err => {
//     if (err) {
//         alert('Attach failed: ' + err);
//     }
// });

// document.addEventListener('DOMContentLoaded', () => {
//     const formElement = document.querySelector('form');
//     const messageInputElement = formElement.querySelector('input');

//     formElement.addEventListener('submit', e => {
//         e.preventDefault();
//         sendData('message', { message: messageInputElement.value });
//     });

//     startListenForMessage();
// });

// function sendData(eventName, data) {
//     channel.publish(eventName, data);
// }

// function startListenForMessage() {
//     channel.subscribe(function (message) {
//         console.log('⬅ Received: ' + message.data);
//     });
// }