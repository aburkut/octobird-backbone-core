define(function (require) {
    'use strict';

    var Validation = require('validation');
    var Backbone = require('Backbone');
    var _ = require('_');
    var eventBrokerMixin = require('core/event-broker');
    var listenerMixin = require('core/listener');

    var Model = Backbone.Model.extend({

        validationErrorHttpStatus: 422,

        constructor: function (attributes, options) {
            if(this.cache) {
                var id = (attributes && attributes.id) || this.id || _.result(this, 'cacheId');
                if(id) {
                  if(this.cache[id]) {
                      return this.cache[id];
                  } else {
                      this.cache[id] = this;
                  }
                }
            }

            Backbone.Model.apply(this, arguments);

            // Декларативные слушатели
            this.delegateListeners();
        },


        save: function(attributes, options) {
            this.trigger('before:save', this);
            return Backbone.Model.prototype.save.call(this, attributes, options);
        },

        sync:  function(attr, value, options) {
            var self = this;

            var errorCallback = false;

            if(options.error) {
                errorCallback = options.error;
            }

            options.error = function(xhr) {
                if(xhr.status === self.validationErrorHttpStatus) {
                    var message = xhr.responseJSON.message[0];

                    if(message) {
                        self.trigger('validated:message', self, message);
                    }

                    var errors = xhr.responseJSON.fields;

                    if(errors) {
                        self.trigger('validated:invalid', self, errors);
                    }
                }

                if(errorCallback) {
                    errorCallback(xhr);
                }
            };

            return Backbone.Model.prototype.sync.call(this, attr, value, options);
        },

        unary: function (name, operation) {
            var value = this.get(name);
            this.set(name, operation(value));
        },

        toggleAttr: function (name) {
            this.unary(name, function (value) {
                return !value;
            });
        },

        inc: function (name, val) {
            if (!val) {
                val = 1;
            }

            this.unary(name, function (value) {
                return value + val;
            });
        },

        dec: function (name, val) {
            if (!val) {
                val = 1;
            }

            this.unary(name, function (value) {
                return value - val;
            });
        },

        dispose: function () {
            // todo: Закончить
            return;

            if(this.disposed) {
                return;
            }

            // Finished.
            this.disposed = true;

            // Unbind all global event handlers.
            this.unsubscribeAllEvents();

            // Unbind all referenced handlers.
            this.stopListening();

            // Remove all event handlers on this module.
            this.off();


            // Remove the collection reference, internal attribute hashes
            // and event handlers.
            var properties = [
                'collection',
                'attributes', 'changed',
                '_escapedAttributes', '_previousAttributes',
                '_silent', '_pending',
                '_callbacks'
            ];

        }

    });

    _.extend(Model.prototype, eventBrokerMixin, listenerMixin, Validation.mixin);

    return Model;
});
