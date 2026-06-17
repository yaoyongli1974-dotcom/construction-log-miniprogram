// services/userService.js - 用户相关业务逻辑
const CloudUtil = require('../../utils/cloud');

class UserService {
  // 获取用户信息
  static async getUserInfo(openid) {
    try {
      const db = CloudUtil.database();
      const result = await db.collection('users').doc(openid).get();
      return { success: true, data: result.data };
    } catch (err) {
      console.error('获取用户信息失败', err);
      throw err;
    }
  }

  // 更新用户信息
  static async updateUserInfo(openid, updateData) {
    try {
      const db = CloudUtil.database();
      const result = await db.collection('users').doc(openid).update({
        data: {
          ...updateData,
          updateTime: new Date()
        }
      });
      return { success: true, data: result };
    } catch (err) {
      console.error('更新用户信息失败', err);
      throw err;
    }
  }

  // 获取邀请码
  static async getInviteCode(openid) {
    try {
      const db = CloudUtil.database();
      const result = await db.collection('users').doc(openid).get();
      return result.data.inviteCode || '';
    } catch (err) {
      console.error('获取邀请码失败', err);
      return '';
    }
  }

  // 验证邀请码
  static async validateInviteCode(inviteCode) {
    try {
      const db = CloudUtil.database();
      const result = await db.collection('users')
        .where({ inviteCode: inviteCode })
        .get();
      
      if (result.data.length > 0) {
        return { success: true, inviterId: result.data[0]._id };
      } else {
        return { success: false, message: '邀请码无效' };
      }
    } catch (err) {
      console.error('验证邀请码失败', err);
      return { success: false, message: '验证失败' };
    }
  }

  // 记录邀请奖励
  static async recordInviteReward(inviterId, inviteeId) {
    try {
      const db = CloudUtil.database();
      
      // 记录奖励
      await db.collection('rewards').add({
        data: {
          userId: inviterId,
          type: 'invite_success',
          inviteeId: inviteeId,
          reward: 'premium_template',
          createTime: new Date()
        }
      });

      return { success: true };
    } catch (err) {
      console.error('记录邀请奖励失败', err);
      return { success: false };
    }
  }
}

module.exports = UserService;
