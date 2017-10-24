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
			return $http.get('mock/testNgRoute-user.json');
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
}]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsIm1vZHVsZS5qcyIsImRpcmVjdGl2ZS9hbmd1bGFyLXRpbnltY2UuanMiLCJkaXJlY3RpdmUvaW5wdXREaXJlLmpzIiwic2VydmljZS9pbnRlckNlcHRvclNlcnYuanMiLCJzZXJ2aWNlL3Rlc3RTZXJ2LmpzIiwiY29udHJvbGxlci9tYWluL2Ryb3Bkb3duQ3RybC5qcyIsImNvbnRyb2xsZXIvbWFpbi9tYWluQ3RybC5qcyIsImNvbnRyb2xsZXIvbWFpbi90aW55bWljZUN0cmwuanMiLCJjb250cm9sbGVyL3VzZXIvdXNlckN0cmwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsUUFBUSxPQUFPLFFBQVE7Q0FDdEI7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7R0FDRSxnRUFBTyxTQUFTLGdCQUFnQixtQkFBbUIsY0FBYzs7Q0FFbkUsR0FBRyxDQUFDLGNBQWMsU0FBUyxRQUFRLElBQUk7R0FDckMsY0FBYyxTQUFTLFFBQVEsTUFBTTs7OztDQUl2QyxjQUFjLFNBQVMsUUFBUSxPQUFPLHNCQUFzQjtDQUM1RCxjQUFjLFNBQVMsUUFBUSxJQUFJLG1CQUFtQjtDQUN0RCxjQUFjLFNBQVMsUUFBUSxJQUFJLFlBQVk7OztDQUcvQztFQUNDLEtBQUssSUFBSTtFQUNULFlBQVk7RUFDWixXQUFXO0VBQ1gsUUFBUTtHQUNQLHlCQUFTLFNBQVMsWUFBWTtJQUM3QixPQUFPLFlBQVksVUFBVSxLQUFLLFNBQVMsSUFBSTtLQUM5QyxPQUFPLElBQUk7T0FDVCxNQUFNLFNBQVMsSUFBSTtLQUNyQixPQUFPLElBQUk7Ozs7Ozs7Ozs7OztFQVlkLEtBQUssZ0JBQWdCO0VBQ3JCLFlBQVk7RUFDWixXQUFXO0VBQ1gsUUFBUTtHQUNQLHlCQUFTLFNBQVMsWUFBWTtJQUM3QixPQUFPLFlBQVksVUFBVSxLQUFLLFNBQVMsSUFBSTtLQUM5QyxPQUFPLElBQUk7Ozs7RUFJZCxlQUFlOztFQUVmLEtBQUssWUFBWTtFQUNqQixZQUFZO0VBQ1osV0FB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VSxPQUFPLE1BQU0sTUFBTTtFQUNuQyxDQUFDLEtBQUssVUFBVSxPQUFPLE1BQU0sTUFBTTtFQUNuQyxDQUFDLEtBQUssVUFBVSxPQUFPLE1BQU0sTUFBTTtFQUNuQyxDQUFDLEtBQUssYUFBYSxPQUFPLE1BQU0sTUFBTTs7Q0FFdkMsT0FBTyxZQUFZLFVBQVU7RUFDNUIsSUFBSSxPQUFPO0VBQ1gsSUFBSSxXQUFXLE9BQU87RUFDdEIsT0FBTyxnQkFBZ0IsU0FBUzs7SUFFL0I7QUNyQ0gsUUFBUSxPQUFPO0NBQ2QsV0FBVyx5RUFBZSxTQUFTLFFBQVEsUUFBUSxjQUFjLFdBQVcsS0FBSztHQUMvRSxJQUFJLE9BQU87Q0FDYixPQUFPLFVBQVU7RUFDaEIsUUFBUTtJQUNOLFNBQVM7S0FDUixXQUFXLE9BQU8sWUFBWSxTQUFTLE9BQU87S0FDOUMsTUFBTTtLQUNOLFFBQVE7S0FDUixZQUFZO0tBQ1osWUFBWTs7SUFFYixLQUFLLGFBQWEsV0FBVztNQUMzQixLQUFLLGNBQWMsS0FBSyxZQUFZLEtBQUs7O0lBRTVDO0FDZkgsUUFBUSxPQUFPO0NBQ2QsV0FBVyx5RUFBVyxTQUFTLFFBQVEsUUFBUSxjQUFjLFdBQVcsU0FBUztDQUNqRixPQUFPLFdBQVcsU0FBUztDQUMzQixPQUFPLFNBQVMsYUFBYTtDQUM3QixPQUFPLE1BQU07Q0FDYixJQUFJLE9BQU87Q0FDWCxRQUFRLElBQUk7Q0FDWixRQUFRLElBQUk7Q0FDWixLQUFLLFNBQVMsVUFBVTtFQUN2QixRQUFRLElBQUk7O0NBRWIsS0FBSyxTQUFTLFVBQVU7RUFDdkIsUUFBUSxJQUFJOztJQUVYIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdteUFwcCcsW1xyXG5cdCduZ1JvdXRlJyxcclxuXHQnYW5ndWxhclRyaXgnLFxyXG5cdCdhbmd1bGFyaWZ5LnNlbWFudGljLmRyb3Bkb3duJyxcclxuXHQndWkudGlueW1jZScsXHJcblx0J215QXBwLmNvbW1vbicsXHJcblx0J215QXBwLm1haW4nLFxyXG5cdCdteUFwcC51c2VyJ1xyXG5dKS5jb25maWcoZnVuY3Rpb24oJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkaHR0cFByb3ZpZGVyKXtcclxuICAgIC8vSW5pdGlhbGl6ZSBHZXQgUmVxdWVzdFxyXG5cdGlmKCEkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0KXtcclxuXHQgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXQgPSB7fTtcclxuXHR9XHJcblxyXG5cdC8vRGlzYWJsZSBJRSBBamF4IFJlcXVlc3QgQ2FjaGVcclxuXHQkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xyXG5cdCRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXRbJ0NhY2hlLUNvbnRyb2wnXSA9ICduby1jYWNoZSc7XHJcblx0JGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldFsnUHJhZ21hJ10gPSAnbm8tY2FjaGUnO1xyXG5cdFxyXG5cdC8vcm91dGUgc2V0dGluZ1xyXG5cdCRyb3V0ZVByb3ZpZGVyXHJcblx0LndoZW4oJy8nLHtcclxuXHRcdHRlbXBsYXRlVXJsOid0ZW1wbGF0ZS90ZXN0TmdSb3V0ZS1tYWluLmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjonbWFpbkN0cmwnLFxyXG5cdFx0cmVzb2x2ZTp7XHJcblx0XHRcdG1haW5EYXRhOmZ1bmN0aW9uKHRlc3RTZXJ2aWNlKXtcclxuXHRcdFx0XHRyZXR1cm4gdGVzdFNlcnZpY2UuZ2V0TWFpbigpLnRoZW4oZnVuY3Rpb24ocmVzKXtcclxuXHRcdFx0XHRcdHJldHVybiByZXMuZGF0YTtcclxuXHRcdFx0XHR9KS5jYXRjaChmdW5jdGlvbihlcnIpe1xyXG5cdFx0XHRcdFx0cmV0dXJuIGVyci5kYXRhO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcbi8vXHRcdFx0cmVzdERhdGE6ZnVuY3Rpb24odGVzdFNlcnZpY2Upe1xyXG4vL1x0XHRcdFx0cmV0dXJuIHRlc3RTZXJ2aWNlLmdldFJlc3QoKS50aGVuKGZ1bmN0aW9uKHJlcyl7XHJcbi8vXHRcdFx0XHRcdHJldHVybiByZXMuZGF0YTtcclxuLy9cdFx0XHRcdH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XHJcbi8vXHRcdFx0XHRcdHJldHVybiBlcnIuZGF0YTtcclxuLy9cdFx0XHRcdH0pO1xyXG4vL1x0XHRcdH1cclxuXHRcdH1cclxuXHR9KVxyXG5cdC53aGVuKCcvdXNlci86dXNlcklkJyx7XHJcblx0XHR0ZW1wbGF0ZVVybDondGVtcGxhdGUvdGVzdE5nUm91dGUtdXNlci5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6J3VzZXJDdHJsJyxcclxuXHRcdHJlc29sdmU6e1xyXG5cdFx0XHR1c2VyRGF0YTpmdW5jdGlvbih0ZXN0U2VydmljZSl7XHJcblx0XHRcdFx0cmV0dXJuIHRlc3RTZXJ2aWNlLmdldFVzZXIoKS50aGVuKGZ1bmN0aW9uKHJlcyl7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmVzLmRhdGE7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRyZWxvYWRPblNlYXJjaDpmYWxzZVxyXG5cdH0pXHJcblx0LndoZW4oJy90aW55bWljZScse1xyXG5cdFx0dGVtcGxhdGVVcmw6J3RlbXBsYXRlL3RpbnltaWNlLmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjondGlueW1pY2VDdHJsJyxcclxuXHRcdHJlbG9hZE9uU2VhcmNoOmZhbHNlXHJcblx0fSlcclxuXHQud2hlbignL2Ryb3Bkb3duJyx7XHJcblx0XHR0ZW1wbGF0ZVVybDondGVtcGxhdGUvZHJvcGRvd24uaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOidUZXN0RHJvcERvd25DdHJsJyxcclxuXHRcdHJlbG9hZE9uU2VhcmNoOmZhbHNlXHJcblx0fSlcclxuXHQub3RoZXJ3aXNlKHtcclxuXHRcdHJlZGlyZWN0VG86Jy8nXHJcblx0fSk7XHJcblx0XHJcblx0Ly9odG1sNSBtb2RlIHNldHRpbmdcclxuXHQkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUoZmFsc2UpO1xyXG5cdCRsb2NhdGlvblByb3ZpZGVyLmhhc2hQcmVmaXgoJycpO1xyXG5cclxuXHQvL0ludGVyY2VwdG9yXHJcblx0JGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaCgnaHR0cEludGVyY2VwdG9yJyk7XHJcblx0Y29uc29sZS5sb2coJ3RoZSBhbmd1bGFyIGFwcCBpcyBzdGFydCEnKTtcclxufSlcclxuLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCR0ZW1wbGF0ZUNhY2hlKXtcclxuXHQkcm9vdFNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuICAgICRyb290U2NvcGUuJG9uKCckcm91dGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uKGV2ZW50LCBuZXh0LCBjdXJyZW50KSB7ICBcclxuICAgICAgICBpZiAodHlwZW9mKGN1cnJlbnQpICE9PSAndW5kZWZpbmVkJyl7ICBcclxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucmVtb3ZlKGN1cnJlbnQudGVtcGxhdGVVcmwpOyAgXHJcbiAgICAgICAgfSAgXHJcbiAgICB9KTtcclxuICAgICRyb290U2NvcGUuJG9uKCckcm91dGVVcGRhdGUnLGZ1bmN0aW9uKGV2ZW50LCBuZXh0LCBjdXJyZW50KXtcclxuICAgIFx0Y29uc29sZS5sb2coZXZlbnQpO1xyXG4gICAgXHRjb25zb2xlLmxvZyhuZXh0KTtcclxuICAgIFx0Y29uc29sZS5sb2coY3VycmVudCk7XHJcbiAgICB9KTtcclxufSk7XHJcbmFuZ3VsYXIuZWxlbWVudChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcclxuICAgYW5ndWxhci5ib290c3RyYXAoZG9jdW1lbnQsWydteUFwcCddKTtcclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5jb21tb24nLFtdKTtcclxuYW5ndWxhci5tb2R1bGUoJ215QXBwLm1haW4nLFsnbXlBcHAubWFpbi50aW55bWljZScsJ215QXBwLm1haW4uZHJvcGRvd24nXSk7XHJcbmFuZ3VsYXIubW9kdWxlKCdteUFwcC5tYWluLnRpbnltaWNlJyxbJ215QXBwLmNvbW1vbicsJ3VpLnRpbnltY2UnXSk7XHJcbmFuZ3VsYXIubW9kdWxlKCdteUFwcC5tYWluLmRyb3Bkb3duJyxbJ215QXBwLmNvbW1vbicsJ2FuZ3VsYXJpZnkuc2VtYW50aWMuZHJvcGRvd24nXSk7XHJcbmFuZ3VsYXIubW9kdWxlKCdteUFwcC51c2VyJyxbJ215QXBwLmNvbW1vbiddKTsiLCIvKipcbiAqIEJpbmRzIGEgVGlueU1DRSB3aWRnZXQgdG8gPHRleHRhcmVhPiBlbGVtZW50cy5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3VpLnRpbnltY2UnLCBbXSlcbiAgLnZhbHVlKCd1aVRpbnltY2VDb25maWcnLCB7fSlcbiAgLmRpcmVjdGl2ZSgndWlUaW55bWNlJywgWyckcm9vdFNjb3BlJywgJyRjb21waWxlJywgJyR0aW1lb3V0JywgJyR3aW5kb3cnLCAnJHNjZScsICd1aVRpbnltY2VDb25maWcnLCAndWlUaW55bWNlU2VydmljZScsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRjb21waWxlLCAkdGltZW91dCwgJHdpbmRvdywgJHNjZSwgdWlUaW55bWNlQ29uZmlnLCB1aVRpbnltY2VTZXJ2aWNlKSB7XG4gICAgdWlUaW55bWNlQ29uZmlnID0gdWlUaW55bWNlQ29uZmlnIHx8IHt9O1xuXG4gICAgaWYgKHVpVGlueW1jZUNvbmZpZy5iYXNlVXJsKSB7XG4gICAgICB0aW55bWNlLmJhc2VVUkwgPSB1aVRpbnltY2VDb25maWcuYmFzZVVybDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcmVxdWlyZTogWyduZ01vZGVsJywgJ14/Zm9ybSddLFxuICAgICAgcHJpb3JpdHk6IDU5OSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybHMpIHtcbiAgICAgICAgaWYgKCEkd2luZG93LnRpbnltY2UpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbmdNb2RlbCA9IGN0cmxzWzBdLFxuICAgICAgICAgIGZvcm0gPSBjdHJsc1sxXSB8fCBudWxsO1xuXG4gICAgICAgIHZhciBleHByZXNzaW9uLCBvcHRpb25zID0ge1xuICAgICAgICAgIGRlYm91bmNlOiB0cnVlXG4gICAgICAgIH0sIHRpbnlJbnN0YW5jZSxcbiAgICAgICAgICB1cGRhdGVWaWV3ID0gZnVuY3Rpb24oZWRpdG9yKSB7XG4gICAgICAgICAgICB2YXIgY29udGVudCA9IGVkaXRvci5nZXRDb250ZW50KHtmb3JtYXQ6IG9wdGlvbnMuZm9ybWF0fSkudHJpbSgpO1xuICAgICAgICAgICAgY29udGVudCA9ICRzY2UudHJ1c3RBc0h0bWwoY29udGVudCk7XG5cbiAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShjb250ZW50KTtcbiAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS4kJHBoYXNlKSB7XG4gICAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIHRvZ2dsZURpc2FibGUoZGlzYWJsZWQpIHtcbiAgICAgICAgICBpZiAoZGlzYWJsZWQpIHtcbiAgICAgICAgICAgIGVuc3VyZUluc3RhbmNlKCk7XG5cbiAgICAgICAgICAgIGlmICh0aW55SW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgdGlueUluc3RhbmNlLmdldEJvZHkoKS5zZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZW5zdXJlSW5zdGFuY2UoKTtcblxuICAgICAgICAgICAgaWYgKHRpbnlJbnN0YW5jZSAmJiAhdGlueUluc3RhbmNlLnNldHRpbmdzLnJlYWRvbmx5ICYmIHRpbnlJbnN0YW5jZS5nZXREb2MoKSkge1xuICAgICAgICAgICAgICB0aW55SW5zdGFuY2UuZ2V0Qm9keSgpLnNldEF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJywgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmV0Y2ggYSB1bmlxdWUgSUQgZnJvbSB0aGUgc2VydmljZVxuICAgICAgICB2YXIgdW5pcXVlSWQgPSB1aVRpbnltY2VTZXJ2aWNlLmdldFVuaXF1ZUlkKCk7XG4gICAgICAgIGF0dHJzLiRzZXQoJ2lkJywgdW5pcXVlSWQpO1xuXG4gICAgICAgIGV4cHJlc3Npb24gPSB7fTtcblxuICAgICAgICBhbmd1bGFyLmV4dGVuZChleHByZXNzaW9uLCBzY29wZS4kZXZhbChhdHRycy51aVRpbnltY2UpKTtcblxuICAgICAgICAvL0RlYm91bmNlIHVwZGF0ZSBhbmQgc2F2ZSBhY3Rpb25cbiAgICAgICAgdmFyIGRlYm91bmNlZFVwZGF0ZSA9IChmdW5jdGlvbihkZWJvdW5jZWRVcGRhdGVEZWxheSkge1xuICAgICAgICAgIHZhciBkZWJvdW5jZWRVcGRhdGVUaW1lcjtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oZWQpIHtcblx0ICAgICAgICAkdGltZW91dC5jYW5jZWwoZGVib3VuY2VkVXBkYXRlVGltZXIpO1xuXHQgICAgICAgICBkZWJvdW5jZWRVcGRhdGVUaW1lciA9ICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICByZXR1cm4gKGZ1bmN0aW9uKGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVkLmlzRGlydHkoKSkge1xuICAgICAgICAgICAgICAgICAgZWQuc2F2ZSgpO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlVmlldyhlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KShlZCk7XG4gICAgICAgICAgICB9LCBkZWJvdW5jZWRVcGRhdGVEZWxheSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSkoNDAwKTtcblxuICAgICAgICB2YXIgc2V0dXBPcHRpb25zID0ge1xuICAgICAgICAgIC8vIFVwZGF0ZSBtb2RlbCB3aGVuIGNhbGxpbmcgc2V0Q29udGVudFxuICAgICAgICAgIC8vIChzdWNoIGFzIGZyb20gdGhlIHNvdXJjZSBlZGl0b3IgcG9wdXApXG4gICAgICAgICAgc2V0dXA6IGZ1bmN0aW9uKGVkKSB7XG4gICAgICAgICAgICBlZC5vbignaW5pdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBuZ01vZGVsLiRyZW5kZXIoKTtcbiAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0UHJpc3RpbmUoKTtcbiAgICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRVbnRvdWNoZWQoKTtcbiAgICAgICAgICAgICAgaWYgKGZvcm0pIHtcbiAgICAgICAgICAgICAgICBmb3JtLiRzZXRQcmlzdGluZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIG1vZGVsIHdoZW46XG4gICAgICAgICAgICAvLyAtIGEgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWQgW0V4ZWNDb21tYW5kXVxuICAgICAgICAgICAgLy8gLSB0aGUgZWRpdG9yIGNvbnRlbnQgaGFzIGJlZW4gbW9kaWZpZWQgW2NoYW5nZV1cbiAgICAgICAgICAgIC8vIC0gdGhlIG5vZGUgaGFzIGNoYW5nZWQgW05vZGVDaGFuZ2VdXG4gICAgICAgICAgICAvLyAtIGFuIG9iamVjdCBoYXMgYmVlbiByZXNpemVkICh0YWJsZSwgaW1hZ2UpIFtPYmplY3RSZXNpemVkXVxuICAgICAgICAgICAgZWQub24oJ0V4ZWNDb21tYW5kIGNoYW5nZSBOb2RlQ2hhbmdlIE9iamVjdFJlc2l6ZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgaWYgKCFvcHRpb25zLmRlYm91bmNlKSB7XG4gICAgICAgICAgICAgICAgZWQuc2F2ZSgpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVZpZXcoZWQpO1xuICAgICAgICAgICAgICBcdHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBkZWJvdW5jZWRVcGRhdGUoZWQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGVkLm9uKCdibHVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnRbMF0uYmx1cigpO1xuICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRUb3VjaGVkKCk7XG4gICAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS4kJHBoYXNlKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZWQub24oJ3JlbW92ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZSgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh1aVRpbnltY2VDb25maWcuc2V0dXApIHtcbiAgICAgICAgICAgICAgdWlUaW55bWNlQ29uZmlnLnNldHVwKGVkLCB7XG4gICAgICAgICAgICAgICAgdXBkYXRlVmlldzogdXBkYXRlVmlld1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGV4cHJlc3Npb24uc2V0dXApIHtcbiAgICAgICAgICAgICAgZXhwcmVzc2lvbi5zZXR1cChlZCwge1xuICAgICAgICAgICAgICAgIHVwZGF0ZVZpZXc6IHVwZGF0ZVZpZXdcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBmb3JtYXQ6IGV4cHJlc3Npb24uZm9ybWF0IHx8ICdodG1sJyxcbiAgICAgICAgICBzZWxlY3RvcjogJyMnICsgYXR0cnMuaWRcbiAgICAgICAgfTtcbiAgICAgICAgLy8gZXh0ZW5kIG9wdGlvbnMgd2l0aCBpbml0aWFsIHVpVGlueW1jZUNvbmZpZyBhbmRcbiAgICAgICAgLy8gb3B0aW9ucyBmcm9tIGRpcmVjdGl2ZSBhdHRyaWJ1dGUgdmFsdWVcbiAgICAgICAgYW5ndWxhci5leHRlbmQob3B0aW9ucywgdWlUaW55bWNlQ29uZmlnLCBleHByZXNzaW9uLCBzZXR1cE9wdGlvbnMpO1xuICAgICAgICAvLyBXcmFwcGVkIGluICR0aW1lb3V0IGR1ZSB0byAkdGlueW1jZTpyZWZyZXNoIGltcGxlbWVudGF0aW9uLCByZXF1aXJlc1xuICAgICAgICAvLyBlbGVtZW50IHRvIGJlIHByZXNlbnQgaW4gRE9NIGJlZm9yZSBpbnN0YW50aWF0aW5nIGVkaXRvciB3aGVuXG4gICAgICAgIC8vIHJlLXJlbmRlcmluZyBkaXJlY3RpdmVcbiAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuYmFzZVVSTCl7XG4gICAgICAgICAgICB0aW55bWNlLmJhc2VVUkwgPSBvcHRpb25zLmJhc2VVUkw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBtYXliZUluaXRQcm9taXNlID0gdGlueW1jZS5pbml0KG9wdGlvbnMpO1xuICAgICAgICAgIGlmKG1heWJlSW5pdFByb21pc2UgJiYgdHlwZW9mIG1heWJlSW5pdFByb21pc2UudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgbWF5YmVJbml0UHJvbWlzZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB0b2dnbGVEaXNhYmxlKHNjb3BlLiRldmFsKGF0dHJzLm5nRGlzYWJsZWQpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0b2dnbGVEaXNhYmxlKHNjb3BlLiRldmFsKGF0dHJzLm5nRGlzYWJsZWQpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5nTW9kZWwuJGZvcm1hdHRlcnMudW5zaGlmdChmdW5jdGlvbihtb2RlbFZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWUgPyAkc2NlLnRydXN0QXNIdG1sKG1vZGVsVmFsdWUpIDogJyc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5nTW9kZWwuJHBhcnNlcnMudW5zaGlmdChmdW5jdGlvbih2aWV3VmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gdmlld1ZhbHVlID8gJHNjZS5nZXRUcnVzdGVkSHRtbCh2aWV3VmFsdWUpIDogJyc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5nTW9kZWwuJHJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGVuc3VyZUluc3RhbmNlKCk7XG5cbiAgICAgICAgICB2YXIgdmlld1ZhbHVlID0gbmdNb2RlbC4kdmlld1ZhbHVlID9cbiAgICAgICAgICAgICRzY2UuZ2V0VHJ1c3RlZEh0bWwobmdNb2RlbC4kdmlld1ZhbHVlKSA6ICcnO1xuXG4gICAgICAgICAgLy8gaW5zdGFuY2UuZ2V0RG9jKCkgY2hlY2sgaXMgYSBndWFyZCBhZ2FpbnN0IG51bGwgdmFsdWVcbiAgICAgICAgICAvLyB3aGVuIGRlc3RydWN0aW9uICYgcmVjcmVhdGlvbiBvZiBpbnN0YW5jZXMgaGFwcGVuXG4gICAgICAgICAgaWYgKHRpbnlJbnN0YW5jZSAmJlxuICAgICAgICAgICAgdGlueUluc3RhbmNlLmdldERvYygpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB0aW55SW5zdGFuY2Uuc2V0Q29udGVudCh2aWV3VmFsdWUpO1xuICAgICAgICAgICAgLy8gVHJpZ2dlcmluZyBjaGFuZ2UgZXZlbnQgZHVlIHRvIFRpbnlNQ0Ugbm90IGZpcmluZyBldmVudCAmXG4gICAgICAgICAgICAvLyBiZWNvbWluZyBvdXQgb2Ygc3luYyBmb3IgY2hhbmdlIGNhbGxiYWNrc1xuICAgICAgICAgICAgdGlueUluc3RhbmNlLmZpcmUoJ2NoYW5nZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBhdHRycy4kb2JzZXJ2ZSgnZGlzYWJsZWQnLCB0b2dnbGVEaXNhYmxlKTtcblxuICAgICAgICAvLyBUaGlzIGJsb2NrIGlzIGJlY2F1c2Ugb2YgVGlueU1DRSBub3QgcGxheWluZyB3ZWxsIHdpdGggcmVtb3ZhbCBhbmRcbiAgICAgICAgLy8gcmVjcmVhdGlvbiBvZiBpbnN0YW5jZXMsIHJlcXVpcmluZyBpbnN0YW5jZXMgdG8gaGF2ZSBkaWZmZXJlbnRcbiAgICAgICAgLy8gc2VsZWN0b3JzIGluIG9yZGVyIHRvIHJlbmRlciBuZXcgaW5zdGFuY2VzIHByb3Blcmx5XG4gICAgICAgIHZhciB1bmJpbmRFdmVudExpc3RlbmVyID0gc2NvcGUuJG9uKCckdGlueW1jZTpyZWZyZXNoJywgZnVuY3Rpb24oZSwgaWQpIHtcbiAgICAgICAgICB2YXIgZWlkID0gYXR0cnMuaWQ7XG4gICAgICAgICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQoaWQpIHx8IGlkID09PSBlaWQpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnRFbGVtZW50ID0gZWxlbWVudC5wYXJlbnQoKTtcbiAgICAgICAgICAgIHZhciBjbG9uZWRFbGVtZW50ID0gZWxlbWVudC5jbG9uZSgpO1xuICAgICAgICAgICAgY2xvbmVkRWxlbWVudC5yZW1vdmVBdHRyKCdpZCcpO1xuICAgICAgICAgICAgY2xvbmVkRWxlbWVudC5yZW1vdmVBdHRyKCdzdHlsZScpO1xuICAgICAgICAgICAgY2xvbmVkRWxlbWVudC5yZW1vdmVBdHRyKCdhcmlhLWhpZGRlbicpO1xuICAgICAgICAgICAgdGlueW1jZS5leGVjQ29tbWFuZCgnbWNlUmVtb3ZlRWRpdG9yJywgZmFsc2UsIGVpZCk7XG4gICAgICAgICAgICBwYXJlbnRFbGVtZW50LmFwcGVuZCgkY29tcGlsZShjbG9uZWRFbGVtZW50KShzY29wZSkpO1xuICAgICAgICAgICAgdW5iaW5kRXZlbnRMaXN0ZW5lcigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGVuc3VyZUluc3RhbmNlKCk7XG5cbiAgICAgICAgICBpZiAodGlueUluc3RhbmNlKSB7XG4gICAgICAgICAgICB0aW55SW5zdGFuY2UucmVtb3ZlKCk7XG4gICAgICAgICAgICB0aW55SW5zdGFuY2UgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gZW5zdXJlSW5zdGFuY2UoKSB7XG4gICAgICAgICAgaWYgKCF0aW55SW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRpbnlJbnN0YW5jZSA9IHRpbnltY2UuZ2V0KGF0dHJzLmlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XSlcbiAgLnNlcnZpY2UoJ3VpVGlueW1jZVNlcnZpY2UnLCBbXG4gICAgLyoqXG4gICAgICogQSBzZXJ2aWNlIGlzIHVzZWQgdG8gY3JlYXRlIHVuaXF1ZSBJRCdzLCB0aGlzIHByZXZlbnRzIGR1cGxpY2F0ZSBJRCdzIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBlZGl0b3JzIG9uIHNjcmVlbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBVSVRpbnltY2VTZXJ2aWNlID0gZnVuY3Rpb24oKSB7XG4gICBcdCAgICB2YXIgSURfQVRUUiA9ICd1aS10aW55bWNlJztcbiAgICBcdC8vIHVuaXF1ZUlkIGtlZXBzIHRyYWNrIG9mIHRoZSBsYXRlc3QgYXNzaWduZWQgSURcbiAgICBcdHZhciB1bmlxdWVJZCA9IDA7XG4gICAgICAgIC8vIGdldFVuaXF1ZUlkIHJldHVybnMgYSB1bmlxdWUgSURcbiAgICBcdHZhciBnZXRVbmlxdWVJZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHVuaXF1ZUlkICsrO1xuICAgICAgICAgIHJldHVybiBJRF9BVFRSICsgJy0nICsgdW5pcXVlSWQ7XG4gICAgICAgIH07XG4gICAgICAgIC8vIHJldHVybiB0aGUgZnVuY3Rpb24gYXMgYSBwdWJsaWMgbWV0aG9kIG9mIHRoZSBzZXJ2aWNlXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgIFx0Z2V0VW5pcXVlSWQ6IGdldFVuaXF1ZUlkXG4gICAgICAgIH07XG4gICAgICB9O1xuICAgICAgLy8gcmV0dXJuIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBzZXJ2aWNlXG4gICAgICByZXR1cm4gbmV3IFVJVGlueW1jZVNlcnZpY2UoKTtcbiAgICB9XG4gIF0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ215QXBwLmNvbW1vbicpXHJcbi5kaXJlY3RpdmUoJ215SW5wdXRQYXJzZScsZnVuY3Rpb24oKXtcclxuXHRyZXR1cm57XHJcblx0XHRyZXN0cmljdDpcIkVBXCIsXHJcblx0XHRwcmlvcml0eTotMSxcclxuXHRcdHJlcXVpcmU6Jz9uZ01vZGVsJyxcclxuXHRcdGxpbms6ZnVuY3Rpb24oJHNjb3BlLCAkZWxlbSwgJGF0dHJzLCBuZ01vZGVsQ3RybCl7XHJcblx0XHRcdGlmKCFuZ01vZGVsQ3RybCkgcmV0dXJuO1xyXG5cdFx0XHRjb25zb2xlLmxvZygnbXlJbnB1dFBhcnNlJyk7XHJcblx0XHRcdG5nTW9kZWxDdHJsLiRwYXJzZXJzLnB1c2goZnVuY3Rpb24odmFsdWUpe1xyXG4vL1x0XHRcdFx0dmFyIFZBTElEX1JFR0VYUCA9IC9eXFx3KyQvLFxyXG5cdFx0XHRcdHZhciBWQUxJRF9SRUdFWFAgPSAvXlxcZCtcXC4/XFxkezAsMn0kLyxcclxuXHRcdFx0IFx0aXNWYWxpZCA9IFZBTElEX1JFR0VYUC50ZXN0KHZhbHVlKSxcclxuXHRcdFx0ICAgIGxhc3RWYWwgPSB2YWx1ZS5zdWJzdHJpbmcoMCx2YWx1ZS5sZW5ndGgtMSk7XHJcblx0XHRcdCAgICBcclxuXHRcdFx0XHRpZihpc1ZhbGlkKXtcclxuXHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcclxuXHRcdFx0XHR9ZWxzZXtcclxuXHRcdFx0XHRcdG5nTW9kZWxDdHJsLiRzZXRWaWV3VmFsdWUobGFzdFZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmdNb2RlbEN0cmwuJHJlbmRlcigpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIGxhc3RWYWw7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcbn0pXHJcbi5kaXJlY3RpdmUoJ2NvbXBhbnlFbWFpbFZhbGlkYXRvcicsZnVuY3Rpb24oKXtcclxuLypjaGFuZ2UgZW1haWwgdmFsaWRhdG9yIHJ1bGVzOlVwIHRvIDI1NCBjaGFyYWN0ZXIgYmVmb3JlICdAJyovXHJcblx0dmFyIEVNQUlMX1JFR0VYUCA9IC9eKD89LnsxLDI1NH0kKSg/PS57MSwyNTR9QClbLSEjJCUmJyorLzAtOT0/QS1aXl9gYS16e3x9fl0rKFxcLlstISMkJSYnKisvMC05PT9BLVpeX2BhLXp7fH1+XSspKkBbQS1aYS16MC05XShbQS1aYS16MC05LV17MCw2MX1bQS1aYS16MC05XSk/KFxcLltBLVphLXowLTldKFtBLVphLXowLTktXXswLDYxfVtBLVphLXowLTldKT8pKiQvO1xyXG5cdHJldHVybntcclxuXHRcdHJlc3RyaWN0OlwiRUFcIixcclxuXHRcdHByaW9yaXR5Oi0xLFxyXG5cdFx0cmVxdWlyZTonP25nTW9kZWwnLFxyXG5cdFx0bGluazpmdW5jdGlvbigkc2NvcGUsJGVsZW0sJGF0dHJzLG5nTW9kZWxDdHJsKXtcclxuXHRcdFx0aWYobmdNb2RlbEN0cmwgJiYgbmdNb2RlbEN0cmwuJHZhbGlkYXRvcnMuZW1haWwpe1xyXG5cdFx0XHRcdG5nTW9kZWxDdHJsLiR2YWxpZGF0b3JzLmVtYWlsID0gZnVuY3Rpb24obW9kZWxWYWx1ZSwgdmlld1ZhbHVlKSB7XHJcblx0XHQgICAgXHRcdHZhciB2YWx1ZSA9IG1vZGVsVmFsdWUgfHwgdmlld1ZhbHVlO1xyXG5cdFx0ICAgIFx0XHRyZXR1cm4gbmdNb2RlbEN0cmwuJGlzRW1wdHkodmFsdWUpIHx8IEVNQUlMX1JFR0VYUC50ZXN0KHZhbHVlKTtcclxuXHRcdCBcdFx0IH07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn0pXHJcbi5kaXJlY3RpdmUoJ3JldGFpbkRlY2ltYWwnLGZ1bmN0aW9uKCl7XHJcblx0dmFyIFJPVU5EVVBfMF9SRUdFWFAgPSAvXlxcZCskLyxcdFxyXG5cdFx0Uk9VTkRVUF8xX1JFR0VYUCA9IC9eXFxkKyhcXC4pP1xcZHswLDF9JC8sXHJcblx0XHRST1VORFVQXzJfUkVHRVhQID0gL15cXGQrKFxcLik/XFxkezAsMn0kLyxcclxuXHRcdHJldGFpbkNvbmZpZyA9IHtcclxuXHRcdFx0cmVzdHJpY3Q6XCJBXCIsXHJcblx0XHRcdHJlcXVpcmU6Jz9uZ01vZGVsJyxcclxuXHRcdFx0bGluazpmdW5jdGlvbigkc2NvcGUsJGVsZW0sJGF0dHJzLG5nTW9kZWxDdHJsKXtcclxuXHRcdFx0XHRuZ01vZGVsQ3RybC4kcGFyc2Vycy5wdXNoKGZ1bmN0aW9uKHZhbHVlKXtcclxuXHRcdFx0XHRcdHZhciByZXRhaW5EZWNpbWFsID0gJGF0dHJzLnJldGFpbkRlY2ltYWwsXHJcblx0XHRcdFx0XHRcdGxhc3RWYWwgPSB2YWx1ZS5zdWJzdHJpbmcoMCx2YWx1ZS5sZW5ndGgtMSksXHJcblx0XHRcdFx0XHRcdGxhc3RDaGFyID0gdmFsdWUuY2hhckF0KHZhbHVlLmxlbmd0aC0xKSxcclxuXHRcdFx0XHRcdFx0aXNWYWxpZCxzdHI7XHJcblx0XHRcdFx0XHRzd2l0Y2gocmV0YWluRGVjaW1hbCl7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCIxXCI6XHJcblx0XHRcdFx0XHRcdFx0aXNWYWxpZCA9IFJPVU5EVVBfMV9SRUdFWFAudGVzdCh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdFx0c3RyID0gJy4wJztcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0Y2FzZSBcIjJcIjpcclxuXHRcdFx0XHRcdFx0XHRpc1ZhbGlkID0gUk9VTkRVUF8yX1JFR0VYUC50ZXN0KHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHRzdHIgPSAnLjAwJztcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0XHRpc1ZhbGlkID0gUk9VTkRVUF8wX1JFR0VYUC50ZXN0KHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHRzdHIgPSAnJztcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cdFx0XHQgICAgXHJcblx0XHRcdFx0XHRpZihpc1ZhbGlkKXtcclxuXHRcdFx0XHRcdFx0aWYobGFzdENoYXIgPT0gJy4nKXtcclxuXHRcdFx0XHRcdFx0XHRuZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKGxhc3RWYWwrc3RyKTtcclxuXHQgICAgICAgICAgICAgICAgICAgIFx0bmdNb2RlbEN0cmwuJHJlbmRlcigpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBsYXN0VmFsK3N0cjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdmFsdWU7XHJcblx0XHRcdFx0XHR9ZWxzZXtcclxuXHRcdFx0XHRcdFx0bmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZShsYXN0VmFsKTtcclxuXHQgICAgICAgICAgICAgICAgICAgIG5nTW9kZWxDdHJsLiRyZW5kZXIoKTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGxhc3RWYWw7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0cmV0dXJuIHJldGFpbkNvbmZpZztcclxufSlcclxuLmRpcmVjdGl2ZSgnc2VhcmNoU2VsZWN0JyxmdW5jdGlvbigkc2NlKXtcclxuXHRyZXR1cm57XHJcblx0XHRyZXN0cmljdDpcIkVBXCIsXHJcblx0XHRyZXBsYWNlOnRydWUsXHJcblx0XHR0cmFuc2NsdWRlOiB0cnVlLFxyXG5cdFx0cmVxdWlyZTonP25nTW9kZWwnLFxyXG5cdFx0c2NvcGU6e1xyXG5cdFx0XHRvcHRpb25zOic9JyxcclxuXHRcdFx0bmFtZTonQCdcclxuXHRcdH0sXHJcblx0XHR0ZW1wbGF0ZTpcdFxyXG5cdFx0XHQnPGRpdiBjbGFzcz1cInVpIGZsdWlkIHNlYXJjaCBzZWxlY3Rpb24gZHJvcGRvd24gdXB3YXJkXCI+XFxcclxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJ7e25hbWV9fVwiIG5nLW1vZGVsPVwic2VsZWN0ZWRWYWx1ZVwiPlxcXHJcblx0XHRcdFx0PGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxcXHJcblx0XHRcdFx0PGRpdiBjbGFzcz1cImRlZmF1bHQgdGV4dFwiIG5nLWJpbmQ9XCJzZWxlY3RlZFZhbHVlXCI+PC9kaXY+XFxcclxuXHRcdFx0ICBcdDxkaXYgY2xhc3M9XCJtZW51IHRyYW5zaXRpb24gaGlkZGVuXCI+XFxcclxuXHRcdFx0ICAgIFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWluZGV4PVwie3tvcHRpb24uaW5kZXh9fVwiIGRhdGEtdmFsdWU9XCJ7e29wdGlvbi5pbmRleH19XCIgbmctcmVwZWF0ID0gXCJvcHRpb24gaW4gb3B0aW9uc1wiIG5nLWJpbmQ9XCJvcHRpb24uaXRlbVwiPjwvZGl2PlxcXHJcblx0XHRcdCAgXHQ8L2Rpdj5cXFxyXG5cdFx0XHQ8L2Rpdj4nLFxyXG5cdFx0bGluazpmdW5jdGlvbigkc2NvcGUsJGVsZW0sJGF0dHJzLG5nTW9kZWwpe1xyXG5cdFx0XHQkZWxlbS5kcm9wZG93bih7XHJcblx0XHRcdFx0ZnVsbFRleHRTZWFyY2g6dHJ1ZSxcclxuXHRcdFx0XHRvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRzZWxlY3RlZEl0ZW0pIHtcclxuXHRcdFx0XHRcdCRzY29wZS4kYXBwbHkoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRcdFx0bmdNb2RlbC4kc2V0Vmlld1ZhbHVlKHZhbHVlKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHQgICAgfVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bmdNb2RlbC4kcmVuZGVyID0gZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnaXQgaXMgJHJlbmRlcicpO1xyXG5cdFx0XHRcdCRlbGVtLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLFwiM1wiKTtcclxuXHRcdFx0fTtcclxuLy9cdFx0XHQkZWxlbS5kcm9wZG93bignc2V0IHNlbGVjdGVkJyxcIjNcIik7XHJcblx0XHRcdCRhdHRycy4kb2JzZXJ2ZSgnbmdNb2RlbCcsZnVuY3Rpb24odmFsKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyh2YWwpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5jb21tb24nKVxyXG4uZmFjdG9yeSgnaHR0cEludGVyY2VwdG9yJyxmdW5jdGlvbigkc2NlLCRyb290U2NvcGUsJHRpbWVvdXQpe1xyXG5cdHZhciBzdGFydFRpbWUsZW5kVGltZTtcclxuXHRyZXR1cm57XHJcblx0XHQncmVxdWVzdCc6ZnVuY3Rpb24ocmVxKXtcclxuXHRcdFx0c3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcblx0XHRcdCRyb290U2NvcGUubG9hZGluZyA9IHRydWU7XHJcblx0XHRcdHJldHVybiByZXE7XHJcblx0XHR9LFxyXG5cdFx0J3Jlc3BvbnNlJzpmdW5jdGlvbihyZXMpe1xyXG5cdFx0XHRlbmRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcblx0XHRcdCRyb290U2NvcGUuJGV2YWxBc3luYyhmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHZhciBsb2FkaW5nVGltZSA9IGVuZFRpbWUtc3RhcnRUaW1lO1xyXG5cdFx0XHRcdGlmKGxvYWRpbmdUaW1lID4gNTAwKXtcclxuXHRcdFx0XHRcdCRyb290U2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRcdFx0JHJvb3RTY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9LDUwMCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIHJlcztcclxuXHRcdH1cclxuXHR9XHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5jb21tb24nKVxyXG4uZmFjdG9yeSgndGVzdFNlcnZpY2UnLGZ1bmN0aW9uKCRodHRwLCRxKXtcclxuXHRyZXR1cm57XHJcblx0XHRnZXRNYWluOmZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJ21vY2svdGVzdE5nUm91dGUtbWFpbi5qc29uJyk7XHJcblx0XHR9LFxyXG5cdFx0Z2V0VXNlcjpmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCdtb2NrL3Rlc3ROZ1JvdXRlLXVzZXIuanNvbicpO1xyXG5cdFx0fSxcclxuXHRcdGdldFJlc3Q6ZnVuY3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnL3Jlc3RhcGkvbG9naW4nKTtcclxuXHRcdH1cclxuXHR9XHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdteUFwcC5tYWluLmRyb3Bkb3duJylcclxuLmNvbnRyb2xsZXIoJ1Rlc3REcm9wRG93bkN0cmwnLGZ1bmN0aW9uKCRzY29wZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHNjZSl7XHJcbiAgICAkc2NvcGUuZHJvcGRvd25fbW9kZWwgPSAnaXRlbTMnO1xyXG5cclxuICAgICRzY29wZS5kcm9wZG93bl9yZXBlYXRfbW9kZWwgPSAnaXRlbTEnO1xyXG4gICAgJHNjb3BlLmRyb3Bkb3duX2l0ZW1zID0gW1xyXG4gICAgICAnaXRlbTEnLFxyXG4gICAgICAnaXRlbTInLFxyXG4gICAgICAnaXRlbTMnLFxyXG4gICAgICAnaXRlbTQnXHJcbiAgICBdO1xyXG5cclxuICAgICRzY29wZS5kcm9wZG93bl9rZXlfdmFsdWVfbW9kZWwgPSAnJztcclxuICAgICRzY29wZS5kcm9wZG93bl9rZXlfdmFsdWVfaXRlbXMgPSB7XHJcbiAgICAgICdpdGVtMSc6ICdDb29sIGl0ZW0gMScsXHJcbiAgICAgICdpdGVtMic6ICdDb29sIGl0ZW0gMicsXHJcbiAgICAgICdpdGVtMyc6ICdDb29sIGl0ZW0gMycsXHJcbiAgICAgICdpdGVtNCc6ICdDb29sIGl0ZW0gNCdcclxuICAgIH07XHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbicpXHJcbi5jb250cm9sbGVyKCdtYWluQ3RybCcsZnVuY3Rpb24oJHNjb3BlLCAkcm91dGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uLCBtYWluRGF0YSwgJHBhcnNlKXtcclxuXHQkc2NvcGUucGFnZU5hbWUgPSBtYWluRGF0YS5wYWdlTmFtZTtcclxuXHQkc2NvcGUubXlJbnB1dFZhbDEgPSBcIjExMVwiO1xyXG5cdCRzY29wZS5teUlucHV0VmFsMiA9IFwiXCI7XHJcblx0JHNjb3BlLm15SW5wdXRWYWwzID0gXCJcIjtcclxuXHQkc2NvcGUubXlJbnB1dFZhbDQgPSBcIlwiO1xyXG4vL1x0JHNjb3BlLmRhdGUgPSByZXN0RGF0YS5kYXRhLmRhdGU7XHJcbi8vXHRjb25zb2xlLmRlYnVnKHJlc3REYXRhKTtcclxuXHQkc2NvcGUuc2VsZWN0VmFsID0gXCJcIjtcclxuXHQkc2NvcGUucGFyZW50T3B0aW9ucyA9IFtcclxuXHRcdHtpdGVtOlwiQXJhYmljIENoaW5lc2VcIixzZWxlY3Q6dHJ1ZSxpbmRleDoxfSxcclxuXHRcdHtpdGVtOlwiQ2hpbmVzZSBcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6Mn0sXHJcblx0XHR7aXRlbTpcIkR1dGNoXCIsc2VsZWN0OmZhbHNlLGluZGV4OjN9LFxyXG5cdFx0e2l0ZW06XCJFbmdsaXNoXCIsc2VsZWN0OmZhbHNlLGluZGV4OjR9LFxyXG5cdFx0e2l0ZW06XCJGcmVuY2hcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6NX0sXHJcblx0XHR7aXRlbTpcIkdlcm1hblwiLHNlbGVjdDpmYWxzZSxpbmRleDo2fSxcclxuXHRcdHtpdGVtOlwiR3JlZWtcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6N30sXHJcblx0XHR7aXRlbTpcIkh1bmdhcmlhblwiLHNlbGVjdDpmYWxzZSxpbmRleDo4fSxcclxuXHRcdHtpdGVtOlwiSXRhbGlhblwiLHNlbGVjdDpmYWxzZSxpbmRleDo5fSxcclxuXHRcdHtpdGVtOlwiSmFwYW5lc2VcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTB9LFxyXG5cdFx0e2l0ZW06XCJLb3JlYW5cIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTF9LFxyXG5cdFx0e2l0ZW06XCJMaXRodWFuaWFuXCIsc2VsZWN0OmZhbHNlLGluZGV4OjEyfSxcclxuXHRcdHtpdGVtOlwiUGVyc2lhblwiLHNlbGVjdDpmYWxzZSxpbmRleDoxM30sXHJcblx0XHR7aXRlbTpcIlBvbGlzaFwiLHNlbGVjdDpmYWxzZSxpbmRleDoxNH0sXHJcblx0XHR7aXRlbTpcIlBvcnR1Z3Vlc2VcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTV9LFxyXG5cdFx0e2l0ZW06XCJSdXNzaWFuXCIsc2VsZWN0OmZhbHNlLGluZGV4OjE2fSxcclxuXHRcdHtpdGVtOlwiU3BhbmlzaFwiLHNlbGVjdDpmYWxzZSxpbmRleDoxN30sXHJcblx0XHR7aXRlbTpcIlN3ZWRpc2hcIixzZWxlY3Q6ZmFsc2UsaW5kZXg6MTh9LFxyXG5cdFx0e2l0ZW06XCJUdXJraXNoXCIsc2VsZWN0OmZhbHNlLGluZGV4OjE5fSxcclxuXHRcdHtpdGVtOlwiVmlldG5hbWVzZVwiLHNlbGVjdDpmYWxzZSxpbmRleDoyMH1cclxuXHRdO1xyXG5cdCRzY29wZS51cGRhdGVWYWwgPSBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIHRleHQgPSBcIidpdCBpcyBteSB0ZXN0IXRoZSByZXN1bHQgaXM6JyArIG15SW5wdXRWYWwxXCI7XHJcblx0XHR2YXIgaW5wdXRGdWMgPSAkcGFyc2UodGV4dCk7XHJcblx0XHQkc2NvcGUubXlJbnB1dFZhbFJlcyA9IGlucHV0RnVjKCRzY29wZSk7XHJcblx0fVxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnbXlBcHAubWFpbi50aW55bWljZScpXHJcbi5jb250cm9sbGVyKCd0aW55bWljZUN0cmwnLGZ1bmN0aW9uKCRzY29wZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHNjZSl7XHJcbiAgIHZhciBjdHJsID0gdGhpcztcclxuXHQkc2NvcGUuc2V0dGluZyA9IHtcclxuXHRcdGlubGluZTogZmFsc2UsXHJcblx0ICBcdHBsdWdpbnM6IFwiYWR2bGlzdCBhdXRvbGluayBsaXN0cyBsaW5rIGltYWdlIGNoYXJtYXAgcHJpbnQgcHJldmlldyBhbmNob3JcIixcclxuICAgXHRcdHJlYWRvbmx5IDogJHNjb3BlLm9wZXJhdGUgPT09ICd2aWV3JyA/IHRydWUgOiBmYWxzZSxcclxuXHQgICAgc2tpbjogJ2xpZ2h0Z3JheScsXHJcbiAgICBcdHRoZW1lIDogJ21vZGVybicsXHJcbiAgICBcdG1pbl9oZWlnaHQ6IDIwMCxcclxuICAgIFx0bWF4X2hlaWdodDogNTAwXHJcblx0fTtcclxuICAgIHRoaXMudXBkYXRlSHRtbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBjdHJsLnRpbnltY2VIdG1sID0gJHNjZS50cnVzdEFzSHRtbChjdHJsLnRpbnltY2UpO1xyXG4gICAgfTtcclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ215QXBwLnVzZXInKVxyXG4uY29udHJvbGxlcigndXNlckN0cmwnLGZ1bmN0aW9uKCRzY29wZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgdXNlckRhdGEpe1xyXG5cdCRzY29wZS5wYWdlTmFtZSA9IHVzZXJEYXRhLnBhZ2VOYW1lO1xyXG5cdCRzY29wZS51c2VySWQgPSAkcm91dGVQYXJhbXMudXNlcklkO1xyXG5cdCRzY29wZS5mb28gPSBcInBsZWFzZSBpbnB1dCFcIjtcclxuXHR2YXIgY3RybCA9IHRoaXM7XHJcblx0Y29uc29sZS5sb2codGhpcyk7XHJcblx0Y29uc29sZS5sb2coY3RybCk7XHJcblx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbigpe1xyXG5cdFx0Y29uc29sZS5sb2coJ3RoaXMgdXBkYXRlJyk7XHJcblx0fTtcclxuXHR0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKCl7XHJcblx0XHRjb25zb2xlLmxvZygndGhpcyB1cGRhdGUnKTtcclxuXHR9O1xyXG59KTsiXX0=
