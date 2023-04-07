function zoomIn() {
    Global.map.zoomIn();
}

function zoomOut() {
    Global.map.zoomOut();
}

function createCircle(e) {
    let y = e.latlng.lat;
    let x = e.latlng.lng;
    let radius = 100;
    let circle = L.circle([y, x], {
        contextmenu: true,
        color: "none",
        fillColor: "#f00",
        fillOpacity: 0.5,
        radius: radius,
        bubblingMouseEvents: false, // needed or else we cause a map contextmenu event
    });
    circle.addTo(Global.map);
}

function deleteCircle(e) {
    let target = e.relatedTarget;
    if (!target)
        return;
    //TODO: remove from global array if casemarker?
    target.remove();
}

// Creates a marker at e.latlng
function createMarker(e) {
    let y = e.latlng.lat;
    let x = e.latlng.lng;
    // send rpc
    sendCreateMarker(x, y);
    // call locally
    createMarkerCall(x, y);
}

function createMarkerCall(x, y) {
    let marker = L.marker([y, x], {
        contextmenu: true,
    });
    marker.addTo(Global.map);
    Global.markers.push(marker);
}

// Removes the given marker
function deleteMarker(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    // remove from global array
    for (let key in Global.markers) {
        let val = Global.markers[key];
        if (val == target) {
            Global.markers.splice(key, 1);
            break;
        }
    }

    sendDeleteMarker(target._latlng.lng, target._latlng.lat)

    // remove from map
    target.remove();
}

function deleteMarkerAt(x, y) {
    // remove from global array
    let target = null;
    for (let key in Global.markers) {
        let val = Global.markers[key];
        if (val._latlng.lat == y && val._latlng.lng == x) {
            target = val;
            Global.markers.splice(key, 1);
            break;
        }
    }
    if (!target)
        return;
    
    // remove from map
    target.remove();
}

// prints the currently selected target into the console
function printTarget(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    console.log(target);
}

// creates a popup to let the user change the circle's radius
function changeCircleRadius(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    // put into a container
    let container = document.createElement("div");
    // style to make the inputs appear in the same line
    container.style.display = "flex";
    container.style["flex-direction"] = "row";

    // slider
    let slider = document.createElement("input");
    slider.style.display = "block";
    slider.type = "range";
    slider.min = 0;
    slider.max = 1000;
    //INFO: set value after range or else it will clamp back
    slider.value = target._mRadius;
    container.appendChild(slider);

    // finer input wheel
    let fineInput = document.createElement("input");
    fineInput.style.display = "block";
    fineInput.style.width = "50px";
    fineInput.type = "number";
    fineInput.step = 0.5;
    fineInput.value = target._mRadius;
    container.appendChild(fineInput);

    // change events
    fineInput.oninput = () => {
        let num = Number(fineInput.value);
        Global.map._layers[target._leaflet_id].setRadius(num);
        slider.value = num;
    };
    slider.oninput = () => {
        let num = Number(slider.value);
        Global.map._layers[target._leaflet_id].setRadius(num);
        fineInput.value = num;
    };
    
    // create popup with input
    L.popup().setLatLng(e.latlng)
        .setContent(container)
        .addTo(Global.map).openOn(Global.map);
}

// Called on contextmenu, add our own items
function onMapRightClick(e) {
    // clear menu
    e.contextmenu.removeAllItems();
    // First context relevant ones
    if (e.relatedTarget) {
        let target = e.relatedTarget;
        let addSeperator = true;
        // marker
        if (target instanceof(L.Marker)) {
            e.contextmenu.addItem({
                text: 'Delete Marker',
                callback: deleteMarker
            });
            //TODO: let user set color
        } else if (target instanceof(L.Circle)) {
            // only add circle items on debug
            if (Global.DEBUG) {
                e.contextmenu.addItem({
                    text: 'Change Radius',
                    callback: changeCircleRadius
                });
                e.contextmenu.addItem({
                    text: 'Delete Circle',
                    callback: deleteCircle
                });
            } else {
                addSeperator = false;
            }
        }

        if (Global.DEBUG) {
            e.contextmenu.addItem({
                text: 'Print in Console',
                callback: printTarget
            });
        }

        // add seperator
        if (addSeperator)
            e.contextmenu.addItem("-");
    }

    // Add marker //TODO: remove when on marker?
    e.contextmenu.addItem({
        text: "Add Marker",
        callback: createMarker
    });

    // Zoom
    e.contextmenu.addItem({
        text: "Zoom in",
        callback: zoomIn
    });
    e.contextmenu.addItem({
        text: "Zoom out",
        callback: zoomOut
    });

    // Debug items
    if (Global.DEBUG) {
        e.contextmenu.addItem("-");
        e.contextmenu.addItem({
            text: `Pos: ${e.latlng}`,
            disabled: true
        });
        e.contextmenu.addItem({
            text: "Add Circle",
            callback: createCircle
        });
    }
}