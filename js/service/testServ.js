angular.module('myApp.common')
.factory('testService',function($http,$q){
	return{
		getMain:function(){
			return $http.get('mock/testNgRoute-main.json');
		},
		getUser:function(){
			return $http.get('mock/testNgRoute-user.json');
		},
		getRest:function(){
			return $http.get('/restapi/login');
		}
	}
});