var xmpp = require('node-xmpp')
var events = require('events')
var util
try {
	util = require('util')
} catch(e) {
	util = require('sys')
}


function Channel() {
	events.EventEmitter.call(this)
	this.users = {};
	this.by_jid = {};
}

util.inherits(Channel, events.EventEmitter)

function createMUCService(router) {


var MUC = function() {
	var Channels = {}

	this.handler = function(stanza) {
		console.log("XMPP< "+stanza.toString());
		if (stanza.attrs.type !== 'error') {
			var to = new xmpp.JID(stanza.attrs.to)
			var channelname = [to.user, to.domain]
			var channel

			if(!Channels[channelname]) {
				Channels[channelname] = new Channel();
			}
			channel = Channels[channelname]

			if(stanza.name == 'presence') {
				if(stanza.attrs.type !=='unavailable') {
					// Update or add presence
					if(channel.users[to.resource] && channel.users[to.resource] !== stanza.attrs.from) {
						var t = stanza.attrs.to
						stanza.attrs.to = stanza.attrs.from
						stanza.attrs.from = t
						stanza.attrs.type = 'error'
						stanza.c('error', {code: '409', type: 'cancel'}).c('conflict').c('text').t('That nickname is already in use')
						router.send(stanza)
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
				console.log("XMPP> "+stanza.toString());
				router.send(stanza);
			}

			if(stanza.attrs.type =='unavailable') {
				// Clear presence
				// FIXME: can be spoofed
				delete channel.users[to.resource]
				delete channel.by_jid[stanza.attrs.from]
			}

		 }
	}
}

util.inherits(MUC, events.EventEmitter)

return new MUC()


}

exports.createMUCService = createMUCService
