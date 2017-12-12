angular.module('myApp.user')
.controller('userCtrl',function($scope, $route, $routeParams, $location, userData){
	$scope.pageName = userData.pageName;
	$scope.userId = $routeParams.userId;
	$scope.foo = "please input!";
	var ctrl = this;
	console.log(this);
	console.log(ctrl);
	this.update = function(){
		console.log('this update');
	};
	this.delete = function(){
		console.log('this update');
	};
	$scope.exportFile = function () {
//		if($scope.type == "orderReports"){
//			var criteria = $scope.searchFieldsData;
//			if(criteria){
//				var params = {
//					search: '{"criteria":'+ angular.toJson(criteria) + '}'
//				};
//				commonServ.exportResultWithParams(rps.commonUrl + 'orderReport' + rps.download, params, "OrderReports.csv");
//			}else{
//				commonServ.exportResult(rps.commonUrl + 'orderReport' + rps.download, null, "OrderReports.csv");
//			}
//		}else if($scope.type == "orderItemReports"){
//			commonServ.exportResult(rps.commonUrl + 'orderItemReport' + rps.download, null, "ItemReports.csv");
//		}else if($scope.type == "audits"){
//			var criteria = $scope.searchFieldsData;
//			if(criteria){
//				// var searchFields = {'criteria': criteria};
//				// commonServ.exportResult(rps.commonUrl + 'audits' + rps.download + "?search=" + angular.toJson(searchFields), null, "AuditLogs.csv");
//
//				$http({
//					method: 'GET',
//					url: rps.commonUrl + 'audits' + rps.download,
//					params: {
//						search: '{"criteria":'+ angular.toJson(criteria) + '}'
//					}
//				}).then(function (response) {
//					var blob = new Blob([response.data], {
//						type: 'text/csv;charset=utf-8'
//					});
//					var fileName = "";
//					try {
//						fileName = new RegExp('filename="(.+)"', 'ig').exec(response.headers()['content-disposition'])[1];
//					} catch (e) {
//						console.log(e);
//						fileName = "AuditLogs.csv";
//					}
//					saveAs(blob, fileName);
//				});
//
//			}else{
//				commonServ.exportResult(rps.commonUrl + 'audits' + rps.download, null, "AuditLogs.csv");
//			}
//		}else{
//			commonServ.exportResult(rps.commonUrl + $scope.type + rps.export, null, "template.csv");
//		}
		var type = $scope.type,
			criteria = $scope.searchFieldsData;
			
		switch(type){
			case '':
				break;
			default:
				break;
		}
	};
});