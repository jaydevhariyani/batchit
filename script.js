// Firebase ને સીધું ઇન્ટરનેટ પરથી બોલાવવાનો કોડ (No npm needed)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// તમારો Firebase સિક્રેટ કોડ
const firebaseConfig = {
  apiKey: "AIzaSyCxl2AUWy8SjNEUauG_DtPfUcqkR_zDhVA",
  authDomain: "batchit-6a771.firebaseapp.com",
  projectId: "batchit-6a771",
  storageBucket: "batchit-6a771.firebasestorage.app",
  messagingSenderId: "1065125770111",
  appId: "1:1065125770111:web:67e90a86322af5e996604a"
};

// Firebase અને ડેટાબેઝ ચાલુ કરો
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// યુઝરનું નામ પૂછો
let username = localStorage.getItem('username');
if(!username) {
    username = prompt("તમારું નામ લખો (Enter your name):");
    if(!username) username = "Guest_" + Math.floor(Math.random() * 1000);
    localStorage.setItem('username', username);
}

// વેબસાઈટના બોક્સ ગોતો
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// રિયલ-ટાઇમમાં મેસેજ લાવો અને સ્ક્રીન પર બતાવો
const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = ""; // બોક્સ ખાલી કરો
    snapshot.forEach((doc) => {
        const data = doc.data();
        const msgDiv = document.createElement('div');
        
        // જો મેસેજ આપણો હોય તો અલગ કલર બતાવો
        if(data.user === username) {
            msgDiv.style.background = "#0084ff";
            msgDiv.style.color = "white";
            msgDiv.style.alignSelf = "flex-end";
            msgDiv.style.marginLeft = "auto";
        } else {
            msgDiv.style.background = "#e1f5fe";
            msgDiv.style.color = "black";
        }
        
        msgDiv.style.padding = "10px";
        msgDiv.style.margin = "10px 0";
        msgDiv.style.borderRadius = "10px";
        msgDiv.style.width = "fit-content";
        msgDiv.innerHTML = `<strong>${data.user}:</strong> <br> ${data.text}`;
        
        chatBox.appendChild(msgDiv);
    });
    // મેસેજ આવે એટલે ઓટોમેટિક નીચે સ્ક્રોલ કરો
    chatBox.scrollTop = chatBox.scrollHeight; 
});

// સેન્ડ બટન દબાવવાથી મેસેજ ડેટાબેઝમાં જશે
sendBtn.addEventListener('click', async () => {
    let message = messageInput.value;
    if(message.trim() !== "") {
        await addDoc(collection(db, "messages"), {
            user: username,
            text: message,
            timestamp: serverTimestamp()
        });
        messageInput.value = ""; // મેસેજ ગયા પછી ઇનપુટ ખાલી કરો
    }
});
