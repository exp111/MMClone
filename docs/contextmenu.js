function zoomIn() {
    Global.map.zoomIn();
}

function zoomOut() {
    Global.map.zoomOut();
}

function createCircle(e) {
    let y = e.latlng.lat;
    let x = e.latlng.lng;
    let id = getNextShapeID();
    if (Global.DEBUG.sync)
        sendCreateCircle(id, x, y);
    createCircleCall(id, x, y);
}

function createCircleCall(id, x, y) {
    let radius = 100;
    let circle = L.circle([y, x], {
        contextmenu: true,
        color: "none",
        fillColor: "#f00",
        fillOpacity: 0.5,
        radius: radius,
        bubblingMouseEvents: false, // needed or else we cause a map contextmenu event
    });
    circle.ID = id; //TODO: better way to attach data?
    circle.addTo(Global.map);
    Global.DEBUG.shapes[id] = circle;
    // increment id
    Global.DEBUG.nextShapeID = id + 1;
}

function deleteCircle(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    // send, if enabled
    if (Global.DEBUG.sync)
        sendDeleteCircle(target.ID);
    // call locally
    deleteCircleCall(target.ID);
}

function deleteCircleCall(id) {
    let circle = Global.DEBUG.shapes[id];
    if (!circle)
        return;
    //TODO: remove from global array if casemarker?
    circle.remove();
    Global.DEBUG.shapes[id] = null;
}

function changeCircleRadiusCall(id, radius) {
    let circle = Global.DEBUG.shapes[id];
    if (!circle)
        return;
    circle.setRadius(radius);
}

function changeCirclePositionCall(id, newX, newY) {
    let circle = Global.DEBUG.shapes[id];
    if (!circle)
        return;
    circle.setLatLng([newY, newX]);
}

// Creates a marker at e.latlng
function createMarker(e) {
    let y = e.latlng.lat;
    let x = e.latlng.lng;
    let id = getNextMarkerID();
    // player color 2 hsl + ~marker offset hue, clamp to hue color spectrum
    let clr = (HexToHSL(StringToColor(Global.MP.username)).h + 185) % 360;
    // send rpc
    sendCreateMarker(id, clr, x, y);
    // call locally
    createMarkerCall(id, clr, x, y);
}

function createMarkerCall(id, clr, x, y) {
    let marker = L.marker([y, x], {
        contextmenu: true,
    });
    marker.ID = id; //TODO: better way to attach data?
    marker.addTo(Global.map);
    Global.MAP.markers[id] = marker;
    Global.MAP.nextMarkerID = id + 1;
    // change color
    changeMarkerColorCall(id, clr);
}

function changeMarkerColor(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    // slider
    let slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = 360;
    //INFO: set value after range or else it will clamp back
    // find the cur value, else default to 0
    const regex = /hue-rotate\((\d*)deg\)/;
    let match = target._icon.style.filter.match(regex);
    slider.value = match ? match[1] : 0;

    slider.oninput = () => {
        let clr = slider.value;
        let id = target.ID;
        sendChangeMarkerColor(id, clr);
        changeMarkerColorCall(id, clr)
    };

    // create popup with input
    // offset the popup to the top, so you can see the marker color
    L.popup().setLatLng([target._latlng.lat - 150, target._latlng.lng])
        .setContent(slider)
        .openOn(Global.map);
}

function changeMarkerColorCall(id, deg) {
    let target = Global.MAP.markers[id];
    if (!target)
        return;

    // hue rotate the icon
    target._icon.style.filter = `hue-rotate(${deg}deg)`;
}

// Removes the given marker
function deleteMarker(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    // send 
    sendDeleteMarker(target.ID)
    // call locally
    deleteMarkerCall(target.ID);
}

function deleteMarkerCall(id) {
    // remove from global array
    let target = Global.MAP.markers[id];
    if (!target)
        return;

    Global.MAP.markers[id] = null;
    // remove from map
    target.remove();
}

function clearMarkers() {
    for (let id in Global.MAP.markers) {
        let marker = Global.MAP.markers[id];
        if (marker)
            marker.remove();
    }
    // clear global array
    Global.MAP.markers = {};
}

// prints the currently selected target into the console
function printTarget(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    console.log(target);
}

let getTargetJSON = function (target) {
    if (target instanceof(L.Circle)) {
        /*
        {
            "type": "circle",
            "x": 7242,
            "y": 13370,
            "radius": 290
        }*/
        let object = {
            type: "circle",
            x: target._latlng.lng,
            y: target._latlng.lat,
            radius: target._mRadius
        };
        let str = JSON.stringify(object);
        return str;
    }
    return null;
}

function printTargetJSON(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    let json = getTargetJSON(target);
    if (!json)
        return;

    console.log(json);
}

function copyTargetJSON(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    let json = getTargetJSON(target);
    if (!json)
        return;

    navigator.clipboard.writeText(json);
    // notify the user
    console.log("Copied JSON to clipboard.");
    alert("Copied JSON to clipboard.");
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
        target.setRadius(num);
        if (Global.DEBUG.sync)
            sendChangeCircleRadius(target.ID, num);
        slider.value = num;
    };
    slider.oninput = () => {
        let num = Number(slider.value);
        target.setRadius(num);
        if (Global.DEBUG.sync)
            sendChangeCircleRadius(target.ID, num);
        fineInput.value = num;
    };

    // create popup with input
    L.popup().setLatLng(e.latlng)
        .setContent(container)
        .addTo(Global.map).openOn(Global.map);
}

// creates a popup to let the user change the target's position
function changePosition(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    // put into a container
    let container = document.createElement("div");
    // style to make the inputs appear in the same line
    container.style.display = "flex";
    container.style["flex-direction"] = "row";

    // x
    let inputX = document.createElement("input");
    inputX.style.display = "block";
    inputX.style.width = "60px";
    inputX.type = "number";
    inputX.step = 1;
    inputX.value = target._latlng.lng;
    container.appendChild(inputX);

    // y
    let inputY = document.createElement("input");
    inputY.style.display = "block";
    inputY.style.width = "60px";
    inputY.type = "number";
    inputY.step = 1;
    inputY.value = target._latlng.lat;
    container.appendChild(inputY);

    // change events
    inputX.oninput = () => {
        let num = Number(inputX.value);
        let y = target._latlng.lat;
        if (Global.DEBUG.sync)
            sendChangeCirclePosition(target.ID, num, y);
        target.setLatLng([y, num]);
    };
    inputY.oninput = () => {
        let num = Number(inputY.value);
        let x = target._latlng.lng;
        if (Global.DEBUG.sync)
            sendChangeCirclePosition(target.ID, x, num);
        target.setLatLng([num, x]);
    };

    // create popup with input
    L.popup().setLatLng(e.latlng)
        .setContent(container)
        .addTo(Global.map).openOn(Global.map);
}

function toggleEditing(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    if (!target.editing)
        return;

    if (target.editing.enabled())
        target.editing.disable();
    else
        target.editing.enable();
}

function roundValues(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    if (target instanceof(L.Circle)) {
        target.setLatLng([
            Math.round(target._latlng.lat),
            Math.round(target._latlng.lng)
        ]);
        target.setRadius(Math.round(target._mRadius));
    }
}

// edit move + resize events
function onDrawEditMove(e) {
    let target = e.layer;
    if (!target)
        return;

    if (Global.DEBUG.sync)
        sendChangeCirclePosition(target.ID, target._latlng.lng, target._latlng.lat);
}

function onDrawEditResize(e) {
    let target = e.layer;
    if (!target)
        return;

    if (Global.DEBUG.sync)
        sendChangeCircleRadius(target.ID, target._mRadius);
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
                text: "Change Color",
                callback: changeMarkerColor
            });
            e.contextmenu.addItem({
                text: "Delete Marker",
                callback: deleteMarker
            });
            //TODO: let user set color
        } else if (target instanceof(L.Circle)) {
            // only add circle items on debug
            if (Global.DEBUG.enabled) {
                e.contextmenu.addItem({
                    text: "Change Radius",
                    callback: changeCircleRadius
                });
                e.contextmenu.addItem({
                    text: "Change Position",
                    callback: changePosition
                });
                e.contextmenu.addItem({
                    text: "Delete Circle",
                    callback: deleteCircle
                });
                if (target.editing) {
                    e.contextmenu.addItem({
                        text: target.editing.enabled() ? "Disable editing" : "Enable editing",
                        callback: toggleEditing
                    });
                }
                e.contextmenu.addItem({
                    text: "Round values",
                    callback: roundValues
                });
            } else {
                addSeperator = false;
            }
        }

        if (Global.DEBUG.enabled) {
            e.contextmenu.addItem({
                text: 'Print in Console',
                callback: printTarget
            });
            e.contextmenu.addItem({
                text: 'Print as JSON',
                callback: printTargetJSON
            });
            e.contextmenu.addItem({
                text: 'Copy JSON',
                callback: copyTargetJSON
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
    if (Global.DEBUG.enabled) {
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