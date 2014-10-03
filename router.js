define(function (require) {
    'use strict';

    var Backbone = require('Backbone');
    var _ = require('_');
    var eventBrokerMixin = require('core/event-broker');
    var listenerMixin = require('core/listener');


    var Router = Backbone.Router.extend({

        constructor: function () {
            Backbone.Router.apply(this, arguments);

            this.delegateListeners();
        }

    });

    _.extend(Router.prototype, eventBrokerMixin, listenerMixin);

    return Router;
});
