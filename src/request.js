function fetch(method, url) {
    return new Promise( (ok, ko) => {
        const xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                ok(JSON.parse(this.responseText));
            }
        };
        xmlhttp.open(method.toUpperCase(), url, true);
        xmlhttp.send();
    });
}


module.exports = {fetch,
    get: (url) => fetch('get', url),
    post: (url) => fetch('post', url),
};
