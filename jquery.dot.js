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
