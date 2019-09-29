import {ICONS_STATES} from './ui_styling.js';

class IconManager {
    constructor() {
        /** replace all .svgIcon with the real svg icon base on the name, eg:
         * <span class="svgIcon" id="sound_icon" name="sound_off" />
         * - keeps the id attribute untouched & forces "svgIcon" class
         */
        this.current_states = {};
        document.querySelectorAll('.svgIcon').forEach( (elt)=> {
            elt.parentElement.onmouseover = ()=> iconManager.changeState(elt.attributes.id.value, 'hover');
            elt.parentElement.onmouseleave = ()=> iconManager.changeState(elt.attributes.id.value); // no state == reset to last state
            elt.outerHTML = `<object class="svgIcon" id="${elt.attributes.id.value}" type="image/svg+xml" data="static/img/icons/${elt.attributes.title.value}.svg"></object>`
        }
        );
    }
    changeState(icon, state) {
        if (state == undefined) {
            state = this.current_states[icon] || 'reset';
        } else if (state != 'hover') { // hover is not a real state, it's "transient"
            this.current_states[icon] = state;
        }
        const elt = Snap(document.getElementById(icon));
        const states = this.icon_states[icon][state];
        for (const k of Object.keys(states)) {
            elt.select('#'+k).animate(states[k], 200);
        }
    }
}

IconManager.prototype.icon_states = ICONS_STATES;

const iconManager = new IconManager();

module.exports = {iconManager};
