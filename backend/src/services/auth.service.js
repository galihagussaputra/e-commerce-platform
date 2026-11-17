const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const AppError = require('../utils/AppError');
const { normalizeEmail } = require('../utils/money');

const signToken = (user) =>
  jwt.sign({ id: user._id, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

const buildAuthResponse = (user) => ({
  token: signToken(user),
  user: { id: user._id, name: user.name, email: user.email, role: user.role },
});

const register = async ({ name, email, password }) => {
  const normalized = normalizeEmail(email);
  if (await User.exists({ email: normalized })) {
    throw new AppError(409, 'EMAIL_TAKEN', 'Email is already registered');
  }
  const user = await User.create({ name, email: normalized, password });
  return buildAuthResponse(user);
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email: normalizeEmail(email) }).select('+password');
  if (!user || !(await user.comparePassword(password || ''))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  return buildAuthResponse(user);
};

const updateProfile = async (user, { name, email }) => {
  const normalized = normalizeEmail(email);
  if (await User.exists({ email: normalized, _id: { $ne: user._id } })) {
    throw new AppError(409, 'EMAIL_TAKEN', 'Email is already registered');
  }
  user.name = name;
  user.email = normalized;
  await user.save();
  return user.safeObject();
};

const changePassword = async (user, { currentPassword, newPassword }) => {
  const fresh = await User.findById(user._id).select('+password');
  if (!(await fresh.comparePassword(currentPassword || ''))) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
  }
  fresh.password = newPassword;
  fresh.passwordChangedAt = new Date();
  await fresh.save();
  return { changed: true };
};

const addAddress = async (user, address) => {
  if (address.isDefault) user.addresses.forEach((entry) => { entry.isDefault = false; });
  user.addresses.push(address);
  if (user.addresses.length === 1) user.addresses[0].isDefault = true;
  await user.save();
  return user.safeObject().addresses;
};

const updateAddress = async (user, addressId, updates) => {
  const address = user.addresses.id(addressId);
  if (!address) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  if (updates.isDefault) user.addresses.forEach((entry) => { entry.isDefault = false; });
  Object.assign(address, updates);
  await user.save();
  return user.safeObject().addresses;
};

const removeAddress = async (user, addressId) => {
  const address = user.addresses.id(addressId);
  if (!address) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  const wasDefault = address.isDefault;
  user.addresses.pull(addressId);
  if (wasDefault && user.addresses.length) user.addresses[0].isDefault = true;
  await user.save();
  return user.safeObject().addresses;
};

const listUsers = async ({ page = 1, limit = 20, search = '' }) => {
  const filter = search
    ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] }
    : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { items: items.map((user) => user.safeObject()), total, page, limit };
};

const updateUserRole = async (id, role) => {
  if (!['user', 'admin'].includes(role)) {
    throw new AppError(400, 'INVALID_ROLE', 'Role must be user or admin');
  }
  const user = await User.findByIdAndUpdate(id, { role }, { returnDocument: 'after', runValidators: true });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  return user.safeObject();
};

module.exports = {
  register,
  login,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  removeAddress,
  listUsers,
  updateUserRole,
};
