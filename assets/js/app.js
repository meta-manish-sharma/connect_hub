// We need to import the CSS so that webpack will load it.
// The MiniCssExtractPlugin is used to separate it out into
// its own CSS file.
import "../css/app.scss"

// webpack automatically bundles all modules in your
// entry points. Those entry points can be configured
// in "webpack.config.js".
//
// Import deps with the dep name or local files with a relative path, for example:
//
//     import {Socket} from "phoenix"
//     import socket from "./socket"
//
import "phoenix_html"

import socket from "./socket"

let channel = socket.channel("call", {})
channel.join()
  .receive("ok", () => { console.log("Joined successfully 2") })
  .receive("error", () => { console.log("Unable to join") })

let localStream, peerConnection;
let localVideo = document.getElementById('localVideo');
let remoteVideo = document.getElementById('remoteVideo');
let connectButton = document.getElementById("connect");
let callButton = document.getElementById("call");
let hangupButton = document.getElementById("hangup");

hangupButton.disabled = true;
callButton.disabled = true;
connectButton.onclick = connect;
callButton.onclick = call;
hangupButton.onclick = hangup;

function connect() {
  console.log("Requesting local stream");
  navigator.getUserMedia({video:true}, gotStreamVideo, error => {
          console.log("getUserMedia error: ", error);
              });
  navigator.getUserMedia({audio:true, video:true}, gotStreamAudioVideo, error => {
          console.log("getUserMedia error: ", error);
              });
}

function gotStreamVideo(stream) {
  console.log("Received local video stream");
  // localVideo.src = URL.createObjectURL(stream);
  try {
    // localVideo.src = stream;
    localVideo.srcObject = stream;
    localVideo.onloadedmetadata = function(e) { localVideo.play(); };
  } catch (error) {
    localVideo.srcObject = stream;
    localVideo.onloadedmetadata = function(e) { localVideo.play(); };
  }
}

function gotStreamAudioVideo(stream) {
  console.log("Received local Audio/Video stream");
  localStream = stream;
  setupPeerConnection();
}

function setupPeerConnection() {
  connectButton.disabled = true;
  callButton.disabled = false;
  hangupButton.disabled = false;
  console.log("Waiting for call");

  let servers = {
    'iceServers': [{
      // 'url': 'stun:stun.example.org'
      // 'url': 'stun:stun.l.google.com:19302'
      'url': 'stun:stun.ekiga.net'
    }]
  };

  peerConnection = new RTCPeerConnection(servers);
  console.log("Created local peer connection");
  peerConnection.onicecandidate = gotLocalIceCandidate;
  peerConnection.onaddstream = gotRemoteStream;
  peerConnection.addStream(localStream);
  console.log("Added localStream to localPeerConnection");
}

function call() {
  callButton.disabled = true;
  console.log("Starting call");
  peerConnection.createOffer(gotLocalDescription, handleError);
}

function gotLocalDescription(description){
  peerConnection.setLocalDescription(description, () => {
      channel.push("message", { body: JSON.stringify({
              'sdp': peerConnection.localDescription
              })});
        }, handleError);
  console.log("Offer from localPeerConnection: \n" + description.sdp);
}

function gotRemoteDescription(description){
  console.log("Answer from remotePeerConnection: \n" + description.sdp);
  peerConnection.setRemoteDescription(new RTCSessionDescription(description.sdp));
  peerConnection.createAnswer(gotLocalDescription, handleError);
}

function gotRemoteStream(event) {
  try {
    // remoteVideo.src = stream;
    remoteVideo.srcObject = stream;
    remoteVideo.onloadedmetadata = function(e) { remoteVideo.play(); };
  } catch (error) {
    remoteVideo.srcObject = stream;
    remoteVideo.onloadedmetadata = function(e) { remoteVideo.play(); };
  }
  // remoteVideo.src = URL.createObjectURL(event.stream);
  console.log("Received remote stream");
}

function gotLocalIceCandidate(event) {
  if (event.candidate) {
    console.log("Local ICE candidate: \n" + JSON.stringify(event.candidate));
    channel.push("message", {body: {
          'candidate': event.candidate
          }});
  }
}

function gotRemoteIceCandidate(event) {
  callButton.disabled = true;
  if (event.candidate) {
    console.log("Remote ICE candidate: \n " + JSON.stringify(event.candidate));
    peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    console.log("Remote ICE candidate: Successfully added \n ");
  }
}

function hangup() {
  console.log("Ending call");
  peerConnection.close();
  localVideo.src = null;
  peerConnection = null;
  hangupButton.disabled = true;
  connectButton.disabled = false;
  callButton.disabled = true;
}

function handleError(error) {
  console.log(error.name + ': ' + error.message);
}

channel.on("message", payload => {
  let message = JSON.parse(JSON.stringify(payload.body));
  if (message.sdp) {
    gotRemoteDescription(message);
  } else {
    gotRemoteIceCandidate(message);
  }
})
