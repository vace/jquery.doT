# jquery.doT
jquery template width doT.jsT

jquery 模板插件


## 使用
依赖Jqery或者Zepto.


## API

`$(selector).dot(options)`

** options ** 

* `target`:`null` 模板渲染成功后会自动加载到对应位置
* `method`:`apped` 模板添加方法 append,prepend,after,before,html



## 实例

```html
<div id="target">
    
</div>

<script type="text/html" class="httptemplate" target="#target" method="append">
    <div>
        <p>ip : {{= it.origin }}</p>
        <p>name : {{= it.args.user }}</p>
        <p>age : {{= it.args.age }}</p>
    </div>
</script>

<script>
	$.getJSON('http://httpbin.org/get',{user:'vace',age:1000},function(result){
	    // console.log(result)
	    $('.httptemplate').dot({
	        // target:'#target',
	        // method:'append'
	    }).render(result,function(){
	        console.log('appened')
	    })
	})
</script>
```

```javascript
var data = [{name:'vace',age:30},{name:'bug',age:0}]

var tmpl = $('.template').dot()

tmpl.render(data,function(tmpl){
    console.log(tmpl)
})

```