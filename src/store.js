const STORAGE_KEY = 'sites'
const TODO_kEY = 'todos'

export default {
  fetch_site () {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
  },
  save_site (items) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  },
  fetch_todo () {
    return JSON.parse(window.localStorage.getItem(TODO_kEY) || '[]')
  },
  save_todo (items) {
    window.localStorage.setItem(TODO_kEY, JSON.stringify(items))
  },
  setCookie(c_name, value, expiredays){
    var exdate=new Date();
    exdate.setDate(exdate.getDate() + expiredays);
    document.cookie = c_name + "=" + escape(value)+
    ((expiredays == null) ? "" : ";expires=" + exdate.toGMTString());
  },
  getCookie(c_name){
    if (document.cookie.length>0){
      var c_start = document.cookie.indexOf(c_name + "=")
      if (c_start != -1){
        c_start = c_start + c_name.length+1
        var c_end = document.cookie.indexOf(";",c_start)
        if (c_end == -1) c_end = document.cookie.length
        // console.log(c_start + " " + c_end + " " + c_name.length);
        return unescape(document.cookie.substring(c_start, c_end))
      }
    }
    return ""
  }
}
