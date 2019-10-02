"use strict"

import 'snapsvg';
import {makeRandomPair} from './randgen.js';
import {thumbnailClicked, recalcLayout} from './domapi.js';

import {userColors} from './ui_styling.js';
import {iconManager} from './iconManager.js';
import {init as initCommands, renderCommands} from './commands.js';
import {get} from './request.js';

import * as mqtt from './mqttUtils.js';

const maxMessages = 50;

const activeSession = {
    userName: 'NoName',
    currentRoom: 'main'
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
        .map( (name) => (`<div class="roomName" attr-room="${name}" onclick="app.roomListClicked(this)">${name}</div>`) )
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
        .map( (name, idx) => activeSession.userName==name?'':`<div style="color:${userColors[idx]}" onclick="app.userListClicked(this)">${name}</div>`)
        .join('');
}

function drawMessages() {
    const elt = document.getElementById('all_texts');
    const currentRoomMessages = messagesLog[activeSession.currentRoom];
    const newContent = currentRoomMessages?
        currentRoomMessages
        .map( (message) => `<div class="textLine"><span class="nick" style="color: ${userColors[Array.from(users).indexOf(message[0])]}">${message[0]}</span><span class="text">${message[1]}</span></div>`)
        .map( renderCommands )
        .join('')
    :"<h1>It's empty here!</h1>";
    elt.innerHTML = newContent;
    elt.scrollTop = elt.scrollHeight;
}

function sendText(keypress) {
    if (keypress.code == 'Enter') {
        const text = dom.input.value;
        const payload = {'author': activeSession.userName, 'text': text};
        mqtt.publish(`rooms/${activeSession.currentRoom}/newtext`, payload, {qos: 1, retain: false});
        dom.input.value = '';
    }
}

function messageArrived(topic, msg) {
    let parsed = topic.match(new RegExp('^rooms/([^/]+)/(.+)$'));

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
            globEvents.emit(payload.author != activeSession.userName?'messageArrived':'messageEmitted', room, payload);
        }
    }

    parsed = topic.match(new RegExp('^users/([^/]+)/(.+)$'));

    if (parsed) {
        if (parsed[2] == 'logout') {
            users.delete(parsed[1]);
            drawUsers();
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

    let passphrase = prompt('challenge:') || false;
    const [login, password] = passphrase ? makeRandomPair(passphrase):[false, false];
    passphrase = undefined;
    document.getElementById('title').textContent = `ChaTT-${login?login.slice(3, 5):'unprotected'}`;
    window.onresize = recalcLayout;
    recalcLayout();

    activeSession.userName = prompt('Nick name');
    initCommands(activeSession.userName);

    globEvents.init('messageArrived');
    globEvents.init('messageEmitted');
    globEvents.init('userAdded');
    globEvents.init('channelAdded');

    // setup UI redraw
    globEvents.on('userAdded', drawUsers);
    globEvents.on('channelAdded', drawRooms);
    globEvents.on(['messageArrived', 'messageEmitted'], (room, payload) => {if (room == activeSession.currentRoom) drawMessages()});

    // setup the Mqtt client
    const [mqttProto, mqttPort] = document.location.href.match(/^https/)?['wss',9001]:['ws',9001];
    const onConnect = function() {
        mqtt.publish(`users/${activeSession.userName}/hello`, {'ipAddress': ipAddr});
        mqtt.subscribe("rooms/#");
        mqtt.subscribe("users/#");
        focusInput();
        console.log('init finished.');
    }
    mqtt.init(login?`${mqttProto}://${login}:${password}@${host}:${mqttPort}`:`${mqttProto}://${host}:${mqttPort}`, onConnect, messageArrived);

    activeSession.bellSound = new Audio('/static/snd/bell.mp3');
    activeSession.bellSound.volume = 0.0;

    get('/data/lastinfo').then( (data) => {
        for (const r of data.rooms) {
            rooms.add(r);
        }
        for (const u of data.users) {
            users.add(u);
        }
        for (const r in data.messages) {
            messagesLog[r] = data.messages[r];
        }
        drawRooms();
        drawUsers();
        drawMessages();
    });
}

function enableAudio() {
    if (activeSession.bellSound.volume == 0.0) {
        iconManager.changeState('sound_icon', 'on')
        activeSession.bellSound.volume = 1.0;
        if (activeSession.unlockedAudio == undefined) {
            activeSession.bellSound.play();
            globEvents.on('messageArrived', () => activeSession.bellSound.play());
            activeSession.unlockedAudio = true;
        }
    } else {
        iconManager.changeState('sound_icon', 'off')
        activeSession.bellSound.volume = 0.0;
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
    if (! roomName.match(/^[a-zA-Z0-9-]+$/)) {
        alert('Invalid room name!');
        return;
    }
    mqtt.publish(`rooms/${roomName.replace(/[+]/g, '&gt;')}/new`);
}

// used in the template, global functions

window.app = {
    init: appInit,
    createRoom,
    enableAudio,
    userListClicked,
    roomListClicked
}

