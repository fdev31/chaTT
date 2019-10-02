// DOM operations
import {renderCommands} from './commands.js';
const dom = {}

function drawRooms(rooms, current) {
    if (rooms.size == 0) {
        console.warn('No Rooms!');
        return;
    }
    dom.rooms.innerHTML = Array.from(rooms)
        .map( (name) => (`<div class="roomName" attr-room="${name}" onclick="app.roomListClicked(this)">${name}</div>`) )
        .join('');
    const room = _getRoomDiv(current);
    if (room) room.classList.add('selected');
}

function drawUsers(me, users, palette) {
    if (users.size == 0) {
        console.warn('No Users!');
        return;
    }
    const usr = document.getElementById("all_nicks");

    usr.innerHTML = Array.from(users)
        .map( (name, idx) => me===name?'':`<div style="color:${palette[idx]}" onclick="app.userListClicked(this)">${name}</div>`)
        .join('');
}

function drawMessages(currentRoomMessages, nickPalette) {
    const elt = document.getElementById('all_texts');
    const newContent = currentRoomMessages?
        currentRoomMessages
        .map( (message) => `<div class="textLine"><span class="nick" style="color: ${nickPalette(message[0])}">${message[0]}</span><span class="text">${message[1]}</span></div>`)
        .map( renderCommands )
        .join('')
    :"<h1>It's empty here!</h1>";
    elt.innerHTML = newContent;
    elt.scrollTop = elt.scrollHeight;
}

function selectRoom(oldRoom, newRoom) {
    _getRoomDiv(oldRoom).classList.remove('selected');
    _getRoomDiv(newRoom).classList.add('selected');
}

function _getRoomDiv(name) {
    return dom.rooms.querySelector(`div[attr-room="${name}"]`);
}

function init() {
    // install ENTER handler for the input
    dom.rooms = document.getElementById("all_rooms");
    dom.input = document.getElementById('input_text');
    dom.input.focus();
}

module.exports = { dom, init, drawUsers, drawRooms, drawMessages, selectRoom }
