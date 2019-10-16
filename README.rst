#####
ChaTT
#####


Quickstart
##########

`Download the project <https://github.com/fdev31/chaTT/archive/master.zip>`_, uncompress it and open a shell inside the extracted folder.


Run `mkEnv.sh` (once)

Then you can run the server (edit ``sample_configs/uwsgi.ini`` first to set the environment variables!)::

   ./run.sh

Alternatively, to not be asked for the credentials::

   HOST=server_hostname ./run.sh

.. note:: you need to replace the `server_*` values with the ones matching your server setup.

And connect with your browser::

   xdg-open http://localhost:8080/

Using the passphrase
====================

Generate the USER & PASS pairs::

    ./scripts/genpass.js "foobar"

Sample output::

    Login & pass:
    R3ZXKboT3M5VqPxOQclSB1SPAM3TVS5lqq33YTyi6iN26SRtboiRAzV4TbGP6ha4CI
    vUYP1AR1P23lTb6XAO1KhNaK2NQAFQ6DtrLpaEC1wdvu5hafjvCVQFn4R64WuQv4pD

Then edit your uswsgi .ini file to use those as ``USER`` and ``PASS`` environment (same as ``HOST``).

You can also export the environment before running ``run.sh``::

       export USER=server_username
       export PASS=server_password 

.. note::

    - It is also recommended to use HTTPS and the wss socket
    - The sample password file uses the challenge "plop"

Mqtt
====

Since the daemon depends on hbmqtt, a configuration file for the hbmqtt broker is provided::

    hbmqtt -c sample_configs/hbmqtt.yaml

A mosquitto setup is also provided, try the sample config::

    mosquitto -c sample_configs/mosquitto.conf

You'll need to proceed to more configuration to enable the challenge, by configuring a password file and disabling the anonymous authentication on MQTT.

Storage (addon)
===============

To enable the storage of messages, you have to run `src/memorize.py`::

    mosquitto_sub -L "mqtt://$USER:$PASS@localhost:1883/rooms/#" -t 'users/#' -v | python ./memorize.py

Look at the header in the file for more information.


Roadmap
#######

For a rough list of tasks, check the tickets__

__ https://github.com/fdev31/chaTT/blob/master/tickets.rst


Technical details
#################

HTTP API
========

/
-

Main template

/cmd/*
------

Control of the server data, used by `memorize.py` only and should not be allowed externally (allow only *localhost*).

Mqtt Topics
===========

In addition to the basic **Mqtt** `tcp` protocol, the `Websocket` protocol support is required on the server side.


rooms/
   <room name>/
      :newtext: *new message in the room*

         :author: the author nickname
         :text: the message
users/
    <user name>
        :hello: *welcome message*

            *payload is undefined*

HTML template elements
======================

#all_channels
   element containing the channel list
#all_nicks
   element containing the user list
#all_texts
   element containing the messages


Misc notes
##########

Doesn't work with mosquitto 1.6.4 on archlinux
    socket is closed during the websocket handshake
