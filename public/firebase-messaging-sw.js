importScripts("https://www.gstatic.com/firebasejs/9.6.11/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.11/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyCE3641yRVYlXGdETHGrLQzYHdLKJCgf7M",
    authDomain: "webddd-e1651.firebaseapp.com",
    projectId: "webddd-e1651",
    storageBucket: "webddd-e1651.firebasestorage.app",
    messagingSenderId: "936616669307",
    appId: "1:936616669307:web:ac01459293f4d6ecf8b2de",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("Background message:", payload);
});
