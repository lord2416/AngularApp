angular.module('myApp',[
	'ngRoute',
	'angularTrix',
	'myApp.common',
	'myApp.main',
	'myApp.user'
]).config(["$routeProvider", "$locationProvider", "$httpProvider", function($routeProvider, $locationProvider, $httpProvider){
    //Initialize Get Request
	if(!$httpProvider.defaults.headers.get){
	  $httpProvider.defaults.headers.get = {};
	}

	//Disable IE Ajax Request Cache
	$httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
	$httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
	$httpProvider.defaults.headers.get['Pragma'] = 'no-cache';
	
	//route setting
	$routeProvider
	.when('/',{
		templateUrl:'template/testNgRoute-main.html',
		controller:'mainCtrl',
		resolve:{
			mainData:["testService", function(testService){
				return testService.getMain().then(function(res){
					return res.data;
				}).catch(function(err){
					return err.data;
				});
			}]
//			restData:function(testService){
//				return testService.getRest().then(function(res){
//					return res.data;
//				}).catch(function(err){
//					return err.data;
//				});
//			}
		}
	})
	.when('/user/:userId',{
		templateUrl:'template/testNgRoute-user.html',
		controller:'userCtrl',
		resolve:{
			userData:["testService", function(testService){
				return testService.getUser().then(function(res){
					return res.data;
				});
			}]
		},
		reloadOnSearch:false
	})
	.otherwise({
		redirectTo:'/'
	});
	
	//html5 mode setting
	$locationProvider.html5Mode(false);
	$locationProvider.hashPrefix('');

	//Interceptor
	$httpProvider.interceptors.push('httpInterceptor');
	console.log('the angular app is start!');
}])
.run(["$rootScope", "$templateCache", function($rootScope,$templateCache){
	$rootScope.loading = false;
    $rootScope.$on('$routeChangeStart', function(event, next, current) {  
        if (typeof(current) !== 'undefined'){  
            $templateCache.remove(current.templateUrl);  
        }  
    });
    $rootScope.$on('$routeUpdate',function(event, next, current){
    	console.log(event);
    	console.log(next);
    	console.log(current);
    });
}]);
angular.element(document).ready(function(){
   angular.bootstrap(document,['myApp']);
});

angular.module('myApp.common',[]);
angular.module('myApp.main',['myApp.common']);
angular.module('myApp.user',['myApp.common']);
angular.module('myApp.common')
.directive('myInputParse',function(){
	return{
		restrict:"EA",
		priority:-1,
		require:'?ngModel',
		link:function($scope, $elem, $attrs, ngModelCtrl){
			if(!ngModelCtrl) return;
			console.log('myInputParse');
			ngModelCtrl.$parsers.push(function(value){
//				var VALID_REGEXP = /^\w+$/,
				var VALID_REGEXP = /^\d+\.?\d{0,2}$/,
			 	isValid = VALID_REGEXP.test(value),
			    lastVal = value.substring(0,value.length-1);
			    
				if(isValid){
					return value;
				}else{
					ngModelCtrl.$setViewValue(lastVal);
                    ngModelCtrl.$render();
					return lastVal;
				}
			});
		}
	}
})
.directive('companyEmailValidator',function(){
/*change email validator rules:Up to 254 character before '@'*/
	var EMAIL_REGEXP = /^(?=.{1,254}$)(?=.{1,254}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;
	return{
		restrict:"EA",
		priority:-1,
		require:'?ngModel',
		link:function($scope,$elem,$attrs,ngModelCtrl){
			if(ngModelCtrl && ngModelCtrl.$validators.email){
				ngModelCtrl.$validators.email = function(modelValue, viewValue) {
		    		var value = modelValue || viewValue;
		    		return ngModelCtrl.$isEmpty(value) || EMAIL_REGEXP.test(value);
		 		 };
			}
		}
	}
})
.directive('retainDecimal',function(){
	var ROUNDUP_0_REGEXP = /^\d+$/,	
		ROUNDUP_1_REGEXP = /^\d+(\.)?\d{0,1}$/,
		ROUNDUP_2_REGEXP = /^\d+(\.)?\d{0,2}$/,
		retainConfig = {
			restrict:"A",
			require:'?ngModel',
			link:function($scope,$elem,$attrs,ngModelCtrl){
				ngModelCtrl.$parsers.push(function(value){
					var retainDecimal = $attrs.retainDecimal,
						lastVal = value.substring(0,value.length-1),
						lastChar = value.charAt(value.length-1),
						isValid,str;
					switch(retainDecimal){
						case "1":
							isValid = ROUNDUP_1_REGEXP.test(value);
							str = '.0';
							break;
						case "2":
							isValid = ROUNDUP_2_REGEXP.test(value);
							str = '.00';
							break;
						default:
							isValid = ROUNDUP_0_REGEXP.test(value);
							str = '';
							break;
					}			    
					if(isValid){
						if(lastChar == '.'){
							ngModelCtrl.$setViewValue(lastVal+str);
	                    	ngModelCtrl.$render();
							return lastVal+str;
						}
						return value;
					}else{
						ngModelCtrl.$setViewValue(lastVal);
	                    ngModelCtrl.$render();
						return lastVal;
					}
				});
			}
		};
	return retainConfig;
});
angular.module('myApp.common')
.factory('httpInterceptor',["$sce", "$rootScope", "$timeout", function($sce,$rootScope,$timeout){
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
}]);
angular.module('myApp.common')
.factory('testService',["$http", "$q", function($http,$q){
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
}]);
angular.module('myApp.main')
.controller('mainCtrl',["$scope", "$route", "$routeParams", "$location", "mainData", "$parse", function($scope, $route, $routeParams, $location, mainData, $parse){
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
}]);
angular.module('myApp.user')
.controller('userCtrl',["$scope", "$route", "$routeParams", "$location", "userData", function($scope, $route, $routeParams, $location, userData){
	$scope.pageName = userData.pageName;
	$scope.userId = $routeParams.userId;
	$scope.foo = "please input!";
}]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsIm1vZHVsZS5qcyIsImRpcmVjdGl2ZS9pbnB1dERpcmUuanMiLCJzZXJ2aWNlL2ludGVyQ2VwdG9yU2Vydi5qcyIsInNlcnZpY2UvdGVzdFNlcnYuanMiLCJjb250cm9sbGVyL21haW4vbWFpbkN0cmwuanMiLCJjb250cm9sbGVyL3VzZXIvdXNlckN0cmwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsUUFBUSxPQUFPLFFBQVE7Q0FDdEI7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtHQUNFLGdFQUFPLFNBQVMsZ0JBQWdCLG1CQUFtQixjQUFjOztDQUVuRSxHQUFHLENBQUMsY0FBYyxTQUFTLFFBQVEsSUFBSTtHQUNyQyxjQUFjLFNBQVMsUUFBUSxNQUFNOzs7O0NBSXZDLGNBQWMsU0FBUyxRQUFRLE9BQU8sc0JBQXNCO0NBQzVELGNBQWMsU0FBUyxRQUFRLElBQUksbUJBQW1CO0NBQ3RELGNBQWMsU0FBUyxRQUFRLElBQUksWUFBWTs7O0NBRy9DO0VBQ0MsS0FBSyxJQUFJO0VBQ1QsWUFBWTtFQUNaLFdBQVc7RUFDWCxRQUFRO0dBQ1AseUJBQVMsU0FBUyxZQUFZO0lBQzdCLE9BQU8sWUFBWSxVQUFVLEtBQUssU0FBUyxJQUFJO0tBQzlDLE9BQU8sSUFBSTtPQUNULE1BQU0sU0FBUyxJQUFJO0tBQ3JCLE9BQU8sSUFBSTs7Ozs7Ozs7Ozs7O0VBWWQsS0FBSyxnQkFBZ0I7RUFDckIsWUFBWTtFQUNaLFdBQVc7RUFDWCxRQUFRO0dBQ1AseUJBQVMsU0FBUyxZQUFZO0lBQzdCLE9BQU8sWUFBWSxVQUFVLEtBQUssU0FBUyxJQUFJO0tBQzlDLE9BQU8sSUFBSTs7OztFQUlkLGVBQWU7O0VBRWYsVUFBVTtFQUNWLFdBQVc7Ozs7Q0FJWixrQkFBa0IsVUFBVTtDQUM1QixrQkFBa0IsV0FBVzs7O0NBRzdCLGNBQWMsYUFBYSxLQUFLO0NBQ2hDLFFBQVEsSUFBSTs7Q0FFWixxQ0FBSSxTQUFTLFdBQVcsZUFBZTtDQUN2QyxXQUFXLFVBQVU7SUFD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SUFHUDtBQ3hCSCxRQUFRLE9BQU87Q0FDZCxRQUFRLDhCQUFjLFNBQVMsTUFBTSxHQUFHO0NBQ3hDLE1BQU07RUFDTCxRQUFRLFVBQVU7R0FDakIsT0FBTyxNQUFNLElBQUk7O0VBRWxCLFFBQVEsVUFBVTtHQUNqQixPQUFPLE1BQU0sSUFBSTs7RUFFbEIsUUFBUSxVQUFVO0dBQ2pCLE9BQU8sTUFBTSxJQUFJOzs7SUFHakI7QUNiSCxRQUFRLE9BQU87Q0FDZCxXQUFXLG1GQUFXLFNBQVMsUUFBUSxRQUFRLGNBQWMsV0FBVyxVQUFVLE9BQU87Q0FDekYsT0FBTyxXQUFXLFNBQVM7Q0FDM0IsT0FBTyxjQUFjO0NBQ3JCLE9BQU8sY0FBYztDQUNyQixPQUFPLGNBQWM7Q0FDckIsT0FBTyxjQUFjOzs7Q0FHckIsT0FBTyxZQUFZLFVBQVU7RUFDNUIsSUFBSSxPQUFPO0VBQ1gsSUFBSSxXQUFXLE9BQU87RUFDdEIsT0FBTyxnQkFBZ0IsU0FBUzs7SUFFL0I7QUNkSCxRQUFRLE9BQU87Q0FDZCxXQUFXLHlFQUFXLFNBQVMsUUFBUSxRQUFRLGNBQWMsV0FBVyxTQUFTO0NBQ2pGLE9BQU8sV0FBVyxTQUFTO0NBQzNCLE9BQU8sU0FBUyxhQUFhO0NBQzdCLE9BQU8sTUFBTTtJQUNYIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdteUFwcCcsW1xyXG5cdCduZ1JvdXRlJyxcclxuXHQnYW5ndWxhclRyaXgnLFxyXG5cdCdteUFwcC5jb21tb24nLFxyXG5cdCdteUFwcC5tYWluJyxcclxuXHQnbXlBcHAudXNlcidcclxuXSkuY29uZmlnKGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgJGh0dHBQcm92aWRlcil7XHJcbiAgICAvL0luaXRpYWxpemUgR2V0IFJlcXVlc3RcclxuXHRpZighJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldCl7XHJcblx0ICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0ID0ge307XHJcblx0fVxyXG5cclxuXHQvL0Rpc2FibGUgSUUgQWpheCBSZXF1ZXN0IENhY2hlXHJcblx0JGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuXHQkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0WydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xyXG5cdCRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXRbJ1ByYWdtYSddID0gJ25vLWNhY2hlJztcclxuXHRcclxuXHQvL3JvdXRlIHNldHRpbmdcclxuXHQkcm91dGVQcm92aWRlclxyXG5cdC53aGVuKCcvJyx7XHJcblx0XHR0ZW1wbGF0ZVVybDondGVtcGxhdGUvdGVzdE5nUm91dGUtbWFpbi5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6J21haW5DdHJsJyxcclxuXHRcdHJlc29sdmU6e1xyXG5cdFx0XHRtYWluRGF0YTpmdW5jdGlvbih0ZXN0U2VydmljZSl7XHJcblx0XHRcdFx0cmV0dXJuIHRlc3RTZXJ2aWNlLmdldE1haW4oKS50aGVuKGZ1bmN0aW9uKHJlcyl7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XHJcblx0XHRcdFx0fSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcclxuXHRcdFx0XHRcdHJldHVybiBlcnIuZGF0YTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG4vL1x0XHRcdHJlc3REYXRhOmZ1bmN0aW9uKHRlc3RTZXJ2aWNlKXtcclxuLy9cdFx0XHRcdHJldHVybiB0ZXN0U2VydmljZS5nZXRSZXN0KCkudGhlbihmdW5jdGlvbihyZXMpe1xyXG4vL1x0XHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XHJcbi8vXHRcdFx0XHR9KS5jYXRjaChmdW5jdGlvbihlcnIpe1xyXG4vL1x0XHRcdFx0XHRyZXR1cm4gZXJyLmRhdGE7XHJcbi8vXHRcdFx0XHR9KTtcclxuLy9cdFx0XHR9XHJcblx0XHR9XHJcblx0fSlcclxuXHQud2hlbignL3VzZXIvOnVzZXJJZCcse1xyXG5cdFx0dGVtcGxhdGVVcmw6J3RlbXBsYXRlL3Rlc3ROZ1JvdXRlLXVzZXIuaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOid1c2VyQ3RybCcsXHJcblx0XHRyZXNvbHZlOntcclxuXHRcdFx0dXNlckRhdGE6ZnVuY3Rpb24odGVzdFNlcnZpY2Upe1xyXG5cdFx0XHRcdHJldHVybiB0ZXN0U2VydmljZS5nZXRVc2VyKCkudGhlbihmdW5jdGlvbihyZXMpe1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0cmVsb2FkT25TZWFyY2g6ZmFsc2VcclxuXHR9KVxyXG5cdC5vdGhlcndpc2Uoe1xyXG5cdFx0cmVkaXJlY3RUbzonLydcclxuXHR9KTtcclxuXHRcclxuXHQvL2h0bWw1IG1vZGUgc2V0dGluZ1xyXG5cdCRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZShmYWxzZSk7XHJcblx0JGxvY2F0aW9uUHJvdmlkZXIuaGFzaFByZWZpeCgnJyk7XHJcblxyXG5cdC8vSW50ZXJjZXB0b3JcclxuXHQkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdodHRwSW50ZXJjZXB0b3InKTtcclxuXHRjb25zb2xlLmxvZygndGhlIGFuZ3VsYXIgYXBwIGlzIHN0YXJ0IScpO1xyXG59KVxyXG4ucnVuKGZ1bmN0aW9uKCRyb290U2NvcGUsJHRlbXBsYXRlQ2FjaGUpe1xyXG5cdCRyb290U2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgJHJvb3RTY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQsIG5leHQsIGN1cnJlbnQpIHsgIFxyXG4gICAgICAgIGlmICh0eXBlb2YoY3VycmVudCkgIT09ICd1bmRlZmluZWQnKXsgIFxyXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5yZW1vdmUoY3VycmVudC50ZW1wbGF0ZVVybCk7ICBcclxuICAgICAgICB9ICBcclxuICAgIH0pO1xyXG4gICAgJHJvb3RTY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsZnVuY3Rpb24oZXZlbnQsIG5leHQsIGN1cnJlbnQpe1xyXG4gICAgXHRjb25zb2xlLmxvZyhldmVudCk7XHJcbiAgICBcdGNvbnNvbGUubG9nKG5leHQpO1xyXG4gICAgXHRjb25zb2xlLmxvZyhjdXJyZW50KTtcclxuICAgIH0pO1xyXG59KTtcclxuYW5ndWxhci5lbGVtZW50KGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpe1xyXG4gICBhbmd1bGFyLmJvb3RzdHJhcChkb2N1bWVudCxbJ215QXBwJ10pO1xyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ215QXBwLmNvbW1vbicsW10pO1xyXG5hbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbicsWydteUFwcC5jb21tb24nXSk7XHJcbmFuZ3VsYXIubW9kdWxlKCdteUFwcC51c2VyJyxbJ215QXBwLmNvbW1vbiddKTsiLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAuY29tbW9uJylcclxuLmRpcmVjdGl2ZSgnbXlJbnB1dFBhcnNlJyxmdW5jdGlvbigpe1xyXG5cdHJldHVybntcclxuXHRcdHJlc3RyaWN0OlwiRUFcIixcclxuXHRcdHByaW9yaXR5Oi0xLFxyXG5cdFx0cmVxdWlyZTonP25nTW9kZWwnLFxyXG5cdFx0bGluazpmdW5jdGlvbigkc2NvcGUsICRlbGVtLCAkYXR0cnMsIG5nTW9kZWxDdHJsKXtcclxuXHRcdFx0aWYoIW5nTW9kZWxDdHJsKSByZXR1cm47XHJcblx0XHRcdGNvbnNvbGUubG9nKCdteUlucHV0UGFyc2UnKTtcclxuXHRcdFx0bmdNb2RlbEN0cmwuJHBhcnNlcnMucHVzaChmdW5jdGlvbih2YWx1ZSl7XHJcbi8vXHRcdFx0XHR2YXIgVkFMSURfUkVHRVhQID0gL15cXHcrJC8sXHJcblx0XHRcdFx0dmFyIFZBTElEX1JFR0VYUCA9IC9eXFxkK1xcLj9cXGR7MCwyfSQvLFxyXG5cdFx0XHQgXHRpc1ZhbGlkID0gVkFMSURfUkVHRVhQLnRlc3QodmFsdWUpLFxyXG5cdFx0XHQgICAgbGFzdFZhbCA9IHZhbHVlLnN1YnN0cmluZygwLHZhbHVlLmxlbmd0aC0xKTtcclxuXHRcdFx0ICAgIFxyXG5cdFx0XHRcdGlmKGlzVmFsaWQpe1xyXG5cdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xyXG5cdFx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdFx0bmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZShsYXN0VmFsKTtcclxuICAgICAgICAgICAgICAgICAgICBuZ01vZGVsQ3RybC4kcmVuZGVyKCk7XHJcblx0XHRcdFx0XHRyZXR1cm4gbGFzdFZhbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufSlcclxuLmRpcmVjdGl2ZSgnY29tcGFueUVtYWlsVmFsaWRhdG9yJyxmdW5jdGlvbigpe1xyXG4vKmNoYW5nZSBlbWFpbCB2YWxpZGF0b3IgcnVsZXM6VXAgdG8gMjU0IGNoYXJhY3RlciBiZWZvcmUgJ0AnKi9cclxuXHR2YXIgRU1BSUxfUkVHRVhQID0gL14oPz0uezEsMjU0fSQpKD89LnsxLDI1NH1AKVstISMkJSYnKisvMC05PT9BLVpeX2BhLXp7fH1+XSsoXFwuWy0hIyQlJicqKy8wLTk9P0EtWl5fYGEtent8fX5dKykqQFtBLVphLXowLTldKFtBLVphLXowLTktXXswLDYxfVtBLVphLXowLTldKT8oXFwuW0EtWmEtejAtOV0oW0EtWmEtejAtOS1dezAsNjF9W0EtWmEtejAtOV0pPykqJC87XHJcblx0cmV0dXJue1xyXG5cdFx0cmVzdHJpY3Q6XCJFQVwiLFxyXG5cdFx0cHJpb3JpdHk6LTEsXHJcblx0XHRyZXF1aXJlOic/bmdNb2RlbCcsXHJcblx0XHRsaW5rOmZ1bmN0aW9uKCRzY29wZSwkZWxlbSwkYXR0cnMsbmdNb2RlbEN0cmwpe1xyXG5cdFx0XHRpZihuZ01vZGVsQ3RybCAmJiBuZ01vZGVsQ3RybC4kdmFsaWRhdG9ycy5lbWFpbCl7XHJcblx0XHRcdFx0bmdNb2RlbEN0cmwuJHZhbGlkYXRvcnMuZW1haWwgPSBmdW5jdGlvbihtb2RlbFZhbHVlLCB2aWV3VmFsdWUpIHtcclxuXHRcdCAgICBcdFx0dmFyIHZhbHVlID0gbW9kZWxWYWx1ZSB8fCB2aWV3VmFsdWU7XHJcblx0XHQgICAgXHRcdHJldHVybiBuZ01vZGVsQ3RybC4kaXNFbXB0eSh2YWx1ZSkgfHwgRU1BSUxfUkVHRVhQLnRlc3QodmFsdWUpO1xyXG5cdFx0IFx0XHQgfTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufSlcclxuLmRpcmVjdGl2ZSgncmV0YWluRGVjaW1hbCcsZnVuY3Rpb24oKXtcclxuXHR2YXIgUk9VTkRVUF8wX1JFR0VYUCA9IC9eXFxkKyQvLFx0XHJcblx0XHRST1VORFVQXzFfUkVHRVhQID0gL15cXGQrKFxcLik/XFxkezAsMX0kLyxcclxuXHRcdFJPVU5EVVBfMl9SRUdFWFAgPSAvXlxcZCsoXFwuKT9cXGR7MCwyfSQvLFxyXG5cdFx0cmV0YWluQ29uZmlnID0ge1xyXG5cdFx0XHRyZXN0cmljdDpcIkFcIixcclxuXHRcdFx0cmVxdWlyZTonP25nTW9kZWwnLFxyXG5cdFx0XHRsaW5rOmZ1bmN0aW9uKCRzY29wZSwkZWxlbSwkYXR0cnMsbmdNb2RlbEN0cmwpe1xyXG5cdFx0XHRcdG5nTW9kZWxDdHJsLiRwYXJzZXJzLnB1c2goZnVuY3Rpb24odmFsdWUpe1xyXG5cdFx0XHRcdFx0dmFyIHJldGFpbkRlY2ltYWwgPSAkYXR0cnMucmV0YWluRGVjaW1hbCxcclxuXHRcdFx0XHRcdFx0bGFzdFZhbCA9IHZhbHVlLnN1YnN0cmluZygwLHZhbHVlLmxlbmd0aC0xKSxcclxuXHRcdFx0XHRcdFx0bGFzdENoYXIgPSB2YWx1ZS5jaGFyQXQodmFsdWUubGVuZ3RoLTEpLFxyXG5cdFx0XHRcdFx0XHRpc1ZhbGlkLHN0cjtcclxuXHRcdFx0XHRcdHN3aXRjaChyZXRhaW5EZWNpbWFsKXtcclxuXHRcdFx0XHRcdFx0Y2FzZSBcIjFcIjpcclxuXHRcdFx0XHRcdFx0XHRpc1ZhbGlkID0gUk9VTkRVUF8xX1JFR0VYUC50ZXN0KHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHRzdHIgPSAnLjAnO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwiMlwiOlxyXG5cdFx0XHRcdFx0XHRcdGlzVmFsaWQgPSBST1VORFVQXzJfUkVHRVhQLnRlc3QodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdHN0ciA9ICcuMDAnO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHRcdGlzVmFsaWQgPSBST1VORFVQXzBfUkVHRVhQLnRlc3QodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdHN0ciA9ICcnO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVx0XHRcdCAgICBcclxuXHRcdFx0XHRcdGlmKGlzVmFsaWQpe1xyXG5cdFx0XHRcdFx0XHRpZihsYXN0Q2hhciA9PSAnLicpe1xyXG5cdFx0XHRcdFx0XHRcdG5nTW9kZWxDdHJsLiRzZXRWaWV3VmFsdWUobGFzdFZhbCtzdHIpO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgXHRuZ01vZGVsQ3RybC4kcmVuZGVyKCk7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGxhc3RWYWwrc3RyO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcclxuXHRcdFx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdFx0XHRuZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKGxhc3RWYWwpO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgbmdNb2RlbEN0cmwuJHJlbmRlcigpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gbGFzdFZhbDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHRyZXR1cm4gcmV0YWluQ29uZmlnO1xyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAuY29tbW9uJylcclxuLmZhY3RvcnkoJ2h0dHBJbnRlcmNlcHRvcicsZnVuY3Rpb24oJHNjZSwkcm9vdFNjb3BlLCR0aW1lb3V0KXtcclxuXHR2YXIgc3RhcnRUaW1lLGVuZFRpbWU7XHJcblx0cmV0dXJue1xyXG5cdFx0J3JlcXVlc3QnOmZ1bmN0aW9uKHJlcSl7XHJcblx0XHRcdHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG5cdFx0XHQkcm9vdFNjb3BlLmxvYWRpbmcgPSB0cnVlO1xyXG5cdFx0XHRyZXR1cm4gcmVxO1xyXG5cdFx0fSxcclxuXHRcdCdyZXNwb25zZSc6ZnVuY3Rpb24ocmVzKXtcclxuXHRcdFx0ZW5kVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG5cdFx0XHQkcm9vdFNjb3BlLiRldmFsQXN5bmMoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR2YXIgbG9hZGluZ1RpbWUgPSBlbmRUaW1lLXN0YXJ0VGltZTtcclxuXHRcdFx0XHRpZihsb2FkaW5nVGltZSA+IDUwMCl7XHJcblx0XHRcdFx0XHQkcm9vdFNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHR9ZWxzZXtcclxuXHRcdFx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0XHRcdCRyb290U2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0fSw1MDApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdHJldHVybiByZXM7XHJcblx0XHR9XHJcblx0fVxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAuY29tbW9uJylcclxuLmZhY3RvcnkoJ3Rlc3RTZXJ2aWNlJyxmdW5jdGlvbigkaHR0cCwkcSl7XHJcblx0cmV0dXJue1xyXG5cdFx0Z2V0TWFpbjpmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCdtb2NrL3Rlc3ROZ1JvdXRlLW1haW4uanNvbicpO1xyXG5cdFx0fSxcclxuXHRcdGdldFVzZXI6ZnVuY3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnbW9jay90ZXN0TmdSb3V0ZS11c2VyLmpzb24nKTtcclxuXHRcdH0sXHJcblx0XHRnZXRSZXN0OmZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJy9yZXN0YXBpL2xvZ2luJyk7XHJcblx0XHR9XHJcblx0fVxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbicpXHJcbi5jb250cm9sbGVyKCdtYWluQ3RybCcsZnVuY3Rpb24oJHNjb3BlLCAkcm91dGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uLCBtYWluRGF0YSwgJHBhcnNlKXtcclxuXHQkc2NvcGUucGFnZU5hbWUgPSBtYWluRGF0YS5wYWdlTmFtZTtcclxuXHQkc2NvcGUubXlJbnB1dFZhbDEgPSBcIjExMVwiO1xyXG5cdCRzY29wZS5teUlucHV0VmFsMiA9IFwiXCI7XHJcblx0JHNjb3BlLm15SW5wdXRWYWwzID0gXCJcIjtcclxuXHQkc2NvcGUubXlJbnB1dFZhbDQgPSBcIlwiO1xyXG4vL1x0JHNjb3BlLmRhdGUgPSByZXN0RGF0YS5kYXRhLmRhdGU7XHJcbi8vXHRjb25zb2xlLmRlYnVnKHJlc3REYXRhKTtcclxuXHQkc2NvcGUudXBkYXRlVmFsID0gZnVuY3Rpb24oKXtcclxuXHRcdHZhciB0ZXh0ID0gXCInaXQgaXMgbXkgdGVzdCF0aGUgcmVzdWx0IGlzOicgKyBteUlucHV0VmFsMVwiO1xyXG5cdFx0dmFyIGlucHV0RnVjID0gJHBhcnNlKHRleHQpO1xyXG5cdFx0JHNjb3BlLm15SW5wdXRWYWxSZXMgPSBpbnB1dEZ1Yygkc2NvcGUpO1xyXG5cdH1cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ215QXBwLnVzZXInKVxyXG4uY29udHJvbGxlcigndXNlckN0cmwnLGZ1bmN0aW9uKCRzY29wZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgdXNlckRhdGEpe1xyXG5cdCRzY29wZS5wYWdlTmFtZSA9IHVzZXJEYXRhLnBhZ2VOYW1lO1xyXG5cdCRzY29wZS51c2VySWQgPSAkcm91dGVQYXJhbXMudXNlcklkO1xyXG5cdCRzY29wZS5mb28gPSBcInBsZWFzZSBpbnB1dCFcIjtcclxufSk7Il19
