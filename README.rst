#####
ChaTT
#####


Quickstart
##########

`Download the project <https://github.com/fdev31/chaTT/archive/master.zip>`_, uncompress it and open a shell inside the extracted folder.

Try this installation method::

   python -m venv /tmp/foo
   source /tmp/foo/bin/activate
   pip install -r requires.txt


Then you can run the server::

   ./run.sh

Alternatively, to not be asked for the credentials::

   PASS=server_password HOST=server_hostname USER=server_username ./run.sh

.. note:: you need to replace the `server_*` values with the ones matching your server setup.


And connect with your browser::

   xdg-open http://localhost:8080/

Roadmap
#######

For a rough list of tasks, check the tickets__

__ https://github.com/fdev31/chaTT/blob/master/tickets.rst


Technical details
#################

In addition to the basic **Mqtt** `tcp` protocol, the `Websocket` protocol support is required on the server side.

Mqtt Topics
===========

rooms/
   <room name>/
      :newtext: *new message in the room*

         :author: the author nickname
         :text: the message


HTML template elements
======================

#all_channels
   element containing the channel list
#all_nicks
   element containing the user list
#all_texts
   element containing the messages

