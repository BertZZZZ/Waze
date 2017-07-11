// ==UserScript==
// @name           WME EmptyStreet
// @description    Makes creating new streets in developing areas faster
// @namespace      bert@schoofs-ven.com
// @grant          none
// @grant          GM_info
// @version        0.0.1
// @include        https://www.waze.com/*/editor/*
// @include        https://www.waze.com/editor/*
// @include        https://beta.waze.com/*
// @exclude        https://www.waze.com/user/*editor/*
// @exclude        https://www.waze.com/*/user/*editor/*
// @author         Bert Schoofs '2017
// @license        MIT/BSD/X11
// @icon
// ==/UserScript==
/* Changelog

*/
var VERSION = '0.0.1';

var selectedItems;

function log(message) {
    if (typeof message === 'string') {
        console.log('Street: ' + message);
    } else {
        console.log('WMEEmptyStreet: ', message);
    }
}

// initialize WMEEmptyStreet and do some checks
function WMEEmptyStreet_bootstrap() {
	if(!window.Waze.map) {
		setTimeout(WMEEmptyStreet_bootstrap, 1000);
		return;
	}
    WMEEmptyStreet_init();
    log("Start");
}

function WMEEmptyStreet_init() {
    //create the WMEEmptyStreet object
    var WMEEmptyStreet = {},
        editpanel =  $("#edit-panel");

    // Check initialisation
    if (typeof Waze == 'undefined' || typeof I18n == 'undefined') {
        setTimeout(WMEEmptyStreet_init, 660);
        log('Waze object unavailable, map still loading');
        return;
    }
    if (editpanel === undefined) {
        setTimeout(WMEEmptyStreet_init, 660);
        log('edit-panel info unavailable, map still loading');
        return;
    }

WMESpeedhelper.makeButton = function(receiver) {

  $div.append(
    $('<div>', {class:'btn btn-default' + ' btn-positive',title:"a button"})
                        .click(function() {  })
              );
  };

  /*   // check for changes in the edit-panel
  var emptyStreetObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
          // Mutation is a NodeList and doesn't support forEach like an array
          for (var i = 0; i < mutation.addedNodes.length; i++) {
              var addedNode = mutation.addedNodes[i];

              // Only fire up if it's a node
              if (addedNode.nodeType === Node.ELEMENT_NODE) {
                  var emptyStreetDiv = addedNode.querySelector('div.controls.emptyStreet');

                  if (emptyStreetDiv) {
                      WMEEmptyStreet.makeButton(emptyStreetDiv);
                  }

              }
          }
      });
  });

  emptyStreetObserver.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });

*/

}
setTimeout(WMEEmptyStreet_bootstrap, 3000);
