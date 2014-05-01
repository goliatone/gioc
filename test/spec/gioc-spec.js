/*global define:true*/
/*global describe:true */
/*global it:true */
/*global expect:true */
/*global beforeEach:true */
/* jshint strict: false */
define(['gioc', 'jquery'], function(Gioc, $) {
console.log('-------------');
    describe('Gioc...', function() {

        it('should be loaded', function() {
            expect(Gioc).toBeTruthy();
            var gioc = new Gioc();
            expect(gioc).toBeTruthy();
        });

        it('should contain known methods.', function() {
            var gioc = new Gioc();
            var methods = ['map', 'solve', 'prepare', 'configure', 'build',
                           'wire', 'inject', 'post', 'mapped',
                           'solveDependencies', 'error', 'log',
                           'addSolver', 'addPost', 'addProvider',
                           'resetGraph', 'extend'
                           ];
            methods.map(function(method){
                expect((typeof gioc[method] === 'function')).toBeTruthy();
            });
        });

        it('should add factories',function(){
            var factory = function(){return 'im a factory';};
            var gioc  = new Gioc();
            gioc.map('f', factory);
            expect(gioc.mapped('f')).toBeTruthy();
        });

        it('should store literal values',function(){
            var gioc = new Gioc();
            gioc.map('literal', 23);
            expect(gioc.solve('literal')).toBe(23);
        });

        it('should build from a given key', function(){
            var gioc = new Gioc();
            gioc.map('literal', 23);
            expect(gioc.build('literal')).toBe(23);
        });

        it('should handle factory methods', function(){
            var gioc = new Gioc();
            gioc.map('factory', function(){
                return 23;
            });
            expect(gioc.solve('factory')).toBe(23);
        });

        it('extend should respect default values', function(){
            var gioc = new Gioc();
            var options = {age:23};
            var defaults = {age:0, name:'goliat'};
            var output = gioc.extend('key', {}, defaults, options);
            var expected = {age:23, name:'goliat'};
            expect(output).toMatchObject(expected);
        });

        it('factories should have gioc instance scope', function(){
            var gioc = new Gioc();
            gioc.map('factory', function(){
                return this;
            });
            expect(gioc.solve('factory')).toMatchObject(gioc);
        });

        it('we can force a key to solve as a literal value',function(){
            var factory = function(){return 23;};
            var gioc = new Gioc();
            gioc.map('factory', factory);
            expect(gioc.solve('factory')).toBe(23);

            var config = {};
            config[gioc.factoryKey] = false;
            expect(gioc.solve('factory', config)).toMatchObject(factory);
        });
    });

    describe('Gioc configuration', function(){
        var gioc;

        beforeEach(function(){

            gioc = new Gioc();
        });

        it('should have a *static* config object', function(){

            expect(Gioc.config).toBeTruthy();
        });

        it('config object should have an defaults prop', function(){

            expect(Gioc.config.defaults).toBeTruthy();
        });

        it('config object should have an attributes prop', function(){

            expect(Gioc.config.attributes).toBeTruthy();
        });

        it('defaults and attributes should be equal length', function(){

            expect(Gioc.config.attributes).toMatchLengthOf(Gioc.config.defaults);
        });

        it('should create properties in config.attributes',function(){
            Gioc.config.attributes.map(function(key){
                expect(gioc[key]).toBeTruthy();
            });
        });

        it('should set default values for properties in config.attributes',function(){
            Gioc.config.attributes.map(function(key){
                expect(gioc[key]).toBe(Gioc.config.defaults[key]);
            });
        });

        it('should change static default values 1',function(){
            var attrs    = Gioc.config.attributes,
                defaults = Gioc.config.defaults,
                oldvals  = gioc.extend('key', {}, defaults),
                value    = null;

            attrs.map(function(attr){
                value = oldvals[attr];
                defaults[attr] = value + 'MOD';
            });

            gioc = new Gioc();

            attrs.map(function(key){
                expect(gioc[key]).toBe(defaults[key]);
            });

            //We need to reset the attributes to its old value
            //that is one issue of using "static" variables.
            Gioc.config.defaults = oldvals;
        });

        it('should change static default values 2',function(){
            gioc = new Gioc();

            var attrs    = Gioc.config.attributes,
                defaults = Gioc.config.defaults,
                oldvals  = gioc.extend('key', {}, defaults),
                value    = null;

            attrs.map(function(attr){
                value = defaults[attr];
                defaults[attr] = value + 'MOD';
            });

            gioc.configure();

            attrs.map(function(key){
                expect(gioc[key]).toBe(defaults[key]);
            });

            //We need to reset the attributes to its old value
            //that is one issue of using "static" variables.
            Gioc.config.defaults = oldvals;
        });
    });

    describe('Gioc', function(){
        var gioc;
        beforeEach(function(){
            gioc = new Gioc();
        });
        it('should have a default editors, resetGraph',function(){
            expect(gioc.solvers).toHaveLength(2);
            expect(gioc.solvers[gioc.propKey]).toEqual([gioc.extend]);
            expect(gioc.solvers[gioc.depsKey]).toEqual([gioc.solveDependencies]);
        });

        it('addSolver', function(){
            var solver = function(){};
            var expected = {};
            expected[gioc.propKey] = [gioc.extend];
            expected[gioc.depsKey] = [gioc.solveDependencies];
            expected['key'] = [solver];

            gioc.addSolver('key', solver);
            expect(gioc.solvers).toHaveLength(3);
            expect(gioc.solvers).toMatchObject(expected);
        });

        it('should have a default provider, extend',function(){
            expect(gioc.providers).toHaveLength(1);
            expect(gioc.providers[0]).toEqual(gioc.extend);
        });

        it('addProvider', function(){
            var provider = function(){};
            gioc.addProvider(provider);
            expect(gioc.providers).toHaveLength(2);
            expect(gioc.providers).toMatchObject([gioc.extend, provider]);
        });

        it('should have a default editors, resetGraph',function(){
            expect(gioc.editors).toHaveLength(1);
            expect(gioc.editors[0]).toEqual(gioc.resetGraph);
        });

        it('addPost', function(){
            var editor = function(){};
            gioc.addPost(editor);
            expect(gioc.editors).toHaveLength(2);
            expect(gioc.editors).toMatchObject([gioc.resetGraph, editor]);
        });
    });

    describe(' Gioc injection', function(){
        var Ajax = function(){};

        var Sync = function(){
            this.url = 'empty';
        };

        var User = function(first, last, age){
            this.first = first;
            this.last = last;
            this.age = age;
        };

        User.prototype.fullName = function(){
            return this.first + ' ' + this.last;
        };

        var gioc;

        beforeEach(function(){
            gioc = new Gioc();
            gioc.configure();
            var litconf = {};
            litconf[gioc.factoryKey] = false;

            gioc.map('User', User, litconf);

            gioc.map('Ajax', Ajax, litconf);

            gioc.map('Sync', Sync, litconf);

            gioc.map('ajax', function(){
                var Ajax = this.solve('Ajax');
                return new Ajax();
            }, {deps:['Ajax']});

            gioc.map('sync', function(){
                var Sync = gioc.solve('Sync');
                return new Sync();
            });

            gioc.map('userid', 12345);
            gioc.map('created', 1386667593, { modifier:function(unix){
                return new Date(unix * 1000);
            }});

            gioc.map('user', function(first, last, age){
                var User = this.solve('User');
                return new User(first, last, age);
            });
        });

        it('should apply modifiers', function(){
            var expected = new Date('2013-12-10T09:26:33');
            expect(gioc.solve('created')).toMatchObject(expected);
        });

        it('should solve dependencies',function(){
            var afterSpy = sinon.spy();

            var user = gioc.solve('user', { args:['goliat', 'one', 32],
                                            deps:['userid','jquery', 'created',{
                                                id:'sync',
                                                options:{
                                                    props:{url:'goliatone.com'},
                                                    after:afterSpy,
                                                    pargs:['23', 'argument']
                                                }
                                            }]
            });
            expect(user).toHaveProperties('first', 'last', 'age', 'userid', 'sync', 'created');
            expect(user.last).toBe('one');
            expect(user.first).toBe('goliat');
            expect(user.age).toBe(32);
            expect(user.fullName()).toBe('goliat one');

            expect(user.sync).toHaveProperties('url');
            expect(user.sync.url).toBe('goliatone.com');

            expect(afterSpy).toHaveBeenCalled();
            expect(afterSpy).toHaveBeenCalledWith('23', 'argument');
        });
    });
});