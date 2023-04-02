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
    let circle = L.circle([y + radius, x + radius], {
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
    let radius = 100;
    let marker = L.marker([y + radius, x + radius], {
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

    // remove from map
    target.remove();
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
                    text: 'Delete Circle',
                    callback: deleteCircle
                });
                //TODO: set radius by opening a popup, giving the circle to it and letting user change radius
            } else {
                addSeperator = false;
            }
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