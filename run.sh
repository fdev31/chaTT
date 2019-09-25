#!/bin/sh
source pyenv/bin/activate
exec uwsgi --ini sample_configs/uwsgi.ini
#exec python ./daemons/server.py
