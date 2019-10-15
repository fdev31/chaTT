#!/bin/env python
import os
import time
import json
import logging
import asyncio

import aiodns
import aiojobs
from aiohttp import web
from aiojobs.aiohttp import setup, spawn

from hbmqtt.client import MQTTClient, ClientException
from hbmqtt.mqtt.constants import QOS_1, QOS_2

mqtt_config = {}
routes = web.RouteTableDef()

# Mqtt bot states & handlers

DB_FILE='chatinfo.json'
f = open('templates/index.html')
TEMPLATE = f.read()
f.close()
del f

# exported
KNOWN_ROOMS = set(['main'])
KNOWN_USERS = set(['bot'])
MESSAGES = dict()

# internal
authors = set(['bot'])
channels = set(['main'])
messages = dict()
authors_info = dict()
authors_by_addr = dict()

resolver = aiodns.DNSResolver(loop=asyncio.get_event_loop())

def set_author_info(author, **kw):
    if author not in authors_info:
        authors_info[author] = {}
    authors_info[author].update(kw)

async def mqtt_pub(topic, payload={}):
    await mqtt_config['client'].publish(topic, json.dumps(payload).encode('ascii'))

def publish_channels():
    KNOWN_ROOMS.clear()
    KNOWN_ROOMS.update(channels)

def publish_users():
    KNOWN_USERS.clear()
    KNOWN_USERS.update(authors)

def publish_text(room, log):
    MESSAGES[room] = log

async def handle_newcomer(user, data):
    ip_address = data['ipAddress']
    hostname = (await resolver.gethostbyaddr(ip_address)).name

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
        await mqtt_pub('rooms/main/newtext', {'author': 'bot', 'text': ' '.join(message)})

    set_author_info(user, ip=ip_address, host=hostname, last_connect=time.time(), last_seen=time.time())

async def process_message(topic, message):
    split_topic = topic.split('/')
    obj = json.loads(message) if message else None

    if split_topic[0] == 'rooms':
        channel = split_topic[1]
        old_len = len(channels)
        channels.add(channel)
        if old_len < len(channels):
            publish_channels()
        if split_topic[2] == 'newtext':
            if not channel in messages:
                messages[channel] = []

            old_len = len(authors)
            authors.add(obj['author'])
            messages[channel].append([obj['author'], obj['text']])
            publish_text(channel, messages[channel])
            if old_len < len(authors):
                publish_users()
            set_author_info(obj['author'], last_seen=time.time())
    elif split_topic[0] == 'users':
        if split_topic[2] == 'hello':
            await handle_newcomer(split_topic[1], obj)
            old_len = len(authors)
            authors.add(split_topic[1])
            if old_len < len(authors):
                publish_users()

# MQTT Daemon

async def mqttDaemon(request):
    C = MQTTClient(client_id='bot', config={'reconnect_retries': 200, 'reconnect_max_interval': 30, 'keep_alive': 60, 'ping_delay': 30}, loop=asyncio.get_event_loop())
    mqtt_config['client'] = C
    await C.connect('mqtt://localhost/')
    await C.subscribe([
            ('rooms/#', QOS_1),
            ('users/#', QOS_1),
         ])
    try:
        while True:
            message = await C.deliver_message()
            packet = message.publish_packet

            topic = packet.variable_header.topic_name
            text = packet.payload.data.decode('ascii')
            await process_message(topic, text)

        await C.unsubscribe(['rooms/#', 'users/#'])
        await C.disconnect()
    except ClientException as ce:
        logger.error("Client exception: %s" % ce)

# HTTP SERVER

@routes.get('/')
async def handle(request):
    host_info = request.headers.get('HTTP_X_FORWARDED_FOR') or request.transport.get_extra_info('peername')

    if 'job' not in mqtt_config:
        mqtt_config['job'] = spawn(request, mqttDaemon(request))
        await mqtt_config['job']

    return web.Response(text=TEMPLATE.replace("{{!ip_addr}}", host_info[0]), content_type='text/html')

@routes.get('/data/lastinfo')
async def cb(request):
    return web.json_response({'users': list(KNOWN_USERS),
            'rooms': list(KNOWN_ROOMS),
            'messages': MESSAGES
            })

routes.static('/static', 'static') # Just in case, prefer nginx instead
app = web.Application()
app.add_routes(routes)
setup(app)

if __name__ == '__main__':
    # load state
    if os.path.exists(DB_FILE):
        f = open(DB_FILE)
        obj = json.load(f)
        f.close()
        for name in obj['authors']:
            authors.add(name)
        for name in obj['rooms']:
            channels.add(name)
        for room, log in obj['messages'].items():
            messages[room] = log
            publish_text(room, log)
        for author, info in obj.get('authors_info', {}).items():
            authors_info[author] = info
        for addr, namelist in obj.get('authors_by_addr', {}).items():
            authors_by_addr[addr] = set(namelist)
    publish_users()
    publish_channels()
    # run server
    web.run_app(app)
    # save state
    f = open(DB_FILE, 'w')
    json.dump({
        'messages': messages,
        'authors_by_addr': {k: list(v) for k, v in authors_by_addr.items()},
        'authors_info': authors_info,
        'authors': list(authors),
        'rooms': list(channels)
        }, f)
    f.close()
