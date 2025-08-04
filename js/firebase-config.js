const firebaseConfig = {
  apiKey: "AIzaSyBsTg6-wa5xT46JkNCgIlrZJ2rfANQXlmk",
  authDomain: "popuga-english.firebaseapp.com",
  projectId: "popuga-english",
  storageBucket: "popuga-english.firebasestorage.app",
  messagingSenderId: "701383295169",
  appId: "1:701383295169:web:cc3c0c7214bb710e329440",
  measurementId: "G-ZE3K6HL0XJ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
