#!/bin/env python

# expects a list of 
# <topic> <payload>
# in standart input or as argument
# run with:
#    mosquitto_sub -L 'mqtt://login:pass@hostname:port/rooms/#' | ./memorize.py
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

LATENCY = 0.4
debouncer = debounce.Debouncer()

authors = set()
channels = set()

def publish_channels():
    requests.post(HTTP_SERVER + 'cmd/setChannels', json=list(channels))

def publish_users():
    requests.post(HTTP_SERVER + 'cmd/setAuthors', json=list(authors))

def process_message(topic, message):
    if topic.startswith('rooms/'):
        split_topic = topic.split('/')
        channel = split_topic[1]
        old_len = len(channels)
        channels.add(channel)
        if old_len < len(channels):
            debouncer.schedule(publish_channels, LATENCY)
        if split_topic[2] == 'newtext':
            obj = json.loads(message)
            old_len = len(authors)
            authors.add(obj['author'])
            if old_len < len(authors):
                debouncer.schedule(publish_users, LATENCY)

if __name__ == '__main__':
    debouncer.start()
    try:
        for line in fileinput.input():
            topic, message = line.split(' ', 1)
            process_message(topic, message)
    except KeyboardInterrupt:
        debouncer.running = False

