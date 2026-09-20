// Firebase ને સીધું ઇન્ટરનેટ પરથી બોલાવવાનો કોડ
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// તમારો Firebase સિક્રેટ કોડ
const firebaseConfig = {
  apiKey: "AIzaSyCxl2AUWy8SjNEUauG_DtPfUcqkR_zDhVA",
  authDomain: "batchit-6a771.firebaseapp.com",
  projectId: "batchit-6a771",
  storageBucket: "batchit-6a771.firebasestorage.app",
  messagingSenderId: "1065125770111",
  appId: "1:1065125770111:web:67e90a86322af5e996604a"
};

// Firebase ચાલુ કરો
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// યુઝરનું નામ પૂછો
let username = localStorage.getItem('username');
if(!username) {
    username = prompt("તમારું નામ લખો (Enter your name):");
    if(!username) username = "Guest_" + Math.floor(Math.random() * 1000);
    localStorage.setItem('username', username);
}

// ૧. યુઝર ઓનલાઇન થાય ત્યારે તેનું નામ ડેટાબેઝમાં ઉમેરો
const userDocRef = doc(db, "online_users", username);
setDoc(userDocRef, { name: username, timestamp: serverTimestamp() });

// ૨. યુઝર વેબસાઈટ કે ટેબ બંધ કરે ત્યારે તેનું નામ લિસ્ટમાંથી હટાવી દો
window.addEventListener("beforeunload", () => {
    deleteDoc(userDocRef);
});

// બોક્સ ગોતો
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const onlineUsersDiv = document.getElementById('online-users');

// ૩. ઓનલાઇન લોકોનું લિસ્ટ રિયલ-ટાઇમમાં બતાવો
if(onlineUsersDiv) {
    onSnapshot(collection(db, "online_users"), (snapshot) => {
        onlineUsersDiv.innerHTML = ""; // જૂનું લિસ્ટ ખાલી કરો
        snapshot.forEach((doc) => {
            const data = doc.data();
            const userDiv = document.createElement('div');
            userDiv.style.padding = "10px";
            userDiv.style.borderBottom = "1px solid #ddd";
            userDiv.style.display = "flex";
            userDiv.style.alignItems = "center";
            // લીલું ટપકું અને નામ
            userDiv.innerHTML = `<span style="background: #25D366; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 10px;"></span> <strong style="color:#333;">${data.name}</strong>`;
            onlineUsersDiv.appendChild(userDiv);
        });
    });
}

// ૪. મેસેજ રિયલ-ટાઇમમાં બતાવો (તમારો મેસેજ જમણી બાજુ)
const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = ""; 
    snapshot.forEach((doc) => {
        const data = doc.data();
        const msgDiv = document.createElement('div');
        
        if(data.user === username) {
            msgDiv.style.background = "#0084ff";
            msgDiv.style.color = "white";
            msgDiv.style.alignSelf = "flex-end";
            msgDiv.style.marginLeft = "auto";
        } else {
            msgDiv.style.background = "#e1f5fe";
            msgDiv.style.color = "black";
            msgDiv.style.alignSelf = "flex-start";
        }
        
        msgDiv.style.padding = "10px 15px";
        msgDiv.style.margin = "5px 0";
        msgDiv.style.borderRadius = "15px";
        msgDiv.style.width = "fit-content";
        msgDiv.style.maxWidth = "70%";
        msgDiv.innerHTML = `<small style="font-size:10px; opacity:0.8;">${data.user}</small><br>${data.text}`;
        
        chatBox.appendChild(msgDiv);
    });
    chatBox.scrollTop = chatBox.scrollHeight; 
});

// ૫. મેસેજ મોકલવાનું બટન
sendBtn.addEventListener('click', async () => {
    let message = messageInput.value;
    if(message.trim() !== "") {
        await addDoc(collection(db, "messages"), {
            user: username,
            text: message,
            timestamp: serverTimestamp()
        });
        messageInput.value = ""; 
    }
});
