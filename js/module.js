angular.module('myApp.common',[]);
angular.module('myApp.main',['myApp.main.tinymice','myApp.main.dropdown']);
angular.module('myApp.main.tinymice',['myApp.common','ui.tinymce']);
angular.module('myApp.main.dropdown',['myApp.common','angularify.semantic.dropdown']);
angular.module('myApp.user',['myApp.common']);