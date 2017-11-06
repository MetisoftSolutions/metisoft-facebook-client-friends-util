Client-side utilities for processing Facebook friends data. Intended to be run on a Cordova app with the (cordova-plugin-facebook4)[https://github.com/jeduan/cordova-plugin-facebook4] plugin.

After including `src/index.js` into your HTML document, the `FriendsUtil` class will be accessible at:
```javascript
window.MetisoftSolutions.facebookClientFriendsUtil.FriendsUtil
```

To generate documentation:
```
npm install
npm run genDocs
```
Then point your browser to `doc/jsdoc/index.html`.