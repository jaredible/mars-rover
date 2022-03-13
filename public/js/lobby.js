const socket = io("/lobby");

socket.on("world-update", function() {
    location.reload();
});

function createWorld() {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
        if (this.status == 200) {
            const data = JSON.parse(this.responseText);
            openWorld(data.name);
        }
    };
    xhr.open('POST', "/world", true);
    xhr.send();
}

function openWorld(name) {
    console.log(name);
    location.href = `/world/${name}`;
}

window.onload = function() {};
