#!/bin/env python

# expects a list of 
# <topic> <payload>
# in standart input or as argument
# run with:
#    mosquitto_sub -v -L 'mqtt://login:pass@hostname:port/rooms/#' | ./memorize.py
# (replace login, pass & hostname)

import os
import json
import time
import fileinput
import threading

import requests

import debounce

host_port = os.getenv('HOST') or input('Enter the HTTP host & port (eg: localhost:8080) ')
HTTP_SERVER = 'http://%s/'%host_port

DB_FILE='chatinfo.json'

LATENCY = 0.4
debouncer = debounce.Debouncer()

authors = set()
channels = set()
messages = dict()

if os.path.exists(DB_FILE):
    obj = json.load(open(DB_FILE))
    for name in obj['authors']:
        authors.add(name)
    for name in obj['rooms']:
        channels.add(name)
    for room, log in obj['messages'].items():
        messages[room] = log


def publish_channels():
    requests.post(HTTP_SERVER + 'cmd/setChannels', json=list(channels))

def publish_users():
    requests.post(HTTP_SERVER + 'cmd/setAuthors', json=list(authors))

def publish_text(room, log):
    requests.post(HTTP_SERVER + 'cmd/setRoomMessages', json={'room': room, 'messages': log})

def process_message(topic, message):
    if topic.startswith('rooms/'):
        split_topic = topic.split('/')
        channel = split_topic[1]
        old_len = len(channels)
        channels.add(channel)
        if old_len < len(channels):
            debouncer.schedule(publish_channels, LATENCY)
        if split_topic[2] == 'newtext':
            if not channel in messages:
                messages[channel] = []

            obj = json.loads(message)
            old_len = len(authors)
            authors.add(obj['author'])
            messages[channel].append([obj['author'], obj['text']])
            publish_text(channel, messages[channel])
            if old_len < len(authors):
                debouncer.schedule(publish_users, LATENCY)

if __name__ == '__main__':
    debouncer.start()
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
    except KeyboardInterrupt:
        debouncer.running = False
        json.dump({'messages': messages, 'authors': list(authors), 'rooms': list(channels)}, open(DB_FILE, 'w'))

