angular.module('myApp.user')
.controller('userCtrl',function($scope, $route, $routeParams, $location, userData){
	$scope.pageName = userData.pageName;
	$scope.userId = $routeParams.userId;
	$scope.foo = "please input!";
});