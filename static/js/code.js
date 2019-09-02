"use strict"

const userName = prompt('Nick name')
const maxMessages = 50;

let client = null;

const activeSession = {
    currentRoom: 'main'
}
const messagesLog = {
    'main': []
}

const globEvents = {
    init: (name) => {
        globEvents[name] = new Set();
    },
    emit: (name, ...args) => {
        for (const handler of globEvents[name]) {
            try {
                handler(...args);
            } catch (e) {
                console.error(`Emit ${name}: ${e}`);
            }
        }
    },
    on: (name_or_list, handler) => {
        const nameList = typeof name_or_list == 'string' ? [name_or_list] : name_or_list;
        for (const name of nameList)
            globEvents[name].add(handler);
    }
}

function focusInput() {
    dom.input.focus();
}

function _getRoomDiv(name) {
    return dom.rooms.querySelector(`div[attr-room="${name}"]`);
}

function drawRooms() {
    if (rooms.size == 0) {
        console.warn('No Rooms!');
        return;
    }
    dom.rooms.innerHTML = Array.from(rooms)
        .map( (name) => (`<div class="roomName" attr-room="${name}" onclick="roomListClicked(this)">${name}</div>`) )
        .join('');
    const room = _getRoomDiv(activeSession.currentRoom);
    if (room) room.classList.add('selected');
}

function drawUsers() {
    if (users.size == 0) {
        console.warn('No Users!');
        return;
    }
    const usr = document.getElementById("all_nicks");

    usr.innerHTML = Array.from(users)
        .map( (name) => `<div onclick="userListClicked(this)">${name}</div>`)
        .join('');
}

// Text rendering functions
const commands = {};
commands.img = (cmd, url) => `<img style="max-height: 2em" src="${url}"/>`;
commands.http = (protocol, path) => {
    const host = path.split('/')[0];
    return `<a href="${protocol}://${path}">[${host}]</a>`;
};
commands.https = commands.http;

const _genericCommandRe = ':([a-z]{2,10}):(?:[(](.*)[)])?';
const _urlRe = '(https?)://([^   \n]+)';
const commandsPattern = new RegExp(`(?:${_genericCommandRe})|(?:${_urlRe})`);

function commandsProcessor(...args) {
    // get the result of a regex match and return the matching command result
    const params = args.filter( (el) => el );
    // params = [group, subgroup1 (command), subgroup2 (parameters)]
    const handler = commands[params[1]];
    if (handler) {
        return handler(...params.splice(1));
    }
    return `(?)${params[0]}(?)`;
}

function renderCommands(text) {
    return text.replace(commandsPattern, commandsProcessor);
}

function drawMessages() {
    const elt = document.getElementById('all_texts');
    elt.innerHTML = messagesLog[activeSession.currentRoom]
        .map( (message) => `<div class="textLine"><span class="nick">${message[0]}</span><span class="text">${message[1]}</span></div>`)
        .map( renderCommands )
        .join('');
    elt.scrollTop = elt.scrollHeight;
}

function publish(topic, payload, opts) {
    return client.publish(topic, payload, opts);
}

function sendText(keypress) {
    if (keypress.code == 'Enter') {
        const text = dom.input.value;
        const payload = JSON.stringify({'author': userName, 'text': text});
        publish(`rooms/${activeSession.currentRoom}/newtext`, payload, {qos: 1, retain: true});
        dom.input.value = '';
    }
}

function messageArrived(topic, msg) {
    const parsed = topic.match(new RegExp('^rooms/([^/]+)/(.+)$'));

    if (parsed) {
        const room = parsed[1];
        const oldSize = rooms.size;
        rooms.add(room);

        if (oldSize < rooms.size) globEvents.emit('channelAdded');

        if (msg.length == 0) return;

        const payload = JSON.parse(msg.toString());

        if (parsed[2] == 'newtext') {
            // add new users if they speak
            const oldSize = users.size;
            users.add(payload.author);
            if (oldSize < users.size) globEvents.emit('userAdded');

            _refreshMessageLog(room, payload);
            globEvents.emit(payload.author != userName?'messageArrived':'messageEmitted', room, payload);
        }
    }
}

function _refreshMessageLog(room, payload) {
    if (messagesLog[room] == undefined) messagesLog[room] = [];

    if (messagesLog[room].length >= maxMessages) { // truncate log
        messagesLog[room].splice(0, 1);
    }
    messagesLog[room].push([payload.author, payload.text]);
}

// DOM callbacks
const dom = {}

function appInit() {
    // install ENTER handler for the input
    dom.rooms = document.getElementById("all_rooms");
    dom.input = document.getElementById('input_text');
    dom.input.addEventListener('keydown', sendText);

    drawRooms();
    drawUsers();

    globEvents.init('messageArrived');
    globEvents.init('messageEmitted');
    globEvents.init('userAdded');
    globEvents.init('channelAdded');

    // setup UI redraw
    globEvents.on('userAdded', drawUsers);
    globEvents.on('channelAdded', drawRooms);
    globEvents.on(['messageArrived', 'messageEmitted'], (room, payload) => {if (room == activeSession.currentRoom) drawMessages()});

    // setup the Mqtt client
    client = new mqtt(`mqtt://${login}:${password}@${host}:9001`);
    client.on('error', (err) => console.log('err', err));
    client.on('connect', () => {
        activeSession.bellSound = new Audio('/static/snd/bell.mp3');
        activeSession.bellSound.volume = 0.0;
        client.subscribe("rooms/#", (err) => {err && console.log('Error', err)} );
        drawMessages();
        console.log('init finished.');
        focusInput();
    });
    client.on('message', messageArrived);
}

function enableAudio() {
    if (activeSession.bellSound.volume == 0.0) {
        activeSession.bellSound.volume = 1.0;
        activeSession.bellSound.play();
        globEvents.on('messageArrived', () => activeSession.bellSound.play());
    }
}

function roomListClicked(item) {
    let newRoom = item.textContent;
    if (activeSession.currentRoom != newRoom) {
        const oldRoom = activeSession.currentRoom;
        activeSession.currentRoom = newRoom;
        if (messagesLog[newRoom] == undefined) {
            messagesLog[newRoom] = [];
        }
        _getRoomDiv(oldRoom).classList.remove('selected');
        _getRoomDiv(newRoom).classList.add('selected');
        drawMessages();
    }
    event.stopPropagation();
    return true;
}

function userListClicked(item) {
    dom.input.value += `@${item.childNodes[0].data}: `;
    focusInput();
}

function createRoom() {
    const roomName = prompt('Room name');
    if (roomName.match(/#/)) {
        alert('"#" is not allowed here!');
        return;
    }
    publish(`rooms/${roomName.replace(/[+]/g, '&gt;')}/new`);
}

