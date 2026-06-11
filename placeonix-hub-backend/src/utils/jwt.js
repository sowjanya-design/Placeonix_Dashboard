const jwt = require('jsonwebtoken');

const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });

const verifyToken = (token, isRefresh = false) =>
  jwt.verify(token, isRefresh ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET);

const generateTokenPair = (user) => {
  const payload = { id: user._id, role: user.role, email: user.email };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken({ id: user._id }),
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateTokenPair,
};
