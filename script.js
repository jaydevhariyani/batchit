// Firebase Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// Authentication (Login) માટે નવો કોડ
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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
const auth = getAuth(app); // Auth ચાલુ કર્યું

// HTML Elements
const authPage = document.getElementById('auth-page');
const mainApp = document.getElementById('main-app');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');

const usersListDiv = document.getElementById('all-users-list');
const chatHeader = document.getElementById('chat-header');
const chatBox = document.getElementById('chat-box');
const inputArea = document.getElementById('input-area');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const imgBtn = document.getElementById('img-btn');
const imageInput = document.getElementById('image-input');

// Variables
let currentUser = null;
let currentChatUser = null;
let currentChatId = null;
let unsubscribeMessages = null;

// 1. ચેક કરો કે યુઝર Login છે કે નહીં?
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authPage.style.display = 'none'; // લોગિન પેજ છુપાવો
        mainApp.style.display = 'block'; // ચેટ એપ બતાવો

        // યુઝરનું નામ ડેટાબેઝમાં સેવ કરો જેથી બીજા લોકો તેને જોઈ શકે
        setDoc(doc(db, "users", user.email), {
            email: user.email,
            name: user.email.split('@')[0] // ઇમેઇલ પરથી નામ બનાવશે
        });

        loadUsersList();
    } else {
        currentUser = null;
        authPage.style.display = 'flex'; // લોગિન પેજ બતાવો
        mainApp.style.display = 'none'; // ચેટ એપ છુપાવો
    }
});

// 2. Login & Register સિસ્ટમ (All in English)
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if(!email || !password) return alert("Please enter email and password!");
    
    loginBtn.innerHTML = "Logging in...";
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("Login Failed: Incorrect email or password.");
    }
    loginBtn.innerHTML = "Login";
});

registerBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if(!email || !password) return alert("Please enter email and password!");
    
    registerBtn.innerHTML = "Creating Account...";
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created successfully!");
    } catch (error) {
        alert("Registration Failed: " + error.message);
    }
    registerBtn.innerHTML = "Create New Account";
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
    chatBox.innerHTML = "";
    inputArea.style.display = 'none';
    chatHeader.innerHTML = "<h2>Select a user from the list to start private chat</h2>";
});

// 3. ડાબી બાજુ બધા યુઝર્સનું લિસ્ટ બતાવવા માટે
function loadUsersList() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        usersListDiv.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            
            // લિસ્ટમાં પોતાનું નામ ન બતાવવું જોઈએ
            if(userData.email !== currentUser.email) {
                const userDiv = document.createElement('div');
                userDiv.style.padding = "10px";
                userDiv.style.borderBottom = "1px solid #ddd";
                userDiv.style.cursor = "pointer";
                userDiv.style.display = "flex";
                userDiv.style.alignItems = "center";

                const avatarUrl = `https://ui-avatars.com/api/?name=${userData.name}&background=random&color=fff&rounded=true&size=35`;

                userDiv.innerHTML = `
                    <img src="${avatarUrl}" style="margin-right: 12px; width: 35px; height: 35px; border-radius: 50%;">
                    <strong style="color:#333;">${userData.name}</strong>
                `;

                // યુઝરના નામ પર ક્લિક કરવાથી ચેટ ખુલે
                userDiv.addEventListener('click', () => {
                    selectUser(userData.email, userData.name);
                });

                usersListDiv.appendChild(userDiv);
            }
        });
    });
}

// 4. પ્રાઇવેટ ચેટ શરૂ કરવાનું સેટિંગ
function selectUser(userEmail, userName) {
    currentChatUser = userEmail;
    
    // બે યુઝર વચ્ચે એક યુનિક સિક્રેટ રૂમ (ID) બનાવશે
    const emails = [currentUser.email, userEmail].sort();
    currentChatId = `${emails[0]}_${emails[1]}`;

    chatHeader.innerHTML = `<h2 style="margin:0;"><i class="fa-solid fa-user"></i> Chatting with ${userName}</h2>`;
    inputArea.style.display = 'flex'; // મેસેજ ટાઈપ કરવાનું બોક્સ બતાવો

    loadPrivateMessages();
}

// 5. માત્ર પ્રાઇવેટ મેસેજ જ લોડ કરવાનું સેટિંગ
function loadPrivateMessages() {
    if(unsubscribeMessages) unsubscribeMessages(); // જૂની ચેટ બંધ કરો

    const q = query(collection(db, "private_chats", currentChatId, "messages"), orderBy("timestamp", "asc"));
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        chatBox.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isMe = data.sender === currentUser.email;

            const rowDiv = document.createElement('div');
            rowDiv.style.display = "flex";
            rowDiv.style.gap = "8px";
            rowDiv.style.marginBottom = "15px";
            rowDiv.style.alignItems = "flex-end";
            if(isMe) rowDiv.style.flexDirection = "row-reverse";

            const msgDiv = document.createElement('div');
            msgDiv.style.padding = "8px 12px";
            msgDiv.style.maxWidth = "70%";
            msgDiv.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";

            if(isMe) {
                msgDiv.style.background = "#0084ff";
                msgDiv.style.color = "white";
                msgDiv.style.borderRadius = "15px 15px 2px 15px";
            } else {
                msgDiv.style.background = "white";
                msgDiv.style.color = "black";
                msgDiv.style.borderRadius = "15px 15px 15px 2px";
                msgDiv.style.border = "1px solid #eee";
            }

            let timeString = "Now";
            if(data.timestamp) {
                let date = data.timestamp.toDate();
                timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
            }

            let content = ``;
            if(data.imageUrl) {
                content += `<img src="${data.imageUrl}" style="max-width: 220px; border-radius: 8px; margin-bottom: 5px; display: block;"/><br>`;
            }
            if(data.text) {
                content += `<div style="font-size: 15px;">${data.text}</div>`;
            }
            content += `<div style="font-size: 10px; opacity: ${isMe ? '0.8' : '0.5'}; text-align: right; margin-top: 4px;">${timeString}</div>`;

            msgDiv.innerHTML = content;
            rowDiv.appendChild(msgDiv);
            chatBox.appendChild(rowDiv);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// 6. પ્રાઇવેટ મેસેજ મોકલો
sendBtn.addEventListener('click', async () => {
    let message = messageInput.value;
    if(message.trim() !== "" && currentChatId) {
        await addDoc(collection(db, "private_chats", currentChatId, "messages"), {
            sender: currentUser.email,
            text: message,
            timestamp: serverTimestamp()
        });
        messageInput.value = "";
    }
});

// 7. પ્રાઇવેટ ઇમેજ (ફોટો) મોકલો (English Alerts)
imgBtn.addEventListener('click', () => {
    if(!currentChatId) return alert("Please select a user to chat with first!");
    imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file || !currentChatId) return;

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
            await addDoc(collection(db, "private_chats", currentChatId, "messages"), {
                sender: currentUser.email,
                text: "",
                imageUrl: result.data.url,
                timestamp: serverTimestamp()
            });
        } else {
            alert("Image upload failed! Please try again.");
        }
    } catch(err) {
        alert("Network error! Please check your internet connection.");
    }

    imgBtn.innerHTML = '📎';
    imageInput.value = "";
});
