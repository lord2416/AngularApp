angular.module('myApp.main.tinymice')
.controller('tinymiceCtrl',function($scope, $route, $routeParams, $location, $sce){
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
});