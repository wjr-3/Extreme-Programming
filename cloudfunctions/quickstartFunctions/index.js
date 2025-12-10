// cloudfunctions/contact/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { action, id, payload } = event;

  try {
    switch (action) {
      // 获取联系人列表 index.js
      case 'list':
        const listRes = await db.collection('contacts').get();
        return { success: true, data: listRes.data };

      case 'delete':
        if (!id) return { success: false, error: '缺少 id' };
        const delRes = await db.collection('contacts').doc(id).remove();
        return { success: true, deleted: delRes.stats.removed };

      // 获取单个联系人 add.js
      case 'get':
        if (!id) {
          return { success: false, error: '缺少 id 参数' };
        }
        const getRes = await db.collection('contacts').doc(id).get();
        return {
          success: true,
          data: getRes.data ? [getRes.data] : []
        };

      
      case 'create':
        if (!payload || typeof payload !== 'object') {
          return { success: false, error: '无效的联系人数据' };
        }
        const createRes = await db.collection('contacts').add({
          data: payload
        });
        return {
          success: true,
          _id: createRes.id
        };

      //2025.11.4 v1.4
      case 'update':
        if (!id) {
          return { success: false, error: '缺少 id 参数' };
        }
        if (!payload || typeof payload !== 'object') {
          return { success: false, error: '无效的更新数据' };
        }
        await db.collection('contacts').doc(id).update({
          data: payload
        });
        return {
          success: true
        };
      //
      default:
        return { success: false, error: '不支持的操作: ' + action };
    }
  } catch (err) {
    console.error('云函数执行出错:', err);
    return {
      success: false,
      error: err.message
    };
  }
};