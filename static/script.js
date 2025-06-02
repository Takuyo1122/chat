document.addEventListener('DOMContentLoaded', () => {
    // DOM要素
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const userModal = document.getElementById('user-modal');
    const usernameInput = document.getElementById('username-input');
    const avatarColorSelect = document.getElementById('avatar-color');
    const saveProfileButton = document.getElementById('save-profile');
    const usernameDisplay = document.getElementById('username-display');
    const userAvatar = document.getElementById('user-avatar');
    const userList = document.getElementById('user-list');
    const onlineCount = document.getElementById('online-count');
    const typingIndicator = document.getElementById('typing-indicator');
    
    // ユーザー情報
    let user = {
        id: generateId(),
        name: 'ゲスト',
        color: '#4a76a8',
        isTyping: false
    };
    
    // WebSocket接続
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    // 初期化
    init();
    
    function init() {
        // ローカルストレージからユーザー情報を読み込む
        const savedUser = localStorage.getItem('chatUser');
        if (savedUser) {
            user = JSON.parse(savedUser);
            updateUserDisplay();
        } else {
            // 新規ユーザーの場合、プロフィール設定モーダルを表示
            userModal.classList.add('active');
        }
        
        // イベントリスナー設定
        setupEventListeners();
    }
    
    function setupEventListeners() {
        // メッセージ送信
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // タイピング検出
        messageInput.addEventListener('input', () => {
            if (!user.isTyping && messageInput.value.trim() !== '') {
                user.isTyping = true;
                sendTypingStatus(true);
            } else if (user.isTyping && messageInput.value.trim() === '') {
                user.isTyping = false;
                sendTypingStatus(false);
            }
        });
        
        // プロフィール保存
        saveProfileButton.addEventListener('click', saveProfile);
    }
    
    // WebSocketイベントハンドラ
    socket.addEventListener('open', () => {
        console.log('WebSocket connected');
        sendUserInfo();
    });
    
    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'userList':
                updateUserList(data.users);
                break;
            case 'message':
                displayMessage(data.message, data.sender, data.timestamp, false);
                break;
            case 'system':
                displaySystemMessage(data.message);
                break;
            case 'typing':
                updateTypingIndicator(data.userId, data.isTyping);
                break;
        }
    });
    
    socket.addEventListener('close', () => {
        displaySystemMessage('接続が切断されました');
    });
    
    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        displaySystemMessage('接続エラーが発生しました');
    });
    
    // メッセージ送信
    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;
        
        const message = {
            type: 'message',
            text: messageText,
            sender: user.name,
            userId: user.id,
            color: user.color,
            timestamp: new Date().toISOString()
        };
        
        socket.send(JSON.stringify(message));
        displayMessage(messageText, user.name, message.timestamp, true);
        messageInput.value = '';
        
        if (user.isTyping) {
            user.isTyping = false;
            sendTypingStatus(false);
        }
    }
    
    // メッセージ表示
    function displayMessage(text, sender, timestamp, isOwn) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isOwn ? 'sent' : 'received');
        
        if (!isOwn) {
            messageElement.style.borderLeftColor = user.color;
        }
        
        const messageText = document.createElement('div');
        messageText.textContent = text;
        
        const messageInfo = document.createElement('div');
        messageInfo.classList.add('message-info');
        
        const senderSpan = document.createElement('span');
        senderSpan.textContent = sender;
        
        const timeSpan = document.createElement('span');
        timeSpan.textContent = formatTime(timestamp);
        
        messageInfo.appendChild(senderSpan);
        messageInfo.appendChild(timeSpan);
        
        messageElement.appendChild(messageText);
        messageElement.appendChild(messageInfo);
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // システムメッセージ表示
    function displaySystemMessage(text) {
        const systemMessage = document.createElement('div');
        systemMessage.classList.add('system-message');
        systemMessage.textContent = text;
        messagesContainer.appendChild(systemMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // ユーザーリスト更新
    function updateUserList(users) {
        userList.innerHTML = '';
        onlineCount.textContent = users.length;
        
        users.forEach(u => {
            if (u.id === user.id) return;
            
            const userElement = document.createElement('div');
            userElement.classList.add('user-item');
            
            const avatar = document.createElement('div');
            avatar.classList.add('avatar');
            avatar.textContent = u.name.charAt(0).toUpperCase();
            avatar.style.backgroundColor = u.color;
            
            const username = document.createElement('span');
            username.classList.add('username');
            username.textContent = u.name;
            
            userElement.appendChild(avatar);
            userElement.appendChild(username);
            userList.appendChild(userElement);
        });
    }
    
    // タイピングインジケーター更新
    function updateTypingIndicator(userId, isTyping) {
        // 実際のアプリでは、どのユーザーがタイピング中かを追跡する必要があります
        typingIndicator.textContent = isTyping ? '誰かが入力中...' : '';
    }
    
    // ユーザー情報送信
    function sendUserInfo() {
        socket.send(JSON.stringify({
            type: 'userInfo',
            user: user
        }));
    }
    
    // タイピングステータス送信
    function sendTypingStatus(isTyping) {
        socket.send(JSON.stringify({
            type: 'typing',
            userId: user.id,
            isTyping: isTyping
        }));
    }
    
    // プロフィール保存
    function saveProfile() {
        const newName = usernameInput.value.trim() || 'ゲスト';
        const newColor = avatarColorSelect.value;
        
        user.name = newName;
        user.color = newColor;
        
        localStorage.setItem('chatUser', JSON.stringify(user));
        updateUserDisplay();
        userModal.classList.remove('active');
        
        // 更新されたユーザー情報をサーバーに送信
        sendUserInfo();
    }
    
    // ユーザー表示更新
    function updateUserDisplay() {
        usernameDisplay.textContent = user.name;
        userAvatar.textContent = user.name.charAt(0).toUpperCase();
        userAvatar.style.backgroundColor = user.color;
    }
    
    // ユーティリティ関数
    function generateId() {
        return 'user-' + Math.random().toString(36).substr(2, 9);
    }
    
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
});