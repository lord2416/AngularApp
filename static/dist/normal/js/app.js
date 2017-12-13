angular.module('myApp',[
	'ngRoute',
	'angularTrix',
	'angularify.semantic.dropdown',
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
	.when('/dropdown',{
		templateUrl:'template/dropdown.html',
		controller:'TestDropDownCtrl',
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
angular.module('myApp.main',['myApp.main.tinymice','myApp.main.dropdown']);
angular.module('myApp.main.tinymice',['myApp.common','ui.tinymce']);
angular.module('myApp.main.dropdown',['myApp.common','angularify.semantic.dropdown']);
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
})
.directive('searchSelect',["$sce", function($sce){
	return{
		restrict:"EA",
		replace:true,
		transclude: true,
		require:'?ngModel',
		scope:{
			options:'=',
			name:'@'
		},
		template:	
			'<div class="ui fluid search selection dropdown upward">\
				<input type="hidden" name="{{name}}" ng-model="selectedValue">\
				<i class="dropdown icon"></i>\
				<div class="default text" ng-bind="selectedValue"></div>\
			  	<div class="menu transition hidden">\
			    	<div class="item" data-index="{{option.index}}" data-value="{{option.index}}" ng-repeat = "option in options" ng-bind="option.item"></div>\
			  	</div>\
			</div>',
		link:function($scope,$elem,$attrs,ngModel){
			$elem.dropdown({
				fullTextSearch:true,
				onChange: function(value, text, $selectedItem) {
					$scope.$apply(function(){
						ngModel.$setViewValue(value);
					});
			    }
			});
			ngModel.$render = function(){
				console.log('it is $render');
				$elem.dropdown('set selected',"3");
			};
//			$elem.dropdown('set selected',"3");
			$attrs.$observe('ngModel',function(val){
				console.log(val);
			});
		}
	}
}]);
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
			// return $http.get('mock/testNgRoute-user.json');
            return $http.get('/api/user/1');
		},
		getRest:function(){
			return $http.get('/restapi/login');
		}
	}
}]);
angular.module('myApp.main.dropdown')
.controller('TestDropDownCtrl',["$scope", "$route", "$routeParams", "$location", "$sce", function($scope, $route, $routeParams, $location, $sce){
    $scope.dropdown_model = 'item3';

    $scope.dropdown_repeat_model = 'item1';
    $scope.dropdown_items = [
      'item1',
      'item2',
      'item3',
      'item4'
    ];

    $scope.dropdown_key_value_model = '';
    $scope.dropdown_key_value_items = {
      'item1': 'Cool item 1',
      'item2': 'Cool item 2',
      'item3': 'Cool item 3',
      'item4': 'Cool item 4'
    };
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
}]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsIm1vZHVsZS5qcyIsImRpcmVjdGl2ZS9hbmd1bGFyLXRpbnltY2UuanMiLCJkaXJlY3RpdmUvaW5wdXREaXJlLmpzIiwic2VydmljZS9pbnRlckNlcHRvclNlcnYuanMiLCJzZXJ2aWNlL3Rlc3RTZXJ2LmpzIiwiY29udHJvbGxlci9tYWluL2Ryb3Bkb3duQ3RybC5qcyIsImNvbnRyb2xsZXIvbWFpbi9tYWluQ3RybC5qcyIsImNvbnRyb2xsZXIvbWFpbi90aW55bWljZUN0cmwuanMiLCJjb250cm9sbGVyL3VzZXIvdXNlckN0cmwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsUUFBUSxPQUFPLFFBQVE7Q0FDdEI7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7R0FDRSxnRUFBTyxTQUFTLGdCQUFnQixtQkFBbUIsY0FBYzs7Q0FFbkUsR0FBRyxDQUFDLGNBQWMsU0FBUyxRQUFRLElBQUk7R0FDckMsY0FBYyxTQUFTLFFBQVEsTUFBTTs7OztDQUl2QyxjQUFjLFNBQVMsUUFBUSxPQUFPLHNCQUFzQjtDQUM1RCxjQUFjLFNBQVMsUUFBUSxJQUFJLG1CQUFtQjtDQUN0RCxjQUFjLFNBQVMsUUFBUSxJQUFJLFlBQVk7OztDQUcvQztFQUNDLEtBQUssSUFBSTtFQUNULFlBQVk7RUFDWixXQUFXO0VBQ1gsUUFBUTtHQUNQLHlCQUFTLFNBQVMsWUFBWTtJQUM3QixPQUFPLFlBQVksVUFBVSxLQUFLLFNBQVMsSUFBSTtLQUM5QyxPQUFPLElBQUk7T0FDVCxNQUFNLFNBQVMsSUFBSTtLQUNyQixPQUFPLElBQUk7Ozs7Ozs7Ozs7OztFQVlkLEtBQUssZ0JBQWdCO0VBQ3JCLFlBQVk7RUFDWixXQUFXO0VBQ1gsUUFBUTtHQUNQLHlCQUFTLFNBQVMsWUFBWTtJQUM3QixPQUFPLFlBQVksVUFBVSxLQUFLLFNBQVMsSUFBSTtLQUM5QyxPQUFPLElBQUk7Ozs7RUFJZCxlQUFlOztFQUVmLEtBQUssWUFBWTtFQUNqQixZQUFZO0VBQ1osV0FB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W1xuXHQnbmdSb3V0ZScsXG5cdCdhbmd1bGFyVHJpeCcsXG5cdCdhbmd1bGFyaWZ5LnNlbWFudGljLmRyb3Bkb3duJyxcblx0J3VpLnRpbnltY2UnLFxuXHQnbXlBcHAuY29tbW9uJyxcblx0J215QXBwLm1haW4nLFxuXHQnbXlBcHAudXNlcidcbl0pLmNvbmZpZyhmdW5jdGlvbigkcm91dGVQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsICRodHRwUHJvdmlkZXIpe1xuICAgIC8vSW5pdGlhbGl6ZSBHZXQgUmVxdWVzdFxuXHRpZighJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldCl7XG5cdCAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldCA9IHt9O1xuXHR9XG5cblx0Ly9EaXNhYmxlIElFIEFqYXggUmVxdWVzdCBDYWNoZVxuXHQkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xuXHQkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0WydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuXHQkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0WydQcmFnbWEnXSA9ICduby1jYWNoZSc7XG5cdFxuXHQvL3JvdXRlIHNldHRpbmdcblx0JHJvdXRlUHJvdmlkZXJcblx0LndoZW4oJy8nLHtcblx0XHR0ZW1wbGF0ZVVybDondGVtcGxhdGUvdGVzdE5nUm91dGUtbWFpbi5odG1sJyxcblx0XHRjb250cm9sbGVyOidtYWluQ3RybCcsXG5cdFx0cmVzb2x2ZTp7XG5cdFx0XHRtYWluRGF0YTpmdW5jdGlvbih0ZXN0U2VydmljZSl7XG5cdFx0XHRcdHJldHVybiB0ZXN0U2VydmljZS5nZXRNYWluKCkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRcdHJldHVybiByZXMuZGF0YTtcblx0XHRcdFx0fSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0XHRyZXR1cm4gZXJyLmRhdGE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuLy9cdFx0XHRyZXN0RGF0YTpmdW5jdGlvbih0ZXN0U2VydmljZSl7XG4vL1x0XHRcdFx0cmV0dXJuIHRlc3RTZXJ2aWNlLmdldFJlc3QoKS50aGVuKGZ1bmN0aW9uKHJlcyl7XG4vL1x0XHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XG4vL1x0XHRcdFx0fSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbi8vXHRcdFx0XHRcdHJldHVybiBlcnIuZGF0YTtcbi8vXHRcdFx0XHR9KTtcbi8vXHRcdFx0fVxuXHRcdH1cblx0fSlcblx0LndoZW4oJy91c2VyLzp1c2VySWQnLHtcblx0XHR0ZW1wbGF0ZVVybDondGVtcGxhdGUvdGVzdE5nUm91dGUtdXNlci5odG1sJyxcblx0XHRjb250cm9sbGVyOid1c2VyQ3RybCcsXG5cdFx0cmVzb2x2ZTp7XG5cdFx0XHR1c2VyRGF0YTpmdW5jdGlvbih0ZXN0U2VydmljZSl7XG5cdFx0XHRcdHJldHVybiB0ZXN0U2VydmljZS5nZXRVc2VyKCkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRcdHJldHVybiByZXMuZGF0YTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRyZWxvYWRPblNlYXJjaDpmYWxzZVxuXHR9KVxuXHQud2hlbignL3RpbnltaWNlJyx7XG5cdFx0dGVtcGxhdGVVcmw6J3RlbXBsYXRlL3RpbnltaWNlLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6J3RpbnltaWNlQ3RybCcsXG5cdFx0cmVsb2FkT25TZWFyY2g6ZmFsc2Vcblx0fSlcblx0LndoZW4oJy9kcm9wZG93bicse1xuXHRcdHRlbXBsYXRlVXJsOid0ZW1wbGF0ZS9kcm9wZG93bi5odG1sJyxcblx0XHRjb250cm9sbGVyOidUZXN0RHJvcERvd25DdHJsJyxcblx0XHRyZWxvYWRPblNlYXJjaDpmYWxzZVxuXHR9KVxuXHQub3RoZXJ3aXNlKHtcblx0XHRyZWRpcmVjdFRvOicvJ1xuXHR9KTtcblx0XG5cdC8vaHRtbDUgbW9kZSBzZXR0aW5nXG5cdCRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZShmYWxzZSk7XG5cdCRsb2NhdGlvblByb3ZpZGVyLmhhc2hQcmVmaXgoJycpO1xuXG5cdC8vSW50ZXJjZXB0b3Jcblx0JGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaCgnaHR0cEludGVyY2VwdG9yJyk7XG5cdGNvbnNvbGUubG9nKCd0aGUgYW5ndWxhciBhcHAgaXMgc3RhcnQhJyk7XG59KVxuLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCR0ZW1wbGF0ZUNhY2hlKXtcblx0JHJvb3RTY29wZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgJHJvb3RTY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQsIG5leHQsIGN1cnJlbnQpIHsgIFxuICAgICAgICBpZiAodHlwZW9mKGN1cnJlbnQpICE9PSAndW5kZWZpbmVkJyl7ICBcbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnJlbW92ZShjdXJyZW50LnRlbXBsYXRlVXJsKTsgIFxuICAgICAgICB9ICBcbiAgICB9KTtcbiAgICAkcm9vdFNjb3BlLiRvbignJHJvdXRlVXBkYXRlJyxmdW5jdGlvbihldmVudCwgbmV4dCwgY3VycmVudCl7XG4gICAgXHRjb25zb2xlLmxvZyhldmVudCk7XG4gICAgXHRjb25zb2xlLmxvZyhuZXh0KTtcbiAgICBcdGNvbnNvbGUubG9nKGN1cnJlbnQpO1xuICAgIH0pO1xufSk7XG5hbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCl7XG4gICBhbmd1bGFyLmJvb3RzdHJhcChkb2N1bWVudCxbJ215QXBwJ10pO1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAuY29tbW9uJyxbXSk7XG5hbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbicsWydteUFwcC5tYWluLnRpbnltaWNlJywnbXlBcHAubWFpbi5kcm9wZG93biddKTtcbmFuZ3VsYXIubW9kdWxlKCdteUFwcC5tYWluLnRpbnltaWNlJyxbJ215QXBwLmNvbW1vbicsJ3VpLnRpbnltY2UnXSk7XG5hbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbi5kcm9wZG93bicsWydteUFwcC5jb21tb24nLCdhbmd1bGFyaWZ5LnNlbWFudGljLmRyb3Bkb3duJ10pO1xuYW5ndWxhci5tb2R1bGUoJ215QXBwLnVzZXInLFsnbXlBcHAuY29tbW9uJ10pOyIsIi8qKlxuICogQmluZHMgYSBUaW55TUNFIHdpZGdldCB0byA8dGV4dGFyZWE+IGVsZW1lbnRzLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndWkudGlueW1jZScsIFtdKVxuICAudmFsdWUoJ3VpVGlueW1jZUNvbmZpZycsIHt9KVxuICAuZGlyZWN0aXZlKCd1aVRpbnltY2UnLCBbJyRyb290U2NvcGUnLCAnJGNvbXBpbGUnLCAnJHRpbWVvdXQnLCAnJHdpbmRvdycsICckc2NlJywgJ3VpVGlueW1jZUNvbmZpZycsICd1aVRpbnltY2VTZXJ2aWNlJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJGNvbXBpbGUsICR0aW1lb3V0LCAkd2luZG93LCAkc2NlLCB1aVRpbnltY2VDb25maWcsIHVpVGlueW1jZVNlcnZpY2UpIHtcbiAgICB1aVRpbnltY2VDb25maWcgPSB1aVRpbnltY2VDb25maWcgfHwge307XG5cbiAgICBpZiAodWlUaW55bWNlQ29uZmlnLmJhc2VVcmwpIHtcbiAgICAgIHRpbnltY2UuYmFzZVVSTCA9IHVpVGlueW1jZUNvbmZpZy5iYXNlVXJsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICByZXF1aXJlOiBbJ25nTW9kZWwnLCAnXj9mb3JtJ10sXG4gICAgICBwcmlvcml0eTogNTk5LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJscykge1xuICAgICAgICBpZiAoISR3aW5kb3cudGlueW1jZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuZ01vZGVsID0gY3RybHNbMF0sXG4gICAgICAgICAgZm9ybSA9IGN0cmxzWzFdIHx8IG51bGw7XG5cbiAgICAgICAgdmFyIGV4cHJlc3Npb24sIG9wdGlvbnMgPSB7XG4gICAgICAgICAgZGVib3VuY2U6IHRydWVcbiAgICAgICAgfSwgdGlueUluc3RhbmNlLFxuICAgICAgICAgIHVwZGF0ZVZpZXcgPSBmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50ID0gZWRpdG9yLmdldENvbnRlbnQoe2Zvcm1hdDogb3B0aW9ucy5mb3JtYXR9KS50cmltKCk7XG4gICAgICAgICAgICBjb250ZW50ID0gJHNjZS50cnVzdEFzSHRtbChjb250ZW50KTtcblxuICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKGNvbnRlbnQpO1xuICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLiQkcGhhc2UpIHtcbiAgICAgICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gdG9nZ2xlRGlzYWJsZShkaXNhYmxlZCkge1xuICAgICAgICAgIGlmIChkaXNhYmxlZCkge1xuICAgICAgICAgICAgZW5zdXJlSW5zdGFuY2UoKTtcblxuICAgICAgICAgICAgaWYgKHRpbnlJbnN0YW5jZSkge1xuICAgICAgICAgICAgICB0aW55SW5zdGFuY2UuZ2V0Qm9keSgpLnNldEF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbnN1cmVJbnN0YW5jZSgpO1xuXG4gICAgICAgICAgICBpZiAodGlueUluc3RhbmNlICYmICF0aW55SW5zdGFuY2Uuc2V0dGluZ3MucmVhZG9ubHkgJiYgdGlueUluc3RhbmNlLmdldERvYygpKSB7XG4gICAgICAgICAgICAgIHRpbnlJbnN0YW5jZS5nZXRCb2R5KCkuc2V0QXR0cmlidXRlKCdjb250ZW50ZWRpdGFibGUnLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmZXRjaCBhIHVuaXF1ZSBJRCBmcm9tIHRoZSBzZXJ2aWNlXG4gICAgICAgIHZhciB1bmlxdWVJZCA9IHVpVGlueW1jZVNlcnZpY2UuZ2V0VW5pcXVlSWQoKTtcbiAgICAgICAgYXR0cnMuJHNldCgnaWQnLCB1bmlxdWVJZCk7XG5cbiAgICAgICAgZXhwcmVzc2lvbiA9IHt9O1xuXG4gICAgICAgIGFuZ3VsYXIuZXh0ZW5kKGV4cHJlc3Npb24sIHNjb3BlLiRldmFsKGF0dHJzLnVpVGlueW1jZSkpO1xuXG4gICAgICAgIC8vRGVib3VuY2UgdXBkYXRlIGFuZCBzYXZlIGFjdGlvblxuICAgICAgICB2YXIgZGVib3VuY2VkVXBkYXRlID0gKGZ1bmN0aW9uKGRlYm91bmNlZFVwZGF0ZURlbGF5KSB7XG4gICAgICAgICAgdmFyIGRlYm91bmNlZFVwZGF0ZVRpbWVyO1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbihlZCkge1xuXHQgICAgICAgICR0aW1lb3V0LmNhbmNlbChkZWJvdW5jZWRVcGRhdGVUaW1lcik7XG5cdCAgICAgICAgIGRlYm91bmNlZFVwZGF0ZVRpbWVyID0gJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJldHVybiAoZnVuY3Rpb24oZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWQuaXNEaXJ0eSgpKSB7XG4gICAgICAgICAgICAgICAgICBlZC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgICB1cGRhdGVWaWV3KGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pKGVkKTtcbiAgICAgICAgICAgIH0sIGRlYm91bmNlZFVwZGF0ZURlbGF5KTtcbiAgICAgICAgICB9O1xuICAgICAgICB9KSg0MDApO1xuXG4gICAgICAgIHZhciBzZXR1cE9wdGlvbnMgPSB7XG4gICAgICAgICAgLy8gVXBkYXRlIG1vZGVsIHdoZW4gY2FsbGluZyBzZXRDb250ZW50XG4gICAgICAgICAgLy8gKHN1Y2ggYXMgZnJvbSB0aGUgc291cmNlIGVkaXRvciBwb3B1cClcbiAgICAgICAgICBzZXR1cDogZnVuY3Rpb24oZWQpIHtcbiAgICAgICAgICAgIGVkLm9uKCdpbml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIG5nTW9kZWwuJHJlbmRlcigpO1xuICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRQcmlzdGluZSgpO1xuICAgICAgICAgICAgICAgIG5nTW9kZWwuJHNldFVudG91Y2hlZCgpO1xuICAgICAgICAgICAgICBpZiAoZm9ybSkge1xuICAgICAgICAgICAgICAgIGZvcm0uJHNldFByaXN0aW5lKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbW9kZWwgd2hlbjpcbiAgICAgICAgICAgIC8vIC0gYSBidXR0b24gaGFzIGJlZW4gY2xpY2tlZCBbRXhlY0NvbW1hbmRdXG4gICAgICAgICAgICAvLyAtIHRoZSBlZGl0b3IgY29udGVudCBoYXMgYmVlbiBtb2RpZmllZCBbY2hhbmdlXVxuICAgICAgICAgICAgLy8gLSB0aGUgbm9kZSBoYXMgY2hhbmdlZCBbTm9kZUNoYW5nZV1cbiAgICAgICAgICAgIC8vIC0gYW4gb2JqZWN0IGhhcyBiZWVuIHJlc2l6ZWQgKHRhYmxlLCBpbWFnZSkgW09iamVjdFJlc2l6ZWRdXG4gICAgICAgICAgICBlZC5vbignRXhlY0NvbW1hbmQgY2hhbmdlIE5vZGVDaGFuZ2UgT2JqZWN0UmVzaXplZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMuZGVib3VuY2UpIHtcbiAgICAgICAgICAgICAgICBlZC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgdXBkYXRlVmlldyhlZCk7XG4gICAgICAgICAgICAgIFx0cmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGRlYm91bmNlZFVwZGF0ZShlZCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZWQub24oJ2JsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZWxlbWVudFswXS5ibHVyKCk7XG4gICAgICAgICAgICAgIG5nTW9kZWwuJHNldFRvdWNoZWQoKTtcbiAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLiQkcGhhc2UpIHtcbiAgICAgICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBlZC5vbigncmVtb3ZlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHVpVGlueW1jZUNvbmZpZy5zZXR1cCkge1xuICAgICAgICAgICAgICB1aVRpbnltY2VDb25maWcuc2V0dXAoZWQsIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVWaWV3OiB1cGRhdGVWaWV3XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZXhwcmVzc2lvbi5zZXR1cCkge1xuICAgICAgICAgICAgICBleHByZXNzaW9uLnNldHVwKGVkLCB7XG4gICAgICAgICAgICAgICAgdXBkYXRlVmlldzogdXBkYXRlVmlld1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGZvcm1hdDogZXhwcmVzc2lvbi5mb3JtYXQgfHwgJ2h0bWwnLFxuICAgICAgICAgIHNlbGVjdG9yOiAnIycgKyBhdHRycy5pZFxuICAgICAgICB9O1xuICAgICAgICAvLyBleHRlbmQgb3B0aW9ucyB3aXRoIGluaXRpYWwgdWlUaW55bWNlQ29uZmlnIGFuZFxuICAgICAgICAvLyBvcHRpb25zIGZyb20gZGlyZWN0aXZlIGF0dHJpYnV0ZSB2YWx1ZVxuICAgICAgICBhbmd1bGFyLmV4dGVuZChvcHRpb25zLCB1aVRpbnltY2VDb25maWcsIGV4cHJlc3Npb24sIHNldHVwT3B0aW9ucyk7XG4gICAgICAgIC8vIFdyYXBwZWQgaW4gJHRpbWVvdXQgZHVlIHRvICR0aW55bWNlOnJlZnJlc2ggaW1wbGVtZW50YXRpb24sIHJlcXVpcmVzXG4gICAgICAgIC8vIGVsZW1lbnQgdG8gYmUgcHJlc2VudCBpbiBET00gYmVmb3JlIGluc3RhbnRpYXRpbmcgZWRpdG9yIHdoZW5cbiAgICAgICAgLy8gcmUtcmVuZGVyaW5nIGRpcmVjdGl2ZVxuICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAob3B0aW9ucy5iYXNlVVJMKXtcbiAgICAgICAgICAgIHRpbnltY2UuYmFzZVVSTCA9IG9wdGlvbnMuYmFzZVVSTDtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG1heWJlSW5pdFByb21pc2UgPSB0aW55bWNlLmluaXQob3B0aW9ucyk7XG4gICAgICAgICAgaWYobWF5YmVJbml0UHJvbWlzZSAmJiB0eXBlb2YgbWF5YmVJbml0UHJvbWlzZS50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBtYXliZUluaXRQcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHRvZ2dsZURpc2FibGUoc2NvcGUuJGV2YWwoYXR0cnMubmdEaXNhYmxlZCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRvZ2dsZURpc2FibGUoc2NvcGUuJGV2YWwoYXR0cnMubmdEaXNhYmxlZCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmdNb2RlbC4kZm9ybWF0dGVycy51bnNoaWZ0KGZ1bmN0aW9uKG1vZGVsVmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gbW9kZWxWYWx1ZSA/ICRzY2UudHJ1c3RBc0h0bWwobW9kZWxWYWx1ZSkgOiAnJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmdNb2RlbC4kcGFyc2Vycy51bnNoaWZ0KGZ1bmN0aW9uKHZpZXdWYWx1ZSkge1xuICAgICAgICAgIHJldHVybiB2aWV3VmFsdWUgPyAkc2NlLmdldFRydXN0ZWRIdG1sKHZpZXdWYWx1ZSkgOiAnJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmdNb2RlbC4kcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZW5zdXJlSW5zdGFuY2UoKTtcblxuICAgICAgICAgIHZhciB2aWV3VmFsdWUgPSBuZ01vZGVsLiR2aWV3VmFsdWUgP1xuICAgICAgICAgICAgJHNjZS5nZXRUcnVzdGVkSHRtbChuZ01vZGVsLiR2aWV3VmFsdWUpIDogJyc7XG5cbiAgICAgICAgICAvLyBpbnN0YW5jZS5nZXREb2MoKSBjaGVjayBpcyBhIGd1YXJkIGFnYWluc3QgbnVsbCB2YWx1ZVxuICAgICAgICAgIC8vIHdoZW4gZGVzdHJ1Y3Rpb24gJiByZWNyZWF0aW9uIG9mIGluc3RhbmNlcyBoYXBwZW5cbiAgICAgICAgICBpZiAodGlueUluc3RhbmNlICYmXG4gICAgICAgICAgICB0aW55SW5zdGFuY2UuZ2V0RG9jKClcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHRpbnlJbnN0YW5jZS5zZXRDb250ZW50KHZpZXdWYWx1ZSk7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyaW5nIGNoYW5nZSBldmVudCBkdWUgdG8gVGlueU1DRSBub3QgZmlyaW5nIGV2ZW50ICZcbiAgICAgICAgICAgIC8vIGJlY29taW5nIG91dCBvZiBzeW5jIGZvciBjaGFuZ2UgY2FsbGJhY2tzXG4gICAgICAgICAgICB0aW55SW5zdGFuY2UuZmlyZSgnY2hhbmdlJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGF0dHJzLiRvYnNlcnZlKCdkaXNhYmxlZCcsIHRvZ2dsZURpc2FibGUpO1xuXG4gICAgICAgIC8vIFRoaXMgYmxvY2sgaXMgYmVjYXVzZSBvZiBUaW55TUNFIG5vdCBwbGF5aW5nIHdlbGwgd2l0aCByZW1vdmFsIGFuZFxuICAgICAgICAvLyByZWNyZWF0aW9uIG9mIGluc3RhbmNlcywgcmVxdWlyaW5nIGluc3RhbmNlcyB0byBoYXZlIGRpZmZlcmVudFxuICAgICAgICAvLyBzZWxlY3RvcnMgaW4gb3JkZXIgdG8gcmVuZGVyIG5ldyBpbnN0YW5jZXMgcHJvcGVybHlcbiAgICAgICAgdmFyIHVuYmluZEV2ZW50TGlzdGVuZXIgPSBzY29wZS4kb24oJyR0aW55bWNlOnJlZnJlc2gnLCBmdW5jdGlvbihlLCBpZCkge1xuICAgICAgICAgIHZhciBlaWQgPSBhdHRycy5pZDtcbiAgICAgICAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChpZCkgfHwgaWQgPT09IGVpZCkge1xuICAgICAgICAgICAgdmFyIHBhcmVudEVsZW1lbnQgPSBlbGVtZW50LnBhcmVudCgpO1xuICAgICAgICAgICAgdmFyIGNsb25lZEVsZW1lbnQgPSBlbGVtZW50LmNsb25lKCk7XG4gICAgICAgICAgICBjbG9uZWRFbGVtZW50LnJlbW92ZUF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBjbG9uZWRFbGVtZW50LnJlbW92ZUF0dHIoJ3N0eWxlJyk7XG4gICAgICAgICAgICBjbG9uZWRFbGVtZW50LnJlbW92ZUF0dHIoJ2FyaWEtaGlkZGVuJyk7XG4gICAgICAgICAgICB0aW55bWNlLmV4ZWNDb21tYW5kKCdtY2VSZW1vdmVFZGl0b3InLCBmYWxzZSwgZWlkKTtcbiAgICAgICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kKCRjb21waWxlKGNsb25lZEVsZW1lbnQpKHNjb3BlKSk7XG4gICAgICAgICAgICB1bmJpbmRFdmVudExpc3RlbmVyKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZW5zdXJlSW5zdGFuY2UoKTtcblxuICAgICAgICAgIGlmICh0aW55SW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRpbnlJbnN0YW5jZS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRpbnlJbnN0YW5jZSA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiBlbnN1cmVJbnN0YW5jZSgpIHtcbiAgICAgICAgICBpZiAoIXRpbnlJbnN0YW5jZSkge1xuICAgICAgICAgICAgdGlueUluc3RhbmNlID0gdGlueW1jZS5nZXQoYXR0cnMuaWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1dKVxuICAuc2VydmljZSgndWlUaW55bWNlU2VydmljZScsIFtcbiAgICAvKipcbiAgICAgKiBBIHNlcnZpY2UgaXMgdXNlZCB0byBjcmVhdGUgdW5pcXVlIElEJ3MsIHRoaXMgcHJldmVudHMgZHVwbGljYXRlIElEJ3MgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGVkaXRvcnMgb24gc2NyZWVuLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIFVJVGlueW1jZVNlcnZpY2UgPSBmdW5jdGlvbigpIHtcbiAgIFx0ICAgIHZhciBJRF9BVFRSID0gJ3VpLXRpbnltY2UnO1xuICAgIFx0Ly8gdW5pcXVlSWQga2VlcHMgdHJhY2sgb2YgdGhlIGxhdGVzdCBhc3NpZ25lZCBJRFxuICAgIFx0dmFyIHVuaXF1ZUlkID0gMDtcbiAgICAgICAgLy8gZ2V0VW5pcXVlSWQgcmV0dXJucyBhIHVuaXF1ZSBJRFxuICAgIFx0dmFyIGdldFVuaXF1ZUlkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdW5pcXVlSWQgKys7XG4gICAgICAgICAgcmV0dXJuIElEX0FUVFIgKyAnLScgKyB1bmlxdWVJZDtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gcmV0dXJuIHRoZSBmdW5jdGlvbiBhcyBhIHB1YmxpYyBtZXRob2Qgb2YgdGhlIHNlcnZpY2VcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgXHRnZXRVbmlxdWVJZDogZ2V0VW5pcXVlSWRcbiAgICAgICAgfTtcbiAgICAgIH07XG4gICAgICAvLyByZXR1cm4gYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIHNlcnZpY2VcbiAgICAgIHJldHVybiBuZXcgVUlUaW55bWNlU2VydmljZSgpO1xuICAgIH1cbiAgXSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAuY29tbW9uJylcbi5kaXJlY3RpdmUoJ215SW5wdXRQYXJzZScsZnVuY3Rpb24oKXtcblx0cmV0dXJue1xuXHRcdHJlc3RyaWN0OlwiRUFcIixcblx0XHRwcmlvcml0eTotMSxcblx0XHRyZXF1aXJlOic/bmdNb2RlbCcsXG5cdFx0bGluazpmdW5jdGlvbigkc2NvcGUsICRlbGVtLCAkYXR0cnMsIG5nTW9kZWxDdHJsKXtcblx0XHRcdGlmKCFuZ01vZGVsQ3RybCkgcmV0dXJuO1xuXHRcdFx0Y29uc29sZS5sb2coJ215SW5wdXRQYXJzZScpO1xuXHRcdFx0bmdNb2RlbEN0cmwuJHBhcnNlcnMucHVzaChmdW5jdGlvbih2YWx1ZSl7XG4vL1x0XHRcdFx0dmFyIFZBTElEX1JFR0VYUCA9IC9eXFx3KyQvLFxuXHRcdFx0XHR2YXIgVkFMSURfUkVHRVhQID0gL15cXGQrXFwuP1xcZHswLDJ9JC8sXG5cdFx0XHQgXHRpc1ZhbGlkID0gVkFMSURfUkVHRVhQLnRlc3QodmFsdWUpLFxuXHRcdFx0ICAgIGxhc3RWYWwgPSB2YWx1ZS5zdWJzdHJpbmcoMCx2YWx1ZS5sZW5ndGgtMSk7XG5cdFx0XHQgICAgXG5cdFx0XHRcdGlmKGlzVmFsaWQpe1xuXHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0bmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZShsYXN0VmFsKTtcbiAgICAgICAgICAgICAgICAgICAgbmdNb2RlbEN0cmwuJHJlbmRlcigpO1xuXHRcdFx0XHRcdHJldHVybiBsYXN0VmFsO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn0pXG4uZGlyZWN0aXZlKCdjb21wYW55RW1haWxWYWxpZGF0b3InLGZ1bmN0aW9uKCl7XG4vKmNoYW5nZSBlbWFpbCB2YWxpZGF0b3IgcnVsZXM6VXAgdG8gMjU0IGNoYXJhY3RlciBiZWZvcmUgJ0AnKi9cblx0dmFyIEVNQUlMX1JFR0VYUCA9IC9eKD89LnsxLDI1NH0kKSg/PS57MSwyNTR9QClbLSEjJCUmJyorLzAtOT0/QS1aXl9gYS16e3x9fl0rKFxcLlstISMkJSYnKisvMC05PT9BLVpeX2BhLXp7fH1+XSspKkBbQS1aYS16MC05XShbQS1aYS16MC05LV17MCw2MX1bQS1aYS16MC05XSk/KFxcLltBLVphLXowLTldKFtBLVphLXowLTktXXswLDYxfVtBLVphLXowLTldKT8pKiQvO1xuXHRyZXR1cm57XG5cdFx0cmVzdHJpY3Q6XCJFQVwiLFxuXHRcdHByaW9yaXR5Oi0xLFxuXHRcdHJlcXVpcmU6Jz9uZ01vZGVsJyxcblx0XHRsaW5rOmZ1bmN0aW9uKCRzY29wZSwkZWxlbSwkYXR0cnMsbmdNb2RlbEN0cmwpe1xuXHRcdFx0aWYobmdNb2RlbEN0cmwgJiYgbmdNb2RlbEN0cmwuJHZhbGlkYXRvcnMuZW1haWwpe1xuXHRcdFx0XHRuZ01vZGVsQ3RybC4kdmFsaWRhdG9ycy5lbWFpbCA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xuXHRcdCAgICBcdFx0dmFyIHZhbHVlID0gbW9kZWxWYWx1ZSB8fCB2aWV3VmFsdWU7XG5cdFx0ICAgIFx0XHRyZXR1cm4gbmdNb2RlbEN0cmwuJGlzRW1wdHkodmFsdWUpIHx8IEVNQUlMX1JFR0VYUC50ZXN0KHZhbHVlKTtcblx0XHQgXHRcdCB9O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSlcbi5kaXJlY3RpdmUoJ3JldGFpbkRlY2ltYWwnLGZ1bmN0aW9uKCl7XG5cdHZhciBST1VORFVQXzBfUkVHRVhQID0gL15cXGQrJC8sXHRcblx0XHRST1VORFVQXzFfUkVHRVhQID0gL15cXGQrKFxcLik/XFxkezAsMX0kLyxcblx0XHRST1VORFVQXzJfUkVHRVhQID0gL15cXGQrKFxcLik/XFxkezAsMn0kLyxcblx0XHRyZXRhaW5Db25maWcgPSB7XG5cdFx0XHRyZXN0cmljdDpcIkFcIixcblx0XHRcdHJlcXVpcmU6Jz9uZ01vZGVsJyxcblx0XHRcdGxpbms6ZnVuY3Rpb24oJHNjb3BlLCRlbGVtLCRhdHRycyxuZ01vZGVsQ3RybCl7XG5cdFx0XHRcdG5nTW9kZWxDdHJsLiRwYXJzZXJzLnB1c2goZnVuY3Rpb24odmFsdWUpe1xuXHRcdFx0XHRcdHZhciByZXRhaW5EZWNpbWFsID0gJGF0dHJzLnJldGFpbkRlY2ltYWwsXG5cdFx0XHRcdFx0XHRsYXN0VmFsID0gdmFsdWUuc3Vic3RyaW5nKDAsdmFsdWUubGVuZ3RoLTEpLFxuXHRcdFx0XHRcdFx0bGFzdENoYXIgPSB2YWx1ZS5jaGFyQXQodmFsdWUubGVuZ3RoLTEpLFxuXHRcdFx0XHRcdFx0aXNWYWxpZCxzdHI7XG5cdFx0XHRcdFx0c3dpdGNoKHJldGFpbkRlY2ltYWwpe1xuXHRcdFx0XHRcdFx0Y2FzZSBcIjFcIjpcblx0XHRcdFx0XHRcdFx0aXNWYWxpZCA9IFJPVU5EVVBfMV9SRUdFWFAudGVzdCh2YWx1ZSk7XG5cdFx0XHRcdFx0XHRcdHN0ciA9ICcuMCc7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSBcIjJcIjpcblx0XHRcdFx0XHRcdFx0aXNWYWxpZCA9IFJPVU5EVVBfMl9SRUdFWFAudGVzdCh2YWx1ZSk7XG5cdFx0XHRcdFx0XHRcdHN0ciA9ICcuMDAnO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdGlzVmFsaWQgPSBST1VORFVQXzBfUkVHRVhQLnRlc3QodmFsdWUpO1xuXHRcdFx0XHRcdFx0XHRzdHIgPSAnJztcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVx0XHRcdCAgICBcblx0XHRcdFx0XHRpZihpc1ZhbGlkKXtcblx0XHRcdFx0XHRcdGlmKGxhc3RDaGFyID09ICcuJyl7XG5cdFx0XHRcdFx0XHRcdG5nTW9kZWxDdHJsLiRzZXRWaWV3VmFsdWUobGFzdFZhbCtzdHIpO1xuXHQgICAgICAgICAgICAgICAgICAgIFx0bmdNb2RlbEN0cmwuJHJlbmRlcigpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gbGFzdFZhbCtzdHI7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHRuZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKGxhc3RWYWwpO1xuXHQgICAgICAgICAgICAgICAgICAgIG5nTW9kZWxDdHJsLiRyZW5kZXIoKTtcblx0XHRcdFx0XHRcdHJldHVybiBsYXN0VmFsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fTtcblx0cmV0dXJuIHJldGFpbkNvbmZpZztcbn0pXG4uZGlyZWN0aXZlKCdzZWFyY2hTZWxlY3QnLGZ1bmN0aW9uKCRzY2Upe1xuXHRyZXR1cm57XG5cdFx0cmVzdHJpY3Q6XCJFQVwiLFxuXHRcdHJlcGxhY2U6dHJ1ZSxcblx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdHJlcXVpcmU6Jz9uZ01vZGVsJyxcblx0XHRzY29wZTp7XG5cdFx0XHRvcHRpb25zOic9Jyxcblx0XHRcdG5hbWU6J0AnXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZTpcdFxuXHRcdFx0JzxkaXYgY2xhc3M9XCJ1aSBmbHVpZCBzZWFyY2ggc2VsZWN0aW9uIGRyb3Bkb3duIHVwd2FyZFwiPlxcXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cInt7bmFtZX19XCIgbmctbW9kZWw9XCJzZWxlY3RlZFZhbHVlXCI+XFxcblx0XHRcdFx0PGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxcXG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIiBuZy1iaW5kPVwic2VsZWN0ZWRWYWx1ZVwiPjwvZGl2PlxcXG5cdFx0XHQgIFx0PGRpdiBjbGFzcz1cIm1lbnUgdHJhbnNpdGlvbiBoaWRkZW5cIj5cXFxuXHRcdFx0ICAgIFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWluZGV4PVwie3tvcHRpb24uaW5kZXh9fVwiIGRhdGEtdmFsdWU9XCJ7e29wdGlvbi5pbmRleH19XCIgbmctcmVwZWF0ID0gXCJvcHRpb24gaW4gb3B0aW9uc1wiIG5nLWJpbmQ9XCJvcHRpb24uaXRlbVwiPjwvZGl2PlxcXG5cdFx0XHQgIFx0PC9kaXY+XFxcblx0XHRcdDwvZGl2PicsXG5cdFx0bGluazpmdW5jdGlvbigkc2NvcGUsJGVsZW0sJGF0dHJzLG5nTW9kZWwpe1xuXHRcdFx0JGVsZW0uZHJvcGRvd24oe1xuXHRcdFx0XHRmdWxsVGV4dFNlYXJjaDp0cnVlLFxuXHRcdFx0XHRvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRzZWxlY3RlZEl0ZW0pIHtcblx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRuZ01vZGVsLiRzZXRWaWV3VmFsdWUodmFsdWUpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0ICAgIH1cblx0XHRcdH0pO1xuXHRcdFx0bmdNb2RlbC4kcmVuZGVyID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2l0IGlzICRyZW5kZXInKTtcblx0XHRcdFx0JGVsZW0uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsXCIzXCIpO1xuXHRcdFx0fTtcbi8vXHRcdFx0JGVsZW0uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsXCIzXCIpO1xuXHRcdFx0JGF0dHJzLiRvYnNlcnZlKCduZ01vZGVsJyxmdW5jdGlvbih2YWwpe1xuXHRcdFx0XHRjb25zb2xlLmxvZyh2YWwpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAuY29tbW9uJylcbi5mYWN0b3J5KCdodHRwSW50ZXJjZXB0b3InLGZ1bmN0aW9uKCRzY2UsJHJvb3RTY29wZSwkdGltZW91dCl7XG5cdHZhciBzdGFydFRpbWUsZW5kVGltZTtcblx0cmV0dXJue1xuXHRcdCdyZXF1ZXN0JzpmdW5jdGlvbihyZXEpe1xuXHRcdFx0c3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHQkcm9vdFNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuXHRcdFx0cmV0dXJuIHJlcTtcblx0XHR9LFxuXHRcdCdyZXNwb25zZSc6ZnVuY3Rpb24ocmVzKXtcblx0XHRcdGVuZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdCRyb290U2NvcGUuJGV2YWxBc3luYyhmdW5jdGlvbigpe1xuXHRcdFx0XHR2YXIgbG9hZGluZ1RpbWUgPSBlbmRUaW1lLXN0YXJ0VGltZTtcblx0XHRcdFx0aWYobG9hZGluZ1RpbWUgPiA1MDApe1xuXHRcdFx0XHRcdCRyb290U2NvcGUubG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHQkdGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0JHJvb3RTY29wZS5sb2FkaW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0fSw1MDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiByZXM7XG5cdFx0fVxuXHR9XG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAuY29tbW9uJylcbi5mYWN0b3J5KCd0ZXN0U2VydmljZScsZnVuY3Rpb24oJGh0dHAsJHEpe1xuXHRyZXR1cm57XG5cdFx0Z2V0TWFpbjpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnbW9jay90ZXN0TmdSb3V0ZS1tYWluLmpzb24nKTtcblx0XHR9LFxuXHRcdGdldFVzZXI6ZnVuY3Rpb24oKXtcblx0XHRcdC8vIHJldHVybiAkaHR0cC5nZXQoJ21vY2svdGVzdE5nUm91dGUtdXNlci5qc29uJyk7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXIvMScpO1xuXHRcdH0sXG5cdFx0Z2V0UmVzdDpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnL3Jlc3RhcGkvbG9naW4nKTtcblx0XHR9XG5cdH1cbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5tYWluLmRyb3Bkb3duJylcbi5jb250cm9sbGVyKCdUZXN0RHJvcERvd25DdHJsJyxmdW5jdGlvbigkc2NvcGUsICRyb3V0ZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24sICRzY2Upe1xuICAgICRzY29wZS5kcm9wZG93bl9tb2RlbCA9ICdpdGVtMyc7XG5cbiAgICAkc2NvcGUuZHJvcGRvd25fcmVwZWF0X21vZGVsID0gJ2l0ZW0xJztcbiAgICAkc2NvcGUuZHJvcGRvd25faXRlbXMgPSBbXG4gICAgICAnaXRlbTEnLFxuICAgICAgJ2l0ZW0yJyxcbiAgICAgICdpdGVtMycsXG4gICAgICAnaXRlbTQnXG4gICAgXTtcblxuICAgICRzY29wZS5kcm9wZG93bl9rZXlfdmFsdWVfbW9kZWwgPSAnJztcbiAgICAkc2NvcGUuZHJvcGRvd25fa2V5X3ZhbHVlX2l0ZW1zID0ge1xuICAgICAgJ2l0ZW0xJzogJ0Nvb2wgaXRlbSAxJyxcbiAgICAgICdpdGVtMic6ICdDb29sIGl0ZW0gMicsXG4gICAgICAnaXRlbTMnOiAnQ29vbCBpdGVtIDMnLFxuICAgICAgJ2l0ZW00JzogJ0Nvb2wgaXRlbSA0J1xuICAgIH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5tYWluJylcbi5jb250cm9sbGVyKCdtYWluQ3RybCcsZnVuY3Rpb24oJHNjb3BlLCAkcm91dGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uLCBtYWluRGF0YSwgJHBhcnNlKXtcblx0JHNjb3BlLnBhZ2VOYW1lID0gbWFpbkRhdGEucGFnZU5hbWU7XG5cdCRzY29wZS5teUlucHV0VmFsMSA9IFwiMTExXCI7XG5cdCRzY29wZS5teUlucHV0VmFsMiA9IFwiXCI7XG5cdCRzY29wZS5teUlucHV0VmFsMyA9IFwiXCI7XG5cdCRzY29wZS5teUlucHV0VmFsNCA9IFwiXCI7XG4vL1x0JHNjb3BlLmRhdGUgPSByZXN0RGF0YS5kYXRhLmRhdGU7XG4vL1x0Y29uc29sZS5kZWJ1ZyhyZXN0RGF0YSk7XG5cdCRzY29wZS5zZWxlY3RWYWwgPSBcIlwiO1xuXHQkc2NvcGUucGFyZW50T3B0aW9ucyA9IFtcblx0XHR7aXRlbTpcIkFyYWJpYyBDaGluZXNlXCIsc2VsZWN0OnRydWUsaW5kZXg6MX0sXG5cdFx0e2l0ZW06XCJDaGluZXNlIFwiLHNlbGVjdDpmYWxzZSxpbmRleDoyfSxcblx0XHR7aXRlbTpcIkR1dGNoXCIsc2VsZWN0OmZhbHNlLGluZGV4OjN9LFxuXHRcdHtpdGVtOlwiRW5nbGlzaFwiLHNlbGVjdDpmYWxzZSxpbmRleDo0fSxcblx0XHR7aXRlbTpcIkZyZW5jaFwiLHNlbGVjdDpmYWxzZSxpbmRleDo1fSxcblx0XHR7aXRlbTpcIkdlcm1hblwiLHNlbGVjdDpmYWxzZSxpbmRleDo2fSxcblx0XHR7aXRlbTpcIkdyZWVrXCIsc2VsZWN0OmZhbHNlLGluZGV4Ojd9LFxuXHRcdHtpdGVtOlwiSHVuZ2FyaWFuXCIsc2VsZWN0OmZhbHNlLGluZGV4Ojh9LFxuXHRcdHtpdGVtOlwiSXRhbGlhblwiLHNlbGVjdDpmYWxzZSxpbmRleDo5fSxcblx0XHR7aXRlbTpcIkphcGFuZXNlXCIsc2VsZWN0OmZhbHNlLGluZGV4OjEwfSxcblx0XHR7aXRlbTpcIktvcmVhblwiLHNlbGVjdDpmYWxzZSxpbmRleDoxMX0sXG5cdFx0e2l0ZW06XCJMaXRodWFuaWFuXCIsc2VsZWN0OmZhbHNlLGluZGV4OjEyfSxcblx0XHR7aXRlbTpcIlBlcnNpYW5cIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTN9LFxuXHRcdHtpdGVtOlwiUG9saXNoXCIsc2VsZWN0OmZhbHNlLGluZGV4OjE0fSxcblx0XHR7aXRlbTpcIlBvcnR1Z3Vlc2VcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTV9LFxuXHRcdHtpdGVtOlwiUnVzc2lhblwiLHNlbGVjdDpmYWxzZSxpbmRleDoxNn0sXG5cdFx0e2l0ZW06XCJTcGFuaXNoXCIsc2VsZWN0OmZhbHNlLGluZGV4OjE3fSxcblx0XHR7aXRlbTpcIlN3ZWRpc2hcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTh9LFxuXHRcdHtpdGVtOlwiVHVya2lzaFwiLHNlbGVjdDpmYWxzZSxpbmRleDoxOX0sXG5cdFx0e2l0ZW06XCJWaWV0bmFtZXNlXCIsc2VsZWN0OmZhbHNlLGluZGV4OjIwfVxuXHRdO1xuXHQkc2NvcGUudXBkYXRlVmFsID0gZnVuY3Rpb24oKXtcblx0XHR2YXIgdGV4dCA9IFwiJ2l0IGlzIG15IHRlc3QhdGhlIHJlc3VsdCBpczonICsgbXlJbnB1dFZhbDFcIjtcblx0XHR2YXIgaW5wdXRGdWMgPSAkcGFyc2UodGV4dCk7XG5cdFx0JHNjb3BlLm15SW5wdXRWYWxSZXMgPSBpbnB1dEZ1Yygkc2NvcGUpO1xuXHR9XG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbi50aW55bWljZScpXG4uY29udHJvbGxlcigndGlueW1pY2VDdHJsJyxmdW5jdGlvbigkc2NvcGUsICRyb3V0ZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24sICRzY2Upe1xuICAgdmFyIGN0cmwgPSB0aGlzO1xuXHQkc2NvcGUuc2V0dGluZyA9IHtcblx0XHRpbmxpbmU6IGZhbHNlLFxuXHQgIFx0cGx1Z2luczogXCJhZHZsaXN0IGF1dG9saW5rIGxpc3RzIGxpbmsgaW1hZ2UgY2hhcm1hcCBwcmludCBwcmV2aWV3IGFuY2hvclwiLFxuICAgXHRcdHJlYWRvbmx5IDogJHNjb3BlLm9wZXJhdGUgPT09ICd2aWV3JyA/IHRydWUgOiBmYWxzZSxcblx0ICAgIHNraW46ICdsaWdodGdyYXknLFxuICAgIFx0dGhlbWUgOiAnbW9kZXJuJyxcbiAgICBcdG1pbl9oZWlnaHQ6IDIwMCxcbiAgICBcdG1heF9oZWlnaHQ6IDUwMFxuXHR9O1xuICAgIHRoaXMudXBkYXRlSHRtbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgY3RybC50aW55bWNlSHRtbCA9ICRzY2UudHJ1c3RBc0h0bWwoY3RybC50aW55bWNlKTtcbiAgICB9O1xufSk7IiwiYW5ndWxhci5tb2R1bGUoJ215QXBwLnVzZXInKVxuLmNvbnRyb2xsZXIoJ3VzZXJDdHJsJyxmdW5jdGlvbigkc2NvcGUsICRyb3V0ZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24sIHVzZXJEYXRhKXtcblx0JHNjb3BlLnBhZ2VOYW1lID0gdXNlckRhdGEucGFnZU5hbWU7XG5cdCRzY29wZS51c2VySWQgPSAkcm91dGVQYXJhbXMudXNlcklkO1xuXHQkc2NvcGUuZm9vID0gXCJwbGVhc2UgaW5wdXQhXCI7XG5cdHZhciBjdHJsID0gdGhpcztcblx0Y29uc29sZS5sb2codGhpcyk7XG5cdGNvbnNvbGUubG9nKGN0cmwpO1xuXHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKCl7XG5cdFx0Y29uc29sZS5sb2coJ3RoaXMgdXBkYXRlJyk7XG5cdH07XG5cdHRoaXMuZGVsZXRlID0gZnVuY3Rpb24oKXtcblx0XHRjb25zb2xlLmxvZygndGhpcyB1cGRhdGUnKTtcblx0fTtcblx0JHNjb3BlLmV4cG9ydEZpbGUgPSBmdW5jdGlvbiAoKSB7XG4vL1x0XHRpZigkc2NvcGUudHlwZSA9PSBcIm9yZGVyUmVwb3J0c1wiKXtcbi8vXHRcdFx0dmFyIGNyaXRlcmlhID0gJHNjb3BlLnNlYXJjaEZpZWxkc0RhdGE7XG4vL1x0XHRcdGlmKGNyaXRlcmlhKXtcbi8vXHRcdFx0XHR2YXIgcGFyYW1zID0ge1xuLy9cdFx0XHRcdFx0c2VhcmNoOiAne1wiY3JpdGVyaWFcIjonKyBhbmd1bGFyLnRvSnNvbihjcml0ZXJpYSkgKyAnfSdcbi8vXHRcdFx0XHR9O1xuLy9cdFx0XHRcdGNvbW1vblNlcnYuZXhwb3J0UmVzdWx0V2l0aFBhcmFtcyhycHMuY29tbW9uVXJsICsgJ29yZGVyUmVwb3J0JyArIHJwcy5kb3dubG9hZCwgcGFyYW1zLCBcIk9yZGVyUmVwb3J0cy5jc3ZcIik7XG4vL1x0XHRcdH1lbHNle1xuLy9cdFx0XHRcdGNvbW1vblNlcnYuZXhwb3J0UmVzdWx0KHJwcy5jb21tb25VcmwgKyAnb3JkZXJSZXBvcnQnICsgcnBzLmRvd25sb2FkLCBudWxsLCBcIk9yZGVyUmVwb3J0cy5jc3ZcIik7XG4vL1x0XHRcdH1cbi8vXHRcdH1lbHNlIGlmKCRzY29wZS50eXBlID09IFwib3JkZXJJdGVtUmVwb3J0c1wiKXtcbi8vXHRcdFx0Y29tbW9uU2Vydi5leHBvcnRSZXN1bHQocnBzLmNvbW1vblVybCArICdvcmRlckl0ZW1SZXBvcnQnICsgcnBzLmRvd25sb2FkLCBudWxsLCBcIkl0ZW1SZXBvcnRzLmNzdlwiKTtcbi8vXHRcdH1lbHNlIGlmKCRzY29wZS50eXBlID09IFwiYXVkaXRzXCIpe1xuLy9cdFx0XHR2YXIgY3JpdGVyaWEgPSAkc2NvcGUuc2VhcmNoRmllbGRzRGF0YTtcbi8vXHRcdFx0aWYoY3JpdGVyaWEpe1xuLy9cdFx0XHRcdC8vIHZhciBzZWFyY2hGaWVsZHMgPSB7J2NyaXRlcmlhJzogY3JpdGVyaWF9O1xuLy9cdFx0XHRcdC8vIGNvbW1vblNlcnYuZXhwb3J0UmVzdWx0KHJwcy5jb21tb25VcmwgKyAnYXVkaXRzJyArIHJwcy5kb3dubG9hZCArIFwiP3NlYXJjaD1cIiArIGFuZ3VsYXIudG9Kc29uKHNlYXJjaEZpZWxkcyksIG51bGwsIFwiQXVkaXRMb2dzLmNzdlwiKTtcbi8vXG4vL1x0XHRcdFx0JGh0dHAoe1xuLy9cdFx0XHRcdFx0bWV0aG9kOiAnR0VUJyxcbi8vXHRcdFx0XHRcdHVybDogcnBzLmNvbW1vblVybCArICdhdWRpdHMnICsgcnBzLmRvd25sb2FkLFxuLy9cdFx0XHRcdFx0cGFyYW1zOiB7XG4vL1x0XHRcdFx0XHRcdHNlYXJjaDogJ3tcImNyaXRlcmlhXCI6JysgYW5ndWxhci50b0pzb24oY3JpdGVyaWEpICsgJ30nXG4vL1x0XHRcdFx0XHR9XG4vL1x0XHRcdFx0fSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbi8vXHRcdFx0XHRcdHZhciBibG9iID0gbmV3IEJsb2IoW3Jlc3BvbnNlLmRhdGFdLCB7XG4vL1x0XHRcdFx0XHRcdHR5cGU6ICd0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04J1xuLy9cdFx0XHRcdFx0fSk7XG4vL1x0XHRcdFx0XHR2YXIgZmlsZU5hbWUgPSBcIlwiO1xuLy9cdFx0XHRcdFx0dHJ5IHtcbi8vXHRcdFx0XHRcdFx0ZmlsZU5hbWUgPSBuZXcgUmVnRXhwKCdmaWxlbmFtZT1cIiguKylcIicsICdpZycpLmV4ZWMocmVzcG9uc2UuaGVhZGVycygpWydjb250ZW50LWRpc3Bvc2l0aW9uJ10pWzFdO1xuLy9cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xuLy9cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhlKTtcbi8vXHRcdFx0XHRcdFx0ZmlsZU5hbWUgPSBcIkF1ZGl0TG9ncy5jc3ZcIjtcbi8vXHRcdFx0XHRcdH1cbi8vXHRcdFx0XHRcdHNhdmVBcyhibG9iLCBmaWxlTmFtZSk7XG4vL1x0XHRcdFx0fSk7XG4vL1xuLy9cdFx0XHR9ZWxzZXtcbi8vXHRcdFx0XHRjb21tb25TZXJ2LmV4cG9ydFJlc3VsdChycHMuY29tbW9uVXJsICsgJ2F1ZGl0cycgKyBycHMuZG93bmxvYWQsIG51bGwsIFwiQXVkaXRMb2dzLmNzdlwiKTtcbi8vXHRcdFx0fVxuLy9cdFx0fWVsc2V7XG4vL1x0XHRcdGNvbW1vblNlcnYuZXhwb3J0UmVzdWx0KHJwcy5jb21tb25VcmwgKyAkc2NvcGUudHlwZSArIHJwcy5leHBvcnQsIG51bGwsIFwidGVtcGxhdGUuY3N2XCIpO1xuLy9cdFx0fVxuXHRcdHZhciB0eXBlID0gJHNjb3BlLnR5cGUsXG5cdFx0XHRjcml0ZXJpYSA9ICRzY29wZS5zZWFyY2hGaWVsZHNEYXRhO1xuXHRcdFx0XG5cdFx0c3dpdGNoKHR5cGUpe1xuXHRcdFx0Y2FzZSAnJzpcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH07XG59KTsiXX0=
