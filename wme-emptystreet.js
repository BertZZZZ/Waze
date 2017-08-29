// ==UserScript==
// @name           WME EmptyStreet
// @description    Makes creating new streets in developing areas faster
// @namespace      bert@schoofs-ven.com
// @grant          none
// @grant          GM_info
// @version        0.1.2
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor.*$/
// @author         Bert Schoofs '2017
// @license        MIT/BSD/X11
// @icon
// @require https://greasyfork.org/scripts/16071-wme-keyboard-shortcuts/code/WME%20Keyboard%20Shortcuts.js
// ==/UserScript==
// Some code reused from MapOMatic, GertBroos. Thanks Glodenox for the tip.

/* Changelog

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



var VERSION = '0.1.2';
var shortcutEmptyStreet = "u"; // to move to a config panel, once...
var shortcutDrawAndEmptyStreet = "k"; // to move to a config panel, once...
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


    function setEmptyStreetAndCity() {

        //Only run once
        emptyStreetToggle = false;

        var segments = W.selectionManager.selectedItems;

        if (segments.length === 0 || segments[0].model.type !== 'segment') {
            log("emptyStreetAndCity should not have been invoked");
            return;
        }
        if (segments.length !== 1) {
            alert("EmptyStreet script only works on one segment");
            return;
        }

        // Most code reused from WME ClickSaver 0.8.2 script from MapOMatic
        segments.forEach(function(segment) {
            var segModel = segment.model;
            // this script is intended only to process not yet confirmed streets
            if (segModel.attributes.primaryStreetID === null) {
                var emptyCityID = W.model.streets.getByAttributes({
                    isEmpty: true
                })[0].cityID;
                var emptyState = W.model.cities.objects[emptyCityID];
                var country = W.model.countries.get(W.model.countries.top.id);
                var addCityAction = new AddOrGetCity(emptyState, country, "");
                var newStreet = {
                    isEmpty: true,
                    cityID: emptyCityID
                };
                var emptyStreet = W.model.streets.getByAttributes(newStreet)[0];
                var emptyCity = Waze.model.cities.objects[emptyCityID];
                var addStreetAction = new AddOrGetStreet("", emptyCity, true);
                var action3 = new UpdateObject(segModel, {
                    primaryStreetID: emptyStreet.id
                });
                //construct the change
                var m_action = new MultiAction();
                m_action.setModel(W.model);
                m_action.doSubAction(addCityAction);
                m_action.doSubAction(addStreetAction);
                m_action.doSubAction(action3);
                W.model.actionManager.add(m_action);
                log("segment set to empty");
            }
        });
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

    function WMEEmptyStreet_onSelectionChanged() {
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


    WMEEmptyStreet_Hook();

    // A button for the edit panel as well
    emptyStreetObserver.observe(document.getElementById('edit-panel'), {
        childList: true,
        subtree: true
    });
}
setTimeout(WMEEmptyStreet_bootstrap, 3000);
