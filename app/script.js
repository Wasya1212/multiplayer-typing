const word = document.getElementById('word');
const text = document.getElementById('text');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const endgameEl = document.getElementById('end-game-container');
const settingsBtn = document.getElementById('settings-btn');
const settings = document.getElementById('settings');
const settingsForm = document.getElementById('settings-form');
const difficultySelect = document.getElementById('difficulty');
const joinRoomCheckbox = document.getElementById('join');
const membersInput = document.getElementById('members');

// List of words for game
const words = [
  'sigh',
  'tense',
  'airplane',
  'ball',
  'pies',
  'juice',
  'warlike',
  'bad',
  'north',
  'dependent',
  'steer',
  'silver',
  'highfalutin',
  'superficial',
  'quince',
  'eight',
  'feeble',
  'admit',
  'drag',
  'loving'
];

// api multiplayer
const ABLY_TOKEN = "Bxk-Gg.Gf2v1g:x9_6JwTiQBorqaHw";
let room, game;

// timer
let timeInterval;

// Init word
let randomWord;

// Init score
let score = 0;

// Init time
let time = 10;

// game is end
let gameEnd = false;

// Set difficulty to value in ls or medium
let difficulty =
  localStorage.getItem('difficulty') !== null
    ? localStorage.getItem('difficulty')
    : 'medium';

// Set difficulty select value
difficultySelect.value =
  localStorage.getItem('difficulty') !== null
    ? localStorage.getItem('difficulty')
    : 'medium';

// Focus on text on start
text.focus();

// Start counting down
function startGame() {
  game.publish('play', game.userID);
  timeInterval = setInterval(updateTime, 1000);
}

// Generate random word from array
function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

// Add word to DOM
function addWordToDOM() {
  randomWord = getRandomWord();
  word.innerHTML = randomWord;
}

// Update score
function updateScore() {
  score++;
  scoreEl.innerHTML = score;
}

// Update time
function updateTime() {
  time--;
  timeEl.innerHTML = time + 's';

  if (time === 0) {
    clearInterval(timeInterval);
    // end game
    gameOver();
  }
}

// Game over, show end screen
function gameOver() {
  const fails = document.querySelectorAll('.members-list li[loose="true"]');
  if (fails.length + 1 >= game.members.length) {
    const scores = Array.from(fails).sort((a, b) => {
      return a.getAttribute('score') - b.getAttribute('score');
    });
    const firstInListUsername = scores[0].getAttribute('username');
    const firstinListScore = scores[0].getAttribute('score');

    game.publish('win', {
      username: score > firstinListScore ? game.userID : firstInListUsername,
      score: score > firstinListScore ? score : firstinListScore
    });
  }

  game.publish('loose', { username: game.userID, score });
  endgameEl.innerHTML = `
    <h1>Time ran out</h1>
    <p>Your final score is ${score}</p>
    <button onclick="location.reload()">Reload</button>
  `;
  endgameEl.style.display = 'flex';
}

function serializeForm(form) {
  const formEntries = new FormData(form).entries();
  return Object.assign(...Array.from(formEntries, ([x, y]) => ({ [x]: y })));
}

function initEvents() {
  game.subscribe('get-max-members', () => {
    if (game.isOwner) {
      game.publish('max-members', game.maxMembersCount);
    }
  });

  game.subscribe('max-members', maxMembersCount => {
    game.maxMembersCount = maxMembersCount;
  });

  game.subscribe('play', username => {
    const member = document.querySelector(`.members-list li[username="${username}"]`);
    member.textContent = `${username}: playing`;
  });

  game.subscribe('loose', ({ username, score }) => {
    console.log("user loose", username, score);
    const member = document.querySelector(`.members-list li[username="${username}"]`);
    member.setAttribute('loose', 'true');
    member.setAttribute('totalScore', score);
    member.textContent = `${username}: loose - ${score}`;
  });

  game.subscribe('win', ({username, score}) => {
    alert(`${username}: winner with score ${score}`);
  });
}

function checkForMaxMembers() {
  if (!game.isOwner) {
    game.publish('get-max-members', {});
  }
}

function waitForMembers() {
  timeInterval = setInterval(() => {
    if (!game.members || !game.maxMembersCount || game.members.length < game.maxMembersCount) {
      console.log("wait for members...");
    } else {
      console.log("All fine! Members count is", game.members.length);
      endWaitForMembers();
      pushMembers();
      startGame();
    }
  }, 1000);
}

function endWaitForMembers() {
  clearInterval(timeInterval);
}

function pushMembers() {
  const membersList = document.querySelector('.members-list');
  membersList.innerHTML = "";

  game.members.forEach(member => {
    membersList.innerHTML += `<li username="${member.clientId}">${member.clientId}</li>`;
  });
}

addWordToDOM();

// Event listeners

// Typing
text.addEventListener('input', e => {
  const insertedText = e.target.value;

  if (insertedText === randomWord) {
    addWordToDOM();
    updateScore();

    // Clear
    e.target.value = '';

    if (difficulty === 'hard') {
      time += 2;
    } else if (difficulty === 'medium') {
      time += 3;
    } else {
      time += 5;
    }

    updateTime();
  }
});

// Settings btn click
settingsBtn.addEventListener('click', () => settings.classList.toggle('hide'));

joinRoomCheckbox.addEventListener('change', e => {
  const toggleOperation = e.currentTarget.checked ? 'add' : 'remove';

  membersInput.parentElement.classList[toggleOperation]('hidden');
  difficultySelect.parentElement.classList[toggleOperation]('hidden')
});

// Settings select
settingsForm.addEventListener('submit', e => {
  e.preventDefault();

  const roomSettings = serializeForm(settingsForm);

  room = new Room(
    roomSettings.username,
    roomSettings.roomId,
    roomSettings.roomPassword,
    roomSettings.members === '' ? null : roomSettings.members,
    !(roomSettings.join)
  );

  game = new Multiplayer(ABLY_TOKEN, room);

  settings.classList.add('hide');

  initEvents();
  checkForMaxMembers();
  waitForMembers();

  difficulty = difficultySelect.value;
  localStorage.setItem('difficulty', difficulty);
});