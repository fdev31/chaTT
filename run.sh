#!/bin/sh
. pyenv/bin/activate
exec python ./daemons/server.py
