import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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
const storage = getStorage(app);

// NEW UI ELEMENTS
const landingPage = document.getElementById('landing-page');
const onboardModal = document.getElementById('onboard-modal');
const openOnboardBtn = document.getElementById('open-onboard-btn');
const startGuestChatBtn = document.getElementById('start-guest-chat-btn');
const guestNameInput = document.getElementById('guest-name-input');
const randomNameBtn = document.getElementById('random-name-btn');
const genderBtns = document.querySelectorAll('.gender-btn');
const ageAgree = document.getElementById('age-agree');

const mainApp = document.getElementById('main-app');
const usersListDiv = document.getElementById('all-users-list');
const chatHeaderTitle = document.getElementById('chat-header-title');
const chatBox = document.getElementById('chat-box');
const inputArea = document.getElementById('input-area');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const imgBtn = document.getElementById('img-btn');
const imageInput = document.getElementById('image-input');
const micBtn = document.getElementById('mic-btn'); 
const blockBtn = document.getElementById('block-user-btn');
const logoutBtn = document.getElementById('logout-btn');
const tabPrivate = document.getElementById('tab-private');
const tabGlobal = document.getElementById('tab-global');
const themeToggleBtn = document.getElementById('theme-toggle');
const typingIndicator = document.getElementById('typing-indicator');

let currentUser = null;
let currentUserData = null; 
let currentChatUser = null;
let currentChatId = null;
let currentMode = 'private'; 
let unsubscribeMessages = null;
let unsubscribeTyping = null;
let selectedGender = "Male";

// --- NEW ONBOARDING LOGIC (Start Chatting) ---
openOnboardBtn.addEventListener('click', () => {
    onboardModal.style.display = 'flex';
});

randomNameBtn.addEventListener('click', () => {
    const names = ["CoolNinja", "SkyRider", "Ghost", "Star", "Leo", "Tiger", "Falcon", "Mystic"];
    guestNameInput.value = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000);
});

genderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        genderBtns.forEach(b => {
            b.classList.remove('active');
            b.style.border = '1px solid #e5e7eb'; b.style.color = '#6b7280'; b.style.background = 'transparent';
        });
        btn.classList.add('active');
        btn.style.border = '2px solid #8b5cf6'; btn.style.color = '#8b5cf6'; btn.style.background = '#f5f3ff';
        selectedGender = btn.getAttribute('data-gender');
    });
});

startGuestChatBtn.addEventListener('click', async () => {
    if(!ageAgree.checked) return alert("You must be 18+ to use this app!");
    const name = guestNameInput.value.trim() || "Guest" + Math.floor(Math.random() * 9999);
    
    startGuestChatBtn.innerHTML = "Connecting...";
    try {
        // Anonymous Login Without Email/Password
        const result = await signInAnonymously(auth);
        const user = result.user;
        const fakeEmail = user.uid + "@guest.batchit"; 
        
        await setDoc(doc(db, "users", fakeEmail), {
            email: fakeEmail, name: name, gender: selectedGender, isOnline: true
        });
        
        onboardModal.style.display = 'none';
        landingPage.style.display = 'none';
    } catch (error) {
        alert("Connection Failed: " + error.message);
        startGuestChatBtn.innerHTML = "Continue";
    }
});

// --- AUTH LOGIC ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userEmail = user.email || (user.uid + "@guest.batchit");
        currentUser.customEmail = userEmail.toLowerCase();
        
        if (landingPage) landingPage.style.display = 'none';
        if (onboardModal) onboardModal.style.display = 'none';
        mainApp.style.display = 'block';

        const userRef = doc(db, "users", currentUser.customEmail);
        const userDoc = await getDoc(userRef);
        if(userDoc.exists()) currentUserData = userDoc.data();
        else currentUserData = { email: currentUser.customEmail, name: "Guest", gender: "Male" };
        
        await setDoc(userRef, { isOnline: true }, { merge: true });
        
        window.addEventListener('beforeunload', () => setDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }));
        loadUsersList();
    } else {
        currentUser = null;
        currentUserData = null;
        if (landingPage) landingPage.style.display = 'flex';
        mainApp.style.display = 'none';
    }
});

logoutBtn.addEventListener('click', async () => {
    if(currentUser) await setDoc(doc(db, "users", currentUser.customEmail), { isOnline: false }, { merge: true });
    signOut(auth);
});

// --- DARK MODE LOGIC ---
if(localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    themeToggleBtn.style.color = '#f1c40f';
}
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if(document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        themeToggleBtn.style.color = '#f1c40f';
    } else {
        localStorage.setItem('theme', 'light');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        themeToggleBtn.style.color = '#0084ff';
    }
});

// --- LOAD USERS LIST ---
function loadUsersList() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        usersListDiv.innerHTML = "";
        
        // AI BOT
        const botDiv = document.createElement('div');
        botDiv.style.padding = "10px"; botDiv.style.borderBottom = "1px solid #ddd"; botDiv.style.cursor = "pointer"; botDiv.style.display = "flex"; botDiv.style.alignItems = "center";
        let botName = currentUserData?.gender === "Female" ? "Rahul (AI) 👦" : "Priya (AI) 👧";
        let botAvatar = `https://ui-avatars.com/api/?name=${botName}&background=random&color=fff&rounded=true&size=35`;
        
        botDiv.innerHTML = `
            <div style="display: flex; align-items: center; width: 100%;">
                <div style="position: relative; margin-right: 12px; display: flex;">
                    <img src="${botAvatar}" style="width: 35px; height: 35px; border-radius: 50%;"> 
                    <div class="online-dot"></div>
                </div>
                <div style="display: flex; flex-direction: column;">
                    <div><strong style="color:#8b5cf6;">${botName}</strong><span style="margin-left: 10px; font-size: 9px; background: #25D366; color: white; padding: 2px 5px; border-radius: 10px;">BOT</span></div>
                    <span style="font-size: 11px; color: #888;">Always here to chat!</span>
                </div>
            </div>`;
        botDiv.addEventListener('click', () => selectUser("bot@batchit.com", botName));
        usersListDiv.appendChild(botDiv);

        // REAL USERS
        snapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            if(userData.email !== currentUser.customEmail) {
                const userDiv = document.createElement('div');
                userDiv.style.padding = "10px"; userDiv.style.borderBottom = "1px solid #ddd"; userDiv.style.cursor = "pointer"; userDiv.style.display = "flex"; userDiv.style.alignItems = "center";
                const avatarUrl = userData.avatarUrl || `https://ui-avatars.com/api/?name=${userData.name}&background=random&color=fff&rounded=true&size=35`;
                const bioText = userData.bio || "Available";
                let genderIcon = userData.gender === "Male" ? "👦" : (userData.gender === "Female" ? "👧" : "🏳️‍🌈");
                let dotClass = userData.isOnline ? "online-dot" : "online-dot offline-dot";
                
                userDiv.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        <div style="position: relative; margin-right: 12px; display: flex;">
                            <img src="${avatarUrl}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;"> 
                            <div class="${dotClass}"></div>
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <strong style="color: inherit;">${userData.name}${genderIcon}</strong>
                            <span style="font-size: 11px; color: #888;">${bioText}</span>
                        </div>
                    </div>`;
                userDiv.addEventListener('click', () => selectUser(userData.email, userData.name));
                usersListDiv.appendChild(userDiv);
            }
        });
    });
}

// --- SELECT USER ---
async function selectUser(userEmail, userName) {
    if(currentMode !== 'private') tabPrivate.click(); 
    currentChatUser = userEmail.toLowerCase();
    const emails = [currentUser.customEmail, currentChatUser].sort();
    currentChatId = `${emails[0]}_${emails[1]}`;
    
    chatHeaderTitle.innerHTML = `<i class="fa-solid fa-user"></i> Chatting with ${userName}`;
    inputArea.style.display = 'flex';
    blockBtn.style.display = currentChatUser !== "bot@batchit.com" ? 'block' : 'none';
    
    if(window.innerWidth <= 768) {
        document.querySelector('.sidebar').style.setProperty('display', 'none', 'important');
        document.querySelector('.chat-area').style.setProperty('display', 'flex', 'important');
    }
    loadPrivateMessages();
}

// --- SEND MESSAGE LOGIC ---
sendBtn.addEventListener('click', async () => {
    let message = messageInput.value;
    if(message.trim() === "" || !currentChatId) return;
    messageInput.value = "";
    
    const msgData = { sender: currentUser.customEmail, senderName: currentUserData.name, text: message, timestamp: serverTimestamp() };

    if(currentMode === 'global') {
        await addDoc(collection(db, "global_messages"), msgData);
    } else {
        await addDoc(collection(db, "private_chats", currentChatId, "messages"), msgData);
        
        // AI BOT LOGIC
        if(currentChatUser === "bot@batchit.com") {
            const COHERE_API_KEY = "fG9m8ksuIRFb" + "YrQLmR1TJwEt" + "mbBhgmnReAOSt3It";
            let botName = currentUserData?.gender === "Female" ? "Rahul" : "Priya";
            typingIndicator.style.display = 'block';
            try {
                setTimeout(async () => {
                    const response = await fetch("https://api.cohere.ai/v2/chat", {
                        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${COHERE_API_KEY}` },
                        body: JSON.stringify({
                            model: "command-a-plus-05-2026", 
                            messages: [
                                { role: "system", content: `You are a chatting partner named ${botName}. Reply naturally in the EXACT SAME LANGUAGE.` },
                                { role: "user", content: message }
                            ]
                        })
                    });
                    const data = await response.json();
                    let aiReply = data?.message?.content?.[0]?.text || data?.text || "Let's chat more!";
                    typingIndicator.style.display = 'none'; 
                    await addDoc(collection(db, "private_chats", currentChatId, "messages"), { sender: "bot@batchit.com", text: String(aiReply), timestamp: serverTimestamp() });
                }, 1000);
            } catch(error) { typingIndicator.style.display = 'none'; }
        }
    }
});

// --- LOAD MESSAGES ---
function loadPrivateMessages() {
    if(unsubscribeMessages) unsubscribeMessages(); 
    const q = query(collection(db, "private_chats", currentChatId, "messages"), orderBy("timestamp", "asc"));
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        chatBox.innerHTML = "";
        snapshot.forEach((docSnap) => renderMessage(docSnap));
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

function renderMessage(docSnap, isGlobal = false) {
    const data = docSnap.data();
    const docId = docSnap.id;
    const isMe = data.sender === currentUser.customEmail;
    
    const rowDiv = document.createElement('div');
    rowDiv.style.display = "flex"; rowDiv.style.gap = "8px"; rowDiv.style.marginBottom = "15px"; rowDiv.style.alignItems = "flex-end";
    if(isMe) rowDiv.style.flexDirection = "row-reverse";

    const msgDiv = document.createElement('div');
    msgDiv.style.padding = "8px 12px"; msgDiv.style.maxWidth = "70%"; msgDiv.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";

    if(isMe) {
        msgDiv.style.background = "#8b5cf6"; msgDiv.style.color = "white"; msgDiv.style.borderRadius = "15px 15px 2px 15px";
    } else {
        msgDiv.className = "message-other"; msgDiv.style.background = "white"; msgDiv.style.color = "black"; msgDiv.style.borderRadius = "15px 15px 15px 2px"; msgDiv.style.border = "1px solid #eee";
    }

    let timeString = "Now";
    if(data.timestamp) timeString = data.timestamp.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

    let content = ``;
    if(isGlobal && !isMe) content += `<div style="font-size: 11px; font-weight: bold; color: #ff9800; margin-bottom: 3px;">~ ${data.senderName}</div>`;
    if(data.text) content += `<div style="font-size: 15px;">${data.text}</div>`;
    
    let timeHtml = `<div style="font-size: 10px; opacity: ${isMe ? '0.9' : '0.5'}; text-align: right; margin-top: 4px; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">`;
    if(isMe) timeHtml += `<i class="fa-solid fa-trash delete-btn" style="cursor: pointer; color: #ffcccc;" title="Delete"></i>`;
    timeHtml += `<span>${timeString}</span></div>`;
    
    msgDiv.innerHTML = content + timeHtml;
    
    if(isMe) {
        msgDiv.querySelector('.delete-btn')?.addEventListener('click', async () => {
            if(confirm("Delete this message?")) await deleteDoc(doc(db, isGlobal ? "global_messages" : `private_chats/${currentChatId}/messages`, docId));
        });
    }
    rowDiv.appendChild(msgDiv); chatBox.appendChild(rowDiv);
}

// --- MOBILE BACK BUTTON (Fix) ---
const backBtnMobile = document.getElementById('back-btn-mobile');
if(backBtnMobile) {
    backBtnMobile.addEventListener('click', (e) => {
        e.preventDefault();
        if(window.innerWidth <= 768) {
            document.querySelector('.chat-area').style.setProperty('display', 'none', 'important');
            document.querySelector('.sidebar').style.setProperty('display', 'flex', 'important');
        }
    });
}
window.addEventListener('resize', () => {
    if(window.innerWidth > 768) {
        document.querySelector('.sidebar').style.setProperty('display', 'flex', 'important');
        document.querySelector('.chat-area').style.setProperty('display', 'flex', 'important');
    } else {
        document.querySelector('.chat-area').style.setProperty('display', 'none', 'important');
        document.querySelector('.sidebar').style.setProperty('display', 'flex', 'important');
    }
});
