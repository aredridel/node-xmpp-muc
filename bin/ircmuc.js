var xmpp = require('node-xmpp');

var r = new xmpp.Router(5299);
r.register('test.0x42.net', function(stanza) {
    console.log("<< "+stanza.toString());
    if (stanza.attrs.type !== 'error') {
	var me = stanza.attrs.to;
	stanza.attrs.to = stanza.attrs.from;
	stanza.attrs.from = me;
	r.send(stanza);
    }
});
