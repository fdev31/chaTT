import {connect} from 'mqtt';

let client = null;

function publish(topic, payload, opts) {
    client.publish(topic, payload?JSON.stringify(payload):payload, opts);
}

function onError(err) {
    if (err) console.log("MQTT Error:", err);
}

function subscribe(topic) {
    client.subscribe(topic, onError);
}

function init(url, clientName, onConnect, onMessage) {
    client = connect(url, {clientId: clientName});
    client.on('error', (err) => {
        client.options.reconnectPeriod = 0;
        console.log('mqtt init err', err);
        alert('failed.');
    });
    client.on('connect', onConnect);
    client.on('message', onMessage);
    return client;
}

module.exports = {
    publish,
    subscribe,
    init,
}
