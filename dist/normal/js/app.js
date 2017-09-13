angular.module('myApp',[
	'ngRoute',
	'angularTrix',
	'ui.tinymce',
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
	.when('/tinymice',{
		templateUrl:'template/tinymice.html',
		controller:'tinymiceCtrl',
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
angular.module('myApp.main',['myApp.main.tinymice']);
angular.module('myApp.main.tinymice',['myApp.common','ui.tinymce']);
angular.module('myApp.user',['myApp.common']);
/**
 * Binds a TinyMCE widget to <textarea> elements.
 */
angular.module('ui.tinymce', [])
  .value('uiTinymceConfig', {})
  .directive('uiTinymce', ['$rootScope', '$compile', '$timeout', '$window', '$sce', 'uiTinymceConfig', 'uiTinymceService', function($rootScope, $compile, $timeout, $window, $sce, uiTinymceConfig, uiTinymceService) {
    uiTinymceConfig = uiTinymceConfig || {};

    if (uiTinymceConfig.baseUrl) {
      tinymce.baseURL = uiTinymceConfig.baseUrl;
    }

    return {
      require: ['ngModel', '^?form'],
      priority: 599,
      link: function(scope, element, attrs, ctrls) {
        if (!$window.tinymce) {
          return;
        }

        var ngModel = ctrls[0],
          form = ctrls[1] || null;

        var expression, options = {
          debounce: true
        }, tinyInstance,
          updateView = function(editor) {
            var content = editor.getContent({format: options.format}).trim();
            content = $sce.trustAsHtml(content);

            ngModel.$setViewValue(content);
            if (!$rootScope.$$phase) {
              scope.$digest();
            }
          };

        function toggleDisable(disabled) {
          if (disabled) {
            ensureInstance();

            if (tinyInstance) {
              tinyInstance.getBody().setAttribute('contenteditable', false);
            }
          } else {
            ensureInstance();

            if (tinyInstance && !tinyInstance.settings.readonly && tinyInstance.getDoc()) {
              tinyInstance.getBody().setAttribute('contenteditable', true);
            }
          }
        }

        // fetch a unique ID from the service
        var uniqueId = uiTinymceService.getUniqueId();
        attrs.$set('id', uniqueId);

        expression = {};

        angular.extend(expression, scope.$eval(attrs.uiTinymce));

        //Debounce update and save action
        var debouncedUpdate = (function(debouncedUpdateDelay) {
          var debouncedUpdateTimer;
          return function(ed) {
	        $timeout.cancel(debouncedUpdateTimer);
	         debouncedUpdateTimer = $timeout(function() {
              return (function(ed) {
                if (ed.isDirty()) {
                  ed.save();
                  updateView(ed);
                }
              })(ed);
            }, debouncedUpdateDelay);
          };
        })(400);

        var setupOptions = {
          // Update model when calling setContent
          // (such as from the source editor popup)
          setup: function(ed) {
            ed.on('init', function() {
              ngModel.$render();
              ngModel.$setPristine();
                ngModel.$setUntouched();
              if (form) {
                form.$setPristine();
              }
            });

            // Update model when:
            // - a button has been clicked [ExecCommand]
            // - the editor content has been modified [change]
            // - the node has changed [NodeChange]
            // - an object has been resized (table, image) [ObjectResized]
            ed.on('ExecCommand change NodeChange ObjectResized', function() {
              if (!options.debounce) {
                ed.save();
                updateView(ed);
              	return;
              }
              debouncedUpdate(ed);
            });

            ed.on('blur', function() {
              element[0].blur();
              ngModel.$setTouched();
              if (!$rootScope.$$phase) {
                scope.$digest();
              }
            });

            ed.on('remove', function() {
              element.remove();
            });

            if (uiTinymceConfig.setup) {
              uiTinymceConfig.setup(ed, {
                updateView: updateView
              });
            }

            if (expression.setup) {
              expression.setup(ed, {
                updateView: updateView
              });
            }
          },
          format: expression.format || 'html',
          selector: '#' + attrs.id
        };
        // extend options with initial uiTinymceConfig and
        // options from directive attribute value
        angular.extend(options, uiTinymceConfig, expression, setupOptions);
        // Wrapped in $timeout due to $tinymce:refresh implementation, requires
        // element to be present in DOM before instantiating editor when
        // re-rendering directive
        $timeout(function() {
          if (options.baseURL){
            tinymce.baseURL = options.baseURL;
          }
          var maybeInitPromise = tinymce.init(options);
          if(maybeInitPromise && typeof maybeInitPromise.then === 'function') {
            maybeInitPromise.then(function() {
              toggleDisable(scope.$eval(attrs.ngDisabled));
            });
          } else {
            toggleDisable(scope.$eval(attrs.ngDisabled));
          }
        });

        ngModel.$formatters.unshift(function(modelValue) {
          return modelValue ? $sce.trustAsHtml(modelValue) : '';
        });

        ngModel.$parsers.unshift(function(viewValue) {
          return viewValue ? $sce.getTrustedHtml(viewValue) : '';
        });

        ngModel.$render = function() {
          ensureInstance();

          var viewValue = ngModel.$viewValue ?
            $sce.getTrustedHtml(ngModel.$viewValue) : '';

          // instance.getDoc() check is a guard against null value
          // when destruction & recreation of instances happen
          if (tinyInstance &&
            tinyInstance.getDoc()
          ) {
            tinyInstance.setContent(viewValue);
            // Triggering change event due to TinyMCE not firing event &
            // becoming out of sync for change callbacks
            tinyInstance.fire('change');
          }
        };

        attrs.$observe('disabled', toggleDisable);

        // This block is because of TinyMCE not playing well with removal and
        // recreation of instances, requiring instances to have different
        // selectors in order to render new instances properly
        var unbindEventListener = scope.$on('$tinymce:refresh', function(e, id) {
          var eid = attrs.id;
          if (angular.isUndefined(id) || id === eid) {
            var parentElement = element.parent();
            var clonedElement = element.clone();
            clonedElement.removeAttr('id');
            clonedElement.removeAttr('style');
            clonedElement.removeAttr('aria-hidden');
            tinymce.execCommand('mceRemoveEditor', false, eid);
            parentElement.append($compile(clonedElement)(scope));
            unbindEventListener();
          }
        });

        scope.$on('$destroy', function() {
          ensureInstance();

          if (tinyInstance) {
            tinyInstance.remove();
            tinyInstance = null;
          }
        });

        function ensureInstance() {
          if (!tinyInstance) {
            tinyInstance = tinymce.get(attrs.id);
          }
        }
      }
    };
  }])
  .service('uiTinymceService', [
    /**
     * A service is used to create unique ID's, this prevents duplicate ID's if there are multiple editors on screen.
     */
    function() {
      var UITinymceService = function() {
   	    var ID_ATTR = 'ui-tinymce';
    	// uniqueId keeps track of the latest assigned ID
    	var uniqueId = 0;
        // getUniqueId returns a unique ID
    	var getUniqueId = function() {
          uniqueId ++;
          return ID_ATTR + '-' + uniqueId;
        };
        // return the function as a public method of the service
        return {
        	getUniqueId: getUniqueId
        };
      };
      // return a new instance of the service
      return new UITinymceService();
    }
  ]);

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
angular.module('myApp.main.tinymice')
.controller('tinymiceCtrl',["$scope", "$route", "$routeParams", "$location", "$sce", function($scope, $route, $routeParams, $location, $sce){
   var ctrl = this;
	$scope.setting = {
		inline: false,
	  	plugins: "advlist autolink lists link image charmap print preview anchor",
   		readonly : $scope.operate === 'view' ? true : false,
	    skin: 'lightgray',
    	theme : 'modern',
    	min_height: 200,
    	max_height: 500
	};
    this.updateHtml = function() {
      ctrl.tinymceHtml = $sce.trustAsHtml(ctrl.tinymce);
    };
}]);
angular.module('myApp.user')
.controller('userCtrl',["$scope", "$route", "$routeParams", "$location", "userData", function($scope, $route, $routeParams, $location, userData){
	$scope.pageName = userData.pageName;
	$scope.userId = $routeParams.userId;
	$scope.foo = "please input!";
}]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsIm1vZHVsZS5qcyIsImRpcmVjdGl2ZS9hbmd1bGFyLXRpbnltY2UuanMiLCJkaXJlY3RpdmUvaW5wdXREaXJlLmpzIiwic2VydmljZS9pbnRlckNlcHRvclNlcnYuanMiLCJzZXJ2aWNlL3Rlc3RTZXJ2LmpzIiwiY29udHJvbGxlci9tYWluL21haW5DdHJsLmpzIiwiY29udHJvbGxlci9tYWluL3RpbnltaWNlQ3RybC5qcyIsImNvbnRyb2xsZXIvdXNlci91c2VyQ3RybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxRQUFRLE9BQU8sUUFBUTtDQUN0QjtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7R0FDRSxnRUFBTyxTQUFTLGdCQUFnQixtQkFBbUIsY0FBYzs7Q0FFbkUsR0FBRyxDQUFDLGNBQWMsU0FBUyxRQUFRLElBQUk7R0FDckMsY0FBYyxTQUFTLFFBQVEsTUFBTTs7OztDQUl2QyxjQUFjLFNBQVMsUUFBUSxPQUFPLHNCQUFzQjtDQUM1RCxjQUFjLFNBQVMsUUFBUSxJQUFJLG1CQUFtQjtDQUN0RCxjQUFjLFNBQVMsUUFBUSxJQUFJLFlBQVk7OztDQUcvQztFQUNDLEtBQUssSUFBSTtFQUNULFlBQVk7RUFDWixXQUFXO0VBQ1gsUUFBUTtHQUNQLHlCQUFTLFNBQVMsWUFBWTtJQUM3QixPQUFPLFlBQVksVUFBVSxLQUFLLFNBQVMsSUFBSTtLQUM5QyxPQUFPLElBQUk7T0FDVCxNQUFNLFNBQVMsSUFBSTtLQUNyQixPQUFPLElBQUk7Ozs7Ozs7Ozs7OztFQVlkLEtBQUssZ0JBQWdCO0VBQ3JCLFlBQVk7RUFDWixXQUFXO0VBQ1gsUUFBUTtHQUNQLHlCQUFTLFNBQVMsWUFBWTtJQUM3QixPQUFPLFlBQVksVUFBVSxLQUFLLFNBQVMsSUFBSTtLQUM5QyxPQUFPLElBQUk7Ozs7RUFJZCxlQUFlOztFQUVmLEtBQUssWUFBWTtFQUNqQixZQUFZO0VBQ1osV0FBVztFQUNYLGVBQWU7O0VBRWYsVUFBVTtFQUNWLFdBQVc7Ozs7Q0FJ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TTtJQUNYIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdteUFwcCcsW1xyXG5cdCduZ1JvdXRlJyxcclxuXHQnYW5ndWxhclRyaXgnLFxyXG5cdCd1aS50aW55bWNlJyxcclxuXHQnbXlBcHAuY29tbW9uJyxcclxuXHQnbXlBcHAubWFpbicsXHJcblx0J215QXBwLnVzZXInXHJcbl0pLmNvbmZpZyhmdW5jdGlvbigkcm91dGVQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsICRodHRwUHJvdmlkZXIpe1xyXG4gICAgLy9Jbml0aWFsaXplIEdldCBSZXF1ZXN0XHJcblx0aWYoISRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXQpe1xyXG5cdCAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldCA9IHt9O1xyXG5cdH1cclxuXHJcblx0Ly9EaXNhYmxlIElFIEFqYXggUmVxdWVzdCBDYWNoZVxyXG5cdCRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUmVxdWVzdGVkLVdpdGgnXSA9ICdYTUxIdHRwUmVxdWVzdCc7XHJcblx0JGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldFsnQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcclxuXHQkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0WydQcmFnbWEnXSA9ICduby1jYWNoZSc7XHJcblx0XHJcblx0Ly9yb3V0ZSBzZXR0aW5nXHJcblx0JHJvdXRlUHJvdmlkZXJcclxuXHQud2hlbignLycse1xyXG5cdFx0dGVtcGxhdGVVcmw6J3RlbXBsYXRlL3Rlc3ROZ1JvdXRlLW1haW4uaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOidtYWluQ3RybCcsXHJcblx0XHRyZXNvbHZlOntcclxuXHRcdFx0bWFpbkRhdGE6ZnVuY3Rpb24odGVzdFNlcnZpY2Upe1xyXG5cdFx0XHRcdHJldHVybiB0ZXN0U2VydmljZS5nZXRNYWluKCkudGhlbihmdW5jdGlvbihyZXMpe1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xyXG5cdFx0XHRcdH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XHJcblx0XHRcdFx0XHRyZXR1cm4gZXJyLmRhdGE7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuLy9cdFx0XHRyZXN0RGF0YTpmdW5jdGlvbih0ZXN0U2VydmljZSl7XHJcbi8vXHRcdFx0XHRyZXR1cm4gdGVzdFNlcnZpY2UuZ2V0UmVzdCgpLnRoZW4oZnVuY3Rpb24ocmVzKXtcclxuLy9cdFx0XHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xyXG4vL1x0XHRcdFx0fSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcclxuLy9cdFx0XHRcdFx0cmV0dXJuIGVyci5kYXRhO1xyXG4vL1x0XHRcdFx0fSk7XHJcbi8vXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pXHJcblx0LndoZW4oJy91c2VyLzp1c2VySWQnLHtcclxuXHRcdHRlbXBsYXRlVXJsOid0ZW1wbGF0ZS90ZXN0TmdSb3V0ZS11c2VyLmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjondXNlckN0cmwnLFxyXG5cdFx0cmVzb2x2ZTp7XHJcblx0XHRcdHVzZXJEYXRhOmZ1bmN0aW9uKHRlc3RTZXJ2aWNlKXtcclxuXHRcdFx0XHRyZXR1cm4gdGVzdFNlcnZpY2UuZ2V0VXNlcigpLnRoZW4oZnVuY3Rpb24ocmVzKXtcclxuXHRcdFx0XHRcdHJldHVybiByZXMuZGF0YTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdHJlbG9hZE9uU2VhcmNoOmZhbHNlXHJcblx0fSlcclxuXHQud2hlbignL3RpbnltaWNlJyx7XHJcblx0XHR0ZW1wbGF0ZVVybDondGVtcGxhdGUvdGlueW1pY2UuaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOid0aW55bWljZUN0cmwnLFxyXG5cdFx0cmVsb2FkT25TZWFyY2g6ZmFsc2VcclxuXHR9KVxyXG5cdC5vdGhlcndpc2Uoe1xyXG5cdFx0cmVkaXJlY3RUbzonLydcclxuXHR9KTtcclxuXHRcclxuXHQvL2h0bWw1IG1vZGUgc2V0dGluZ1xyXG5cdCRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZShmYWxzZSk7XHJcblx0JGxvY2F0aW9uUHJvdmlkZXIuaGFzaFByZWZpeCgnJyk7XHJcblxyXG5cdC8vSW50ZXJjZXB0b3JcclxuXHQkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdodHRwSW50ZXJjZXB0b3InKTtcclxuXHRjb25zb2xlLmxvZygndGhlIGFuZ3VsYXIgYXBwIGlzIHN0YXJ0IScpO1xyXG59KVxyXG4ucnVuKGZ1bmN0aW9uKCRyb290U2NvcGUsJHRlbXBsYXRlQ2FjaGUpe1xyXG5cdCRyb290U2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgJHJvb3RTY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQsIG5leHQsIGN1cnJlbnQpIHsgIFxyXG4gICAgICAgIGlmICh0eXBlb2YoY3VycmVudCkgIT09ICd1bmRlZmluZWQnKXsgIFxyXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5yZW1vdmUoY3VycmVudC50ZW1wbGF0ZVVybCk7ICBcclxuICAgICAgICB9ICBcclxuICAgIH0pO1xyXG4gICAgJHJvb3RTY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsZnVuY3Rpb24oZXZlbnQsIG5leHQsIGN1cnJlbnQpe1xyXG4gICAgXHRjb25zb2xlLmxvZyhldmVudCk7XHJcbiAgICBcdGNvbnNvbGUubG9nKG5leHQpO1xyXG4gICAgXHRjb25zb2xlLmxvZyhjdXJyZW50KTtcclxuICAgIH0pO1xyXG59KTtcclxuYW5ndWxhci5lbGVtZW50KGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpe1xyXG4gICBhbmd1bGFyLmJvb3RzdHJhcChkb2N1bWVudCxbJ215QXBwJ10pO1xyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ215QXBwLmNvbW1vbicsW10pO1xyXG5hbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbicsWydteUFwcC5tYWluLnRpbnltaWNlJ10pO1xyXG5hbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbi50aW55bWljZScsWydteUFwcC5jb21tb24nLCd1aS50aW55bWNlJ10pO1xyXG5hbmd1bGFyLm1vZHVsZSgnbXlBcHAudXNlcicsWydteUFwcC5jb21tb24nXSk7IiwiLyoqXG4gKiBCaW5kcyBhIFRpbnlNQ0Ugd2lkZ2V0IHRvIDx0ZXh0YXJlYT4gZWxlbWVudHMuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd1aS50aW55bWNlJywgW10pXG4gIC52YWx1ZSgndWlUaW55bWNlQ29uZmlnJywge30pXG4gIC5kaXJlY3RpdmUoJ3VpVGlueW1jZScsIFsnJHJvb3RTY29wZScsICckY29tcGlsZScsICckdGltZW91dCcsICckd2luZG93JywgJyRzY2UnLCAndWlUaW55bWNlQ29uZmlnJywgJ3VpVGlueW1jZVNlcnZpY2UnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkY29tcGlsZSwgJHRpbWVvdXQsICR3aW5kb3csICRzY2UsIHVpVGlueW1jZUNvbmZpZywgdWlUaW55bWNlU2VydmljZSkge1xuICAgIHVpVGlueW1jZUNvbmZpZyA9IHVpVGlueW1jZUNvbmZpZyB8fCB7fTtcblxuICAgIGlmICh1aVRpbnltY2VDb25maWcuYmFzZVVybCkge1xuICAgICAgdGlueW1jZS5iYXNlVVJMID0gdWlUaW55bWNlQ29uZmlnLmJhc2VVcmw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlcXVpcmU6IFsnbmdNb2RlbCcsICdeP2Zvcm0nXSxcbiAgICAgIHByaW9yaXR5OiA1OTksXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0cmxzKSB7XG4gICAgICAgIGlmICghJHdpbmRvdy50aW55bWNlKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5nTW9kZWwgPSBjdHJsc1swXSxcbiAgICAgICAgICBmb3JtID0gY3RybHNbMV0gfHwgbnVsbDtcblxuICAgICAgICB2YXIgZXhwcmVzc2lvbiwgb3B0aW9ucyA9IHtcbiAgICAgICAgICBkZWJvdW5jZTogdHJ1ZVxuICAgICAgICB9LCB0aW55SW5zdGFuY2UsXG4gICAgICAgICAgdXBkYXRlVmlldyA9IGZ1bmN0aW9uKGVkaXRvcikge1xuICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSBlZGl0b3IuZ2V0Q29udGVudCh7Zm9ybWF0OiBvcHRpb25zLmZvcm1hdH0pLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnRlbnQgPSAkc2NlLnRydXN0QXNIdG1sKGNvbnRlbnQpO1xuXG4gICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoY29udGVudCk7XG4gICAgICAgICAgICBpZiAoISRyb290U2NvcGUuJCRwaGFzZSkge1xuICAgICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiB0b2dnbGVEaXNhYmxlKGRpc2FibGVkKSB7XG4gICAgICAgICAgaWYgKGRpc2FibGVkKSB7XG4gICAgICAgICAgICBlbnN1cmVJbnN0YW5jZSgpO1xuXG4gICAgICAgICAgICBpZiAodGlueUluc3RhbmNlKSB7XG4gICAgICAgICAgICAgIHRpbnlJbnN0YW5jZS5nZXRCb2R5KCkuc2V0QXR0cmlidXRlKCdjb250ZW50ZWRpdGFibGUnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVuc3VyZUluc3RhbmNlKCk7XG5cbiAgICAgICAgICAgIGlmICh0aW55SW5zdGFuY2UgJiYgIXRpbnlJbnN0YW5jZS5zZXR0aW5ncy5yZWFkb25seSAmJiB0aW55SW5zdGFuY2UuZ2V0RG9jKCkpIHtcbiAgICAgICAgICAgICAgdGlueUluc3RhbmNlLmdldEJvZHkoKS5zZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZldGNoIGEgdW5pcXVlIElEIGZyb20gdGhlIHNlcnZpY2VcbiAgICAgICAgdmFyIHVuaXF1ZUlkID0gdWlUaW55bWNlU2VydmljZS5nZXRVbmlxdWVJZCgpO1xuICAgICAgICBhdHRycy4kc2V0KCdpZCcsIHVuaXF1ZUlkKTtcblxuICAgICAgICBleHByZXNzaW9uID0ge307XG5cbiAgICAgICAgYW5ndWxhci5leHRlbmQoZXhwcmVzc2lvbiwgc2NvcGUuJGV2YWwoYXR0cnMudWlUaW55bWNlKSk7XG5cbiAgICAgICAgLy9EZWJvdW5jZSB1cGRhdGUgYW5kIHNhdmUgYWN0aW9uXG4gICAgICAgIHZhciBkZWJvdW5jZWRVcGRhdGUgPSAoZnVuY3Rpb24oZGVib3VuY2VkVXBkYXRlRGVsYXkpIHtcbiAgICAgICAgICB2YXIgZGVib3VuY2VkVXBkYXRlVGltZXI7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVkKSB7XG5cdCAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGRlYm91bmNlZFVwZGF0ZVRpbWVyKTtcblx0ICAgICAgICAgZGVib3VuY2VkVXBkYXRlVGltZXIgPSAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIChmdW5jdGlvbihlZCkge1xuICAgICAgICAgICAgICAgIGlmIChlZC5pc0RpcnR5KCkpIHtcbiAgICAgICAgICAgICAgICAgIGVkLnNhdmUoKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVZpZXcoZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSkoZWQpO1xuICAgICAgICAgICAgfSwgZGVib3VuY2VkVXBkYXRlRGVsYXkpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0pKDQwMCk7XG5cbiAgICAgICAgdmFyIHNldHVwT3B0aW9ucyA9IHtcbiAgICAgICAgICAvLyBVcGRhdGUgbW9kZWwgd2hlbiBjYWxsaW5nIHNldENvbnRlbnRcbiAgICAgICAgICAvLyAoc3VjaCBhcyBmcm9tIHRoZSBzb3VyY2UgZWRpdG9yIHBvcHVwKVxuICAgICAgICAgIHNldHVwOiBmdW5jdGlvbihlZCkge1xuICAgICAgICAgICAgZWQub24oJ2luaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgbmdNb2RlbC4kcmVuZGVyKCk7XG4gICAgICAgICAgICAgIG5nTW9kZWwuJHNldFByaXN0aW5lKCk7XG4gICAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0VW50b3VjaGVkKCk7XG4gICAgICAgICAgICAgIGlmIChmb3JtKSB7XG4gICAgICAgICAgICAgICAgZm9ybS4kc2V0UHJpc3RpbmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBtb2RlbCB3aGVuOlxuICAgICAgICAgICAgLy8gLSBhIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkIFtFeGVjQ29tbWFuZF1cbiAgICAgICAgICAgIC8vIC0gdGhlIGVkaXRvciBjb250ZW50IGhhcyBiZWVuIG1vZGlmaWVkIFtjaGFuZ2VdXG4gICAgICAgICAgICAvLyAtIHRoZSBub2RlIGhhcyBjaGFuZ2VkIFtOb2RlQ2hhbmdlXVxuICAgICAgICAgICAgLy8gLSBhbiBvYmplY3QgaGFzIGJlZW4gcmVzaXplZCAodGFibGUsIGltYWdlKSBbT2JqZWN0UmVzaXplZF1cbiAgICAgICAgICAgIGVkLm9uKCdFeGVjQ29tbWFuZCBjaGFuZ2UgTm9kZUNoYW5nZSBPYmplY3RSZXNpemVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGlmICghb3B0aW9ucy5kZWJvdW5jZSkge1xuICAgICAgICAgICAgICAgIGVkLnNhdmUoKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVWaWV3KGVkKTtcbiAgICAgICAgICAgICAgXHRyZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZGVib3VuY2VkVXBkYXRlKGVkKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBlZC5vbignYmx1cicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBlbGVtZW50WzBdLmJsdXIoKTtcbiAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0VG91Y2hlZCgpO1xuICAgICAgICAgICAgICBpZiAoISRyb290U2NvcGUuJCRwaGFzZSkge1xuICAgICAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGVkLm9uKCdyZW1vdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZWxlbWVudC5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAodWlUaW55bWNlQ29uZmlnLnNldHVwKSB7XG4gICAgICAgICAgICAgIHVpVGlueW1jZUNvbmZpZy5zZXR1cChlZCwge1xuICAgICAgICAgICAgICAgIHVwZGF0ZVZpZXc6IHVwZGF0ZVZpZXdcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChleHByZXNzaW9uLnNldHVwKSB7XG4gICAgICAgICAgICAgIGV4cHJlc3Npb24uc2V0dXAoZWQsIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVWaWV3OiB1cGRhdGVWaWV3XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgZm9ybWF0OiBleHByZXNzaW9uLmZvcm1hdCB8fCAnaHRtbCcsXG4gICAgICAgICAgc2VsZWN0b3I6ICcjJyArIGF0dHJzLmlkXG4gICAgICAgIH07XG4gICAgICAgIC8vIGV4dGVuZCBvcHRpb25zIHdpdGggaW5pdGlhbCB1aVRpbnltY2VDb25maWcgYW5kXG4gICAgICAgIC8vIG9wdGlvbnMgZnJvbSBkaXJlY3RpdmUgYXR0cmlidXRlIHZhbHVlXG4gICAgICAgIGFuZ3VsYXIuZXh0ZW5kKG9wdGlvbnMsIHVpVGlueW1jZUNvbmZpZywgZXhwcmVzc2lvbiwgc2V0dXBPcHRpb25zKTtcbiAgICAgICAgLy8gV3JhcHBlZCBpbiAkdGltZW91dCBkdWUgdG8gJHRpbnltY2U6cmVmcmVzaCBpbXBsZW1lbnRhdGlvbiwgcmVxdWlyZXNcbiAgICAgICAgLy8gZWxlbWVudCB0byBiZSBwcmVzZW50IGluIERPTSBiZWZvcmUgaW5zdGFudGlhdGluZyBlZGl0b3Igd2hlblxuICAgICAgICAvLyByZS1yZW5kZXJpbmcgZGlyZWN0aXZlXG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChvcHRpb25zLmJhc2VVUkwpe1xuICAgICAgICAgICAgdGlueW1jZS5iYXNlVVJMID0gb3B0aW9ucy5iYXNlVVJMO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbWF5YmVJbml0UHJvbWlzZSA9IHRpbnltY2UuaW5pdChvcHRpb25zKTtcbiAgICAgICAgICBpZihtYXliZUluaXRQcm9taXNlICYmIHR5cGVvZiBtYXliZUluaXRQcm9taXNlLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIG1heWJlSW5pdFByb21pc2UudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdG9nZ2xlRGlzYWJsZShzY29wZS4kZXZhbChhdHRycy5uZ0Rpc2FibGVkKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdG9nZ2xlRGlzYWJsZShzY29wZS4kZXZhbChhdHRycy5uZ0Rpc2FibGVkKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBuZ01vZGVsLiRmb3JtYXR0ZXJzLnVuc2hpZnQoZnVuY3Rpb24obW9kZWxWYWx1ZSkge1xuICAgICAgICAgIHJldHVybiBtb2RlbFZhbHVlID8gJHNjZS50cnVzdEFzSHRtbChtb2RlbFZhbHVlKSA6ICcnO1xuICAgICAgICB9KTtcblxuICAgICAgICBuZ01vZGVsLiRwYXJzZXJzLnVuc2hpZnQoZnVuY3Rpb24odmlld1ZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIHZpZXdWYWx1ZSA/ICRzY2UuZ2V0VHJ1c3RlZEh0bWwodmlld1ZhbHVlKSA6ICcnO1xuICAgICAgICB9KTtcblxuICAgICAgICBuZ01vZGVsLiRyZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlbnN1cmVJbnN0YW5jZSgpO1xuXG4gICAgICAgICAgdmFyIHZpZXdWYWx1ZSA9IG5nTW9kZWwuJHZpZXdWYWx1ZSA/XG4gICAgICAgICAgICAkc2NlLmdldFRydXN0ZWRIdG1sKG5nTW9kZWwuJHZpZXdWYWx1ZSkgOiAnJztcblxuICAgICAgICAgIC8vIGluc3RhbmNlLmdldERvYygpIGNoZWNrIGlzIGEgZ3VhcmQgYWdhaW5zdCBudWxsIHZhbHVlXG4gICAgICAgICAgLy8gd2hlbiBkZXN0cnVjdGlvbiAmIHJlY3JlYXRpb24gb2YgaW5zdGFuY2VzIGhhcHBlblxuICAgICAgICAgIGlmICh0aW55SW5zdGFuY2UgJiZcbiAgICAgICAgICAgIHRpbnlJbnN0YW5jZS5nZXREb2MoKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgdGlueUluc3RhbmNlLnNldENvbnRlbnQodmlld1ZhbHVlKTtcbiAgICAgICAgICAgIC8vIFRyaWdnZXJpbmcgY2hhbmdlIGV2ZW50IGR1ZSB0byBUaW55TUNFIG5vdCBmaXJpbmcgZXZlbnQgJlxuICAgICAgICAgICAgLy8gYmVjb21pbmcgb3V0IG9mIHN5bmMgZm9yIGNoYW5nZSBjYWxsYmFja3NcbiAgICAgICAgICAgIHRpbnlJbnN0YW5jZS5maXJlKCdjaGFuZ2UnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgYXR0cnMuJG9ic2VydmUoJ2Rpc2FibGVkJywgdG9nZ2xlRGlzYWJsZSk7XG5cbiAgICAgICAgLy8gVGhpcyBibG9jayBpcyBiZWNhdXNlIG9mIFRpbnlNQ0Ugbm90IHBsYXlpbmcgd2VsbCB3aXRoIHJlbW92YWwgYW5kXG4gICAgICAgIC8vIHJlY3JlYXRpb24gb2YgaW5zdGFuY2VzLCByZXF1aXJpbmcgaW5zdGFuY2VzIHRvIGhhdmUgZGlmZmVyZW50XG4gICAgICAgIC8vIHNlbGVjdG9ycyBpbiBvcmRlciB0byByZW5kZXIgbmV3IGluc3RhbmNlcyBwcm9wZXJseVxuICAgICAgICB2YXIgdW5iaW5kRXZlbnRMaXN0ZW5lciA9IHNjb3BlLiRvbignJHRpbnltY2U6cmVmcmVzaCcsIGZ1bmN0aW9uKGUsIGlkKSB7XG4gICAgICAgICAgdmFyIGVpZCA9IGF0dHJzLmlkO1xuICAgICAgICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKGlkKSB8fCBpZCA9PT0gZWlkKSB7XG4gICAgICAgICAgICB2YXIgcGFyZW50RWxlbWVudCA9IGVsZW1lbnQucGFyZW50KCk7XG4gICAgICAgICAgICB2YXIgY2xvbmVkRWxlbWVudCA9IGVsZW1lbnQuY2xvbmUoKTtcbiAgICAgICAgICAgIGNsb25lZEVsZW1lbnQucmVtb3ZlQXR0cignaWQnKTtcbiAgICAgICAgICAgIGNsb25lZEVsZW1lbnQucmVtb3ZlQXR0cignc3R5bGUnKTtcbiAgICAgICAgICAgIGNsb25lZEVsZW1lbnQucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4nKTtcbiAgICAgICAgICAgIHRpbnltY2UuZXhlY0NvbW1hbmQoJ21jZVJlbW92ZUVkaXRvcicsIGZhbHNlLCBlaWQpO1xuICAgICAgICAgICAgcGFyZW50RWxlbWVudC5hcHBlbmQoJGNvbXBpbGUoY2xvbmVkRWxlbWVudCkoc2NvcGUpKTtcbiAgICAgICAgICAgIHVuYmluZEV2ZW50TGlzdGVuZXIoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlbnN1cmVJbnN0YW5jZSgpO1xuXG4gICAgICAgICAgaWYgKHRpbnlJbnN0YW5jZSkge1xuICAgICAgICAgICAgdGlueUluc3RhbmNlLnJlbW92ZSgpO1xuICAgICAgICAgICAgdGlueUluc3RhbmNlID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGVuc3VyZUluc3RhbmNlKCkge1xuICAgICAgICAgIGlmICghdGlueUluc3RhbmNlKSB7XG4gICAgICAgICAgICB0aW55SW5zdGFuY2UgPSB0aW55bWNlLmdldChhdHRycy5pZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfV0pXG4gIC5zZXJ2aWNlKCd1aVRpbnltY2VTZXJ2aWNlJywgW1xuICAgIC8qKlxuICAgICAqIEEgc2VydmljZSBpcyB1c2VkIHRvIGNyZWF0ZSB1bmlxdWUgSUQncywgdGhpcyBwcmV2ZW50cyBkdXBsaWNhdGUgSUQncyBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgZWRpdG9ycyBvbiBzY3JlZW4uXG4gICAgICovXG4gICAgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgVUlUaW55bWNlU2VydmljZSA9IGZ1bmN0aW9uKCkge1xuICAgXHQgICAgdmFyIElEX0FUVFIgPSAndWktdGlueW1jZSc7XG4gICAgXHQvLyB1bmlxdWVJZCBrZWVwcyB0cmFjayBvZiB0aGUgbGF0ZXN0IGFzc2lnbmVkIElEXG4gICAgXHR2YXIgdW5pcXVlSWQgPSAwO1xuICAgICAgICAvLyBnZXRVbmlxdWVJZCByZXR1cm5zIGEgdW5pcXVlIElEXG4gICAgXHR2YXIgZ2V0VW5pcXVlSWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB1bmlxdWVJZCArKztcbiAgICAgICAgICByZXR1cm4gSURfQVRUUiArICctJyArIHVuaXF1ZUlkO1xuICAgICAgICB9O1xuICAgICAgICAvLyByZXR1cm4gdGhlIGZ1bmN0aW9uIGFzIGEgcHVibGljIG1ldGhvZCBvZiB0aGUgc2VydmljZVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICBcdGdldFVuaXF1ZUlkOiBnZXRVbmlxdWVJZFxuICAgICAgICB9O1xuICAgICAgfTtcbiAgICAgIC8vIHJldHVybiBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgc2VydmljZVxuICAgICAgcmV0dXJuIG5ldyBVSVRpbnltY2VTZXJ2aWNlKCk7XG4gICAgfVxuICBdKTtcbiIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5jb21tb24nKVxyXG4uZGlyZWN0aXZlKCdteUlucHV0UGFyc2UnLGZ1bmN0aW9uKCl7XHJcblx0cmV0dXJue1xyXG5cdFx0cmVzdHJpY3Q6XCJFQVwiLFxyXG5cdFx0cHJpb3JpdHk6LTEsXHJcblx0XHRyZXF1aXJlOic/bmdNb2RlbCcsXHJcblx0XHRsaW5rOmZ1bmN0aW9uKCRzY29wZSwgJGVsZW0sICRhdHRycywgbmdNb2RlbEN0cmwpe1xyXG5cdFx0XHRpZighbmdNb2RlbEN0cmwpIHJldHVybjtcclxuXHRcdFx0Y29uc29sZS5sb2coJ215SW5wdXRQYXJzZScpO1xyXG5cdFx0XHRuZ01vZGVsQ3RybC4kcGFyc2Vycy5wdXNoKGZ1bmN0aW9uKHZhbHVlKXtcclxuLy9cdFx0XHRcdHZhciBWQUxJRF9SRUdFWFAgPSAvXlxcdyskLyxcclxuXHRcdFx0XHR2YXIgVkFMSURfUkVHRVhQID0gL15cXGQrXFwuP1xcZHswLDJ9JC8sXHJcblx0XHRcdCBcdGlzVmFsaWQgPSBWQUxJRF9SRUdFWFAudGVzdCh2YWx1ZSksXHJcblx0XHRcdCAgICBsYXN0VmFsID0gdmFsdWUuc3Vic3RyaW5nKDAsdmFsdWUubGVuZ3RoLTEpO1xyXG5cdFx0XHQgICAgXHJcblx0XHRcdFx0aWYoaXNWYWxpZCl7XHJcblx0XHRcdFx0XHRyZXR1cm4gdmFsdWU7XHJcblx0XHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0XHRuZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKGxhc3RWYWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5nTW9kZWxDdHJsLiRyZW5kZXIoKTtcclxuXHRcdFx0XHRcdHJldHVybiBsYXN0VmFsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG59KVxyXG4uZGlyZWN0aXZlKCdjb21wYW55RW1haWxWYWxpZGF0b3InLGZ1bmN0aW9uKCl7XHJcbi8qY2hhbmdlIGVtYWlsIHZhbGlkYXRvciBydWxlczpVcCB0byAyNTQgY2hhcmFjdGVyIGJlZm9yZSAnQCcqL1xyXG5cdHZhciBFTUFJTF9SRUdFWFAgPSAvXig/PS57MSwyNTR9JCkoPz0uezEsMjU0fUApWy0hIyQlJicqKy8wLTk9P0EtWl5fYGEtent8fX5dKyhcXC5bLSEjJCUmJyorLzAtOT0/QS1aXl9gYS16e3x9fl0rKSpAW0EtWmEtejAtOV0oW0EtWmEtejAtOS1dezAsNjF9W0EtWmEtejAtOV0pPyhcXC5bQS1aYS16MC05XShbQS1aYS16MC05LV17MCw2MX1bQS1aYS16MC05XSk/KSokLztcclxuXHRyZXR1cm57XHJcblx0XHRyZXN0cmljdDpcIkVBXCIsXHJcblx0XHRwcmlvcml0eTotMSxcclxuXHRcdHJlcXVpcmU6Jz9uZ01vZGVsJyxcclxuXHRcdGxpbms6ZnVuY3Rpb24oJHNjb3BlLCRlbGVtLCRhdHRycyxuZ01vZGVsQ3RybCl7XHJcblx0XHRcdGlmKG5nTW9kZWxDdHJsICYmIG5nTW9kZWxDdHJsLiR2YWxpZGF0b3JzLmVtYWlsKXtcclxuXHRcdFx0XHRuZ01vZGVsQ3RybC4kdmFsaWRhdG9ycy5lbWFpbCA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xyXG5cdFx0ICAgIFx0XHR2YXIgdmFsdWUgPSBtb2RlbFZhbHVlIHx8IHZpZXdWYWx1ZTtcclxuXHRcdCAgICBcdFx0cmV0dXJuIG5nTW9kZWxDdHJsLiRpc0VtcHR5KHZhbHVlKSB8fCBFTUFJTF9SRUdFWFAudGVzdCh2YWx1ZSk7XHJcblx0XHQgXHRcdCB9O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59KVxyXG4uZGlyZWN0aXZlKCdyZXRhaW5EZWNpbWFsJyxmdW5jdGlvbigpe1xyXG5cdHZhciBST1VORFVQXzBfUkVHRVhQID0gL15cXGQrJC8sXHRcclxuXHRcdFJPVU5EVVBfMV9SRUdFWFAgPSAvXlxcZCsoXFwuKT9cXGR7MCwxfSQvLFxyXG5cdFx0Uk9VTkRVUF8yX1JFR0VYUCA9IC9eXFxkKyhcXC4pP1xcZHswLDJ9JC8sXHJcblx0XHRyZXRhaW5Db25maWcgPSB7XHJcblx0XHRcdHJlc3RyaWN0OlwiQVwiLFxyXG5cdFx0XHRyZXF1aXJlOic/bmdNb2RlbCcsXHJcblx0XHRcdGxpbms6ZnVuY3Rpb24oJHNjb3BlLCRlbGVtLCRhdHRycyxuZ01vZGVsQ3RybCl7XHJcblx0XHRcdFx0bmdNb2RlbEN0cmwuJHBhcnNlcnMucHVzaChmdW5jdGlvbih2YWx1ZSl7XHJcblx0XHRcdFx0XHR2YXIgcmV0YWluRGVjaW1hbCA9ICRhdHRycy5yZXRhaW5EZWNpbWFsLFxyXG5cdFx0XHRcdFx0XHRsYXN0VmFsID0gdmFsdWUuc3Vic3RyaW5nKDAsdmFsdWUubGVuZ3RoLTEpLFxyXG5cdFx0XHRcdFx0XHRsYXN0Q2hhciA9IHZhbHVlLmNoYXJBdCh2YWx1ZS5sZW5ndGgtMSksXHJcblx0XHRcdFx0XHRcdGlzVmFsaWQsc3RyO1xyXG5cdFx0XHRcdFx0c3dpdGNoKHJldGFpbkRlY2ltYWwpe1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwiMVwiOlxyXG5cdFx0XHRcdFx0XHRcdGlzVmFsaWQgPSBST1VORFVQXzFfUkVHRVhQLnRlc3QodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdHN0ciA9ICcuMCc7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCIyXCI6XHJcblx0XHRcdFx0XHRcdFx0aXNWYWxpZCA9IFJPVU5EVVBfMl9SRUdFWFAudGVzdCh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdFx0c3RyID0gJy4wMCc7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdFx0aXNWYWxpZCA9IFJPVU5EVVBfMF9SRUdFWFAudGVzdCh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdFx0c3RyID0gJyc7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHRcdFx0ICAgIFxyXG5cdFx0XHRcdFx0aWYoaXNWYWxpZCl7XHJcblx0XHRcdFx0XHRcdGlmKGxhc3RDaGFyID09ICcuJyl7XHJcblx0XHRcdFx0XHRcdFx0bmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZShsYXN0VmFsK3N0cik7XHJcblx0ICAgICAgICAgICAgICAgICAgICBcdG5nTW9kZWxDdHJsLiRyZW5kZXIoKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gbGFzdFZhbCtzdHI7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xyXG5cdFx0XHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0XHRcdG5nTW9kZWxDdHJsLiRzZXRWaWV3VmFsdWUobGFzdFZhbCk7XHJcblx0ICAgICAgICAgICAgICAgICAgICBuZ01vZGVsQ3RybC4kcmVuZGVyKCk7XHJcblx0XHRcdFx0XHRcdHJldHVybiBsYXN0VmFsO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdHJldHVybiByZXRhaW5Db25maWc7XHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5jb21tb24nKVxyXG4uZmFjdG9yeSgnaHR0cEludGVyY2VwdG9yJyxmdW5jdGlvbigkc2NlLCRyb290U2NvcGUsJHRpbWVvdXQpe1xyXG5cdHZhciBzdGFydFRpbWUsZW5kVGltZTtcclxuXHRyZXR1cm57XHJcblx0XHQncmVxdWVzdCc6ZnVuY3Rpb24ocmVxKXtcclxuXHRcdFx0c3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcblx0XHRcdCRyb290U2NvcGUubG9hZGluZyA9IHRydWU7XHJcblx0XHRcdHJldHVybiByZXE7XHJcblx0XHR9LFxyXG5cdFx0J3Jlc3BvbnNlJzpmdW5jdGlvbihyZXMpe1xyXG5cdFx0XHRlbmRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcblx0XHRcdCRyb290U2NvcGUuJGV2YWxBc3luYyhmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHZhciBsb2FkaW5nVGltZSA9IGVuZFRpbWUtc3RhcnRUaW1lO1xyXG5cdFx0XHRcdGlmKGxvYWRpbmdUaW1lID4gNTAwKXtcclxuXHRcdFx0XHRcdCRyb290U2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRcdFx0JHJvb3RTY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9LDUwMCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIHJlcztcclxuXHRcdH1cclxuXHR9XHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5jb21tb24nKVxyXG4uZmFjdG9yeSgndGVzdFNlcnZpY2UnLGZ1bmN0aW9uKCRodHRwLCRxKXtcclxuXHRyZXR1cm57XHJcblx0XHRnZXRNYWluOmZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJ21vY2svdGVzdE5nUm91dGUtbWFpbi5qc29uJyk7XHJcblx0XHR9LFxyXG5cdFx0Z2V0VXNlcjpmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCdtb2NrL3Rlc3ROZ1JvdXRlLXVzZXIuanNvbicpO1xyXG5cdFx0fSxcclxuXHRcdGdldFJlc3Q6ZnVuY3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnL3Jlc3RhcGkvbG9naW4nKTtcclxuXHRcdH1cclxuXHR9XHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5tYWluJylcclxuLmNvbnRyb2xsZXIoJ21haW5DdHJsJyxmdW5jdGlvbigkc2NvcGUsICRyb3V0ZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24sIG1haW5EYXRhLCAkcGFyc2Upe1xyXG5cdCRzY29wZS5wYWdlTmFtZSA9IG1haW5EYXRhLnBhZ2VOYW1lO1xyXG5cdCRzY29wZS5teUlucHV0VmFsMSA9IFwiMTExXCI7XHJcblx0JHNjb3BlLm15SW5wdXRWYWwyID0gXCJcIjtcclxuXHQkc2NvcGUubXlJbnB1dFZhbDMgPSBcIlwiO1xyXG5cdCRzY29wZS5teUlucHV0VmFsNCA9IFwiXCI7XHJcbi8vXHQkc2NvcGUuZGF0ZSA9IHJlc3REYXRhLmRhdGEuZGF0ZTtcclxuLy9cdGNvbnNvbGUuZGVidWcocmVzdERhdGEpO1xyXG5cdCRzY29wZS51cGRhdGVWYWwgPSBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIHRleHQgPSBcIidpdCBpcyBteSB0ZXN0IXRoZSByZXN1bHQgaXM6JyArIG15SW5wdXRWYWwxXCI7XHJcblx0XHR2YXIgaW5wdXRGdWMgPSAkcGFyc2UodGV4dCk7XHJcblx0XHQkc2NvcGUubXlJbnB1dFZhbFJlcyA9IGlucHV0RnVjKCRzY29wZSk7XHJcblx0fVxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbi50aW55bWljZScpXHJcbi5jb250cm9sbGVyKCd0aW55bWljZUN0cmwnLGZ1bmN0aW9uKCRzY29wZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHNjZSl7XHJcbiAgIHZhciBjdHJsID0gdGhpcztcclxuXHQkc2NvcGUuc2V0dGluZyA9IHtcclxuXHRcdGlubGluZTogZmFsc2UsXHJcblx0ICBcdHBsdWdpbnM6IFwiYWR2bGlzdCBhdXRvbGluayBsaXN0cyBsaW5rIGltYWdlIGNoYXJtYXAgcHJpbnQgcHJldmlldyBhbmNob3JcIixcclxuICAgXHRcdHJlYWRvbmx5IDogJHNjb3BlLm9wZXJhdGUgPT09ICd2aWV3JyA/IHRydWUgOiBmYWxzZSxcclxuXHQgICAgc2tpbjogJ2xpZ2h0Z3JheScsXHJcbiAgICBcdHRoZW1lIDogJ21vZGVybicsXHJcbiAgICBcdG1pbl9oZWlnaHQ6IDIwMCxcclxuICAgIFx0bWF4X2hlaWdodDogNTAwXHJcblx0fTtcclxuICAgIHRoaXMudXBkYXRlSHRtbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBjdHJsLnRpbnltY2VIdG1sID0gJHNjZS50cnVzdEFzSHRtbChjdHJsLnRpbnltY2UpO1xyXG4gICAgfTtcclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ215QXBwLnVzZXInKVxyXG4uY29udHJvbGxlcigndXNlckN0cmwnLGZ1bmN0aW9uKCRzY29wZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgdXNlckRhdGEpe1xyXG5cdCRzY29wZS5wYWdlTmFtZSA9IHVzZXJEYXRhLnBhZ2VOYW1lO1xyXG5cdCRzY29wZS51c2VySWQgPSAkcm91dGVQYXJhbXMudXNlcklkO1xyXG5cdCRzY29wZS5mb28gPSBcInBsZWFzZSBpbnB1dCFcIjtcclxufSk7Il19
