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

var MUC = function(router) {
	var Channels = {}
	var muc = this
	
	this.getChannel = function(channelname) {
		if(!Channels[channelname]) {
			Channels[channelname] = new Channel();
			muc.emit('channel', Channels[channelname])
		}
		return Channels[channelname]
	}

	this.handler = function(stanza) {
		console.log("XMPP< "+stanza.toString());
		if (stanza.attrs.type !== 'error') {
			var to = new xmpp.JID(stanza.attrs.to)
			var channelname = [to.user, to.domain]
			var channel = muc.getChannel(channelname)

			if(stanza.name == 'presence') {
				if(stanza.attrs.type !=='unavailable') {
					// Update or add presence
					if(channel.users[to.resource]) {
						if(channel.users[to.resource] !== stanza.attrs.from) { // Collide!
							var t = stanza.attrs.to
							stanza.attrs.to = stanza.attrs.from
							stanza.attrs.from = t
							stanza.attrs.type = 'error'
							stanza.c('error', {code: '409', type: 'cancel'}).c('conflict').c('text').t('That nickname is already in use')
							router.send(stanza)
							return;
						} else { // Update presence.
							channel.users[to.resource] = stanza.attrs.from
							channel.by_jid[stanza.attrs.from] = to.resource
						}
					} else { // Add presence.
						channel.users[to.resource] = stanza.attrs.from
						channel.by_jid[stanza.attrs.from] = to.resource
						channel.emit('join', channel.users[to.resource], stanza.attrs.from)
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
				channel.emit('part', channel.users[to.resource], stanza.attrs.from)
			}

		 }
	}
}

util.inherits(MUC, events.EventEmitter)

function createMUCService(router) {
	return new MUC(router)
}

exports.createMUCService = createMUCService
