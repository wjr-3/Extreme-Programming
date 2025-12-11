// pages/index/index.js
// 2025.11.2 v1.1 → 升级支持收藏功能

Page({
  data: {
    contacts: [],
    filteredContacts: [],
    groups: ['全部', '家人', '同事', '朋友', '其他'],
    currentGroup: '全部',
    keyword: ''
  },

  onLoad() {
    this.loadContacts();
  },

  async loadContacts() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'contact',
        data: { action: 'list' }
      });

      if (res.result?.success) {
        let contacts = res.result.data || [];

        // 确保每个联系人都有 isFavorite 字段
        contacts = contacts.map(c => ({
          ...c,
          isFavorite: c.isFavorite === true // 严格布尔值，避免 undefined
        }));

        const promises = contacts.map(async (contact) => {
          if (contact.avatar && contact.avatar.startsWith('cloud://')) {
            try {
              const fileRes = await wx.cloud.downloadFile({
                fileID: contact.avatar
              });
              return { ...contact, avatarTempPath: fileRes.tempFilePath };
            } catch (err) {
              console.warn('头像下载失败', contact._id, err);
              return { ...contact, avatarTempPath: '/images/default-avatar.png' };
            }
          } else {
            return { ...contact, avatarTempPath: contact.avatar || '/images/default-avatar.png' };
          }
        });

        const processedContacts = await Promise.all(promises);

        this.setData({
          contacts: processedContacts,
          filteredContacts: processedContacts
        });
        this.filterContacts(); // 重新排序（收藏置顶）
      } else {
        throw new Error(res.result?.error || '加载失败');
      }
    } catch (err) {
      console.error('[加载失败]', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  onShow() {
    this.loadContacts();
  },

  // ✨ 新增：切换收藏状态
  async toggleFavorite(e) {
    const id = e.currentTarget.dataset.id;
    const contact = this.data.contacts.find(c => c._id === id);
    if (!contact) return;

    const newFavorite = !contact.isFavorite;

    wx.showLoading({ title: newFavorite ? '收藏中...' : '取消收藏...' });

    try {
      // 调用云函数更新 isFavorite
      const res = await wx.cloud.callFunction({
        name: 'contact',
        data: {
          action: 'update',
          id: id,
          payload: { isFavorite: newFavorite }
        }
      });

      if (res.result?.success) {
        // 更新本地数据
        const updatedContacts = this.data.contacts.map(c =>
          c._id === id ? { ...c, isFavorite: newFavorite } : c
        );
        this.setData({ contacts: updatedContacts });
        this.filterContacts(); // 重新过滤+排序
      } else {
        throw new Error(res.result?.error || '操作失败');
      }
    } catch (err) {
      console.error('[收藏操作失败]', err);
      wx.showToast({ title: '操作失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  onSearch(e) {
    const keyword = e.detail.value.trim();
    this.setData({ keyword });
    this.filterContacts();
  },

  filterByGroup(e) {
    const group = e.currentTarget.dataset.group;
    this.setData({ currentGroup: group });
    this.filterContacts();
  },

  // ✨ 修改：收藏联系人始终置顶
  filterContacts() {
    const { contacts, currentGroup, keyword } = this.data;

    let filtered = contacts;

    // 分组过滤
    if (currentGroup !== '全部') {
      filtered = filtered.filter(c => c.group === currentGroup);
    }

    // 关键词搜索
    if (keyword) {
      filtered = filtered.filter(c =>
        (c.name && c.name.includes(keyword)) ||
        (c.phones && c.phones.some(p => p.value.includes(keyword))) || // 支持多电话搜索
        (c.phone && c.phone.includes(keyword)) // 兼容旧数据
      );
    }

    // ✨ 关键：将 isFavorite 的联系人排到最前面
    filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0; // 保持原有顺序
    });

    this.setData({ filteredContacts: filtered });
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/add/add' });
  },

  goToExport() {
    wx.navigateTo({ url: '/pages/export/export' });
  },

  editContact(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/add/add?id=${id}` });
  },

  deleteContact(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该联系人吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          try {
            const delRes = await wx.cloud.callFunction({
              name: 'contact',
              data: { action: 'delete', id }
            });

            if (delRes.result?.success) {
              wx.showToast({ title: '删除成功', icon: 'success' });
              this.loadContacts();
            } else {
              throw new Error(delRes.result?.error || '删除失败');
            }
          } catch (err) {
            console.error('[删除失败]', err);
            wx.showToast({ title: '删除失败', icon: 'error' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
});