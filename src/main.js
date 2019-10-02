"use strict"

import {dom, selectRoom,
    drawRooms as _drawRooms,
    drawUsers as _drawUsers,
    drawMessages as _drawMessages,
    init as domInit} from './ui_dom_elts.js';
import {makeRandomPair} from './randgen.js';
import {thumbnailClicked, recalcLayout} from './domapi.js';
import {globEvents} from './ui_events.js';
import {userColors} from './ui_styling.js';
import {iconManager} from './iconManager.js';
import {init as initCommands} from './commands.js';
import {get} from './request.js';
import * as mqtt from './mqttUtils.js';

function drawRooms() {
    return _drawRooms(rooms, activeSession.currentRoom)
}
function drawUsers() {
    return _drawUsers(activeSession.userName, users, userColors)
}
function drawMessages() {
    return _drawMessages(messagesLog[activeSession.currentRoom], _nickNamesPalette)
}
const _nickNamesPalette = (user) => userColors[Array.from(users).indexOf(user)]

const maxMessages = 50;

const activeSession = {
    userName: 'NoName',
    currentRoom: 'main'
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

function appInit() {
    domInit();
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
    userListClicked: (elt) => {
        dom.input.value += `@${elt.childNodes[0].data}: `;
        dom.input.focus();
    },
    roomListClicked: (elt) => {
        const newRoom = elt.textContent;
        if (activeSession.currentRoom != newRoom) {
            const oldRoom = activeSession.currentRoom;
            activeSession.currentRoom = newRoom;
            if (messagesLog[newRoom] == undefined) {
                messagesLog[newRoom] = [];
            }
            selectRoom(oldRoom, newRoom);
            drawMessages();
        }
        event.stopPropagation();
        return true;
    }
}

