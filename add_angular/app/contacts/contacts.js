'use strict';


angular.module('contacts', [
	'ngResource',
	'ngRoute',
	'ngMaterial',
	'ngAnimate',
	'groups',
	'contact-info'
])


.config([
	'$routeProvider',

	function ($routeProvider) {

		// Routes
		$routeProvider
			.when('/contacts', {
		    	title    	: 'Contacts',
		    	templateUrl	: 'app/contacts/contacts.html',
		    	controller 	: 'ContactsCtrl' 
		    })
		    .when('/add-contact', {
		    	title		: 'Add contact',
		    	templateUrl	: 'app/contacts/contact-add-edit.html',
		    	controller 	: 'ContactsItemCtrl',
		    	resolve		: {
		    		contact: function () {
		    			return { id: null };
		    		},
		    		groups: function (Groups) {
		    			return	Groups.query().$promise;
		    		}
		    	}
		    })
		    .when('/edit-contact/:id', {
		    	title		: 'Edit contact',
		    	templateUrl	: 'app/contacts/contact-add-edit.html',
		    	controller 	: 'ContactsItemCtrl',
		    	resolve		: {
		    		contact: function ($route) {
		    			return { id: $route.current.params.id };
		    		},
		    		groups: function (Groups) {
		    			return	Groups.query().$promise;
		    		}
		    	}
		    });

	}
])

// Contacts factory to fetch contacts data from dreamfactory services.

.factory('Contacts', [
	'$resource',

	function ($resource) {
		return $resource('/api/v2/db/_table/contact/:id', { id: '@id' }, {
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


// Contact group relationship factory to fetch all the records with relationship
// between contact and groups.

.factory('ContactRelationships', [
	'$resource',

	function ($resource) {
		return $resource('/api/v2/db/_table/contact_group_relationship', { }, {
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

.controller('ContactsCtrl', [
	'$scope', 'Contacts', '$location', '$route', '$mdToast', 'ContactInfo', '$q', '$filter',

	function ($scope, Contacts, $location, $route, $mdToast, ContactInfo, $q, $filter) {

		$scope.colLabels = [ 'ID', 'First Name', 'Last Name', 'Image URL', 'Twitter', 'Skype', 'Notes' ];
		$scope.colFields = [ 'id', 'first_name', 'last_name', 'image_url', 'twitter', 'skype', 'notes' ];
		$scope.altImage = 'http://uxrepo.com/static/icon-sets/ionicons/png32/128/000000/ios7-contact-128-000000.png';
		$scope.mobileActive = null;
		$scope.paginate = { page: 0, limit: 15 }
		$scope.contacts = [];

		$scope.loadData = function (page, options) {
			$scope.paginate.page = page;
			options = angular.extend({
				include_count: true,
				offset: $scope.paginate.page * $scope.paginate.limit,
				limit: $scope.paginate.limit,
				order: 'last_name ASC'
			}, options || {});

			Contacts.query(options).$promise.then(function (result) {
				if (!$scope.$root.isMobile || page === 0) {
					$scope.contacts = result.resource;	
				} else {
					$scope.contacts.push.apply($scope.contacts, result.resource);	
				}
				
				$scope.paginate.meta = result.meta;
			});
		};

		$scope.search = function (event) {
			if (event.keyCode === 13) {
				$scope.loadData(0, {
					filter: 'first_name like %' + event.target.value + '%'
				});
			}
		};

		$scope.addContact = function () {
			$location.path('/add-contact')
		};

		$scope.editContact = function (contact) {
			$location.path('/edit-contact/' + contact.id);
		};

		if ($scope.$root.isMobile) {
			$scope.$on('SCROLL_END', function () {
				$scope.loadData($scope.paginate.page+1);
			});
		}

		$scope.loadData(0);
	}
])

.controller('ContactsItemCtrl', [
	'$scope', 'Contacts', 'ContactInfo', 'contact', 'groups', '$mdToast', '$mdDialog', '$location', '$route', 'Groups', 'ContactRelationships', '$q',

	function ($scope, Contacts, ContactInfo, contact, groups, $mdToast, $mdDialog, $location, $route, Groups, ContactRelationships, $q) {
		$scope.contact = contact;
		$scope.groups = groups.resource;
		$scope.selectedGroups = {};

		$scope.loadData = function () {
			ContactInfo.query({ 
				include_count: true,
				filter: 'contact_id=' + $route.current.params.id 
			}).$promise.then(function (result) {
				$scope.contactInfo = result.resource;
			});
		};

		if (contact.id) {
			Contacts.get({ id: contact.id }).$promise.then(function (response) {
				$scope.contact = response;
				ContactRelationships.query({
					filter: 'contact_id=' + contact.id
				}).$promise.then(function (result) {
					result.resource.forEach(function (item) {
						$scope.selectedGroups[item.contact_group_id] = true;
					});
				});
			});

			// load contact info
			$scope.loadData();
		}

		$scope.addEditContactInfo = function (ev, item) {
			$mdDialog.show({
		    	controller: 'ContactInfoUpdateCtrl',
		    	templateUrl: 'app/contact-info/contact-info-add-edit.html',
		    	parent: angular.element(document.body),
		    	targetEvent: ev,
		    	locals: {
		    		contactInfo: item || { contact_id: $route.current.params.id, id: '' }
		    	}
			}).then(function () {
				$scope.loadData();
			});
		};

		$scope.remove = function () {
			var promises = [
				ContactRelationships.remove({
					filter: 'contact_id=' + contact.id
				}).$promise,
				ContactInfo.remove({
					filter: 'contact_id=' + contact.id
				}).$promise
			];

			$q.all(promises).then(function () {
				Contacts.remove({
					id: contact.id
				}).$promise.then(function () {
					$location.path('/contacts');
				});
			});
		};

		$scope.cancel = function () {
			$location.path('/contacts');
		};


		$scope.save = function () {
			if (!contact.id) {
				// Create contact

				Contacts.create($scope.contact).$promise.then(function () {
					$mdToast.show($mdToast.simple().content('Contact saved!'));
					$location.path('/contacts');
				});
			} else {

				ContactRelationships.remove({
					filter: 'contact_id=' + contact.id
				}).$promise.then(function () {
					
					var contactGroupRelationships = Object.keys($scope.selectedGroups).filter(function (key) {
						return $scope.selectedGroups[key];
					}).map(function (key) {
						return { contact_id: contact.id, contact_group_id: key }
					});

					var promises = [
						Contacts.update({ id: $scope.contact.id }, $scope.contact).$promise,
						ContactRelationships.create(contactGroupRelationships).$promise
					];

					$q.all(promises).then(function () {
						$mdToast.show($mdToast.simple().content('Contact saved!'));
						$location.path('/contacts');
					});
				});
			}
		};
	}
]);