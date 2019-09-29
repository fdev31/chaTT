"use strict"

const maxMessages = 50;

let client = null;

const userColors = '#fabebe #ffd8b1 #fffac8 #aaffc3 #e6beff #ffffff #808080 #e6194b #f58231 #ffe119 #bcf60c #3cb44b #4363D8 #911eb4 #f032e6 #808080'.split(' ');

let ICONS_STATES = {
    sound_icon : {
        hover: {
            rect4525: {d:'m 5.2683039,291.09663 c 0.2072621,-0.20725 0.5409829,-0.20725 0.7482373,0 l 2.2447171,2.24472 c 0.2072657,0.20727 0.2072606,0.54097 -1.4e-6,0.74824 -0.2072621,0.20725 -0.5409716,0.20727 -0.7482373,0 l -2.2447171,-2.24472 c -0.2072543,-0.20726 -0.2072607,-0.54097 1.4e-6,-0.74824 z'},
            rect4527: {'d': 'm 8.2421792,291.09659 c 0.2072621,0.20727 0.2072557,0.54098 1.4e-6,0.74824 l -2.2447171,2.24472 c -0.2072657,0.20727 -0.5409752,0.20725 -0.7482373,0 -0.207262,-0.20727 -0.2072671,-0.54097 -1.4e-6,-0.74824 l 2.2447171,-2.24472 c 0.2072544,-0.20725 0.5409752,-0.20725 0.7482373,0 z'}
        },
        on: {
            rect4525: {'d': 'm 7.5140723,290.1303 c 0.2628127,1e-5 0.474402,0.2116 0.4744017,0.47441 l -3.9e-6,4.09089 c -3e-7,0.26282 -0.211581,0.47439 -0.4744022,0.4744 -0.2628127,-1e-5 -0.474402,-0.21158 -0.4744017,-0.47441 l 3.9e-6,-4.09089 c 3e-7,-0.26281 0.211581,-0.47439 0.4744022,-0.4744 z'},
            rect4527: {'d': 'm 6.1133416,291.13855 c 0.2191871,0 0.3956408,0.17646 0.3956411,0.39564 l 3.3e-6,2.37385 c 3e-7,0.21919 -0.1764607,0.39564 -0.3956408,0.39564 -0.2191871,0 -0.3956408,-0.17645 -0.3956411,-0.39564 l -3.2e-6,-2.37385 c -3e-7,-0.21918 0.1764606,-0.39564 0.3956407,-0.39564 z'}
        },
        off: {
            rect4525: {'d': 'm 5.6433321,291.6021 c 0.1549875,-0.15498 0.4045368,-0.15498 0.5595205,0 l 1.6785654,1.67857 c 0.1549908,0.15499 0.1549864,0.40453 -1e-6,0.55952 -0.1549875,0.15498 -0.4045298,0.15499 -0.5595205,0 l -1.6785654,-1.67857 c -0.1549837,-0.15498 -0.1549864,-0.40453 1e-6,-0.55952 z'},
            rect4527: {'d': 'm 7.867151,291.60207 c 0.1549874,0.15499 0.1549847,0.40454 1e-6,0.55952 l -1.6785654,1.67857 c -0.1549907,0.15499 -0.404533,0.15498 -0.5595205,0 -0.1549874,-0.15499 -0.1549918,-0.40453 -1e-6,-0.55952 l 1.6785654,-1.67857 c 0.1549837,-0.15498 0.404533,-0.15498 0.5595205,0 z'}
        }
    },
    room_icon: {
        hover: {
            rect4975: {'width': 6.8, x: 1.058},
            rect4979: {'width': 6.8, x: -295.94},
        },
        reset: {
            rect4975: {'width': 4.23, x: 2.11},
            rect4979: {'width': 4.23, x: -294.6},
        }
    }
}
ICONS_STATES.sound_icon.reset = ICONS_STATES.sound_icon.off;

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
        .map( (name, idx) => activeSession.userName==name?'':`<div style="color:${userColors[idx]}" onclick="userListClicked(this)">${name}</div>`)
        .join('');
}

let _thumbnailMaxHeight;

function thumbnailClicked(elt) {
    if (!!elt['data-max-height']) {
        elt.style['max-height'] = elt['data-max-height'];
        elt.style['position'] = 'relative';
        elt['data-max-height'] = undefined;
        elt.style['z-index'] = '0';
    } else {
        elt.style['z-index'] = '2';
        elt['data-max-height'] = elt.style['max-height'];
        elt.style['max-height'] = '';
        elt.style['position'] = 'absolute';
        elt.style['left'] = '0';
        elt.style['top'] = '0';
    }
}

// Text rendering functions
const commands = {};
commands.img = (cmd, url) => `<img class="thumbnail" onclick="thumbnailClicked(this)" style="max-height: 1em" src="${url}"/>`;
commands.http = (protocol, path) => {
    const host = path.split('/')[0];
    return `<a href="${protocol}://${path}">(link to ${host})</a>`;
};
commands.https = commands.http;

const _genericCommandRe = ':([a-z]{2,10}):(?:[(](.*)[)])?';
const _urlRe = '(https?)://([^   \n]+)';
const commandsPattern = new RegExp(`(?:${_genericCommandRe})|(?:${_urlRe})`);

const smileys = [
    [':\\(', 'sad'],
    [':\\)', 'happy'],
    [':\\){2,}', 'shappy'],
    ['(?:XD|xd)', 'gibber'],
    ['\\^\\^', 'gibber'],
    [':[Dd]', 'shappy'],
    [':[Pp]', 'crazy'],
    [':/', 'confused'],
    [';\\)', 'wink'],
].map( (o) => [new RegExp(` ${o[0]}`, 'g'), o[1]] );

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
    text = text.replace(commandsPattern, commandsProcessor);
    for (let [re, name] of smileys) {
        text = text.replace(re, `<img class="thumbnail emoticon" src="static/img/emoticons/${name}.svg" />`);
    }
    return text;
}

function recalcLayout() {
    const elt = document.getElementById('all_texts');
    elt.style['max-height'] = `${window.innerHeight-150}px`;
    elt.scrollTop = elt.scrollHeight;
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


function publish(topic, payload, opts) {
    return client.publish(topic, payload?JSON.stringify(payload):payload, opts);
}

function sendText(keypress) {
    if (keypress.code == 'Enter') {
        const text = dom.input.value;
        const payload = {'author': activeSession.userName, 'text': text};
        publish(`rooms/${activeSession.currentRoom}/newtext`, payload, {qos: 1, retain: false});
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
let iconManager = null;

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

    drawRooms();
    drawUsers();

    activeSession.userName = prompt('Nick name');

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
    if (login)
        client = new mqtt(`${mqttProto}://${login}:${password}@${host}:${mqttPort}`);
    else
        client = new mqtt(`${mqttProto}://${host}:${mqttPort}`);
    client.on('error', (err) => {
        client.options.reconnectPeriod = 0;
        console.log('err', err);
        alert('failed.');
    });
    client.on('connect', () => {
        publish(`users/${activeSession.userName}/hello`, {'ipAddress': ipAddr});
        activeSession.bellSound = new Audio('/static/snd/bell.mp3');
        activeSession.bellSound.volume = 0.0;
        client.subscribe("rooms/#", (err) => {err && console.log('Error', err)} );
        client.subscribe("users/#", (err) => {err && console.log('Error', err)} );
        drawMessages();
        focusInput();
        console.log('init finished.');
        iconManager = new IconManager();
    });
    client.on('message', messageArrived);
}


class IconManager {
    constructor() {
        /** replace all .svgIcon with the real svg icon base on the name, eg:
         * <span class="svgIcon" id="sound_icon" name="sound_off" />
         * - keeps the id attribute untouched & forces "svgIcon" class
         */
        this.current_states = {};
        document.querySelectorAll('.svgIcon').forEach( (elt)=> {
            elt.parentElement.onmouseover = ()=> iconManager.changeState(elt.attributes.id.value, 'hover');
            elt.parentElement.onmouseleave = ()=> iconManager.changeState(elt.attributes.id.value); // no state == reset to last state
            elt.outerHTML = `<object class="svgIcon" id="${elt.attributes.id.value}" type="image/svg+xml" data="static/img/icons/${elt.attributes.title.value}.svg"></object>`
        }
        );
    }
    changeState(icon, state) {
        if (state == undefined) {
            state = this.current_states[icon] || 'reset';
        } else if (state != 'hover') { // hover is not a real state, it's "transient"
            this.current_states[icon] = state;
        }
        const elt = Snap(document.getElementById(icon));
        const states = this.icon_states[icon][state];
        for (const k of Object.keys(states)) {
            elt.select('#'+k).animate(states[k], 200);
        }
    }
}

IconManager.prototype.icon_states = ICONS_STATES;

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
    publish(`rooms/${roomName.replace(/[+]/g, '&gt;')}/new`);
}

