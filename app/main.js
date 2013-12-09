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
			deps.map(function(dep){
				console.log(dep)
				if(! dep in target){
					console.log('try to solve')
					var lib = require(dep);
					if(lib) target[dep] = lib;
				}
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

	gioc.map('user', function(options){
		console.log('user factory: ', this, options);
		return new User();
	}, {
		factoryOptions:true, 
		deps:['userid',
			  'jquery',
			  {id:'sync', 
				options:{
			  	props:{url:'localhost'},			 
				post:function(){
					console.log('************ hello sync ', this, arguments);
				}
			}
		}]
	});

	console.log('Beans ', gioc.beans);

	var userid = gioc.solve('userid');
	console.log('userid ', userid);

	var pepe = gioc.solve('user', {props:{first:'pepe', last:'rone'}});
	console.log('User pepe ', pepe);

	window.pepe = pepe;
	window.gioc = gioc;
});