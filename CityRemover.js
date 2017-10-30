(function () {
    var count = 0;
    var thisUser = W.loginManager.user;
    if (thisUser === null)
        return;
    // var usrRank = thisUser.normalizedLevel;
    var UpdateObject;
    var UpdateSegmentAddress;
    var AddAlternateStreet;
    var cityName;
    var segs;
    //Maximum number of segments to edit at a time.
    var maxSegmentCount = 50;

    if (typeof (require) !== "undefined") {
        UpdateObject = require("Waze/Action/UpdateObject");
        AddAlternateStreet = require("Waze/Action/AddAlternateStreet");
        try {
            UpdateSegmentAddress = require("Waze/Action/UpdateSegmentAddress");
        } catch (e) {}
        if (typeof(UpdateSegmentAddress) != "function") {
            UpdateSegmentAddress = require("Waze/Action/UpdateFeatureAddress");
        }
    }
    else {
        UpdateObject = W.Action.UpdateObject;
        AddAlternateStreet = W.Action.AddAlternateStreet;
        UpdateSegmentAddress = W.Action.UpdateSegmentAddress;
    }

    function onScreen(obj) {
        if (obj.geometry) {
            return (W.map.getExtent().intersectsBounds(obj.geometry.getBounds()))
        }
        return (false)
    }

    function removeCity(seg, streetId, isAlt) {
        var street = W.model.streets.get(streetId);
        if (street != null) {
            var cityID = street.cityID;
            if (cityID != null) {
                var city = W.model.cities.get(cityID);
                if (city.name == cityName) {
                    if (!seg.isGeometryEditable()) {
                        console.log("Cannot edit segment " + seg.attributes.id);
                        return false;
                    }
                    else {
                        var attr;
                        if (!isAlt) {
                            segs.push(seg);
                            count++;
                            attr = {
                                countryID: city.countryID,
                                stateID: city.stateID,
                                emptyCity: true
                            };
                            if (street.name == null) {
                                attr.emptyStreet = true;
                            }
                            else {
                                attr.streetName = street.name;
                            }

                            //Update the city for an existing segment.
                            var u = new UpdateSegmentAddress(seg, attr, { streetIDField: "primaryStreetID" });
                            W.model.actionManager.add(u);
                        }
                        else {
                            //Remove the alternate street for this segment
                            var u = new UpdateObject(seg, { streetIDs: seg.attributes.streetIDs.remove(street.id) });
                            W.model.actionManager.add(u);

                            attr = {
                                emptyCity: true
                            };
                            if (street.name == null) {
                                attr.emptyStreet = true;
                            }
                            else {
                                attr.streetName = street.name;
                            }
                            //Add a new alternate street with a blank city
                            var addAlt = new AddAlternateStreet(seg, attr);
                            W.model.actionManager.add(addAlt);
                        }
                    }
                }
            }
        }

        return true;
    }

    cityName = prompt("Please enter city name to remove.");

    if (cityName != null) {
        segs = new Array();

        for (var seg in W.model.segments.objects) {
            var segment = W.model.segments.get(seg);
            if (segment != null) {
                if (count < maxSegmentCount && onScreen(segment)) {
                    var sid = segment.attributes.primaryStreetID;
                    if (removeCity(segment, sid, false)) {
                        if (segment.attributes.streetIDs != null) {
                            for (var ix = 0; ix < segment.attributes.streetIDs.length; ix++) {
                                removeCity(segment, segment.attributes.streetIDs[ix], true);
                            }
                        }
                    }
                }
            }
        }

        //W.selectionManager.select(segs);
    }

})();