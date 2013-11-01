var xmpp = require('node-xmpp');
var events = require('events');

module.exports = function configure(config) {
    if (config.type == 'component') {
        return new xmpp.Component(config);
    } else if (config.type == 'router') {
        var router = new xmpp.Router(config.port);
        var em = new events.EventEmitter();
        router.register(config.jid, function (stanza) {
            em.emit('stanza', stanza);
        });
        return em;
    } else {
        throw new Error('Configuration does not specify type');
    }
};
