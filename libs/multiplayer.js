class Room {
  isOwner;
  currentClientName;
  name;
  password;
  members;
  maxMembersCount;


  constructor(currentClientName, name = `room-${Date.now()}`, password = '', maxMembersCount = false, isOwner = true) {
    this.name = name;
    this.password = password;
    this.maxMembersCount = maxMembersCount;
    this.currentClientName = currentClientName;
    this.isOwner = isOwner;
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

  get maxMembersCount() {
    return this.#room.maxMembersCount;
  }

  get isOwner() {
    return this.#room.isOwner;
  }

  set maxMembersCount(maxCount) {
    this.#room.maxMembersCount = maxCount;
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

module.exports.Room = Room;
module.exports.Multiplayer = Multiplayer;