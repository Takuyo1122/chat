import asyncio
import websockets
import json
from datetime import datetime
from flask import Flask, render_template
from collections import defaultdict

app = Flask(__name__)

# 接続中のクライアントを管理
connected_clients = {}
user_list = defaultdict(dict)
typing_users = set()

@app.route('/')
def index():
    return render_template('index.html')

async def handle_websocket(websocket, path):
    # 新しい接続を処理
    try:
        async for message in websocket:
            data = json.loads(message)
            
            if data['type'] == 'userInfo':
                # ユーザー情報を登録
                user = data['user']
                connected_clients[user['id']] = websocket
                user_list[user['id']] = {
                    'name': user['name'],
                    'color': user['color']
                }
                await broadcast_user_list()
                
            elif data['type'] == 'message':
                # メッセージをブロードキャスト
                message_data = {
                    'type': 'message',
                    'message': data['text'],
                    'sender': data['sender'],
                    'timestamp': datetime.now().isoformat()
                }
                await broadcast(json.dumps(message_data))
                
            elif data['type'] == 'typing':
                # タイピングステータスを更新
                if data['isTyping']:
                    typing_users.add(data['userId'])
                else:
                    typing_users.discard(data['userId'])
                
                # タイピングインジケーターを更新
                typing_data = {
                    'type': 'typing',
                    'userId': data['userId'],
                    'isTyping': data['isTyping']
                }
                await broadcast(json.dumps(typing_data))
                
    finally:
        # 接続が閉じたら削除
        for user_id, ws in list(connected_clients.items()):
            if ws == websocket:
                connected_clients.pop(user_id, None)
                user_list.pop(user_id, None)
                typing_users.discard(user_id)
                await broadcast_user_list()
                break

async def broadcast(message):
    # すべてのクライアントにメッセージを送信
    for ws in connected_clients.values():
        try:
            await ws.send(message)
        except:
            continue

async def broadcast_user_list():
    # ユーザーリストを更新
    users = [{'id': k, 'name': v['name'], 'color': v['color']} 
             for k, v in user_list.items()]
    message = {
        'type': 'userList',
        'users': users
    }
    await broadcast(json.dumps(message))

def start_websocket_server():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    start_server = websockets.serve(handle_websocket, "0.0.0.0", 6789)
    loop.run_until_complete(start_server)
    loop.run_forever()

if __name__ == '__main__':
    import threading
    # WebSocketサーバーを別スレッドで起動
    threading.Thread(target=start_websocket_server, daemon=True).start()
    # Flaskアプリを起動
    app.run(port=5000, debug=True)