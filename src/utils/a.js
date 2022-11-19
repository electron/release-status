module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(err);
    try {
      if (process.env.NODE_ENV === 'production') {
        res.status(500).json({
          error: true,
        });
      } else {
        res.status(500).json({
          error: {
            message: err.message,
            stack: err.stack,
          },
        });
      }
    } catch (err) {
      console.error('Failed to handle error with 500 status:', err);
    }
  });
};
