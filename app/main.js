/*global define:true requirejs:true*/
/* jshint strict: false */
requirejs.config({
    paths: {
        'jquery': '../jquery/jquery',
        'gioc': '../gioc'
    }
});

define(['gioc', 'jquery'], function (Gioc, $) {
    console.log('Loading');

    var Ajax = function(){};

    var Sync = function(){};
    Sync.prototype.pull = function(){
    	console.log('Sync: ', this.url);
    	return this;
    };

    var User = function(){};
    User.prototype.fullName = function(){
    	return this.first + ' ' + this.last;
    };

	var gioc = new Gioc();
	gioc.map('User', User,{});

	/*
	 * Try to add a dependency solver based on requirejs
	 * We might have to keep track of dependencies, and only
	 * execute next solver if the previous one failed, so we
	 * might want to modify the array as we go, to remove the 
	 * key from the next loop.
	 */
	gioc.addSolver('deps', function(key, target, deps){
		console.log('========>> ', target)
		try{
			deps.map(function(bean){
				console.log('desp for ', bean)
				if(!target[bean]){
					if(typeof bean === 'string') 
                		bean = {id:bean, options:{setter:bean}};
					console.log('try to solve ', bean.id, bean.options.setter)
					var key = bean.id,
            			setter = bean.options.setter,
						value = require(key);
					if(typeof setter === 'function') setter.call(target, value, key);
			        else if( typeof setter === 'string') target[setter] = value;

			        //TODO: We should treat this as an array
			        //TODO: This should be the 'initialize' phase!
			        // if(this.postKey in options) options[this.postKey].apply(scope, options[this.postArgs]);
				} else console.log("**********---------************ ", bean, target[bean])
			}, this);			
		}catch(e){}
	});

	gioc.map('ajax', function(){return new Ajax;},{
		// deps:['user']
	});
	gioc.map('sync', function(options){
		return new Sync;
	},{deps:['ajax']});

	gioc.map('userid', 123456789, {
		modifier:function(id){
			console.log('modifier ', id);
			return Math.round(id / 100000);
		}
	});

	gioc.map('user', function(first, last, age){
		console.log('+++++++ user factory: first %s last %s age %s', first, last, age);
		return new User();
	}, {
		props:{factoryOptions:true},
		args:['pepe', 'rone', 23],
		deps:['userid',
			  'jquery',
			  {
			  	id:'sync', 
					options:{
				  		props:{url:'localhost'},			 
						after:function(age, tag){
							console.log('************ POST: hello sync age ', age, ' tag ', tag);
						},
						pargs:[23,'something']
					}
				}
			]
	});

	console.log('Beans ', gioc.beans);

	var userid = gioc.solve('userid');
	console.log('userid ', userid);

	var pepe = gioc.solve('user', {props:{first:'pepe', last:'rone'}});
	console.log('User pepe ', pepe);

	var app = {};
	gioc.inject('user', app, {props:{first:'Goliat', last:'One'}});

	window.pepe = pepe;
	window.gioc = gioc;
	window.app = app;
});