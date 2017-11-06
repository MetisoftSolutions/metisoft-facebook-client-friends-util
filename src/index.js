'use strict';

window.MetisoftSolutions = window.MetisoftSolutions || {};
window.MetisoftSolutions.facebookClientFriendsUtil = window.MetisoftSolutions.facebookClientFriendsUtil || {};



(function() {

  /** @module metisoftFacebookClientFriendsUtil */

  /**
   * @typedef Friend
   * @type Object
   *
   * @property {String?} id
   *    The internal ID our database uses. Not necessarily
   *    always specified in an object.
   *
   * @property {String} facebookId
   * @property {String} name
   * @property {String} profilePictureUrl
   */

  /**
   * @class
   * @classdesc
   *    An instance of `FriendsUtil` provides functions for retrieving data about a user's
   *    Facebook friends from the Facebook servers. The instance will retrieve and cache the
   *    friends data with a call to `getAndStoreAllFriends()`. The cached data can then be
   *    retrieved using `getFriends()`.
   *
   * @public
   * @memberof module:metisoftFacebookClientFriendsUtil
   *
   * @param {FacebookConnectPlugin} facebookConnectPlugin
   *    An instance of the `cordova-plugin-facebook4` plugin. Found in `window.facebookConnectPlugin`
   *    if installed.
   *
   * @param {String[]} facebookPermissions
   *    See [this page](https://developers.facebook.com/docs/facebook-login/permissions/)
   *    for valid permissions.
   *
   * @param {String} profilePlaceholderImageUrl
   *    An image to use as the placeholder image for Facebook friends that have no
   *    profile picture. This currently isn't implemented and the default Facebook
   *    profile picture is used instead.
   */
  function FriendsUtil(facebookConnectPlugin, facebookPermissions, profilePlaceholderImageUrl) {
    this.__facebookConnectPlugin = facebookConnectPlugin;
    this.__facebookPermissions = facebookPermissions;
    this.__profilePlaceholderImageUrl = profilePlaceholderImageUrl;
    this.__friends = [];
  }



  /**
   * This function hits Facebook to retrieve data on all of the users friends.
   * The data is stored in memory for later retrieval. This should only be called
   * once per user session.
   *
   * @public
   */
  FriendsUtil.prototype.getAndStoreAllFriends = function getAndStoreAllFriends() {
    var p = Promise.resolve({}),
        self = this,
        state = {
          beforeCursorId: '',
          afterCursorId: '',
          first: true,
          done: false
        };

    self.__friends = [];

    function __chainPromise(p) {
      p = p.then(function() {
          return self.__getAllFriendsResultsPage(state.first, state.beforeCursorId, state.afterCursorId);
        })

        .then(function(newState) {
          state = newState;
          self.__friends = self.__friends.concat(newState.friends);

          if (!state.done) {
            p = __chainPromise(p);
          }
        });  

      return p;
    }

    __chainPromise(p);
  };



  /**
   * @typedef __getAllFriendsResultsPage_RetVal
   * @type Object
   *
   * @property {module:metisoftFacebookClientFriendsUtil~Friend[]} friends
   * @property {String} beforeCursorId
   * @property {String} afterCursorId
   *
   * @property {Boolean} done
   *    This is set to `true` when the function detects that the last page has been read
   *    and no subsequent calls need to be made.
   *
   * @property {Boolean} first
   *    This is always set to `false` when returned from `__getAllFriendsResultsPage()`.
   */

  /**
   * Requests that return a lot of results, such as the entire list of a user's
   * friends, are paginated by Facebook. This function retrieves a page of results
   * and also returns cursor data so that the caller can call it again to retrieve
   * the next page.
   *
   * @private
   *
   * @param {Boolean} first
   *    Pass `true` if you want to get the first page.
   *
   * @param {String} beforeCursorId
   *    The ID of the `before` cursor, which is returned as part of the response.
   *    You can pass in the empty string for the first call.
   *
   * @param {String} afterCursorId
   *    The ID of the `after` cursor, which is returned as part of the response.
   *    This will be used in a subsequent call to get the next page. You can pass
   *    in the empty string for the first call.
   *
   * @returns {module:metisoftFacebookClientFriendsUtil~__getAllFriendsResultsPage_RetVal}
   */
  FriendsUtil.prototype.__getAllFriendsResultsPage = function __getAllFriendsResultsPage(first, beforeCursorId, afterCursorId) {
    var requestPath = 'me/friends?fields=id,name,picture',
        self = this,
        retVal = {
          friends: [],
          beforeCursorId: '',
          afterCursorId: '',
          done: false,
          first: false
        };

    return new Promise(function(resolve, reject) {
      document.addEventListener('deviceready', function() {
        if (!first && beforeCursorId === afterCursorId) {
          retVal.done = true;
          resolve(retVal);

        } else if (afterCursorId !== '') {
          requestPath += '&after=' + afterCursorId;
        }

        self.__facebookConnectPlugin.api(
          requestPath,
          self.__facebookPermissions,

          function(res) {
            retVal.friends = self.__parseFriendsData(res.data);
            if (retVal.friends.length === 0) {
              retVal.done = true;
            }

            if (res.paging && res.paging.cursors) {
              retVal.beforeCursorId = res.paging.cursors.before;
              retVal.afterCursorId = res.paging.cursors.after;
            } else {
              retVal.done = true;
            }

            resolve(retVal);
          },

          function(err) {
            reject(err);
          });
      });
    });
  };



  /**
   * @typedef FacebookFriend
   * @type Object
   *
   * @property {String} id
   *
   * @property {String} name
   *    The full name of the user.
   *
   * @property {Object} picture
   * @property {Object} picture.data
   *
   * @property {String} picture.data.url
   *    URL of the user's profile picture.
   */

  /**
   * This function takes the Facebook friends data and converts it to our
   * internal format.
   *
   * @private
   * @param {module:metisoftFacebookClientFriendsUtil~FacebookFriend[]} friends
   * @returns {module:metisoftFacebookClientFriendsUtil~Friend[]}
   */
  FriendsUtil.prototype.__parseFriendsData = function __parseFriendsData(friends) {
    return _.map(friends, function(friend) {
      return {
        facebookId: friend.id,
        name: friend.name,
        profilePictureUrl: friend.picture.data.url
      };
    });
  };



  /**
   * This function retrieves the saved list of Facebook friends for the 
   * logged-in user.
   *
   * @public
   * @returns {module:metisoftFacebookClientFriendsUtil~Friend[]}
   */
  FriendsUtil.prototype.getFriends = function getFriends() {
    return _.cloneDeep(this.__friends);
  };



  /**
   * This function clears out any stored friends data. This should be called if the user
   * logs out.
   *
   * @public
   */
  FriendsUtil.prototype.reset = function reset() {
    this.__friends = [];
  };



  window.MetisoftSolutions.facebookClientFriendsUtil.FriendsUtil = FriendsUtil;

})();