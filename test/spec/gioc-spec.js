/*global define:true*/
/*global describe:true */
/*global it:true */
/*global expect:true */
/*global beforeEach:true */
/* jshint strict: false */
define(['gioc', 'jquery'], function(Gioc, $) {

    describe('just checking', function() {

        it('Gioc shold be loaded', function() {
            expect(Gioc).toBeTruthy();
            var gioc = new Gioc();
            expect(gioc).toBeTruthy();
        });

        it('Gioc shold contain known methods.', function() {
            var gioc = new Gioc();
            var methods = ['map', 'solve', 'build', 'wire', 'inject', 'mapped', 'solveDependencies'];
            var method;
            for(var m in methods){
                method = methods[m];
                expect((method in gioc)).toBeTruthy();
                expect((typeof gioc[method] === 'function')).toBeTruthy();
            }
        });

        it('Gioc should add factories',function(){
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
});