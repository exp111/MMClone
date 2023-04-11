function zoomIn() {
    Global.map.zoomIn();
}

function zoomOut() {
    Global.map.zoomOut();
}

function createCircle(e) {
    let y = e.latlng.lat;
    let x = e.latlng.lng;
    if (Global.DEBUG.sync)
        sendCreateCircle(x, y);
    createCircleCall(x, y);
}

function createCircleCall(x, y) {
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
    let y = e.latlng.lat;
    let x = e.latlng.lng;
    if (Global.DEBUG.sync)
        sendDeleteCircle(x, y);
    //TODO: remove from global array if casemarker?
    target.remove();
}

let findCircle = function (x, y) {
    targetLoop: for (let key in Global.map._targets) {
        let val = Global.map._targets[key];
        if (val && val instanceof(L.Circle)) {
            // check if its not a cursor lmao
            for (let k in Global.MP.cursors) {
                if (val == Global.MP.cursors[k])
                    continue targetLoop; // this is a cursor, continue
            }
            return val;
        }
    }
    return null;
}

function deleteCircleAt(x, y) {
    let circle = findCircle(x, y);
    if (!circle)
        return;
    //TODO: remove from global array if casemarker?
    circle.remove();
}

function changeCircleRadiusCall(x, y, radius) {
    let circle = findCircle(x, y);
    if (!circle)
        return;
    circle.setRadius(radius);
}

function changeCirclePositionCall(x, y, newX, newY) {
    let circle = findCircle(x, y);
    if (!circle)
        return;
    circle.setLatLng([newY, newX]);
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
        // hue rotate the icon
        target._icon.style.filter = `hue-rotate(${slider.value}deg)`;
    };

    // create popup with input
    // offset the popup to the top, so you can see the marker color
    L.popup().setLatLng([target._latlng.lat - 150, target._latlng.lng])
        .setContent(slider)
        .openOn(Global.map);
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
            sendChangeCircleRadius(target._latlng.lng, target._latlng.lat, num);
        slider.value = num;
    };
    slider.oninput = () => {
        let num = Number(slider.value);
        target.setRadius(num);
        if (Global.DEBUG.sync)
            sendChangeCircleRadius(target._latlng.lng, target._latlng.lat, num);
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
            sendChangeCirclePosition(target._latlng.lng, target._latlng.lat, num, y);
        target.setLatLng([y, num]);
    };
    inputY.oninput = () => {
        let num = Number(inputY.value);
        let x = target._latlng.lng;
        if (Global.DEBUG.sync)
            sendChangeCirclePosition(target._latlng.lng, target._latlng.lat, x, num);
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

    console.log(target.editing);
    if (target.editing.enabled())
        target.editing.disable();
    else
        target.editing.enable();
}

//TODO: edit move + resize events. cant access the old pos
/*function onDrawEditMove(e) {

}

function onDrawEditResize(e) {
    console.log(e);
}*/

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