#!/bin/env python

import os
import sys
import json
import getpass

# TODO: config file
HOST = os.getenv('HOST') or input('host (mqtt.myhost.com): ').strip()
USER = os.getenv('USER') or input('login: ').strip()
PASS = os.getenv('PASS') or getpass.getpass('password: ').strip()

import bottle
from bottle import route, run, template

STATIC_FILES_PATH = os.path.join(os.path.abspath(os.path.curdir), 'static')
assert( os.path.exists('README.rst') )

KNOWN_ROOMS = set()
KNOWN_USERS = set()
MESSAGES = dict()

# http routing

# internal commands - should not be exposed out of localhost

@bottle.post('/cmd/setRoomMessages')
def cb():
    data = bottle.request.json
    MESSAGES[data['room']] = data['messages']

@bottle.post('/cmd/setChannels')
def cb():
    for name in bottle.request.json:
        KNOWN_ROOMS.add(name)

@bottle.post('/cmd/setAuthors')
def cb():
    for name in bottle.request.json:
        KNOWN_USERS.add(name)

# static files - should not be used,
# use your http server static file capabilities instead

@bottle.get('/static/<name:path>')
def static_files(name):
    return bottle.static_file(name, STATIC_FILES_PATH)

# main template, includes current data

@bottle.get('/')
def index():
    known_users = list(KNOWN_USERS)
    known_rooms = list(KNOWN_ROOMS)
    ip_addr = bottle.request.environ.get('HTTP_X_FORWARDED_FOR', '')
    return template('./templates/index.html',
            user=USER,
            host=HOST,
            password=PASS,
            ip_addr=ip_addr,
            all_users=json.dumps(known_users),
            all_rooms=json.dumps(known_rooms),
            all_messages=json.dumps(MESSAGES),
            )

if __name__ == "__main__":
    try:
        print("start")
        run(host='localhost', port=8080)
    except Exception as e:
        print("Terminated with error: %s"%e)
else:
    application = bottle.app()
