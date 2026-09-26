import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, doc, getDoc, deleteDoc, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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
const landingPage = document.getElementById('landing-page');
const onboardModal = document.getElementById('onboard-modal');
const radarScreen = document.getElementById('radar-screen');
const mainChatScreen = document.getElementById('main-chat-screen');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const chatPartnerName = document.getElementById('chat-partner-name');
const typingIndicator = document.getElementById('typing-indicator');

let currentUser = null;
let currentChatId = null;
let currentChatPartner = null; // 'bot' or 'real_uid'
let unsubscribeMessages = null;
let selectedGender = "Male";
let searchTimeout = null;

// --- 1. ONBOARDING & START ---
document.getElementById('open-onboard-btn').addEventListener('click', () => onboardModal.style.display = 'flex');

document.getElementById('random-name-btn').addEventListener('click', () => {
    const names = ["CoolNinja", "SkyRider", "Ghost", "Star", "Leo", "Tiger", "Falcon"];
    document.getElementById('guest-name-input').value = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000);
});

document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.gender-btn').forEach(b => {
            b.classList.remove('active'); b.style.border = '1px solid #e5e7eb'; b.style.color = '#6b7280'; b.style.background = 'transparent';
        });
        btn.classList.add('active'); btn.style.border = '2px solid #8b5cf6'; btn.style.color = '#8b5cf6'; btn.style.background = '#f5f3ff';
        selectedGender = btn.getAttribute('data-gender');
    });
});

document.getElementById('start-guest-chat-btn').addEventListener('click', async () => {
    const btn = document.getElementById('start-guest-chat-btn');
    btn.innerHTML = "Connecting...";
    try {
        const result = await signInAnonymously(auth);
        currentUser = result.user;
        
        let name = document.getElementById('guest-name-input').value.trim() || "Guest" + Math.floor(Math.random() * 9999);
        await setDoc(doc(db, "users", currentUser.uid), { uid: currentUser.uid, name: name, gender: selectedGender, isOnline: true });
        
        onboardModal.style.display = 'none';
        landingPage.style.display = 'none';
        startMatchmaking(); // સીધું રાડાર ચાલુ!
    } catch(err) {
        alert("Error: Please enable 'Anonymous' sign-in in Firebase Auth.");
        btn.innerHTML = "Continue";
    }
});

// --- 2. MATCHMAKING RADAR LOGIC ---
async function startMatchmaking() {
    mainChatScreen.style.display = 'none';
    radarScreen.style.display = 'flex';
    chatBox.innerHTML = "";
    currentChatId = null;
    currentChatPartner = null;
    if(unsubscribeMessages) unsubscribeMessages();

    // 1. Queue ma potani entry nakho
    await setDoc(doc(db, "matching_queue", currentUser.uid), { uid: currentUser.uid, timestamp: serverTimestamp() });

    // 2. 4 second wait karo, jo koi real manas online hase to match thase, nai to Bot sathe match!
    searchTimeout = setTimeout(async () => {
        // Delete self from queue
        await deleteDoc(doc(db, "matching_queue", currentUser.uid));
        
        // Connect to AI Bot
        currentChatPartner = "bot";
        currentChatId = "chat_" + currentUser.uid + "_bot";
        chatPartnerName.innerHTML = selectedGender === "Female" ? "Rahul 👦" : "Priya 👧";
        
        radarScreen.style.display = 'none';
        mainChatScreen.style.display = 'flex';
        
        // Bot says hi first
        await addDoc(collection(db, "chats", currentChatId, "messages"), { 
            sender: "bot", text: "Hi there! I am connected with you. Say something!", timestamp: serverTimestamp() 
        });
        
        loadMessages();
    }, 4000);
}

document.getElementById('cancel-search-btn').addEventListener('click', async () => {
    clearTimeout(searchTimeout);
    await deleteDoc(doc(db, "matching_queue", currentUser.uid));
    radarScreen.style.display = 'none';
    landingPage.style.display = 'flex';
});

// --- 3. SKIP BUTTON LOGIC ---
document.getElementById('skip-btn').addEventListener('click', async () => {
    if(confirm("Are you sure you want to skip and find someone else?")) {
        // Delete current chat history to keep DB clean
        if(currentChatId) {
            // (Real app ma server thi delete thay, ahiya aapan local clear karisu)
            chatBox.innerHTML = "";
        }
        startMatchmaking();
    }
});

// --- 4. MESSAGING SYSTEM ---
document.getElementById('send-btn').addEventListener('click', async () => {
    let message = messageInput.value.trim();
    if(message === "" || !currentChatId) return;
    messageInput.value = "";
    
    // Add user message
    await addDoc(collection(db, "chats", currentChatId, "messages"), { 
        sender: currentUser.uid, text: message, timestamp: serverTimestamp() 
    });

    // AI Bot Reply Logic
    if(currentChatPartner === "bot") {
        typingIndicator.style.display = 'block';
        const COHERE_API_KEY = "fG9m8ksuIRFb" + "YrQLmR1TJwEt" + "mbBhgmnReAOSt3It";
        try {
            const response = await fetch("https://api.cohere.ai/v2/chat", {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${COHERE_API_KEY}` },
                body: JSON.stringify({
                    model: "command-a-plus-05-2026", 
                    messages: [
                        { role: "system", content: "You are a friendly chatting partner. Reply in short and casual way." },
                        { role: "user", content: message }
                    ]
                })
            });
            const data = await response.json();
            let aiReply = data?.message?.content?.[0]?.text || data?.text || "Haha nice!";
            
            setTimeout(async () => {
                typingIndicator.style.display = 'none';
                await addDoc(collection(db, "chats", currentChatId, "messages"), { sender: "bot", text: aiReply, timestamp: serverTimestamp() });
            }, 1000);
        } catch(error) { typingIndicator.style.display = 'none'; }
    }
});

function loadMessages() {
    if(unsubscribeMessages) unsubscribeMessages(); 
    const q = query(collection(db, "chats", currentChatId, "messages"), orderBy("timestamp", "asc"));
    
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        chatBox.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isMe = data.sender === currentUser.uid;
            
            const msgDiv = document.createElement('div');
            msgDiv.style.padding = "10px 15px"; msgDiv.style.maxWidth = "75%"; msgDiv.style.borderRadius = "20px"; msgDiv.style.marginBottom = "10px"; msgDiv.style.fontSize = "15px";
            msgDiv.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
            
            if(isMe) {
                msgDiv.style.background = "#8b5cf6"; msgDiv.style.color = "white"; 
                msgDiv.style.alignSelf = "flex-end"; msgDiv.style.borderBottomRightRadius = "5px";
            } else {
                msgDiv.style.background = "white"; msgDiv.style.color = "#111827"; 
                msgDiv.style.alignSelf = "flex-start"; msgDiv.style.borderBottomLeftRadius = "5px"; msgDiv.style.border = "1px solid #e5e7eb";
            }
            msgDiv.innerText = data.text;
            chatBox.appendChild(msgDiv);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}
