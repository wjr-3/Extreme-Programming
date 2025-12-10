// pages/index/index.js
// 2025.11.2 v1.1
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
  //解决主界面不显示头像的问题 2025.11.4 v5.2 啊啊啊啊终于显示了
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
  //  
        const processedContacts = await Promise.all(promises);
  
        this.setData({
          contacts: processedContacts,
          filteredContacts: processedContacts
        });
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

  filterContacts() {
    const { contacts, currentGroup, keyword } = this.data;
    let filtered = contacts;

    if (currentGroup !== '全部') {
      filtered = filtered.filter(c => c.group === currentGroup);
    }

    if (keyword) {
      filtered = filtered.filter(c =>
        (c.name && c.name.includes(keyword)) ||
        (c.phone && c.phone.includes(keyword))
      );
    }

    this.setData({ filteredContacts: filtered });
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/add/add' });
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