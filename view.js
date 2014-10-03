define(function (require) {
    'use strict';

    var Backbone = require('Backbone');
    var _ = require('_');
    var eventBrokerMixin = require('core/event-broker');
    var listenerMixin = require('core/listener');
    var $ = require('$');

    var helpers = require('core/view-helpers');


    var View = Backbone.View.extend({

        constructor: function (options) {

            // Приватный массив сабвью
            this._subviews = [];

            Backbone.View.apply(this, arguments);

            // Декларативные слушатели
            this.delegateListeners();

            // Рендер после инитиализации
            this.autoRender = (options && 'autoRender' in options)
                ? options.autoRender
                : true;

            if (this.autoRender) {
                this.render();
            }
        },


        delegateEvents: function(events) {
            if ( ! (events || (events = _.result(this, 'events')))) {
                return this;
            }

            var newEvents = {};
            var eventsLength = events.length;


            for(var key in events) {

                var methodName = events[key];

                if(!_.isString(methodName) || !(/\s/).test(methodName)) {
                    continue;
                }

                var match = key.match(/^(\S+)\s*(.*)$/);
                var eventName = match[1], selector = match[2];
                var methods = events[key].split(/\s/);

                methodName = methods.pop();
                var method = this[methodName];

                if(!method) {
                    continue;
                }

                if(0 < methods.length) {
                    methods.reverse();
                    for(var wrapperIndex in methods) {
                        if(methods.hasOwnProperty(wrapperIndex)) {
                            var wrapperSelector = methods[wrapperIndex].split(':');
                            var wrapperName = wrapperSelector[0];
                            var wrapperExpression = wrapperSelector[1];
                            method = this._wrappers[wrapperName](method, wrapperExpression, eventName, selector) || method;
                        }
                    }
                }

                newEvents[key] = method;
            }
            return Backbone.View.prototype.delegateEvents.call(this, _.extend({}, events, newEvents));
        },

        addWrapper: function(name, wrapper) {
            if(this._wrappers[name]) {
                return false;
            }
            this._wrappers[name] = wrapper;
        },

        _wrappers: {
            debounce: function(handler) {
                return _.debounce(handler, 100);
            },

            getAttribute: function(handler, attrName) {
                return function (e) {
                    var attribute = $(e.currentTarget).attr(attrName);
                    var handlerArguments = Array.prototype.slice.call(arguments);
                    handlerArguments.unshift(attribute);
                    return handler.apply(this, handlerArguments);
                };
            },

            getCurrentTarget: function(handler) {
                return function(e) {
                    var targetElement = $(e.currentTarget);

                    var handlerArguments = Array.prototype.slice.call(arguments);
                    handlerArguments.unshift(targetElement);
                    return handler.apply(this, handlerArguments);
                };
            },

            holdEvent: function(handler) {
              return function(e) {
                if(e && e.preventDefault) {
                    e.preventDefault();
                }
                if(e && e.stopPropagation) {
                    e.stopPropagation();
                }
                if($(e.currentTarget).hasClass('disabled')) {
                  return;
                }
                return handler.apply(this, arguments);
              };
            },

            preventDefault: function(handler) {
                return function(e) {
                    if(e && e.preventDefault){
                        e.preventDefault();
                    }
                    return handler.apply(this, arguments);
                };
            },

            stopPropagation: function(handler) {
                return function(e) {
                    if(e && e.stopPropagation) {
                        e.stopPropagation();
                    }
                    return handler.apply(this, arguments);
                };
            },

            holdInput: function(handler, expression, eventName, selector) {
                return function() {
                    var input = selector ? this.$el.find(selector) : this.$el;

                    if(!!input.attr('disabled')) {
                        return;
                    }

                    helpers.disableInput(input);
                    var promise = handler.apply(this, arguments);

                    var enableInput = function(){
                        helpers.enableInput(input);
                    };

                    if(promise && (promise.success || promise.error)) {
                        if(promise.success){
                            promise.success(enableInput);
                        }
                        if(promise.error){
                            promise.error(enableInput);
                        }
                    } else {
                        enableInput();
                    }
                    return promise;
                };
            }
        },


        /**
         * Возвращает данные, необходимые для рендера
         *
         * @returns Object
         */
        serialize: function () {
            if (this.model) {
                return this.model.toJSON();
            }

            if (this.collection) {
                return {collection: this.collection.toJSON()};
            }

            return {};
        },

        /**
         * Возвращает отрендереный шаблон
         */
        renderTemplate: function () {
            if (this.template) {
                var data = this.serialize();
                return this.template(data);
            } else {
                return undefined;
            }
        },

        /**
         * Выполняет наиболее общий случай рендера
         */
        render: function () {
            this.clear();

            if (_.isFunction(this.beforeRender())) {
                this.beforeRender.apply(this, arguments);
            }

            // Рендерим шаблон в HTML
            var tplHtml = this.renderTemplate();
            this.$el.html(tplHtml);


            // Запускаем _render,
            // который может быть определен в потомках
            // и несет особую логику рендера
            if (_.isFunction(this._render)) {
                this._render.apply(this, arguments);
            }

            // Перепривязываем события DOM, которые определены декларативно
            this.undelegateEvents();
            this.delegateEvents();

            // Так принято в Backbone
            return this;
        },

        beforeRender: function () {

        },

        /**
         * Перегрузить!!!
         * Особая логика для рендера
         *
         * @private
         */
        _render: function () {

        },

        /**
         * Очищает DOM элемент
         */
        clear: function () {
            this.flushSubviews();
            this.$el.children().remove();
            this.$el.empty();
        },

        /**
         * Shortcut для добавления подвью в конец
         * view OR selector, view
         */
        append: function (selector, view) {
            if (!(selector && view)) {
                view = selector;
                selector = this.$el;
            }

            this.mixinView(selector, view, 'append');
        },

        replace: function (selector, view) {
            this.mixinView(selector, view, 'replaceWith');
        },

        mixinView: function (selector, view, action) {
            var $el = this._getSelector(selector);
            this.addSubview(view);
            $el[action](view.el);
        },

        _getSelector: function (selector) {
            if (_.isString(selector)) {
                selector = this.$(selector);
            }

            return selector;
        },

        add: function (selector, ViewClass, options) {
            options = options || {};
            options.el = this._getSelector(selector);
            var view = new ViewClass(options);
            this.addSubview(view);
            return view;
        },

        addSubview: function (view) {
            this._subviews.push(view);
        },

        removeSubview: function (view) {
            var pos;
            while ((pos = this._subviews.indexOf(view)) !== -1) {
                this._subviews.splice(pos, 1).dispose();
            }
        },

        flushSubviews: function () {
            var i;
            for (i = 0; i < this._subviews.length; i++) {
                this._subviews[i].dispose();
            }
            this._subviews = [];
        },

        dispose: function (isKeepDomElement) {
            if (this.disposed) {
                return;
            }

            // Flag.
            this.disposed = true;

            // Dispose subviews
            this.flushSubviews();

            // Unbind handlers of global events.
            this.unsubscribeAllEvents();

            // Unbind all referenced handlers.
            this.stopListening();

            // Remove all event handlers on this module.
            this.off();

            if(isKeepDomElement) {
              var elClone = this.$el.clone();
              elClone.html('');
              this.$el.replaceWith(elClone);
            } else {
              this.$el.remove();
            }


            // Remove element references, options,
            // model/collection references and subview lists.
            var properties = [
                'el',
                '$el',
                'options',
                'model',
                'collection',
                '_subviews',
                '_callbacks'
            ];

            var prop;
            var i;
            for (i = 0; i < properties.length; i++) {
                prop = properties[i];
                delete this[prop];
            }

            // You’re frozen when your heart’s not open.
            if (Object.freeze) {
                Object.freeze(this);
            }
        }

    });

    _.extend(View.prototype, eventBrokerMixin, listenerMixin);

    return View;
});
