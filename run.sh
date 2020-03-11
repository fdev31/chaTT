#!/bin/sh
. pyenv/bin/activate
# remove the next line to run in debug mode
exec python ./daemons/server.py
exec python -X dev ./daemons/server.py
