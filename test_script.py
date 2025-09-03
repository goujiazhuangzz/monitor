#!/usr/bin/env python3
"""
测试脚本，用于验证监控工具是否能检测到手动运行的脚本
以及是否能正确捕获日志输出
"""

import time
import sys
import os
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def main():
    print(f"测试脚本已启动，PID: {os.getpid()}")
    print("此脚本将运行60秒，每秒打印一条消息")
    logging.info(f"测试脚本已启动，PID: {os.getpid()}")
    logging.info("此脚本将运行60秒，每秒打印一条消息")
    
    for i in range(60):
        message = f"测试消息 #{i+1} - 时间: {time.time()}"
        print(message)
        logging.info(message)
        
        # 随机添加一些错误信息
        if i % 10 == 0:
            logging.warning(f"这是第 {i//10 + 1} 个警告消息")
            
        if i % 15 == 0 and i > 0:
            print(f"错误: 模拟错误消息 #{i//15}", file=sys.stderr)
        
        time.sleep(1)
    
    print("测试脚本结束")
    logging.info("测试脚本结束")

if __name__ == "__main__":
    main()