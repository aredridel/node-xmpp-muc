var xmpp = require('node-xmpp')

var MY_JID = 'test.0x42.net'

var r = new xmpp.Router(5299)

var Channels = {}

var Channel = function() {
	this.users = {};
	this.by_jid = {};
}

r.register(MY_JID, function(stanza) {
	 console.log("<< "+stanza.toString());
	 if (stanza.attrs.type !== 'error') {
		var to = new xmpp.JID(stanza.attrs.to);
		console.log("Tag! " + stanza.attrs.to);

		if(!Channels[[to.user, to.domain]]) Channels[[to.user, to.domain]] = new Channel();

		if(stanza.name == 'presence') {
			if(stanza.attrs.type =='unavailable') {
				// Clear presence
			} else {
				// Update or add presence
				Channels[[to.user, to.domain]].users[to.resource] = stanza.attrs.from
				Channels[[to.user, to.domain]].by_jid[stanza.attrs.from] = to.resource
			}
		}

		stanza.attrs.from = to.user + '@' + to.domain +'/'+(Channels[[to.user, to.domain]].by_jid[stanza.attrs.from]);
		for(var k in Channels[[to.user, to.domain]].users) {
			stanza.attrs.to = Channels[[to.user, to.domain]].users[k]
			console.log(">> "+stanza.toString());
			r.send(stanza);
		}

	 }
});
