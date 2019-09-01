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

if __name__ == "__main__":
    try:
        print("start")
        run(host='localhost', port=8080)
    except Exception as e:
        print("Terminated with error: %s"%e)
else:
    application = bottle.app()
