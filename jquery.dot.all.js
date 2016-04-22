// doT.js
// 2011, Laura Doktorova, https://github.com/olado/doT
// Licensed under the MIT license.

(function() {
	"use strict";

	var doT = {
		version: '1.0.1',
		templateSettings: {
			evaluate:    /\{\{([\s\S]+?(\}?)+)\}\}/g,
			interpolate: /\{\{=([\s\S]+?)\}\}/g,
			encode:      /\{\{!([\s\S]+?)\}\}/g,
			use:         /\{\{#([\s\S]+?)\}\}/g,
			useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
			define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
			defineParams:/^\s*([\w$]+):([\s\S]+)/,
			conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
			iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
			varname:	'it',
			strip:		true,
			append:		true,
			selfcontained: false
		},
		template: undefined, //fn, compile template
		compile:  undefined  //fn, for express
	}, global;

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = doT;
	} else if (typeof define === 'function' && define.amd) {
		define(function(){return doT;});
	} else {
		global = (function(){ return this || (0,eval)('this'); }());
		global.doT = doT;
	}

	function encodeHTMLSource() {
		var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
			matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
		return function() {
			return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
		};
	}
	String.prototype.encodeHTML = encodeHTMLSource();

	var startend = {
		append: { start: "'+(",      end: ")+'",      endencode: "||'').toString().encodeHTML()+'" },
		split:  { start: "';out+=(", end: ");out+='", endencode: "||'').toString().encodeHTML();out+='"}
	}, skip = /$^/;

	function resolveDefs(c, block, def) {
		return ((typeof block === 'string') ? block : block.toString())
		.replace(c.define || skip, function(m, code, assign, value) {
			if (code.indexOf('def.') === 0) {
				code = code.substring(4);
			}
			if (!(code in def)) {
				if (assign === ':') {
					if (c.defineParams) value.replace(c.defineParams, function(m, param, v) {
						def[code] = {arg: param, text: v};
					});
					if (!(code in def)) def[code]= value;
				} else {
					new Function("def", "def['"+code+"']=" + value)(def);
				}
			}
			return '';
		})
		.replace(c.use || skip, function(m, code) {
			if (c.useParams) code = code.replace(c.useParams, function(m, s, d, param) {
				if (def[d] && def[d].arg && param) {
					var rw = (d+":"+param).replace(/'|\\/g, '_');
					def.__exp = def.__exp || {};
					def.__exp[rw] = def[d].text.replace(new RegExp("(^|[^\\w$])" + def[d].arg + "([^\\w$])", "g"), "$1" + param + "$2");
					return s + "def.__exp['"+rw+"']";
				}
			});
			var v = new Function("def", "return " + code)(def);
			return v ? resolveDefs(c, v, def) : v;
		});
	}

	function unescape(code) {
		return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, ' ');
	}

	doT.template = function(tmpl, c, def) {
		c = c || doT.templateSettings;
		var cse = c.append ? startend.append : startend.split, needhtmlencode, sid = 0, indv,
			str  = (c.use || c.define) ? resolveDefs(c, tmpl, def || {}) : tmpl;

		str = ("var out='" + (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g,' ')
					.replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,''): str)
			.replace(/'|\\/g, '\\$&')
			.replace(c.interpolate || skip, function(m, code) {
				return cse.start + unescape(code) + cse.end;
			})
			.replace(c.encode || skip, function(m, code) {
				needhtmlencode = true;
				return cse.start + unescape(code) + cse.endencode;
			})
			.replace(c.conditional || skip, function(m, elsecase, code) {
				return elsecase ?
					(code ? "';}else if(" + unescape(code) + "){out+='" : "';}else{out+='") :
					(code ? "';if(" + unescape(code) + "){out+='" : "';}out+='");
			})
			.replace(c.iterate || skip, function(m, iterate, vname, iname) {
				if (!iterate) return "';} } out+='";
				sid+=1; indv=iname || "i"+sid; iterate=unescape(iterate);
				return "';var arr"+sid+"="+iterate+";if(arr"+sid+"){var "+vname+","+indv+"=-1,l"+sid+"=arr"+sid+".length-1;while("+indv+"<l"+sid+"){"
					+vname+"=arr"+sid+"["+indv+"+=1];out+='";
			})
			.replace(c.evaluate || skip, function(m, code) {
				return "';" + unescape(code) + "out+='";
			})
			+ "';return out;")
			.replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r')
			.replace(/(\s|;|\}|^|\{)out\+='';/g, '$1').replace(/\+''/g, '')
			.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+=');

		if (needhtmlencode && c.selfcontained) {
			str = "String.prototype.encodeHTML=(" + encodeHTMLSource.toString() + "());" + str;
		}
		try {
			return new Function(c.varname, str);
		} catch (e) {
			if (typeof console !== 'undefined') console.log("Could not create a template function: " + str);
			throw e;
		}
	};

	doT.compile = function(tmpl, def) {
		return doT.template(tmpl, null, def);
	};
}());


/*!========================================================================
 * Version: v1.0
 * Create: 2016年4月22日 下午1:36
 * ========================================================================
 * Author: Vace (ocdo@qq.com)
 * Description: <无>
 * ======================================================================== */

/* global define,doT */

(function(root, factory) {

  if (typeof define === 'function' && define.amd) {
    define(['jquery', 'dot'], factory)
  } else if (typeof exports === 'function') {
    module.exports = factory(require('jquery'), require('dot'))
  } else {
    factory(root.jQuery || root.Zepto, doT)
  }

})(this, function($, doT) {
  var _default = {
      method:'append',
      target:null
    },
    //缓存编译后的模板
    _cache = {}

  /**
   * [Render 渲染基类]
   * @param {[type]} el      [description]
   * @param {[type]} options [description]
   */
  
  function Render($el, options) {
    this.$el = $el
    this.options = options || {}
    this.renderFun = doT.template($el.html())
  }

  Render.$ALLOW_FUN = 'append,prepend,after,before,html'.split(',')

  var pt = Render.prototype

  pt.render = function(callback_or_data,callback) {
    var result = this.renderFun(callback_or_data)
    if(typeof callback === 'function'){
      callback(result)
    }
    this._autoRender(result)
    return result
  }

  pt._autoRender = function(data){
    var target = this.options.target || this.$el.data('target') || this.$el.attr('target')
    var method = this.options.method || this.$el.data('method') || this.$el.attr('method')

    if(target && method){
      if(Render.$ALLOW_FUN.indexOf(method) === -1){
        console.warn('may not support methods : ' + method)
      }
      $(target)[method]( $(data) )
    }
  }

  function renderElement(options) {
    var $this = $(this),
      key = $this.data('cache')
    if (!key) {
      key = Math.random().toString(16).substring(2)
      _cache[key] = new Render($this, options)
    }
    return _cache[key]
  }

  function RendersManager(obj, opt) {
    this._elements = obj
    this._renders = []
    var that = this

    obj.each(function() {
      that._renders.push(renderElement.call(this,opt))
    })
  }

  var rpt = RendersManager.prototype


  rpt.render = function(data,callback) {
  	var back = typeof callback !== 'function',
        tmpl = null,
        tmpls=[],
        renders = this._renders
	
  	for(var i = 0,_len = this._renders.length ; i < _len ; i++){
  		tmpl = renders[i].render(data,callback)
  		if(back){
  			return tmpl
  		}
  		tmpls.push(tmpl)
  	}
  	return tmpls
  	
  }

  $.fn.dot = function dot(options) {
    return new RendersManager(this, options)
  }

  $.fn.dot.default = _default


})
