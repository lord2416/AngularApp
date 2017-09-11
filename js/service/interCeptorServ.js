angular.module('myApp.common')
.factory('httpInterceptor',function($sce,$rootScope,$timeout){
	var startTime,endTime;
	return{
		'request':function(req){
			startTime = new Date().getTime();
			$rootScope.loading = true;
			return req;
		},
		'response':function(res){
			endTime = new Date().getTime();
			$rootScope.$evalAsync(function(){
				var loadingTime = endTime-startTime;
				if(loadingTime > 500){
					$rootScope.loading = false;
				}else{
					$timeout(function(){
						$rootScope.loading = false;
					},500);
				}
			});
			return res;
		}
	}
});