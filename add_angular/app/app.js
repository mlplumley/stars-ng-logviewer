'use strict';


angular.module('addressbook', [
	'ngRoute',
	'ngMaterial',
	'ngCookies',

	'login',
	'contacts',
	'groups',
	'log-viewer'

])

.constant('INSTANCE_URL', 'http://resricnav')

.constant('APP_API_KEY', '1857cd18d9cba1baf2b25c571c26b3a69375113d0e93d64c1e21f14f60d70171')

.run([
	'$cookies', 'APP_API_KEY', '$http', '$rootScope', '$window',

	function ($cookies, APP_API_KEY, $http, $rootScope, $window) {
    	$http.defaults.headers.common['X-Dreamfactory-API-Key'] = APP_API_KEY;
		$http.defaults.headers.common['X-DreamFactory-Session-Token'] = $cookies.session_token;
		if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
			$rootScope.isMobile = true;
		}

		angular.element($window).bind('scroll', function() {
		    var windowHeight = 'innerHeight' in window ? window.innerHeight : document.documentElement.offsetHeight;
		    var body = document.body, html = document.documentElement;
		    var docHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight,  html.scrollHeight, html.offsetHeight);
		    var windowBottom = windowHeight + window.pageYOffset;
		    if (windowBottom >= docHeight) {
		    	$rootScope.$broadcast('SCROLL_END');
		    }
		});
	}
])

// Config - configure application routes and settings
.config([ 
	'$routeProvider', '$httpProvider', 'APP_API_KEY', '$mdThemingProvider',
	
	function ($routeProvider, $httpProvider, APP_API_KEY, $mdThemingProvider) {
		$routeProvider
		    .otherwise({
		      redirectTo:'/contacts'
		    });

		$httpProvider.interceptors.push('httpInterceptor');


		// Configure the theme of the whole app
		$mdThemingProvider.theme('default')
		    .primaryPalette('blue-grey')
		    .accentPalette('blue');

        /*
        // Configure a dark theme with primary foreground yellow
        $mdThemingProvider.theme('docs-dark', 'default')
            .primaryPalette('yellow')
            .accentPalette('blue')
            .dark();
         */
	}
])


// Authentication interceptor. Executes a function every time before sending any request.
.factory('httpInterceptor', [
	'$location', '$q', '$injector', 'INSTANCE_URL',

	function ($location, $q, $injector, INSTANCE_URL) {

		return {

			request: function (config) {

				// Append instance url before every api call
				if (config.url.indexOf('/api/v2') > -1) {
					config.url = INSTANCE_URL + config.url;
				};

				// delete x-dreamfactory-session-token header if login
				if (config.method.toLowerCase() === 'post' && config.url.indexOf('/api/v2/user/session') > -1) {
					delete config.headers['X-DreamFactory-Session-Token'];
				}

				console.log(config);

				return config;
			},

			responseError: function (result) {

				// If status is 401 or 403 with token blacklist error then redirect to login 
				if (result.status === 401 || (result.status === 403 && result.data.error.message.indexOf('token') > -1)) {
					$location.path('/login');	
				} 

				var $mdToast = $injector.get('$mdToast');
				$mdToast.show($mdToast.simple().content('Error: ' + result.data.error.message));

				return $q.reject(result);
			}
		}
	}
])

// Header controller
.controller('HeaderCtrl', [ 
	'$scope', '$mdSidenav', '$mdUtil', '$http', '$location', '$rootScope',

	function ($scope, $mdSidenav, $mdUtil, $http, $location, $rootScope) {
		$rootScope.isLoggedIn = true;
		
		$scope.toggleSidebar = $mdUtil.debounce(function () {
	        $mdSidenav('left-sidebar').toggle();
      	}, 200);

      	$scope.logout = function () {
      		$http({
      			method: 'DELETE',
      			url: '/api/v2/user/session'
      		}).success(function () {
      			$location.path('/login');
      			delete $http.defaults.headers.common['X-DreamFactory-Session-Token'];
      		});
      	};
	}

])


// Sidebar controller
.controller('SidebarCtrl', [
	'$scope', '$mdSidenav', '$mdUtil',

	function ($scope, $mdSidenav, $mdUtil) {
		$scope.toggleSidebar = $mdUtil.debounce(function () {
	        $mdSidenav('left-sidebar').toggle();
      	}, 200);
	}
]);
