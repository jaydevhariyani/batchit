import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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
const auth = getAuth(app);

// DOM Elements
const authPage = document.getElementById('auth-page');
const mainApp = document.getElementById('main-app');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const genderInput = document.getElementById('gender-input');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');

const usersListDiv = document.getElementById('all-users-list');
const chatHeaderTitle = document.getElementById('chat-header-title');
const chatBox = document.getElementById('chat-box');
const inputArea = document.getElementById('input-area');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const imgBtn = document.getElementById('img-btn');
const imageInput = document.getElementById('image-input');
const blockBtn = document.getElementById('block-user-btn');

const tabPrivate = document.getElementById('tab-private');
const tabGlobal = document.getElementById('tab-global');

// State Variables
let currentUser = null;
let currentUserData = null; 
let currentChatUser = null;
let currentChatId = null;
let currentMode = 'private'; 
let unsubscribeMessages = null;

// 1. Auth State & Online Presence
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authPage.style.display = 'none';
        mainApp.style.display = 'block';

        const userRef = doc(db, "users", user.email.toLowerCase());
        const userDoc = await getDoc(userRef);
        if(userDoc.exists()) {
            currentUserData = userDoc.data();
        }
        
        // --- ONLINE STATUS LOGIC ---
        await setDoc(userRef, { isOnline: true }, { merge: true });
        
        // બ્રાઉઝર બંધ કરે ત્યારે ઓફલાઈન કરવા માટે
        window.addEventListener('beforeunload', () => {
            setDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
        });
        
        // મોબાઈલમાં મિનિમાઇઝ કરે ત્યારે ઓફલાઈન કરવા માટે
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === 'visible') {
                setDoc(userRef, { isOnline: true }, { merge: true });
            } else {
                setDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
            }
        });
        // ---------------------------

        loadUsersList();
    } else {
        currentUser = null;
        currentUserData = null;
        authPage.style.display = 'flex';
        mainApp.style.display = 'none';
    }
});

// 2. Login & Register
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
    const gender = genderInput.value;

    if(!email || !password) return alert("Please enter email and password!");
    if(!gender) return alert("Please select your Gender!");
    
    registerBtn.innerHTML = "Creating Account...";
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", email.toLowerCase()), {
            email: email.toLowerCase(),
            name: email.split('@')[0],
            gender: gender,
            isOnline: true
        });
        currentUserData = { email: email.toLowerCase(), name: email.split('@')[0], gender: gender };
        alert("Account created successfully!");
        loadUsersList();
    } catch (error) {
        alert("Registration Failed: " + error.message);
    }
    registerBtn.innerHTML = "Create New Account";
});

logoutBtn.addEventListener('click', async () => {
    if(currentUser) {
        // લોગઆઉટ થતા જ ઓફલાઈન બતાવશે
        await setDoc(doc(db, "users", currentUser.email.toLowerCase()), { isOnline: false }, { merge: true });
    }
    signOut(auth);
});

// 3. TAB SWITCHING LOGIC
tabPrivate.addEventListener('click', () => {
    currentMode = 'private';
    tabPrivate.classList.replace('tab-inactive', 'tab-active');
    tabPrivate.style.background = '#0084ff';
    tabPrivate.style.color = 'white';
    
    tabGlobal.classList.replace('tab-active', 'tab-inactive');
    tabGlobal.style.background = '#e9ecef';
    tabGlobal.style.color = '#333';
    
    usersListDiv.style.display = 'block';
    chatBox.innerHTML = "";
    inputArea.style.display = 'none';
    chatHeaderTitle.innerHTML = "Select a user to chat";
    blockBtn.style.display = 'none';
    currentChatId = null;
    currentChatUser = null;
    if(unsubscribeMessages) unsubscribeMessages();
});

tabGlobal.addEventListener('click', () => {
    currentMode = 'global';
    tabGlobal.classList.replace('tab-inactive', 'tab-active');
    tabGlobal.style.background = '#25D366';
    tabGlobal.style.color = 'white';
    
    tabPrivate.classList.replace('tab-active', 'tab-inactive');
    tabPrivate.style.background = '#e9ecef';
    tabPrivate.style.color = '#333';
    
    usersListDiv.style.display = 'none';
    blockBtn.style.display = 'none';
    inputArea.style.display = 'flex';
    chatHeaderTitle.innerHTML = `<i class="fa-solid fa-earth-americas"></i> Global Public Room`;
    
    currentChatUser = 'global';
    currentChatId = 'global_room';
    
    loadGlobalMessages();
});

// 4. Load Private Users List (WITH GREEN DOT)
function loadUsersList() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        usersListDiv.innerHTML = "";
        
        // AI BOT
        const botDiv = document.createElement('div');
        botDiv.style.padding = "10px";
        botDiv.style.borderBottom = "1px solid #ddd";
        botDiv.style.cursor = "pointer";
        botDiv.style.display = "flex";
        botDiv.style.alignItems = "center";
        botDiv.style.background = "#f8f9fa";
        
        let botName = currentUserData?.gender === "Female" ? "Rahul (AI) 👦" : "Priya (AI) 👧";
        let botEmail = "bot@batchit.com";
        let botAvatar = `https://ui-avatars.com/api/?name=${botName}&background=random&color=fff&rounded=true&size=35`;
        
        botDiv.innerHTML = `
            <div style="display: flex; align-items: center; width: 100%;">
                <div style="position: relative; margin-right: 12px; display: flex;">
                    <img src="${botAvatar}" style="width: 35px; height: 35px; border-radius: 50%;"> 
                    <div class="online-dot"></div>
                </div>
                <strong style="color:#0084ff;">${botName}</strong>
                <span style="margin-left: 10px; font-size: 9px; background: #25D366; color: white; padding: 2px 5px; border-radius: 10px;">BOT</span>
            </div>
        `;
        botDiv.addEventListener('click', () => selectUser(botEmail, botName));
        usersListDiv.appendChild(botDiv);

        // NORMAL USERS
        snapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            if(userData.email !== currentUser.email) {
                const userDiv = document.createElement('div');
                userDiv.style.padding = "10px";
                userDiv.style.borderBottom = "1px solid #ddd";
                userDiv.style.cursor = "pointer";
                userDiv.style.display = "flex";
                userDiv.style.alignItems = "center";

                const avatarUrl = `https://ui-avatars.com/api/?name=${userData.name}&background=random&color=fff&rounded=true&size=35`;
                let genderIcon = userData.gender === "Male" ? "👦" : "👧";
                
                // ડેટાબેઝના આધારે લીલું કે ગ્રે ટપકું નક્કી થશે
                let dotClass = userData.isOnline ? "online-dot" : "online-dot offline-dot";

                userDiv.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        <div style="position: relative; margin-right: 12px; display: flex;">
                            <img src="${avatarUrl}" style="width: 35px; height: 35px; border-radius: 50%;"> 
                            <div class="${dotClass}"></div>
                        </div>
                        <strong style="color:#333;">${userData.name}${genderIcon}</strong>
                    </div>
                `;
                
                userDiv.addEventListener('click', () => selectUser(userData.email, userData.name));
                usersListDiv.appendChild(userDiv);
            }
        });
    });
}

// 5. Select User (Private Chat)
async function selectUser(userEmail, userName) {
    if(currentMode !== 'private') tabPrivate.click(); 
    
    currentChatUser = userEmail.toLowerCase();
    const emails = [currentUser.email.toLowerCase(), currentChatUser].sort();
    currentChatId = `${emails[0]}_${emails[1]}`;

    chatHeaderTitle.innerHTML = `<i class="fa-solid fa-user"></i> Chatting with ${userName}`;
    inputArea.style.display = 'flex';
    
    if(currentChatUser !== "bot@batchit.com") {
        blockBtn.style.display = 'block';
        const blockDoc = await getDoc(doc(db, "users", currentUser.email.toLowerCase(), "blocked", currentChatUser));
        if(blockDoc.exists()) {
            blockBtn.innerHTML = `<i class="fa-solid fa-unlock"></i> Unblock`;
            blockBtn.style.background = "#6c757d";
        } else {
            blockBtn.innerHTML = `<i class="fa-solid fa-ban"></i> Block User`;
            blockBtn.style.background = "#dc3545";
        }
    } else {
        blockBtn.style.display = 'none';
    }

    loadPrivateMessages();
}

blockBtn.addEventListener('click', async () => {
    const blockRef = doc(db, "users", currentUser.email.toLowerCase(), "blocked", currentChatUser);
    const blockDoc = await getDoc(blockRef);
    
    if(blockDoc.exists()) {
        await deleteDoc(blockRef);
        alert("User Unblocked!");
        blockBtn.innerHTML = `<i class="fa-solid fa-ban"></i> Block User`;
        blockBtn.style.background = "#dc3545";
    } else {
        if(confirm("Are you sure you want to block this user?")) {
            await setDoc(blockRef, { blocked: true, timestamp: serverTimestamp() });
            alert("User Blocked!");
            blockBtn.innerHTML = `<i class="fa-solid fa-unlock"></i> Unblock`;
            blockBtn.style.background = "#6c757d";
        }
    }
});

// 6. Load Private Messages
function loadPrivateMessages() {
    if(unsubscribeMessages) unsubscribeMessages(); 
    const q = query(collection(db, "private_chats", currentChatId, "messages"), orderBy("timestamp", "asc"));
    
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        chatBox.innerHTML = "";
        snapshot.forEach((docSnap) => {
            renderMessage(docSnap.data());
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// 6.1 Load Global Messages
function loadGlobalMessages() {
    if(unsubscribeMessages) unsubscribeMessages(); 
    const q = query(collection(db, "global_messages"), orderBy("timestamp", "asc"));
    
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        chatBox.innerHTML = "";
        snapshot.forEach((docSnap) => {
            renderMessage(docSnap.data(), true); 
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

function renderMessage(data, isGlobal = false) {
    const isMe = data.sender === currentUser.email.toLowerCase();
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
    
    if(isGlobal && !isMe) {
        const senderName = data.senderName || data.sender.split('@')[0];
        content += `<div class="global-sender-name" style="font-size: 11px; font-weight: bold; color: #ff9800; margin-bottom: 3px; cursor: pointer;">~ ${senderName} (Click to Chat)</div>`;
    }

    if(data.imageUrl) {
        content += `<img src="${data.imageUrl}" style="max-width: 220px; border-radius: 8px; margin-bottom: 5px; display: block;"/><br>`;
    }
    if(data.text) {
        content += `<div style="font-size: 15px;">${data.text}</div>`;
    }
    content += `<div style="font-size: 10px; opacity: ${isMe ? '0.8' : '0.5'}; text-align: right; margin-top: 4px;">${timeString}</div>`;

    msgDiv.innerHTML = content;
    
    if(isGlobal && !isMe) {
        msgDiv.querySelector('.global-sender-name')?.addEventListener('click', () => {
            selectUser(data.sender, data.senderName || data.sender.split('@')[0]);
        });
    }

    rowDiv.appendChild(msgDiv);
    chatBox.appendChild(rowDiv);
}

// 7. Send Message
sendBtn.addEventListener('click', async () => {
    let message = messageInput.value;
    if(message.trim() === "" || !currentChatId) return;
    
    if(currentMode === 'private' && currentChatUser !== 'bot@batchit.com') {
        const blockDoc = await getDoc(doc(db, "users", currentUser.email.toLowerCase(), "blocked", currentChatUser));
        if(blockDoc.exists()) return alert("You have blocked this user. Unblock to send messages.");
    }

    messageInput.value = "";
    const msgData = {
        sender: currentUser.email.toLowerCase(),
        senderName: currentUserData.name,
        text: message,
        timestamp: serverTimestamp()
    };

    if(currentMode === 'global') {
        await addDoc(collection(db, "global_messages"), msgData);
    } else {
        await addDoc(collection(db, "private_chats", currentChatId, "messages"), msgData);
        
        if(currentChatUser === "bot@batchit.com") {
            const p1 = "fG9m8ksuIRFb";
            const p2 = "YrQLmR1TJwEt";
            const p3 = "mbBhgmnReAOSt3It";
            const COHERE_API_KEY = p1 + p2 + p3;
            let botName = currentUserData?.gender === "Female" ? "Rahul" : "Priya";
            
            try {
                setTimeout(async () => {
                    const response = await fetch("https://api.cohere.ai/v2/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${COHERE_API_KEY}` },
                        body: JSON.stringify({
                            model: "command-a-plus-05-2026", 
                            messages: [
                                { role: "system", content: `You are a friendly chatting partner named ${botName}. Always reply naturally in the EXACT SAME LANGUAGE the user types in.` },
                                { role: "user", content: message }
                            ]
                        })
                    });
                    const data = await response.json();
                    let aiReply = "";
                    if (data?.message?.content) {
                        if (typeof data.message.content === "string") aiReply = data.message.content; 
                        else if (Array.isArray(data.message.content)) {
                            let textItem = data.message.content.find(item => item.type === "text");
                            if (textItem && textItem.text) aiReply = textItem.text;
                        }
                    } else if (data?.text) aiReply = data.text;
                    else if (typeof data?.message === "string") aiReply = `API Error: ${data.message}`;
                    
                    if (!aiReply || aiReply === "undefined") aiReply = `DEBUG: ${JSON.stringify(data)}`;

                    await addDoc(collection(db, "private_chats", currentChatId, "messages"), {
                        sender: "bot@batchit.com", text: String(aiReply), timestamp: serverTimestamp()
                    });
                }, 1000);
            } catch(error) {
                await addDoc(collection(db, "private_chats", currentChatId, "messages"), {
                    sender: "bot@batchit.com", text: `Network Error: ${error.message}`, timestamp: serverTimestamp()
                });
            }
        }
    }
});

// 8. Send Image
imgBtn.addEventListener('click', () => {
    if(!currentChatId) return alert("Please select a chat first!");
    imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file || !currentChatId) return;

    imgBtn.innerHTML = "⏳";
    const formData = new FormData();
    formData.append("image", file);

    try {
        const res = await fetch("https://api.imgbb.com/1/upload?key=7ce1a67d15e7ad03a0130dfd6f2973b0", { method: "POST", body: formData });
        const result = await res.json();

        if(result.success) {
            const msgData = {
                sender: currentUser.email.toLowerCase(),
                senderName: currentUserData.name,
                text: "",
                imageUrl: result.data.url,
                timestamp: serverTimestamp()
            };
            
            if(currentMode === 'global') {
                await addDoc(collection(db, "global_messages"), msgData);
            } else {
                await addDoc(collection(db, "private_chats", currentChatId, "messages"), msgData);
                
                if(currentChatUser === "bot@batchit.com") {
                    setTimeout(async () => {
                        await addDoc(collection(db, "private_chats", currentChatId, "messages"), {
                            sender: "bot@batchit.com", text: "Wow! Nice picture! 😍", timestamp: serverTimestamp()
                        });
                    }, 1500);
                }
            }
        } else alert("Image upload failed!");
    } catch(err) {
        alert("Network error!");
    }
    imgBtn.innerHTML = '📎';
    imageInput.value = "";
});
