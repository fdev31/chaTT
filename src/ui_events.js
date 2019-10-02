const globEvents = {
    init: (name) => {
        globEvents[name] = new Set();
    },
    emit: (name, ...args) => {
        for (const handler of globEvents[name]) {
            try {
                handler(...args);
            } catch (e) {
                console.error(`Emit ${name}: ${e}`);
            }
        }
    },
    on: (name_or_list, handler) => {
        const nameList = typeof name_or_list == 'string' ? [name_or_list] : name_or_list;
        for (const name of nameList)
            globEvents[name].add(handler);
    }
}


module.exports = {globEvents}
