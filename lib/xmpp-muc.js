var xmpp = require('node-xmpp')
var events = require('events')
var util
try {
	util = require('util')
} catch(e) {
	util = require('sys')
}


function Channel(jid, router) {
	events.EventEmitter.call(this)
	this.users = {}
	this.jid = jid
	this.by_jid = {}
	this.router = router
}

util.inherits(Channel, events.EventEmitter)

Channel.prototype.toString = function() {
	return "<xmpp:muc name='"+this.jid+"'/>"
}

Channel.prototype.send = function send(stanza) {
	for(var k in this.users) {
		stanza.attrs.to = this.users[k]
		console.log("XMPP> "+stanza.toString())
		this.router.send(stanza)
	}
}

var MUC = function(router) {
	var Channels = {}
	var muc = this
	
	this.getChannel = function(jid) {
		if(!Channels[jid]) {
			Channels[jid] = new Channel(jid, router);
			muc.emit('channel', Channels[jid])
		}
		return Channels[jid]
	}

	this.handler = function(stanza) {
		console.log("XMPP< "+stanza.toString());
		if (stanza.attrs.type !== 'error') {
			var to = new xmpp.JID(stanza.attrs.to)
			var channeljid = new xmpp.JID(to.user + '@' + to.domain)
			var channel = muc.getChannel(channeljid)

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
						channel.emit('join', channel.users[to.resource], to.resource)
					}
				}
			}

			stanza.attrs.from = to.user + '@' + to.domain +'/'+(channel.by_jid[stanza.attrs.from]);
			channel.send(stanza)

			if(stanza.attrs.type =='unavailable') {
				// Clear presence
				channel.emit('part', channel.users[to.resource], stanza.attrs.from)
				// FIXME: can be spoofed:
				delete channel.users[to.resource]
				delete channel.by_jid[stanza.attrs.from]
			}

		 }
	}
}

util.inherits(MUC, events.EventEmitter)

function createMUCService(router) {
	return new MUC(router)
}

exports.createMUCService = createMUCService
