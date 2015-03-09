define(function (require) {
    'use strict';

    var Backbone = require('Backbone');
    var _ = require('_');
    var Model = require('Model');
    var eventBrokerMixin = require('core/event-broker');
    var listenerMixin = require('core/listener');


    var Collection = Backbone.Collection.extend({

        model: Model,

        constructor: function (data) {
            if(this.cache) {
                var id = (data && data.id) || this.id || 'cache_id';

                if(this.cache[id]){
                    return this.cache[id];
                } else {
                    this.cache[id] = this;
                }
            }

            Backbone.Collection.apply(this, arguments);

            this.delegateListeners();
        }

    });

    _.extend(Collection.prototype, eventBrokerMixin, listenerMixin);

    return Collection;
});
