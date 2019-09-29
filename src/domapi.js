
function thumbnailClicked(elt) {
    if (!!elt['data-max-height']) {
        elt.style['max-height'] = elt['data-max-height'];
        elt.style['position'] = 'relative';
        elt['data-max-height'] = undefined;
        elt.style['z-index'] = '0';
    } else {
        elt.style['z-index'] = '2';
        elt['data-max-height'] = elt.style['max-height'];
        elt.style['max-height'] = '';
        elt.style['position'] = 'absolute';
        elt.style['left'] = '0';
        elt.style['top'] = '0';
    }
}

function recalcLayout() {
    const elt = document.getElementById('all_texts');
    elt.style['max-height'] = `${window.innerHeight-150}px`;
    elt.scrollTop = elt.scrollHeight;
}

module.exports = { recalcLayout, thumbnailClicked };
