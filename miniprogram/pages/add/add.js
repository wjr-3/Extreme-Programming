// pages/add/add.js
// 2025.11.2 v1.1 → 升级支持多联系方式
Page({
  data: {
    id: '',
    mode: 'add',
    name: '',
    // --- 新增多联系方式结构 ---增加不同的格式，保证多种联系方式支持
    phones: [], // [{ value: '138...', type: '手机' }]
    emails: [], // [{ value: 'a@b.com', type: '个人' }]
    address: '',
    // ----------------------------
    group: '家人',
    groupOptions: ['家人', '同事', '朋友', '其他'],
    avatar: '/images/default-avatar.png',
    tempAvatarPath: '',
    isSaving: false,

    // 类型选项
    phoneTypes: ['手机', '工作', '家庭', '其他'],
    emailTypes: ['个人', '工作', '学校', '其他']
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, mode: 'edit' });
      this.loadContact(options.id);
    } else {
      // 默认添加一个空电话和邮箱（方便用户直接输入）
      this.setData({
        phones: [{ value: '', type: '手机' }],
        emails: [{ value: '', type: '个人' }]
      });
    }
  },

  loadContact(id) {
    wx.showLoading({ title: '加载中...' });
    wx.cloud.callFunction({
      name: 'contact',
      data: { action: 'get', id: id }
    }).then(res => {
      const contact = res.result.data[0] || {};

      // 兼容旧版：如果 contact.phone 是字符串，则转为数组
      let phones = [];
      if (Array.isArray(contact.phones)) {
        phones = contact.phones.map(p => ({
          value: p.value || '',
          type: p.type || '手机'
        }));
      } else if (contact.phone) {
        // 旧数据迁移
        phones = [{ value: contact.phone, type: '手机' }];
      } else {
        phones = [{ value: '', type: '手机' }];
      }

      let emails = [];
      if (Array.isArray(contact.emails)) {
        emails = contact.emails.map(e => ({
          value: e.value || '',
          type: e.type || '个人'
        }));
      } else {
        emails = [{ value: '', type: '个人' }];
      }

      this.setData({
        name: contact.name || '',
        phones,
        emails,
        address: contact.address || '',
        group: contact.group || '家人',
        avatar: contact.avatar || '/images/default-avatar.png',
        tempAvatarPath: ''
      });
      wx.hideLoading();
    }).catch(err => {
      console.error('[加载联系人失败]', err);
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'error' });
    });
  },

  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.compressAndCropImage(tempFilePath);
      },
      fail: (err) => {
        console.warn('选择头像取消或失败', err);
      }
    });
  },

  compressAndCropImage(src) {
    wx.showLoading({ title: '处理头像...' });
    wx.getImageInfo({
      src: src,
      success: (info) => {
        const ctx = wx.createCanvasContext('avatarCanvas', this);
        const { width, height } = info;
        const cropSize = Math.min(width, height);
        const x = (width - cropSize) / 2;
        const y = (height - cropSize) / 2;

        ctx.drawImage(info.path, x, y, cropSize, cropSize, 0, 0, 100, 100);
        ctx.draw(false, () => {
          setTimeout(() => {
            wx.canvasToTempFilePath({
              canvasId: 'avatarCanvas',
              success: (res) => {
                this.setData({
                  avatar: res.tempFilePath,
                  tempAvatarPath: res.tempFilePath
                });
                wx.hideLoading();
              },
              fail: (err) => {
                console.error('canvasToTempFilePath 失败', err);
                wx.showToast({ title: '头像处理失败', icon: 'error' });
                wx.hideLoading();
              }
            }, this);
          }, 100);
        });
      },
      fail: (err) => {
        console.error('getImageInfo 失败', err);
        wx.showToast({ title: '图片加载失败', icon: 'error' });
        wx.hideLoading();
      }
    });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onAddressInput(e) {
    this.setData({ address: e.detail.value });
  },

  onGroupChange(e) {
    const selectedIndex = e.detail.value;
    const selectedGroup = this.data.groupOptions[selectedIndex];
    this.setData({ group: selectedGroup });
  },

  // === 电话相关操作 ===
  onPhoneValueChange(e) {
    const index = e.currentTarget.dataset.index;
    const phones = this.data.phones;
    phones[index].value = e.detail.value;
    this.setData({ phones });
  },

  onPhoneTypeChange(e) {
    const index = e.currentTarget.dataset.index;
    const phones = this.data.phones;
    phones[index].type = this.data.phoneTypes[e.detail.value];
    this.setData({ phones });
  },

  addPhone() {
    const phones = this.data.phones;
    phones.push({ value: '', type: '手机' });
    this.setData({ phones });
  },

  removePhone(e) {
    const index = e.currentTarget.dataset.index;
    const phones = this.data.phones;
    if (phones.length <= 1) {
      wx.showToast({ title: '至少保留一个电话', icon: 'none' });
      return;
    }
    phones.splice(index, 1);
    this.setData({ phones });
  },

  // === 邮箱相关操作 ===
  onEmailValueChange(e) {
    const index = e.currentTarget.dataset.index;
    const emails = this.data.emails;
    emails[index].value = e.detail.value;
    this.setData({ emails });
  },

  onEmailTypeChange(e) {
    const index = e.currentTarget.dataset.index;
    const emails = this.data.emails;
    emails[index].type = this.data.emailTypes[e.detail.value];
    this.setData({ emails });
  },

  addEmail() {
    const emails = this.data.emails;
    emails.push({ value: '', type: '个人' });
    this.setData({ emails });
  },

  removeEmail(e) {
    const index = e.currentTarget.dataset.index;
    const emails = this.data.emails;
    if (emails.length <= 1) {
      wx.showToast({ title: '至少保留一个邮箱', icon: 'none' });
      return;
    }
    emails.splice(index, 1);
    this.setData({ emails });
  },

  // === 保存逻辑 ===
  saveContact() {
    if (this.data.isSaving) return;

    const { name, phones, emails, address, group } = this.data;
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    // 验证至少有一个有效电话
    const validPhones = phones.filter(p => p.value.trim());
    if (validPhones.length === 0) {
      wx.showToast({ title: '请至少填写一个电话号码', icon: 'none' });
      return;
    }

    // 可选：验证邮箱格式（简单版）
    for (const email of emails) {
      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        wx.showToast({ title: '邮箱格式不正确', icon: 'none' });
        return;
      }
    }

    this.setData({ isSaving: true });

    const uploadAvatar = () => {
      if (this.data.tempAvatarPath) {
        const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).substring(2, 12)}.jpg`;
        return wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: this.data.tempAvatarPath
        }).then(res => res.fileID);
      } else {
        return Promise.resolve(this.data.avatar);
      }
    };

    uploadAvatar()
      .then(avatarFileID => {
        // 构建新数据结构
        const payload = {
          name: name.trim(),
          phones: validPhones.map(p => ({ value: p.value.trim(), type: p.type })),
          emails: emails
            .filter(e => e.value.trim())
            .map(e => ({ value: e.value.trim(), type: e.type })),
          address: address.trim(),
          group,
          avatar: avatarFileID
        };

        const callData = this.data.mode === 'edit'
          ? { action: 'update', id: this.data.id, payload }
          : { action: 'create', payload };

        return wx.cloud.callFunction({
          name: 'contact',
          data: callData
        });
      })
      .then(res => {
        if (res.result && res.result.success) {
          wx.showToast({ title: '保存成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 500);
        } else {
          throw new Error(res.result?.error || '保存失败');
        }
      })
      .catch(err => {
        console.error('保存联系人失败:', err);
        wx.showToast({ title: '保存失败', icon: 'error' });
      })
      .finally(() => {
        this.setData({ isSaving: false });
      });
  }
});