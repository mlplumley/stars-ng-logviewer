'use strict';

angular.module('log-viewer1', [
	'ngResource',
	'ngRoute',
	'ngMaterial',
	'ngAnimate',
	'ngMaterial'
])

.config([
	'$routeProvider',
	function ($routeProvider) {
		// Routes
		$routeProvider
			.when('/log-viewer1', {
		    	title    	: 'STARS Log Viewer',
		    	templateUrl	: 'app/log-viewer1/log-viewer1.html',
		    	controller 	: 'LogViewerCtrl1'
		    });
	}
])

// Log entry factory to fetch data from dreamfactory services.
.factory('LogEntries', [
	'$resource',
	function ($resource) {
		return $resource('/api/v2/STARS_PROD/_table/tblSystemLog/:id', { id: '@id' }, {
			query: {
				method: 'GET',
				isArray: false
			},
			create: {
				method: 'POST'
			},
			update: {
				method: 'PUT'
			},
			remove: {
				method: 'DELETE'
			}
		});
	}
])

.controller('LogViewerCtrl1', [
	'$scope', 'LogEntries', '$location', '$route', '$mdToast', '$q', '$filter', '$interval',

	function ($scope, LogEntries, $location, $route, $mdToast, $q, $filter, $interval) {
		$scope.colLabels = [ 'ID', 'Timestamp', 'Log Level', 'Logger', 'Message', 'Web Request ID'];
		$scope.colFields = [ 'SystemLogID', 'Timestamp', 'LogLevel', 'Logger', 'Message', 'WebRequestID'];
		$scope.altImage = 'http://uxrepo.com/static/icon-sets/ionicons/png32/128/000000/ios7-contact-128-000000.png';
		$scope.mobileActive = null;
		$scope.paginate = { page: 0, limit: 15 }
		$scope.contacts = [];
		$scope.webRequestIDs = [];
		$scope.autoRefreshEnabled = false;
		$scope.autoRefreshSortDir = 'rev';
		$scope.autoRefreshSortDirOptions = [
			{ description: "Reverse-chronological", dir: 'rev' },
			{ description: "Chronological",         dir: 'chrono' }
		];
		$scope.autoRefreshFrequency = 30;
		$scope.autoRefreshFrequencies = [
			{ description: '5 seconds',  delay: 5 },
			{ description: '30 seconds', delay: 30 },
			{ description: '1 minute',   delay: 60 },
			{ description: '5 minutes',  delay: 300 }
		];
		$scope.autoRefreshPromise = undefined;

		$scope.loadData = function (page, options) {
			$scope.paginate.page = page;
			options = angular.extend({
				include_count: true,
				offset: $scope.paginate.page * $scope.paginate.limit,
				limit: $scope.paginate.limit,
				order: 'SystemLogID DESC'
			}, options || {});
			LogEntries.query(options).$promise.then(function (result) {
				if (!$scope.$root.isMobile || page === 0) {
					$scope.logEntries = result.resource;
				} else {
					$scope.logEntries.push.apply($scope.logEntries, result.resource);
				}
				$scope.paginate.meta = result.meta;
				$scope.resort();
			});
		};

		if ($scope.$root.isMobile) {
			$scope.$on('SCROLL_END', function () {
				$scope.loadData($scope.paginate.page+1);
			});
		}

		$scope.$watch("webRequestIDs.length", function(newIDs, oldIDs) {
			var opts = {};
			if($scope.webRequestIDs.length > 0) {
				var list = $scope.webRequestIDs.join();
				opts = {
					filter: 'WebRequestID IN (' + list + ')'
				};
			}
			$scope.loadData(0, opts);
		});

		$scope.resort = function() {
			if($scope.autoRefreshSortDir == 'chrono') {
				// alert("Flipping...");
				$scope.logEntriesSorted = Array.prototype.slice.call($scope.logEntries).reverse();
			} else {
				// alert("Not Flipping...");
				$scope.logEntriesSorted = $scope.logEntries;
			}
		};

		$scope.initialDataDisplay = function() {
			$scope.loadData(0);
		};
		$scope.initialDataDisplay();

		$scope.adjustRefresh = function() {
			var refreshData = function() {
				$scope.loadData($scope.paginate.page);
			};
			// Cancel any previous refresh interval
			if(angular.isDefined($scope.autoRefreshPromise)) {
				$interval.cancel($scope.autoRefreshPromise);
				$scope.autoRefreshPromise = undefined;
			}
			// If autorefresh is enabled/configured
			if($scope.autoRefreshEnabled == true && $scope.autoRefreshFrequency) {
				// Calculate the refresh interval (in milliseconds)
				var freq = parseInt($scope.autoRefreshFrequency) * 1000;
				// Create a function to call for refreshes (thereby using the proper "current" page)
				var refreshData = function() {
					$scope.loadData($scope.paginate.page);
				};
				// Create an interval promise for refreshes
				$scope.autoRefreshPromise = $interval(refreshData, freq);
				// Additionally create a controller cancel callback to cancel the interval on page changes
				$scope.$on('$destroy', function(){
					if (angular.isDefined($scope.autoRefreshPromise)) {
						$interval.cancel($scope.autoRefreshPromise);
						$scope.autoRefreshPromise = undefined;
					}
				});
			}
		}
	}
]);