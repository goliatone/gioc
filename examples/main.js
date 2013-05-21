/*global define:true requirejs:true*/
/* jshint strict: false */
requirejs.config({
    paths: {
        'jquery': '../lib/jquery/jquery',
        'gioc': '../src/gioc'
    }
});

define(['gioc', 'jquery'], function (Gioc, $) {
    console.log('Loading');
	var gioc = new Gioc();
	gioc.init();
});