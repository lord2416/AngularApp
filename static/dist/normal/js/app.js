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
            return $http.get('user/1');
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsIm1vZHVsZS5qcyIsImRpcmVjdGl2ZS9hbmd1bGFyLXRpbnltY2UuanMiLCJkaXJlY3RpdmUvaW5wdXREaXJlLmpzIiwic2VydmljZS9pbnRlckNlcHRvclNlcnYuanMiLCJzZXJ2aWNlL3Rlc3RTZXJ2LmpzIiwiY29udHJvbGxlci9tYWluL2Ryb3Bkb3duQ3RybC5qcyIsImNvbnRyb2xsZXIvbWFpbi9tYWluQ3RybC5qcyIsImNvbnRyb2xsZXIvbWFpbi90aW55bWljZUN0cmwuanMiLCJjb250cm9sbGVyL3VzZXIvdXNlckN0cmwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsUUFBUSxPQUFPLFFBQVE7Q0FDdEI7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7R0FDRSxnRUFBTyxTQUFTLGdCQUFnQixtQkFBbUIsY0FBYzs7Q0FFbkUsR0FBRyxDQUFDLGNBQWMsU0FBUyxRQUFRLElBQUk7R0FDckMsY0FBYyxTQUFTLFFBQVEsTUFBTTs7OztDQUl2QyxjQUFjLFNBQVMsUUFBUSxPQUFPLHNCQUFzQjtDQUM1RCxjQUFjLFNBQVMsUUFBUSxJQUFJLG1CQUFtQjtDQUN0RCxjQUFjLFNBQVMsUUFBUSxJQUFJLFlBQVk7OztDQUcvQztFQUNDLEtBQUssSUFBSTtFQUNULFlBQVk7RUFDWixXQUFXO0VBQ1gsUUFBUTtHQUNQLHlCQUFTLFNBQVMsWUFBWTtJQUM3QixPQUFPLFlBQVksVUFBVSxLQUFLLFNBQVMsSUFBSTtLQUM5QyxPQUFPLElBQUk7T0FDVCxNQUFNLFNBQVMsSUFBSTtLQUNyQixPQUFPLElBQUk7Ozs7Ozs7Ozs7OztFQVlkLEtBQUssZ0JBQWdCO0VBQ3JCLFlBQVk7RUFDWixXQUFXO0VBQ1gsUUFBUTtHQUNQLHlCQUFTLFNBQVMsWUFBWTtJQUM3QixPQUFPLFlBQVksVUFBVSxLQUFLLFNBQVMsSUFBSTtLQUM5QyxPQUFPLElBQUk7Ozs7RUFJZCxlQUFlOztFQUVmLEtBQUssWUFBWTtFQUNqQixZQUFZO0VBQ1osV0FB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W1xyXG5cdCduZ1JvdXRlJyxcclxuXHQnYW5ndWxhclRyaXgnLFxyXG5cdCdhbmd1bGFyaWZ5LnNlbWFudGljLmRyb3Bkb3duJyxcclxuXHQndWkudGlueW1jZScsXHJcblx0J215QXBwLmNvbW1vbicsXHJcblx0J215QXBwLm1haW4nLFxyXG5cdCdteUFwcC51c2VyJ1xyXG5dKS5jb25maWcoZnVuY3Rpb24oJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkaHR0cFByb3ZpZGVyKXtcclxuICAgIC8vSW5pdGlhbGl6ZSBHZXQgUmVxdWVzdFxyXG5cdGlmKCEkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0KXtcclxuXHQgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXQgPSB7fTtcclxuXHR9XHJcblxyXG5cdC8vRGlzYWJsZSBJRSBBamF4IFJlcXVlc3QgQ2FjaGVcclxuXHQkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xyXG5cdCRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXRbJ0NhY2hlLUNvbnRyb2wnXSA9ICduby1jYWNoZSc7XHJcblx0JGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldFsnUHJhZ21hJ10gPSAnbm8tY2FjaGUnO1xyXG5cdFxyXG5cdC8vcm91dGUgc2V0dGluZ1xyXG5cdCRyb3V0ZVByb3ZpZGVyXHJcblx0LndoZW4oJy8nLHtcclxuXHRcdHRlbXBsYXRlVXJsOid0ZW1wbGF0ZS90ZXN0TmdSb3V0ZS1tYWluLmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjonbWFpbkN0cmwnLFxyXG5cdFx0cmVzb2x2ZTp7XHJcblx0XHRcdG1haW5EYXRhOmZ1bmN0aW9uKHRlc3RTZXJ2aWNlKXtcclxuXHRcdFx0XHRyZXR1cm4gdGVzdFNlcnZpY2UuZ2V0TWFpbigpLnRoZW4oZnVuY3Rpb24ocmVzKXtcclxuXHRcdFx0XHRcdHJldHVybiByZXMuZGF0YTtcclxuXHRcdFx0XHR9KS5jYXRjaChmdW5jdGlvbihlcnIpe1xyXG5cdFx0XHRcdFx0cmV0dXJuIGVyci5kYXRhO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcbi8vXHRcdFx0cmVzdERhdGE6ZnVuY3Rpb24odGVzdFNlcnZpY2Upe1xyXG4vL1x0XHRcdFx0cmV0dXJuIHRlc3RTZXJ2aWNlLmdldFJlc3QoKS50aGVuKGZ1bmN0aW9uKHJlcyl7XHJcbi8vXHRcdFx0XHRcdHJldHVybiByZXMuZGF0YTtcclxuLy9cdFx0XHRcdH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XHJcbi8vXHRcdFx0XHRcdHJldHVybiBlcnIuZGF0YTtcclxuLy9cdFx0XHRcdH0pO1xyXG4vL1x0XHRcdH1cclxuXHRcdH1cclxuXHR9KVxyXG5cdC53aGVuKCcvdXNlci86dXNlcklkJyx7XHJcblx0XHR0ZW1wbGF0ZVVybDondGVtcGxhdGUvdGVzdE5nUm91dGUtdXNlci5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6J3VzZXJDdHJsJyxcclxuXHRcdHJlc29sdmU6e1xyXG5cdFx0XHR1c2VyRGF0YTpmdW5jdGlvbih0ZXN0U2VydmljZSl7XHJcblx0XHRcdFx0cmV0dXJuIHRlc3RTZXJ2aWNlLmdldFVzZXIoKS50aGVuKGZ1bmN0aW9uKHJlcyl7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRyZWxvYWRPblNlYXJjaDpmYWxzZVxyXG5cdH0pXHJcblx0LndoZW4oJy90aW55bWljZScse1xyXG5cdFx0dGVtcGxhdGVVcmw6J3RlbXBsYXRlL3RpbnltaWNlLmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjondGlueW1pY2VDdHJsJyxcclxuXHRcdHJlbG9hZE9uU2VhcmNoOmZhbHNlXHJcblx0fSlcclxuXHQud2hlbignL2Ryb3Bkb3duJyx7XHJcblx0XHR0ZW1wbGF0ZVVybDondGVtcGxhdGUvZHJvcGRvd24uaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOidUZXN0RHJvcERvd25DdHJsJyxcclxuXHRcdHJlbG9hZE9uU2VhcmNoOmZhbHNlXHJcblx0fSlcclxuXHQub3RoZXJ3aXNlKHtcclxuXHRcdHJlZGlyZWN0VG86Jy8nXHJcblx0fSk7XHJcblx0XHJcblx0Ly9odG1sNSBtb2RlIHNldHRpbmdcclxuXHQkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUoZmFsc2UpO1xyXG5cdCRsb2NhdGlvblByb3ZpZGVyLmhhc2hQcmVmaXgoJycpO1xyXG5cclxuXHQvL0ludGVyY2VwdG9yXHJcblx0JGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaCgnaHR0cEludGVyY2VwdG9yJyk7XHJcblx0Y29uc29sZS5sb2coJ3RoZSBhbmd1bGFyIGFwcCBpcyBzdGFydCEnKTtcclxufSlcclxuLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCR0ZW1wbGF0ZUNhY2hlKXtcclxuXHQkcm9vdFNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuICAgICRyb290U2NvcGUuJG9uKCckcm91dGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uKGV2ZW50LCBuZXh0LCBjdXJyZW50KSB7ICBcclxuICAgICAgICBpZiAodHlwZW9mKGN1cnJlbnQpICE9PSAndW5kZWZpbmVkJyl7ICBcclxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucmVtb3ZlKGN1cnJlbnQudGVtcGxhdGVVcmwpOyAgXHJcbiAgICAgICAgfSAgXHJcbiAgICB9KTtcclxuICAgICRyb290U2NvcGUuJG9uKCckcm91dGVVcGRhdGUnLGZ1bmN0aW9uKGV2ZW50LCBuZXh0LCBjdXJyZW50KXtcclxuICAgIFx0Y29uc29sZS5sb2coZXZlbnQpO1xyXG4gICAgXHRjb25zb2xlLmxvZyhuZXh0KTtcclxuICAgIFx0Y29uc29sZS5sb2coY3VycmVudCk7XHJcbiAgICB9KTtcclxufSk7XHJcbmFuZ3VsYXIuZWxlbWVudChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcclxuICAgYW5ndWxhci5ib290c3RyYXAoZG9jdW1lbnQsWydteUFwcCddKTtcclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5jb21tb24nLFtdKTtcclxuYW5ndWxhci5tb2R1bGUoJ215QXBwLm1haW4nLFsnbXlBcHAubWFpbi50aW55bWljZScsJ215QXBwLm1haW4uZHJvcGRvd24nXSk7XHJcbmFuZ3VsYXIubW9kdWxlKCdteUFwcC5tYWluLnRpbnltaWNlJyxbJ215QXBwLmNvbW1vbicsJ3VpLnRpbnltY2UnXSk7XHJcbmFuZ3VsYXIubW9kdWxlKCdteUFwcC5tYWluLmRyb3Bkb3duJyxbJ215QXBwLmNvbW1vbicsJ2FuZ3VsYXJpZnkuc2VtYW50aWMuZHJvcGRvd24nXSk7XHJcbmFuZ3VsYXIubW9kdWxlKCdteUFwcC51c2VyJyxbJ215QXBwLmNvbW1vbiddKTsiLCIvKipcclxuICogQmluZHMgYSBUaW55TUNFIHdpZGdldCB0byA8dGV4dGFyZWE+IGVsZW1lbnRzLlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ3VpLnRpbnltY2UnLCBbXSlcclxuICAudmFsdWUoJ3VpVGlueW1jZUNvbmZpZycsIHt9KVxyXG4gIC5kaXJlY3RpdmUoJ3VpVGlueW1jZScsIFsnJHJvb3RTY29wZScsICckY29tcGlsZScsICckdGltZW91dCcsICckd2luZG93JywgJyRzY2UnLCAndWlUaW55bWNlQ29uZmlnJywgJ3VpVGlueW1jZVNlcnZpY2UnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkY29tcGlsZSwgJHRpbWVvdXQsICR3aW5kb3csICRzY2UsIHVpVGlueW1jZUNvbmZpZywgdWlUaW55bWNlU2VydmljZSkge1xyXG4gICAgdWlUaW55bWNlQ29uZmlnID0gdWlUaW55bWNlQ29uZmlnIHx8IHt9O1xyXG5cclxuICAgIGlmICh1aVRpbnltY2VDb25maWcuYmFzZVVybCkge1xyXG4gICAgICB0aW55bWNlLmJhc2VVUkwgPSB1aVRpbnltY2VDb25maWcuYmFzZVVybDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXF1aXJlOiBbJ25nTW9kZWwnLCAnXj9mb3JtJ10sXHJcbiAgICAgIHByaW9yaXR5OiA1OTksXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybHMpIHtcclxuICAgICAgICBpZiAoISR3aW5kb3cudGlueW1jZSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIG5nTW9kZWwgPSBjdHJsc1swXSxcclxuICAgICAgICAgIGZvcm0gPSBjdHJsc1sxXSB8fCBudWxsO1xyXG5cclxuICAgICAgICB2YXIgZXhwcmVzc2lvbiwgb3B0aW9ucyA9IHtcclxuICAgICAgICAgIGRlYm91bmNlOiB0cnVlXHJcbiAgICAgICAgfSwgdGlueUluc3RhbmNlLFxyXG4gICAgICAgICAgdXBkYXRlVmlldyA9IGZ1bmN0aW9uKGVkaXRvcikge1xyXG4gICAgICAgICAgICB2YXIgY29udGVudCA9IGVkaXRvci5nZXRDb250ZW50KHtmb3JtYXQ6IG9wdGlvbnMuZm9ybWF0fSkudHJpbSgpO1xyXG4gICAgICAgICAgICBjb250ZW50ID0gJHNjZS50cnVzdEFzSHRtbChjb250ZW50KTtcclxuXHJcbiAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShjb250ZW50KTtcclxuICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLiQkcGhhc2UpIHtcclxuICAgICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHRvZ2dsZURpc2FibGUoZGlzYWJsZWQpIHtcclxuICAgICAgICAgIGlmIChkaXNhYmxlZCkge1xyXG4gICAgICAgICAgICBlbnN1cmVJbnN0YW5jZSgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRpbnlJbnN0YW5jZSkge1xyXG4gICAgICAgICAgICAgIHRpbnlJbnN0YW5jZS5nZXRCb2R5KCkuc2V0QXR0cmlidXRlKCdjb250ZW50ZWRpdGFibGUnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVuc3VyZUluc3RhbmNlKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGlueUluc3RhbmNlICYmICF0aW55SW5zdGFuY2Uuc2V0dGluZ3MucmVhZG9ubHkgJiYgdGlueUluc3RhbmNlLmdldERvYygpKSB7XHJcbiAgICAgICAgICAgICAgdGlueUluc3RhbmNlLmdldEJvZHkoKS5zZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScsIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBmZXRjaCBhIHVuaXF1ZSBJRCBmcm9tIHRoZSBzZXJ2aWNlXHJcbiAgICAgICAgdmFyIHVuaXF1ZUlkID0gdWlUaW55bWNlU2VydmljZS5nZXRVbmlxdWVJZCgpO1xyXG4gICAgICAgIGF0dHJzLiRzZXQoJ2lkJywgdW5pcXVlSWQpO1xyXG5cclxuICAgICAgICBleHByZXNzaW9uID0ge307XHJcblxyXG4gICAgICAgIGFuZ3VsYXIuZXh0ZW5kKGV4cHJlc3Npb24sIHNjb3BlLiRldmFsKGF0dHJzLnVpVGlueW1jZSkpO1xyXG5cclxuICAgICAgICAvL0RlYm91bmNlIHVwZGF0ZSBhbmQgc2F2ZSBhY3Rpb25cclxuICAgICAgICB2YXIgZGVib3VuY2VkVXBkYXRlID0gKGZ1bmN0aW9uKGRlYm91bmNlZFVwZGF0ZURlbGF5KSB7XHJcbiAgICAgICAgICB2YXIgZGVib3VuY2VkVXBkYXRlVGltZXI7XHJcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oZWQpIHtcclxuXHQgICAgICAgICR0aW1lb3V0LmNhbmNlbChkZWJvdW5jZWRVcGRhdGVUaW1lcik7XHJcblx0ICAgICAgICAgZGVib3VuY2VkVXBkYXRlVGltZXIgPSAkdGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gKGZ1bmN0aW9uKGVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWQuaXNEaXJ0eSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgIGVkLnNhdmUoKTtcclxuICAgICAgICAgICAgICAgICAgdXBkYXRlVmlldyhlZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSkoZWQpO1xyXG4gICAgICAgICAgICB9LCBkZWJvdW5jZWRVcGRhdGVEZWxheSk7XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH0pKDQwMCk7XHJcblxyXG4gICAgICAgIHZhciBzZXR1cE9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAvLyBVcGRhdGUgbW9kZWwgd2hlbiBjYWxsaW5nIHNldENvbnRlbnRcclxuICAgICAgICAgIC8vIChzdWNoIGFzIGZyb20gdGhlIHNvdXJjZSBlZGl0b3IgcG9wdXApXHJcbiAgICAgICAgICBzZXR1cDogZnVuY3Rpb24oZWQpIHtcclxuICAgICAgICAgICAgZWQub24oJ2luaXQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICBuZ01vZGVsLiRyZW5kZXIoKTtcclxuICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRQcmlzdGluZSgpO1xyXG4gICAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0VW50b3VjaGVkKCk7XHJcbiAgICAgICAgICAgICAgaWYgKGZvcm0pIHtcclxuICAgICAgICAgICAgICAgIGZvcm0uJHNldFByaXN0aW5lKCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBtb2RlbCB3aGVuOlxyXG4gICAgICAgICAgICAvLyAtIGEgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWQgW0V4ZWNDb21tYW5kXVxyXG4gICAgICAgICAgICAvLyAtIHRoZSBlZGl0b3IgY29udGVudCBoYXMgYmVlbiBtb2RpZmllZCBbY2hhbmdlXVxyXG4gICAgICAgICAgICAvLyAtIHRoZSBub2RlIGhhcyBjaGFuZ2VkIFtOb2RlQ2hhbmdlXVxyXG4gICAgICAgICAgICAvLyAtIGFuIG9iamVjdCBoYXMgYmVlbiByZXNpemVkICh0YWJsZSwgaW1hZ2UpIFtPYmplY3RSZXNpemVkXVxyXG4gICAgICAgICAgICBlZC5vbignRXhlY0NvbW1hbmQgY2hhbmdlIE5vZGVDaGFuZ2UgT2JqZWN0UmVzaXplZCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgIGlmICghb3B0aW9ucy5kZWJvdW5jZSkge1xyXG4gICAgICAgICAgICAgICAgZWQuc2F2ZSgpO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlVmlldyhlZCk7XHJcbiAgICAgICAgICAgICAgXHRyZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGRlYm91bmNlZFVwZGF0ZShlZCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgZWQub24oJ2JsdXInLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICBlbGVtZW50WzBdLmJsdXIoKTtcclxuICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRUb3VjaGVkKCk7XHJcbiAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLiQkcGhhc2UpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgZWQub24oJ3JlbW92ZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHVpVGlueW1jZUNvbmZpZy5zZXR1cCkge1xyXG4gICAgICAgICAgICAgIHVpVGlueW1jZUNvbmZpZy5zZXR1cChlZCwge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlVmlldzogdXBkYXRlVmlld1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZXhwcmVzc2lvbi5zZXR1cCkge1xyXG4gICAgICAgICAgICAgIGV4cHJlc3Npb24uc2V0dXAoZWQsIHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVZpZXc6IHVwZGF0ZVZpZXdcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGZvcm1hdDogZXhwcmVzc2lvbi5mb3JtYXQgfHwgJ2h0bWwnLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICcjJyArIGF0dHJzLmlkXHJcbiAgICAgICAgfTtcclxuICAgICAgICAvLyBleHRlbmQgb3B0aW9ucyB3aXRoIGluaXRpYWwgdWlUaW55bWNlQ29uZmlnIGFuZFxyXG4gICAgICAgIC8vIG9wdGlvbnMgZnJvbSBkaXJlY3RpdmUgYXR0cmlidXRlIHZhbHVlXHJcbiAgICAgICAgYW5ndWxhci5leHRlbmQob3B0aW9ucywgdWlUaW55bWNlQ29uZmlnLCBleHByZXNzaW9uLCBzZXR1cE9wdGlvbnMpO1xyXG4gICAgICAgIC8vIFdyYXBwZWQgaW4gJHRpbWVvdXQgZHVlIHRvICR0aW55bWNlOnJlZnJlc2ggaW1wbGVtZW50YXRpb24sIHJlcXVpcmVzXHJcbiAgICAgICAgLy8gZWxlbWVudCB0byBiZSBwcmVzZW50IGluIERPTSBiZWZvcmUgaW5zdGFudGlhdGluZyBlZGl0b3Igd2hlblxyXG4gICAgICAgIC8vIHJlLXJlbmRlcmluZyBkaXJlY3RpdmVcclxuICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmIChvcHRpb25zLmJhc2VVUkwpe1xyXG4gICAgICAgICAgICB0aW55bWNlLmJhc2VVUkwgPSBvcHRpb25zLmJhc2VVUkw7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2YXIgbWF5YmVJbml0UHJvbWlzZSA9IHRpbnltY2UuaW5pdChvcHRpb25zKTtcclxuICAgICAgICAgIGlmKG1heWJlSW5pdFByb21pc2UgJiYgdHlwZW9mIG1heWJlSW5pdFByb21pc2UudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBtYXliZUluaXRQcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgdG9nZ2xlRGlzYWJsZShzY29wZS4kZXZhbChhdHRycy5uZ0Rpc2FibGVkKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdG9nZ2xlRGlzYWJsZShzY29wZS4kZXZhbChhdHRycy5uZ0Rpc2FibGVkKSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIG5nTW9kZWwuJGZvcm1hdHRlcnMudW5zaGlmdChmdW5jdGlvbihtb2RlbFZhbHVlKSB7XHJcbiAgICAgICAgICByZXR1cm4gbW9kZWxWYWx1ZSA/ICRzY2UudHJ1c3RBc0h0bWwobW9kZWxWYWx1ZSkgOiAnJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbmdNb2RlbC4kcGFyc2Vycy51bnNoaWZ0KGZ1bmN0aW9uKHZpZXdWYWx1ZSkge1xyXG4gICAgICAgICAgcmV0dXJuIHZpZXdWYWx1ZSA/ICRzY2UuZ2V0VHJ1c3RlZEh0bWwodmlld1ZhbHVlKSA6ICcnO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBuZ01vZGVsLiRyZW5kZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGVuc3VyZUluc3RhbmNlKCk7XHJcblxyXG4gICAgICAgICAgdmFyIHZpZXdWYWx1ZSA9IG5nTW9kZWwuJHZpZXdWYWx1ZSA/XHJcbiAgICAgICAgICAgICRzY2UuZ2V0VHJ1c3RlZEh0bWwobmdNb2RlbC4kdmlld1ZhbHVlKSA6ICcnO1xyXG5cclxuICAgICAgICAgIC8vIGluc3RhbmNlLmdldERvYygpIGNoZWNrIGlzIGEgZ3VhcmQgYWdhaW5zdCBudWxsIHZhbHVlXHJcbiAgICAgICAgICAvLyB3aGVuIGRlc3RydWN0aW9uICYgcmVjcmVhdGlvbiBvZiBpbnN0YW5jZXMgaGFwcGVuXHJcbiAgICAgICAgICBpZiAodGlueUluc3RhbmNlICYmXHJcbiAgICAgICAgICAgIHRpbnlJbnN0YW5jZS5nZXREb2MoKVxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHRpbnlJbnN0YW5jZS5zZXRDb250ZW50KHZpZXdWYWx1ZSk7XHJcbiAgICAgICAgICAgIC8vIFRyaWdnZXJpbmcgY2hhbmdlIGV2ZW50IGR1ZSB0byBUaW55TUNFIG5vdCBmaXJpbmcgZXZlbnQgJlxyXG4gICAgICAgICAgICAvLyBiZWNvbWluZyBvdXQgb2Ygc3luYyBmb3IgY2hhbmdlIGNhbGxiYWNrc1xyXG4gICAgICAgICAgICB0aW55SW5zdGFuY2UuZmlyZSgnY2hhbmdlJyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgYXR0cnMuJG9ic2VydmUoJ2Rpc2FibGVkJywgdG9nZ2xlRGlzYWJsZSk7XHJcblxyXG4gICAgICAgIC8vIFRoaXMgYmxvY2sgaXMgYmVjYXVzZSBvZiBUaW55TUNFIG5vdCBwbGF5aW5nIHdlbGwgd2l0aCByZW1vdmFsIGFuZFxyXG4gICAgICAgIC8vIHJlY3JlYXRpb24gb2YgaW5zdGFuY2VzLCByZXF1aXJpbmcgaW5zdGFuY2VzIHRvIGhhdmUgZGlmZmVyZW50XHJcbiAgICAgICAgLy8gc2VsZWN0b3JzIGluIG9yZGVyIHRvIHJlbmRlciBuZXcgaW5zdGFuY2VzIHByb3Blcmx5XHJcbiAgICAgICAgdmFyIHVuYmluZEV2ZW50TGlzdGVuZXIgPSBzY29wZS4kb24oJyR0aW55bWNlOnJlZnJlc2gnLCBmdW5jdGlvbihlLCBpZCkge1xyXG4gICAgICAgICAgdmFyIGVpZCA9IGF0dHJzLmlkO1xyXG4gICAgICAgICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQoaWQpIHx8IGlkID09PSBlaWQpIHtcclxuICAgICAgICAgICAgdmFyIHBhcmVudEVsZW1lbnQgPSBlbGVtZW50LnBhcmVudCgpO1xyXG4gICAgICAgICAgICB2YXIgY2xvbmVkRWxlbWVudCA9IGVsZW1lbnQuY2xvbmUoKTtcclxuICAgICAgICAgICAgY2xvbmVkRWxlbWVudC5yZW1vdmVBdHRyKCdpZCcpO1xyXG4gICAgICAgICAgICBjbG9uZWRFbGVtZW50LnJlbW92ZUF0dHIoJ3N0eWxlJyk7XHJcbiAgICAgICAgICAgIGNsb25lZEVsZW1lbnQucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4nKTtcclxuICAgICAgICAgICAgdGlueW1jZS5leGVjQ29tbWFuZCgnbWNlUmVtb3ZlRWRpdG9yJywgZmFsc2UsIGVpZCk7XHJcbiAgICAgICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kKCRjb21waWxlKGNsb25lZEVsZW1lbnQpKHNjb3BlKSk7XHJcbiAgICAgICAgICAgIHVuYmluZEV2ZW50TGlzdGVuZXIoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgZW5zdXJlSW5zdGFuY2UoKTtcclxuXHJcbiAgICAgICAgICBpZiAodGlueUluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgIHRpbnlJbnN0YW5jZS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgdGlueUluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZW5zdXJlSW5zdGFuY2UoKSB7XHJcbiAgICAgICAgICBpZiAoIXRpbnlJbnN0YW5jZSkge1xyXG4gICAgICAgICAgICB0aW55SW5zdGFuY2UgPSB0aW55bWNlLmdldChhdHRycy5pZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1dKVxyXG4gIC5zZXJ2aWNlKCd1aVRpbnltY2VTZXJ2aWNlJywgW1xyXG4gICAgLyoqXHJcbiAgICAgKiBBIHNlcnZpY2UgaXMgdXNlZCB0byBjcmVhdGUgdW5pcXVlIElEJ3MsIHRoaXMgcHJldmVudHMgZHVwbGljYXRlIElEJ3MgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGVkaXRvcnMgb24gc2NyZWVuLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbigpIHtcclxuICAgICAgdmFyIFVJVGlueW1jZVNlcnZpY2UgPSBmdW5jdGlvbigpIHtcclxuICAgXHQgICAgdmFyIElEX0FUVFIgPSAndWktdGlueW1jZSc7XHJcbiAgICBcdC8vIHVuaXF1ZUlkIGtlZXBzIHRyYWNrIG9mIHRoZSBsYXRlc3QgYXNzaWduZWQgSURcclxuICAgIFx0dmFyIHVuaXF1ZUlkID0gMDtcclxuICAgICAgICAvLyBnZXRVbmlxdWVJZCByZXR1cm5zIGEgdW5pcXVlIElEXHJcbiAgICBcdHZhciBnZXRVbmlxdWVJZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdW5pcXVlSWQgKys7XHJcbiAgICAgICAgICByZXR1cm4gSURfQVRUUiArICctJyArIHVuaXF1ZUlkO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLy8gcmV0dXJuIHRoZSBmdW5jdGlvbiBhcyBhIHB1YmxpYyBtZXRob2Qgb2YgdGhlIHNlcnZpY2VcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgIFx0Z2V0VW5pcXVlSWQ6IGdldFVuaXF1ZUlkXHJcbiAgICAgICAgfTtcclxuICAgICAgfTtcclxuICAgICAgLy8gcmV0dXJuIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBzZXJ2aWNlXHJcbiAgICAgIHJldHVybiBuZXcgVUlUaW55bWNlU2VydmljZSgpO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAuY29tbW9uJylcclxuLmRpcmVjdGl2ZSgnbXlJbnB1dFBhcnNlJyxmdW5jdGlvbigpe1xyXG5cdHJldHVybntcclxuXHRcdHJlc3RyaWN0OlwiRUFcIixcclxuXHRcdHByaW9yaXR5Oi0xLFxyXG5cdFx0cmVxdWlyZTonP25nTW9kZWwnLFxyXG5cdFx0bGluazpmdW5jdGlvbigkc2NvcGUsICRlbGVtLCAkYXR0cnMsIG5nTW9kZWxDdHJsKXtcclxuXHRcdFx0aWYoIW5nTW9kZWxDdHJsKSByZXR1cm47XHJcblx0XHRcdGNvbnNvbGUubG9nKCdteUlucHV0UGFyc2UnKTtcclxuXHRcdFx0bmdNb2RlbEN0cmwuJHBhcnNlcnMucHVzaChmdW5jdGlvbih2YWx1ZSl7XHJcbi8vXHRcdFx0XHR2YXIgVkFMSURfUkVHRVhQID0gL15cXHcrJC8sXHJcblx0XHRcdFx0dmFyIFZBTElEX1JFR0VYUCA9IC9eXFxkK1xcLj9cXGR7MCwyfSQvLFxyXG5cdFx0XHQgXHRpc1ZhbGlkID0gVkFMSURfUkVHRVhQLnRlc3QodmFsdWUpLFxyXG5cdFx0XHQgICAgbGFzdFZhbCA9IHZhbHVlLnN1YnN0cmluZygwLHZhbHVlLmxlbmd0aC0xKTtcclxuXHRcdFx0ICAgIFxyXG5cdFx0XHRcdGlmKGlzVmFsaWQpe1xyXG5cdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xyXG5cdFx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdFx0bmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZShsYXN0VmFsKTtcclxuICAgICAgICAgICAgICAgICAgICBuZ01vZGVsQ3RybC4kcmVuZGVyKCk7XHJcblx0XHRcdFx0XHRyZXR1cm4gbGFzdFZhbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufSlcclxuLmRpcmVjdGl2ZSgnY29tcGFueUVtYWlsVmFsaWRhdG9yJyxmdW5jdGlvbigpe1xyXG4vKmNoYW5nZSBlbWFpbCB2YWxpZGF0b3IgcnVsZXM6VXAgdG8gMjU0IGNoYXJhY3RlciBiZWZvcmUgJ0AnKi9cclxuXHR2YXIgRU1BSUxfUkVHRVhQID0gL14oPz0uezEsMjU0fSQpKD89LnsxLDI1NH1AKVstISMkJSYnKisvMC05PT9BLVpeX2BhLXp7fH1+XSsoXFwuWy0hIyQlJicqKy8wLTk9P0EtWl5fYGEtent8fX5dKykqQFtBLVphLXowLTldKFtBLVphLXowLTktXXswLDYxfVtBLVphLXowLTldKT8oXFwuW0EtWmEtejAtOV0oW0EtWmEtejAtOS1dezAsNjF9W0EtWmEtejAtOV0pPykqJC87XHJcblx0cmV0dXJue1xyXG5cdFx0cmVzdHJpY3Q6XCJFQVwiLFxyXG5cdFx0cHJpb3JpdHk6LTEsXHJcblx0XHRyZXF1aXJlOic/bmdNb2RlbCcsXHJcblx0XHRsaW5rOmZ1bmN0aW9uKCRzY29wZSwkZWxlbSwkYXR0cnMsbmdNb2RlbEN0cmwpe1xyXG5cdFx0XHRpZihuZ01vZGVsQ3RybCAmJiBuZ01vZGVsQ3RybC4kdmFsaWRhdG9ycy5lbWFpbCl7XHJcblx0XHRcdFx0bmdNb2RlbEN0cmwuJHZhbGlkYXRvcnMuZW1haWwgPSBmdW5jdGlvbihtb2RlbFZhbHVlLCB2aWV3VmFsdWUpIHtcclxuXHRcdCAgICBcdFx0dmFyIHZhbHVlID0gbW9kZWxWYWx1ZSB8fCB2aWV3VmFsdWU7XHJcblx0XHQgICAgXHRcdHJldHVybiBuZ01vZGVsQ3RybC4kaXNFbXB0eSh2YWx1ZSkgfHwgRU1BSUxfUkVHRVhQLnRlc3QodmFsdWUpO1xyXG5cdFx0IFx0XHQgfTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufSlcclxuLmRpcmVjdGl2ZSgncmV0YWluRGVjaW1hbCcsZnVuY3Rpb24oKXtcclxuXHR2YXIgUk9VTkRVUF8wX1JFR0VYUCA9IC9eXFxkKyQvLFx0XHJcblx0XHRST1VORFVQXzFfUkVHRVhQID0gL15cXGQrKFxcLik/XFxkezAsMX0kLyxcclxuXHRcdFJPVU5EVVBfMl9SRUdFWFAgPSAvXlxcZCsoXFwuKT9cXGR7MCwyfSQvLFxyXG5cdFx0cmV0YWluQ29uZmlnID0ge1xyXG5cdFx0XHRyZXN0cmljdDpcIkFcIixcclxuXHRcdFx0cmVxdWlyZTonP25nTW9kZWwnLFxyXG5cdFx0XHRsaW5rOmZ1bmN0aW9uKCRzY29wZSwkZWxlbSwkYXR0cnMsbmdNb2RlbEN0cmwpe1xyXG5cdFx0XHRcdG5nTW9kZWxDdHJsLiRwYXJzZXJzLnB1c2goZnVuY3Rpb24odmFsdWUpe1xyXG5cdFx0XHRcdFx0dmFyIHJldGFpbkRlY2ltYWwgPSAkYXR0cnMucmV0YWluRGVjaW1hbCxcclxuXHRcdFx0XHRcdFx0bGFzdFZhbCA9IHZhbHVlLnN1YnN0cmluZygwLHZhbHVlLmxlbmd0aC0xKSxcclxuXHRcdFx0XHRcdFx0bGFzdENoYXIgPSB2YWx1ZS5jaGFyQXQodmFsdWUubGVuZ3RoLTEpLFxyXG5cdFx0XHRcdFx0XHRpc1ZhbGlkLHN0cjtcclxuXHRcdFx0XHRcdHN3aXRjaChyZXRhaW5EZWNpbWFsKXtcclxuXHRcdFx0XHRcdFx0Y2FzZSBcIjFcIjpcclxuXHRcdFx0XHRcdFx0XHRpc1ZhbGlkID0gUk9VTkRVUF8xX1JFR0VYUC50ZXN0KHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHRzdHIgPSAnLjAnO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwiMlwiOlxyXG5cdFx0XHRcdFx0XHRcdGlzVmFsaWQgPSBST1VORFVQXzJfUkVHRVhQLnRlc3QodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdHN0ciA9ICcuMDAnO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHRcdGlzVmFsaWQgPSBST1VORFVQXzBfUkVHRVhQLnRlc3QodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdHN0ciA9ICcnO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVx0XHRcdCAgICBcclxuXHRcdFx0XHRcdGlmKGlzVmFsaWQpe1xyXG5cdFx0XHRcdFx0XHRpZihsYXN0Q2hhciA9PSAnLicpe1xyXG5cdFx0XHRcdFx0XHRcdG5nTW9kZWxDdHJsLiRzZXRWaWV3VmFsdWUobGFzdFZhbCtzdHIpO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgXHRuZ01vZGVsQ3RybC4kcmVuZGVyKCk7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGxhc3RWYWwrc3RyO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcclxuXHRcdFx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdFx0XHRuZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKGxhc3RWYWwpO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgbmdNb2RlbEN0cmwuJHJlbmRlcigpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gbGFzdFZhbDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHRyZXR1cm4gcmV0YWluQ29uZmlnO1xyXG59KVxyXG4uZGlyZWN0aXZlKCdzZWFyY2hTZWxlY3QnLGZ1bmN0aW9uKCRzY2Upe1xyXG5cdHJldHVybntcclxuXHRcdHJlc3RyaWN0OlwiRUFcIixcclxuXHRcdHJlcGxhY2U6dHJ1ZSxcclxuXHRcdHRyYW5zY2x1ZGU6IHRydWUsXHJcblx0XHRyZXF1aXJlOic/bmdNb2RlbCcsXHJcblx0XHRzY29wZTp7XHJcblx0XHRcdG9wdGlvbnM6Jz0nLFxyXG5cdFx0XHRuYW1lOidAJ1xyXG5cdFx0fSxcclxuXHRcdHRlbXBsYXRlOlx0XHJcblx0XHRcdCc8ZGl2IGNsYXNzPVwidWkgZmx1aWQgc2VhcmNoIHNlbGVjdGlvbiBkcm9wZG93biB1cHdhcmRcIj5cXFxyXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cInt7bmFtZX19XCIgbmctbW9kZWw9XCJzZWxlY3RlZFZhbHVlXCI+XFxcclxuXHRcdFx0XHQ8aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+XFxcclxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCIgbmctYmluZD1cInNlbGVjdGVkVmFsdWVcIj48L2Rpdj5cXFxyXG5cdFx0XHQgIFx0PGRpdiBjbGFzcz1cIm1lbnUgdHJhbnNpdGlvbiBoaWRkZW5cIj5cXFxyXG5cdFx0XHQgICAgXHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtaW5kZXg9XCJ7e29wdGlvbi5pbmRleH19XCIgZGF0YS12YWx1ZT1cInt7b3B0aW9uLmluZGV4fX1cIiBuZy1yZXBlYXQgPSBcIm9wdGlvbiBpbiBvcHRpb25zXCIgbmctYmluZD1cIm9wdGlvbi5pdGVtXCI+PC9kaXY+XFxcclxuXHRcdFx0ICBcdDwvZGl2PlxcXHJcblx0XHRcdDwvZGl2PicsXHJcblx0XHRsaW5rOmZ1bmN0aW9uKCRzY29wZSwkZWxlbSwkYXR0cnMsbmdNb2RlbCl7XHJcblx0XHRcdCRlbGVtLmRyb3Bkb3duKHtcclxuXHRcdFx0XHRmdWxsVGV4dFNlYXJjaDp0cnVlLFxyXG5cdFx0XHRcdG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSwgdGV4dCwgJHNlbGVjdGVkSXRlbSkge1xyXG5cdFx0XHRcdFx0JHNjb3BlLiRhcHBseShmdW5jdGlvbigpe1xyXG5cdFx0XHRcdFx0XHRuZ01vZGVsLiRzZXRWaWV3VmFsdWUodmFsdWUpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdCAgICB9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRuZ01vZGVsLiRyZW5kZXIgPSBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdpdCBpcyAkcmVuZGVyJyk7XHJcblx0XHRcdFx0JGVsZW0uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsXCIzXCIpO1xyXG5cdFx0XHR9O1xyXG4vL1x0XHRcdCRlbGVtLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLFwiM1wiKTtcclxuXHRcdFx0JGF0dHJzLiRvYnNlcnZlKCduZ01vZGVsJyxmdW5jdGlvbih2YWwpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKHZhbCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ215QXBwLmNvbW1vbicpXHJcbi5mYWN0b3J5KCdodHRwSW50ZXJjZXB0b3InLGZ1bmN0aW9uKCRzY2UsJHJvb3RTY29wZSwkdGltZW91dCl7XHJcblx0dmFyIHN0YXJ0VGltZSxlbmRUaW1lO1xyXG5cdHJldHVybntcclxuXHRcdCdyZXF1ZXN0JzpmdW5jdGlvbihyZXEpe1xyXG5cdFx0XHRzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuXHRcdFx0JHJvb3RTY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHRcdFx0cmV0dXJuIHJlcTtcclxuXHRcdH0sXHJcblx0XHQncmVzcG9uc2UnOmZ1bmN0aW9uKHJlcyl7XHJcblx0XHRcdGVuZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuXHRcdFx0JHJvb3RTY29wZS4kZXZhbEFzeW5jKGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dmFyIGxvYWRpbmdUaW1lID0gZW5kVGltZS1zdGFydFRpbWU7XHJcblx0XHRcdFx0aWYobG9hZGluZ1RpbWUgPiA1MDApe1xyXG5cdFx0XHRcdFx0JHJvb3RTY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0XHQkdGltZW91dChmdW5jdGlvbigpe1xyXG5cdFx0XHRcdFx0XHQkcm9vdFNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdH0sNTAwKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gcmVzO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ215QXBwLmNvbW1vbicpXHJcbi5mYWN0b3J5KCd0ZXN0U2VydmljZScsZnVuY3Rpb24oJGh0dHAsJHEpe1xyXG5cdHJldHVybntcclxuXHRcdGdldE1haW46ZnVuY3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnbW9jay90ZXN0TmdSb3V0ZS1tYWluLmpzb24nKTtcclxuXHRcdH0sXHJcblx0XHRnZXRVc2VyOmZ1bmN0aW9uKCl7XHJcblx0XHRcdC8vIHJldHVybiAkaHR0cC5nZXQoJ21vY2svdGVzdE5nUm91dGUtdXNlci5qc29uJyk7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJ3VzZXIvMScpO1xyXG5cdFx0fSxcclxuXHRcdGdldFJlc3Q6ZnVuY3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnL3Jlc3RhcGkvbG9naW4nKTtcclxuXHRcdH1cclxuXHR9XHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5tYWluLmRyb3Bkb3duJylcclxuLmNvbnRyb2xsZXIoJ1Rlc3REcm9wRG93bkN0cmwnLGZ1bmN0aW9uKCRzY29wZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHNjZSl7XHJcbiAgICAkc2NvcGUuZHJvcGRvd25fbW9kZWwgPSAnaXRlbTMnO1xyXG5cclxuICAgICRzY29wZS5kcm9wZG93bl9yZXBlYXRfbW9kZWwgPSAnaXRlbTEnO1xyXG4gICAgJHNjb3BlLmRyb3Bkb3duX2l0ZW1zID0gW1xyXG4gICAgICAnaXRlbTEnLFxyXG4gICAgICAnaXRlbTInLFxyXG4gICAgICAnaXRlbTMnLFxyXG4gICAgICAnaXRlbTQnXHJcbiAgICBdO1xyXG5cclxuICAgICRzY29wZS5kcm9wZG93bl9rZXlfdmFsdWVfbW9kZWwgPSAnJztcclxuICAgICRzY29wZS5kcm9wZG93bl9rZXlfdmFsdWVfaXRlbXMgPSB7XHJcbiAgICAgICdpdGVtMSc6ICdDb29sIGl0ZW0gMScsXHJcbiAgICAgICdpdGVtMic6ICdDb29sIGl0ZW0gMicsXHJcbiAgICAgICdpdGVtMyc6ICdDb29sIGl0ZW0gMycsXHJcbiAgICAgICdpdGVtNCc6ICdDb29sIGl0ZW0gNCdcclxuICAgIH07XHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbicpXHJcbi5jb250cm9sbGVyKCdtYWluQ3RybCcsZnVuY3Rpb24oJHNjb3BlLCAkcm91dGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uLCBtYWluRGF0YSwgJHBhcnNlKXtcclxuXHQkc2NvcGUucGFnZU5hbWUgPSBtYWluRGF0YS5wYWdlTmFtZTtcclxuXHQkc2NvcGUubXlJbnB1dFZhbDEgPSBcIjExMVwiO1xyXG5cdCRzY29wZS5teUlucHV0VmFsMiA9IFwiXCI7XHJcblx0JHNjb3BlLm15SW5wdXRWYWwzID0gXCJcIjtcclxuXHQkc2NvcGUubXlJbnB1dFZhbDQgPSBcIlwiO1xyXG4vL1x0JHNjb3BlLmRhdGUgPSByZXN0RGF0YS5kYXRhLmRhdGU7XHJcbi8vXHRjb25zb2xlLmRlYnVnKHJlc3REYXRhKTtcclxuXHQkc2NvcGUuc2VsZWN0VmFsID0gXCJcIjtcclxuXHQkc2NvcGUucGFyZW50T3B0aW9ucyA9IFtcclxuXHRcdHtpdGVtOlwiQXJhYmljIENoaW5lc2VcIixzZWxlY3Q6dHJ1ZSxpbmRleDoxfSxcclxuXHRcdHtpdGVtOlwiQ2hpbmVzZSBcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6Mn0sXHJcblx0XHR7aXRlbTpcIkR1dGNoXCIsc2VsZWN0OmZhbHNlLGluZGV4OjN9LFxyXG5cdFx0e2l0ZW06XCJFbmdsaXNoXCIsc2VsZWN0OmZhbHNlLGluZGV4OjR9LFxyXG5cdFx0e2l0ZW06XCJGcmVuY2hcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6NX0sXHJcblx0XHR7aXRlbTpcIkdlcm1hblwiLHNlbGVjdDpmYWxzZSxpbmRleDo2fSxcclxuXHRcdHtpdGVtOlwiR3JlZWtcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6N30sXHJcblx0XHR7aXRlbTpcIkh1bmdhcmlhblwiLHNlbGVjdDpmYWxzZSxpbmRleDo4fSxcclxuXHRcdHtpdGVtOlwiSXRhbGlhblwiLHNlbGVjdDpmYWxzZSxpbmRleDo5fSxcclxuXHRcdHtpdGVtOlwiSmFwYW5lc2VcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTB9LFxyXG5cdFx0e2l0ZW06XCJLb3JlYW5cIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTF9LFxyXG5cdFx0e2l0ZW06XCJMaXRodWFuaWFuXCIsc2VsZWN0OmZhbHNlLGluZGV4OjEyfSxcclxuXHRcdHtpdGVtOlwiUGVyc2lhblwiLHNlbGVjdDpmYWxzZSxpbmRleDoxM30sXHJcblx0XHR7aXRlbTpcIlBvbGlzaFwiLHNlbGVjdDpmYWxzZSxpbmRleDoxNH0sXHJcblx0XHR7aXRlbTpcIlBvcnR1Z3Vlc2VcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTV9LFxyXG5cdFx0e2l0ZW06XCJSdXNzaWFuXCIsc2VsZWN0OmZhbHNlLGluZGV4OjE2fSxcclxuXHRcdHtpdGVtOlwiU3BhbmlzaFwiLHNlbGVjdDpmYWxzZSxpbmRleDoxN30sXHJcblx0XHR7aXRlbTpcIlN3ZWRpc2hcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTh9LFxyXG5cdFx0e2l0ZW06XCJUdXJraXNoXCIsc2VsZWN0OmZhbHNlLGluZGV4OjE5fSxcclxuXHRcdHtpdGVtOlwiVmlldG5hbWVzZVwiLHNlbGVjdDpmYWxzZSxpbmRleDoyMH1cclxuXHRdO1xyXG5cdCRzY29wZS51cGRhdGVWYWwgPSBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIHRleHQgPSBcIidpdCBpcyBteSB0ZXN0IXRoZSByZXN1bHQgaXM6JyArIG15SW5wdXRWYWwxXCI7XHJcblx0XHR2YXIgaW5wdXRGdWMgPSAkcGFyc2UodGV4dCk7XHJcblx0XHQkc2NvcGUubXlJbnB1dFZhbFJlcyA9IGlucHV0RnVjKCRzY29wZSk7XHJcblx0fVxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbi50aW55bWljZScpXHJcbi5jb250cm9sbGVyKCd0aW55bWljZUN0cmwnLGZ1bmN0aW9uKCRzY29wZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHNjZSl7XHJcbiAgIHZhciBjdHJsID0gdGhpcztcclxuXHQkc2NvcGUuc2V0dGluZyA9IHtcclxuXHRcdGlubGluZTogZmFsc2UsXHJcblx0ICBcdHBsdWdpbnM6IFwiYWR2bGlzdCBhdXRvbGluayBsaXN0cyBsaW5rIGltYWdlIGNoYXJtYXAgcHJpbnQgcHJldmlldyBhbmNob3JcIixcclxuICAgXHRcdHJlYWRvbmx5IDogJHNjb3BlLm9wZXJhdGUgPT09ICd2aWV3JyA/IHRydWUgOiBmYWxzZSxcclxuXHQgICAgc2tpbjogJ2xpZ2h0Z3JheScsXHJcbiAgICBcdHRoZW1lIDogJ21vZGVybicsXHJcbiAgICBcdG1pbl9oZWlnaHQ6IDIwMCxcclxuICAgIFx0bWF4X2hlaWdodDogNTAwXHJcblx0fTtcclxuICAgIHRoaXMudXBkYXRlSHRtbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBjdHJsLnRpbnltY2VIdG1sID0gJHNjZS50cnVzdEFzSHRtbChjdHJsLnRpbnltY2UpO1xyXG4gICAgfTtcclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ215QXBwLnVzZXInKVxyXG4uY29udHJvbGxlcigndXNlckN0cmwnLGZ1bmN0aW9uKCRzY29wZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgdXNlckRhdGEpe1xyXG5cdCRzY29wZS5wYWdlTmFtZSA9IHVzZXJEYXRhLnBhZ2VOYW1lO1xyXG5cdCRzY29wZS51c2VySWQgPSAkcm91dGVQYXJhbXMudXNlcklkO1xyXG5cdCRzY29wZS5mb28gPSBcInBsZWFzZSBpbnB1dCFcIjtcclxuXHR2YXIgY3RybCA9IHRoaXM7XHJcblx0Y29uc29sZS5sb2codGhpcyk7XHJcblx0Y29uc29sZS5sb2coY3RybCk7XHJcblx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbigpe1xyXG5cdFx0Y29uc29sZS5sb2coJ3RoaXMgdXBkYXRlJyk7XHJcblx0fTtcclxuXHR0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKCl7XHJcblx0XHRjb25zb2xlLmxvZygndGhpcyB1cGRhdGUnKTtcclxuXHR9O1xyXG5cdCRzY29wZS5leHBvcnRGaWxlID0gZnVuY3Rpb24gKCkge1xyXG4vL1x0XHRpZigkc2NvcGUudHlwZSA9PSBcIm9yZGVyUmVwb3J0c1wiKXtcclxuLy9cdFx0XHR2YXIgY3JpdGVyaWEgPSAkc2NvcGUuc2VhcmNoRmllbGRzRGF0YTtcclxuLy9cdFx0XHRpZihjcml0ZXJpYSl7XHJcbi8vXHRcdFx0XHR2YXIgcGFyYW1zID0ge1xyXG4vL1x0XHRcdFx0XHRzZWFyY2g6ICd7XCJjcml0ZXJpYVwiOicrIGFuZ3VsYXIudG9Kc29uKGNyaXRlcmlhKSArICd9J1xyXG4vL1x0XHRcdFx0fTtcclxuLy9cdFx0XHRcdGNvbW1vblNlcnYuZXhwb3J0UmVzdWx0V2l0aFBhcmFtcyhycHMuY29tbW9uVXJsICsgJ29yZGVyUmVwb3J0JyArIHJwcy5kb3dubG9hZCwgcGFyYW1zLCBcIk9yZGVyUmVwb3J0cy5jc3ZcIik7XHJcbi8vXHRcdFx0fWVsc2V7XHJcbi8vXHRcdFx0XHRjb21tb25TZXJ2LmV4cG9ydFJlc3VsdChycHMuY29tbW9uVXJsICsgJ29yZGVyUmVwb3J0JyArIHJwcy5kb3dubG9hZCwgbnVsbCwgXCJPcmRlclJlcG9ydHMuY3N2XCIpO1xyXG4vL1x0XHRcdH1cclxuLy9cdFx0fWVsc2UgaWYoJHNjb3BlLnR5cGUgPT0gXCJvcmRlckl0ZW1SZXBvcnRzXCIpe1xyXG4vL1x0XHRcdGNvbW1vblNlcnYuZXhwb3J0UmVzdWx0KHJwcy5jb21tb25VcmwgKyAnb3JkZXJJdGVtUmVwb3J0JyArIHJwcy5kb3dubG9hZCwgbnVsbCwgXCJJdGVtUmVwb3J0cy5jc3ZcIik7XHJcbi8vXHRcdH1lbHNlIGlmKCRzY29wZS50eXBlID09IFwiYXVkaXRzXCIpe1xyXG4vL1x0XHRcdHZhciBjcml0ZXJpYSA9ICRzY29wZS5zZWFyY2hGaWVsZHNEYXRhO1xyXG4vL1x0XHRcdGlmKGNyaXRlcmlhKXtcclxuLy9cdFx0XHRcdC8vIHZhciBzZWFyY2hGaWVsZHMgPSB7J2NyaXRlcmlhJzogY3JpdGVyaWF9O1xyXG4vL1x0XHRcdFx0Ly8gY29tbW9uU2Vydi5leHBvcnRSZXN1bHQocnBzLmNvbW1vblVybCArICdhdWRpdHMnICsgcnBzLmRvd25sb2FkICsgXCI/c2VhcmNoPVwiICsgYW5ndWxhci50b0pzb24oc2VhcmNoRmllbGRzKSwgbnVsbCwgXCJBdWRpdExvZ3MuY3N2XCIpO1xyXG4vL1xyXG4vL1x0XHRcdFx0JGh0dHAoe1xyXG4vL1x0XHRcdFx0XHRtZXRob2Q6ICdHRVQnLFxyXG4vL1x0XHRcdFx0XHR1cmw6IHJwcy5jb21tb25VcmwgKyAnYXVkaXRzJyArIHJwcy5kb3dubG9hZCxcclxuLy9cdFx0XHRcdFx0cGFyYW1zOiB7XHJcbi8vXHRcdFx0XHRcdFx0c2VhcmNoOiAne1wiY3JpdGVyaWFcIjonKyBhbmd1bGFyLnRvSnNvbihjcml0ZXJpYSkgKyAnfSdcclxuLy9cdFx0XHRcdFx0fVxyXG4vL1x0XHRcdFx0fSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuLy9cdFx0XHRcdFx0dmFyIGJsb2IgPSBuZXcgQmxvYihbcmVzcG9uc2UuZGF0YV0sIHtcclxuLy9cdFx0XHRcdFx0XHR0eXBlOiAndGV4dC9jc3Y7Y2hhcnNldD11dGYtOCdcclxuLy9cdFx0XHRcdFx0fSk7XHJcbi8vXHRcdFx0XHRcdHZhciBmaWxlTmFtZSA9IFwiXCI7XHJcbi8vXHRcdFx0XHRcdHRyeSB7XHJcbi8vXHRcdFx0XHRcdFx0ZmlsZU5hbWUgPSBuZXcgUmVnRXhwKCdmaWxlbmFtZT1cIiguKylcIicsICdpZycpLmV4ZWMocmVzcG9uc2UuaGVhZGVycygpWydjb250ZW50LWRpc3Bvc2l0aW9uJ10pWzFdO1xyXG4vL1x0XHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcbi8vXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZSk7XHJcbi8vXHRcdFx0XHRcdFx0ZmlsZU5hbWUgPSBcIkF1ZGl0TG9ncy5jc3ZcIjtcclxuLy9cdFx0XHRcdFx0fVxyXG4vL1x0XHRcdFx0XHRzYXZlQXMoYmxvYiwgZmlsZU5hbWUpO1xyXG4vL1x0XHRcdFx0fSk7XHJcbi8vXHJcbi8vXHRcdFx0fWVsc2V7XHJcbi8vXHRcdFx0XHRjb21tb25TZXJ2LmV4cG9ydFJlc3VsdChycHMuY29tbW9uVXJsICsgJ2F1ZGl0cycgKyBycHMuZG93bmxvYWQsIG51bGwsIFwiQXVkaXRMb2dzLmNzdlwiKTtcclxuLy9cdFx0XHR9XHJcbi8vXHRcdH1lbHNle1xyXG4vL1x0XHRcdGNvbW1vblNlcnYuZXhwb3J0UmVzdWx0KHJwcy5jb21tb25VcmwgKyAkc2NvcGUudHlwZSArIHJwcy5leHBvcnQsIG51bGwsIFwidGVtcGxhdGUuY3N2XCIpO1xyXG4vL1x0XHR9XHJcblx0XHR2YXIgdHlwZSA9ICRzY29wZS50eXBlLFxyXG5cdFx0XHRjcml0ZXJpYSA9ICRzY29wZS5zZWFyY2hGaWVsZHNEYXRhO1xyXG5cdFx0XHRcclxuXHRcdHN3aXRjaCh0eXBlKXtcclxuXHRcdFx0Y2FzZSAnJzpcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9O1xyXG59KTsiXX0=
