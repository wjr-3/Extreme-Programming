const STORAGE_KEY = 'contacts_list_v1';
const METHOD_TYPES = [
  { key: 'phone', label: '电话' },
  { key: 'email', label: '邮箱' },
  { key: 'social', label: '社交' },
  { key: 'address', label: '地址' },
  { key: 'other', label: '其他' },
];

const createEmptyMethod = () => ({
  type: 'phone',
  label: '电话',
  value: '',
  typeIndex: 0,
});

Page({
  data: {
    contacts: [],
    displayContacts: [],
    filterFavorites: false,
    showForm: false,
    editingId: null,
    form: {
      name: '',
      note: '',
      methods: [createEmptyMethod()],
    },
    methodTypes: METHOD_TYPES,
  },

  onLoad() {
    this.loadContacts();
  },

  onPullDownRefresh() {
    this.loadContacts();
    wx.stopPullDownRefresh();
  },

  loadContacts() {
    const stored = wx.getStorageSync(STORAGE_KEY) || [];
    this.setData({ contacts: stored });
    this.refreshDisplay(stored, this.data.filterFavorites);
  },

  refreshDisplay(list, onlyFavorite = this.data.filterFavorites) {
    const display = onlyFavorite ? list.filter((c) => c.favorite) : list;
    this.setData({ displayContacts: display });
  },

  persist(list) {
    wx.setStorageSync(STORAGE_KEY, list);
  },

  toggleFilterFavorites() {
    const next = !this.data.filterFavorites;
    this.setData({ filterFavorites: next });
    this.refreshDisplay(this.data.contacts, next);
  },

  toggleFavorite(e) {
    const { id } = e.currentTarget.dataset;
    const contacts = this.data.contacts.map((c) =>
      c.id === id ? { ...c, favorite: !c.favorite } : c
    );
    this.persist(contacts);
    this.setData({ contacts });
    this.refreshDisplay(contacts);
  },

  openCreateForm() {
    this.setData({
      showForm: true,
      editingId: null,
      form: {
        name: '',
        note: '',
        methods: [createEmptyMethod()],
      },
    });
  },

  openEditForm(e) {
    const { id } = e.currentTarget.dataset;
    const contact = this.data.contacts.find((c) => c.id === id);
    if (!contact) return;
    this.setData({
      showForm: true,
      editingId: id,
      form: {
        name: contact.name,
        note: contact.note || '',
        methods:
          contact.methods && contact.methods.length
            ? contact.methods.map((m) => ({
                ...m,
                typeIndex: METHOD_TYPES.findIndex((t) => t.key === m.type),
              }))
            : [createEmptyMethod()],
      },
    });
  },

  closeForm() {
    this.setData({ showForm: false });
  },

  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ 'form.note': e.detail.value });
  },

  onMethodValueInput(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ [`form.methods[${idx}].value`]: e.detail.value });
  },

  onMethodTypeChange(e) {
    const idx = e.currentTarget.dataset.index;
    const typeIndex = Number(e.detail.value);
    const selected = this.data.methodTypes[typeIndex] || METHOD_TYPES[0];
    this.setData({
      [`form.methods[${idx}].type`]: selected.key,
      [`form.methods[${idx}].label`]: selected.label,
      [`form.methods[${idx}].typeIndex`]: typeIndex,
    });
  },

  addMethodRow() {
    const methods = [...this.data.form.methods, createEmptyMethod()];
    this.setData({ 'form.methods': methods });
  },

  removeMethodRow(e) {
    const idx = e.currentTarget.dataset.index;
    const methods = [...this.data.form.methods];
    if (methods.length <= 1) return;
    methods.splice(idx, 1);
    this.setData({ 'form.methods': methods });
  },

  submitForm() {
    const { form, contacts, editingId } = this.data;
    const name = (form.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    const cleanedMethods = (form.methods || [])
      .map((m) => ({
        type: m.type,
        label: m.label || this.getLabelByType(m.type),
        value: (m.value || '').trim(),
        typeIndex: METHOD_TYPES.findIndex((t) => t.key === m.type),
      }))
      .filter((m) => m.value);
    if (!cleanedMethods.length) {
      wx.showToast({ title: '请至少填写一种联系方式', icon: 'none' });
      return;
    }
    const note = (form.note || '').trim();

    let nextList = [...contacts];
    if (editingId) {
      const idx = nextList.findIndex((c) => c.id === editingId);
      if (idx !== -1) {
        nextList[idx] = {
          ...nextList[idx],
          name,
          note,
          methods: cleanedMethods,
        };
      }
    } else {
      nextList.unshift({
        id: `c_${Date.now()}`,
        name,
        note,
        methods: cleanedMethods,
        favorite: false,
        createdAt: Date.now(),
      });
    }

    this.persist(nextList);
    this.setData({
      contacts: nextList,
      showForm: false,
    });
    this.refreshDisplay(nextList);
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  deleteContact(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除联系人',
      content: '确定删除该联系人吗？',
      success: (res) => {
        if (!res.confirm) return;
        const nextList = this.data.contacts.filter((c) => c.id !== id);
        this.persist(nextList);
        this.setData({ contacts: nextList });
        this.refreshDisplay(nextList);
      },
    });
  },

  exportContacts() {
    const contacts = this.data.contacts || [];
    if (!contacts.length) {
      wx.showToast({ title: '暂无联系人可导出', icon: 'none' });
      return;
    }
    const headers = ['姓名', '收藏', '电话', '邮箱', '社交', '地址', '备注'];
    const csvRows = contacts.map((c) => {
      const byType = (type) =>
        (c.methods || [])
          .filter((m) => m.type === type)
          .map((m) => m.value)
          .join('; ');
      return [
        c.name || '',
        c.favorite ? '是' : '否',
        byType('phone'),
        byType('email'),
        byType('social'),
        byType('address'),
        c.note || '',
      ];
    });
    const csv = [headers, ...csvRows]
      .map((row) => row.map((cell) => this.escapeCsv(cell)).join(','))
      .join('\n');
    const filePath = `${wx.env.USER_DATA_PATH}/contacts.csv`;
    wx.getFileSystemManager().writeFile({
      filePath,
      data: csv,
      encoding: 'utf8',
      success: () => {
        wx.showModal({
          title: '导出完成',
          content: `文件已保存：${filePath}\n可用Excel/表格软件打开或分享。`,
          showCancel: false,
        });
      },
      fail: () => {
        wx.showToast({ title: '导出失败，请重试', icon: 'none' });
      },
    });
  },

  importContacts() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv'],
      success: (res) => {
        if (!res.tempFiles?.length) return;
        const filePath = res.tempFiles[0].path;
        wx.getFileSystemManager().readFile({
          filePath,
          encoding: 'utf8',
          success: (r) => {
            const imported = this.parseCsv(r.data);
            if (!imported.length) {
              wx.showToast({ title: '未读取到有效数据', icon: 'none' });
              return;
            }
            const merged = [...this.data.contacts, ...imported];
            this.persist(merged);
            this.setData({ contacts: merged });
            this.refreshDisplay(merged);
            wx.showToast({ title: '导入成功', icon: 'success' });
          },
          fail: () => {
            wx.showToast({ title: '文件读取失败', icon: 'none' });
          },
        });
      },
      fail: () => {
        wx.showToast({ title: '未选择文件', icon: 'none' });
      },
    });
  },

  escapeCsv(value) {
    const str = value === undefined || value === null ? '' : String(value);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  },

  parseCsv(content) {
    if (!content) return [];
    const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const header = this.splitCsvLine(lines.shift());
    const indexes = {
      name: header.findIndex(
        (h) => h.includes('姓名') || h.toLowerCase().includes('name')
      ),
      favorite: header.findIndex(
        (h) => h.includes('收藏') || h.toLowerCase().includes('favorite')
      ),
      phone: header.findIndex(
        (h) => h.includes('电话') || h.toLowerCase().includes('phone')
      ),
      email: header.findIndex(
        (h) => h.includes('邮箱') || h.toLowerCase().includes('email')
      ),
      social: header.findIndex(
        (h) => h.includes('社交') || h.toLowerCase().includes('social')
      ),
      address: header.findIndex(
        (h) => h.includes('地址') || h.toLowerCase().includes('address')
      ),
      note: header.findIndex(
        (h) => h.includes('备注') || h.toLowerCase().includes('note')
      ),
    };
    const imported = [];
    lines.forEach((line, lineIdx) => {
      const cells = this.splitCsvLine(line);
      const name =
        indexes.name >= 0 && cells[indexes.name]
          ? cells[indexes.name].trim()
          : `导入联系人${lineIdx + 1}`;
      const favoriteRaw =
        indexes.favorite >= 0 ? cells[indexes.favorite] || '' : '';
      const favorite =
        ['是', 'true', '1', '收藏'].includes(favoriteRaw.trim().toLowerCase());
      const note = indexes.note >= 0 ? (cells[indexes.note] || '').trim() : '';
      const buildMethods = (key, type) => {
        if (key < 0 || !cells[key]) return [];
        return cells[key]
          .split(';')
          .map((x) => x.trim())
          .filter(Boolean)
          .map((value) => ({
            type,
            label: this.getLabelByType(type),
            value,
            typeIndex: METHOD_TYPES.findIndex((t) => t.key === type),
          }));
      };
      const methods = [
        ...buildMethods(indexes.phone, 'phone'),
        ...buildMethods(indexes.email, 'email'),
        ...buildMethods(indexes.social, 'social'),
        ...buildMethods(indexes.address, 'address'),
      ];
      if (!methods.length) return;
      imported.push({
        id: `imp_${Date.now()}_${lineIdx}`,
        name,
        favorite,
        note,
        methods,
        createdAt: Date.now(),
      });
    });
    return imported;
  },

  splitCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && inQuotes) {
        current += '"';
        i += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  },

  getLabelByType(type) {
    return METHOD_TYPES.find((t) => t.key === type)?.label || '联系方式';
  },
});

