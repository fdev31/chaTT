"use strict"

const userName = prompt('Nick name')
const messagesLog = [];
let client = null;

function showMessages() {
    const elt = document.getElementById('all_texts');
    elt.innerHTML = messagesLog.join('<br/>');
    elt.scrollTop = elt.scrollHeight;
}

function sendText(keypress) {
    if (keypress.code == 'Enter') {
        const text = document.getElementById('input_text').value;
        const payload = JSON.stringify({'author': userName, 'text': text});
        client.publish('rooms/main/newtext', payload, 1, true);
        document.getElementById('input_text').value = '';
    }
}

function appInit() {
    // install ENTER handler for the input
    document.getElementById('input_text').addEventListener('keydown', sendText);

    // setup the Mqtt client
    client = new Paho.MQTT.Client(host, 9001, "/", "jsClient"+((Math.random()*100)&100));
    client.onMessageArrived = (msg) => {
        if (msg.topic == 'rooms/main/newtext') {
            const payload = JSON.parse(msg.payloadString);
            users.add(payload.author);
            messagesLog.push(`<b>${payload.author}</b>: ${payload.text}`);
            showMessages();
        } else if (msg.topic.match(/^rooms/)) {
            rooms.add(msg.topic.split('/')[1]);
        }
    }
    //client.onConnected = () => console.log('cool!');
    client.connect({
        userName: login,
        password : password,
        hosts : [host],
        ports : [9001],
        reconnect: false,
        onSuccess: () => {
            client.subscribe("rooms/#", {
                onFailure: (...args) => {console.log("Error subscribing:", args)}
            });
            showMessages();
            console.log('init finished.');
        },
        onFailure: () => alert('Failed :(')
    });

    var rms = document.getElementById("rooms");
    rms.innerHTML = Array.from(rooms).join('</br>')
    var usr = document.getElementById("users");
    usr.innerHTML = Array.from(users).join('</br>')

    document.getElementById('input_text').focus();
}
