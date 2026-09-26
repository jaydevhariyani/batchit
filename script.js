import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, doc, deleteDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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

// --- 2. REAL MATCHMAKING LOGIC ---
async function startMatchmaking() {
    if(mainChatScreen) mainChatScreen.style.display = 'none';
    if(radarScreen) radarScreen.style.display = 'flex';
    if(chatBox) chatBox.innerHTML = "";
    currentChatId = null;
    currentChatPartner = null;
    if(unsubscribeMessages) unsubscribeMessages();
    if(searchTimeout) clearTimeout(searchTimeout);

    const myQueueRef = doc(db, "matching_queue", currentUser.uid);
    await setDoc(myQueueRef, { uid: currentUser.uid, timestamp: serverTimestamp(), matchedWith: null });

    const q = query(collection(db, "matching_queue"), orderBy("timestamp", "asc"));
    const snapshot = await getDocs(q);
    let foundMatch = false;

    for (const docSnap of snapshot.docs) {
        const otherUser = docSnap.data();
        if (otherUser.uid !== currentUser.uid && !otherUser.matchedWith) {
            foundMatch = true;
            currentChatPartner = otherUser.uid;
            currentChatId = "chat_" + (currentUser.uid < otherUser.uid ? currentUser.uid + "_" + otherUser.uid : otherUser.uid + "_" + currentUser.uid);
            
            await setDoc(doc(db, "matching_queue", otherUser.uid), { matchedWith: currentChatId }, { merge: true });
            await deleteDoc(myQueueRef);
            
            connectToChat("Stranger");
            break;
        }
    }

    if (!foundMatch) {
        let checkInterval = setInterval(async () => {
            const myDoc = await getDoc(myQueueRef);
            if (myDoc.exists() && myDoc.data().matchedWith) {
                clearInterval(checkInterval);
                clearTimeout(searchTimeout);
                currentChatId = myDoc.data().matchedWith;
                currentChatPartner = "real_user";
                await deleteDoc(myQueueRef);
                connectToChat("Stranger");
            }
        }, 2000);

        searchTimeout = setTimeout(async () => {
            clearInterval(checkInterval);
            await deleteDoc(myQueueRef);
            currentChatPartner = "bot";
            currentChatId = "chat_" + currentUser.uid + "_bot";
            connectToChat(selectedGender === "Female" ? "Rahul (AI)" : "Priya (AI)");
            
            await addDoc(collection(db, "chats", currentChatId, "messages"), { 
                sender: "bot", text: "Hi there! Couldn't find a human, so I'm here. How are you?", timestamp: serverTimestamp() 
            });
        }, 10000); 
    }
}

function connectToChat(partnerName) {
    if(chatPartnerName) chatPartnerName.innerHTML = partnerName;
    if(radarScreen) radarScreen.style.display = 'none';
    if(mainChatScreen) mainChatScreen.style.display = 'flex';
    loadMessages();
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
    
    await addDoc(collection(db, "chats", currentChatId, "messages"), { 
        sender: currentUser.uid, text: message, timestamp: serverTimestamp() 
    });

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
            if(!aiReply) aiReply = "I am listening! Tell me more."; 

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

document.getElementById('message-input')?.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('send-btn').click();
    }
});

// --- PREMIUM MODAL LOGIC ---
const premiumModal = document.getElementById('premium-modal');
const openPremiumBtn = document.getElementById('open-premium-btn');
const closePremiumBtn = document.getElementById('close-premium-btn');
const notRightNowBtn = document.getElementById('not-right-now-btn');
const upgradePayBtns = document.querySelectorAll('.upgrade-pay-btn');

if (openPremiumBtn) openPremiumBtn.addEventListener('click', () => premiumModal.style.display = 'flex');

if (closePremiumBtn && notRightNowBtn) {
    const closePremium = () => premiumModal.style.display = 'none';
    closePremiumBtn.addEventListener('click', closePremium);
    notRightNowBtn.addEventListener('click', closePremium);
}

upgradePayBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        alert("Payment Gateway integration coming soon! (Razorpay / Stripe)");
        premiumModal.style.display = 'none';
    });
});

// --- CALL BUTTONS & PREMIUM ALERT ---
document.getElementById('audio-call-btn')?.addEventListener('click', () => {
    alert("Audio Calling is a VIP Feature! Upgrade to VIP to use this.");
    if(premiumModal) premiumModal.style.display = 'flex';
});

document.getElementById('menu-btn')?.addEventListener('click', () => {
    alert("Report & Block features coming soon!");
});

// --- FULL WEBRTC VIDEO CALL LOGIC ---
const videoCallBtn = document.getElementById('video-call-btn');
const videoCallScreen = document.getElementById('video-call-screen');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const endCallBtn = document.getElementById('end-call-btn');

let localStream = null;
let peerConnection = null;
let unsubscribeCall = null; // નવો ફેરફાર: જૂના કૉલ સાંભળવાનું બંધ કરવા

const servers = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
    ]
};

// ૧. કૉલ કરવાનું બટન દબાવે ત્યારે (Caller)
if (videoCallBtn) {
    videoCallBtn.addEventListener('click', async () => {
        if (!currentChatId || currentChatPartner === "bot") {
            alert("You can only video call a real person!");
            return;
        }
        
        videoCallScreen.style.display = 'flex';
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideo) localVideo.srcObject = localStream;

        peerConnection = new RTCPeerConnection(servers);
        const remoteStream = new MediaStream();
        if (remoteVideo) remoteVideo.srcObject = remoteStream;

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        peerConnection.ontrack = event => event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));

        const callDoc = doc(db, "chats", currentChatId);
        const offerCandidates = collection(callDoc, "offerCandidates");
        const answerCandidates = collection(callDoc, "answerCandidates");

        peerConnection.onicecandidate = event => {
            if (event.candidate) addDoc(offerCandidates, event.candidate.toJSON());
        };

        const offerDescription = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offerDescription);
        await setDoc(callDoc, { offer: { sdp: offerDescription.sdp, type: offerDescription.type } }, { merge: true });

        onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if (!peerConnection.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                peerConnection.setRemoteDescription(answerDescription);
            }
        });

        onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            });
        });
    });
}

// ૨. સામા વાળાનો કૉલ આવે ત્યારે ઓટોમેટિક ઉપાડવા માટે (Receiver)
function listenForIncomingCall() {
    if (!currentChatId) return;
    if (unsubscribeCall) unsubscribeCall(); // જૂનું લિસનર બંધ કરો

    unsubscribeCall = onSnapshot(doc(db, "chats", currentChatId), async (snapshot) => {
        const data = snapshot.data();
        // નવો ફેરફાર: જો offer હોય અને આપણે કનેક્ટ ના થયા હોઈએ તો જ કૉલ ઉપાડો
        if (data?.offer && !peerConnection) {
            videoCallScreen.style.display = 'flex';
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (localVideo) localVideo.srcObject = localStream;

            peerConnection = new RTCPeerConnection(servers);
            const remoteStream = new MediaStream();
            if (remoteVideo) remoteVideo.srcObject = remoteStream;

            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            peerConnection.ontrack = event => event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));

            const callDoc = doc(db, "chats", currentChatId);
            const answerCandidates = collection(callDoc, "answerCandidates");
            const offerCandidates = collection(callDoc, "offerCandidates");

            peerConnection.onicecandidate = event => {
                if (event.candidate) addDoc(answerCandidates, event.candidate.toJSON());
            };

            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answerDescription = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answerDescription);
            await setDoc(callDoc, { answer: { sdp: answerDescription.sdp, type: answerDescription.type } }, { merge: true });

            onSnapshot(offerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                });
            });
        }
    });
}

// જ્યારે ચેટ ચાલુ થાય ત્યારે કૉલનું ધ્યાન રાખવા માટે
const originalLoadMessages = loadMessages;
loadMessages = function() {
    originalLoadMessages();
    listenForIncomingCall();
};

// ૩. કૉલ કાપવાનું બટન (અને ડેટાબેઝ ક્લીન કરવાનું લોજીક)
if (endCallBtn) {
    endCallBtn.addEventListener('click', async () => {
        if (localStream) localStream.getTracks().forEach(track => track.stop());
        if (peerConnection) peerConnection.close();
        peerConnection = null;
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
        videoCallScreen.style.display = 'none';

        // નવો ફેરફાર: કૉલ કપાય એટલે ડેટાબેઝમાંથી જૂનો કૉલ ડેટા કાઢી નાખો
        if (currentChatId) {
            await setDoc(doc(db, "chats", currentChatId), { offer: null, answer: null }, { merge: true });
        }
    });
}
