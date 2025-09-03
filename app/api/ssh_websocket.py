"""
SSH WebSocket Handler
Handles WebSocket connections for SSH shell interactions
"""

import json

# Reference to ssh_connections (imported from ssh_api)
from app.api.ssh_api import ssh_connections


def handle_ssh_shell_websocket(ws, conn_id):
    """Handle SSH shell WebSocket connections"""
    if conn_id not in ssh_connections:
        try:
            ws.send(json.dumps({"error": "SSH连接不存在"}))
        except:
            pass
        finally:
            ws.close()
        return
    
    ssh_conn = ssh_connections[conn_id]
    
    # Open shell with WebSocket
    success, message = ssh_conn.open_shell(ws)
    
    if not success:
        try:
            ws.send(json.dumps({"error": f"打开Shell失败: {message}"}))
        except:
            pass
        finally:
            ws.close()
        return
    
    try:
        # 发送连接成功的消息
        ws.send(json.dumps({"output": "SSH连接已建立\n"}))
        
        while True:
            data = ws.receive()
            if data:
                try:
                    message = json.loads(data)
                    if 'command' in message:
                        ssh_conn.send_command(message['command'])
                except json.JSONDecodeError:
                    # 如果不是JSON，当作命令直接发送
                    ssh_conn.send_command(data)
    except Exception as e:
        print(f"WebSocket连接错误: {str(e)}")
        try:
            ws.send(json.dumps({"error": f"连接错误: {str(e)}"}))
        except:
            pass
    finally:
        ws.close()


def init_ssh_websocket_routes(sock):
    """Initialize SSH WebSocket routes"""
    @sock.route('/ws/ssh_shell/<conn_id>')
    def ssh_shell_websocket(ws, conn_id):
        handle_ssh_shell_websocket(ws, conn_id)