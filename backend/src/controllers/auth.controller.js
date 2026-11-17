const authService = require('../services/auth.service');
const { success } = require('../utils/apiResponse');

const register = async (req, res) => success(res, await authService.register(req.body), 201);
const login = async (req, res) => success(res, await authService.login(req.body));
const me = async (req, res) => success(res, req.user.safeObject());
const updateProfile = async (req, res) => success(res, await authService.updateProfile(req.user, req.body));
const changePassword = async (req, res) => success(res, await authService.changePassword(req.user, req.body));
const logout = async (req, res) => success(res, await authService.logout(req.user._id));
const addAddress = async (req, res) => success(res, await authService.addAddress(req.user, req.body), 201);
const updateAddress = async (req, res) => success(res, await authService.updateAddress(req.user, req.params.id, req.body));
const removeAddress = async (req, res) => success(res, await authService.removeAddress(req.user, req.params.id));
const listUsers = async (req, res) => success(res, await authService.listUsers(req.query));
const updateUserRole = async (req, res) => success(res, await authService.updateUserRole(req.params.id, req.body.role));

module.exports = {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  logout,
  addAddress,
  updateAddress,
  removeAddress,
  listUsers,
  updateUserRole,
};
