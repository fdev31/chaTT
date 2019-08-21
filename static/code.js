"use strict"

const userName = prompt('Nick name')
const messagesLog = [];
const maxMessages = 50;
let client = null;

const activeSession = {
    currentChannel: 'main'
}

function drawRooms() {
    var rms = document.getElementById("all_channels");
    rms.innerHTML = Array.from(rooms).join('</br>')
}
function drawUsers() {
    var usr = document.getElementById("all_nicks");
    usr.innerHTML = Array.from(users).join('</br>')
}

function showMessages() {
    const elt = document.getElementById('all_texts');
    elt.innerHTML = messagesLog.join('<br/>');
    elt.scrollTop = elt.scrollHeight;
}

function sendText(keypress) {
    if (keypress.code == 'Enter') {
        const text = document.getElementById('input_text').value;
        const payload = JSON.stringify({'author': userName, 'text': text});
        client.publish(`rooms/${activeSession.currentChannel}/newtext`, payload, {qos: 1, retain: true});
        document.getElementById('input_text').value = '';
    }
}

function messageArrived(topic, msg) {
    if (topic == `rooms/${activeSession.currentChannel}/newtext`) {
        const payload = JSON.parse(msg.toString());
        const old_size = users.size;
        users.add(payload.author);
        if (old_size < users.size) {
            drawUsers();
        }
        if (messagesLog.length >= maxMessages) { // truncate log
            messagesLog.splice(0, 1);
        }
        messagesLog.push(`<b>${payload.author}</b>: ${payload.text}`);
        showMessages();
    } else if (topic.match(/^rooms/)) {
        const old_size = rooms.size;
        rooms.add(topic.split('/')[1]);
        if (old_size < rooms.size) {
            drawRooms();
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
        showMessages();
        console.log('init finished.');
    });
    client.on('message', messageArrived);
    drawRooms();
    drawUsers();
    document.getElementById('input_text').focus();
}


function channelListClicked(item) {
    activeSession.currentChannel = item.childNodes[0].data;
}

function userListClicked(item) {
    console.log(item.childNodes[0].data);
}
