mqtt = require('mqtt')
client = mqtt.connect('ws://localhost:9001')
client.on('connect', ()=>console.log('connected'))
client.on('message', (msg)=>console.log(msg))
client.on('error', (msg)=>console.log(msg))


