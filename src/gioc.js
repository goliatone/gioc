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

////////////////////////////////////////
/// CONSTRUCTOR
////////////////////////////////////////

    /**
     * Gioc constructor.
     * 
     * @param  {Object} config Optional config object.
     */
    var Gioc = function(config){
        //Store all bean info.
        this.beans = {};
        this.graph = {};

        //TODO: This should be configurable.
        this.depsKey = 'deps';
        this.postKey = 'post';
        this.propKey = 'props';

        //Solvers methods should have a common signature:
        //id, target, options (which should be similar throught all methods)
        this.solvers = {};

        this.addSolver(this.propKey, this.extend);
        this.addSolver(this.depsKey, this.solveDependencies);
        
        //This should prob have a different signature, addPost?
        this.editors = [];
        this.addPost(this.resetGraph);

        this.providers = [];
        this.addProvider(this.extend);
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
            config = {};
        this.log('==> solve, generated config ', config);

        this.configure(key, config, bean.config, options);

        //build our value.
        value = this.build(key, config);

        //configure our value
        value = this.wire(key, value, config);

        //do all post 'construct' operations.
        this.post(key, value, config);

        return value;
    };

    Gioc.prototype.configure = function(key, target, config, options){
        (this.providers).map(function(provider){
            provider.call(this, key, target, config, options);
        }, this);
    };

    Gioc.prototype.build = function(key, options){
        var bean   = this.beans[key],
            value  = bean.load;
       
        if(! bean.construct) return value;
    
        var config = this.extend(key, {}, bean.config, options),
            args   = config.args,
            scope  = config.scope;

        value = value.apply(scope, args);           

        return value;
    };

    //Meant to be overriden with use.
    Gioc.prototype.wire = function(key, target, config){
        config = config || {};
        
        //We have a literal value. We might want to modify it?
        if(typeof target !== 'object' && 'modifier' in config)
            return config.modifier(target);

        //solve is the intersection between all keys in the 
        //config object and the solvers.
        var keys  = Object.keys(this.solvers);
        var solve = Object.keys(config).filter(function(k){ return keys.indexOf(k) !== -1;});
        solve.map(function(ckey){
            (this.solvers[ckey]).map(function(solver){
                solver.call(this, key, target, config[ckey]);
            }, this);
        }, this);
       
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
    Gioc.prototype.inject = function (key, scope, options) {
        //TODO: We should want to handle this differently
        if(! this.mapped(key)) return this;

        var setter = options.setter || key,
            value  = this.solve(key, options);

        //It could be that we were unable to solve for key, how do 
        //we handle it? Do we break the whole chain?
        if(value === undefined) return this;

        if(typeof setter === 'function') scope.call(scope, value, key);
        else if( typeof setter === 'string') scope[setter] = value;

        //TODO: We should treat this as an array
        if('post' in options) options.post.apply(scope, options.postArgs);

        return this;
    };

    Gioc.prototype.post = function(key, target, options){
        this.log('post ', this.editors);
        (this.editors).map(function(editor){
            console.log('editor ', editor, ' key ', key, ' target ', target, ' options ', options);
            editor.call(this, key, target, options);
        }, this);
        
    };

    /**
     * Checks to see if *key* is currently
     * mapped.
     * 
     * @param  {String} key Definition id.
     * @return {Boolean}    Does a definition
     *                      with this key exist?
     */
    Gioc.prototype.mapped = function(key){
        return (key in this.beans);
    };

    /**
     * Solve an array of dependencies.
     * 
     * @param  {Object} scope    Scope to which dependencies
     *                           will be applied to.
     * @param  {[type]} mappings Array contained deps. 
     *                           definitions
     * @return {Gioc}
     */
    Gioc.prototype.solveDependencies = function(key, scope, mappings){
        (this.graph = this.graph || {}) && (this.graph[key]=key);

        mappings.map(function(bean){
            //Normalize bean def, if string, we ride on defaults.                
            if(typeof bean === 'string') 
                bean = {id:bean, options:{setter:bean}};

            //Catch circular dependency
            if(bean.id in this.graph) 
                return this.error(key, 'ERROR');
            
            //store current bean id for CD.
            this.graph[bean.id] = key;
            //We should try catch this.
            this.inject(bean.id, scope, bean.options);
            //Bean resolved, move on.
            delete this.graph[bean.id];

        }, this);
        this.log(key, this.graph)
        return this;
    };

    Gioc.prototype.error = function(key, message){
        throw new Error(key, message);
    };

    Gioc.prototype.log = function(key, message){
        console.log.apply(console, arguments);
    };

    Gioc.prototype.addSolver = function(key, solver){
        (this.solvers[key] || (this.solvers[key] = [])).push(solver);
    };

    Gioc.prototype.addPost = function(editor){
        this.editors.push(editor);
    };

    Gioc.prototype.addProvider = function(provider){
        this.providers.push(provider);
    };

    Gioc.prototype.resetGraph = function(key, target, options){
        this.log('=== DELETE GRAPH')
        if(key in this.graph) delete this.graph[key];
    };

    /**
     * Extend method.
     * @param  {Object} target Source object
     * @return {Object}        Resulting object from
     *                         meging target to params.
     */
    Gioc.prototype.extend = function(key, target, options, config){
        var i = 2, length = arguments.length, source;
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

    return Gioc;
});