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

        it('Gioc shold initialize', function() {
            var gioc = new Gioc();
            var output   = gioc.init();
            var expected = 'This is just a stub!';
            expect(output).toEqual(expected);
        });
        
    });

});