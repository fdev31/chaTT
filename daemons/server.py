#!/bin/env python

import os
import sys
import json
import getpass

# TODO: config file
HOST = os.getenv('HOST') or input('host (mqtt.myhost.com): ').strip()

import bottle
from bottle import route, run, template

STATIC_FILES_PATH = os.path.join(os.path.abspath(os.path.curdir), 'static')
assert( os.path.exists('README.rst') )

KNOWN_ROOMS = set(['main'])
KNOWN_USERS = set(['bot'])
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
    KNOWN_USERS.clear()
    KNOWN_USERS.update(bottle.request.json)

# static files - should not be used,
# use your http server static file capabilities instead

@bottle.get('/static/<name:path>')
def static_files(name):
    return bottle.static_file(name, STATIC_FILES_PATH)

@bottle.get('/data/lastinfo')
def cb():
    return {'users': list(KNOWN_USERS),
            'rooms': list(KNOWN_ROOMS),
            'messages': MESSAGES
            }

# main template, includes current data

@bottle.get('/')
def index():
    ip_addr = bottle.request.environ.get('HTTP_X_FORWARDED_FOR', '')
    return template('./templates/index.html',
            ip_addr=ip_addr,
            )

if __name__ == "__main__":
    try:
        print("start")
        run(host='localhost', port=8080)
    except Exception as e:
        print("Terminated with error: %s"%e)
else:
    application = bottle.app()
