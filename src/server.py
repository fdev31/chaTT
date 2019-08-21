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
import getpass

HOST = os.getenv('HOST') or input('host (mqtt.myhost.com): ').strip()
USER = os.getenv('USER') or input('login: ').strip()
PASS = os.getenv('PASS') or getpass.getpass('password: ').strip()

import bottle
from bottle import route, run, template
import json

import paho.mqtt.client as mqtt

STATIC_FILES_PATH = os.path.join(os.path.abspath(os.path.curdir), 'static')
assert( os.path.exists('README.rst') )

KNOWN_ROOMS = set()
KNOWN_USERS = set()

DEBUG = os.getenv('DEBUG')

def init_mqtt():

    def on_message(client, userdata, message):
        if message.topic.startswith('rooms'):
            _, room, action = message.topic.split('/', 3)
            KNOWN_ROOMS.add(room)
            if action == 'newtext':
                payload = json.loads(message.payload.decode("utf-8"))
                KNOWN_USERS.add(payload['author'])


        if DEBUG:
            print("message received " ,str(message.payload.decode("utf-8")))
            print("message topic=",message.topic)
            print("message qos=",message.qos)
            print("message retain flag=",message.retain)

    client = mqtt.Client("pyClient", transport=PROTO) #create new instance

    client.on_message = on_message
    client.username_pw_set(USER, PASS)

    client.connect(HOST, PORT)

    client.loop_start()    #start the loop
    client.subscribe(TOPIC)
    return client

# http routing

@bottle.get('/static/<name:path>')
def index(name):
    return bottle.static_file(name, STATIC_FILES_PATH)

@bottle.get('/')
def index():
    return template('./templates/index.html')

mqtt_runner = init_mqtt()
try:
    run(host='localhost', port=8080)
except Exception as e:
    print("Terminated with error: %s"%e)
    mqtt_runner.loop_stop()
