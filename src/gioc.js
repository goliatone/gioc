/*
 * gioc
 * https://github.com/goliatone/gioc
 *
 * Copyright (c) 2013 goliatone
 * Licensed under the MIT license.
 */
/*global define:true*/
/* jshint strict: false */
define('gioc', function() {

////////////////////////////////////////
/// PRIVATE METHODS
////////////////////////////////////////

    var _slice = slice = Array.prototype.slice;

    /**
     * Extend method.
     * @param  {Object} target Source object
     * @return {Object}        Resulting object from
     *                         meging target to params.
     */
    var _extend = function(target) {
        var i = 1, length = arguments.length, source;
        for ( ; i < length; i++ ) {
            // Only deal with defined values
            if ((source = arguments[i]) != undefined ){
                Object.getOwnPropertyNames(source).forEach(function(k){
                    var d = Object.getOwnPropertyDescriptor(source, k) || {value:source[k]};
                    if (d.get) {
                        target.__defineGetter__(k, d.get);
                        if (d.set) target.__defineSetter__(k, d.set);
                    } else if (target !== d.value) target[k] = d.value;                
                });
            }
        }
        return target;
    };

////////////////////////////////////////
/// CONSTRUCTOR
////////////////////////////////////////

    /**
     * [ description]
     * @param  {[type]} config [description]
     * @return {[type]}        [description]
     */
    var Gioc = function(config){
        //Store all bean info.
        this.beans = {};
        
        //TODO: This should be configurable.
        this.depsKey = 'deps';
        this.propKey = 'props';

        this.instances = {};
        this.factories = {};
    };


////////////////////////////////////////
/// PUBLIC METHODS
////////////////////////////////////////
    Gioc.prototype.map = function(key, payload, config){
        //Store basic information of our payload.
        var bean = {key:key, load:payload, config:(config || {})};
        //Is this a factory or a literal value?
        bean.construct =
        bean.isFactory = typeof payload === 'function';
        //TODO: How do we want to handle collision? We are overriding.
        this.beans[key] = bean;

        return this;
    };

    Gioc.prototype.solve = function(key, options){
        if (!this.mapped(key)) return undefined;

        var value  = null,
            bean   = this.beans[key],
            config = _extend({}, bean.config, options);
        console.log('==> solve, generated config ', config);
        //build our value.
        value = this.build(key, config);

        //configure our value
        value = this.wire(value, config);

        return value;
    };

    Gioc.prototype.build = function(key, options){
        var bean   = this.beans[key],
            value  = bean.load,
            config = _extend({}, bean.config, options);
            console.log('build, generated config ', config);
        //TODO: Do we want to cache? Or we handle that 
        //on the factory?
        if(bean.construct){
            var args   = config.args,
                scope  = config.scope;

            //TODO: Make sure that undefined scope and args
            //does not break anything
            value = value.apply(scope, args);           
        }

        return value;
    };

    //Meant to be overriden with use.
    Gioc.prototype.wire = function(target, config){
        config = config || {};
        console.log('Wiring: ', target, config, typeof target === 'object', 'modifier' in config);
        
        //We have a literal value. We might want to modify it?
        if(typeof target !== 'object' && 'modifier' in config)
            return config.modifier(target);

        //We need a collection of key to handler, and iterate over
        if(this.propKey in config) _extend(target, config[this.propKey]);

        //Solve dependencies: each individual dependency can be:
        // a)id => bean id 
        // b)object {id:id, options:options}
        if(this.depsKey in config){
            config[this.depsKey].forEach((function(bean){
                //Normalize bean def, if string, we ride on defaults.                
                if(typeof bean === 'string') bean = {id:bean, options:{setter:bean}};
                //We should try catch this.
                this.inject(target, bean.id, bean.options);
            }).bind(this));
            console.log(this.solve(config.deps[0]));
        }

        return target;
    };

    /**
     * [inject description]
     * @param  {[type]} scope  [description]
     * @param  {[type]} key    [description]
     * @param  {[type]} setter [description]
     * @param  {[type]} post   [description]
     * @return {[type]}        [description]
     */
    Gioc.prototype.inject = function (scope, key, options) {
        var setter = options.setter || key,
            value  = this.solve(key, options);

        if(typeof setter === 'function') scope.call(scope, value, key);
        else if( typeof setter === 'string') scope[setter] = value;

        if('post' in options) options.post.apply(scope, options.postArgs);

        return this;
    };

    /**
     * [ description]
     * @param  {[type]} key [description]
     * @return {[type]}     [description]
     */
    Gioc.prototype.mapped = function(key){
        return (key in this.beans);
    };


    /**
     * Returns an instance by ID
     * @param  {[type]} key [description]
     * @return {[type]}     [description]
     */
    Gioc.prototype.solveKey = function (key) {
        var instance = this.instances[key];

        if (!instance) {
            var _Factory = this.factories[key];
            instance = _Factory();
            this.addInstance(key, instance);
        }

        return instance;
    };


    /**
     * [solveMappings description]
     * @param  {[type]} scope    [description]
     * @param  {[type]} mappings [description]
     * @param  {[type]} post     [description]
     * @return {[type]}          [description]
     */
    Gioc.prototype.solveMappings = function(scope, mappings, post){
        var mapping, args= Array.prototype.splice.call(arguments,3);
        for( var i = 0, t = mappings.length; i<t; i++){
            mapping = mappings[i];
            this.inject(scope, mapping.key, mapping.setter, mapping.post, mapping.postArgs);
        }
        post.apply(scope, args);

        return this;
    };

    return Gioc;
});