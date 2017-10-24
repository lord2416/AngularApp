angular.module('myApp.main')
.controller('mainCtrl',function($scope, $route, $routeParams, $location, mainData, $parse){
	$scope.pageName = mainData.pageName;
	$scope.myInputVal1 = "111";
	$scope.myInputVal2 = "";
	$scope.myInputVal3 = "";
	$scope.myInputVal4 = "";
//	$scope.date = restData.data.date;
//	console.debug(restData);
	$scope.selectVal = "";
	$scope.parentOptions = [
		{item:"Arabic Chinese",select:true,index:1},
		{item:"Chinese ",select:false,index:2},
		{item:"Dutch",select:false,index:3},
		{item:"English",select:false,index:4},
		{item:"French",select:false,index:5},
		{item:"German",select:false,index:6},
		{item:"Greek",select:false,index:7},
		{item:"Hungarian",select:false,index:8},
		{item:"Italian",select:false,index:9},
		{item:"Japanese",select:false,index:10},
		{item:"Korean",select:false,index:11},
		{item:"Lithuanian",select:false,index:12},
		{item:"Persian",select:false,index:13},
		{item:"Polish",select:false,index:14},
		{item:"Portuguese",select:false,index:15},
		{item:"Russian",select:false,index:16},
		{item:"Spanish",select:false,index:17},
		{item:"Swedish",select:false,index:18},
		{item:"Turkish",select:false,index:19},
		{item:"Vietnamese",select:false,index:20}
	];
	$scope.updateVal = function(){
		var text = "'it is my test!the result is:' + myInputVal1";
		var inputFuc = $parse(text);
		$scope.myInputValRes = inputFuc($scope);
	}
});