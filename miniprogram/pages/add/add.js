// pages/add/add.js
// 2025.11.2 v1.1
Page({
  data: {
    id: '', // 编辑时的联系人 ID
    mode: 'add', // 'add' 或 'edit'
    name: '',
    phone: '',
    group: '家人',
    groupOptions: ['家人', '同事', '朋友', '其他'],
    avatar: '/images/default-avatar.png',
    tempAvatarPath: '',
    isSaving: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, mode: 'edit' });
      this.loadContact(options.id);
    }
  },

  loadContact(id) {
    wx.showLoading({ title: '加载中...' });
    wx.cloud.callFunction({
      name: 'contact',
      data: { action: 'get', id: id }
    }).then(res => {
      const contact = res.result.data[0] || {};
      this.setData({
        name: contact.name || '',
        phone: contact.phone || '',
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

        // 绘制正方形裁剪区域到 100x100 canvas
        ctx.drawImage(info.path, x, y, cropSize, cropSize, 0, 0, 100, 100);
        ctx.draw(false, () => {
          setTimeout(() => {
            wx.canvasToTempFilePath({
              canvasId: 'avatarCanvas',
              success: (res) => {
                // 更新页面显示 & 标记需要上传
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

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onGroupChange(e) {
    const selectedIndex = e.detail.value;
    const selectedGroup = this.data.groupOptions[selectedIndex];
    this.setData({ group: selectedGroup });
  },

  saveContact() {
    if (this.data.isSaving) return;

    const { name, phone, group } = this.data;
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!phone.trim()) {
      wx.showToast({ title: '请输入电话', icon: 'none' });
      return;
    }

    this.setData({ isSaving: true });

    // 头像上传逻辑：仅当用户选择了新头像才上传
    const uploadAvatar = () => {
      if (this.data.tempAvatarPath) {
        // 生成唯一云存储路径
        const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).substring(2, 12)}.jpg`;
        return wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: this.data.tempAvatarPath
        }).then(res => {
          return res.fileID; // 返回云文件 ID
        });
      } else {
        // 未更换头像：保留原 avatar（可能是 fileID 或默认路径）
        return Promise.resolve(this.data.avatar);
      }
    };

    uploadAvatar()
      .then(avatarFileID => {
        const payload = { name, phone, group, avatar: avatarFileID };
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