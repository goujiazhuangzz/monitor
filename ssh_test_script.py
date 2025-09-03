#!/usr/bin/env python3
"""
SSH测试脚本，用于测试远程执行Python脚本功能
"""

import time
import sys
import os

def main():
    print(f"SSH测试脚本已启动，PID: {os.getpid()}")
    print("此脚本将运行30秒，每2秒打印一条消息")
    
    for i in range(15):
        print(f"SSH测试消息 #{i+1} - 时间: {time.time()}")
        time.sleep(2)
    
    print("SSH测试脚本结束")

if __name__ == "__main__":
    main()