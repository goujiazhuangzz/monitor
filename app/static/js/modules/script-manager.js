// 脚本管理模块
class ScriptManagerModule {
    constructor() {
        this.allScripts = [];
        this.currentPage = 1;
        this.scriptsPerPage = 10;
    }

    // 获取所有脚本
    getAllScripts() {
        fetch('/api/scripts')
            .then(response => {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                return response.json();
            })
            .then(scripts => {
                this.allScripts = scripts;
                this.displayScriptsPage(1);
                this.setupScriptsPagination();
            })
            .catch(error => {
                console.error('Error fetching scripts:', error);
            });
    }

    // 显示脚本分页
    displayScriptsPage(page) {
        this.currentPage = page;
        const startIndex = (page - 1) * this.scriptsPerPage;
        const endIndex = startIndex + this.scriptsPerPage;
        const scriptsToShow = this.allScripts.slice(startIndex, endIndex);

        const tableBody = document.querySelector('#scriptsTable tbody');
        tableBody.innerHTML = '';

        if (scriptsToShow.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4">没有找到Python脚本</td>';
            tableBody.appendChild(row);
            return;
        }

        scriptsToShow.forEach(script => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${script.name}</td>
                <td>${script.relative_path}</td>
                <td>${script.path}</td>
                <td>
                    <button class="btn btn-start" onclick="scriptManagerModule.startScript('${script.path}')">启动</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // 更新分页信息
        const totalScripts = this.allScripts.length;
        const startScript = startIndex + 1;
        const endScript = Math.min(endIndex, totalScripts);
        document.getElementById('scriptsPaginationInfo').textContent = 
            `显示 ${startScript}-${endScript} 共 ${totalScripts} 个脚本`;
    }

    // 设置脚本分页控件
    setupScriptsPagination() {
        const totalPages = Math.ceil(this.allScripts.length / this.scriptsPerPage);
        const pagination = document.getElementById('scriptsPagination');
        pagination.innerHTML = '';

        // 上一页按钮
        if (this.currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.className = 'btn btn-pagination';
            prevButton.textContent = '上一页';
            prevButton.onclick = () => {
                this.currentPage--;
                this.displayScriptsPage(this.currentPage);
                this.setupScriptsPagination();
            };
            pagination.appendChild(prevButton);
        }

        // 页码按钮
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = 'btn btn-pagination' + (i === this.currentPage ? ' active' : '');
            pageButton.textContent = i;
            pageButton.onclick = () => {
                this.currentPage = i;
                this.displayScriptsPage(this.currentPage);
                this.setupScriptsPagination();
            };
            pagination.appendChild(pageButton);
        }

        // 下一页按钮
        if (this.currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.className = 'btn btn-pagination';
            nextButton.textContent = '下一页';
            nextButton.onclick = () => {
                this.currentPage++;
                this.displayScriptsPage(this.currentPage);
                this.setupScriptsPagination();
            };
            pagination.appendChild(nextButton);
        }
    }

    // 启动脚本
    startScript(scriptPath) {
        fetch('/api/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({script_path: scriptPath})
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
                processManagerModule.getRunningProcesses();
            } else {
                showNotification('错误: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error starting script:', error);
            showNotification('启动脚本时出错', 'error');
        });
    }

    // 初始化脚本管理模块
    init() {
        // 获取初始脚本列表
        this.getAllScripts();

        // 绑定事件监听器
        document.getElementById('refreshScripts').addEventListener('click', () => this.getAllScripts());
    }
}

// 创建脚本管理模块实例
const scriptManagerModule = new ScriptManagerModule();