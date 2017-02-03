<template>

<div id="app mdui-container">
  <!-- Weather card -->
  <div class="weather_card mdui-color-blue" v-bind:class="{weather_card_active: hasWeather}">

    <div class="mdui-dialog" id="cities">
      <div class="mdui-dialog-title">选择城市</div>
      <div class="mdui-dialog-content">
        <select class="province"></select>
        <select class="city" disabled="disabled"></select>
        <select class="area" disabled="disabled"></select><br /><br />
        (设置城市后请刷新)
      </div>
      <div class="mdui-dialog-actions">
        <button class="mdui-btn mdui-ripple" mdui-dialog-cancel>取消</button>
        <button class="setCity mdui-btn mdui-ripple" mdui-dialog-confirm>确定</button>
      </div>
    </div>

    <div class="weather_console">
      <div class="city_edit" mdui-dialog="{target: '#cities'}">
  			<span class="now_city_edit"></span>
        <i class="mdui-icon material-icons" style="font-size: 16px">edit</i>
      </div>
    </div>

    <ul class="weather_more">
      <li id="weather_more_today" class="weather_list" v-bind:class="{weather_list_active: hasWeather}">
        <p class="weather_list-date"></p>
        <span class="weather_list-weather"></span>
        <span class="weather_list-temp"></span>
      </li>
      <li class="weather_list" v-bind:class="{weather_list_active: hasWeather}">
        <p class="weather_list-date"></p>
        <p class="weather_list-weather"></p>
        <p class="weather_list-temp"></p>
      </li>
      <li class="weather_list" v-bind:class="{weather_list_active: hasWeather}">
        <p class="weather_list-date"></p>
        <p class="weather_list-weather"></p>
        <p class="weather_list-temp"></p>
      </li>
      <li class="weather_list" v-bind:class="{weather_list_active: hasWeather}">
        <p class="weather_list-date"></p>
        <p class="weather_list-weather"></p>
        <p class="weather_list-temp"></p>
      </li>
      <li class="weather_list" v-bind:class="{weather_list_active: hasWeather}">
        <p class="weather_list-date"></p>
        <p class="weather_list-weather"></p>
        <p class="weather_list-temp"></p>
      </li>
    </ul>
  </div>

	<!-- Header -->
	<div class="header mdui-color-blue mdui-col-xs-12 mdui-toolbar">
		<div>O.</div>
		<div class="mdui-toolbar-spacer"></div>
		<div class="weather_entry" v-on:click="showWeather">
			<p class="now_city"></p>
			<span class="now_temp"></span>
		</div>
    <i class="mdui-icon material-icons weather_more_icon" v-bind:class="{iconHidden: hasWeather}">keyboard_arrow_down</i>
    <i class="mdui-icon material-icons weather_more_icon" v-bind:class="{iconHidden: !hasWeather}">keyboard_arrow_up</i>
	</div>

	<!-- Search bar -->
	<div
    class="searchbar mdui-toolbar mdui-color-blue mdui-col-xs-12"
    v-bind:class="{searchbar_active: isSearch}"
  >
		<!-- <input
			v-on:click="toSearch"
			v-bind:class="{searchbar_input_active: isSearch}"
			class="mdui-textfield-input searchbar_input"
			type="text"
			placeholder="搜索"
		/> -->

    <!-- Search engine icon & list -->
    <div
      class="search_switch"
      v-bind:class="{search_switch_active: isSearch}"
      mdui-menu="{target: '#search_engine'}"
    >
      <img src="./assets/img/search/Google-icon.svg" v-bind:class="{iconHidden: this.searchEngine!='google'}" width="20px" height="36px"/>
      <img src="./assets/img/search/Baidu-icon.svg" v-bind:class="{iconHidden: this.searchEngine!='baidu'}" width="20px" height="36px"/>
      <img src="./assets/img/search/Bing-icon.svg" v-bind:class="{iconHidden: this.searchEngine!='bing'}" width="20px" height="36px"/>
    </div>
    <ul class="mdui-menu" id="search_engine">
      <li class="mdui-menu-item" v-on:click="useGoogle">
        <a href="javascript:;" class="mdui-ripple">Google</a>
      </li>
      <li class="mdui-menu-item" v-on:click="useBing">
        <a href="javascript:;" class="mdui-ripple">Bing</a>
      </li>
      <li class="mdui-menu-item" v-on:click="useBaidu">
        <a href="javascript:;" class="mdui-ripple">Baidu</a>
      </li>
    </ul>

    <!-- Google -->
    <form
      action="https://www.google.com/search"
      v-bind:class="{searchbar_form_active: isSearch}"
      v-if="searchEngine == 'google'"
      class="searchbar_form"
    >
      <input
        v-on:click="toSearch"
        v-bind:class="{searchbar_input_active: isSearch}"
        class="mdui-textfield-input searchbar_input"
        type="text"
        name="q"
        autocomplete="off"
        placeholder="Search"
      >
    </form>

    <!-- Bing -->
    <form
      action="https://www.bing.com/search"
      v-bind:class="{searchbar_form_active: isSearch}"
      v-if="searchEngine == 'bing'"
      class="searchbar_form"
    >
      <input
        v-on:click="toSearch"
        v-bind:class="{searchbar_input_active: isSearch}"
        class="mdui-textfield-input searchbar_input"
        type="text"
        name="q"
        autocomplete="off"
        placeholder="Search"
      >
    </form>

    <!-- Baidu -->
    <form
      action="https://www.baidu.com/s"
      v-bind:class="{searchbar_form_active: isSearch}"
      v-if="searchEngine == 'baidu'"
      class="searchbar_form"
    >
      <input
        v-on:click="toSearch"
        v-bind:class="{searchbar_input_active: isSearch}"
        class="mdui-textfield-input searchbar_input"
        type="text"
        name="wd"
        autocomplete="off"
        placeholder="Search"
      >
    </form>

    <!-- Search button -->
    <div class="search-button">
      <img src="./assets/img/search/search.svg" width="36px" height="36px"/>
    </div>
	</div>

  <!-- Overlay -->
  <div class="overlay" v-on:click="closeSearch" v-bind:class="{overlay_active: isSearch}"></div>

  <div class="card-wrap">
  	<!-- MDUI card -->
  	<div class="mdui-card mdui-col-xs-12 mdui-col-md-10 mdui-col-offset-md-1 mdui-col-lg-6 mdui-col-offset-lg-1 mdui-shadow-0 sites-card ">
  		<!-- Card title -->
  		<div class="mdui-card-header card-header">
  			网站
  			<div v-on:click="editSites" class="edit">{{editOrComplete}}</div>
  		</div>

  		<div class="mdui-divider"></div>

  		<!-- Sites list -->
  		<ul class="mdui-list">
  			<li v-for="(site, index) in sites" class="site">
  				<button
  					class="remove"
  					v-bind:class="{remove_active: canRemove}"
  					v-on:click="removeSite(index)"
  				>
  					<i class="mdui-icon material-icons">close</i>
  				</button>
  				<a v-bind:href="site.url" target="_blank">
  					<div>
  						<img v-bind:src="site.icon" width="55px" height="55px" v-bind:class="{remove_active: canRemove}"/>
  					</div>
  					<div class="site-title">{{ site.title}}</div>
  				</a>
  			</li>
  			<li class="site" v-on:click="showAddpanel">
  				<i class="mdui-icon material-icons add-site-icon" v-bind:class="{iconHidden: hasAddPanel}">add</i>
  				<i class="mdui-icon material-icons add-site-icon" v-bind:class="{iconHidden: !hasAddPanel}">close</i>
  				<div class="site-title">添加</div>
  			</li>
  		</ul>

  		<!-- New site panel -->
  		<div
  			class="new_site mdui-color-blue-grey-50"
  			v-bind:class="{new_site_active: hasAddPanel}"
  		>
  			<div class="new-site-info mdui-textfield mdui-textfield-floating-label">
  				<label class="mdui-textfield-label">网站地址</label>
  				<input class="mdui-textfield-input" type="url" v-model="newSiteurl" />
  			</div>
  			<div class="new-site-info mdui-textfield mdui-textfield-floating-label">
  				<label class="mdui-textfield-label">网站名称</label>
  				<input class="mdui-textfield-input" type="text" v-model="newSitetitle" />
  			</div>
  			<div class="new-site-info mdui-textfield mdui-textfield-floating-label">
  				<label class="mdui-textfield-label">网站图标地址</label>
  				<input class="mdui-textfield-input" type="text" v-model="newSiteicon" />
  			</div>
  			<button class="addtodo_button mdui-btn mdui-btn-raised mdui-color-theme-accent mdui-ripple" v-on:click="addSite">添加</button>
  		</div>

  	</div>

    <!-- MDUI card -->
  	<div class="mdui-card mdui-col-xs-12 mdui-col-md-5 mdui-col-offset-md-1 mdui-col-lg-3 mdui-shadow-0 todos-card">
      <!-- Card title -->
  		<div class="mdui-card-header card-header">
  			TODO
  		</div>

  		<div class="mdui-divider"></div>

      <ul class="mdui-list">

        <li class="mdui-collapse-item" v-for="(todo, index) in todos">
          <div class="mdui-collapse-item-header mdui-list-item mdui-ripple">
            <label class="mdui-checkbox">
              <input type="checkbox" v-bind:checked="todo.isFinished" v-on:click="toggleFinished(todo, index)"/>
              <i class="mdui-checkbox-icon"></i>
            </label>
            <div class="mdui-list-item-content todo-item" v-if="todo.isFinished == true"><del>{{ todo.label }}</del></div>
            <div class="mdui-list-item-content todo-item" v-else>{{ todo.label }}</div>
            <i class="mdui-collapse-item-arrow mdui-icon material-icons" v-on:click="removeTodo(todo, index)" style="font-size: 19px;">close</i>
          </div>
          <ul class="mdui-collapse-item-body mdui-list mdui-list-dense">
            <li class="mdui-list-item mdui-ripple todo-sub-list" v-on:click="removeTodo(todo, index)">删除</li>
          </ul>
        </li>

      </ul>

      <div>
        <div class="mdui-textfield todo_input_wrap">
          <input v-model="newTodo" v-on:keyup.enter="addTodo" class="mdui-textfield-input" type="text" placeholder="Add Todo"/>
        </div>
        <button class="mdui-btn mdui-btn-icon mdui-ripple add_todo_button" v-on:click="addTodo">
          <i class="mdui-icon material-icons mdui-list-item-icon">send</i>
        </button>
      </div>

    </div>
  </div>

  <!-- Footer -->
  <div class="footer mdui-card mdui-col-xs-12">
      <ul class="social-buttons">
        <li><a href="https://github.com/viosey/O" target="_blank"><img src="./assets/img/footer/github.svg" alt="" width="24px" height="24px;"></a></li>
        <li><a href="http://weibo.com/viosey" target="_blank"><img src="./assets/img/footer/weibo.svg" alt="" width="24px" height="24px;"></i></a></li>
        <li><a href="https://blog.viosey.com/2017/01/26/Hello-O/" target="_blank"><img src="./assets/img/footer/about.svg" alt="" width="24px" height="24px;"></i></a></li>
      </ul>

      <p class="copyright">
        Made by <a href="https://viosey.com" target="_blank">Viosey</a>
      </p>
  </div>

</div>
</template>

<script>
import Store from './store'
import './assets/js/jquery.cxselect.min.js'

// jQuery
$(document).ready(function() {
  $(".setCity").click(function(){
    Store.setCookie("cityid", $(".area").val(), 365);
  });
  // City select
  $.cxSelect.defaults.url = "https://qiniu.viosey.com/cityid.min.json";
  $("#cities").cxSelect({
    selects : ["province", "city", "area"],
    nodata : "none",
    jsonName : "name",
    jsonValue : "code",
    jsonSub : "sublist"
  });

  // Time
  function getDate(addDayCount) {
      var dd = new Date();
      dd.setDate(dd.getDate()+addDayCount);// 获取 AddDayCount 天后的日期
      var y = dd.getFullYear();
      var m = dd.getMonth()+1;// 获取当前月份的日期
      var d = dd.getDate();
      return y + '/' + (m<10 ? "0" + m : m)+ '/' + (d<10 ? "0"+ d : d);
  }

  // 一言
  // var aword=$.ajax({url:"https://api.lwl12.com/hitokoto/main/get", async:false});
  // $(".searchbar_input").attr("placeholder", aword.responseText);

  // Weather
  // var cityid = 101020100;
  var cityid = Store.getCookie('cityid');
  var weather=$.ajax({url:"https://weather.viosey.com/myapp/weather/data/index.php%3fcityID=" + cityid, async:false});

  var weatherJson = JSON.parse(weather.responseText);

  var weather = new Array();
  var temp = new Array();
  weather[0] = weatherJson.weatherinfo.weather1;
  weather[1] = weatherJson.weatherinfo.weather2;
  weather[2] = weatherJson.weatherinfo.weather3;
  weather[3] = weatherJson.weatherinfo.weather4;
  weather[4] = weatherJson.weatherinfo.weather5;
  temp[0] = weatherJson.weatherinfo.temp1;
  temp[1] = weatherJson.weatherinfo.temp2;
  temp[2] = weatherJson.weatherinfo.temp3;
  temp[3] = weatherJson.weatherinfo.temp4;
  temp[4] = weatherJson.weatherinfo.temp5;

  $(".now_city_edit").html(weatherJson.weatherinfo.city);
  $(".now_city").html(weatherJson.weatherinfo.city);
  $(".now_temp").html(weatherJson.weatherinfo.temp1);

  for (var i=0; i<5; i++){
      $(".weather_list-date").eq(i).html(getDate(i));
      $(".weather_list-weather").eq(i).html(weather[i]);
      $(".weather_list-temp").eq(i).html(temp[i]);
  }

  $( ".search-button" ).click(function() {
    $( ".searchbar_form" ).submit();
  });
})

// init first visit
if (!Store.getCookie('visited')) {
  if(Store.fetch_site().length == 0){
    Store.save_site([
      {
  			"url": "https://github.com/",
  			"title": "Github",
  			"icon": require('./assets/img/icons/github.svg')
  		}, {
  			"url": "https://store.steampowered.com",
  			"title": "Steam",
  			"icon": require('./assets/img/icons/steam.svg')
  		}, {
  			"url": "https://www.wikipedia.org/",
  			"title": "Wikipedia",
  			"icon": require('./assets/img/icons/wikipedia.svg')
  		}, {
  			"url": "https://www.reddit.com/",
  			"title": "Reddit",
  			"icon": require('./assets/img/icons/reddit.svg')
  		}, {
  			"url": "https://www.flickr.com/",
  			"title": "Flickr",
  			"icon": require('./assets/img/icons/flickr.svg')
  		}, {
  			"url": "https://500px.com/",
  			"title": "500px",
  			"icon": require('./assets/img/icons/500.svg')
  		}, {
  			"url": "http://digg.com/",
  			"title": "Digg",
  			"icon": require('./assets/img/icons/digg.svg')
  		}, {
  			"url": "https://tumblr.com/",
  			"title": "Tumblr",
  			"icon": require('./assets/img/icons/tumblr.svg')
  		}, {
  			"url": "https://facebook.com/",
  			"title": "Facebook",
  			"icon": require('./assets/img/icons/facebook.svg')
  		}, {
  			"url": "https://twitter.com/",
  			"title": "Twitter",
  			"icon": require('./assets/img/icons/twitter.svg')
  		}, {
  			"url": "https://zhihu.com/",
  			"title": "知乎",
  			"icon": require('./assets/img/icons/zhihu.svg')
  		}, {
  			"url": "https://www.dropbox.com/",
  			"title": "Dropbox",
  			"icon": require('./assets/img/icons/dropbox.svg')
  		}, {
  			"url": "https://www.behance.net/",
  			"title": "Behance",
  			"icon": require('./assets/img/icons/behance.svg')
  		}, {
  			"url": "https://plus.google.com/",
  			"title": "Google+",
  			"icon": require('./assets/img/icons/google_plus.svg')
  		}, {
  			"url": "https://quora.com/",
  			"title": "Quora",
  			"icon": require('./assets/img/icons/quora.svg')
  		}, {
  			"url": "https://www.pinterest.com/",
  			"title": "Pinterest",
  			"icon": require('./assets/img/icons/pinterest.svg')
  		}, {
  			"url": "https://getpocket.com/",
  			"title": "Pocket",
  			"icon": require('./assets/img/icons/pocket.svg')
  		}, {
  			"url": "https://dribbble.com/",
  			"title": "Dribbble",
  			"icon": require('./assets/img/icons/dribbble.svg')
  		}, {
  			"url": "http://stackoverflow.com/",
  			"title": "Stack Overflow",
  			"icon": require('./assets/img/icons/stackoverflow.svg')
  		}, {
  			"url": "https://www.amazon.com/",
  			"title": "Amazon",
  			"icon": require('./assets/img/icons/amazon.svg')
  		}, {
  			"url": "https://taobao.com/",
  			"title": "淘宝",
  			"icon": require('./assets/img/icons/taobao.svg')
  		}, {
  			"url": "http://weibo.com/",
  			"title": "微博",
  			"icon": require('./assets/img/icons/weibo.svg')
  		}, {
  			"url": "http://coolapk.com/",
  			"title": "酷安",
  			"icon": require('./assets/img/icons/coolapk.svg')
  		}, {
  			"url": "http://douban.com/",
  			"title": "豆瓣",
  			"icon": require('./assets/img/icons/douban.svg')
  		}
  	])
  }
  if(Store.fetch_todo().length == 0){
    Store.save_todo([
  		{
  			"label": "1. Search",
  			"isFinished": false
  		}, {
        "label": "2. Add your own TODO",
  			"isFinished": false
  		}
  	])
  }

  Store.setCookie("se", "google", 365);
  Store.setCookie("visited", "true", 365);
  if(!Store.getCookie("cityid")){
    Store.setCookie("cityid", 101010100, 365);
  }
}

  //  console.log(Store.fetch_site().length)
export default {
	data() {
		return {
      editOrComplete: '编辑',
      searchEngine: Store.getCookie('se'),
			newSiteurl: '',
			newSitetitle: '',
			newSiteicon: '',
      newTodo: '',
			canRemove: false,
			hasAddPanel: false,
			isSearch: false,
      hasWeather: false,
			sites: Store.fetch_site(),
      todos: Store.fetch_todo()
		}
	},
	watch: {
		sites: {
			handler: function(sites) {
				Store.save_site(sites)
			},
			deep: true
		},
    todos: {
      handler: function (todos) {
        Store.save_todo(todos)
      },
      deep: true
    }
	},
	methods: {
		showAddpanel: function(){
			this.hasAddPanel = !this.hasAddPanel;
		},
		addSite: function() {
			this.sites.push({
				url: this.newSiteurl,
				title: this.newSitetitle,
				icon: (this.newSiteicon ? this.newSiteicon : require('./assets/img/icons/default.svg'))
			})
			this.newSiteurl = ''
			this.newSitetitle = ''
			this.newSiteicon = ''
		},
		removeSite: function(index) {
			this.sites.splice(index, 1);
		},
		editSites: function() {
			this.canRemove = !this.canRemove;
      if(this.canRemove == true) this.editOrComplete = '完成';
      if(this.canRemove == false) this.editOrComplete = '编辑';
		},
    addTodo: function(){
      this.todos.push({
        label: this.newTodo,
        isFinished: false
      })
      this.newTodo = ''
    },
    removeTodo: function (todo, index) {
      this.todos.splice(index, 1);
      var _this = this;
      mdui.snackbar({
        message: 'Item deleted',
        buttonText: 'undo',
        onButtonClick: function(){
          _this.todos.push({
            label: todo.label,
            isFinished: todo.isFinished
          })
        }
      });
    },
    toggleFinished: function (todo, index) {
      todo.isFinished = !todo.isFinished
    },
		toSearch: function(){
      if(this.isSearch == false){
  			this.isSearch = true
      }
		},
    closeSearch: function(){
      if(this.isSearch == true){
  			this.isSearch = false
      }
    },
    showWeather: function(){
      this.hasWeather = !this.hasWeather
    },
    useGoogle: function(){
      this.searchEngine = 'google';
      Store.setCookie("se", "google", 30);
    },
    useBing: function(){
      this.searchEngine = 'bing';
      Store.setCookie("se", "bing", 30);
    },
    useBaidu: function(){
      this.searchEngine = 'baidu';
      Store.setCookie("se", "baidu", 30);
    }
	}
}

</script>

<style>
#app {
	font-family: 'Avenir', Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	color: #2c3e50;
	margin-top: 60px;
}
</style>
