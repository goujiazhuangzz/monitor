from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template
from app.utils.auth import AuthManager
import os

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if not username or not password:
            return render_template('login.html', error='用户名和密码不能为空')

        # Authenticate user
        if request.app.auth_manager.authenticate(username, password):
            session['username'] = username
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='用户名或密码错误')

    return render_template('login.html')


@auth_bp.route('/api/auth/login', methods=['POST'])
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
    if request.app.auth_manager.authenticate(username, password):
        session['username'] = username
        return jsonify({'success': True, 'message': '登录成功'})
    else:
        return jsonify({'success': False, 'error': '用户名或密码错误'}), 401


@auth_bp.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('auth.login'))


@auth_bp.route('/api/auth/status')
def auth_status():
    return jsonify({
        'authenticated': 'username' in session,
        'username': session.get('username') if 'username' in session else None
    })


@auth_bp.route('/api/auth/change_password', methods=['POST'])
def change_password():
    if 'username' not in session:
        return jsonify({'error': '未登录'}), 401

    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not current_password or not new_password:
        return jsonify({'error': '当前密码和新密码不能为空'}), 400

    username = session['username']

    # Verify current password
    if not request.app.auth_manager.authenticate(username, current_password):
        return jsonify({'error': '当前密码错误'}), 400

    # Update password
    request.app.auth_manager.update_password(username, new_password)
    return jsonify({'success': True, 'message': '密码修改成功'})


# Add app reference to request context
@auth_bp.before_app_request
def before_request():
    from flask import request
    request.app = request.blueprint.app if hasattr(request.blueprint, 'app') else None