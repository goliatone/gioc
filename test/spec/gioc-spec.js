/*global define:true*/
/*global describe:true */
/*global it:true */
/*global expect:true */
/*global beforeEach:true */
/* jshint strict: false */
define(['gioc', 'jquery'], function(Gioc, $) {

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

        it('should change static default values',function(){
            var attrs    = Gioc.config.attributes,
                defaults = Gioc.config.defaults,
                value    = null;

            attrs.map(function(attr){
                value = defaults[attr];
                defaults[attr] = value + 'MOD';
            });

            gioc = new Gioc();
            // gioc.configure();

            attrs.map(function(key){
                expect(gioc[key]).toBe(defaults[key]);
            });
        });

    });
});