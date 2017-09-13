angular.module('myApp.common',[]);
angular.module('myApp.main',['myApp.main.tinymice']);
angular.module('myApp.main.tinymice',['myApp.common','ui.tinymce']);
angular.module('myApp.user',['myApp.common']);