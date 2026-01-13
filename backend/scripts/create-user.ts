import dotenv from 'dotenv';
import { initDatabase } from '../src/utils/db';
import { UserModel } from '../src/models/User';

dotenv.config();

async function createUser() {
  // 初始化数据库
  initDatabase();

  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';

  try {
    // 检查用户是否已存在
    const existingUser = UserModel.findByUsername(username);
    if (existingUser) {
      console.log(`用户 "${username}" 已存在！`);
      return;
    }

    // 创建用户
    const user = await UserModel.create({ username, password });
    console.log(`✅ 用户创建成功！`);
    console.log(`用户名: ${user.username}`);
    console.log(`用户ID: ${user.id}`);
    console.log(`\n登录信息：`);
    console.log(`用户名: ${username}`);
    console.log(`密码: ${password}`);
  } catch (error) {
    console.error('创建用户失败:', error);
  }
}

createUser();
