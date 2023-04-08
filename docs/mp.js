Global.MP = {
    peer: null,
};

function onMPButtonClick() {
    // not connected? start
    if (!Global.MP.peer || Global.MP.peer.disconnected) {
        initMP();
    }
    // connected? disconnect
    else if (Global.MP.peer && Global.MP.peer.id) {
        disconnectMP();
    }
}

function initMP() {
    Global.MP.peer = new Peer();
    Global.MP.peer.on("open", onPeerOpen);
    Global.MP.peer.on("disconnected", onPeerDisconnect);
    Global.MP.peer.on("connection", onPeerConnection)
    let button = document.getElementById("mp-connect-button");
    button.textContent = "Connecting...";
}

function disconnectMP() {
    if (!Global.MP.peer)
        return;

    Global.MP.peer.disconnect();
}

function onPeerOpen(id) {
    console.debug(`Assigned Peer ID: ${id}`);
    let peerID = document.getElementById("mp-peer-id");
    peerID.textContent = `Peer ID: ${id}`;

    // set button text
    let button = document.getElementById("mp-connect-button");
    button.textContent = "Disconnect";
    // hide connect button
    let peerConnectButton = document.getElementById("mp-connect-peer-button");
    peerConnectButton.style.display = "inherit";
}

function onPeerDisconnect() {
    Global.MP.peer.destroy();
    Global.MP.peer = null;
    // set text
    let button = document.getElementById("mp-connect-button");
    button.textContent = "Connect";
    let peerID = document.getElementById("mp-peer-id");
    peerID.textContent = "Not connected";
    let peerConnectButton = document.getElementById("mp-connect-peer-button");
    peerConnectButton.style.display = "none";
}

function onPeerConnection(connection) {
    Global.MP.connection = connection;
    Global.MP.connection.on("data", onConnectionDataReceive);
    //TODO: sync cases and such here?
    onConnectionOpen();
}

function copyPeerID() {
    if (!Global.MP.peer)
        return;

    navigator.clipboard.writeText(Global.MP.peer.id);
    // notify the user
    console.log("Copied ID to clipboard.");
    alert("Copied ID to clipboard.");
}

function onPeerConnectButtonClick() {
    let id = prompt("Enter the Peer ID");
    if (!id)
        return;

    connectToPeer(id);
}

function connectToPeer(id) {
    Global.MP.connection = Global.MP.peer.connect(id);
    // init events
    Global.MP.connection.on("open", onConnectionOpen);
    Global.MP.connection.on("data", onConnectionDataReceive);
}

function onConnectionOpen() {
    console.log(`Connected to ${Global.MP.connection.peer}`)
    let peerConnectButton = document.getElementById("mp-connect-peer-button");
    peerConnectButton.textContent = `Connected to ${Global.MP.connection.peer}`;
}

function onConnectionDataReceive(data) {
    console.debug("Received data:");
    console.debug(data);
    switch (data.type) {
        case "solveStep": {
            solveStepCall();
            break;
        }
        case "createMarker": {
            let x = data.data.x;
            let y = data.data.y;
            createMarkerCall(x, y);
            break;
        }
        case "deleteMarker": {
            let x = data.data.x;
            let y = data.data.y;
            deleteMarkerAt(x, y);
            break;
        }
        default: {
            console.debug(`Unknown data received: ${data}`);
            break;
        }
    }
}

function sendCreateMarker(x, y) {
    sendDataMP({
        type: "createMarker",
        data: {
            x: x,
            y: y
        }
    });
}

function sendDeleteMarker(x, y) {
    sendDataMP({
        type: "deleteMarker",
        data: {
            x: x,
            y: y
        }
    });
}

function sendSolveStep() {
    sendDataMP({
        type: "solveStep"
    });
}

function sendDataMP(data) {
    if (!Global.MP.connection)
        return;

    console.debug("Sending Data:");
    console.debug(data);
    Global.MP.connection.send(data);
}