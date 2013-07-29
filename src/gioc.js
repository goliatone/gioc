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

    /**
     * [ description]
     * @param  {[type]} config [description]
     * @return {[type]}        [description]
     */
    var Gioc = function(config){
        // this.services = {};
		this.instances = {};
		this.factories = {};
    };

    /**
     * [addFactory description]
     * @param {[type]} key     [description]
     * @param {[type]} factory [description]
     */
    Gioc.prototype.addFactory = function(key, factory){
        this.factories[key] = factory;
        return this;
    };

    /**
     * [ description]
     * @param  {[type]} key [description]
     * @return {[type]}     [description]
     */
    Gioc.prototype.hasInjector = function(key){
        return (key in this.instances || key in this.factories);
    };


    /**
     * Add instance to Gioc.
     * @param String key      Id of the instance.
     * @param Object instance Object instance.
     */
    Gioc.prototype.addInstance = function (key, instance) {
        this.instances[key] = instance;
        return this;
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
     * [inject description]
     * @param  {[type]} scope  [description]
     * @param  {[type]} key    [description]
     * @param  {[type]} setter [description]
     * @param  {[type]} post   [description]
     * @return {[type]}        [description]
     */
    Gioc.prototype.inject = function (scope, key, setter, post, postArgs) {
        var value = this.solveKey(key);
        if(!value) return;

        if(typeof setter === 'function') setter.call(scope, value, key);
        else if( typeof setter === 'string') scope[setter] = value;

        if(post && typeof post === 'function')
            post.call(scope, postArgs);

        return this;
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