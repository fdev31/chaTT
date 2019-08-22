"use strict"

const userName = prompt('Nick name')
const maxMessages = 50;
let client = null;

const activeSession = {
    currentRoom: 'main'
}
const messagesLog = {
    'main': []
};

function focusInput() {
    document.getElementById('input_text').focus();
}

function drawRooms() {
    var rms = document.getElementById("all_rooms");
    rms.innerHTML = Array.from(rooms)
        .map( (name) => `<div onclick="roomListClicked(this)">${name}</div>`)
        .join('');
}
function drawUsers() {
    var usr = document.getElementById("all_nicks");

    usr.innerHTML = Array.from(users)
        .map( (name) => `<div onclick="userListClicked(this)">${name}</div>`)
        .join('');
}

function drawMessages() {
    const elt = document.getElementById('all_texts');
    elt.innerHTML = messagesLog[activeSession.currentRoom].join('<br/>');
    elt.scrollTop = elt.scrollHeight;
}

function publish(topic, payload, opts) {
    return client.publish(topic, payload, opts);
}

function sendText(keypress) {
    if (keypress.code == 'Enter') {
        const text = document.getElementById('input_text').value;
        const payload = JSON.stringify({'author': userName, 'text': text});
        publish(`rooms/${activeSession.currentRoom}/newtext`, payload, {qos: 1, retain: true});
        document.getElementById('input_text').value = '';
    }
}

function messageArrived(topic, msg) {
    const parsed = topic.match(new RegExp('^rooms/([^/]+)/(.+)$'));

    if (parsed) {
        const room = parsed[1];
        const old_size = rooms.size;
        rooms.add(room);

        if (old_size < rooms.size) {
            drawRooms();
        }

        const payload = JSON.parse(msg.toString());

        if (parsed[2] == 'newtext') {
            // add new users if they speak
            const old_size = users.size;
            users.add(payload.author);
            if (old_size < users.size) {
                drawUsers();
            }
        }

        if (messagesLog[room] == undefined) messagesLog[room] = [];

        if (messagesLog[room].length >= maxMessages) { // truncate log
            messagesLog[room].splice(0, 1);
        }
        messagesLog[room].push(`<b>${payload.author}</b>: ${payload.text}`);

        if (room == activeSession.currentRoom) {
            drawMessages();
        }
    }
}

// DOM callbacks

function appInit() {
    // install ENTER handler for the input
    document.getElementById('input_text').addEventListener('keydown', sendText);

    // setup the Mqtt client
    client = new mqtt(`mqtt://${login}:${password}@${host}:9001`);
    client.on('connect', () => {
        client.subscribe("rooms/#", (err) => {err && console.log('Error', err)} );
        drawMessages();
        console.log('init finished.');
    });
    client.on('message', messageArrived);
    drawRooms();
    drawUsers();
    focusInput();
}

function roomListClicked(item) {
    let newRoom = item.textContent;
    if (activeSession.currentRoom != newRoom) {
        activeSession.currentRoom = newRoom;
        if (messagesLog[newRoom] == undefined) {
            messagesLog[newRoom] = [];
        }
        drawMessages();
    }
    event.stopPropagation();
    return true;
}

function userListClicked(item) {
    document.getElementById('input_text').value += `@${item.childNodes[0].data}: `;
    focusInput();
}

function createRoom() {
    const roomName = prompt('Room name');
    publish(`rooms/${roomName}/new`);
}

