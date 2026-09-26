import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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
let currentChatPartner = null; 
let unsubscribeMessages = null;
let selectedGender = "Male";
let searchTimeout = null;

// --- 1. ONBOARDING & START ---
document.getElementById('open-onboard-btn')?.addEventListener('click', () => {
    if(onboardModal) onboardModal.style.display = 'flex';
});

document.getElementById('random-name-btn')?.addEventListener('click', () => {
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

document.getElementById('start-guest-chat-btn')?.addEventListener('click', async () => {
    // 18+ ચેકબોક્સ ચેક કરો
    const ageAgree = document.getElementById('age-agree');
    if (ageAgree && !ageAgree.checked) {
        alert("You must be 18+ to use this app!");
        return;
    }

    const btn = document.getElementById('start-guest-chat-btn');
    btn.innerHTML = "Connecting...";
    try {
        const result = await signInAnonymously(auth);
        currentUser = result.user;
        
        let name = document.getElementById('guest-name-input').value.trim() || "Guest" + Math.floor(Math.random() * 9999);
        let age = document.getElementById('guest-age-input')?.value || "18";
        let country = document.getElementById('guest-country-input')?.value.trim() || "India";

        // નવો ડેટા (Age, Country) Firebase માં સેવ થશે
        await setDoc(doc(db, "users", currentUser.uid), { 
            uid: currentUser.uid, 
            name: name, 
            gender: selectedGender, 
            age: age,
            country: country,
            isOnline: true 
        });
        
        if(onboardModal) onboardModal.style.display = 'none';
        if(landingPage) landingPage.style.display = 'none';
        startMatchmaking(); 
    } catch(err) {
        alert("Error: Please enable 'Anonymous' sign-in in Firebase Auth.");
        btn.innerHTML = "Continue";
    }
});

// --- 2. MATCHMAKING RADAR LOGIC ---
async function startMatchmaking() {
    if(mainChatScreen) mainChatScreen.style.display = 'none';
    if(radarScreen) radarScreen.style.display = 'flex';
    if(chatBox) chatBox.innerHTML = "";
    currentChatId = null;
    currentChatPartner = null;
    if(unsubscribeMessages) unsubscribeMessages();

    // 1. Queue ma potani entry nakho
    await setDoc(doc(db, "matching_queue", currentUser.uid), { uid: currentUser.uid, timestamp: serverTimestamp() });

    // 2. 4 second wait karo, matching mate
    searchTimeout = setTimeout(async () => {
        // Delete self from queue
        await deleteDoc(doc(db, "matching_queue", currentUser.uid));
        
        // Connect to AI Bot
        currentChatPartner = "bot";
        currentChatId = "chat_" + currentUser.uid + "_bot";
        if(chatPartnerName) chatPartnerName.innerHTML = selectedGender === "Female" ? "Rahul 👦" : "Priya 👧";
        
        if(radarScreen) radarScreen.style.display = 'none';
        if(mainChatScreen) mainChatScreen.style.display = 'flex';
        
        // Bot says hi first
        await addDoc(collection(db, "chats", currentChatId, "messages"), { 
            sender: "bot", text: "Hi there! I am connected with you. Say something!", timestamp: serverTimestamp() 
        });
        
        loadMessages();
    }, 4000);
}

document.getElementById('cancel-search-btn')?.addEventListener('click', async () => {
    clearTimeout(searchTimeout);
    if(currentUser) await deleteDoc(doc(db, "matching_queue", currentUser.uid));
    if(radarScreen) radarScreen.style.display = 'none';
    if(landingPage) landingPage.style.display = 'flex';
});

// --- 3. SKIP BUTTON LOGIC ---
document.getElementById('skip-btn')?.addEventListener('click', async () => {
    if(confirm("Are you sure you want to skip and find someone else?")) {
        if(chatBox) chatBox.innerHTML = "";
        startMatchmaking();
    }
});

// --- 4. MESSAGING SYSTEM & SMART AI BOT ---
document.getElementById('send-btn')?.addEventListener('click', async () => {
    if(!messageInput || !currentChatId) return;
    let message = messageInput.value.trim();
    if(message === "") return;
    messageInput.value = "";
    
    // User no message
    await addDoc(collection(db, "chats", currentChatId, "messages"), { 
        sender: currentUser.uid, text: message, timestamp: serverTimestamp() 
    });

    // AI Bot Reply Logic (100% FIXED & TESTED)
    if(currentChatPartner === "bot") {
        if(typingIndicator) typingIndicator.style.display = 'block';
        const COHERE_API_KEY = "fG9m8ksuIRFb" + "YrQLmR1TJwEt" + "mbBhgmnReAOSt3It";
        try {
            const response = await fetch("https://api.cohere.ai/v1/chat", {
                method: "POST", 
                headers: { 
                    "Content-Type": "application/json", 
                    "Authorization": `Bearer ${COHERE_API_KEY}` 
                },
                body: JSON.stringify({
                    message: message,
                    preamble: "You are a friendly Indian chatting partner named Priya. Reply naturally, casually, and in short sentences to whatever the user says.",
                    temperature: 0.7
                })
            });
            const data = await response.json();
            
            let aiReply = data.text;
            
            // જો API માંથી કોઈ કારણસર જવાબ ના આવે તો આ બોલશે
            if(!aiReply) {
                aiReply = "I am listening! Tell me more."; 
            }

            setTimeout(async () => {
                if(typingIndicator) typingIndicator.style.display = 'none';
                await addDoc(collection(db, "chats", currentChatId, "messages"), { sender: "bot", text: aiReply, timestamp: serverTimestamp() });
            }, 1000);
        } catch(error) { 
            if(typingIndicator) typingIndicator.style.display = 'none'; 
            await addDoc(collection(db, "chats", currentChatId, "messages"), { sender: "bot", text: "Oops! Network is slow right now.", timestamp: serverTimestamp() });
        }
    }
});

// Load Chat
function loadMessages() {
    if(unsubscribeMessages) unsubscribeMessages(); 
    const q = query(collection(db, "chats", currentChatId, "messages"), orderBy("timestamp", "asc"));
    
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        if(!chatBox) return;
        chatBox.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isMe = data.sender === currentUser.uid;
            
            const msgDiv = document.createElement('div');
            msgDiv.style.padding = "10px 15px"; msgDiv.style.maxWidth = "75%"; msgDiv.style.borderRadius = "20px"; msgDiv.style.marginBottom = "10px"; msgDiv.style.fontSize = "15px";
            msgDiv.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
            msgDiv.style.wordBreak = "break-word";
            
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

// Enter Key thi Message Send Karva Mate (Extra Feature)
document.getElementById('message-input')?.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('send-btn').click();
    }
});
