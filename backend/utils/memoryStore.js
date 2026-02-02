// In-memory storage for development/testing when MongoDB is not available
class InMemoryUserStore {
  constructor() {
    this.users = [];
    this.nextId = 1;
  }

  async findOne(query) {
    if (query.email) {
      return this.users.find((user) => user.email === query.email) || null;
    }
    if (query.phone) {
      return this.users.find((user) => user.phone === query.phone) || null;
    }
    if (query.demoToken) {
      return (
        this.users.find((user) => user.demoToken === query.demoToken) || null
      );
    }
    if (query.enableToken) {
      return (
        this.users.find((user) => user.enableToken === query.enableToken) ||
        null
      );
    }
    if (query._id) {
      return this.users.find((user) => user.id === query._id) || null;
    }
    return null;
  }

  async findById(id) {
    return (
      this.users.find(
        (user) =>
          String(user.id) === String(id) || String(user._id) === String(id),
      ) || null
    );
  }

  async updateById(id, updates) {
    const idx = this.users.findIndex(
      (user) =>
        String(user.id) === String(id) || String(user._id) === String(id),
    );
    if (idx === -1) return null;
    const existing = this.users[idx];
    const merged = { ...existing, ...updates, updatedAt: new Date() };
    this.users[idx] = merged;
    return merged;
  }

  async deleteById(id) {
    const idx = this.users.findIndex(
      (user) =>
        String(user.id) === String(id) || String(user._id) === String(id),
    );
    if (idx === -1) return null;
    const removed = this.users.splice(idx, 1)[0];
    return removed;
  }

  async save(userData) {
    // Normalize phone to E.164 with default +91 when missing
    if (userData && userData.phone) {
      let p = String(userData.phone).trim();
      p = p.replace(/[^0-9+]/g, "");
      if (!p.startsWith("+")) {
        if (/^\d{10}$/.test(p)) p = `+91${p}`;
        else if (/^0+\d+$/.test(p)) p = `+91${p.replace(/^0+/, "")}`;
        else p = `+91${p}`;
      }
      userData.phone = p;
    }

    const newUser = {
      id: this.nextId++,
      _id: this.nextId - 1,
      isActive: true, // Default to active
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate digital ID if not exists
    if (!newUser.digitalId) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      newUser.digitalId = `TID${timestamp}${random}`;
    }

    this.users.push(newUser);
    return newUser;
  }

  async create(userData) {
    return this.save(userData);
  }

  getAllUsers() {
    return this.users;
  }
}

export default new InMemoryUserStore();
