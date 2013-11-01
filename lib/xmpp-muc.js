var xmpp = require('node-xmpp');
var events = require('events');
var util = require('util');

function Channel(jid, router) {
	events.EventEmitter.call(this);
	this.users = {};
	this.jid = jid;
	this.by_jid = {};
	this.router = router;
}

util.inherits(Channel, events.EventEmitter);

Channel.prototype.toString = function() {
	return "<xmpp:muc name='" + this.jid + "'/>";
};

Channel.prototype.send = function send(stanza) {
	for(var k in this.users) {
		stanza.attrs.to = this.users[k];
		console.log("XMPP> "+stanza.toString());
		this.router.send(stanza);
	}
};

Channel.prototype.sendButFor = function sendButFor(stanza, user) {
	for (var k in this.users) {
		if (this.users[k].jid == user.jid) continue;
		stanza.attrs.to = this.users[k];
		console.log("XMPP> "+stanza.toString());
		this.router.send(stanza);
	}
};

var MUC = function(router) {
	var Channels = {};
	var muc = this;
	
	this.getChannel = function(jid) {
		if(!Channels[jid]) {
			Channels[jid] = new Channel(jid, router);
			muc.emit('channel', Channels[jid]);
		}
		return Channels[jid];
	};

	this.handler = function(stanza) {
		console.log("XMPP< "+stanza.toString());
		if (stanza.attrs.type !== 'error') {
			var to = new xmpp.JID(stanza.attrs.to);
			var channeljid = new xmpp.JID(to.user + '@' + to.domain);
			var channel = muc.getChannel(channeljid);
			var origUser = stanza.attrs.from;

			if(stanza.name == 'presence') {
				if(stanza.attrs.type !=='unavailable') {
					// Update or add presence
					if(channel.users[to.resource]) {
						if(channel.users[to.resource] !== stanza.attrs.from) { // Collide!
							var t = stanza.attrs.to;
							stanza.attrs.to = stanza.attrs.from;
							stanza.attrs.from = t;
							stanza.attrs.type = 'error';
							stanza.c('error', {code: '409', type: 'cancel'}).c('conflict').c('text').t('That nickname is already in use');
							router.send(stanza);
							return;
						} else { // Update presence.
							channel.users[to.resource] = stanza.attrs.from;
							channel.by_jid[stanza.attrs.from] = to.resource;
						}
					} else { // Add presence.
						channel.users[to.resource] = stanza.attrs.from;
						channel.by_jid[stanza.attrs.from] = to.resource;
						channel.emit('join', channel.users[to.resource], to.resource);
					}

					// FIXME: propagate all presences back to joiner
					stanza.attrs.from = to.user + '@' + to.domain +'/'+(channel.by_jid[stanza.attrs.from]);
					channel.sendButFor(stanza, stanza.from);

					stanza = (new xmpp.Element('presence', {xmlns: 'jabber:client', id: stanza.attrs.id, to: origUser, from: to.user + '@' + to.domain + '/' + (channel.by_jid[origUser])}))
						.c('x', {xmlns: 'http://jabber.org/protocol/muc#user'})
							.c('item', {affiliation: 'owner', role: 'moderator'}).up()
							.c('status', {code: 110}).up()
							.c('status', {code: 201}).up()
						.up();
					stanza.attrs.to = origUser;
					console.log("XMPP> "+stanza.toString());
					router.send(stanza);
				} else {
					// Clear presence
					channel.emit('part', channel.users[to.resource], stanza.attrs.from);

					stanza.attrs.from = to.user + '@' + to.domain +'/'+(channel.by_jid[stanza.attrs.from]);
					channel.send(stanza);

					// FIXME: can be spoofed:
					delete channel.users[to.resource];
					delete channel.by_jid[stanza.attrs.from];
				}
			} else {
				stanza.attrs.from = to.user + '@' + to.domain +'/'+(channel.by_jid[stanza.attrs.from]);
				channel.send(stanza);
			}
		 }
	};
};

util.inherits(MUC, events.EventEmitter);

function createMUCService(router) {
	var n = new MUC(router);
	router.on('stanza', function (stanza) {
		n.handler(stanza);
	});
	return n;
}

exports.createMUCService = createMUCService;
