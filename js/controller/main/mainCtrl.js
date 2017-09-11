angular.module('myApp.main')
.controller('mainCtrl',function($scope, $route, $routeParams, $location, mainData, $parse){
	$scope.pageName = mainData.pageName;
	$scope.myInputVal1 = "111";
	$scope.myInputVal2 = "";
	$scope.myInputVal3 = "";
	$scope.myInputVal4 = "";
//	$scope.date = restData.data.date;
//	console.debug(restData);
	$scope.updateVal = function(){
		var text = "'it is my test!the result is:' + myInputVal1";
		var inputFuc = $parse(text);
		$scope.myInputValRes = inputFuc($scope);
	}
});