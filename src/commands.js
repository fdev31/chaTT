// Text rendering functions
//
import {smileys} from './ui_styling.js';

const commands = {};
commands.img = (cmd, url) => `<img class="thumbnail" onclick="thumbnailClicked(this)" style="max-height: 1em" src="${url}"/>`;
commands.http = (protocol, path) => {
    const host = path.split('/')[0];
    return `<a href="${protocol}://${path}">(link to ${host})</a>`;
};
commands.https = commands.http;

const _genericCommandRe = ':([a-z]{2,10}):(?:[(](.*)[)])?';
const _urlRe = '(https?)://([^   \n]+)';
let commandsPattern = `(?:${_genericCommandRe})|(?:${_urlRe})`

function commandsProcessor(...args) {
    // get the result of a regex match and return the matching command result
    const params = args.filter( (el) => el );
    // params = [group, subgroup1 (command), subgroup2 (parameters)]
    const handler = commands[params[1]];
    if (handler) {
        return handler(...params.splice(1));
    }
    return `(?)${params[0]}(?)`;
}

function renderCommands(text) {
    text = text.replace(commandsPattern, commandsProcessor);
    for (let [re, name] of smileys) {
        text = text.replace(re, `<img class="thumbnail emoticon" src="static/img/emoticons/${name}.svg" />`);
    }
    return text;
}

function init(nickname) {
    commandsPattern = new RegExp(commandsPattern + `|(?:(@${nickname})(.*))`);
    commands[`@${nickname}`] = (me, text) => `<b>${me} ${text}</b>`;
}

module.exports = {renderCommands, init};
