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
// @require https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js?version=203372
// ==/UserScript==
/* Changelog

*/

var VERSION = '0.0.1';
var selectedItems;
var UpdateObject,
    AddOrGetCity,
    AddOrGetStreet,
    MultiAction;


function log(message) {
    if (typeof message === 'string') {
        console.log('WMEEmptyStreet: ' + message);
    } else {
        console.log('WMEEmptyStreet: ', message);
    }
}

// initialize WMEEmptyStreet and do some checks
function WMEEmptyStreet_bootstrap() {
    if (!window.Waze.map) {
        setTimeout(WMEEmptyStreet_bootstrap, 1000);
        return;
    }
    /* from bestpractice advice on https://wiki.waze.com/wiki/Scripts/WME_JavaScript_development
  var bGreasemonkeyServiceDefined = false;

  try {
    if ("object" === typeof Components.interfaces.gmIGreasemonkeyService) {
      bGreasemonkeyServiceDefined = true;
    }
  } catch (err) {
    //Ignore.
  }
  if ("undefined" === typeof unsafeWindow || !bGreasemonkeyServiceDefined) {
    unsafeWindow = (function() {
      var dummyElem = document.createElement('p');
      dummyElem.setAttribute('onclick', 'return window;');
      return dummyElem.onclick();
    })();
  }
 */
    // own code here

    log("Start initialisation for:"+WazeWrap.User.Username());
    //not sure how require works but we need the Action
    if (typeof(require) !== "undefined") {
        UpdateObject = require("Waze/Action/UpdateObject");
        AddOrGetCity = require("Waze/Action/AddOrGetCity");
        AddOrGetStreet = require("Waze/Action/AddOrGetStreet");
        MultiAction = require("Waze/Action/MultiAction");
    }

    WMEEmptyStreet_init();
    log("Initalised");
}

function WMEEmptyStreet_init() {

    var WMEEmptyStreet = {},
        editpanel = $("#edit-panel");

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

    function countNewSegments() {
        var segments = W.selectionManager.selectedItems;
        var segmentCount = 0;
        log("segmentLength" + segments.length);
        if (segments.length === 0 || segments[0].model.type !== 'segment') {
            log("No segments selected");
            return 0;
        }
        segments.forEach(function(segment) {
            var segModel = segment.model;
            if (segModel.attributes.primaryStreetID === null) {
                segmentCount += 1;
            }
        });
        log("Nr of new segments" + segmentCount);
        return segmentCount;
    }

    // Code below from MapOMatic source: WME ClickSaver 0.8.2 script
    function getConnectedSegmentIDs(segmentID) {
        var IDs = [];
        var segment = W.model.segments.get(segmentID);
        [W.model.nodes.get(segment.attributes.fromNodeID), W.model.nodes.get(segment.attributes.toNodeID)].forEach(function(node) {
            if (node) {
                node.attributes.segIDs.forEach(function(segID) {
                    if (segID !== segmentID) {
                        IDs.push(segID);
                    }
                });
            }
        });
        return IDs;
    }

    function getFirstConnectedStateID(startSegment) {
        var stateID = null;
        var nonMatches = [];
        var segmentIDsToSearch = [startSegment.attributes.id];
        while (stateID === null && segmentIDsToSearch.length > 0) {
            var startSegmentID = segmentIDsToSearch.pop();
            startSegment = W.model.segments.get(startSegmentID);
            var connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
            for (var i = 0; i < connectedSegmentIDs.length; i++) {
                var streetID = W.model.segments.get(connectedSegmentIDs[i]).attributes.primaryStreetID;
                if (streetID !== null && typeof(streetID) !== 'undefined') {
                    var cityID = W.model.streets.get(streetID).cityID;
                    stateID = W.model.cities.get(cityID).attributes.stateID;
                    break;
                }
            }

            if (stateID === null) {
                nonMatches.push(startSegmentID);
                connectedSegmentIDs.forEach(function(segmentID) {
                    if (nonMatches.indexOf(segmentID) === -1 && segmentIDsToSearch.indexOf(segmentID) === -1) {
                        segmentIDsToSearch.push(segmentID);
                    }
                });
            } else {
                return stateID;
            }
        }
        return null;
    }

    function getFirstConnectedCityID(startSegment) {
        var cityID = null;
        var nonMatches = [];
        var segmentIDsToSearch = [startSegment.attributes.id];
        while (cityID === null && segmentIDsToSearch.length > 0) {
            var startSegmentID = segmentIDsToSearch.pop();
            startSegment = W.model.segments.get(startSegmentID);
            var connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
            for (var i = 0; i < connectedSegmentIDs.length; i++) {
                var streetID = W.model.segments.get(connectedSegmentIDs[i]).attributes.primaryStreetID;
                if (streetID !== null && typeof(streetID) !== 'undefined') {
                    cityID = W.model.streets.get(streetID).cityID;
                    break;
                }
            }

            if (cityID === null) {
                nonMatches.push(startSegmentID);
                connectedSegmentIDs.forEach(function(segmentID) {
                    if (nonMatches.indexOf(segmentID) === -1 && segmentIDsToSearch.indexOf(segmentID) === -1) {
                        segmentIDsToSearch.push(segmentID);
                    }
                });
            } else {
                return cityID;
            }
        }
        return null;
    }

    // Code above from MapOMatic source: WME ClickSaver 0.8.2 script


    function setEmptyStreetAndCity() {
        // Most code from WME ClickSaver 0.8.2 script from MapOMatic
        var segmentCount = 0;
        var segments = W.selectionManager.selectedItems;
//        log("segmentLength" + segments.length);

        if (segments.length === 0 || segments[0].model.type !== 'segment') {
            alert("emptyStreetAndCity should not have been invoked");
            return;
        }
        if (segments.length !== 1) {
            alert("EmptyStreet script only works on one segment");
            return;
        }

        segments.forEach(function(segment) {
            var segModel = segment.model;
            // this script is intended only to process not yet confirmed streets
            if (segModel.attributes.primaryStreetID === null) {
                log('Selection type:' + segModel.type);
                log('Updating segment:' + segModel.attributes.id);
                var emptyCityID =  W.model.streets.getByAttributes({isEmpty:true})[0].cityID;
                log('cityID found:' + emptyCityID);
                var emptyState = W.model.cities.objects[emptyCityID];
                log('stateID found:' + emptyState.attributes.stateID);
                var country = W.model.countries.get(W.model.countries.top.id);
                log('In country:' + country.abbr);

                var addCityAction = new AddOrGetCity(emptyState, country, "");
                var newStreet = {
                    isEmpty: true,
                    cityID: emptyCityID
                };
                var emptyStreet = W.model.streets.getByAttributes(newStreet)[0];
                log("emptyStreet ID:"+emptyStreet.id);
                var emptyCity = Waze.model.cities.objects[emptyCityID];
                var addStreetAction = new AddOrGetStreet("", emptyCity, true);
                var action3 = new UpdateObject(segModel, {
                    primaryStreetID: emptyStreet.id
                });
                log("addStreetAction:"+ addStreetAction);
                //construct the change
                var m_action = new MultiAction();
                m_action.setModel(W.model);
                m_action.doSubAction(addCityAction);
                m_action.doSubAction(addStreetAction);
                m_action.doSubAction(action3);
                W.model.actionManager.add(m_action);
            }
            segmentCount += 1;
        });
        log("Amount of segments set to empty:" + segmentCount);
    }


    WMEEmptyStreet.makeButton = function(receiver) {
        var toProcess = countNewSegments();
        if (toProcess == 1) {
            var _button = document.createElement("button");
            _button.id = "emptyStreetButton";
            _button.className = "btn btn-default";
            _button.style = "float: right; height: 20px;line-height: 20px;padding-left: 8px;padding-right: 8px;margin-right: 4px;padding-top: 1px; margin-top:3px";
            _button.title = "Check the emptyStreet and emptyCity checkboxes";
            _button.innerHTML = "E";
            _button.onclick = function() {
                setEmptyStreetAndCity();
            };
            receiver.append(_button);
        } else {
  //          log("not showing a button . Amount of segments counted" + toProcess);
        }
    };

    // check for changes in the edit-panel
    var emptyStreetObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // Mutation is a NodeList and doesn't support forEach like an array

            for (var i = 0; i < mutation.addedNodes.length; i++) {
                var addedNode = mutation.addedNodes[i];

                // Only fire up if it's a node
                if (addedNode.nodeType === Node.ELEMENT_NODE) {
                    var emptyStreetDiv = addedNode.querySelector('div.clearfix.preview');

                    if (emptyStreetDiv) {
                        WMEEmptyStreet.makeButton(emptyStreetDiv);
                    }

                }
            }
        });
    });

    emptyStreetObserver.observe(document.getElementById('edit-panel'), {
        childList: true,
        subtree: true
    });
}
setTimeout(WMEEmptyStreet_bootstrap, 3000);
