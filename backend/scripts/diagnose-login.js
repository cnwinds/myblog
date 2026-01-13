// 诊断生产环境登录问题的脚本
require('dotenv').config();
const { initDatabase } = require('../dist/utils/db');
const { UserModel } = require('../dist/models/User');
const { comparePassword, hashPassword } = require('../dist/utils/password');
const db = require('../dist/utils/db').default;
const path = require('path');
const fs = require('fs');

async function diagnose() {
  console.log('=== 生产环境登录问题诊断 ===\n');

  try {
    // 1. 检查环境变量
    console.log('1. 环境变量检查:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
    console.log(`   DB_PATH: ${process.env.DB_PATH || './blog.db'}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '已设置' : '未设置'}`);
    console.log('');

    // 2. 检查数据库文件
    const dbPath = process.env.DB_PATH || './blog.db';
    console.log('2. 数据库文件检查:');
    console.log(`   路径: ${dbPath}`);
    
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`   ✅ 文件存在`);
      console.log(`   大小: ${stats.size} 字节`);
      console.log(`   权限: ${stats.mode.toString(8)}`);
    } else {
      console.log(`   ❌ 文件不存在！`);
      console.log(`   这可能是问题所在 - 数据库文件不存在`);
    }
    console.log('');

    // 3. 初始化数据库并检查表结构
    console.log('3. 数据库表结构检查:');
    initDatabase();
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    console.log(`   表数量: ${tables.length}`);
    tables.forEach(t => console.log(`   - ${t.name}`));
    console.log('');

    // 4. 检查用户数据
    console.log('4. 用户数据检查:');
    const allUsers = db.prepare('SELECT id, username, length(password) as pwd_len, substr(password, 1, 10) as pwd_prefix, createdAt FROM users').all();
    
    if (allUsers.length === 0) {
      console.log('   ❌ 数据库中没有用户！');
      console.log('   这是问题所在 - 需要创建用户');
    } else {
      console.log(`   ✅ 找到 ${allUsers.length} 个用户:`);
      allUsers.forEach(u => {
        console.log(`   - ID: ${u.id}, 用户名: ${u.username}`);
        console.log(`     密码哈希长度: ${u.pwd_len}`);
        console.log(`     密码哈希前缀: ${u.pwd_prefix}...`);
        console.log(`     创建时间: ${u.createdAt}`);
        const isBcrypt = u.pwd_prefix && u.pwd_prefix.startsWith('$2');
        console.log(`     bcrypt格式: ${isBcrypt ? '✅ 是' : '❌ 否（可能有问题）'}`);
      });
    }
    console.log('');

    // 5. 测试 bcrypt 功能
    console.log('5. bcrypt 功能测试:');
    try {
      const testPassword = 'test123';
      const testHash = await hashPassword(testPassword);
      console.log(`   ✅ 密码哈希生成成功`);
      console.log(`   测试哈希: ${testHash.substring(0, 20)}...`);
      
      const testCompare = await comparePassword(testPassword, testHash);
      console.log(`   ✅ 密码验证功能: ${testCompare ? '正常' : '异常'}`);
      
      const wrongCompare = await comparePassword('wrong', testHash);
      console.log(`   ✅ 错误密码验证: ${wrongCompare ? '异常（应该返回false）' : '正常'}`);
    } catch (error) {
      console.log(`   ❌ bcrypt 功能异常: ${error.message}`);
      console.log(`   这可能是问题所在 - bcrypt 编译或运行有问题`);
    }
    console.log('');

    // 6. 测试特定用户登录
    const testUsername = process.argv[2];
    const testPassword = process.argv[3];
    
    if (testUsername && testPassword) {
      console.log(`6. 测试用户登录 (${testUsername}):`);
      const user = UserModel.findByUsername(testUsername);
      
      if (!user) {
        console.log(`   ❌ 用户不存在`);
      } else {
        console.log(`   ✅ 找到用户`);
        try {
          const isValid = await comparePassword(testPassword, user.password);
          console.log(`   密码验证结果: ${isValid ? '✅ 正确' : '❌ 错误'}`);
          
          if (!isValid) {
            console.log(`   \n   可能的原因:`);
            console.log(`   1. 密码确实不正确`);
            console.log(`   2. 密码哈希格式不对（不是bcrypt格式）`);
            console.log(`   3. bcrypt 版本或编译问题`);
          }
        } catch (error) {
          console.log(`   ❌ 密码验证出错: ${error.message}`);
        }
      }
      console.log('');
    }

    // 7. 建议
    console.log('=== 诊断建议 ===');
    if (allUsers.length === 0) {
      console.log('1. 数据库中没有用户，需要创建用户');
      console.log('   运行: node scripts/create-user.js <用户名> <密码>');
    } else if (allUsers.some(u => !u.pwd_prefix || !u.pwd_prefix.startsWith('$2'))) {
      console.log('1. 发现密码哈希格式不对的用户，需要重置密码');
      console.log('   运行: node scripts/reset-password.js <用户名> <新密码>');
    } else {
      console.log('1. 数据库和用户数据看起来正常');
      console.log('2. 如果仍然无法登录，可能是密码不正确');
      console.log('3. 可以尝试重置密码: node scripts/reset-password.js <用户名> <新密码>');
    }

  } catch (error) {
    console.error('诊断过程出错:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

diagnose();
