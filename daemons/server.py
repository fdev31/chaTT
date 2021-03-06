#!/bin/env python
import os
import time
import json
import logging
import asyncio

import aiodns
from aiohttp import web

from hbmqtt.client import MQTTClient, ClientException
from hbmqtt.mqtt.constants import QOS_1, QOS_2

assert os.path.exists('README.rst'), '-> Run from the chaTT directory please!'

logging.basicConfig(level=logging.INFO)

log = logging.getLogger('MQTT')

mqtt_config = {}

# Mqtt bot states & handlers

DB_FILE='chatinfo.json'
f = open('templates/index.html')
TEMPLATE = f.read()
f.close()
del f

# storage/state, should be shareable later
# using aiocache?
authors = set(['bot'])
channels = set(['main'])
messages = dict()
authors_info = dict()
authors_by_addr = dict()
trusted_ip_addr = dict()

resolver = aiodns.DNSResolver()

def set_author_info(author, **kw):
    if author not in authors_info:
        authors_info[author] = {}
    authors_info[author].update(kw)

async def mqtt_pub(topic, payload={}, delay=None):
    log.info('publish %s => %r', topic, payload)
    if delay:
        await asyncio.sleep(delay)
    await mqtt_config['client'].publish(topic, json.dumps(payload).encode('ascii'))

async def handle_newcomer(user, data):
    ip_address = data['ipAddress']
    hostname = resolver.gethostbyaddr(ip_address)

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

    hostname = (await hostname).name

    if not ignore:
        message.append('From %s :: %s'%(hostname, ip_address))
        await mqtt_pub('rooms/main/newtext', {'author': 'bot', 'text': ' '.join(message)}, delay=2)

    set_author_info(user, ip=ip_address, host=hostname, last_connect=time.time(), last_seen=time.time())

async def process_message(topic, message):
    split_topic = topic.split('/')
    obj = json.loads(message) if message else None
    log.info('message on %s => %r', topic, message)

    if split_topic[0] == 'rooms':
        channel = split_topic[1]
        channels.add(channel)
        if split_topic[2] == 'newtext':
            if not channel in messages:
                messages[channel] = []

            authors.add(obj['author'])
            messages[channel].append([obj['author'], obj['text']])
            set_author_info(obj['author'], last_seen=time.time())
    elif split_topic[0] == 'users':
        if split_topic[2] == 'hello':
            await handle_newcomer(split_topic[1], obj)
            authors.add(split_topic[1])

# MQTT Daemon

async def mqttDaemon():
    C = MQTTClient(client_id='bot',
            config={
                'keep_alive': 50,
                'ping_delay': 3,
                'reconnect_max_interval': 3,
                'reconnect_retries': 200,
                }
            )
    mqtt_config['client'] = C
    await C.connect('mqtt://%s/'%os.environ.get('HOST', 'localhost'))
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
            asyncio.create_task(process_message(topic, text))

        await C.unsubscribe(['rooms/#', 'users/#'])
        await C.disconnect()
    except ClientException as ce:
        log.error("Client exception: %s" % ce)

# HTTP SERVER

routes = web.RouteTableDef()

@routes.get('/')
async def handle(request):
    host_info = request.headers.get('HTTP_X_FORWARDED_FOR') or request.transport.get_extra_info('peername')
    return web.Response(text=TEMPLATE.replace("{{!ip_addr}}", host_info[0]), content_type='text/html')

@routes.get('/data/lastinfo')
async def handle(request):
    host_info = request.headers.get('HTTP_X_FORWARDED_FOR') or request.transport.get_extra_info('peername')
    user = request.query['user']
    if user not in trusted_ip_addr:
        trusted_ip_addr[user] = set()
    trusted_ip_addr[user].add(host_info)
    return web.json_response({'users': list(authors),
            'rooms': list(channels),
            'messages': messages
            })

routes.static('/static', 'static') # Just in case, prefer nginx instead
app = web.Application()
app.add_routes(routes)

async def httpDaemon(app, host, port):
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, host, port).start()
    return runner

def main():
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
        for author, info in obj.get('authors_info', {}).items():
            authors_info[author] = info
        for addr, namelist in obj.get('authors_by_addr', {}).items():
            authors_by_addr[addr] = set(namelist)

    # run server
    apps = [httpDaemon(app, '0.0.0.0', 8080), mqttDaemon()]
    try:
        asyncio.get_event_loop().run_until_complete(
                asyncio.gather(*apps)
                )
    except KeyboardInterrupt:
        print("bye bye")

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

if __name__ == '__main__':
    main()
