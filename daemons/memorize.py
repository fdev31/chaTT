#!/bin/env python

# expects a list of 
# <topic> <payload>
# in standart input or as argument
# run with:
#    mosquitto_sub -v -L 'mqtt://login:pass@hostname:port/rooms/#' -t 'users/#' | ./memorize.py
# (replace login, pass & hostname)

import os
import json
import time
import socket
import fileinput
import threading
import subprocess

import requests

import debounce

host_port = os.getenv('HOST') or input('Enter the HTTP host & port (eg: localhost:8080) ')
HTTP_SERVER = 'http://%s/'%host_port

# for the localhost mqtt server
login = os.getenv('USER') or input('Enter user: ')
password = os.getenv('PASS') or input('Enter pass: ')

DB_FILE='chatinfo.json'

LATENCY = 0.4
USER_IDLE_DELAY= 10*60 # 10 minutes

debouncer = debounce.Debouncer()

class IdleMarker(threading.Thread):
    running = True
    def run(self):
        while self.running:
            for n in range(60):
                time.sleep(1)
                if not self.running:
                    break
            else:
                now = time.time()
                for author in list(authors):
                    info = authors_info.get(author)
                    if info == None or now - info.get('last_seen', 0) > USER_IDLE_DELAY:
                        authors.remove(author)
                        print("Removing %s"%author)
                        mqtt_pub('users/%s/logout'%author)
                        publish_users()

authors = set()
channels = set()
messages = dict()

authors_info = dict()
authors_by_addr = dict()

def set_author_info(author, **kw):
    if author not in authors_info:
        authors_info[author] = {}
    authors_info[author].update(kw)

if os.path.exists(DB_FILE):
    obj = json.load(open(DB_FILE))
    for name in obj['authors']:
        authors.add(name)
    for name in obj['rooms']:
        channels.add(name)
    for room, log in obj['messages'].items():
        messages[room] = log
    for author, info in obj.get('authors_info', {}).items():
        authors_info[author] = info
    for addr, namelist in obj.get('authors_by_addr', {}).items():
        authors_by_addr[addr] = set(namelist)

def mqtt_pub(topic, payload={}):
    subprocess.call(['mosquitto_pub', '-L', 'mqtt://'+login+':'+password+'@localhost:1883/'+topic, '-m', json.dumps(payload)])

def publish_channels():
    requests.post(HTTP_SERVER + 'cmd/setChannels', json=list(channels))

def publish_users():
    requests.post(HTTP_SERVER + 'cmd/setAuthors', json=list(authors))

def publish_text(room, log):
    requests.post(HTTP_SERVER + 'cmd/setRoomMessages', json={'room': room, 'messages': log})

def handle_newcomer(user, data):
    ip_address = data['ipAddress']
    hostname = socket.gethostbyaddr(ip_address)[0]

    if ip_address in authors_by_addr:
        other_names = authors_by_addr[ip_address]
        other_names.add(user)
    else:
        other_names = authors_by_addr[ip_address] = set([user])

    friends = other_names.copy()
    friends.discard(user)

    message = ['@%s: '%user]
    ignore = False

    if user not in authors_info:
        message.append('Welcome <b>%s</b>!!'%user)
        if friends:
            message.append('@ %s...'%(', '.join(friends)))
    else:
        old_data = authors_info.get(user)
        if old_data['ip'] == ip_address:
            ignore = True
        else:
            message.append('%s, did you change your computer?'%user) # host changed
        if user not in authors: # was online!
            message.append('Welcome back online <b>%s</b>! :)'%user)
            ignore = False
        else: # reconnect ?
            if time.time() - old_data['last_seen'] < 5*60:
                message.append('Having connection issues?')
            else:
                message.append('Long time no see! ;)')
                ignore = False

    if not ignore:
        message.append('From %s :: %s'%(hostname, ip_address))
        mqtt_pub('rooms/main/newtext', {'author': 'bot', 'text': ' '.join(message)})

    debouncer.schedule(lambda: set_author_info(user, ip=ip_address, host=hostname, last_connect=time.time(), last_seen=time.time()), 2.0)

def process_message(topic, message):
    split_topic = topic.split('/')
    obj = json.loads(message)

    if split_topic[0] == 'rooms':
        channel = split_topic[1]
        old_len = len(channels)
        channels.add(channel)
        if old_len < len(channels):
            debouncer.schedule(publish_channels, LATENCY)
        if split_topic[2] == 'newtext':
            if not channel in messages:
                messages[channel] = []

            old_len = len(authors)
            authors.add(obj['author'])
            messages[channel].append([obj['author'], obj['text']])
            publish_text(channel, messages[channel])
            if old_len < len(authors):
                debouncer.schedule(publish_users, LATENCY)
            set_author_info(author, last_seen=time.time())
    elif split_topic[0] == 'users':
        if split_topic[2] == 'hello':
            handle_newcomer(split_topic[1], obj)
            old_len = len(authors)
            authors.add(split_topic[1])
            if old_len < len(authors):
                debouncer.schedule(publish_users, LATENCY)

if __name__ == '__main__':
    debouncer.start()
    im = IdleMarker()
    im.start()
    try:
        def publish_all_texts():
            for channel in channels:
                publish_text(channel, messages[channel])

        if channels: # repeat saved state even if no news from mqtt
            debouncer.schedule(publish_users, LATENCY)
            debouncer.schedule(publish_channels, LATENCY)
            debouncer.schedule(publish_all_texts, LATENCY)

        for line in fileinput.input():
            topic, message = line.split(' ', 1)
            process_message(topic, message)
    except (Exception, KeyboardInterrupt):
        debouncer.running = False
        im.running = False
        json.dump({
            'messages': messages,
            'authors_by_addr': {k: list(v) for k, v in authors_by_addr.items()},
            'authors_info': authors_info,
            'authors': list(authors),
            'rooms': list(channels)
            }, open(DB_FILE, 'w'))

