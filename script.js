// Firebase Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxl2AUWy8SjNEUauG_DtPfUcqkR_zDhVA",
  authDomain: "batchit-6a771.firebaseapp.com",
  projectId: "batchit-6a771",
  storageBucket: "batchit-6a771.firebasestorage.app",
  messagingSenderId: "1065125770111",
  appId: "1:1065125770111:web:67e90a86322af5e996604a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// યુઝરનેમ સેટઅપ
let username = localStorage.getItem('username');
if(!username) {
    username = prompt("તમારું નામ લખો (Enter your name):");
    if(!username) username = "Guest_" + Math.floor(Math.random() * 1000);
    localStorage.setItem('username', username);
}

// ઓનલાઇન સ્ટેટસ
const userDocRef = doc(db, "online_users", username);
setDoc(userDocRef, { name: username, timestamp: serverTimestamp() });

window.addEventListener("beforeunload", () => {
    deleteDoc(userDocRef);
});

// એલિમેન્ટ્સ
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const onlineUsersDiv = document.getElementById('online-users');
const imgBtn = document.getElementById('img-btn');
const imageInput = document.getElementById('image-input');

// ઓનલાઇન યુઝર લિસ્ટ
if(onlineUsersDiv) {
    onSnapshot(collection(db, "online_users"), (snapshot) => {
        onlineUsersDiv.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const data = doc.data();
            const userDiv = document.createElement('div');
            userDiv.style.padding = "10px";
            userDiv.style.borderBottom = "1px solid #ddd";
            userDiv.style.display = "flex";
            userDiv.style.alignItems = "center";
            userDiv.innerHTML = `<span style="background: #25D366; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 10px;"></span> <strong style="color:#333;">${data.name}</strong>`;
            onlineUsersDiv.appendChild(userDiv);
        });
    });
}

// મેસેજ અને ઇમેજ ડિસ્પ્લે
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
        
        let content = `<small style="font-size:10px; opacity:0.8;">${data.user}</small><br>`;
        if(data.imageUrl) {
            content += `<img src="${data.imageUrl}" style="max-width: 220px; border-radius: 8px; margin-top: 5px; display: block;"/><br>`;
        }
        if(data.text) {
            content += `${data.text}`;
        }
        msgDiv.innerHTML = content;
        
        chatBox.appendChild(msgDiv);
    });
    chatBox.scrollTop = chatBox.scrollHeight; 
});

// ટેક્સ્ટ મેસેજ મોકલો
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

// ૧૦૦% ફ્રી ફોટો અપલોડ (ImgBB API)
imgBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;

    imgBtn.innerHTML = "⏳";

    const formData = new FormData();
    formData.append("image", file);

    try {
        // Free ImgBB API Key (ભૂલ સુધારેલ છે)
        const res = await fetch("https://api.imgbb.com/1/upload?key=7ce1a67d15e7ad03a0130dfd6f2973b0", {
            method: "POST",
            body: formData
        });
        const result = await res.json();

        if(result.success) {
            await addDoc(collection(db, "messages"), {
                user: username,
                text: "",
                imageUrl: result.data.url,
                timestamp: serverTimestamp()
            });
        } else {
            alert("ઇમેજ અપલોડ ન થઈ શકી!");
        }
    } catch(err) {
        alert("નેટવર્ક એરર!");
    }

    imgBtn.innerHTML = '📎';
    imageInput.value = "";
});
