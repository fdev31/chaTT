Tickets
=======

:total-count: 4

--------------------------------------------------------------------------------

Add channels & users support
============================

:bugid: 1
:created: 2019-08-21T19:32:18
:priority: 0

One might want the full list of users & channels in the UI

- users & channels are collected by the server
- default list (the one known by the server) is set in the initial template
- the UI keeps growing the list by listening to ALL Mqtt events on the root topic
- the UI knows which one is the active channel to only display this one
- clicking on one user in the list adds its name inside the input text and focus the input text again

--------------------------------------------------------------------------------

Make the server read a configuration file instead of prompting
==============================================================

:bugid: 2
:created: 2019-08-21T19:45:53
:priority: 0

will remove the need for asking:

- login
- password
- host

--------------------------------------------------------------------------------

Inject host, login & password via the template instead of using prompt() in JS
==============================================================================

:bugid: 3
:created: 2019-08-21T19:46:12
:priority: 0

--------------------------------------------------------------------------------

optimize the DOM refreshing
===========================

:bugid: 4
:created: 2019-08-21T23:57:33
:priority: 0

innerHTML recomputing everything vs delta ?

Try different techniques and benchmark them in this specific context.
