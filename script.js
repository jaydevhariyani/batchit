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

// ઓનલાઇન યુઝર લિસ્ટ (પ્રોફાઇલ ફોટા સાથે)
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
            
            // ઓટોમેટિક અવતાર ફોટો
            let avatarUrl = `https://ui-avatars.com/api/?name=${data.name}&background=random&color=fff&rounded=true&size=35`;
            
            userDiv.innerHTML = `
                <div style="position: relative; margin-right: 12px;">
                    <img src="${avatarUrl}" style="width: 35px; height: 35px; border-radius: 50%;">
                    <span style="background: #25D366; width: 10px; height: 10px; border-radius: 50%; position: absolute; bottom: 0; right: 0; border: 2px solid white;"></span>
                </div>
                <strong style="color:#333;">${data.name}</strong>
            `;
            onlineUsersDiv.appendChild(userDiv);
        });
    });
}

// મેસેજ, ફોટો અને સમય ડિસ્પ્લે
const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = ""; 
    snapshot.forEach((doc) => {
        const data = doc.data();
        
        // મુખ્ય લાઈન (અવતાર + મેસેજ)
        const rowDiv = document.createElement('div');
        rowDiv.style.display = "flex";
        rowDiv.style.gap = "8px";
        rowDiv.style.marginBottom = "15px";
        rowDiv.style.alignItems = "flex-end"; // અવતાર નીચે રહે એ માટે
        
        const isMe = data.user === username;
        if(isMe) rowDiv.style.flexDirection = "row-reverse"; // તમારો મેસેજ જમણી બાજુ

        // અવતાર ફોટો
        const avatarImg = document.createElement('img');
        avatarImg.src = `https://ui-avatars.com/api/?name=${data.user}&background=random&color=fff&rounded=true&size=30`;
        avatarImg.style.width = "30px";
        avatarImg.style.height = "30px";
        avatarImg.style.borderRadius = "50%";
        
        // મેસેજ બબલ
        const msgDiv = document.createElement('div');
        msgDiv.style.padding = "8px 12px";
        msgDiv.style.maxWidth = "70%";
        msgDiv.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";
        
        if(isMe) {
            msgDiv.style.background = "#0084ff";
            msgDiv.style.color = "white";
            msgDiv.style.borderRadius = "15px 15px 2px 15px"; // WhatsApp જેવો શેપ
        } else {
            msgDiv.style.background = "white";
            msgDiv.style.color = "black";
            msgDiv.style.borderRadius = "15px 15px 15px 2px";
            msgDiv.style.border = "1px solid #eee";
        }
        
        // સમય સેટિંગ
        let timeString = "Now";
        if(data.timestamp) {
            let date = data.timestamp.toDate();
            timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        }

        // મેસેજની અંદરનું કન્ટેન્ટ
        let content = `<div style="font-size:11px; opacity:0.8; font-weight:bold; margin-bottom:3px;">${data.user}</div>`;
        
        if(data.imageUrl) {
            content += `<img src="${data.imageUrl}" style="max-width: 220px; border-radius: 8px; margin-bottom: 5px; display: block;"/><br>`;
        }
        if(data.text) {
            content += `<div style="font-size: 15px;">${data.text}</div>`;
        }
        
        // સમય બતાવવા માટે
        content += `<div style="font-size: 10px; opacity: ${isMe ? '0.8' : '0.5'}; text-align: right; margin-top: 4px;">${timeString}</div>`;
        
        msgDiv.innerHTML = content;
        
        rowDiv.appendChild(avatarImg);
        rowDiv.appendChild(msgDiv);
        chatBox.appendChild(rowDiv);
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
