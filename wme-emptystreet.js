// ==UserScript==
// @name           WME EmptyStreet
// @description    Makes creating new streets in developing areas faster
// @grant          none
// @grant          GM_info
// @version        2.2.1
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor.*$/
// @author         BertZZZZ '2017
// @license        MIT/BSD/X11
// @icon
// @require https://greasyfork.org/scripts/16071-wme-keyboard-shortcuts/code/WME%20Keyboard%20Shortcuts.js
// ==/UserScript==
// Some code reused from MapOMatic, GertBroos, Glodenox

/* Changelog

v2.2.1
Added some state support
Still searching for a way to be sure of the state when drawing a not connected street.

v2.2.0
Now displays default city on top + help
bugfixing of the "U" functionality - disabled on existing segments - retains city
changed log behaviour
contains uncompleted features ()

v2.1.0
Fix drawing empty segments in areas where  no other empty segments were available.
default to top level stateID

v2.0.2
Fix check on city difference for empty cities

v2.0.1
Typo in dialog box fixed

v0.2.0
Script now detects if a city can be reused and prompts the user if this becomes the default selection. If cancelled, the city will be set as empty.
New segments are created using this city until 'l' is pressed or the segment is connected to another city.
If cancelled, the city will be emptied.
When no "empty cities" exists in the area, then an error is given.

v0.1.2
Reverted to Rickzabels shortcut script after adoption of internationalisation.
Inserted Glodenox generic url include

v0.1.1
Moved and internationalizd rickzabels shiortcut script into the body
should now work in any language

v0.1.0
Drawing a lot of streets in not yet developed Waze countries?  Then save some time and energy by drawing empty streets i.o. unnamed streets.
Using shortcut 'k' io 'i' will draw a segment with emptyStreet and emptyCity checkbox set.
Alternatively, when 1 segement is unnamed, a button (or shortcut 'u') will empty the street and city checkboxes

This is the very first version.
Only works in english (due to english only helperscripts)
Only tested in Chrome
Be careful around country borders - not tested there
Happy to get some feedback - It's my first public user script  (and coding in javascript in general) - so constructive suggestions welcome.

*/



var VERSION = '2.2.1';
var shortcutEmptyStreet = "u",
    shortcutEmptyStreetDesc = "emptyStreet"; // to move to a config panel, once...
var shortcutDrawAndEmptyStreet = "k",
    shortcutDrawAndEmptyStreetDesc = "drawEmptyStreet"; // to move to a config panel, once...
var shortcutResetCityAssignment = "j",
    shortcutResetCityAssignmentDesc = "resetCityAssignment"; // to move to a config panel, once...
var shortcutEmptyCitySegment = "A+u",
    shortcutEmptyCitySegmentDesc = "emptyCity (n/a)"; // to move to a config panel, once...
var selectedItems;
var UpdateObject,
    AddOrGetCity,
    AddOrGetStreet,
    MultiAction;

var emptyStreetHelp = shortcutEmptyStreetDesc + ": " + shortcutEmptyStreet + " / " +
    shortcutDrawAndEmptyStreetDesc + ": " + shortcutDrawAndEmptyStreet + " / " +
    shortcutResetCityAssignmentDesc + ": " + shortcutResetCityAssignment + " / " +
    shortcutEmptyCitySegmentDesc + ": " + shortcutEmptyCitySegment;

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

    // from bestpractice advice on https://wiki.waze.com/wiki/Scripts/WME_JavaScript_development
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
    // own code here

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

    var emptyStreetToggle = false;
    var invokeEmptyStreetToggle = false;
    var cityIDAssigned = null; // null = to be set, 0 = keep city empty , other number = use city

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

    function drawEmptyStreet() {
        invokeEmptyStreetToggle = true;
        W.accelerators.events.triggerEvent("drawSegment", this);
    }

    function countNewSegments() {
        var segments = W.selectionManager.selectedItems;
        var segmentCount = 0;
        if (segments.length === 0 || segments[0].model.type !== 'segment') {
            //            log("No segments selected");
            return 0;
        }
        segments.forEach(function(segment) {
            var segModel = segment.model;
            if (segModel.attributes.primaryStreetID === null) {
                segmentCount += 1;
            }
        });
        return segmentCount;
    }


    function displayCurrentEmptyCityLocation() {
        var locationDiv = document.querySelector('#topbar-container > div > div > div.location-info-region > div');
        var emptyStreetDiv = locationDiv.querySelector('small');
        var defaultCityDisplay;

        if (emptyStreetDiv == null) {
            emptyStreetDiv = document.createElement('small');
            emptyStreetDiv.style.marginLeft = '5px';
            locationDiv.appendChild(emptyStreetDiv);
        }
        switch (cityIDAssigned) { // null = to be set, 0 = keep city empty , other number = use city
            case null:
                defaultCityDisplay = "to set";
                break;
            case 0:
                defaultCityDisplay = "empty";
                break;
            default:
                defaultCityDisplay = getCity(cityIDAssigned).attributes.name;
        }
        emptyStreetDiv.textContent = '[Default ES City: ' + defaultCityDisplay + ']' + " " + emptyStreetHelp;
    }

    //Look if a connected segment has already a city assigned
    //This version only looks at directly connected segments

    function getConnectedSegmentIDs(segmentToSearch) {
        var IDs = [];
        var segmentID = segmentToSearch.attributes.id;
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

    function warnAndResetCityAssignment() {
        log("Different cities detected, resetting city assignment");
        resetCityAssignment();
        alert("EmptyStreet connected to different cities. Please assign cities manually");
        displayCurrentEmptyCityLocation();
    }

    function getFirstConnectedStateID(startSegment) {
        var stateID = null;
        var nonMatches = [];
        var segmentIDsToSearch = [startSegment.attributes.id];
        while (stateID === null && segmentIDsToSearch.length > 0) {
            var startSegmentID = segmentIDsToSearch.pop();
            startSegment = W.model.segments.get(startSegmentID);
            var connectedSegmentIDs = getConnectedSegmentIDs(startSegment);
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



    function getConnectedCityID(segmentSelected, stateID) {
        var cityID = null;
        var connectedSegmentIDs = getConnectedSegmentIDs(segmentSelected);
        var emptyCityID = getEmptyCity(stateID).attributes.id;
        for (var i = 0; i < connectedSegmentIDs.length; i++) {
            var streetID = W.model.segments.get(connectedSegmentIDs[i]).attributes.primaryStreetID;
            if (streetID !== null && typeof(streetID) !== 'undefined') {
                var currentCityID = W.model.streets.get(streetID).cityID;
                if (currentCityID != emptyCityID) {
                    if (cityID === null) {
                        cityID = currentCityID;
                        var cityNameFound = getCity(cityID).attributes.name;
                        log("City found:" + cityNameFound);
                    } else if (cityID !== currentCityID) {
                        // log("getConnectedCityID():Different Cities found:" + cityID + " & " + currentCityID);
                        return -999;
                    }
                }
            }
        }
        return cityID;
    }

    function getCity(cityID) {
        var cities = W.model.cities.getByIds([cityID]);
        if (cities.length > 0) {
            return cities[0];
        } else {
            return null;
        }
    }

    function getEmptyCity(stateID) {
        var emptyCity = null;
        W.model.cities.getObjectArray().forEach(function(city) {
            if (city.attributes.stateID === stateID && city.attributes.isEmpty) {
                emptyCity = city;
            }
        });
        return emptyCity;
    }

    // code MapOMatic until here

    function setEmptyStreetAndCity(resetCityOnly) {
        var cityIDToSet, state, stateID, country, addCityAction, suggestedCity, segModel;
        var addStreetAction, addEsCity, action3, targetStreet, newStreet;
        var segments = W.selectionManager.selectedItems;

        emptyStreetToggle = false; //Only run once

        segModel = segments[0].model;
        if (W.model.hasStates()) {
            if (segModel.attributes.id == -100) {
                stateID = W.model.states.top.id;
                alert("Using state: " + W.model.states.top.name + ". Do not save if not correct!");
            } else {
                stateID = getFirstConnectedStateID(segModel);
            }
        } else {
            stateID = W.model.states.top.id;
        }
        state = W.model.states.get(stateID);


        if (segments.length === 0 || segments[0].model.type !== 'segment') {
            log("emptyStreetAndCity should not have been invoked");
            return;
        }
        if (segments.length !== 1) {
            alert("EmptyStreet script only works on one segment");
            return;
        }

        if (resetCityOnly) {
            suggestedCity = -998;
        } else {
            suggestedCity = getConnectedCityID(segments[0].model, stateID);
        }

        if (suggestedCity == -998) {
            log("City to be wiped");
        } else if (suggestedCity == -999) {
            warnAndResetCityAssignment();
            return;
        } else if (suggestedCity == null) {
            log("No connected cities detected");
        } else if (cityIDAssigned === null) { // no choice is made if city is to be reused.
            // dialog to accept new city as default
            var cityNameFound = getCity(suggestedCity).attributes.name;
            if (confirm("Continue using city:" + cityNameFound + "?")) {
                cityIDAssigned = suggestedCity;
            } else {
                cityIDAssigned = 0; // next edits remain empty
            }
            displayCurrentEmptyCityLocation();
            // log("cityIDAssigned=" + cityIDAssigned);
        } else if (cityIDAssigned != suggestedCity) {
            log("setEmptyStreetAndCity(): warnAndResetCityAssignment");
            warnAndResetCityAssignment();
            return;
        }

        // Most code reused from WME ClickSaver 0.8.2 script from MapOMatic

        if (cityIDAssigned === 0 || cityIDAssigned === null || resetCityOnly) { // make it empty
            cityIDToSet = getEmptyCity(stateID).attributes.id;
            // log("EmptyCity used:" + cityIDToSet);
        } else {
            cityIDToSet = cityIDAssigned;
            // log("Reusing saved cityID:" + cityIDToSet);
        }

        var m_action = new MultiAction();
        m_action.setModel(W.model);

        if (W.model.hasStates()) {
            country = Waze.model.countries.get(state.countryID);
        } else {
            country = Waze.model.countries.get(Waze.model.countries.top.id);
        }
        addCityAction = new AddOrGetCity(state, country, ""); //why a true here in orginal script?
        m_action.doSubAction(addCityAction);

        if (segModel.attributes.primaryStreetID === null) { // process a new street
            addEsCity = Waze.model.cities.objects[cityIDToSet];
            newStreet = {
                isEmpty: true,
                cityID: cityIDToSet
            };
            targetStreet = W.model.streets.getByAttributes(newStreet)[0];
            if (!targetStreet) {
                addStreetAction = new AddOrGetStreet("", addEsCity, true);
                m_action.doSubAction(addStreetAction);
                targetStreet = W.model.streets.getByAttributes(newStreet)[0];
                if (!targetStreet) {
                    alert("No emptyStreet found in the model. Aborting edit.");
                    return;
                }
            }
            action3 = new UpdateObject(segModel, {
                primaryStreetID: targetStreet.id
            });
            m_action.doSubAction(action3);
            W.model.actionManager.add(m_action);
            log("emptyStreet added");

        } else { // process an existing street
            alert("Processing existing streets function not yet implemented");
            return;
        }

    }

    function emptyCitySegment() {
        setEmptyStreetAndCity(true);
    }

    WMEEmptyStreet.makeButton = function(receiver) {
        var _button = document.createElement("button");
        _button.id = "emptyStreetButton";
        _button.className = "btn btn-default";
        _button.style = "float: right; height: 20px;line-height: 20px;padding-left: 4px;padding-right: 4px;margin-right: 4px;padding-top: 2px; margin-top:2px";
        _button.title = "Check the emptyStreet and emptyCity checkboxes";
        _button.innerHTML = shortcutEmptyStreet;
        _button.onclick = function() {
            setEmptyStreetAndCity();
        };
        receiver.append(_button);
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
                        // intent is to process 1 street at a time, just after creation for multi selections please use other scripts or upgrade this one .
                        var newSegmentCount = countNewSegments();
                        var selectionlength = W.selectionManager.selectedItems.length;
                        if (newSegmentCount == 1 && selectionlength == 1) {
                            WMEEmptyStreet.makeButton(emptyStreetDiv);
                        }
                    }

                }
            }
        });
    });


    function emptyStreetPatchDrawSegment(t) {
        // Make sure the emptyStreet does not run after a cancelled edit event.
        var newFunction = {
            func: function() {
                if (invokeEmptyStreetToggle) {
                    emptyStreetToggle = true;
                    invokeEmptyStreetToggle = false;
                } else {
                    emptyStreetToggle = false;
                }
            }
        };
        var orginalFunction = W.accelerators.events.listeners.drawSegment[0];
        W.accelerators.events.listeners.drawSegment.unshift(newFunction);
    }

    function resetCityAssignment() {
        log("Default City " + cityIDAssigned + " reset to null");
        cityIDAssigned = null;
        displayCurrentEmptyCityLocation();
    }

    function WMEEmptyStreet_onSelectionChanged() {
        var suggestedCity = null;
        if (W.selectionManager.selectedItems.length == 1) {
            if (emptyStreetToggle) {
                setEmptyStreetAndCity();
            }
        }
    }

    function WMEEmptyStreet_Hook() {
        emptyStreetPatchDrawSegment();
        // event on selection change
        W.selectionManager.events.register("selectionchanged", this, WMEEmptyStreet_onSelectionChanged);
        console.log("WMEEmptyStreet: Hook");
    }

    WMEKSRegisterKeyboardShortcut('WMEEmptyStreet', 'WME emptyStreet', 'emptyStreetSegment', 'Set street and city to empty', setEmptyStreetAndCity, shortcutEmptyStreet);
    WMEKSRegisterKeyboardShortcut('WMEEmptyStreet', 'WME emptyStreet', 'drawEmptyStreet', 'Draw street and city to empty', drawEmptyStreet, shortcutDrawAndEmptyStreet);
    WMEKSRegisterKeyboardShortcut('WMEEmptyStreet', 'WME emptyStreet', 'resetCityAssignment', 'Reset default city', resetCityAssignment, shortcutResetCityAssignment);
    WMEKSRegisterKeyboardShortcut('WMEEmptyStreet', 'WME emptyStreet', 'emptyCitySegment', 'Set city to empty', emptyCitySegment, shortcutEmptyCitySegment);

    WMEEmptyStreet_Hook();

    // A button for the edit panel as well
    emptyStreetObserver.observe(document.getElementById('edit-panel'), {
        childList: true,
        subtree: true
    });

    // Display the default location on top
    displayCurrentEmptyCityLocation();

}
setTimeout(WMEEmptyStreet_bootstrap, 3000);
