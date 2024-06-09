window.addEventListener('load', (event) => {
    var peer = new Peer();
    var myStream;
    var currentPeer;
    var peerList = [];
    var mediaRecorder;
    var recordedChunks = [];
    var dataConnection;
    var cameraEnabled = true;
    var microphoneEnabled = true;

    peer.on('open', function (id) {
        document.getElementById("show-peer").innerHTML = id;
    });

    peer.on('call', function (call) {
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        }).then((stream) => {
            myStream = stream;
            addOurVideo(stream);
            call.answer(stream);
            call.on('stream', function (remoteStream) {
                if (!peerList.includes(call.peer)) {
                    addRemoteVideo(remoteStream);
                    currentPeer = call.peerConnection;
                    peerList.push(call.peer);
                }
            });
        }).catch((err) => {
            console.log(err + "unable to get media");
        });
    });

    document.getElementById("toggleCamera").addEventListener('click', () => {
        cameraEnabled = !cameraEnabled;
        myStream.getVideoTracks()[0].enabled = cameraEnabled;
        document.getElementById("cameraIcon").className = cameraEnabled ? "fas fa-video" : "fas fa-video-slash";
    });

    document.getElementById("toggleMicrophone").addEventListener('click', () => {
        microphoneEnabled = !microphoneEnabled;
        myStream.getAudioTracks()[0].enabled = microphoneEnabled;
        document.getElementById("microphoneIcon").className = microphoneEnabled ? "fas fa-microphone" : "fas fa-microphone-slash";
    });


    peer.on('connection', function(conn) {
        dataConnection = conn;
        dataConnection.on('data', function(data) {
            displayMessage("Peer: " + data);
        });
    });

    document.getElementById("call-peer").addEventListener('click', (e) => {
        let remotePeerId = document.getElementById("peerID").value;
        document.getElementById("show-peer").innerHTML = "connecting " + remotePeerId;
        callPeer(remotePeerId);
    });

    document.getElementById("shareScreen").addEventListener('click', (e) => {
        navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: { echoCancellation: true, noiseSuppression: true }
        }).then((stream) => {
            let videoTrack = stream.getVideoTracks()[0];
            videoTrack.onended = function () {
                stopScreenShare();
            }
            let sender = currentPeer.getSenders().find(function (s) {
                return s.track.kind == videoTrack.kind;
            });
            sender.replaceTrack(videoTrack);
        }).catch((err) => {
            console.log("unable to get display media" + err);
        });
    });

    document.getElementById("startRecording").addEventListener('click', (e) => {
        startRecording();
    });

    document.getElementById("stopRecording").addEventListener('click', (e) => {
        stopRecording();
    });

    document.getElementById("send-message").addEventListener('click', (e) => {
        let message = document.getElementById("chat-input").value;
        sendMessage(message);
        displayMessage("Me: " + message);
    });
    function callPeer(id) {
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        }).then((stream) => {
            myStream = stream;
            addOurVideo(stream);
            let call = peer.call(id, stream);
            dataConnection = peer.connect(id);
            dataConnection.on('data', function(data) {
                displayMessage("Peer: " + data);
            });
            call.on('stream', function (remoteStream) {
                if (!peerList.includes(call.peer)) {
                    addRemoteVideo(remoteStream);
                    currentPeer = call.peerConnection;
                    peerList.push(call.peer);
                }
            });
        }).catch((err) => {
            console.log(err + "unable to get media");
        });
    }

    function stopScreenShare() {
        let videoTrack = myStream.getVideoTracks()[0];
        var sender = currentPeer.getSenders().find(function (s) {
            return s.track.kind == videoTrack.kind;
        });
        sender.replaceTrack(videoTrack);
    }

    function addRemoteVideo(stream) {
        let video = document.createElement("video");
        video.classList.add("video");
        video.srcObject = stream;
        video.play();
        document.getElementById("remoteVideo").append(video);
    }

    function addOurVideo(stream) {
        let video = document.createElement("video");
        video.classList.add("ourvideo");
        video.srcObject = stream;
        video.play();
        document.getElementById("ourVideo").append(video);
    }

    function startRecording() {
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(myStream);
        mediaRecorder.ondataavailable = function (event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        mediaRecorder.onstop = function () {
            saveRecording();
        };
        mediaRecorder.start();
    }

    function stopRecording() {
        mediaRecorder.stop();
    }

    function saveRecording() {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'recording.webm';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    function sendMessage(message) {
        if (dataConnection && dataConnection.open) {
            dataConnection.send(message);
        }
    }

    function displayMessage(message) {
        let chatBox = document.getElementById("chat-box");
        let msgDiv = document.createElement("div");
        msgDiv.innerHTML = message;
        chatBox.appendChild(msgDiv);
    }



});
