#!/bin/env python

# config
PROTO="tcp"# websockets or tcp

if PROTO == "websockets":
    PORT=9001
else:
    PORT=1883

TOPIC="rooms/#"

import os
import sys
import json
import random
import getpass

# TODO: config file
HOST = os.getenv('HOST') or input('host (mqtt.myhost.com): ').strip()
USER = os.getenv('USER') or input('login: ').strip()
PASS = os.getenv('PASS') or getpass.getpass('password: ').strip()
MAX_HISTORY = 1000

import bottle
from bottle import route, run, template
import paho.mqtt.client as mqtt

STATIC_FILES_PATH = os.path.join(os.path.abspath(os.path.curdir), 'static')
assert( os.path.exists('README.rst') )

KNOWN_ROOMS = set()
KNOWN_USERS = set()
RECORDED_MESSAGES = {}

DEBUG = os.getenv('DEBUG')

def init_mqtt():

    def handle_newtext(room, payload):
        # keep track of the activity
        if room not in RECORDED_MESSAGES:
            RECORDED_MESSAGES[room] = []
        msgs = RECORDED_MESSAGES[room]
        msgs.append(payload)
        if len(msgs) > MAX_HISTORY:
            msgs.pop(0)
        KNOWN_USERS.add(payload['author'])

    def on_message(client, userdata, message):
        if message.topic.startswith('rooms'):
            _, room, action = message.topic.split('/', 3)
            KNOWN_ROOMS.add(room)
            if action == 'newtext':
                payload = json.loads(message.payload.decode("utf-8"))
                handle_newtext(room, payload)

        if DEBUG:
            print("message received " ,str(message.payload.decode("utf-8")))
            print("message topic=",message.topic)
            print("message qos=",message.qos)
            print("message retain flag=",message.retain)

    client = mqtt.Client("pyClient-%d"%random.randint(0, 9999), transport=PROTO) #create new instance

    client.on_message = on_message
    client.username_pw_set(USER, PASS)

    client.connect(HOST, PORT)

    client.loop_start()    #start the loop
    client.subscribe(TOPIC)
    return client

# http routing

@bottle.get('/static/<name:path>')
def static_files(name):
    return bottle.static_file(name, STATIC_FILES_PATH)

@bottle.get('/')
def index():
    known_users = list(KNOWN_USERS)
    known_rooms = list(KNOWN_ROOMS)
    return template('./templates/index.html',
            user=USER,
            host=HOST,
            password=PASS,
            all_users=json.dumps(known_users),
            all_rooms=json.dumps(known_rooms),
            )

mqtt_runner = init_mqtt()

try:
    run(host='localhost', port=8080)
except Exception as e:
    print("Terminated with error: %s"%e)
    mqtt_runner.loop_stop()
