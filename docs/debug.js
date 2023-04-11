Global.DEBUG = {
    enabled: window.location.protocol == "file:" || window.location.hostname == "localhost",
    sync: false,
}

document.getElementById("debug-menu-button").style.display = (Global.DEBUG.enabled ? "" : "none"); // hide if not debug
document.getElementById("debug_toggle").checked = Global.DEBUG.enabled;

//TODO: print circle to json
function enableDebug() {
    Global.DEBUG.enabled = true;
    document.getElementById("debug-menu-button").style.display = "";
    document.getElementById("debug_toggle").checked = true;
}