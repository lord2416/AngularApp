angular.module('myApp.main')
.controller('mainCtrl',function($scope, $route, $routeParams, $location, mainData, $parse){
	$scope.pageName = mainData.pageName;
	$scope.myInputVal = "111";
//	$scope.date = restData.data.date;
//	console.debug(restData);
	$scope.updateVal = function(){
		var text = "'it is my test!the result is:' + myInputVal";
		var inputFuc = $parse(text);
		$scope.myInputValRes = inputFuc($scope);
	}
});