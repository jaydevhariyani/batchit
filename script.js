document.getElementById('send-btn').addEventListener('click', function() {
    let input = document.getElementById('message-input');
    let message = input.value;
    
    if(message.trim() !== "") {
        let chatBox = document.getElementById('chat-box');
        let msgDiv = document.createElement('div');
        msgDiv.style.background = "#e1f5fe";
        msgDiv.style.padding = "10px";
        msgDiv.style.margin = "10px 0";
        msgDiv.style.borderRadius = "10px";
        msgDiv.style.width = "fit-content";
        msgDiv.innerText = message;
        
        chatBox.appendChild(msgDiv);
        input.value = ""; // મેસેજ મોકલ્યા પછી બોક્સ ખાલી કરવા
    }
});
