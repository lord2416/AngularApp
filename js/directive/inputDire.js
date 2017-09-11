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
});