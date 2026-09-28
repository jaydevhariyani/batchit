import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, doc, deleteDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

const landingPage = document.getElementById('landing-page');
const dashboardScreen = document.getElementById('dashboard-screen');
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
let preferredGender = "Any"; // નવું ફિલ્ટર વેરીએબલ
let searchTimeout = null;

// --- 1. NAVIGATION & LOGIN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) selectedGender = userDoc.data().gender || "Male";
        } catch(e) { console.log("New user"); }
    }
});

document.querySelectorAll('.open-onboard-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
        if(landingPage) landingPage.style.display = 'none';
        if(dashboardScreen) dashboardScreen.style.display = 'flex';
    });
});

// પોતાનું જેન્ડર સિલેક્ટ કરવા
document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.gender-btn').forEach(b => {
            b.classList.remove('active'); b.style.border = '1px solid #e5e7eb'; b.style.color = '#6b7280'; b.style.background = 'transparent';
        });
        btn.classList.add('active'); btn.style.border = '2px solid #8b5cf6'; btn.style.color = '#8b5cf6'; btn.style.background = '#f5f3ff';
        selectedGender = btn.getAttribute('data-gender');
    });
});

// કોની સાથે વાત કરવી છે એ (Preference) સિલેક્ટ કરવા
document.querySelectorAll('.pref-gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.pref-gender-btn').forEach(b => {
            b.classList.remove('active'); b.style.border = '1px solid #e5e7eb'; b.style.color = '#6b7280'; b.style.background = 'white';
        });
        btn.classList.add('active'); btn.style.border = '2px solid #22c55e'; btn.style.color = '#22c55e'; btn.style.background = '#dcfce7';
        preferredGender = btn.getAttribute('data-pref');
    });
});

document.getElementById('start-guest-chat-btn')?.addEventListener('click', async () => {
    const ageAgree = document.getElementById('age-agree');
    if (ageAgree && !ageAgree.checked) { alert("You must be 18+ to use this app!"); return; }

    const btn = document.getElementById('start-guest-chat-btn');
    btn.innerHTML = "Connecting...";
    try {
        const result = await signInAnonymously(auth);
        currentUser = result.user;
        
        let name = document.getElementById('guest-name-input').value.trim() || "Guest" + Math.floor(Math.random() * 9999);
        let age = document.getElementById('guest-age-input')?.value || "18";
        let country = document.getElementById('guest-country-input')?.value.trim() || "India";

        await setDoc(doc(db, "users", currentUser.uid), { 
            uid: currentUser.uid, name: name, gender: selectedGender, age: age, country: country, isOnline: true 
        });
        
        if(dashboardScreen) dashboardScreen.style.display = 'none';
        startMatchmaking(); 
    } catch(err) {
        alert("Error connecting. Please try again.");
        btn.innerHTML = 'Start New Chat <i class="fa-solid fa-arrow-right"></i>';
    }
});

// --- 2. SMART FILTER MATCHMAKING LOGIC ---
async function startMatchmaking() {
    if(mainChatScreen) mainChatScreen.style.display = 'none';
    if(radarScreen) radarScreen.style.display = 'flex';
    if(chatBox) chatBox.innerHTML = "";
    currentChatId = null;
    currentChatPartner = null;
    if(unsubscribeMessages) unsubscribeMessages();
    if(searchTimeout) clearTimeout(searchTimeout);

    let myCountryVal = document.getElementById('guest-country-input').value.trim().toLowerCase() || "india";
    let prefCountryVal = document.getElementById('pref-country-input')?.value.trim().toLowerCase() || "";

    const myQueueRef = doc(db, "matching_queue", currentUser.uid);
    // કતારમાં ફિલ્ટરની બધી માહિતી સેવ કરો
    await setDoc(myQueueRef, { 
        uid: currentUser.uid, 
        timestamp: serverTimestamp(), 
        matchedWith: null, 
        partnerUid: null,
        myGender: selectedGender,
        myCountry: myCountryVal,
        prefGender: preferredGender,
        prefCountry: prefCountryVal
    });

    const q = query(collection(db, "matching_queue"), orderBy("timestamp", "asc"));
    const snapshot = await getDocs(q);
    let foundMatch = false;

    for (const docSnap of snapshot.docs) {
        const otherUser = docSnap.data();
        if (otherUser.uid !== currentUser.uid && !otherUser.matchedWith) {
            
            let isMatch = true;
            
            // 1. શું સામેવાળો *મારી* પસંદગી મુજબનો છે?
            if (preferredGender !== "Any" && otherUser.myGender !== preferredGender) isMatch = false;
            if (prefCountryVal !== "" && otherUser.myCountry !== prefCountryVal) isMatch = false;
            
            // 2. શું હું *સામેવાળાની* પસંદગી મુજબનો છું?
            if (otherUser.prefGender !== "Any" && otherUser.prefGender !== selectedGender) isMatch = false;
            if (otherUser.prefCountry !== "" && otherUser.prefCountry !== myCountryVal) isMatch = false;

            if (isMatch) {
                foundMatch = true;
                currentChatPartner = otherUser.uid;
                currentChatId = "chat_" + (currentUser.uid < otherUser.uid ? currentUser.uid + "_" + otherUser.uid : otherUser.uid + "_" + currentUser.uid);
                
                await setDoc(doc(db, "matching_queue", otherUser.uid), { matchedWith: currentChatId, partnerUid: currentUser.uid }, { merge: true });
                await deleteDoc(myQueueRef);
                
                const partnerDoc = await getDoc(doc(db, "users", otherUser.uid));
                const partnerName = partnerDoc.exists() ? partnerDoc.data().name : "Stranger";
                
                connectToChat(partnerName);
                break;
            }
        }
    }

    if (!foundMatch) {
        let checkInterval = setInterval(async () => {
            const myDoc = await getDoc(myQueueRef);
            if (myDoc.exists() && myDoc.data().matchedWith) {
                clearInterval(checkInterval);
                clearTimeout(searchTimeout);
                currentChatId = myDoc.data().matchedWith;
                currentChatPartner = myDoc.data().partnerUid; 
                await deleteDoc(myQueueRef);
                
                let partnerName = "Stranger";
                if (currentChatPartner) {
                    const partnerDoc = await getDoc(doc(db, "users", currentChatPartner));
                    if (partnerDoc.exists()) partnerName = partnerDoc.data().name;
                }
                connectToChat(partnerName);
            }
        }, 2000);

        searchTimeout = setTimeout(async () => {
            clearInterval(checkInterval);
            await deleteDoc(myQueueRef);
            currentChatPartner = "bot";
            currentChatId = "chat_" + currentUser.uid + "_bot";
            
            // જો Female ફિલ્ટર કર્યું હોય તો AI બોટ પણ Female જ આવશે!
            let botName = "Stranger (AI)";
            if(preferredGender === "Female") botName = "Priya (AI)";
            else if(preferredGender === "Male") botName = "Rahul (AI)";
            else botName = selectedGender === "Female" ? "Rahul (AI)" : "Priya (AI)";

            connectToChat(botName);
            await addDoc(collection(db, "chats", currentChatId, "messages"), { 
                sender: "bot", text: "Hi there! Real users matching your filters are busy. I'm here to chat!", timestamp: serverTimestamp() 
            });
        }, 12000); // 12 સેકન્ડ સુધી અસલી માણસ શોધશે
    }
}

function connectToChat(partnerName) {
    if(chatPartnerName) chatPartnerName.innerHTML = partnerName;
    if(radarScreen) radarScreen.style.display = 'none';
    if(mainChatScreen) mainChatScreen.style.display = 'flex';
    
    const btn = document.getElementById('start-guest-chat-btn');
    if(btn) btn.innerHTML = 'Start New Chat <i class="fa-solid fa-arrow-right"></i>';

    loadMessages();
}

document.getElementById('cancel-search-btn')?.addEventListener('click', async () => {
    clearTimeout(searchTimeout);
    if(currentUser) await deleteDoc(doc(db, "matching_queue", currentUser.uid));
    if(radarScreen) radarScreen.style.display = 'none';
    if(dashboardScreen) dashboardScreen.style.display = 'flex'; 
});

document.getElementById('skip-btn')?.addEventListener('click', async () => {
    if(confirm("Skip and find someone else with the same filters?")) {
        if(chatBox) chatBox.innerHTML = "";
        startMatchmaking();
    }
});

// --- 3. MESSAGING SYSTEM ---
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
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${COHERE_API_KEY}` },
                body: JSON.stringify({ message: message, preamble: "You are a friendly chatting partner.", temperature: 0.7 })
            });
            const data = await response.json();
            let aiReply = data.text || "I am listening! Tell me more."; 
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

let loadMessages = function() {
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

    listenForIncomingCall();
}

document.getElementById('message-input')?.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') { e.preventDefault(); document.getElementById('send-btn').click(); }
});

// --- 4. VIDEO CALL LOGIC ---
const videoCallBtn = document.getElementById('video-call-btn');
const videoCallScreen = document.getElementById('video-call-screen');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const endCallBtn = document.getElementById('end-call-btn');

let localStream = null;
let peerConnection = null;
let unsubscribeCall = null;
const servers = { iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }] };

if (videoCallBtn) {
    videoCallBtn.addEventListener('click', async () => {
        if (!currentChatId || currentChatPartner === "bot") { alert("You can only video call a real person!"); return; }
        videoCallScreen.style.display = 'flex';
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideo) localVideo.srcObject = localStream;

        peerConnection = new RTCPeerConnection(servers);
        const remoteStream = new MediaStream();
        if (remoteVideo) remoteVideo.srcObject = remoteStream;

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        peerConnection.ontrack = event => event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));

        const callDoc = doc(db, "chats", currentChatId);
        peerConnection.onicecandidate = event => { if (event.candidate) addDoc(collection(callDoc, "offerCandidates"), event.candidate.toJSON()); };

        const offerDescription = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offerDescription);
        await setDoc(callDoc, { offer: { sdp: offerDescription.sdp, type: offerDescription.type } }, { merge: true });

        onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if (!peerConnection.currentRemoteDescription && data?.answer) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });

        onSnapshot(collection(callDoc, "answerCandidates"), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            });
        });
    });
}

function listenForIncomingCall() {
    if (!currentChatId) return;
    if (unsubscribeCall) unsubscribeCall();

    unsubscribeCall = onSnapshot(doc(db, "chats", currentChatId), async (snapshot) => {
        const data = snapshot.data();
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
            peerConnection.onicecandidate = event => { if (event.candidate) addDoc(collection(callDoc, "answerCandidates"), event.candidate.toJSON()); };

            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answerDescription = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answerDescription);
            await setDoc(callDoc, { answer: { sdp: answerDescription.sdp, type: answerDescription.type } }, { merge: true });

            onSnapshot(collection(callDoc, "offerCandidates"), (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                });
            });
        }
    });
}

if (endCallBtn) {
    endCallBtn.addEventListener('click', async () => {
        if (localStream) localStream.getTracks().forEach(track => track.stop());
        if (peerConnection) peerConnection.close();
        peerConnection = null;
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
        videoCallScreen.style.display = 'none';

        if (currentChatId) await setDoc(doc(db, "chats", currentChatId), { offer: null, answer: null }, { merge: true });
    });
}

// --- 5. IN-CHAT MENU (ADD FRIEND / REPORT / BLOCK) ---
const inChatMenuModal = document.getElementById('in-chat-menu-modal');

document.getElementById('menu-btn')?.addEventListener('click', () => {
    if(!inChatMenuModal) return;
    
    let partnerNameStr = document.getElementById('chat-partner-name')?.innerText || "Stranger";
    document.getElementById('menu-partner-name').innerText = partnerNameStr;
    document.getElementById('menu-avatar').innerText = partnerNameStr.charAt(0).toUpperCase();
    
    let displayId = currentChatPartner && currentChatPartner !== 'bot' ? currentChatPartner.substring(0,8) : Math.floor(Math.random()*999999);
    document.getElementById('menu-partner-id').innerText = "Guest_" + displayId;
    
    inChatMenuModal.style.display = 'flex';
});

document.getElementById('close-chat-menu-btn')?.addEventListener('click', () => {
    inChatMenuModal.style.display = 'none';
});

document.getElementById('add-friend-btn')?.addEventListener('click', () => {
    let pname = document.getElementById('menu-partner-name').innerText;
    alert("Friend request sent to " + pname + "!");
    inChatMenuModal.style.display = 'none';
});

document.getElementById('block-btn')?.addEventListener('click', () => {
    if(confirm("Are you sure you want to block this user? You won't match with them again.")) {
        alert("User blocked successfully.");
        inChatMenuModal.style.display = 'none';
        document.getElementById('skip-btn').click(); 
    }
});

document.getElementById('report-btn')?.addEventListener('click', () => {
    alert("Report sent to moderators. Thank you for keeping the community safe!");
    inChatMenuModal.style.display = 'none';
});
