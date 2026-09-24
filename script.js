import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

const authPage = document.getElementById('auth-page');
const mainApp = document.getElementById('main-app');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const genderInput = document.getElementById('gender-input');
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

let currentUser = null;
let currentUserData = null; 
let currentChatUser = null;
let currentChatId = null;
let unsubscribeMessages = null;

// 1. Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authPage.style.display = 'none';
        mainApp.style.display = 'block';

        const userDoc = await getDoc(doc(db, "users", user.email.toLowerCase()));
        if(userDoc.exists()) {
            currentUserData = userDoc.data();
        }
        loadUsersList();
    } else {
        currentUser = null;
        currentUserData = null;
        authPage.style.display = 'flex';
        mainApp.style.display = 'none';
    }
});

// 2. Login
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

// 3. Register with Gender
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
            gender: gender
        });
        
        currentUserData = { email: email.toLowerCase(), name: email.split('@')[0], gender: gender };
        alert("Account created successfully!");
        loadUsersList();
    } catch (error) {
        alert("Registration Failed: " + error.message);
    }
    registerBtn.innerHTML = "Create New Account";
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
    chatBox.innerHTML = "";
    inputArea.style.display = 'none';
    chatHeader.innerHTML = "<h2>Select a user from the list to start private chat</h2>";
});

// 4. Load Users List with AI BOT
function loadUsersList() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        usersListDiv.innerHTML = "";
        
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
                <img src="${botAvatar}" style="margin-right: 12px; width: 35px; height: 35px; border-radius: 50%;"> 
                <strong style="color:#0084ff;">${botName}</strong>
                <span style="margin-left: 10px; font-size: 9px; background: #25D366; color: white; padding: 2px 5px; border-radius: 10px;">BOT</span>
            </div>
        `;
        
        botDiv.addEventListener('click', () => {
            selectUser(botEmail, botName);
        });
        usersListDiv.appendChild(botDiv);

        snapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            
            if(userData.email !== currentUser.email) {
                const userDiv = document.createElement('div');
                userDiv.style.padding = "10px";
                userDiv.style.borderBottom = "1px solid #ddd";
                userDiv.style.cursor = "pointer";
                userDiv.style.display = "flex";
                userDiv.style.alignItems = "center";
                userDiv.style.justifyContent = "space-between";

                const avatarUrl = `https://ui-avatars.com/api/?name=${userData.name}&background=random&color=fff&rounded=true&size=35`;
                
                let genderIcon = "";
                if(userData.gender === "Male") genderIcon = "👦";
                else if(userData.gender === "Female") genderIcon = "👧";

                const leftDiv = document.createElement('div');
                leftDiv.style.display = "flex";
                leftDiv.style.alignItems = "center";
                leftDiv.innerHTML = `<img src="${avatarUrl}" style="margin-right: 12px; width: 35px; height: 35px; border-radius: 50%;"> <strong style="color:#333;">${userData.name}${genderIcon}</strong>`;
                
                const badgeElement = document.createElement('span');
                badgeElement.innerText = "New";
                badgeElement.style.background = "red";
                badgeElement.style.color = "white";
                badgeElement.style.borderRadius = "10px";
                badgeElement.style.padding = "3px 8px";
                badgeElement.style.fontSize = "11px";
                badgeElement.style.fontWeight = "bold";
                badgeElement.style.display = "none"; 

                userDiv.appendChild(leftDiv);
                userDiv.appendChild(badgeElement);

                const email1 = currentUser.email.toLowerCase();
                const email2 = userData.email.toLowerCase();
                const emails = [email1, email2].sort();
                const chatId = `${emails[0]}_${emails[1]}`;
                
                const qChat = query(collection(db, "private_chats", chatId, "messages"), orderBy("timestamp", "asc"));
                
                onSnapshot(qChat, (chatSnap) => {
                    if(!chatSnap.empty) {
                        const docs = chatSnap.docs;
                        const lastMsg = docs[docs.length - 1].data();
                        
                        if(lastMsg.sender === userData.email.toLowerCase() && currentChatUser !== userData.email.toLowerCase()) {
                            badgeElement.style.display = 'block';
                        } else {
                            badgeElement.style.display = 'none';
                        }
                    }
                });

                userDiv.addEventListener('click', () => {
                    badgeElement.style.display = 'none';
                    selectUser(userData.email, userData.name);
                });

                usersListDiv.appendChild(userDiv);
            }
        });
    });
}

// 5. Select User
function selectUser(userEmail, userName) {
    currentChatUser = userEmail.toLowerCase();
    
    const email1 = currentUser.email.toLowerCase();
    const email2 = userEmail.toLowerCase();
    const emails = [email1, email2].sort();
    
    currentChatId = `${emails[0]}_${emails[1]}`;

    chatHeader.innerHTML = `<h2 style="margin:0;"><i class="fa-solid fa-user"></i> Chatting with ${userName}</h2>`;
    inputArea.style.display = 'flex';

    loadPrivateMessages();
}

// 6. Load Private Messages
function loadPrivateMessages() {
    if(unsubscribeMessages) unsubscribeMessages(); 

    const q = query(collection(db, "private_chats", currentChatId, "messages"), orderBy("timestamp", "asc"));
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        chatBox.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
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

// 7. Send Text (COHERE AI CHATBOT LOGIC)
sendBtn.addEventListener('click', async () => {
    let message = messageInput.value;
    if(message.trim() !== "" && currentChatId) {
        
        await addDoc(collection(db, "private_chats", currentChatId, "messages"), {
            sender: currentUser.email.toLowerCase(),
            text: message,
            timestamp: serverTimestamp()
        });
        messageInput.value = "";

        if(currentChatUser === "bot@batchit.com") {
            
            const p1 = "fG9m8ksuIRFb";
            const p2 = "YrQLmR1TJwEt";
            const p3 = "mbBhgmnReAOSt3It";
            const COHERE_API_KEY = p1 + p2 + p3;
            
            let botName = currentUserData?.gender === "Female" ? "Rahul" : "Priya";
            let promptText = `You are a friendly chatting partner named ${botName}. The user says: "${message}". You MUST reply naturally and intelligently in the EXACT SAME LANGUAGE the user typed. Do not use default language.`;

            try {
                setTimeout(async () => {
                    const response = await fetch("https://api.cohere.ai/v2/chat", {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${COHERE_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: "command-a-plus-05-2026", 
                            messages: [
                                {
                                    role: "user",
                                    content: promptText
                                }
                            ]
                        })
                    });
                    
                    const data = await response.json();
                    let aiReply = "";
                    
                    // નવું બુલેટપ્રૂફ સેટિંગ
                    if (data?.message?.content && data.message.content.length > 0) {
                         aiReply = data.message.content[0].text;
                    } else if (data?.text) {
                         aiReply = data.text;
                    } else if (typeof data?.message === "string") {
                         aiReply = `API Error: ${data.message}`;
                    } else {
                         aiReply = `System Log: ${JSON.stringify(data)}`;
                    }
                    
                    // Firebase ને 'undefined' જતું રોકવા ફાઇનલ સેફ્ટી
                    if (!aiReply) {
                        aiReply = "Error: Bot response was empty or formatting changed.";
                    }

                    await addDoc(collection(db, "private_chats", currentChatId, "messages"), {
                        sender: "bot@batchit.com",
                        text: String(aiReply),
                        timestamp: serverTimestamp()
                    });
                }, 1000);
            } catch(error) {
                await addDoc(collection(db, "private_chats", currentChatId, "messages"), {
                    sender: "bot@batchit.com",
                    text: `Network Error: ${error.message}`,
                    timestamp: serverTimestamp()
                });
            }
        }
    }
});

// 8. Send Image
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
                sender: currentUser.email.toLowerCase(),
                text: "",
                imageUrl: result.data.url,
                timestamp: serverTimestamp()
            });
            
            if(currentChatUser === "bot@batchit.com") {
                setTimeout(async () => {
                    await addDoc(collection(db, "private_chats", currentChatId, "messages"), {
                        sender: "bot@batchit.com",
                        text: "Wow! Nice picture! 😍",
                        timestamp: serverTimestamp()
                    });
                }, 1500);
            }
            
        } else {
            alert("Image upload failed! Please try again.");
        }
    } catch(err) {
        alert("Network error! Please check your internet connection.");
    }

    imgBtn.innerHTML = '📎';
    imageInput.value = "";
});
