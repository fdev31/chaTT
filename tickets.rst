Roadmap: To do
==============

:total-count: 6

--------------------------------------------------------------------------------

Make the server read a configuration file instead of prompting
==============================================================

:bugid: 2
:created: 2019-08-21T19:45:53
:priority: 0
:tags: #notsure

will remove the need for asking:

- login
- password
- host

--------------------------------------------------------------------------------

optimize the DOM refreshing
===========================

:bugid: 4
:created: 2019-08-21T23:57:33
:priority: 0

innerHTML recomputing everything vs delta ?

Try different techniques and benchmark them in this specific context.

--------------------------------------------------------------------------------

Do not return values in the template anymore
============================================

:bugid: 6
:created: 2019-09-04T21:46:48
:priority: 0

PoC time is over, let's secure it!

Only allow authenticated users to see the content,
a new separate request is needed to get the initial values.

At the same time we could make the messages a bit more rich:

- pseudo-random-id
- timestamp
