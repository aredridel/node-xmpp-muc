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
		var to = new xmpp.JID(stanza.attrs.to)
		var channelname = [to.user, to.domain]
		var channel

		if(!Channels[channelname]) {
			Channels[channelname] = new Channel();
		}
		channel = Channels[channelname]

		if(stanza.name == 'presence') {
			if(stanza.attrs.type =='unavailable') {
				// Clear presence
				delete channel.users[to.resource]
				delete channel.by_jid[stanza.attrs.from]
			} else {
				// Update or add presence
				if(channel.users[to.resource] && channel.users[to.resource] !== stanza.attrs.from) {
				var t = stanza.attrs.to
				stanza.attrs.to = stanza.attrs.from
				stanza.attrs.from = t
				stanza.attrs.type = 'error'
				stanza.c('error', {code: '409', type: 'cancel'}).c('conflict').c('text').t('That Nickname is already in use')
				r.send(stanza)
				return;
} else {
				channel.users[to.resource] = stanza.attrs.from
				channel.by_jid[stanza.attrs.from] = to.resource
}

			}
		}

		stanza.attrs.from = to.user + '@' + to.domain +'/'+(channel.by_jid[stanza.attrs.from]);
		for(var k in channel.users) {
			stanza.attrs.to = channel.users[k]
			console.log(">> "+stanza.toString());
			r.send(stanza);
		}

	 }
});
