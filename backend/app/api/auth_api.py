from flask import Blueprint, request, jsonify, session, current_app
from app.utils.auth import AuthManager
import os

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def api_login():
    """
    API endpoint for login
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'success': False, 'error': '用户名和密码不能为空'}), 400

    # Authenticate user
    if current_app.auth_manager.authenticate(username, password):
        session['username'] = username
        return jsonify({'success': True, 'message': '登录成功'})
    else:
        return jsonify({'success': False, 'error': '用户名或密码错误'}), 401

@auth_bp.route('/logout')
def logout():
    session.pop('username', None)
    return jsonify({'success': True, 'message': '已登出'})

@auth_bp.route('/change_password', methods=['POST'])
def change_password():
    """修改密码"""
    try:
        # 检查用户是否已登录
        if 'username' not in session:
            return jsonify({'success': False, 'error': '未登录'}), 401

        data = request.get_json()
        old_password = data.get('old_password')
        new_password = data.get('new_password')

        if not old_password or not new_password:
            return jsonify({'success': False, 'error': '原密码和新密码不能为空'}), 400

        username = session['username']
        
        # 验证原密码
        if not current_app.auth_manager.authenticate(username, old_password):
            return jsonify({'success': False, 'error': '原密码错误'}), 400

        # 修改密码
        success = current_app.auth_manager.change_password(username, new_password)
        if success:
            return jsonify({'success': True, 'message': '密码修改成功'})
        else:
            return jsonify({'success': False, 'error': '密码修改失败'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/users', methods=['GET'])
def get_users():
    """获取用户列表"""
    try:
        # 检查用户是否已登录
        if 'username' not in session:
            return jsonify({'success': False, 'error': '未登录'}), 401

        users = current_app.auth_manager.get_users()
        return jsonify({'success': True, 'users': users})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/add_user', methods=['POST'])
def add_user():
    """添加用户"""
    try:
        # 检查用户是否已登录
        if 'username' not in session:
            return jsonify({'success': False, 'error': '未登录'}), 401

        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'success': False, 'error': '用户名和密码不能为空'}), 400

        # 添加用户
        success = current_app.auth_manager.add_user(username, password)
        if success:
            return jsonify({'success': True, 'message': '用户添加成功'})
        else:
            return jsonify({'success': False, 'error': '用户添加失败，用户可能已存在'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/delete_user/<username>', methods=['DELETE'])
def delete_user(username):
    """删除用户"""
    try:
        # 检查用户是否已登录
        if 'username' not in session:
            return jsonify({'success': False, 'error': '未登录'}), 401

        # 不能删除当前登录的用户
        if session['username'] == username:
            return jsonify({'success': False, 'error': '不能删除当前登录的用户'}), 400

        # 删除用户
        success = current_app.auth_manager.delete_user(username)
        if success:
            return jsonify({'success': True, 'message': '用户删除成功'})
        else:
            return jsonify({'success': False, 'error': '用户删除失败'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/change_user_password', methods=['POST'])
def change_user_password():
    """修改用户密码"""
    try:
        # 检查用户是否已登录
        if 'username' not in session:
            return jsonify({'success': False, 'error': '未登录'}), 401

        data = request.get_json()
        username = data.get('username')
        new_password = data.get('new_password')

        if not username or not new_password:
            return jsonify({'success': False, 'error': '用户名和新密码不能为空'}), 400

        # 修改密码
        success = current_app.auth_manager.change_password(username, new_password)
        if success:
            return jsonify({'success': True, 'message': '密码修改成功'})
        else:
            return jsonify({'success': False, 'error': '密码修改失败'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500