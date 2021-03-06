var APP = (function() {
    var map = (function() {
        var m = L.map('map').setView(GTT.Constants.VIEW_COORDS, 12);
        m.lc = GTT.BaseLayers.addTo(m);

        $('#map').resize(function() {
            m.setView(m.getBounds(),m.getZoom());
        });

        return m;
    })();

    var requestModel = (function() {
        var r = GTT.createRequestModel();

        var destLat = GTT.Constants.END_LAT;
        var destLng = GTT.Constants.END_LNG;

        var minStayTime = 60;

        r.setDestLatLng = function(newLat,newLng) {
            destLat = newLat;
            destLng = newLng;
            r.notifyChange();
        };
        r.getDestLatLng = function() {
            return { lat: destLat, lng: destLng };
        };

        r.setMinStayTime = function(newMinStayTime) {
            minStayTime = newMinStayTime;
            r.notifyChange();
        };
        r.getMinStayTime = function() {
            return minStayTime;
        };

        return r;
    })();


    var scenicRouteLayer = (function() {
        var mapLayer = null;
        var opacity = 0.9;

        var update = function() {
            var modes = requestModel.getModesString();
            if(modes != "") {
                var latLng = requestModel.getLatLng();
                var destLatLng = requestModel.getDestLatLng();
                var time = requestModel.getTime();
                var minStayTime = requestModel.getMinStayTime();
                var schedule = requestModel.getSchedule();
                var dynamicRendering = requestModel.getDynamicRendering();

                if (mapLayer) {
                    map.lc.removeLayer(mapLayer);
                    map.removeLayer(mapLayer);
                    mapLayer = null;
                }

                var url = GTT.Constants.BASE_URL + "/scenicroute/wms";
		mapLayer = new L.TileLayer.WMS(url, {
                    latitude: latLng.lat,
                    longitude: latLng.lng,
                    destlatitude: destLatLng.lat,
                    destlongitude: destLatLng.lng,
                    time: time,
                    minStayTime: minStayTime,
                    duration: requestModel.getDuration(),
                    modes: modes,
                    schedule: schedule,
                    breaks: GTT.Constants.BREAKS,
                    palette: GTT.Constants.COLORS,
                    attribution: 'Azavea'
		});
		
		mapLayer.setOpacity(opacity);
		mapLayer.addTo(map);
		map.lc.addOverlay(mapLayer, "Travel Times");
            }
        };

        requestModel.onChange(update);

        return {
            setOpacity : function(o) {
                opacity = o;
                if(mapLayer) { 
                    mapLayer.setOpacity(opacity); 
                }
            },
        };
    })();
    
    var vectorLayer = (function() {
        var vectorLayer = null;

        var update = function() {
            if (vectorLayer) {
                map.lc.removeLayer(vectorLayer);
                map.removeLayer(vectorLayer);
                vectorLayer = null; 
            }

            if(requestModel.getVector()) {
                var modes = requestModel.getModesString();
                if(modes != "") {
                    var latLng = requestModel.getLatLng();
                    var destLatLng = requestModel.getDestLatLng();
                    var time = requestModel.getTime();
                    var minStayTime = requestModel.getMinStayTime();
                    var duration = requestModel.getDuration();
                    var schedule = requestModel.getSchedule();

                    $.ajax({
                        url: GTT.Constants.BASE_URL + '/scenicroute/json',
                        dataType: "json",
                        data: { 
                            latitude: latLng.lat,
                            longitude: latLng.lng,
                            destlatitude: destLatLng.lat,
                            destlongitude: destLatLng.lng,
                            time: time,
                            duration: duration,
                            minStayTimes: minStayTime,
                            modes: modes,
                            schedule: schedule,
			    rows: 200,
			    cols: 200
                        },
                        success: function(data) {
                            if (vectorLayer) {
                                map.lc.removeLayer(vectorLayer);
                                map.removeLayer(vectorLayer);
                                vectorLayer = null; 
                            }

                            var geoJsonOptions = {
                                style: function(feature) {
                                    return {
                                        weight: 2,
                                        color: "#774C4A",
                                        opacity: 1,
                                        fillColor: "#9EFAE2",
                                        fillOpacity: 0.2
                                    };
                                }
                            };

                            vectorLayer = 
                                L.geoJson(data, geoJsonOptions)
                                 .addTo(map);
                        }
                    })
                }
            }
        }

        requestModel.onChange(update);

        return { update : update };
    })();
                          
    var startMarker = (function() {
        var lat = GTT.Constants.START_LAT;
        var lng = GTT.Constants.START_LNG;

        var startIcon = L.AwesomeMarkers.icon({
            color : 'green'
        })

        var marker = L.marker([lat,lng], {
            draggable: true,
            icon : startIcon
        }).addTo(map);
        
        marker.on('dragend', function(e) { 
            lat = marker.getLatLng().lat;
            lng = marker.getLatLng().lng;
            requestModel.setLatLng(lat,lng);
        } );

        marker.bindPopup("This is your starting location").openPopup();

        return {
            getMarker : function() { return marker; },
            getLat : function() { return lat; },
            getLng : function() { return lng; },
            setLatLng : function(newLat,newLng) {
                lat = newLat;
                lng = newLng;
                marker.setLatLng(new L.LatLng(lat, lng));
                requestModel.setLatLng(lat,lng);
            }
        }
    })();

    var endMarker = (function() {
        var lat = GTT.Constants.END_LAT;
        var lng = GTT.Constants.END_LNG;

        var endMarker = L.AwesomeMarkers.icon({
            color : 'red'
        })

        var marker = L.marker([lat,lng], {
            draggable: true,
            icon: endMarker
        }).addTo(map);

        marker.bindPopup("This is your destination");

        marker.on('dragend', function(e) { 
            lat = marker.getLatLng().lat;
            lng = marker.getLatLng().lng;
            requestModel.setDestLatLng(lat,lng);
        });

        return {
            getMarker : function() { return marker; },
            getLat : function() { return lat; },
            getLng : function() { return lng; },
            setLatLng : function(newLat,newLng) {
                lat = newLat;
                lng = newLng;
                marker.setLatLng(new L.LatLng(lat, lng));
                requestModel.setDestLatLng(lat,lng);
            }
        }
    })();


    var createMinStayTimeSlider = function() {
        var slider = $("#minstaytime-slider").slider({
            value: 60,
            min: 0,
            max: 60 * 30,
            step: 30,
            change: function( event, ui ) {

                requestModel.setMinStayTime(ui.value);
            },
        });

        return {
            setMinStayTime: function(o) {
                slider.slider('value', o);
            }
        }
    };

    /*Added by Kinan to support showing the school nodes, hopefully!*/
    function onEachFeature(feature, layer) {
        layer.on('click', function(e) {
            console.log("Clicked on school.");
            var latLng = feature.geometry.coordinates;
            requestModel.setLatLng( latLng[1], latLng[0] );
        });
        var schoolName = feature.properties.FACIL_NAME;
        var gradeLevel = feature.properties.GRADE_LEVE;
        var institType = feature.properties.INSTIT_TYP;
        var enrollment = feature.properties.ENROLLMENT;
        var active = feature.properties.ACTIVE;

        var popupContent = "<p><h4>" + schoolName + "</h4></p>" +
            "<p>Grade Level: " + gradeLevel + "</p>" +
            "<p>Institution Type: " + institType + "</p>" +
            "<p>Enrollments: " + enrollment + "</p>";
        if(isSchoolOpen(feature)){
            popupContent += "<p>This school is open &nbsp; <img src='img/smileyface.png'/></p>" ;
        }
        else
        {
            popupContent += "<p>This school is closed &nbsp; <img src='img/sadface.png'/></p>" ;
        }


        if (feature.properties && feature.properties.popupContent) {
            popupContent += feature.properties.popupContent;
        }

        layer.bindPopup(popupContent);
    }



    var schoolMarkers = ( function() {
        //  Uses custom icons for schools

        var mySchoolMarkers = L.markerClusterGroup({
            spiderfyOnMaxZoom: true,
            zoomToBoundsOnClick: true
        });
        console.log("in school markers: " + schools);
        L.geoJson([schools], {
            style: function (feature) {
                return feature.properties && feature.properties.style;
            },
            onEachFeature: onEachFeature,
            pointToLayer: function (feature, latlng) {
                //  Create an icon:
                var myIcon = L.icon({
                    iconUrl: getSchoolIconUrl(feature),
                    iconAnchor: [22, 94],
                    popupAnchor: [-3, -76]
                });
                //  Create a marker with our custom icon:
                var myMarker = L.marker(latlng,{
                        icon: myIcon
                    }
                );
                mySchoolMarkers.addLayer(myMarker);
                return myMarker;
            }
        });
        map.addLayer(mySchoolMarkers);
    })();
    /*End roadwork*/

    return {
        onLoadGoogleApiCallback : GTT.Geocoder.onLoadGoogleApiCallback,
        onReady : function() {
            GTT.Geocoder.setup();
            UI.wireUp(requestModel);
            UI.createOpacitySlider("#opacity-slider",scenicRouteLayer);
            UI.createDurationSlider(requestModel);
            UI.createAddressSearch("startaddress", function(data) {
                data = {results: data};

                if (data.results.length != 0) {
                    var lat = data.results[0].geometry.location.lat();
                    var lng = data.results[0].geometry.location.lng();
                    startMarker.setLatLng(lat,lng);
                } else {
                    alert("Address not found!");
                }
            });
            UI.createAddressSearch("endaddress", function(data) {
                data = {results: data};

                if (data.results.length != 0) {
                    var lat = data.results[0].geometry.location.lat();
                    var lng = data.results[0].geometry.location.lng();
                    endMarker.setLatLng(lat,lng);
                } else {
                    alert("Address not found!");
                }
            });
            createMinStayTimeSlider();
            requestModel.notifyChange();
        }
    };
})();

// On page load
$(document).ready(function() {
    APP.onReady();
});

function getSchoolIconUrl(feature){
    /*
     Returns the appropriate school icon URL(closed/open) based on the number of enrollments in that school:
     **/
    if(isSchoolOpen(feature))
    {
        //  School is open. Use the proper icon
        return 'img/open_school_icon.png';
    }
    else
    {
        // School is closed. Use the proper icon
        return 'img/closed_school_icon.png';
    }
}

function isSchoolOpen(feature){
    /*
    * Checks if the passed school/feature has open enrollments and returns a boolean to the caller:
    * True: the school is open
    * False: the school is closed
    * */
    if(feature.properties.ENROLLMENT>0)
        return true;
    else
        return false;
 }