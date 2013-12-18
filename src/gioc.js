/*
 * gioc
 * https://github.com/goliatone/gioc
 *
 * TODO: Refactor processor related methods
 *     addSolver
 *     addPost
 *     addProvider
 *     Those should all use the same signature
 *     and work in the same way, then have one method
 *     that creates dynamically them.
 *
 * TODO: prepare and post could be one method, also 
 *       dynamically attached.
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

    var _isFactory = function(bean){
        if(this.factoryKey in bean.config) return bean.config[this.factoryKey];
        return typeof bean.load === 'function';      
    };

////////////////////////////////////////
/// CONSTRUCTOR
////////////////////////////////////////
    
    /**
     * Gioc constructor.
     * 
     * @param  {Object} config Optional config object.
     */
    var Gioc = function Gioc(config){
        //Store all bean info.
        this.beans = {};
        this.graph = {};

        this.solvers = {};
        this.editors = [];
        
        this.providers = [];

        this.configure(config);

        //Solvers methods should have a common signature:
        //id, target, options (which should be similar throught all methods)

        this.addSolver(this.propKey, this.extend);
        this.addSolver(this.depsKey, this.solveDependencies);
        
        //TODO: Should addPost and addProvider have the 
        //same signature as addSolver?
        this.addPost(this.resetGraph);

        this.addProvider(this.extend);
    };

////////////////////////////////////////
/// STATIC VARS
////////////////////////////////////////
    //TODO: Add support for chain props.
    //TODO: If we modify this, ie unit testing,
    //      then we cant reset. REMOVE STATIC or have
    //      a default src.
    Gioc.config = {
        attributes:['depsKey', 'propKey', 'postKey', 'postArgs', 'modKey', 'factoryKey'],
        defaults:{
            depsKey: 'deps',
            propKey: 'props',
            postKey: 'after',
            modKey: 'modifier',
            postArgs: 'pargs',
            factoryKey:'construct'
        }
    };
////////////////////////////////////////
/// PUBLIC METHODS
////////////////////////////////////////
    Gioc.prototype.configure = function(config){
        //TODO: This should be configurable.
        /* Default supported directives:
         * - deps: dependencies
         * - post: post wire execution
         * - props: add props to instantiated value.
         */
        config = this.extend({}, Gioc.config.defaults, config);
        Gioc.config.attributes.map(function(ckey){
            this[ckey] = config[ckey];
        }, this);
    };
    /**
     * Stores a definition, with configuration
     * options, to be *solved* later.
     * The payload can be either a literal value
     * or a factory method.
     *    
     * @param  {String} key      String ID.
     * @param  {Object|Function} payload Value to be map.
     * @param  {Object} config   Options for current mapping.
     * @return {Gioc}
     */ 
    Gioc.prototype.map = function(key, payload, config){
        //Store basic information of our payload.
        var bean = {key:key, load:payload, config:(config || {})};

        //Is this a factory or a literal value?
        bean.construct =
        bean.isFactory = _isFactory.call(this, bean);

        //TODO: How do we want to handle collision? We are overriding.
        if(this.mapped(key)) this.log(key, 'key is already mapped, overriding.');

        this.beans[key] = bean;

        return this;
    };

    /**
     * Solve for the provided *key*, it returns a value
     * and solves all dependencies, etc. 
     * The cycle to solve for a key is the
     * result of runing the methods in order
     * `prepare` as a pre process, `build` to
     * generate the payload, `wire` to solve
     * dependencies, and `post` as a post process.
     * 
     * @param  {String} key      String ID we are solving
     *                           for
     * @param  {Object} options   Options object.
     * @return {Object|undefined} Solved value 
     *                            for the given key.
     */
    Gioc.prototype.solve = function(key, options){
        //TODO: If we try to solve an unregistered key, what should
        //we do? Throw or return undefined?
        if (!this.mapped(key)) return undefined;

        var value  = null,
            bean   = this.beans[key],
            config = {};        
        //pre-process
        this.prepare(key, config, bean.config, options);

        this.log('==> solve, generated config ', config);
        //build our value.
        value = this.build(key, config);

        //configure our value
        value = this.wire(key, value, config);

        //do all post 'construct' operations.
        this.post(key, value, config);

        return value;
    };

    /**
     * Pre process to consolidate the configuration
     * object for a given key.
     * It will loop over all providers in order the order
     * they were added and call the provider with the 
     * Gioc instance as scope.
     * The default provider is the `extend` method.
     * 
     * @param  {String} key      String ID we are solving
     *                           for
     * @param  {Object} target   Resulting object.
     * @param  {Object} config   Conf object stored with the
     *                           key.
     * @param  {Object} options  Conf object passed in the
     *                           method call.
     * @return {Gioc}
     */
    Gioc.prototype.prepare = function(key, target, config, options){
        (this.providers).map(function(provider){
            provider.call(this, key, target, config, options);
        }, this);
        return this;
    };

    /**
     * Retrieve the payload value for the given *key*.
     * If the payload is a literal value, we just return 
     * it without any further steps. If the payload is a
     * function then we execute it with the **scope** and
     * **args** provided in the config object.
     * 
     * @param  {String} key      String ID we are solving
     *                           for
     * @param  {Object} options  Conf object passed in the
     *                           method call.
     * @return {Primitive|Object} Raw stored value for key.
     */
    Gioc.prototype.build = function(key, options){
        //TODO: If we try to solve an unregistered key, what should
        //we do? Throw or return undefined?
        if (!this.mapped(key)) return undefined;

        var bean   = this.beans[key],
            value  = bean.load;

        //TODO: REFACTOR, CLEAN UP!!
        if(options && this.factoryKey in options && !options[this.factoryKey]) return value;
        if(!bean.construct) return value;

        var config = this.extend(key, {scope:this}, bean.config, options),
            args   = config.args,
            scope  = config.scope;

        value = value.apply(scope, args);           

        return value;
    };

    /**
     * Goes over the `config` object's keys
     * and for any of its keys that has a related solver
     * it will apply the solver method to the
     * target.
     * Meant to be overriden with use.
     * Default solvers are the `extend` method
     * for the key `props` and `solveDependencies`
     * for the `deps` key.
     * 
     * @param  {String} key      String ID we are solving
     *                           for
     * @param  {Primitive|Object} target Solved value for the
     *                                   provided key.
     * @param  {Object} config  Configuration object.
     * @return {[type]}        [description]
     */
    Gioc.prototype.wire = function(key, target, config){
        config = config || {};
        
        //We have a literal value. We might want to modify it?
        if(typeof target !== 'object' && this.modKey in config)
            return config[this.modKey](target);

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
     * Injects a dependency into the provided `scope`
     *     
     * @param  {String} key      String ID we are solving
     *                           for
     * @param  {Object} scope   [description]
     * @param  {[type]} options [description]
     * @return {[type]}         [description]
     */
    Gioc.prototype.inject = function (key, scope, options) {
        //TODO: We should want to handle this differently
        if(! this.mapped(key)) return this;

        var setter = options.setter || key,
            value  = this.solve(key, options);

        //It could be that we were unable to solve for key, how do 
        //we handle it? Do we break the whole chain?
        if(value === undefined) return this;

        if(typeof setter === 'function') setter.call(scope, value, key);
        else if( typeof setter === 'string') scope[setter] = value;

        //TODO: We should treat this as an array
        //TODO: This should be the 'initialize' phase!
        if(this.postKey in options) options[this.postKey].apply(scope, options[this.postArgs]);

        return this;
    };

    /**
     * During the solve cycle, the post process applied
     * after the payload has been configured, built, and
     * wired.
     * @param  {String} key     [description]
     * @param  {Primitive|Object} target  Result from solving key.
     * @param  {Object} options Options object.
     * @return {Gioc}
     */
    Gioc.prototype.post = function(key, target, options){
        this.log('post ', this.editors);
        (this.editors).map(function(editor){
            this.log('editor ', editor, ' key ', key, ' target ', target, ' options ', options);
            editor.call(this, key, target, options);
        }, this);
        return this;
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
        /*
         * Try to add a dependency solver based on requirejs
         * We might have to keep track of dependencies, and only
         * execute next solver if the previous one failed, so we
         * might want to modify the array as we go, to remove the 
         * key from the next loop.
         * We should use `every` or `some` instead of map.
         */
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
        return this;
    };

    Gioc.prototype.addSolver = function(key, solver){
        (this.solvers[key] || (this.solvers[key] = [])).push(solver);
    };

    Gioc.prototype.addPost = function(editor){
        if(this.editors.indexOf(editor) === -1)
            this.editors.push(editor);
        return this;
    };

    Gioc.prototype.addProvider = function(provider){
        if(this.providers.indexOf(provider) === -1)
            this.providers.push(provider);
        return this;
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