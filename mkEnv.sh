#!/bin/sh
D=pyenv
rm -fr $D
mkdir $D
python -m venv $D
source $D/bin/activate
pip install -r requires.txt
pip install uwsgi
