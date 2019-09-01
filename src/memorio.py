#!/bin/env python
import os
import json
import random
import getpass

import requests
import paho.mqtt.client as mqtt

TOPIC="rooms/#"

MAX_HISTORY = 1000
RECORDED_MESSAGES = {}
DEBUG = os.getenv('DEBUG')

KNOWN_ROOMS = set()
KNOWN_USERS = set()

# config
PROTO="tcp" # websockets or tcp

if PROTO == "websockets":
    PORT=9001
else:
    PORT=1883

# TODO: config file
HOST = os.getenv('HOST') or input('host (mqtt.myhost.com): ').strip()
USER = os.getenv('USER') or input('login: ').strip()
PASS = os.getenv('PASS') or getpass.getpass('password: ').strip()

def notify_user_list():
    requests.post('http://%s:%s@%s/update/userList', list(KNOWN_USERS))

def notify_room_list():
    pass

def init_mqtt():
    def handle_newtext(room, payload):
        # keep track of the activity
        if room not in RECORDED_MESSAGES:
            RECORDED_MESSAGES[room] = []
        msgs = RECORDED_MESSAGES[room]
        msgs.append(payload)
        if len(msgs) > MAX_HISTORY:
            msgs.pop(0)
        old_len = len(KNOWN_USERS)
        KNOWN_USERS.add(payload['author'])
        if (len(KNOWN_USERS) > old_len):
            notify_user_list()

    def on_message(client, userdata, message):
        if message.topic.startswith('rooms'):
            _, room, action = message.topic.split('/', 3)
            old_len = len(KNOWN_ROOMS)
            KNOWN_ROOMS.add(room)
            if len(KNOWN_ROOMS) > old_len:
                notify_room_list()
            if action == 'newtext':
                payload = json.loads(message.payload.decode("utf-8"))
                handle_newtext(room, payload)

        if DEBUG:
            print("message received " ,str(message.payload.decode("utf-8")))
            print("message topic=",message.topic)
            print("message qos=",message.qos)
            print("message retain flag=",message.retain)

    client = mqtt.Client("Memorio!", transport=PROTO) #create new instance

    client.on_message = on_message
    client.username_pw_set(USER, PASS)

    client.connect(HOST, PORT)

    client.subscribe(TOPIC)
    return client

if __name__ == '__main__':
    try:
        app = init_mqtt()
        app.loop_forever()
    except Exception as e:
        print("Erro", e)
        app.loop_stop()

