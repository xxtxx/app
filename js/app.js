var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.Controller 
 * Description: Main angular controller class for the app.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Controller = function($scope, $q, $timeout, complexify, platform, global, api, utility, bookmarks, platformImplementation) { 
	'use strict';    
    var vm;
    
/* ------------------------------------------------------------------------------------
 * Constructor
 * ------------------------------------------------------------------------------------ */
 
    var BrowserAction = function() {
        vm = this;
        vm.global = global;
        vm.platform = platform; 
		
		vm.alert = {
			show: false,
			title: '',
			message: '',
			type: '',
			display: function(title, message, alertType) {
				vm.alert.title = title;
				vm.alert.message = message;
				vm.alert.type = alertType;
				vm.alert.show = true;
			}
		};
        
        vm.bookmark = {
            active: false,
            current: null,
            displayUpdateForm : false,
            tagText: null
        };
        
        vm.domElements = {
            btnRestoreData: function() {
                if (!vm.settings.dataToRestore) {
                    return platform.Constants.Get(global.Constants.Button_RestoreData_Label);
                }
                
                if (!vm.settings.dataToRestoreIsValid()) {
                    return platform.Constants.Get(global.Constants.Button_RestoreData_Invalid_Label);
                }
                
                return platform.Constants.Get(global.Constants.Button_RestoreData_Ready_Label);
            }
        };
        
        vm.events = {
            backupRestoreForm_Backup_Click: backupRestoreForm_Backup_Click,
            backupRestoreForm_DisplayRestoreForm_Click: backupRestoreForm_DisplayRestoreForm_Click,
            backupRestoreForm_DisplayRestoreConfirmation_Click: backupRestoreForm_DisplayRestoreConfirmation_Click,
            backupRestoreForm_Restore_Click: backupRestoreForm_Restore_Click,
            bookmarkForm_BookmarkDescription_Change: bookmarkForm_BookmarkDescription_Change,
            bookmarkForm_BookmarkTags_Change: bookmarkForm_BookmarkTags_Change,
            bookmarkForm_BookmarkTags_KeyDown: bookmarkForm_BookmarkTags_KeyDown,
            bookmarkForm_BookmarkUrl_Change: bookmarkForm_BookmarkUrl_Change,
            bookmarkForm_CreateBookmark_Click: bookmarkForm_CreateBookmark_Click,
            bookmarkForm_CreateTags_Click: bookmarkForm_CreateTags_Click,
            bookmarkForm_DeleteBookmark_Click: bookmarkForm_DeleteBookmark_Click,
            bookmarkForm_RemoveTag_Click: bookmarkForm_RemoveTag_Click,
            bookmarkForm_UpdateBookmark_Click: bookmarkForm_UpdateBookmark_Click,
            syncBookmarksToolbar_Click: syncBookmarksToolbar_Click,
            introPanel_ShowHelp_Click: introPanel_ShowHelp_Click,
            openUrl: openUrl,
            queueSync: queueSync,
            searchForm_SearchText_Change: searchForm_SearchText_Change,
            searchForm_SearchText_KeyDown: searchForm_SearchText_KeyDown,
            searchForm_SearchResult_KeyDown: searchForm_SearchResult_KeyDown,
            searchForm_UpdateBookmark_Click: searchForm_UpdateBookmark_Click,
            syncForm_CancelSyncConfirmation_Click: syncForm_CancelSyncConfirmation_Click,
            syncForm_ClientSecret_Change: syncForm_ClientSecret_Change,
            syncForm_ConfirmSync_Click: startSyncing,
            syncForm_DisableSync_Click: syncForm_DisableSync_Click,
            syncForm_EnableSync_Click: syncForm_EnableSync_Click,
            toggleBookmark_Click: toggleBookmark_Click,
            updateServiceUrlForm_Cancel_Click: updateServiceUrlForm_Cancel_Click,
            updateServiceUrlForm_Confirm_Click: updateServiceUrlForm_Confirm_Click,
            updateServiceUrlForm_Display_Click: updateServiceUrlForm_Display_Click,
            updateServiceUrlForm_Update_Click: updateServiceUrlForm_Update_Click,
            updateServiceUrlForm_Update_KeyPress: updateServiceUrlForm_Update_KeyPress
        };

        vm.introduction = {
            displayIntro: function(value) {
                return arguments.length ? 
                    global.DisplayIntro.Set(value) : 
                    global.DisplayIntro.Get();
            },
            displayPanel: function(panelToDisplay) {
                if (!panelToDisplay || panelToDisplay > vm.introduction.currentPanel) {
                    var panels = document.querySelectorAll('.intro-panel > div');

                    for (var i = 0; i < panels.length; i++) {
                        panels[i].classList.remove('reverse');
                    }
                }
                else if (panelToDisplay < vm.introduction.currentPanel) {
                    document.querySelector('#intro-panel-' + vm.introduction.currentPanel).classList.add('reverse');
                    document.querySelector('#intro-panel-' + panelToDisplay).classList.add('reverse');
                }
                
                vm.introduction.showLogo = (!panelToDisplay) ? true : false;                
                vm.introduction.currentPanel = (!panelToDisplay) ? 0 : panelToDisplay;
            },
            showLogo: true,
            currentPanel: 0
        };
        
        vm.search = {
            getLookaheadTimeout: null,
            getResultsTimeout: null,
            lastWord: null,
            lookahead: null,
            query: null,
            results: null
        };
        
		vm.settings = {
			backupRestoreResult: null,
            dataToRestore: null,
            dataToRestoreIsValid: function() {
                return checkRestoreData(vm.settings.dataToRestore);
            },
            displayCancelSyncConfirmation: false,
			displayRestoreConfirmation: false,
            displayRestoreForm: false,
			id: function(value) {
                return arguments.length ? 
                    global.Id.Set(value) : 
                    global.Id.Get();
            },
            syncBookmarksToolbar: function(value) {
                return arguments.length ? 
                    global.SyncBookmarksToolbar.Set(value) : 
                    global.SyncBookmarksToolbar.Get();
            },
			secret: function(value) {
                return arguments.length ? 
                    global.ClientSecret.Set(value) : 
                    global.ClientSecret.Get();
            },
            secretComplexity: null,
            service: {
                displayUpdateServiceUrlConfirmation: false,
                displayUpdateServiceUrlForm: false,
                newServiceUrl: '',
                status: global.ServiceStatus.Online,
                statusMessage: '',
                url: function(value) {
                    return arguments.length ? 
                        global.URL.Host.Set(value) : 
                        global.URL.Host.Get();
                }
            },
            panels: { sync: 0, serviceStatus: 1, backupRestore: 2 },
            visiblePanel: 0
		};
		
		vm.sync = {
			asyncChannel: undefined,
            enabled: function(value) {
                return arguments.length ? 
                    global.SyncEnabled.Set(value) : 
                    global.SyncEnabled.Get();
            },
            inProgress: function(value) {
                return arguments.length ? 
                    global.IsSyncing.Set(value) : 
                    global.IsSyncing.Get();
            },
            showConfirmation: false
		};

		vm.view = {
			current: null,
			change: function(view) {
				vm.alert.show = false;
                vm.working = false;
                
                // Reset view
                switch(vm.view.current) {
                    case vm.view.views.bookmark:
                        vm.bookmarkForm.$setPristine();
                        vm.bookmarkForm.$setUntouched();
                        vm.bookmarkForm.bookmarkUrl.$setValidity('InvalidUrl', true);
                        vm.bookmark.tagText = '';
                        break;
                    case vm.view.views.main:
                        vm.search.lookahead = null;
                        vm.search.query = null;
                        vm.search.results = null;
                        break;
                    case vm.view.views.settings:
                        vm.settings.visiblePanel = vm.settings.panels.sync;
                        vm.settings.service.displayCancelSyncConfirmation = false;
                        vm.settings.service.displayUpdateServiceUrlConfirmation = false;
                        vm.settings.service.displayUpdateServiceUrlForm = false;
                        updateServiceUrlForm_SetValidity(true);
                        vm.settings.backupRestoreResult = null;
                        vm.settings.displayRestoreForm = false;
                        vm.settings.displayRestoreConfirmation = false;
                        vm.settings.dataToRestore = '';
                        break;
                    case vm.view.views.login:
                        /* falls through */
                    default:
                        if (!vm.introduction.displayIntro()) {
                            vm.introduction.displayPanel();
                        }
                        
                        vm.sync.showConfirmation = false;
                        if (vm.syncForm) {
                            vm.syncForm.$setPristine();
                            vm.syncForm.$setUntouched();
                        }
                        break;
                }
                
                switch(view) {
                    case vm.view.views.main:
                        $timeout(function() {
                            document.querySelector('input[name=txtSearch]').select();
                        });
                        break;
                    case vm.view.views.bookmark:
                        // Update description field height
                        bookmarkForm_ResizeDescriptionField();

                        $timeout(function() {
                            // Focus on title field
                            document.querySelector('input[name="bookmarkTitle"]').select();
                        });
                        break;
                    case vm.view.views.settings:
                        // Get service status
                        api.CheckServiceStatus()
                            .then(setServiceInformation)
                            .catch(function(err) {
                                vm.settings.service.status = global.ServiceStatus.Offline;
                            });
                        
                        // Set new service form url
                        vm.settings.service.newServiceUrl = vm.settings.service.url();
                        
                        // If sync is enabled, generate a QR code 
                        if (global.SyncEnabled.Get()) {
                            generateQRCode();
                        }
                        break;
                    case vm.view.views.login:
                        /* falls through */
                    default:
                        $timeout(function() {
                            document.querySelector('input[name=txtClientSecret]').select();
                        });
                        break;
                }
				
				vm.view.current = view;
			},
            displayMain: function() {
                if (!!global.SyncEnabled.Get()) {
                    vm.view.change(vm.view.views.main);
                }
                else {
                    vm.view.change(vm.view.views.login);
                }
            },
            views: { login: 0, main: 1, bookmark: 2, settings: 3 }
		};
        
        vm.working = false;
        
        // Initialise the app
        init();
    };
        
        
/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */
	
	var backupRestoreForm_Backup_Click = function() {
		// Export bookmarks
		bookmarks.Export()
            .then(function(data) {
				var blob = new Blob(
					[JSON.stringify(data)], {
						type: 'application/json' });
				
				var date = new Date();
				var second = ('0' + date.getSeconds()).slice(-2);
				var minute = ('0' + date.getMinutes()).slice(-2);
				var hour = ('0' + date.getHours()).slice(-2);
				var day = ('0' + date.getDate()).slice(-2);
				var month = ('0' + (date.getMonth() + 1)).slice(-2);
				var year = date.getFullYear();
				var dateString = year + month + day + hour + minute + second;
				
				// Trigger download 
				var exportUrl = window.URL.createObjectURL(blob);
                var backupLink = document.getElementById('backupLink');
                var fileName = 'xBrowserSyncBackup_' + dateString + '.txt';
                backupLink.setAttribute('download', fileName);
				backupLink.setAttribute('href', exportUrl);
				backupLink.click();
                
                // Display message
                var message = platform.Constants.Get(global.Constants.BackupSuccess_Message).replace(
                    '{fileName}',
                    fileName);
                
                vm.settings.backupRestoreResult = message;
			})
            .catch(function(err) {
				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				vm.alert.display(errMessage.title, errMessage.message, 'danger');
			});
	};
    
    var backupRestoreForm_DisplayRestoreForm_Click = function() {
        // Display restore form 
        vm.settings.backupRestoreResult = null;
        vm.settings.displayRestoreConfirmation = false;
        vm.settings.dataToRestore = '';
        vm.settings.displayRestoreForm = true;
        
        // Focus in restore textarea
        $timeout(function() {
            document.querySelector('#restoreForm textarea').select();
        });
    };
    
    var backupRestoreForm_DisplayRestoreConfirmation_Click = function() {
        // Display restore confirmation 
        vm.settings.displayRestoreConfirmation = true;
        
        // Focus on confirm button
        $timeout(function() {
            document.querySelector('#btn_ConfirmRestore').focus();
        });
    };
	
	var backupRestoreForm_Restore_Click = function(data) {
		if (!data) {
            // Display alert
            vm.alert.display(
                platform.Constants.Get(global.Constants.Error_NoDataToRestore_Title),
                platform.Constants.Get(global.Constants.Error_NoDataToRestore_Message), 
                'danger');
            
            return;
        }
        
        // Show loading animation
        vm.working = true;
        
        // Start restore
        restoreData(JSON.parse(data));
	};
    
    var bookmarkForm_BookmarkDescription_Change = function() {
        // Limit the bookmark description to the max length
        if (!!vm.bookmark.current.description && vm.bookmark.current.description.length > global.Bookmarks.DescriptionMaxLength) {
            vm.bookmark.current.description = vm.bookmark.current.description.substring(0, global.Bookmarks.DescriptionMaxLength);
        }
    };
    
    var bookmarkForm_BookmarkTags_Change = function() {
        vm.alert.show = false;
        vm.bookmark.tagLookahead = null;

        if (!vm.bookmark.tagText || !vm.bookmark.tagText.trim()) {
            return;
        }

        // Get last word of tag text
        var matches = vm.bookmark.tagText.match(/[^,]+$/);
        var lastWord = (!!matches) ? matches[0].trimLeft() : null;

        // Display lookahead if word length exceeds minimum
        if (!!lastWord && lastWord.length > global.LookaheadMinChars) {
            // Get tags lookahead
            bookmarks.GetLookahead(lastWord.toLowerCase(), null, true)
                .then(function(results) {
                    if (!results) {
                        return;
                    }
                    
                    var lookahead = results[0];
                    var word =  results[1];
                    
                    // Display lookahead
                    if (!!lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
                        // Trim word from lookahead
                        lookahead = (!!lookahead) ? lookahead.substring(word.length) : null;
                        vm.bookmark.tagLookahead = lookahead.replace(/\s/g, '&nbsp;');
                        vm.bookmark.tagTextMeasure = vm.bookmark.tagText.replace(/\s/g, '&nbsp;');
                    }
                });
        }
    };
    
    var bookmarkForm_BookmarkTags_KeyDown = function($event) {
        switch (true) {
            // If user pressed Enter
            case ($event.keyCode === 13):
                // Add new tags
                $event.preventDefault();
                bookmarkForm_CreateTags_Click();
                break;
            // If user pressed tab or right arrow key and lookahead present
            case (($event.keyCode === 9 || $event.keyCode === 39) && !!vm.bookmark.tagLookahead):
                // Add lookahead to search query
                $event.preventDefault();
                vm.bookmark.tagText += vm.bookmark.tagLookahead.replace(/&nbsp;/g, ' ');
                bookmarkForm_BookmarkTags_Change();
                break;
        }
    };
    
    var bookmarkForm_BookmarkUrl_Change = function() {
        // Reset invalid service validator
        vm.bookmarkForm.bookmarkUrl.$setValidity('InvalidUrl', true);
        
        if (!vm.bookmark.url) {
            return;
        }
        
        // Check url is valid
        var matches = vm.bookmark.url.match(/^https?:\/\/\w+/i);        
        if (!matches || matches.length <= 0) {
            vm.bookmarkForm.bookmarkUrl.$setValidity('InvalidUrl', false);
        }
    };
    
    var bookmarkForm_CreateBookmark_Click = function() {
        if (!vm.bookmarkForm.$valid) {
			document.querySelector('#bookmarkForm .ng-invalid').select();
            return;
		}

        // Add tags if tag text present
        if (!!vm.bookmark.tagText && vm.bookmark.tagText.length > 0) {
            bookmarkForm_CreateTags_Click();
        }
        
        // Add the new bookmark and sync
        platform.Sync(vm.sync.asyncChannel, {
            type: global.SyncType.Both,
            changeInfo: { 
                type: global.UpdateType.Create, 
                bookmark: vm.bookmark.current 
            }
        });
        
        vm.bookmark.active = true;
        vm.view.change(vm.view.views.main);
    };
    
    var bookmarkForm_CreateTags_Click = function() {
        // Clean and sort tags and add them to tag array
        var newTags = getTagArrayFromText(vm.bookmark.tagText);        
        vm.bookmark.current.tags = _.sortBy(_.union(newTags, vm.bookmark.current.tags), function(tag) {
            return tag;
        });

        // Update description field height
        bookmarkForm_ResizeDescriptionField();
        
        vm.bookmark.tagText = '';
        vm.bookmark.tagLookahead = '';
        document.querySelector('input[name="bookmarkTags"]').focus();
    };
    
    var bookmarkForm_DeleteBookmark_Click = function() {
        // Get current page url
		platform.CurrentUrl.Get()
            .then(function(currentUrl) {
                if (!currentUrl) {
                    return $q.reject({ code: global.ErrorCodes.FailedGetPageMetadata });
                }
                
                // Delete the bookmark
                platform.Sync(vm.sync.asyncChannel, {
                    type: global.SyncType.Both,
                    changeInfo: { 
                        type: global.UpdateType.Delete, 
                        url: vm.bookmark.current.originalUrl
                    }
                });
                
                // Set bookmark active status if current bookmark is current page 
                if (currentUrl === vm.bookmark.current.originalUrl) {
                    vm.bookmark.active = false;
                }
                
                // Display the main view
                vm.view.change(vm.view.views.main);
            })
            .catch(function(err) {
                // Display alert
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');
            });
    };
    
    var bookmarkForm_RemoveTag_Click = function(tag) {
        vm.bookmark.current.tags = _.without(vm.bookmark.current.tags, tag);
        bookmarkForm_ResizeDescriptionField();
        document.querySelector('#bookmarkForm input[name="bookmarkTags"]').focus();
    };

    var bookmarkForm_ResizeDescriptionField = function() {
        var newHeight = 190;
        
        $timeout(function() {
            if (!!vm.bookmark.current.tags && vm.bookmark.current.tags.length > 0) {
                newHeight = (newHeight - 15 - document.querySelector('.tags').offsetHeight);
            }

            document.querySelector('textarea[name="bookmarkDescription"]').style.height = newHeight + 'px';
        });
    };
    
    var bookmarkForm_UpdateBookmark_Click = function() {
        // Return if the form is not valid
		if (!vm.bookmarkForm.$valid) {
			document.querySelector('#bookmarkForm .ng-invalid').select();
            return;
		}

        // Add tags if tag text present
        if (!!vm.bookmark.tagText && vm.bookmark.tagText.length > 0) {
            bookmarkForm_CreateTags_Click();
        }
        
        // Get current page url
		platform.CurrentUrl.Get()
            .then(function(currentUrl) {
                if (!currentUrl) {
                    return $q.reject({ code: global.ErrorCodes.FailedGetPageMetadata });
                }
                
                // Update the bookmark
                platform.Sync(vm.sync.asyncChannel, {
                    type: global.SyncType.Both,
                    changeInfo: { 
                        type: global.UpdateType.Update, 
                        url: vm.bookmark.current.originalUrl, 
                        bookmark: vm.bookmark.current
                    }
                });
                
                // Set bookmark active status if current bookmark is current page 
                if (currentUrl === vm.bookmark.current.originalUrl) {
                    vm.bookmark.active = (currentUrl === vm.bookmark.current.url);
                }
                
                // Display the main view
                vm.view.change(vm.view.views.main);
            })
            .catch(function(err) {
                // Display alert
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');
            });
    };
	
	var checkRestoreData = function(data) {
		var validData = false;
		
		if (!!data) {
			try {
				data = JSON.parse(data);
				
				if (!!data.xBrowserSync && !!data.xBrowserSync.bookmarks) {
					validData = true;
				}
			}
			catch(err) { }
		}
		
		return validData;
	};
    
    var generateQRCode = function() {
        var qr = qrcode(3, 'M');
        qr.addData(vm.settings.id());
        qr.make();

        document.getElementById('qr').innerHTML =  qr.createImgTag();
    };
    
    var getTagArrayFromText = function(tagText) {
        if (!tagText) {
            return null;
        }
        
        // Conver to lowercase and split tags into array
        var tags = tagText.toLowerCase().replace(/['"]/g, '').split(',');
        
        // Clean and sort tags
        tags = _.chain(tags)
            .map(function(tag) {
                return tag.trim();
            })
            .compact()
            .sortBy(function(tag) {
                return tag;
            })
            .value();
        
        return tags;
    };
    
    var handleSyncResponse = function(response) {
        var errMessage;
        
        switch(response.command) {
            // After syncing bookmarks
            case global.Commands.SyncBookmarks:
                if (response.success) {
                    // Enable sync
                    if (!global.SyncEnabled.Get()) {
                        global.SyncEnabled.Set(true);
                    }

                    // Disable the intro animation
                    vm.introduction.displayIntro(false);
                    
                    // If initial sync, switch to main view 
                    if (vm.view.current === vm.view.views.login) {
                    	vm.view.change(vm.view.views.main);
                    }

                    setBookmarkStatus()
                        .catch(function(err) {
                            var errMessage = utility.GetErrorMessageFromException(err);
                            vm.alert.display(errMessage.title, errMessage.message, 'danger');
                        });
                }
                else {
                    errMessage = utility.GetErrorMessageFromException(response.error);
                    vm.alert.display(errMessage.title, errMessage.message, 'danger');
                }
                
                vm.working = false;
                break;
            // After restoring bookmarks
            case global.Commands.RestoreBookmarks:
                if (response.success) {
                    setBookmarkStatus()
                        .catch(function(err) {
                            var errMessage = utility.GetErrorMessageFromException(err);
                            vm.alert.display(errMessage.title, errMessage.message, 'danger');
                        });
                    
                    vm.settings.displayRestoreForm = false;
                    vm.settings.displayRestoreConfirmation = false;
                    vm.settings.dataToRestore = '';
                    vm.settings.backupRestoreResult = platform.Constants.Get(global.Constants.RestoreSuccess_Message);
                    
                    $timeout(function() {
                        document.querySelector('#btn_RestoreComplete').focus();
                    });
                }
                else {
                    errMessage = utility.GetErrorMessageFromException(response.error);
                    vm.alert.display(errMessage.title, errMessage.message, 'danger');
                }
                
                vm.working = false;
                break;
            case global.Commands.NoCallback:
                /* falls through */
            default:
                if (!response.success) {
                    errMessage = utility.GetErrorMessageFromException(response.error);
                    vm.alert.display(errMessage.title, errMessage.message, 'danger');
                }
                
                vm.working = false;
                break;
        }
    };
    
    var syncBookmarksToolbar_Click = function() {
        if (!global.SyncBookmarksToolbar.Get()) {
            // No need to sync, return
            return;
        }
        
        var syncData = {};
        syncData.type = (!global.Id.Get()) ? global.SyncType.Push : global.SyncType.Pull;
        
        // Show loading animation
        vm.working = true;
        
        // Start sync with no callback action
        platform.Sync(vm.sync.asyncChannel, syncData, global.Commands.NoCallback);
    };
    
    var init = function() {
        // Get async channel for syncing in background
        vm.sync.asyncChannel = platform.AsyncChannel.Get(function(msg) {
            $scope.$apply(function() {
                handleSyncResponse(msg);
            });
        });
        
        // Enable event listeners
        global.DisableEventListeners.Set(false);
        
        // Check if current page is a bookmark
        setBookmarkStatus()
            .catch(function(err) {
				var errMessage = utility.GetErrorMessageFromException(err);
				vm.alert.display(errMessage.title, errMessage.message, 'danger');
			});
        
        // Attach events to new tab links
        $timeout(function() {
            setNewTabLinks();
        });
        
        // Display main view
        vm.view.displayMain();
        
        // Display intro animation if required
        if (vm.view.current === vm.view.views.login && !!vm.introduction.displayIntro()) {
            introPanel_DisplayIntro();
        }
    };

    var introPanel_DisplayIntro = function() {
        vm.introduction.showLogo = false;

        $timeout(function() {
            vm.introduction.showLogo = true;

            $timeout(function() {
                vm.introduction.showLogo = false;

                $timeout(function() {
                    vm.introduction.displayPanel(1);
                }, 1000);
            }, 3000);
        }, 1000);
    };

    var introPanel_ShowHelp_Click = function() {
        vm.introduction.showLogo = false;
        
        $timeout(function() {
            vm.introduction.displayPanel(1);
        }, 500);
    };
    
    var openUrl = function(obj) {
        platform.OpenUrl(obj.currentTarget.href);
        return false;
    };
	
	var queueSync = function() {
        var syncData = {};
        syncData.type = (!global.Id.Get()) ? global.SyncType.Push : global.SyncType.Pull; 
        
        // Start sync
        platform.Sync(vm.sync.asyncChannel, syncData);
    };
	
	var restoreData = function(data, restoreCallback) {
		// Set ID and client secret if sync not enabled
        if (!global.SyncEnabled.Get()) {
            global.ClientSecret.Set('');
            vm.settings.secretComplexity = null;
            
            if (!!data.xBrowserSync.id) {
                global.Id.Set(data.xBrowserSync.id);
            }
		}
        
        var bookmarksToRestore = data.xBrowserSync.bookmarks;
        
		// Return if no bookmarks found
		if (!bookmarksToRestore) {
            return restoreCallback();
        }
        
        var syncData = {};
        syncData.type = (!global.SyncEnabled.Get()) ? global.SyncType.Pull : global.SyncType.Both;
        syncData.bookmarks = bookmarksToRestore;
        
        // Show loading animation
        vm.working = true;
        
        // Start restore
        platform.Sync(vm.sync.asyncChannel, syncData, global.Commands.RestoreBookmarks);
	};
    
    var searchBookmarks = function() {
        var queryData;

        searchForm_ToggleSearchingAnimation(true);
        
        var urlRegex = /^(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]+\.[a-z]+\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;
        if (!!vm.search.query.trim().match(urlRegex)) {
            queryData = { url: vm.search.query.trim() };
        }
        else {
            queryData = { keywords: vm.search.query.trim() };
        }
        
        bookmarks.Search(queryData)
            .then(function(results) {
                vm.search.results = results;
            })
            .catch(function(err) {
                vm.search.results = null;
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');
            })
            .finally(function() {
                searchForm_ToggleSearchingAnimation(false);
            });
    };
    
    var searchForm_SearchText_Change = function() {
        vm.alert.show = false;
        vm.search.lookahead = null;
        
        // Clear timeout
        if (!!vm.search.getResultsTimeout) {
            $timeout.cancel(vm.search.getResultsTimeout);
            vm.search.getResultsTimeout = null;
        }
        
        // No query, clear results
        if (!vm.search.query.trim()) {
            vm.search.results = null;
            return;
        }

        // Get last word of search query
        var matches = vm.search.query.match(/[\S]+$/);
        var lastWord = (!!matches) ? matches[0] : null;
        
        // Display lookahead if word length exceed minimum
        if (!!lastWord && lastWord.length > global.LookaheadMinChars) {
            // Get lookahead
            bookmarks.GetLookahead(lastWord.toLowerCase(), vm.search.results)
                .then(function(results) {
                    if (!results) {
                        return;
                    }

                    var lookahead = results[0];
                    var word =  results[1];
                    
                    if (!!lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
                        // Trim word from lookahead
                        lookahead = (!!lookahead) ? lookahead.substring(word.length) : null;
                        vm.search.lookahead = lookahead.replace(/\s/g, '&nbsp;');
                        vm.search.queryMeasure = vm.search.query.replace(/\s/g, '&nbsp;');
                    }
                });
            
            // Execute search after timeout
            vm.search.getResultsTimeout = $timeout(function() {
                searchBookmarks();
            }, 250);
        }
    };
    
    var searchForm_SearchText_KeyDown = function($event) {
        // If user pressed enter
        if ($event.keyCode === 13) {
            if (!!vm.search.getResultsTimeout) {
                $timeout.cancel(vm.search.getResultsTimeout);
                vm.search.getResultsTimeout = null;
            }
            
            searchBookmarks();
            return;
        }
        
        // If user pressed down arrow and search results present
        if ($event.keyCode === 40 && !!vm.search.results && vm.search.results.length > 0) {
            // Focus on first search result
            $event.preventDefault();
            document.querySelector('.search-results-panel .list-group').firstElementChild.firstElementChild.focus();
            return;
        }
        
        // If user pressed tab or right arrow key and lookahead present
        if (($event.keyCode === 9 || $event.keyCode === 39) && !!vm.search.lookahead) {
            // Add lookahead to search query
            $event.preventDefault();
            vm.search.query += vm.search.lookahead;
            searchForm_SearchText_Change();
            return;
        }
    };
    
    var searchForm_SearchResult_KeyDown = function($event) {
        var currentIndex, newIndex;
        
        switch (true) {
            // Up arrow
            case ($event.keyCode === 38):
                $event.preventDefault();
            
                if (!!$event.target.parentElement.previousElementSibling) {
                    // Focus on previous result
                    $event.target.parentElement.previousElementSibling.firstElementChild.focus();
                }
                else {
                    // Focus on search box
                    document.querySelector('.search-form input').focus();
                }
                
                break;
            // Down arrow
            case ($event.keyCode === 40):
                $event.preventDefault();
            
                if (!!$event.target.parentElement.nextElementSibling) {
                    // Focus on next result
                    $event.target.parentElement.nextElementSibling.firstElementChild.focus();
                }
                
                break;
            // Page up
            case ($event.keyCode === 33):
                $event.preventDefault();
            
                // Focus on result 6 down from current
                currentIndex = _.indexOf($event.target.parentElement.parentElement.children, $event.target.parentElement);
                newIndex = currentIndex - 6;
                
                if (newIndex < 0) {
                    $event.target.parentElement.parentElement.firstElementChild.firstElementChild.focus();
                }
                else {
                    $event.target.parentElement.parentElement.children[newIndex].firstElementChild.focus();
                }
                
                break;
            // Page down
            case ($event.keyCode === 34):
                $event.preventDefault();
                
                // Focus on result 6 down from current
                currentIndex = _.indexOf($event.target.parentElement.parentElement.children, $event.target.parentElement);
                newIndex = currentIndex + 6;
                
                if ($event.target.parentElement.parentElement.children.length < newIndex) {
                    $event.target.parentElement.parentElement.lastElementChild.firstElementChild.focus();
                }
                else {
                    $event.target.parentElement.parentElement.children[newIndex].firstElementChild.focus();
                }
                
                break;
            // Home
            case ($event.keyCode === 36):
                $event.preventDefault();
            
                // Focus on first result
                $event.target.parentElement.parentElement.firstElementChild.firstElementChild.focus();
                
                break;
            // End
            case ($event.keyCode === 35):
                $event.preventDefault();
            
                // Focus on last result
                $event.target.parentElement.parentElement.lastElementChild.firstElementChild.focus();
                
                break;
            // Backspace
            case ($event.keyCode === 8):
            // Space
            case ($event.keyCode === 32):
            // Numbers and letters
            case ($event.keyCode > 47 && $event.keyCode < 112):
                // Focus on search box
                document.querySelector('.search-form input').focus();
                break;
        }
    };

    var searchForm_ToggleSearchingAnimation = function(active) {
        var searchIcon = document.querySelector('.search-form i');
        
        if (active) {
            searchIcon.classList.add("animate-flash");
        }
        else {
            searchIcon.classList.remove("animate-flash");
        }
    };
    
    var searchForm_UpdateBookmark_Click = function(bookmark) {
        vm.bookmark.current = bookmark;
        vm.bookmark.current.originalUrl = vm.bookmark.current.url; 
        vm.bookmark.displayUpdateForm = true;
        
        // Display bookmark panel
        $timeout(function() {
            vm.view.change(vm.view.views.bookmark);
        }, 100);
    };
    
    var setBookmarkStatus = function() {
        if (!global.SyncEnabled.Get()) {
            return $q.resolve();
        }
        
        // Get bookmark active status and current page metadata
        return $q.all([
            platform.Bookmarks.ContainsCurrentPage(), 
            platform.PageMetadata.Get()
        ])
            .then(function(data) {
                if (!data) {
                    return $q.reject();
                }
                
                vm.bookmark.active = data[0];
                var metadata = data[1];
                
                if (vm.bookmark.active) {
                    // Get existing bookmark info
                    return bookmarks.Search({ url: metadata.url })
                        .then(function(results) {
                            var result = _.find(results, function(bookmark) { 
                                return bookmark.url.toLowerCase() === metadata.url.toLowerCase(); 
                            });
                            
                            if (!result) {
                                return $q.reject({ code: global.ErrorCodes.XBookmarkNotFound });
                            }
                            
                            var bookmark = new utility.XBookmark(
                                result.title, 
                                result.url, 
                                result.description,
                                result.tags);
                            
                            vm.bookmark.current = bookmark;
                            vm.bookmark.current.originalUrl = bookmark.url;
                            
                            // Display update form
                            vm.bookmark.displayUpdateForm = true;
                        });
                }
                else {
                    if (!metadata) {
                        return;
                    }
                    
                    // Get current page info
                    var bookmark = new utility.XBookmark(
                        metadata.title, 
                        metadata.url, 
                        metadata.description,
                        getTagArrayFromText(metadata.tags));
                    
                    vm.bookmark.current = bookmark;
                    
                    // Display add form
                    vm.bookmark.displayUpdateForm = false;
                }
            });
    };

    var setNewTabLinks = function() {
        var links = document.querySelectorAll('a.new-tab');
        var onClickEvent = function() {
            openUrl({ currentTarget: { href: this.href } });
        };
        
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            link.onclick = onClickEvent;
        }
    };

    var setServiceInformation = function(serviceInfo) {
        vm.settings.service.status = serviceInfo.status;
        vm.settings.service.statusMessage = serviceInfo.message;
    };

    var startSyncing = function() {
        vm.sync.showConfirmation = false;
        vm.working = true;
        queueSync();
    };

    var syncForm_CancelSyncConfirmation_Click = function() {
        // TODO: Ensure any sync messaging or process is cancelled also
        global.IsSyncing.Set(false);
        global.SyncEnabled.Set(false);
        vm.view.change(vm.view.views.login);
    };

    var syncForm_ClientSecret_Change = function() {
        // Update client secret complexity value
    	if (!!vm.settings.secret()) {
        	vm.settings.secretComplexity = complexify(vm.settings.secret());
    	}
    	else {
    		vm.settings.secretComplexity = null;
    	}
    };

    var syncForm_DisableSync_Click = function() {
        // If sync is in progress, display confirmation
        if (!!global.IsSyncing.Get()) {
            vm.settings.service.displayCancelSyncConfirmation = true;
            $timeout(function() {
                document.querySelector('#btnCancelSync_Confirm').focus();
            });
            return;
        }
        
        syncForm_CancelSyncConfirmation_Click();
    };
    
    var syncForm_EnableSync_Click = function() {
		if (!vm.syncForm.txtClientSecret.$valid) {
			document.querySelector('[name=txtClientSecret]').select();
            return;
		}
        
        // If ID provided, display confirmation panel
        if (!!global.Id.Get()) {
            vm.sync.showConfirmation = true;
            $timeout(function() {
                document.querySelector('#btnSync_Confirm').focus();
            });
        }
        else {
            // Otherwise start syncing
            startSyncing();
        }
	};
    
    var toggleBookmark_Click = function() {
        // Display bookmark panel
        vm.view.change(vm.view.views.bookmark);
        
        // Show loading animation
        vm.working = true;
        
        // Set bookmark status
        setBookmarkStatus()
            .then(function() {
                // Hide loading animation
                vm.working = false;
            })
            .catch(function(err) {
                // Display alert
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');
            });
    };

    var updateServiceUrlForm_Cancel_Click = function() {
        vm.settings.service.displayUpdateServiceUrlForm = false;
        vm.settings.service.newServiceUrl = vm.settings.service.url();
        updateServiceUrlForm_SetValidity(true);
    };

    var updateServiceUrlForm_CheckServiceUrl = function(url, callback) {
        url = url.replace(/\/$/, '');
        return api.CheckServiceStatus(url)
            .then(callback)
            .catch(function(err) {
                updateServiceUrlForm_SetValidity(false);
                document.querySelector('[name=txtServiceUrl]').focus();
            })
            .finally(function() {
                vm.working = false;
            });
    };
    
    var updateServiceUrlForm_Confirm_Click = function() {
        // Check service url
        var url = vm.settings.service.newServiceUrl.replace(/\/$/, '');
        
        // Disable sync
        vm.sync.enabled(false);
        
        // Update the service URL
        vm.settings.service.url(url);
        
        // Remove saved client secret and ID
        global.ClientSecret.Set('');
        vm.settings.secretComplexity = null;
        global.Id.Set('');
        
        // Update service status
        api.CheckServiceStatus()
            .then(setServiceInformation)
            .catch(function(err) {
                vm.settings.service.status = global.ServiceStatus.Offline;
            });
        
        // Reset view
        vm.settings.service.displayCancelSyncConfirmation = false;
        vm.settings.service.displayUpdateServiceUrlConfirmation = false;
        vm.settings.service.displayUpdateServiceUrlForm = false;
        vm.settings.service.newServiceUrl = vm.settings.service.url();
        updateServiceUrlForm_SetValidity(true);
    };
    
    var updateServiceUrlForm_Display_Click = function() {
        // Display update form panel
        vm.settings.service.displayUpdateServiceUrlForm = true;

        // Check service url
        updateServiceUrlForm_CheckServiceUrl(vm.settings.service.newServiceUrl);
        
        // Focus on url field
        $timeout(function() {
            document.querySelector('input[name="txtServiceUrl"]').focus();            
        });
    };

    var updateServiceUrlForm_SetValidity = function(isValid) {
        vm.updateServiceUrlForm.txtServiceUrl.$setValidity('InvalidService', isValid);
    };
	
	var updateServiceUrlForm_Update_Click = function() {
        updateServiceUrlForm_SetValidity(true);
        
        // Return if the form is not valid
		if (!vm.updateServiceUrlForm.txtServiceUrl.$valid) {
			document.querySelector('[name=txtServiceUrl]').focus();
            return;
		}

        vm.working = true;
        
        // Check service url
        updateServiceUrlForm_CheckServiceUrl(vm.settings.service.newServiceUrl, function(response) {
            if (!!global.SyncEnabled.Get()) {
                // Display confirmation panel
                vm.settings.service.displayUpdateServiceUrlConfirmation = true;
                $timeout(function() {
                    document.querySelector('#btnUpdateServiceUrl_Confirm').focus();
                });
            }
            else {
                // Update service status and message
                setServiceInformation(response);
                
                // Update service url
                updateServiceUrlForm_Confirm_Click();
            }
        });
    };

    var updateServiceUrlForm_Update_KeyPress = function($event) {
        updateServiceUrlForm_SetValidity(true);
    };
	
	// Call constructor
    return new BrowserAction();
};